import { type ButtonHTMLAttributes, forwardRef } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, className = "", ...props }, ref) => (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={`p-1 rounded text-secondary hover:text-primary hover:bg-card-hover transition-colors ${className}`}
      {...props}
    />
  ),
);

IconButton.displayName = "IconButton";
export default IconButton;
