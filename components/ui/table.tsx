import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("w-full overflow-auto rounded-lg border border-slate-200", className)}>
      <table className="w-full caption-bottom text-sm">{children}</table>
    </div>
  );
}

export function TableHeader({ children }: { children: ReactNode }) {
  return <thead className="bg-slate-50/80">{children}</thead>;
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className="[&_tr:last-child]:border-0">{children}</tbody>;
}

export function TableRow({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr
      className={cn(
        "border-b border-slate-200/80 transition-colors hover:bg-slate-50/50",
        className
      )}
    >
      {children}
    </tr>
  );
}

export function TableHead({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "h-11 px-4 text-left align-middle font-medium text-slate-600",
        className
      )}
    >
      {children}
    </th>
  );
}

export function TableCell({
  children,
  className,
  ...props
}: {
  children: ReactNode;
  className?: string;
} & React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("p-4 align-middle text-slate-900", className)} {...props}>
      {children}
    </td>
  );
}
