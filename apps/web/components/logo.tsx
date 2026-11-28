/**
 * OpenDock logo, ported from the legacy site's Logo.astro: a pixel wordmark
 * on a 6-unit grid (after the opencode logotype), or the square glyph alone.
 * Colours come from `currentColor`, so it follows light and dark themes.
 */
export function Logo({ withText = true, className = '' }: { withText?: boolean; className?: string }) {
  if (!withText) {
    return (
      <span className={`grid size-8 shrink-0 place-items-center rounded-lg bg-current ${className}`}>
        <svg viewBox="0 0 24 24" fillRule="evenodd" className="size-[18px] fill-[var(--logo-on,#fff)]" aria-hidden>
          <path d="M16 6H8v12h8V6zm4 16H4V2h16v20z" />
        </svg>
      </span>
    );
  }
  return (
    <svg viewBox="0 0 234 42" className={`block h-6 w-auto ${className}`} role="img" aria-label="OpenDock">
      <g fill="currentColor" fillOpacity={0.15}>
        <path d="M6 18h12v12H6zM36 18h12v12H36zM66 24h18v6H66zM96 18h12v18H96z" />
        <path d="M126 18h12v12h-12zM156 18h12v12h-12zM186 18h18v12h-18zM216 24h12v12h-12z" />
      </g>
      <path
        fill="currentColor"
        fillOpacity={0.55}
        fillRule="evenodd"
        d="M0 6h24v30H0zM6 12v18h12V12zM30 6h24v30H36v6h-6zM36 12v18h12V12zM60 6h24v18H66v6h18v6H60zM66 12v6h12v-6zM90 6h24v30h-6V12H96v24h-6z"
      />
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M138 0h6v36h-24V6h18zM126 12v18h12V12zM150 6h24v30h-24zM156 12v18h12V12zM180 6h24v6h-18v18h18v6h-24zM210 0h6v18h12v6h-12v12h-6zM228 6h6v12h-6zM228 24h6v12h-6z"
      />
    </svg>
  );
}
