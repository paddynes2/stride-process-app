import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  `inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-medium leading-tight
   border transition-colors truncate max-w-[120px]`,
  {
    variants: {
      variant: {
        default: `bg-[var(--signal-subtle)] text-[var(--signal)] border-[var(--signal-subtle)]`,
        secondary: `bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border-subtle)]`,
        outline: `bg-transparent text-[var(--text-secondary)] border-[var(--border-default)]`,
        success: `bg-[var(--success-subtle)] text-[var(--success)] border-[var(--success-subtle)]`,
        warning: `bg-[var(--warning-subtle)] text-[var(--warning)] border-[var(--warning-subtle)]`,
        destructive: `bg-[var(--error-subtle)] text-[var(--error)] border-[var(--error-subtle)]`,
        info: `bg-[var(--info-subtle)] text-[var(--info)] border-[var(--info-subtle)]`,
        // Step status badges
        draft: `bg-[var(--surface)] text-[var(--text-tertiary)] border-[var(--border-subtle)]`,
        in_progress: `bg-[var(--signal-subtle)] text-[var(--signal)] border-[var(--signal-subtle)]`,
        testing: `bg-[var(--warning-subtle)] text-[var(--warning)] border-[var(--warning-subtle)]`,
        live: `bg-[var(--success-subtle)] text-[var(--success)] border-[var(--success-subtle)]`,
        archived: `bg-[var(--surface)] text-[var(--text-quaternary)] border-[var(--border-subtle)]`,
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
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
