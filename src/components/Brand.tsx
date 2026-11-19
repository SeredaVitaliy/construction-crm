export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs>
        <clipPath id="bm-clip">
          <rect width="32" height="32" rx="7" />
        </clipPath>
        <pattern id="bm-hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="5" height="10" fill="#1E2A32" />
        </pattern>
      </defs>
      <g clipPath="url(#bm-clip)">
        <rect width="32" height="32" fill="#F2B300" />
        <rect y="20" width="32" height="12" fill="url(#bm-hatch)" />
        <path d="M8 20V11l8-4 8 4v9" fill="none" stroke="#1E2A32" strokeWidth="3" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export function Brand() {
  return (
    <span className="brand">
      <BrandMark />
      СтройТрек
    </span>
  );
}
