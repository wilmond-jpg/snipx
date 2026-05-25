import { type SelectHTMLAttributes, forwardRef } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, className = "", children, ...props }, ref) => (
    <div>
      {label && <label className="block text-sm text-secondary mb-1">{label}</label>}
      <select
        ref={ref}
        className={`w-full bg-card border border-border rounded-xl px-4 py-2.5 text-primary outline-none focus:border-violet-500 transition-colors appearance-none cursor-pointer ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  ),
);

Select.displayName = "Select";
export default Select;
