import { type ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "danger-ghost";
type ButtonSize = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-violet-600 text-white hover:bg-violet-500",
  secondary: "bg-card text-secondary hover:bg-card-hover border border-border",
  danger: "bg-red-600 text-white hover:bg-red-500",
  ghost: "bg-card-hover text-primary hover:bg-card-hover",
  "danger-ghost": "bg-red-900/50 text-red-300 hover:bg-red-800/50",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", ...props }, ref) => (
    <button
      ref={ref}
      className={`rounded-lg font-medium transition-colors ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    />
  ),
);

Button.displayName = "Button";
export default Button;
