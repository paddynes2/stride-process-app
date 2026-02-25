import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, leftElement, rightElement, ...props }, ref) => {
    const inputClasses = cn(
      `flex h-8 w-full rounded-[var(--radius-md)] px-3 text-[13px]
       bg-[var(--input-bg)] border border-[var(--border-subtle)]
       text-[var(--text-primary)]
       placeholder:text-[var(--text-quaternary)]
       shadow-[var(--shadow-inset)]
       transition-all duration-[120ms]`,
      "hover:border-[var(--border-hover)]",
      "focus-visible:outline-none focus-visible:border-[var(--signal)] focus-visible:ring-1 focus-visible:ring-[var(--signal-glow)] focus-visible:shadow-[var(--shadow-inset-focus)]",
      error && "border-[var(--error)] focus-visible:border-[var(--error)] focus-visible:ring-[var(--error-subtle)]",
      "disabled:cursor-not-allowed disabled:opacity-50",
      leftElement && "pl-9",
      rightElement && "pr-9",
      className
    );

    if (leftElement || rightElement) {
      return (
        <div className="relative">
          {leftElement && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
              {leftElement}
            </div>
          )}
          <input type={type} className={inputClasses} ref={ref} {...props} />
          {rightElement && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
              {rightElement}
            </div>
          )}
        </div>
      );
    }

    return <input type={type} className={inputClasses} ref={ref} {...props} />;
  }
);
Input.displayName = "Input";

export { Input };
