"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { ZorentaPageHeader } from "@/components/zorenta/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { getSupabaseClient } from "@/lib/supabase-client";
import { trackZorentaEvent } from "@/lib/zorenta/analytics";
import { ZorentaPageSkeleton } from "@/components/zorenta/loading-skeleton";
import { MessageCircle, Clock, ArrowLeft, Check, CheckCheck } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { normalizeUuidString } from "@/lib/zorenta/uuid";
import {
  getBrowserNotificationPermission,
  isBrowserNotificationSupported,
  requestBrowserNotificationPermission,
  shouldShowMessageNotificationForIncoming,
  showIncomingMessageBrowserNotification,
} from "@/lib/zorenta/browser-notifications";
import type { RealtimeChannel } from "@supabase/supabase-js";

/** Compare conversation / profile ids from URL, Realtime, or API without casing mismatches. */
function idsEqual(a: string | null, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return normalizeUuidString(a) === normalizeUuidString(b);
}

/** Profile snippet from GET /conversations — extra fields optional for forward-compat */
type OtherParticipantProfile = {
  id?: string;
  display_name?: string | null;
  /** If API starts returning these, they take priority in name picking */
  full_name?: string | null;
  company_name?: string | null;
  role?: string | null;
  /** When API includes avatar URLs, ConversationThreadAvatar shows them */
  avatar_url?: string | null;
  /**
   * Canonical id for `/zorenta/caregivers/[id]`: `profiles.id` when `caregiver_profiles` exists; else marketplace id.
   */
  caregiver_route_id?: string | null;
  caregiver_route_source?: "marketplace" | "caregiver_profile" | null;
  /** When false, do not link (e.g. incomplete test user). When undefined, treat as true if `caregiver_route_id` is set (older API). */
  has_renderable_caregiver_profile?: boolean;
};

type ApiConversation = {
  id: string;
  /** From API — used to pick the other participant when enriching display names */
  participant_1?: string;
  participant_2?: string;
  application_id?: string | null;
  application?: { id: string; status: string; job_id: string } | null;
  other?: OtherParticipantProfile | null;
  job?: { id: string; title: string } | null;
  unread_count?: number;
  last_message?: { body: string; created_at: string } | null;
  updated_at?: string;
};

/** Non-empty canonical caregiver profile path id for `/zorenta/caregivers/[id]`, or null (no link). */
function caregiverProfileRouteId(other: OtherParticipantProfile | null | undefined): string | null {
  const raw = other?.caregiver_route_id?.trim();
  if (!raw) return null;
  if (other?.has_renderable_caregiver_profile === false) return null;
  return raw;
}

type ApiMessage = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  /** Recipient loaded the thread (own/outgoing bubbles — WhatsApp-style delivered). */
  delivered_at?: string | null;
  /** Set when the recipient has read the message (own/outgoing bubbles). */
  read_at?: string | null;
};

/** API caps limit at 200; default GET without offset returns the oldest page only — long threads need the tail. */
const THREAD_MESSAGES_LIMIT = 200;

function sortMessagesByCreatedAtAsc(messages: ApiMessage[]): ApiMessage[] {
  return [...messages].sort(
    (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)
  );
}

/**
 * Loads the most recent messages for the thread view (last page when total > limit).
 * Ensures newest batch/composer messages are visible for existing long conversations.
 */
async function fetchMessagesForThreadView(
  token: string,
  conversationId: string
): Promise<
  | { ok: true; messages: ApiMessage[] }
  | { ok: false; error: string; status?: number }
> {
  const base = `/api/zorenta/messages?conversation_id=${encodeURIComponent(conversationId)}`;
  const first = await fetch(`${base}&limit=${THREAD_MESSAGES_LIMIT}&offset=0`, {
    headers: zorentaHeaders(token),
  });
  const data = await first.json().catch(() => ({}));
  if (!first.ok) {
    return {
      ok: false,
      error:
        first.status === 403 || first.status === 404
          ? "Dit gesprek bestaat niet of je hebt geen toegang."
          : typeof data?.error === "string"
            ? data.error
            : "Berichten laden mislukt.",
      status: first.status,
    };
  }
  const total = typeof data.total === "number" ? data.total : 0;
  let rows: ApiMessage[] = Array.isArray(data.messages) ? data.messages : [];
  if (total > THREAD_MESSAGES_LIMIT) {
    const offset = Math.max(0, total - THREAD_MESSAGES_LIMIT);
    const second = await fetch(`${base}&limit=${THREAD_MESSAGES_LIMIT}&offset=${offset}`, {
      headers: zorentaHeaders(token),
    });
    const d2 = await second.json().catch(() => ({}));
    if (!second.ok) {
      return {
        ok: false,
        error: typeof d2?.error === "string" ? d2.error : "Berichten laden mislukt.",
        status: second.status,
      };
    }
    rows = Array.isArray(d2.messages) ? d2.messages : [];
  }
  return { ok: true, messages: sortMessagesByCreatedAtAsc(rows) };
}

function activityTs(c: ApiConversation): number {
  const iso = c.last_message?.created_at ?? c.updated_at ?? "";
  const ts = Date.parse(iso);
  return Number.isFinite(ts) ? ts : 0;
}

function sortConversationsByLatest(list: ApiConversation[]): ApiConversation[] {
  return [...list].sort((a, b) => activityTs(b) - activityTs(a));
}

/** For detecting list row activity changes (preview / time / unread) without API changes. */
function buildConversationSnapshotMap(
  list: ApiConversation[]
): Map<string, { lastIso: string; unread: number; preview: string }> {
  const m = new Map<string, { lastIso: string; unread: number; preview: string }>();
  for (const c of list) {
    m.set(c.id, {
      lastIso: c.last_message?.created_at ?? c.updated_at ?? "",
      unread: Math.max(0, Number(c.unread_count ?? 0)),
      preview: (c.last_message?.body ?? "").slice(0, 120),
    });
  }
  return m;
}

