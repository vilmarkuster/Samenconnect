"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ZorentaPageContainer } from "@/components/zorenta/page-container";
import { ZorentaPageHeader } from "@/components/zorenta/page-header";
import { ZorentaEmptyState } from "@/components/zorenta/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Search, Shield, MessageSquare } from "lucide-react";

export default function ReviewsPage() {
  return (
    <ZorentaPageContainer maxWidth="default" className="space-y-6">
      <ZorentaPageHeader
        title="Reviews"
        description="Beoordelingen helpen je een betrouwbare zorgverlener te kiezen."
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <Star className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Reviews op profielen</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Na het afronden van een opdracht kunnen cliënten en organisaties een review achterlaten. 
                  Reviews zijn zichtbaar op het profiel van de zorgverlener.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <Shield className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Betrouwbare beoordelingen</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Alleen opdrachtgevers die met de zorgverlener hebben gewerkt kunnen beoordelen. 
                  Zo krijg je een eerlijk beeld.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ZorentaEmptyState
        icon={Star}
        title="Bekijk reviews op profielen"
        description="Zoek een zorgverlener en bekijk hun profiel voor reviews en gemiddelde beoordeling."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/zorenta/search">
              <Button className="gap-2">
                <Search className="h-4 w-4" />
                Zoek zorgverleners
              </Button>
            </Link>
            <Link href="/zorenta/berichten">
              <Button variant="outline" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Berichten
              </Button>
            </Link>
          </div>
        }
      />
    </ZorentaPageContainer>
  );
}
