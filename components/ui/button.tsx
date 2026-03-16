import { ComponentPropsWithoutRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary:
          "bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500",
        secondary:
          "bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 focus-visible:ring-slate-300",
        outline:
          "border border-slate-200 bg-transparent hover:bg-slate-50 focus-visible:ring-slate-300",
        ghost: "text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-300",
        link: "text-primary-600 underline-offset-4 hover:underline",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500"
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-4",
        lg: "h-10 px-5"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "md"
    }
  }
);

export interface ButtonProps
  extends ComponentPropsWithoutRef<"button">,
    VariantProps<typeof buttonVariants> {}

export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

