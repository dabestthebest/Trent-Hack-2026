// The Til Loan Day mark: a little calendar page with a pound sign. Decorative only.

export function LoanDayMark({ className }: { className?: string | undefined }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="2" y="5" width="28" height="25" rx="7" className="fill-primary" />
      <path d="M9 5h14a7 7 0 0 1 7 7H2a7 7 0 0 1 7-7z" className="fill-foreground" opacity="0.2" />
      <rect x="8.5" y="2" width="3.5" height="7" rx="1.75" className="fill-foreground" />
      <rect x="20" y="2" width="3.5" height="7" rx="1.75" className="fill-foreground" />
      <path
        className="stroke-primary-foreground"
        fill="none"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.6 17.2C19.2 15.8 18.1 15.1 16.7 15.1C14.9 15.1 13.8 16.4 13.8 18.2V23.1C13.8 24.5 13.2 25.4 12.2 26.1H20.2M11.9 20.8H17.6"
      />
    </svg>
  );
}
