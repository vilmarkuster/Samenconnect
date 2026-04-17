"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  MessageSquare,
  Bot,
  GitBranch,
  BookOpen,
  FolderKanban,
  ListTodo,
  Settings,
  Heart
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/", label: "SamenConnect", icon: Heart },
  { href: "/chat", label: "AI Chat", icon: MessageSquare },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/workflows", label: "Workflows", icon: GitBranch },
  { href: "/prompts", label: "Prompt Library", icon: BookOpen },
  { href: "/apps", label: "Generated Apps", icon: FolderKanban },
  { href: "/tasks", label: "Task Runner", icon: ListTodo },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-col border-r border-slate-200/80 bg-white md:flex">
      <div className="flex h-14 items-center border-b border-slate-200/80 px-5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-tight text-slate-900">
            AI App Builder
          </span>
        </Link>
      </div>
      <nav className="flex-1 space-y-0.5 p-3">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
          const Icon = item.icon;
          const className = cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            active
              ? "bg-primary-50 text-primary-700"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          );
          return item.href === "/" ? (
            <a key={item.href} href={item.href} className={className}>
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </a>
          ) : (
            <Link key={item.href} href={item.href} className={className}>
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
