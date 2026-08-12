import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "glass" | "ghost";
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", asChild = false, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-medium transition-all duration-200",
          "disabled:opacity-50 disabled:pointer-events-none",
          variant === "primary" && "bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20",
          variant === "glass" && "glass hover:bg-white/20 dark:hover:bg-white/10",
          variant === "ghost" && "hover:bg-accent",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
