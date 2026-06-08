'use client'

interface MotivLogoProps {
  /** Size of the mark icon in px */
  markSize?: number
  /** Show the "MOTIV" wordmark next to/below the mark */
  showWordmark?: boolean
  /** Layout: 'horizontal' = mark + text side by side, 'stacked' = mark above text */
  layout?: 'horizontal' | 'stacked'
  className?: string
}

/**
 * Motiv brand logo — uses currentColor so it inherits text color from parent.
 * Wrap in a class like `text-[#0d1f2d] dark:text-[#e8dfc4]` to theme it.
 */
export function MotivLogo({
  markSize = 28,
  showWordmark = true,
  layout = 'horizontal',
  className = '',
}: MotivLogoProps) {
  const mark = (
    <svg
      width={markSize}
      height={markSize}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Outer square frame */}
      <rect
        x="6" y="6" width="68" height="68"
        stroke="currentColor" strokeWidth="7"
        fill="none" strokeLinejoin="miter"
      />
      {/* Interior diagonal — room/door perspective line */}
      <polyline
        points="6,6 50,54 74,54"
        stroke="currentColor" strokeWidth="7"
        strokeLinecap="square" strokeLinejoin="miter"
        fill="none"
      />
    </svg>
  )

  if (!showWordmark) return <span className={className}>{mark}</span>

  if (layout === 'stacked') {
    return (
      <div className={`flex flex-col items-center gap-2 ${className}`}>
        {mark}
        <div className="flex flex-col items-center gap-0.5">
          <span
            style={{ letterSpacing: '0.25em', fontWeight: 700, lineHeight: 1 }}
            className="text-2xl tracking-widest font-bold"
          >
            MOTIV
          </span>
          <span
            style={{ letterSpacing: '0.18em', fontWeight: 400, lineHeight: 1 }}
            className="text-[9px] tracking-widest opacity-70"
          >
            BUILT WITH PURPOSE.
          </span>
        </div>
      </div>
    )
  }

  // horizontal
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {mark}
      <span
        style={{ letterSpacing: '0.15em', fontWeight: 700 }}
        className="text-lg tracking-widest font-bold"
      >
        MOTIV
      </span>
    </div>
  )
}