function formatMessageTime(iso: string) {
  return new Date(iso).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

/** Same calendar day (local time). */
function isSameCalendarDay(isoA: string, isoB: string): boolean {
  const a = new Date(isoA);
  const b = new Date(isoB);
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

/** Label for date separators: "Vandaag" | "Gisteren" | "21 maart 2026". */
function formatDateSeparatorLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) return "Vandaag";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return "Gisteren";
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

function applicationStatusLabelNl(status: string | undefined): string {
  switch (status) {
    case "pending":
      return "In afwachting";
    case "shortlisted":
      return "Shortlist";
    case "accepted":
      return "Geaccepteerd";
    case "rejected":
      return "Afgewezen";
    default:
      return status?.trim() ? status : "";
  }
}

function formatListTime(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) return formatMessageTime(iso);
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

/** Client-only relative time (presence “last seen” or conversation activity). */
function formatRelativeNl(ms: number): string {
  const sec = Math.floor((Date.now() - ms) / 1000);
  if (sec < 45) return "zojuist";
  if (sec < 3600) return `${Math.floor(sec / 60)} min geleden`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} u geleden`;
  return new Date(ms).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function formatIsoRelativeNl(iso: string | undefined): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  return formatRelativeNl(t);
}

/** Supabase presenceState() keys are participant presence keys (UUID strings). */
function presenceStateHasUser(state: Record<string, unknown>, userId: string): boolean {
  for (const k of Object.keys(state)) {
    if (idsEqual(k, userId)) {
      const v = state[k];
      return Array.isArray(v) && v.length > 0;
    }
  }
  return false;
}

/** The other participant in the thread (not the current user). */
function getOtherParticipantId(conv: ApiConversation, meId: string | null): string | null {
  if (!meId) return null;
  const p1 = conv.participant_1;
  const p2 = conv.participant_2;
  if (!p1 || !p2) return null;
  if (p1 === meId) return p2;
  if (p2 === meId) return p1;
  return null;
}

function isProbablyEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

/** Local part of email, or replace separators so "koen_care" / "koen.care" become word-like */
function normalizeRawNameInput(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (isProbablyEmail(t)) {
    const local = t.split("@")[0] ?? "";
    return local.replace(/[.+]+/g, " ").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  }
  return t
    .replace(/[._]+/g, " ")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Title-case words; supports hyphenated parts (e.g. Marie-Claire). */
function formatParticipantDisplayName(raw: string): string {
  const normalized = normalizeRawNameInput(raw);
  if (!normalized) return "";
  return normalized
    .split(/\s+/)
    .filter(Boolean)
    .map((word) =>
      word
        .split("-")
        .map((part) =>
          part.length ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : ""
        )
        .join("-")
    )
    .join(" ");
}

/**
 * Pick best raw label: org → company_name | person → full_name | company | display_name | enriched.
 * (API levert nu vooral `display_name`; optionele velden zijn voor latere responses.)
 */
function pickRawOtherName(
  conv: ApiConversation | undefined,
  meId: string | null,
  resolvedNames: Record<string, string>
): string | null {
  if (!conv) return null;
  const o = conv.other;
  const company = o?.company_name?.trim();
  if (o?.role === "organization" && company) return company;
  const full = o?.full_name?.trim();
  if (full) return full;
  if (company) return company;
  const dn = o?.display_name?.trim();
  if (dn) return dn;
  const oid = getOtherParticipantId(conv, meId);
  if (oid && resolvedNames[oid]?.trim()) return resolvedNames[oid].trim();
  return null;
}

/** Human-friendly name for list + thread header */
function getPresentableOtherName(
  conv: ApiConversation | undefined,
  meId: string | null,
  resolvedNames: Record<string, string>
): string | null {
  const raw = pickRawOtherName(conv, meId, resolvedNames);
  if (!raw) return null;
  const formatted = formatParticipantDisplayName(raw);
  return formatted || null;
}

function getNotificationTitleForConversation(
  convId: string,
  list: ApiConversation[],
  meId: string | null,
  resolvedNames: Record<string, string>
): string {
  const c = list.find((x) => idsEqual(x.id, convId));
  const name = c ? getPresentableOtherName(c, meId, resolvedNames) : null;
  return name?.trim() || "Bericht";
}

function initialFromDisplayLabel(label: string): string {
  const w = label.trim().split(/\s+/)[0] ?? "";
  const ch = w.charAt(0);
  return ch ? ch.toUpperCase() : "?";
}

type ThreadAvatarSize = "sm" | "md";

/** List-only: distinguishes open thread (teal) vs unread elsewhere (amber) vs neutral. */
type ConversationListAvatarTone = "default" | "active" | "unread";

/**
 * Shared avatar for conversation list + thread header: optional photo, otherwise initials.
 * Styling matches SamenConnect teal/emerald palette; ring keeps edges crisp on photos.
 */
function ConversationThreadAvatar({
  label,
  photoUrl,
  emphasized,
  listTone = "default",
  size = "sm",
}: {
  label: string;
  photoUrl?: string | null;
  emphasized?: boolean;
  /** When set from the conversation list, overrides generic `emphasized` for clearer states. */
  listTone?: ConversationListAvatarTone;
  size?: ThreadAvatarSize;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => {
    setImgFailed(false);
  }, [photoUrl]);

  const initial = initialFromDisplayLabel(label || "Contact");
  const showPhoto = Boolean(photoUrl?.trim() && !imgFailed);

  const toneRing =
    listTone === "active"
      ? "ring-2 ring-[#40ada8] ring-offset-2 ring-offset-white bg-emerald-50 shadow-sm"
      : listTone === "unread"
        ? "ring-2 ring-amber-300/80 bg-amber-50/90 ring-offset-0"
        : emphasized
          ? "bg-emerald-100/95 ring-emerald-200/75"
          : "bg-emerald-50/95 ring-emerald-100/90";

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold leading-none text-emerald-900 ring-1 ring-inset",
        size === "md" ? "h-10 w-10 min-h-[2.5rem] min-w-[2.5rem] text-sm" : "h-9 w-9 min-h-[2.25rem] min-w-[2.25rem] text-[11px]",
        toneRing,
        showPhoto && "ring-slate-200/75"
      )}
      aria-hidden
    >
      {showPhoto ? (
        <img
          src={photoUrl!.trim()}
          alt=""
          className="absolute inset-0 z-0 h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setImgFailed(true)}
        />
      ) : null}
      {!showPhoto ? (
        <span className="relative z-10 flex h-full w-full select-none items-center justify-center">
          {initial}
        </span>
      ) : null}
    </div>
  );
}

type ZorentaInboxProps = {
  /** Selected conversation UUID from URL (`?conversation=` of legacy `?c=`) — kept in sync on refresh */
  urlConversationId: string | null;
  /** Update browser URL when user picks a thread (e.g. `/zorenta/berichten?conversation=…`) */
  onUrlConversationChange: (id: string | null) => void;
};

export function ZorentaInbox({ urlConversationId, onUrlConversationChange }: ZorentaInboxProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const prefillAppliedKeyRef = useRef<string | null>(null);
  /** Conversation id that the URL `prefill` belongs to (while user may still navigate away). */
  const prefillConversationScopeRef = useRef<string | null>(null);

  const [token, setToken] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [conversations, setConversations] = useState<ApiConversation[]>([]);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [convosError, setConvosError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** Open thread id for fetch + Realtime — synced every render so it never lags navigation. */
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;

  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const messagesRef = useRef<ApiMessage[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  const [meId, setMeId] = useState<string | null>(null);
  /** display names keyed by other user's profile id when missing from GET /conversations */
  const [resolvedOtherNames, setResolvedOtherNames] = useState<Record<string, string>>({});
  const conversationsRef = useRef<ApiConversation[]>([]);
  const resolvedOtherNamesRef = useRef<Record<string, string>>({});
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);
  useEffect(() => {
    resolvedOtherNamesRef.current = resolvedOtherNames;
  }, [resolvedOtherNames]);
  const attemptedCaregiverNameFetchRef = useRef<Set<string>>(new Set());
  /** Only the latest GET /conversations may apply; avoids stale responses overwriting newer unread_count. */
  const conversationsLoadRequestIdRef = useRef(0);
  const [composerBody, setComposerBody] = useState("");
  const [sending, setSending] = useState(false);

  /** Rows that briefly highlight when another conversation gets new activity (client-side only). */
  const [flashConversationIds, setFlashConversationIds] = useState<string[]>([]);
  const conversationListSnapshotRef = useRef<Map<string, { lastIso: string; unread: number; preview: string }>>(
    new Map()
  );
  const conversationListBootstrappedRef = useRef(false);

  /** Ephemeral typing (Broadcast) — other participant’s display name for the open thread. */
  const [remoteTypingName, setRemoteTypingName] = useState<string | null>(null);
  const typingChannelRef = useRef<RealtimeChannel | null>(null);
  const typingChannelReadyRef = useRef(false);
  const lastTypingBroadcastSentRef = useRef(0);
  const remoteTypingHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Synced each render: header name of the other participant (for typing label). */
  const threadOtherDisplayNameRef = useRef("Contact");

  /** Supabase Presence: other user online in this thread’s presence channel. */
  const [otherPresenceOnline, setOtherPresenceOnline] = useState(false);
  /** When we observed the other user leave presence this session (not persisted). */
  const [otherPresenceLeftAtMs, setOtherPresenceLeftAtMs] = useState<number | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const presencePrevOtherOnlineRef = useRef(false);

  /** Browser notifications: ask once per mount on first explicit user gesture (conversation pick). */
  const notificationPermissionPromptedRef = useRef(false);
  const [browserNotificationPermission, setBrowserNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >("unsupported");
  useEffect(() => {
    if (!isBrowserNotificationSupported()) {
      setBrowserNotificationPermission("unsupported");
      return;
    }
    setBrowserNotificationPermission(getBrowserNotificationPermission());
  }, []);

  function tryRequestNotificationPermissionOnUserGesture() {
    if (notificationPermissionPromptedRef.current) return;
    if (!isBrowserNotificationSupported()) return;
    if (Notification.permission !== "default") return;
    notificationPermissionPromptedRef.current = true;
    void requestBrowserNotificationPermission().then((p) => setBrowserNotificationPermission(p));
  }

  const otherParticipantId = useMemo(() => {
    if (!selectedId || !meId) return null;
    const c = conversations.find((x) => x.id === selectedId);
    if (!c) return null;
    return getOtherParticipantId(c, meId);
  }, [selectedId, meId, conversations]);

  const prefillParam = searchParams.get("prefill");

  // Remember which thread the URL prefill targets (survives after `prefill` is stripped from URL).
  useEffect(() => {
    if (prefillParam && urlConversationId) {
      prefillConversationScopeRef.current = urlConversationId;
    }
  }, [prefillParam, urlConversationId]);

  // URL prefill → composer for this thread only (no auto-send)
  useEffect(() => {
    if (!prefillParam || !selectedId || !urlConversationId || selectedId !== urlConversationId) return;
    const key = `${selectedId}|${prefillParam}`;
    if (prefillAppliedKeyRef.current === key) return;
    prefillAppliedKeyRef.current = key;
    setComposerBody(prefillParam);
  }, [prefillParam, selectedId, urlConversationId]);

  // Leave prefill thread (or after prefill removed from URL) → clear composer; normal inbox unchanged when no scope
  useEffect(() => {
    if (!selectedId) return;
    const scope = prefillConversationScopeRef.current;
    if (!scope) return;
    if (prefillParam) return;
    if (selectedId !== scope) {
      setComposerBody("");
      prefillConversationScopeRef.current = null;
    }
  }, [selectedId, prefillParam]);

  // Resolve token once
  useEffect(() => {
    let cancelled = false;
    getZorentaAccessToken().then((t) => {
      if (!cancelled) {
        setToken(t);
        setAuthChecked(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadConversations = useCallback(async (t: string, opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    const requestId = ++conversationsLoadRequestIdRef.current;
    if (!silent) setLoadingConvos(true);
    setConvosError(null);
    try {
      const res = await fetch("/api/zorenta/conversations", { headers: zorentaHeaders(t) });
      const data = await res.json().catch(() => ({}));
      if (requestId !== conversationsLoadRequestIdRef.current) return;
      if (!res.ok) {
        setConvosError(typeof data?.error === "string" ? data.error : "Gesprekken laden mislukt.");
        setConversations([]);
      } else {
        setConversations(sortConversationsByLatest(data.conversations ?? []));
      }
    } catch {
      if (requestId !== conversationsLoadRequestIdRef.current) return;
      setConvosError("Gesprekken laden mislukt.");
      setConversations([]);
    } finally {
      if (requestId === conversationsLoadRequestIdRef.current) {
        setLoadingConvos(false);
      }
    }
  }, []);

  /** Always-current values for Realtime handlers (avoids stale token / loadConversations in channel callbacks). */
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = token;
  const loadConversationsRef = useRef(loadConversations);
  loadConversationsRef.current = loadConversations;

  useEffect(() => {
    if (!token) return;
    loadConversations(token);
  }, [token, loadConversations]);

  // Brief highlight on rows whose preview/time/unread changed (not the open thread) — pure UX, no API/realtime changes.
  useEffect(() => {
    if (loadingConvos) return;
    const snap = buildConversationSnapshotMap(conversations);
    if (!conversationListBootstrappedRef.current) {
      conversationListBootstrappedRef.current = true;
      conversationListSnapshotRef.current = snap;
      return;
    }
    const prev = conversationListSnapshotRef.current;
    const newFlash: string[] = [];
    for (const [id, cur] of snap) {
      if (id === selectedId) continue;
      const old = prev.get(id);
      if (!old) {
        newFlash.push(id);
        continue;
      }
      if (
        cur.lastIso !== old.lastIso ||
        cur.unread > old.unread ||
        cur.preview !== old.preview
      ) {
        newFlash.push(id);
      }
    }
    conversationListSnapshotRef.current = snap;
    if (newFlash.length === 0) return;
    const unique = [...new Set(newFlash)];
    setFlashConversationIds((p) => [...new Set([...p, ...unique])]);
    for (const id of unique) {
      window.setTimeout(() => {
        setFlashConversationIds((p) => p.filter((x) => x !== id));
      }, 2600);
    }
  }, [conversations, loadingConvos, selectedId]);

  // URL → selection
  useEffect(() => {
    if (urlConversationId) {
      setSelectedId(urlConversationId);
    } else {
      setSelectedId(null);
      setMessages([]);
      setMessagesError(null);
    }
  }, [urlConversationId]);

  // Load messages for selected conversation — tail page so long threads show the newest messages.
  useEffect(() => {
    if (!token || !selectedId) {
      setMessages([]);
      setMessagesError(null);
      return;
    }
    let cancelled = false;
    setMessages([]);
    setLoadingMessages(true);
    setMessagesError(null);
    const conversationIdForThisFetch = selectedId;

    void (async () => {
      const result = await fetchMessagesForThreadView(token, conversationIdForThisFetch);
      if (cancelled) return;
      if (!idsEqual(selectedIdRef.current, conversationIdForThisFetch)) return;
      if (!result.ok) {
        setMessages([]);
        setMessagesError(result.error);
        setLoadingMessages(false);
        return;
      }
      setMessages(result.messages);
      setMessagesError(null);
      void loadConversations(token, { silent: true });
      setLoadingMessages(false);

      // Second pass after the current turn: catches the newest row if the first GET raced a just-sent batch message.
      queueMicrotask(async () => {
        if (cancelled) return;
        if (!idsEqual(selectedIdRef.current, conversationIdForThisFetch)) return;
        const again = await fetchMessagesForThreadView(token, conversationIdForThisFetch);
        if (cancelled) return;
        if (!idsEqual(selectedIdRef.current, conversationIdForThisFetch)) return;
        if (!again.ok) return;
        setMessages(again.messages);
        void loadConversations(token, { silent: true });
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [token, selectedId, loadConversations]);

  /** For Realtime INSERT: distinguish own vs incoming messages (recipient must re-fetch GET to mark delivered/read). */
  const meIdRef = useRef<string | null>(null);
  useEffect(() => {
    meIdRef.current = meId;
  }, [meId]);

  /** Merge Realtime UPDATE payloads (may be partial) into an existing message row. */
  function patchMessageFromRealtimeRow(m: ApiMessage, row: Record<string, unknown>): ApiMessage {
    const next = { ...m };
    if ("delivered_at" in row) next.delivered_at = (row.delivered_at as string | null | undefined) ?? null;
    if ("read_at" in row) next.read_at = (row.read_at as string | null | undefined) ?? null;
    return next;
  }

  // Supabase Realtime: one subscription per inbox mount (deps: [token] only) — session verified before subscribe.
  useEffect(() => {
    if (!token) return;
    const supabase = getSupabaseClient();
    let cancelled = false;
    const channelRef: { current: ReturnType<typeof supabase.channel> | null } = { current: null };

    void (async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (cancelled) return;

      // eslint-disable-next-line no-console -- temporary Realtime debug
      console.log("[zorenta-realtime] subscribe preflight", {
        hasSession: !!session,
        userId: session?.user?.id ?? null,
        sessionError: sessionError?.message ?? null,
      });

      if (!session?.user) {
        // eslint-disable-next-line no-console -- temporary Realtime debug
        console.warn(
          "[zorenta-realtime] skipping subscribe — no Supabase auth session (postgres_changes INSERT will not be delivered)"
        );
        return;
      }

      const handleInsert = (payload: {
        eventType?: string;
        schema?: string;
        table?: string;
        commit_timestamp?: string;
        new?: Record<string, unknown>;
      }) => {
        const t = tokenRef.current;
        const loadFn = loadConversationsRef.current;
        // eslint-disable-next-line no-console -- temporary Realtime debug
        console.log("[zorenta-realtime] INSERT payload received", {
          eventType: payload.eventType,
          schema: payload.schema,
          table: payload.table,
          commit_timestamp: payload.commit_timestamp,
          new: payload.new,
        });
        // eslint-disable-next-line no-console -- temporary Realtime debug
        console.log("[zorenta-realtime] INSERT context", {
          selectedIdRef: selectedIdRef.current,
          tokenPresent: Boolean(t),
        });

        const row = payload.new as {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          body?: string;
          created_at?: string;
          delivered_at?: string | null;
          read_at?: string | null;
        };
        if (!row?.id || !row.conversation_id) return;
        if (!t || !loadFn) {
          // eslint-disable-next-line no-console -- temporary Realtime debug
          console.warn("[zorenta-realtime] INSERT skipped — missing token or loadConversations ref");
          return;
        }

        const convId = String(row.conversation_id);
        const msg: ApiMessage = {
          id: String(row.id),
          sender_id: String(row.sender_id ?? ""),
          body: String(row.body ?? ""),
          created_at: String(row.created_at ?? ""),
          delivered_at: row.delivered_at ?? null,
          read_at: row.read_at ?? null,
        };
        const currentSelectedId = selectedIdRef.current;
        const matchedOpenThread = idsEqual(currentSelectedId, convId);
        const senderId = String(row.sender_id ?? "");
        const me = meIdRef.current;
        const incomingFromOther = Boolean(me && senderId && !idsEqual(me, senderId));

        // eslint-disable-next-line no-console -- temporary Realtime debug
        console.log("[zorenta-realtime] INSERT thread routing", {
          currentSelectedId,
          insertConversationId: convId,
          matchedOpenThread,
        });

        if (incomingFromOther) {
          const dupInOpenThread =
            matchedOpenThread && messagesRef.current.some((m) => m.id === msg.id);
          if (
            !dupInOpenThread &&
            shouldShowMessageNotificationForIncoming({
              messageBelongsToOpenThread: matchedOpenThread,
            })
          ) {
            const title = getNotificationTitleForConversation(
              convId,
              conversationsRef.current,
              meIdRef.current,
              resolvedOtherNamesRef.current
            );
            showIncomingMessageBrowserNotification({
              title,
              body: msg.body,
              conversationId: convId,
              messageId: msg.id,
            });
          }
        }

        if (!matchedOpenThread) {
          // eslint-disable-next-line no-console -- temporary Realtime debug
          console.log("[zorenta-realtime] INSERT outcome", {
            appendedToThread: false,
            loadConversationsSilent: true,
            onlyConversationsListRefreshed: true,
          });
          void loadFn(t, { silent: true });
          return;
        }

        let appendedToThread = false;
        setMessages((prev) => {
          if (!idsEqual(selectedIdRef.current, convId)) {
            return prev;
          }
          if (prev.some((m) => m.id === msg.id)) {
            return prev;
          }
          appendedToThread = true;
          return sortMessagesByCreatedAtAsc([...prev, msg]);
        });

        // eslint-disable-next-line no-console -- temporary Realtime debug
        console.log("[zorenta-realtime] INSERT outcome", {
          appendedToThread,
          loadConversationsSilent: false,
          onlyConversationsListRefreshed: false,
        });

        if (incomingFromOther) {
          // eslint-disable-next-line no-console -- temporary Realtime debug
          console.log("[zorenta-realtime] INSERT GET /messages refetch triggered", {
            conversation_id: convId,
          });
          void fetchMessagesForThreadView(t, convId)
            .then((threadResult) => {
              if (!threadResult.ok) {
                // eslint-disable-next-line no-console -- temporary Realtime debug
                console.log("[zorenta-realtime] INSERT GET /messages failed", threadResult.error);
                return;
              }
              if (!idsEqual(selectedIdRef.current, convId)) {
                // eslint-disable-next-line no-console -- temporary Realtime debug
                console.log("[zorenta-realtime] INSERT GET skip replace (thread changed)", {
                  expected: convId,
                  current: selectedIdRef.current,
                });
                return;
              }
              // eslint-disable-next-line no-console -- temporary Realtime debug
              console.log("[zorenta-realtime] INSERT GET OK → replace with canonical messages", {
                count: threadResult.messages.length,
              });
              setMessages(threadResult.messages);
              setMessagesError(null);
              const t2 = tokenRef.current;
              const load2 = loadConversationsRef.current;
              // eslint-disable-next-line no-console -- temporary Realtime debug
              console.log("[zorenta-realtime] INSERT loadConversations(silent) after GET /messages OK", {
                ran: Boolean(t2 && load2),
              });
              if (t2 && load2) void load2(t2, { silent: true });
            })
            .catch((e) => {
              // eslint-disable-next-line no-console -- temporary Realtime debug
              console.log("[zorenta-realtime] INSERT GET error", e);
            });
        } else {
          // eslint-disable-next-line no-console -- temporary Realtime debug
          console.log("[zorenta-realtime] INSERT no GET refetch", {
            reason: me ? "own_message" : "meId_not_ready",
          });
          // eslint-disable-next-line no-console -- temporary Realtime debug
          console.log("[zorenta-realtime] INSERT loadConversations(silent) after own message", true);
          void loadFn(t, { silent: true });
        }
      };

      const handleUpdate = (payload: { new?: Record<string, unknown> }) => {
        const t = tokenRef.current;
        const loadFn = loadConversationsRef.current;
        const row = payload.new as Record<string, unknown> & {
          id?: string;
          conversation_id?: string;
          delivered_at?: string | null;
          read_at?: string | null;
        };
        if (!row?.id || !row.conversation_id) return;
        if (!t || !loadFn) return;
        const openThreadId = selectedIdRef.current;
        const idStr = String(row.id);
        const matchedOpen = idsEqual(openThreadId, String(row.conversation_id));

        // eslint-disable-next-line no-console -- temporary Realtime debug
        console.log("[zorenta-realtime] UPDATE received", {
          id: idStr,
          conversation_id: row.conversation_id,
          delivered_at: row.delivered_at,
          read_at: row.read_at,
          matchedOpenThread: matchedOpen,
        });

        if (matchedOpen) {
          setMessages((prev) =>
            prev.map((m) => (m.id === idStr ? patchMessageFromRealtimeRow(m, row) : m))
          );
          // eslint-disable-next-line no-console -- temporary Realtime debug
          console.log("[zorenta-realtime] UPDATE patched message in open thread", idStr);
          // eslint-disable-next-line no-console -- temporary Realtime debug
          console.log("[zorenta-realtime] UPDATE loadConversations(silent) after open-thread patch", true);
          void loadFn(t, { silent: true });
        } else {
          // eslint-disable-next-line no-console -- temporary Realtime debug
          console.log("[zorenta-realtime] UPDATE loadConversations(silent) triggered", true);
          void loadFn(t, { silent: true });
        }
      };

      const channel = supabase
        .channel("zorenta-inbox-messages")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          handleInsert
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "messages" },
          handleUpdate
        );

      if (cancelled) return;

      channel.subscribe((status, err) => {
        // eslint-disable-next-line no-console -- temporary Realtime debug
        console.log("[zorenta-realtime] channel subscribe status", {
          status,
          error: err?.message ?? null,
        });
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          // eslint-disable-next-line no-console -- temporary Realtime debug
          console.warn("[zorenta-realtime] channel problem — INSERT events may be missing", status, err);
        }
      });

      if (cancelled) {
        void supabase.removeChannel(channel);
        return;
      }
      channelRef.current = channel;
    })();

    return () => {
      cancelled = true;
      const ch = channelRef.current;
      channelRef.current = null;
      if (ch) {
        void supabase.removeChannel(ch);
        // eslint-disable-next-line no-console -- temporary Realtime debug
        console.log("[zorenta-realtime] channel teardown (inbox unmount or token change)");
      }
    };
  }, [token]);

  // Typing indicator: Broadcast-only channel per conversation (no DB; separate from postgres_changes).
  useEffect(() => {
    if (!token || !selectedId) {
      typingChannelReadyRef.current = false;
      typingChannelRef.current = null;
      return;
    }
    const supabase = getSupabaseClient();
    let cancelled = false;
    const channelName = `zorenta-typing:${selectedId}`;

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled || !session?.user) return;

      const ch = supabase
        .channel(channelName)
        .on(
          "broadcast",
          { event: "typing" },
          (msg: { payload?: Record<string, unknown> } & Record<string, unknown>) => {
            const body = (msg.payload ?? msg) as Record<string, unknown>;
            const convId = String(body.conversation_id ?? "");
            const uid = String(body.user_id ?? "");
            if (!idsEqual(selectedIdRef.current, convId)) return;
            if (idsEqual(meIdRef.current, uid)) return;
            const typing = body.typing !== false;
            if (!typing) {
              if (remoteTypingHideTimeoutRef.current) {
                clearTimeout(remoteTypingHideTimeoutRef.current);
                remoteTypingHideTimeoutRef.current = null;
              }
              setRemoteTypingName(null);
              return;
            }
            if (remoteTypingHideTimeoutRef.current) {
              clearTimeout(remoteTypingHideTimeoutRef.current);
            }
            const label = threadOtherDisplayNameRef.current.trim() || "Contact";
            setRemoteTypingName(label);
            remoteTypingHideTimeoutRef.current = setTimeout(() => {
              setRemoteTypingName(null);
              remoteTypingHideTimeoutRef.current = null;
            }, 4000);
          }
        )
        .subscribe((status) => {
          typingChannelReadyRef.current = status === "SUBSCRIBED";
          if (status === "SUBSCRIBED") {
            lastTypingBroadcastSentRef.current = 0;
          }
        });

      if (cancelled) {
        typingChannelReadyRef.current = false;
        void supabase.removeChannel(ch);
        return;
      }
      typingChannelRef.current = ch;
    })();

    return () => {
      cancelled = true;
      typingChannelReadyRef.current = false;
      if (remoteTypingHideTimeoutRef.current) {
        clearTimeout(remoteTypingHideTimeoutRef.current);
        remoteTypingHideTimeoutRef.current = null;
      }
      setRemoteTypingName(null);
      const ch = typingChannelRef.current;
      typingChannelRef.current = null;
      if (ch) void supabase.removeChannel(ch);
    };
  }, [token, selectedId]);

  // Presence (other participant online) — separate channel from typing + postgres; only while thread selected.
  useEffect(() => {
    if (!token || !selectedId || !meId || !otherParticipantId) {
      setOtherPresenceOnline(false);
      presencePrevOtherOnlineRef.current = false;
      return;
    }
    const otherId = otherParticipantId;
    const supabase = getSupabaseClient();
    let cancelled = false;
    const channelName = `zorenta-presence:${selectedId}`;

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled || !session?.user) return;

      const ch = supabase.channel(channelName, {
        config: {
          presence: {
            key: meId,
          },
        },
      });

      const applyPresence = () => {
        if (cancelled) return;
        const state = ch.presenceState() as Record<string, unknown>;
        const online = presenceStateHasUser(state, otherId);
        if (presencePrevOtherOnlineRef.current && !online) {
          setOtherPresenceLeftAtMs(Date.now());
        }
        presencePrevOtherOnlineRef.current = online;
        setOtherPresenceOnline(online);
      };

      ch.on("presence", { event: "sync" }, applyPresence)
        .on("presence", { event: "join" }, applyPresence)
        .on("presence", { event: "leave" }, ({ key }) => {
          if (idsEqual(String(key), otherId)) {
            setOtherPresenceLeftAtMs(Date.now());
          }
          applyPresence();
        });

      ch.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void ch.track({ user_id: meId, online: true }).then(() => {
            if (!cancelled) applyPresence();
          });
        }
      });

      if (cancelled) {
        void supabase.removeChannel(ch);
        return;
      }
      presenceChannelRef.current = ch;
    })();

    return () => {
      cancelled = true;
      presencePrevOtherOnlineRef.current = false;
      const ch = presenceChannelRef.current;
      presenceChannelRef.current = null;
      if (ch) void supabase.removeChannel(ch);
    };
  }, [token, selectedId, meId, otherParticipantId]);

  // Current user id (for bubble alignment)
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch("/api/zorenta/me", { headers: zorentaHeaders(token) })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.profile?.id) setMeId(d.profile.id);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  // When profiles have no display_name in the list payload, resolve via public caregiver/org profile API.
  useEffect(() => {
    if (!token || !meId) return;
    const need: string[] = [];
    for (const c of conversations) {
      const oid = getOtherParticipantId(c, meId);
      if (!oid) continue;
      if (c.other?.display_name?.trim()) continue;
      if (attemptedCaregiverNameFetchRef.current.has(oid)) continue;
      need.push(oid);
    }
    const unique = [...new Set(need)];
    if (unique.length === 0) return;
    unique.forEach((id) => attemptedCaregiverNameFetchRef.current.add(id));
    let cancelled = false;
    Promise.all(
      unique.map(async (id) => {
        const res = await fetch(`/api/zorenta/caregivers/${encodeURIComponent(id)}`);
        if (!res.ok) return [id, ""] as const;
        const d = await res.json().catch(() => null);
        const p = d?.profile as { display_name?: string | null } | undefined;
        const mc = d && typeof d === "object" ? (d as { marketplaceCard?: { name?: string } }).marketplaceCard : undefined;
        const cg = d?.caregiver as Record<string, unknown> | undefined;
        const cardName =
          mc?.name != null && String(mc.name).trim()
            ? String(mc.name).trim()
            : cg && !Array.isArray(cg.care_types) && typeof cg.name === "string" && cg.name.trim()
              ? cg.name.trim()
              : "";
        const nm = (p?.display_name && String(p.display_name).trim()) || cardName;
        return [id, nm] as const;
      })
    ).then((rows) => {
      if (cancelled) return;
      setResolvedOtherNames((prev) => {
        const next = { ...prev };
        for (const [id, nm] of rows) {
          if (nm) next[id] = nm;
        }
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [conversations, token, meId]);

  /** Smooth scroll only when new messages arrive; instant when switching threads (avoids jump/flicker). */
  const scrollAnchorMeta = useRef<{ selectedId: string | null; messageLen: number }>({
    selectedId: null,
    messageLen: 0,
  });
  useEffect(() => {
    const sel = selectedId;
    const len = messages.length;
    const prev = scrollAnchorMeta.current;
    const threadChanged = prev.selectedId !== sel;
    const grew = !threadChanged && len > prev.messageLen;
    scrollAnchorMeta.current = { selectedId: sel, messageLen: len };

    const run = () => {
      bottomRef.current?.scrollIntoView({
        behavior: threadChanged ? "auto" : grew ? "smooth" : "auto",
        block: "end",
      });
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
  }, [messages, selectedId]);

  const [fakeTypingAfterSend, setFakeTypingAfterSend] = useState(false);
  useEffect(() => {
    if (!fakeTypingAfterSend) return;
    const t = window.setTimeout(() => setFakeTypingAfterSend(false), 2800);
    return () => window.clearTimeout(t);
  }, [fakeTypingAfterSend]);

  useEffect(() => {
    setFakeTypingAfterSend(false);
    setRemoteTypingName(null);
    if (remoteTypingHideTimeoutRef.current) {
      clearTimeout(remoteTypingHideTimeoutRef.current);
      remoteTypingHideTimeoutRef.current = null;
    }
    lastTypingBroadcastSentRef.current = 0;
    setOtherPresenceOnline(false);
    setOtherPresenceLeftAtMs(null);
    presencePrevOtherOnlineRef.current = false;
  }, [selectedId]);

  function handleSelectConversation(id: string) {
    tryRequestNotificationPermissionOnUserGesture();
    setSelectedId(id);
    onUrlConversationChange(id);
  }

  function handleClearSelectionMobile() {
    setSelectedId(null);
    onUrlConversationChange(null);
  }

  /** Throttle ~1.8s: first burst sends immediately; avoids per-keystroke traffic. */
  function scheduleTypingBroadcast() {
    const ch = typingChannelRef.current;
    if (!ch || !typingChannelReadyRef.current) return;
    const conv = selectedIdRef.current;
    const me = meIdRef.current;
    if (!conv || !me) return;
    const now = Date.now();
    if (now - lastTypingBroadcastSentRef.current < 1800) return;
    lastTypingBroadcastSentRef.current = now;
    void ch.send({
      type: "broadcast",
      event: "typing",
      payload: { conversation_id: conv, user_id: me, typing: true },
    });
  }

  function sendTypingStopBroadcast() {
    const ch = typingChannelRef.current;
    if (!ch || !typingChannelReadyRef.current) return;
    const conv = selectedIdRef.current;
    const me = meIdRef.current;
    if (!conv || !me) return;
    lastTypingBroadcastSentRef.current = 0;
    void ch.send({
      type: "broadcast",
      event: "typing",
      payload: { conversation_id: conv, user_id: me, typing: false },
    });
  }

  async function handleSendReply() {
    if (!token || !selectedId || !composerBody.trim() || sending) return;
    tryRequestNotificationPermissionOnUserGesture();
    const text = composerBody.trim();
    setSending(true);
    const res = await fetch("/api/zorenta/messages", {
      method: "POST",
      headers: zorentaHeaders(token),
      body: JSON.stringify({ conversation_id: selectedId, body: text }),
    });
    const data = await res.json().catch(() => ({}));
    setSending(false);
    if (res.ok && data?.id) {
      sendTypingStopBroadcast();
      trackZorentaEvent("message_sent", { conversation_id: selectedId });
      const createdAt =
        typeof data?.created_at === "string"
          ? data.created_at
          : new Date().toISOString();

      // Optimistic reorder: update the conversation immediately so it moves to
      // the top before the next GET /api/zorenta/conversations returns.
      setConversations((prev) => {
        const next = prev.map((c) =>
          c.id === selectedId
            ? {
                ...c,
                updated_at: createdAt,
                last_message: { body: text, created_at: createdAt },
              }
            : c
        );
        return sortConversationsByLatest(next);
      });

      setMessages((prev) =>
        sortMessagesByCreatedAtAsc([...prev, data as ApiMessage])
      );
      setComposerBody("");
      setFakeTypingAfterSend(true);
      loadConversations(token);

      if (searchParams.has("prefill")) {
        prefillConversationScopeRef.current = null;
        prefillAppliedKeyRef.current = null;
        router.replace(
          `/zorenta/berichten?conversation=${encodeURIComponent(selectedId)}`,
          { scroll: false }
        );
      }
    }
  }

  const selectedConvo = conversations.find((c) => c.id === selectedId);
  const displayName =
    getPresentableOtherName(selectedConvo, meId, resolvedOtherNames)?.trim() || "Contact";
  threadOtherDisplayNameRef.current = displayName;
  const headerCaregiverRoute = caregiverProfileRouteId(selectedConvo?.other);
  const headerProfileHref = headerCaregiverRoute ? `/zorenta/caregivers/${headerCaregiverRoute}` : null;
  const selectedJobTitle = selectedConvo?.job?.title?.trim() || null;
  const selectedApplicationStatus = applicationStatusLabelNl(selectedConvo?.application?.status);
  const listTime = selectedConvo?.last_message?.created_at ?? selectedConvo?.updated_at;
  const convActivityIso = selectedConvo?.last_message?.created_at ?? selectedConvo?.updated_at ?? "";

  const presenceStatusLine = otherPresenceOnline
    ? { type: "online" as const }
    : otherPresenceLeftAtMs != null
      ? { type: "seen", rel: formatRelativeNl(otherPresenceLeftAtMs) }
      : convActivityIso
        ? { type: "activity", rel: formatIsoRelativeNl(convActivityIso) }
        : { type: "offline" as const };

  if (!authChecked) {
    return (
      <PageContainer maxWidth="default" className="space-y-6">
        <ZorentaPageSkeleton className="space-y-6" />
      </PageContainer>
    );
  }

  if (!token) {
    return (
      <PageContainer maxWidth="default" className="space-y-6">
        <ZorentaPageHeader
          title="Berichten"
          description="Log in om je gesprekken te bekijken."
          backHref="/zorenta/dashboard"
          backLabel="Dashboard"
        />
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardContent className="p-6 text-center text-sm text-slate-600">
            <p className="mb-4">Je moet ingelogd zijn om berichten te gebruiken.</p>
            <Link
              href="/zorenta/login?next=/zorenta/berichten"
              className={cn(
                "inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-medium text-white",
                "bg-[#40ada8] hover:bg-[#369e9a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#40ada8]/40"
              )}
            >
              Inloggen
            </Link>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="default" className="space-y-6">
      <ZorentaPageHeader
        title="Berichten"
        description="Bekijk en beheer je gesprekken met zorgverleners en organisaties."
        backHref="/zorenta/dashboard"
        backLabel="Dashboard"
      />

      {convosError && (
        <p className="text-sm text-red-600" role="alert">
          {convosError}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
        {/* Left: conversation list */}
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">Gesprekken</p>
              <span className="text-xs text-slate-500">{conversations.length} gesprekken</span>
            </div>
            {loadingConvos ? (
              <p className="text-sm text-slate-500">Laden…</p>
            ) : conversations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-3 py-6 text-center text-sm text-slate-600">
                <MessageCircle className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                <p className="font-medium text-slate-800">Nog geen gesprekken</p>
                <p className="mt-1 text-xs text-slate-500">
                  Start een gesprek via matches of een profiel.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 border-slate-200 text-xs"
                  onClick={() => router.push("/zorenta/matches")}
                >
                  Naar matches
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map((conv) => {
                  const isActive = conv.id === selectedId;
                  const name =
                    getPresentableOtherName(conv, meId, resolvedOtherNames)?.trim() || "Contact";
                  const unread = Math.max(0, Number(conv.unread_count ?? 0));
                  const preview = conv.last_message?.body
                    ? conv.last_message.body.length > 80
                      ? conv.last_message.body.slice(0, 80) + "…"
                      : conv.last_message.body
                    : "Nog geen berichten";
                  const jobTitle = conv.job?.title?.trim();
                  const hasApplicationContext = Boolean(conv.application_id && conv.application);
                  const secondaryLine = hasApplicationContext
                    ? jobTitle
                      ? `Sollicitatie · ${jobTitle}`
                      : "Reactie · opdracht"
                    : preview;
                  const timeLabel = formatListTime(conv.last_message?.created_at ?? conv.updated_at);
                  const hasUnread = unread > 0;
                  const isFlashing = flashConversationIds.includes(conv.id);
                  const avatarTone: ConversationListAvatarTone = isActive
                    ? "active"
                    : hasUnread
                      ? "unread"
                      : "default";
                  const profileRouteId = caregiverProfileRouteId(conv.other);
                  const profileHref = profileRouteId ? `/zorenta/caregivers/${profileRouteId}` : null;
                  return (
                    <div
                      key={conv.id}
                      role="button"
                      tabIndex={0}
                      aria-selected={isActive}
                      onClick={() => handleSelectConversation(conv.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSelectConversation(conv.id);
                        }
                      }}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-[border-color,box-shadow,background-color] duration-200",
                        isActive
                          ? "relative z-[1] ring-2 ring-[#40ada8] ring-offset-2 ring-offset-white border-2 border-[#40ada8] bg-gradient-to-br from-[#40ada8]/18 via-[#40ada8]/10 to-white shadow-md"
                          : isFlashing
                            ? "relative z-0 border border-amber-200/90 bg-amber-50/55 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.35),0_0_0_1px_rgba(251,191,36,0.12)]"
                            : hasUnread
                              ? "border border-slate-200 border-l-4 border-l-amber-400 bg-slate-50/95 hover:bg-slate-100/90"
                              : "border border-slate-200 bg-white hover:bg-slate-50"
                      )}
                    >
                      {profileHref ? (
                        <Link
                          href={profileHref}
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-[#40ada8]/50"
                          aria-label={`Profiel van ${name}`}
                        >
                          <ConversationThreadAvatar
                            label={name}
                            photoUrl={conv.other?.avatar_url}
                            emphasized={false}
                            listTone={avatarTone}
                            size="sm"
                          />
                        </Link>
                      ) : (
                        <ConversationThreadAvatar
                          label={name}
                          photoUrl={conv.other?.avatar_url}
                          emphasized={false}
                          listTone={avatarTone}
                          size="sm"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            {profileHref ? (
                              <Link
                                href={profileHref}
                                onClick={(e) => e.stopPropagation()}
                                className={cn(
                                  "min-w-0 truncate text-sm underline-offset-2 transition-colors hover:text-[#2d7f7b] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#40ada8]/40 rounded-sm",
                                  isActive
                                    ? "font-semibold text-slate-900"
                                    : hasUnread
                                      ? "font-semibold text-slate-900"
                                      : "font-medium text-slate-600"
                                )}
                              >
                                {name}
                              </Link>
                            ) : (
                              <p
                                className={cn(
                                  "min-w-0 truncate text-sm",
                                  isActive
                                    ? "font-semibold text-slate-900"
                                    : hasUnread
                                      ? "font-semibold text-slate-900"
                                      : "font-medium text-slate-600"
                                )}
                              >
                                {name}
                              </p>
                            )}
                            {isActive ? (
                              <span className="shrink-0 rounded-full bg-[#40ada8] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                Actief
                              </span>
                            ) : null}
                          </div>
                          <span
                            className={cn(
                              "shrink-0 text-[11px] tabular-nums",
                              isActive
                                ? "font-medium text-[#2d7f7b]"
                                : hasUnread
                                  ? "font-medium text-slate-600"
                                  : isFlashing
                                    ? "font-medium text-amber-800/90"
                                    : "text-slate-400"
                            )}
                          >
                            {timeLabel}
                          </span>
                        </div>
                        <p
                          className={cn(
                            "mt-0.5 truncate text-xs",
                            isActive
                              ? "text-slate-800"
                              : hasUnread
                                ? "text-slate-700"
                                : isFlashing
                                  ? "text-slate-700"
                                  : "text-slate-500"
                          )}
                        >
                          {secondaryLine}
                        </p>
                      </div>
                      {unread > 0 ? (
                        <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#40ada8] px-1.5 text-[10px] font-semibold text-white shadow-sm">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: thread */}
        <Card className="flex flex-col overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm lg:h-[70vh]">
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
            {!selectedId ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-6 text-center">
                <MessageCircle className="h-8 w-8 text-slate-300" />
                <p className="text-sm font-medium text-slate-800">Kies een gesprek om berichten te bekijken</p>
                <p className="text-xs text-slate-500">
                  Selecteer een gesprek in de lijst aan de linkerkant.
                </p>
              </div>
            ) : messagesError ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-6 text-center">
                <p className="text-sm font-medium text-slate-800">Gesprek niet beschikbaar</p>
                <p className="text-xs text-slate-500">{messagesError}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 border-slate-200 text-xs"
                  onClick={() => handleClearSelectionMobile()}
                >
                  Terug naar lijst
                </Button>
              </div>
            ) : (
              <>
                <div className="shrink-0 border-b border-slate-100 px-3 pb-3 pt-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-2">
                      <button
                        type="button"
                        className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 lg:hidden"
                        onClick={handleClearSelectionMobile}
                        aria-label="Terug naar gesprekken"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                      </button>
                      {headerProfileHref ? (
                        <Link
                          href={headerProfileHref}
                          className="shrink-0 rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-[#40ada8]/50"
                          aria-label={`Profiel van ${displayName}`}
                        >
                          <ConversationThreadAvatar
                            label={displayName}
                            photoUrl={selectedConvo?.other?.avatar_url}
                            emphasized={Number(selectedConvo?.unread_count ?? 0) > 0}
                            size="md"
                          />
                        </Link>
                      ) : (
                        <ConversationThreadAvatar
                          label={displayName}
                          photoUrl={selectedConvo?.other?.avatar_url}
                          emphasized={Number(selectedConvo?.unread_count ?? 0) > 0}
                          size="md"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        {headerProfileHref ? (
                          <Link
                            href={headerProfileHref}
                            className="block w-fit rounded-sm text-sm font-semibold text-slate-900 underline-offset-2 transition-colors hover:text-[#2d7f7b] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#40ada8]/40"
                          >
                            {displayName}
                          </Link>
                        ) : (
                          <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                        )}
                        <p className="mt-0.5 text-xs text-slate-500">
                          {presenceStatusLine.type === "online" ? (
                            <span className="font-medium text-emerald-700">Online</span>
                          ) : presenceStatusLine.type === "seen" ? (
                            <>
                              Laatst gezien <span className="text-slate-600">{presenceStatusLine.rel}</span>
                            </>
                          ) : presenceStatusLine.type === "activity" ? (
                            <>
                              Laatst actief in dit gesprek:{" "}
                              <span className="text-slate-600">{presenceStatusLine.rel}</span>
                            </>
                          ) : (
                            <span className="text-slate-400">Niet online</span>
                          )}
                        </p>
                        {selectedConvo?.application?.id ? (
                          <div className="mt-1.5 space-y-0.5">
                            <p className="text-[11px] leading-tight text-slate-500">
                              {selectedApplicationStatus
                                ? `Sollicitatie · ${selectedApplicationStatus}`
                                : "Sollicitatie"}
                            </p>
                            {selectedJobTitle ? (
                              selectedConvo.job?.id || selectedConvo.application?.job_id ? (
                                <Link
                                  href={`/zorenta/jobs/${selectedConvo.job?.id ?? selectedConvo.application?.job_id}`}
                                  className="block text-sm font-semibold leading-snug text-[#2d7f7b] hover:underline"
                                >
                                  {selectedJobTitle}
                                </Link>
                              ) : (
                                <p className="text-sm font-semibold leading-snug text-slate-800">{selectedJobTitle}</p>
                              )
                            ) : (
                              <p className="text-sm font-semibold leading-snug text-slate-800">Opdracht</p>
                            )}
                          </div>
                        ) : selectedJobTitle ? (
                          <div className="mt-1.5 space-y-0.5">
                            <p className="text-[11px] leading-tight text-slate-500">Gesprek over opdracht</p>
                            <p className="text-sm font-semibold leading-snug text-slate-800">{selectedJobTitle}</p>
                          </div>
                        ) : (
                          <p className="mt-1 text-xs text-slate-500">Gesprek</p>
                        )}
                      </div>
                    </div>
                    {listTime && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock className="h-3 w-3" />
                        {formatListTime(listTime)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/80 px-3 pb-3 pt-3 sm:px-4">
                  {loadingMessages ? (
                    <p className="py-8 text-center text-sm text-slate-500">Berichten laden…</p>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col">
                      <p className="py-8 text-center text-sm text-slate-500">
                        Nog geen berichten in dit gesprek. Stuur hieronder het eerste bericht.
                      </p>
                      <div ref={bottomRef} className="h-0 w-full shrink-0" aria-hidden />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {messages.map((m, i) => {
                        const prevIso = i > 0 ? messages[i - 1].created_at : null;
                        const showDateSeparator =
                          !prevIso || !isSameCalendarDay(prevIso, m.created_at);
                        const mine = meId != null && m.sender_id === meId;
                        const outgoingRead =
                          mine &&
                          m.read_at != null &&
                          String(m.read_at).trim() !== "";
                        const outgoingDelivered =
                          mine &&
                          !outgoingRead &&
                          m.delivered_at != null &&
                          String(m.delivered_at).trim() !== "";
                        return (
                          <div key={m.id} className="contents">
                            {showDateSeparator && (
                              <div
                                className="flex justify-center py-3"
                                role="separator"
                                aria-label={formatDateSeparatorLabel(m.created_at)}
                              >
                                <span className="rounded-full bg-slate-200/60 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
                                  {formatDateSeparatorLabel(m.created_at)}
                                </span>
                              </div>
                            )}
                            <div
                              className={`flex ${mine ? "justify-end" : "justify-start"}`}
                            >
                            <div
                              className={cn(
                                "max-w-[70%] md:max-w-[62%] lg:max-w-[58%] text-sm leading-relaxed",
                                mine
                                  ? "rounded-2xl rounded-br-md bg-[#40ada8] px-4 py-2.5 text-white shadow-sm"
                                  : "rounded-2xl rounded-bl-md bg-white px-4 py-2.5 text-slate-900 shadow-sm ring-1 ring-slate-200/70"
                              )}
                            >
                              <p className="whitespace-pre-wrap break-words">{m.body}</p>
                              {mine ? (
                                <div className="mt-1.5 flex items-center justify-end gap-1.5">
                                  <time
                                    className="text-[10px] tabular-nums text-emerald-50/70"
                                    dateTime={m.created_at}
                                  >
                                    {formatMessageTime(m.created_at)}
                                  </time>
                                  <span className="inline-flex shrink-0 items-center" aria-hidden>
                                    {outgoingRead ? (
                                      <CheckCheck
                                        className="h-4 w-4 text-white drop-shadow-[0_0_1px_rgba(0,0,0,0.25)]"
                                        strokeWidth={2.5}
                                      />
                                    ) : outgoingDelivered ? (
                                      <CheckCheck
                                        className="h-3.5 w-3.5 text-emerald-100/80"
                                        strokeWidth={2.25}
                                      />
                                    ) : (
                                      <Check
                                        className="h-3.5 w-3.5 text-emerald-50/55"
                                        strokeWidth={2.25}
                                      />
                                    )}
                                  </span>
                                  <span className="sr-only">
                                    {outgoingRead
                                      ? "Gelezen"
                                      : outgoingDelivered
                                        ? "Afgeleverd"
                                        : "Verzonden"}
                                  </span>
                                </div>
                              ) : (
                                <p className="mt-1.5 text-[10px] tabular-nums text-slate-400">
                                  {formatMessageTime(m.created_at)}
                                </p>
                              )}
                            </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={bottomRef} />
                    </div>
                  )}
                </div>

                {!loadingMessages && selectedId && remoteTypingName ? (
                  <div className="shrink-0 border-t border-emerald-100/80 bg-emerald-50/40 px-3 py-2 sm:px-4">
                    <p className="text-xs text-slate-600">
                      <span className="font-medium text-slate-800">{remoteTypingName}</span>{" "}
                      <span className="italic text-slate-500">is aan het typen…</span>
                    </p>
                  </div>
                ) : null}

                {!loadingMessages && selectedId && fakeTypingAfterSend ? (
                  <div className="shrink-0 border-t border-slate-100/80 bg-slate-50/60 px-3 py-2 sm:px-4">
                    <p className="text-xs text-slate-500">
                      <span className="tracking-wide text-slate-400">...</span>{" "}
                      <span className="italic">typt</span>
                    </p>
                  </div>
                ) : null}

                <div className="shrink-0 border-t border-slate-100 bg-white px-3 pb-3 pt-3 sm:px-4">
                  <div className="flex items-end gap-2.5">
                    <textarea
                      rows={2}
                      value={composerBody}
                      onChange={(e) => {
                        setComposerBody(e.target.value);
                        scheduleTypingBroadcast();
                      }}
                      placeholder="Typ je bericht..."
                      className="min-h-[44px] flex-1 resize-none rounded-2xl border border-slate-200/90 bg-slate-50/40 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-[#40ada8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#40ada8]/18"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendReply();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-10 shrink-0 gap-1.5 rounded-xl bg-[#40ada8] px-4 text-xs font-medium text-white shadow-sm hover:bg-[#369e9a] disabled:opacity-50"
                      disabled={sending || !composerBody.trim()}
                      onClick={handleSendReply}
                    >
                      Versturen
                    </Button>
                  </div>
                  <div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <MessageCircle className="h-3 w-3" />
                      Veilig berichten via SamenConnect
                    </p>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {browserNotificationPermission === "default" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-slate-200 text-xs"
                          onClick={() => {
                            void requestBrowserNotificationPermission().then((p) =>
                              setBrowserNotificationPermission(p)
                            );
                          }}
                        >
                          Meldingen voor nieuwe berichten
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 border-slate-200 text-xs"
                        onClick={() => router.push("/zorenta/matches")}
                      >
                        Nieuw bericht
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
