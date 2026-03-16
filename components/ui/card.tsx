import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/80 bg-white shadow-card",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("flex flex-col space-y-1.5 p-6", className)}>{children}</div>;
}

export function CardTitle({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return <h3 className={cn("text-lg font-semibold leading-none tracking-tight text-slate-900", className)}>{children}</h3>;
}

export function CardDescription({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={cn("text-sm text-slate-500", className)}>{children}</p>;
}

export function CardContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("p-6 pt-0", className)}>{children}</div>;
}

export function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex items-center p-6 pt-0", className)}>{children}</div>;
}
