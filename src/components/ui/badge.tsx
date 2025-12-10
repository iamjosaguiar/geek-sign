import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-glass-sm hover:bg-primary/90",
        secondary:
          "border-white/30 bg-white/50 text-secondary-foreground backdrop-blur-sm hover:bg-white/70 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/20",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-glass-sm hover:bg-destructive/90",
        outline: "text-foreground border-white/30 bg-white/30 backdrop-blur-sm dark:border-white/10",
        success:
          "border-green-200/50 bg-green-100/80 text-green-800 backdrop-blur-sm dark:border-green-500/20 dark:bg-green-900/50 dark:text-green-100",
        warning:
          "border-yellow-200/50 bg-yellow-100/80 text-yellow-800 backdrop-blur-sm dark:border-yellow-500/20 dark:bg-yellow-900/50 dark:text-yellow-100",
        info: "border-blue-200/50 bg-blue-100/80 text-blue-800 backdrop-blur-sm dark:border-blue-500/20 dark:bg-blue-900/50 dark:text-blue-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
