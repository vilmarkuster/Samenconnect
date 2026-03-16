"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, X } from "lucide-react";

const mobileNavItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/zorenta", label: "Zorenta" },
  { href: "/chat", label: "AI Chat" },
  { href: "/agents", label: "Agents" },
  { href: "/workflows", label: "Workflows" },
  { href: "/prompts", label: "Prompt Library" },
  { href: "/apps", label: "Generated Apps" },
  { href: "/tasks", label: "Task Runner" },
  { href: "/settings", label: "Settings" }
];

export function Topbar() {
  const { logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-4 md:justify-end md:px-6">
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="gap-2 text-slate-600"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Log out</span>
          </Button>
        </div>
      </header>
      {mobileOpen && (
        <div className="border-b border-slate-200/80 bg-white px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-0.5">
            {mobileNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  pathname === item.href
                    ? "bg-primary-50 text-primary-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
