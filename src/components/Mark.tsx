export function Mark() {
  return (
    <span className="grid h-8 w-8 place-items-center rounded-lg bg-pine-800 text-sheet" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
        <path
          d="M7 4.5h7L18 8.5V18a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 18V6A1.5 1.5 0 0 1 7.5 4.5z"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path d="M14 4.5V9h4.5" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    </span>
  );
}
