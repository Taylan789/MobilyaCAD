import "./MobilyaCadLogo.css";

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
        <svg
          className="mc-brand__mark-art"
          viewBox="0 0 52 52"
          fill="none"
          focusable="false"
        >
          <rect
            className="mc-brand-mark__backplate"
            x="1.5"
            y="1.5"
            width="49"
            height="49"
            rx="11"
          />
          <path
            className="mc-brand-mark__carcass"
            d="M10.5 16 26 7.5 41.5 16V36L26 44.5 10.5 36V16Z"
            fill="none"
          />
          <path
            className="mc-brand-mark__top"
            d="M10.5 16 26 24.7 41.5 16M26 7.5V24.7"
            fill="none"
          />
          <path
            className="mc-brand-mark__interior"
            d="M16.3 20.3V32.9L26 38.3L35.7 32.9V20.3"
            fill="none"
          />
          <path
            className="mc-brand-mark__shelf"
            d="M16.3 27.1H35.7M26 24.7V38.3"
            fill="none"
          />
          <path
            className="mc-brand-mark__dimension-ticks"
            d="M7.5 26H10.5M41.5 26H44.5"
            fill="none"
          />
          <circle className="mc-brand-mark__joint" cx="26" cy="27.1" r="1.55" />
        </svg>
      </span>
      <span className="mc-brand__copy">
        <strong>
          MOBİLYA<span>CAD</span>
        </strong>
        {descriptor && <small>{descriptor}</small>}
      </span>
    </div>
  );
}
