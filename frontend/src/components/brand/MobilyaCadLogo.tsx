type MobilyaCadLogoProps = { className?: string; tone?: "light" | "inverse"; descriptor?: string; };

export function MobilyaCadLogo({ className = "", tone = "light", descriptor = "STUDIO" }: MobilyaCadLogoProps) {
  const classes = ["mc-brand", `mc-brand--${tone}`, className].filter(Boolean).join(" ");
  return (
    <div className={classes} role="img" aria-label="MobilyaCAD Studio">
      <span className="mc-brand__mark" aria-hidden="true">
        <svg viewBox="0 0 52 52" fill="none" focusable="false">
          <rect x="1.5" y="1.5" width="49" height="49" rx="13" fill="#17222B" stroke="#43535E" />
          <path d="M10 14 26 6 42 14V38L26 46 10 38V14Z" stroke="#D8E1E6" strokeWidth="1.45" strokeLinejoin="round" />
          <path d="M17 35V17L26 24L35 17V35" stroke="#8FB2C8" strokeWidth="2" strokeLinecap="square" strokeLinejoin="round" />
          <path d="M17 28H35" stroke="#C39470" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M22 28V35M30 28V35" stroke="#C39470" strokeWidth="1.35" strokeLinecap="round" />
          <path d="M10 14 17 17M42 14 35 17" stroke="#D8E1E6" strokeOpacity=".7" strokeWidth="1.2" />
          <circle cx="26" cy="28" r="1.7" fill="#E1B48F" />
        </svg>
      </span>
      <span className="mc-brand__copy">
        <strong>MOBİLYA<span>CAD</span></strong>
        {descriptor && <small>{descriptor}</small>}
      </span>
    </div>
  );
}
