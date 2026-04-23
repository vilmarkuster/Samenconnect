"use client";

import Link from "next/link";
import { ZorentaPageContainer } from "@/components/zorenta/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TrendingUp, Activity, Target } from "lucide-react";

export default function ZorentaGrowthPage() {
  return (
    <ZorentaPageContainer maxWidth="wide" className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
          SamenConnect Growth Engine
        </h1>
        <p className="text-sm text-slate-600">
          Interne overzichtspagina voor groei, activatie en marktplaats‑gezondheid. Alleen zichtbaar
          voor admins. Uitbreidingen volgen; hieronder vind je vast werkende admin-secties.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link href="/admin" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Admin-overzicht
          </Link>
          <Link href="/admin/users" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Gebruikers
          </Link>
          <Link href="/admin/jobs" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Opdrachten
          </Link>
          <Link href="/admin/billing" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Facturatie
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Funnel overview
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-slate-700">
              Hoog‑niveau zicht op inschrijvingen, profielen, opdrachten en sollicitaties.
            </p>
            <Badge variant="outline" className="text-xs">
              Eerste versie
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Marketplace health
            </CardTitle>
            <Activity className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-slate-700">
              Snelle indruk van actieve opdrachten, aanbod van zorgverleners en gaten in de
              marktplaats.
            </p>
            <Badge variant="outline" className="text-xs">
              Komt later uitgebreid
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Activation opportunities
            </CardTitle>
            <Target className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-slate-700">
              Interne suggesties om profielen te activeren, opdrachten te vullen en reviews te
              verzamelen.
            </p>
            <Badge variant="outline" className="text-xs">
              Internal only
            </Badge>
          </CardContent>
        </Card>
      </div>
    </ZorentaPageContainer>
  );
}

