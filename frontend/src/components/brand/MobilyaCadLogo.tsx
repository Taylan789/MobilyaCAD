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
        <svg viewBox="0 0 52 52" fill="none" focusable="false">
          <rect
            x="1.5"
            y="1.5"
            width="49"
            height="49"
            rx="11"
            fill="#121C24"
            stroke="#4A6272"
          />
          <path
            d="M8 16 26 6 44 16V36L26 46 8 36V16Z"
            stroke="#DCE6EC"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path
            d="M14 18.5 26 12 38 18.5V33.5L26 40 14 33.5V18.5Z"
            stroke="#91B7D0"
            strokeWidth="1.65"
            strokeLinejoin="round"
          />
          <path
            d="M26 12V40M14 18.5 26 25 38 18.5"
            stroke="#D1DFE7"
            strokeWidth="1.15"
            strokeLinejoin="round"
          />
          <path
            d="M19 29H23M29 29H33"
            stroke="#9FC4DD"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M8 16 14 18.5M44 16 38 18.5"
            stroke="#DCE6EC"
            strokeOpacity=".55"
            strokeWidth="1.1"
          />
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
