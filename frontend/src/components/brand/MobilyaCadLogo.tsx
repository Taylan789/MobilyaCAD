type MobilyaCadLogoProps = {
  className?: string;
  tone?: "light" | "inverse";
  descriptor?: string;
};

export function MobilyaCadLogo({
  className = "",
  tone = "light",
  descriptor = "STUDIO",
}: MobilyaCadLogoProps) {
  const classes = ["mc-brand", `mc-brand--${tone}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} role="img" aria-label="MobilyaCAD Studio">
      <span className="mc-brand__mark" aria-hidden="true">
        <svg viewBox="0 0 48 48" fill="none" focusable="false">
          <rect x="2" y="2" width="44" height="44" rx="11" fill="currentColor" />
          <path d="M10.5 14.2 24 7.2l13.5 7v19.6L24 40.8l-13.5-7V14.2Z" stroke="#F5F0E6" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M10.5 14.2 24 21.4l13.5-7.2M24 21.4v19.4" stroke="#F5F0E6" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M16 17.1v13.1l8 4.3 8-4.3V17.1" stroke="#E4B47D" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="m16 17.1 8-4.2 8 4.2-8 4.3-8-4.3Z" fill="#E4B47D" fillOpacity=".2" stroke="#E4B47D" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="mc-brand__copy">
        <strong>MOBİLYA<span>CAD</span></strong>
        {descriptor && <small>{descriptor}</small>}
      </span>
    </div>
  );
}
