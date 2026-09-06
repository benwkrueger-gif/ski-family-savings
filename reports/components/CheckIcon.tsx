export function CheckIcon({ className = "mt-0.5 h-4 w-4 shrink-0 text-accent-blue" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" aria-hidden>
      <circle cx="10" cy="10" r="8.25" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M6.4 10.2 8.7 12.5 13.6 7.4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
