"use client";

import { type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, Euro } from "lucide-react";
import { AvailabilityScheduleReadonly } from "@/components/zorenta/caregiver-availability-display";
import {
  formatAcronymAwareLabel,
  formatLabelValue,
  formatLanguageLabel,
} from "@/lib/zorenta/profile-display";
import {
  formatCaregiverExperienceLine,
  type CaregiverViewModel,
} from "@/lib/zorenta/caregiver-profile-view-model";

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-slate-900">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 text-sm text-slate-700">{children}</CardContent>
    </Card>
  );
}

/**
 * Shared caregiver body: exact section order and styling as /zorenta/profile.
 * Over mij → Vaardigheden → Ervaring → Beschikbaarheid → Tarief → Mobiliteit → Certificaten → Talen
 */
export function CaregiverProfileSections({
  vm,
  bioText,
}: {
  vm: CaregiverViewModel;
  bioText: string;
}) {
  const expLine = formatCaregiverExperienceLine(vm.experienceYears);

  return (
    <div className="space-y-5">
      {bioText.trim() ? (
        <SectionCard title="Over mij">
          <p className="whitespace-pre-wrap leading-relaxed">{bioText.trim()}</p>
        </SectionCard>
      ) : null}

      {vm.hasVaardigheden ? (
        <SectionCard title="Vaardigheden en type zorg">
          <div className="space-y-3">
            {vm.skillTags.length > 0 ? (
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">Vaardigheden</p>
                <div className="flex flex-wrap gap-2">
                  {vm.skillTags.map((t) => (
                    <Badge key={`sk-${t}`} variant="outline" className="font-normal">
                      {formatLabelValue(t)}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
            {vm.typeTags.length > 0 ? (
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">Type zorg</p>
                <div className="flex flex-wrap gap-2">
                  {vm.typeTags.map((t) => (
                    <Badge key={`ct-${t}`} variant="outline" className="font-normal">
                      {formatLabelValue(t)}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      {vm.hasErvaring && expLine ? (
        <SectionCard title="Ervaring">
          <p className="text-slate-800">{expLine}</p>
        </SectionCard>
      ) : null}

      {vm.hasBeschikbaarheid ? (
        <SectionCard title="Beschikbaarheid">
          <div className="space-y-3">
            {vm.availabilityText ? (
              <p className="whitespace-pre-wrap text-slate-800">{vm.availabilityText}</p>
            ) : null}
            {vm.hasScheduleSlots && vm.scheduleNorm ? (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Per dag</p>
                <AvailabilityScheduleReadonly schedule={vm.scheduleNorm} />
              </div>
            ) : null}
            {!vm.hasScheduleSlots && vm.availDays.length > 0 ? (
              <p className="text-slate-800">
                <span className="font-medium text-slate-900">Dagen: </span>
                {vm.availDays.map((d) => formatLabelValue(String(d))).join(", ")}
              </p>
            ) : null}
            {!vm.hasScheduleSlots && vm.availTimes.length > 0 ? (
              <p className="text-slate-800">
                <span className="font-medium text-slate-900">Tijden: </span>
                {vm.availTimes.map((t) => formatLabelValue(String(t))).join(", ")}
              </p>
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      {vm.hasTarief ? (
        <SectionCard title="Tarief">
          <dl className="grid gap-2 sm:grid-cols-2">
            {vm.hourlyRate != null ? (
              <div className="flex items-center gap-2">
                <Euro className="h-4 w-4 text-slate-400" aria-hidden />
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Uurtarief</dt>
                  <dd className="mt-0.5">€{vm.hourlyRate} / uur</dd>
                </div>
              </div>
            ) : null}
            {vm.minRate != null ? (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Minimaal tarief</dt>
                <dd className="mt-0.5">€{vm.minRate} / uur</dd>
              </div>
            ) : null}
          </dl>
        </SectionCard>
      ) : null}

      {vm.hasMobiliteit ? (
        <SectionCard title="Mobiliteit">
          <dl className="space-y-2 text-slate-800">
            {vm.travelKm != null && Number.isFinite(vm.travelKm) && vm.travelKm >= 0 ? (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Reisafstand</dt>
                <dd className="mt-0.5 flex items-start gap-2">
                  <Car className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                  <span>{vm.travelKm === 0 ? "Max. 0 km" : `Tot ca. ${vm.travelKm} km`}</span>
                </dd>
              </div>
            ) : null}
            {vm.hasLicense ? (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Rijbewijs</dt>
                <dd className="mt-0.5">Ja</dd>
              </div>
            ) : null}
          </dl>
        </SectionCard>
      ) : null}

      {vm.hasCertificaten ? (
        <SectionCard title="Certificaten en registraties">
          <div className="flex flex-wrap gap-2">
            {vm.certs.map((c) => (
              <Badge key={c} variant="outline" className="font-normal">
                {formatAcronymAwareLabel(c)}
              </Badge>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {vm.hasTalen ? (
        <SectionCard title="Talen">
          <div className="flex flex-wrap gap-2">
            {vm.langs.map((l) => (
              <Badge key={l} variant="secondary" className="font-normal">
                {formatLanguageLabel(l)}
              </Badge>
            ))}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
