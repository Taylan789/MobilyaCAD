type MobilyaCadLogoProps = { className?: string; tone?: "light" | "inverse"; descriptor?: string; };

export function MobilyaCadLogo({ className = "", tone = "light", descriptor = "STUDIO" }: MobilyaCadLogoProps) {
  const classes = ["mc-brand", `mc-brand--${tone}`, className].filter(Boolean).join(" ");
  return (
    <div className={classes} role="img" aria-label="MobilyaCAD Studio">
      <span className="mc-brand__mark" aria-hidden="true">
        <svg viewBox="0 0 52 52" fill="none" focusable="false">
          <rect x="1.5" y="1.5" width="49" height="49" rx="11" fill="#17222B" stroke="#43535E" />
          <path d="M11 15.5 26 8.5 41 15.5V36.5L26 43.5 11 36.5V15.5Z" stroke="#D8E1E6" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M17 35V18.5L26 25.5 35 18.5V35" stroke="#8FB2C8" strokeWidth="2.15" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M17 29.4H35M26 25.5V35" stroke="#C39470" strokeWidth="1.65" strokeLinecap="round" />
          <path d="M11 15.5 17 18.5M41 15.5 35 18.5" stroke="#D8E1E6" strokeOpacity=".55" strokeWidth="1.15" strokeLinecap="round" />
          <circle cx="26" cy="29.4" r="1.55" fill="#E1B48F" />
        </svg>
      </span>
      <span className="mc-brand__copy">
        <strong>MOBİLYA<span>CAD</span></strong>
        {descriptor && <small>{descriptor}</small>}
      </span>
    </div>
  );
}
