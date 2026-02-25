import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  `inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium
   transition-all duration-[120ms] ease-[var(--ease-out)]
   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--void)]
   disabled:pointer-events-none disabled:opacity-50
   active:scale-[0.98]
   [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0`,
  {
    variants: {
      variant: {
        default: `bg-[var(--signal)] text-white shadow-[var(--shadow-glow-sm)]
                  hover:bg-[var(--signal-hover)] hover:shadow-[var(--shadow-glow)] hover:-translate-y-[0.5px]`,
        secondary: `bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-subtle)]
                    hover:bg-[var(--elevated)] hover:border-[var(--border-default)]`,
        outline: `bg-transparent text-[var(--text-secondary)] border border-[var(--border-subtle)]
                  hover:bg-[var(--elevated)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)]`,
        ghost: `bg-transparent text-[var(--text-secondary)]
                hover:bg-[var(--elevated)] hover:text-[var(--text-primary)]`,
        destructive: `bg-transparent text-[var(--error)]
                      hover:bg-[var(--error-subtle)] hover:text-[var(--error)]`,
        link: `bg-transparent text-[var(--signal)] underline-offset-4
               hover:underline`,
        brand: `bg-[var(--brand)] text-white shadow-[0_0_10px_rgba(20,184,166,0.15)]
                hover:bg-[#2DD4BF] hover:shadow-[0_0_20px_rgba(20,184,166,0.20)] hover:-translate-y-[0.5px]`,
      },
      size: {
        default: "h-8 px-3 py-1.5 text-[13px] rounded-[var(--radius-md)]",
        sm: "h-7 px-2.5 text-[11px] rounded-[var(--radius-md)]",
        lg: "h-9 px-4 text-[13px] rounded-[var(--radius-md)]",
        xl: "h-11 px-6 text-[14px] rounded-[var(--radius-md)]",
        icon: "h-8 w-8 rounded-[var(--radius-md)]",
        "icon-sm": "h-7 w-7 rounded-[var(--radius-md)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="opacity-0">{children}</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
