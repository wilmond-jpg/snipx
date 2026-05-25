import type { ReactNode } from "react";

type BadgeVariant = "accent" | "folder";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  accent: "bg-violet-600 text-white",
  folder: "bg-card-hover text-secondary",
};

export default function Badge({ children, variant = "accent", className = "" }: BadgeProps) {
  return (
    <span className={`inline-block text-xs px-2 py-1 rounded-full ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}
