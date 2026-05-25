import { type TextareaHTMLAttributes, forwardRef } from "react";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  charCount?: number;
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, charCount, className = "", ...props }, ref) => (
    <div>
      {label && <label className="block text-sm text-secondary mb-1">{label}</label>}
      <textarea
        ref={ref}
        className={`w-full bg-card border border-border rounded-xl px-4 py-2.5 text-primary placeholder-muted outline-none focus:border-violet-500 transition-colors resize-none ${className}`}
        {...props}
      />
      {charCount !== undefined && (
        <p className="text-xs text-muted text-right mt-1">
          {charCount} character{charCount !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  ),
);

TextArea.displayName = "TextArea";
export default TextArea;
