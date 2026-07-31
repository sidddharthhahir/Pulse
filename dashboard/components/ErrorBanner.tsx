export default function ErrorBanner({ message, className = "" }: { message: string; className?: string }) {
  return (
    <div
      className={`font-mono text-[12.5px] px-3.5 py-2.5 ${className}`}
      style={{ border: "1px solid oklch(0.65 0.2 25 / 0.5)", color: "var(--danger)" }}
    >
      {message}
    </div>
  );
}
