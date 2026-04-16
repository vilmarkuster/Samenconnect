"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SamenConnectMarketingNavItem = {
  readonly href: string;
  readonly label: string;
};

/** Fallback zodat het mobiele menu nooit leeg opent als props ontbreken. */
const DEFAULT_MOBILE_MENU_LINKS: readonly SamenConnectMarketingNavItem[] = [
  { href: "#waarom", label: "Waarom" },
  { href: "#voor-wie", label: "Voor wie" },
  { href: "#anders", label: "Aanpak" },
  { href: "#platform", label: "Platform" },
  { href: "#early-access", label: "Early access" },
];

type SamenConnectMarketingHeaderProps = {
  navItems: readonly SamenConnectMarketingNavItem[];
  /** Optional slimmer mobile menu (desktop inline nav still uses `navItems`). */
  mobileMenuNavItems?: readonly SamenConnectMarketingNavItem[];
  earlyAccessHref: string;
};

export function SamenConnectMarketingHeader({
  navItems,
  mobileMenuNavItems,
  earlyAccessHref,
}: SamenConnectMarketingHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const menuLinks = useMemo(() => {
    if (mobileMenuNavItems && mobileMenuNavItems.length > 0) {
      return [...mobileMenuNavItems];
    }
    if (navItems.length > 0) {
      return [...navItems];
    }
    return [...DEFAULT_MOBILE_MENU_LINKS];
  }, [mobileMenuNavItems, navItems]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const mq = window.matchMedia("(min-width: 640px)");
    const close = () => {
      if (mq.matches) setMenuOpen(false);
    };
    mq.addEventListener("change", close);
    return () => mq.removeEventListener("change", close);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/50 bg-white/[0.88] backdrop-blur-xl backdrop-saturate-150">
      {/* Desktop (sm+): ongewijzigde rij — logo | inline nav | acties */}
      <div className="relative mx-auto hidden max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:flex sm:gap-4 sm:py-4">
        <Link href="/" className="flex min-w-0 items-center gap-2" aria-label="SamenConnect">
          <Image
            src="/samenconnect-icon.png"
            alt=""
            width={32}
            height={32}
            priority
            className="size-8 shrink-0 sm:size-9"
          />
          <span className="truncate text-base font-semibold leading-none tracking-tight text-slate-900 sm:text-lg">
            SamenConnect
          </span>
        </Link>

        <nav className="hidden items-center gap-x-5 text-sm font-medium text-slate-600 sm:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="whitespace-nowrap transition-colors duration-300 hover:text-brand-dark"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "whitespace-nowrap px-2.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 sm:px-3"
            )}
          >
            Inloggen
          </Link>
          <a
            href={earlyAccessHref}
            className={cn(
              buttonVariants({ size: "sm" }),
              "border-0 bg-brand px-3 text-white shadow-md shadow-brand/30 ring-1 ring-brand/25 hover:bg-brand-dark hover:shadow-lg hover:shadow-brand/35 sm:px-4"
            )}
          >
            Claim je plek
          </a>
        </div>
      </div>

      {/* Mobile: alleen logo + acties + hamburger — géén inline pagina-links */}
      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5 sm:hidden">
        <Link
          href="/"
          className="flex min-w-0 max-w-[min(100%,calc(100vw-11.5rem))] items-center gap-1.5"
          aria-label="SamenConnect"
        >
          <Image
            src="/samenconnect-icon.png"
            alt=""
            width={28}
            height={28}
            priority
            className="size-7 shrink-0"
          />
          <span className="whitespace-nowrap text-[0.8125rem] font-semibold leading-tight tracking-tight text-slate-900">
            SamenConnect
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-1">
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "h-8 whitespace-nowrap px-2 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            Inloggen
          </Link>
          <a
            href={earlyAccessHref}
            className={cn(
              buttonVariants({ size: "sm" }),
              "h-8 whitespace-nowrap border-0 bg-brand px-2.5 text-xs text-white shadow-md shadow-brand/30 ring-1 ring-brand/25 hover:bg-brand-dark"
            )}
          >
            Claim je plek
          </a>
          <button
            type="button"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
            aria-expanded={menuOpen}
            aria-controls="marketing-nav-menu"
            aria-label={menuOpen ? "Menu sluiten" : "Menu openen"}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? (
              <X className="h-4 w-4" strokeWidth={2} aria-hidden />
            ) : (
              <Menu className="h-4 w-4" strokeWidth={2} aria-hidden />
            )}
          </button>
        </div>

      </div>

      {/* Buiten de header (portal): voorkomt dat backdrop-blur / stacking het sheet knipt */}
      {menuOpen
        ? createPortal(
            <Fragment>
              <button
                type="button"
                className="fixed inset-0 z-[100] bg-slate-950/35 sm:hidden"
                aria-label="Sluit menu"
                onClick={() => setMenuOpen(false)}
              />
              <div
                id="marketing-nav-menu"
                role="dialog"
                aria-modal="true"
                aria-label="Navigatie"
                className="fixed inset-y-0 right-0 z-[110] flex w-[min(19rem,calc(100vw-1.25rem))] max-w-[100vw] flex-col border-l border-slate-200 bg-white shadow-[0_0_48px_-12px_rgba(15,23,42,0.28)] sm:hidden"
              >
                <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
                  <span className="text-sm font-semibold text-slate-900">Menu</span>
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                    aria-label="Menu sluiten"
                    onClick={() => setMenuOpen(false)}
                  >
                    <X className="h-5 w-5" strokeWidth={2} aria-hidden />
                  </button>
                </div>
                <nav
                  className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-3 pb-8"
                  aria-label="Pagina"
                >
                  {menuLinks.map((item, index) => (
                    <a
                      key={`${item.href}-${index}`}
                      href={item.href}
                      className="rounded-xl border border-transparent px-3 py-3.5 text-[0.9375rem] font-medium text-slate-900 transition-colors hover:border-slate-200 hover:bg-slate-50 active:bg-slate-100"
                      onClick={() => setMenuOpen(false)}
                    >
                      {item.label}
                    </a>
                  ))}
                </nav>
              </div>
            </Fragment>,
            document.body
          )
        : null}
    </header>
  );
}
