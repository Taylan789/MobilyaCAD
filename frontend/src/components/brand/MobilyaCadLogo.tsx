type MobilyaCadLogoProps = { className?: string; tone?: "light" | "inverse"; descriptor?: string; };

export function MobilyaCadLogo({ className = "", tone = "light", descriptor = "STUDIO" }: MobilyaCadLogoProps) {
  const classes = ["mc-brand", `mc-brand--${tone}`, className].filter(Boolean).join(" ");
  return (
    <div className={classes} role="img" aria-label="MobilyaCAD Studio">
      <span className="mc-brand__mark" aria-hidden="true">
        <svg viewBox="0 0 52 52" fill="none" focusable="false">
          <rect x="1.5" y="1.5" width="49" height="49" rx="13" fill="#17222B" stroke="#43535E" />
          <path d="M10 14.25 26 6.5 42 14.25v23.5L26 45.5 10 37.75Z" stroke="#D8E1E6" strokeWidth="1.45" strokeLinejoin="round" />
          <path d="M10 14.25 26 22 42 14.25" stroke="#D8E1E6" strokeOpacity=".7" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M16.5 17.4v18.2L26 40.2l9.5-4.6V17.4" stroke="#8FB2C8" strokeWidth="1.9" strokeLinecap="square" strokeLinejoin="round" />
          <path d="M16.5 27.2h19" stroke="#C39470" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M21.8 27.2v7.3M30.2 27.2v7.3" stroke="#C39470" strokeWidth="1.25" strokeLinecap="round" />
          <circle cx="26" cy="27.2" r="1.6" fill="#E1B48F" />
        </svg>
      </span>
      <span className="mc-brand__copy">
        <strong>MOBİLYA<span>CAD</span></strong>
        {descriptor && <small>{descriptor}</small>}
      </span>
    </div>
  );
}
