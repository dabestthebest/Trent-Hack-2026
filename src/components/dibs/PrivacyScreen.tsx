import { EyeOff, Smartphone } from "lucide-react";

interface PrivacyScreenProps {
  nextName: string;
  onReady: () => void;
}

export function PrivacyScreen({ nextName, onReady }: PrivacyScreenProps) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center">
      <span
        className="flex h-20 w-20 items-center justify-center rounded-3xl bg-secondary"
        aria-hidden="true"
      >
        <Smartphone className="h-10 w-10 text-primary" />
      </span>
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Pass the phone to {nextName}
        </h1>
        <p className="flex items-center justify-center gap-2 text-muted-foreground">
          <EyeOff className="h-4 w-4" aria-hidden="true" /> Earlier answers are hidden.
        </p>
      </div>
      <button
        type="button"
        onClick={onReady}
        autoFocus
        className="h-14 w-full max-w-xs rounded-2xl bg-primary text-lg font-semibold text-primary-foreground shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
      >
        I&apos;m {nextName}, ready
      </button>
    </div>
  );
}
