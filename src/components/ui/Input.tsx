import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => (
    <div>
      {label && <label className="block text-sm text-secondary mb-1">{label}</label>}
      <input
        ref={ref}
        className={`w-full bg-card border border-border rounded-xl px-4 py-2.5 text-primary placeholder-muted outline-none focus:border-violet-500 transition-colors ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  ),
);

Input.displayName = "Input";
export default Input;
