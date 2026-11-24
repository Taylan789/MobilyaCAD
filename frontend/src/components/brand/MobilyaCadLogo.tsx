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
          viewBox="0 0 64 64"
          fill="none"
          focusable="false"
        >
          <rect
            className="mc-brand-mark__backplate"
            x="2"
            y="2"
            width="60"
            height="60"
            rx="12"
          />
          <path
            className="mc-brand-mark__carcass"
            d="M14 20 32 10 50 20V42L32 52 14 42V20Z"
            fill="none"
          />
          <path
            className="mc-brand-mark__top"
            d="M14 20 32 30 50 20M32 10V30"
            fill="none"
          />
          <path
            className="mc-brand-mark__interior"
            d="M20 24V38.5L32 45.5L44 38.5V24"
            fill="none"
          />
          <path
            className="mc-brand-mark__shelf"
            d="M20 31.5H44M32 30V45.5"
            fill="none"
          />
          <path
            className="mc-brand-mark__dimension-ticks"
            d="M10 31H14M50 31H54"
            fill="none"
          />
          <path
            className="mc-brand-mark__dimension-vertical"
            d="M8 20V42M6 20H10M6 42H10"
            fill="none"
          />
          <path
            className="mc-brand-mark__dimension-base"
            d="M14 57H50M14 55V59M50 55V59"
            fill="none"
          />
          <circle className="mc-brand-mark__joint" cx="32" cy="31.5" r="1.7" />
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
