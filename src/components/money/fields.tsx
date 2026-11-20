// Small, accessible form fields shared by the Runway forms: a visible label, optional hint, inline error
// text tied to the input with aria-describedby, 48px tall inputs and a clear focus ring.

import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from "react";

import { cn } from "@/lib/utils";

export const INPUT_CLASS =
  "h-12 w-full min-w-0 rounded-xl border border-input bg-background px-3 text-base text-foreground shadow-xs transition placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/30";

type NativeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id" | "className" | "aria-invalid" | "aria-describedby" | "children"
>;

export interface FieldProps extends NativeInputProps {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  /** Shown inside the input on the left, e.g. "£". */
  prefix?: string;
  /** Extra controls after the input (e.g. − / + buttons). */
  after?: ReactNode;
  inputRef?: Ref<HTMLInputElement>;
  className?: string;
}

export function Field({
  label,
  hint,
  error,
  prefix,
  after,
  inputRef,
  className,
  ...input
}: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");

  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="block text-sm font-semibold text-foreground">
        {label}
      </label>
      <div className="mt-1.5 flex items-stretch gap-2">
        <div className="relative min-w-0 flex-1">
          {prefix ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-base font-medium text-muted-foreground"
            >
              {prefix}
            </span>
          ) : null}
          <input
            {...input}
            id={id}
            ref={inputRef}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy === "" ? undefined : describedBy}
            className={cn(INPUT_CLASS, prefix && "pl-7", "tabular-nums")}
          />
        </div>
        {after}
      </div>
      {hint ? (
        <p id={hintId} className="mt-1 text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-1 text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
