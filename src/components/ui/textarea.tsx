import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          `flex min-h-[80px] w-full rounded-[var(--radius-md)] px-3 py-2 text-[13px]
           bg-[var(--input-bg)] border border-[var(--border-subtle)]
           text-[var(--text-primary)]
           placeholder:text-[var(--text-quaternary)]
           shadow-[var(--shadow-inset)]
           transition-all duration-[120ms]
           hover:border-[var(--border-hover)]
           focus-visible:outline-none focus-visible:border-[var(--signal)] focus-visible:ring-1 focus-visible:ring-[var(--signal-glow)]
           disabled:cursor-not-allowed disabled:opacity-50
           resize-y`,
          error && "border-[var(--error)] focus-visible:border-[var(--error)]",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
