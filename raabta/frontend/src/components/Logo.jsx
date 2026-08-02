// Signature mark: two interlocking rings — a simple, literal rendering of
// "raabta" (connection/link). Kept to a single accent color plus outline so
// it reads at both 20px (navbar) and 40px (auth screens) sizes.
export default function Logo({ size = 24, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="16" r="8" stroke="#6C5CE7" strokeWidth="3" />
      <circle cx="20" cy="16" r="8" stroke="#2DD4BF" strokeWidth="3" />
    </svg>
  );
}

export function LogoWordmark({ className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Logo size={26} />
      <span className="font-display font-bold text-lg tracking-tight text-white">Raabta</span>
    </div>
  );
}
