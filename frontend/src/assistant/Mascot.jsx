// ---------------------------------------------------------------------------------------
// The assistant's mascot: a friendly Gulf gentleman in ghutra + agal, drawn as inline
// SVG — no external image, so it ships with the bundle, stays razor sharp at any size,
// and every part can animate. The idle life comes from two CSS animations in index.css:
//   .qre-mascot-bob   gentle breathing bob + a small sway on the whole head
//   .qre-m-blink      periodic eye blink (scaleY on the eyes group)
// Colors stay in the site family: ink agal, white ghutra, warm friendly face.
// ---------------------------------------------------------------------------------------
export default function Mascot({ className = 'w-16 h-16' }) {
  return (
    <svg viewBox="0 0 120 120" className={`qre-mascot ${className}`} aria-hidden focusable="false">
      <g className="qre-mascot-bob">
        {/* ghutra — back and side drapes down to the shoulders */}
        <path
          d="M60 12 C 38 12, 24 28, 24 48 C 24 60, 26 70, 23 82 C 20 96, 32 106, 45 104 L 75 104 C 88 106, 100 96, 97 82 C 94 70, 96 60, 96 48 C 96 28, 82 12, 60 12 Z"
          fill="#FCFCFD" stroke="#DEE2E9" strokeWidth="2" />
        {/* face */}
        <ellipse cx="60" cy="63" rx="21" ry="25" fill="#EDB48E" />
        {/* ghutra — front fold across the forehead */}
        <path
          d="M37 54 C 37 32, 47 24, 60 24 C 73 24, 83 32, 83 54 C 77 42, 69 38, 60 38 C 51 38, 43 42, 37 54 Z"
          fill="#FFFFFF" stroke="#E5E8EE" strokeWidth="1.5" />
        {/* agal — double black cord */}
        <path d="M35 36 C 45 26, 75 26, 85 36" stroke="#2B2D42" strokeWidth="6.5" fill="none" strokeLinecap="round" />
        <path d="M36.5 44.5 C 46 36, 74 36, 83.5 44.5" stroke="#2B2D42" strokeWidth="5" fill="none" strokeLinecap="round" />
        {/* agal side cord (tarboosha) hanging down the side of the ghutra */}
        <path d="M86 40 C 90.5 46, 91.5 53, 90 60" stroke="#2B2D42" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <circle cx="89.7" cy="62.5" r="2" fill="#2B2D42" />
        {/* eyebrows */}
        <path d="M45.5 56 Q 50.5 52.5, 55.5 54.7" stroke="#4A3423" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <path d="M64.5 54.7 Q 69.5 52.5, 74.5 56" stroke="#4A3423" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        {/* eyes — the blinking group */}
        <g className="qre-m-blink">
          <ellipse cx="50.8" cy="62.5" rx="2.9" ry="3.8" fill="#241B12" />
          <ellipse cx="69.2" cy="62.5" rx="2.9" ry="3.8" fill="#241B12" />
          <circle cx="51.9" cy="61.1" r="1" fill="#FFFFFF" opacity="0.9" />
          <circle cx="70.3" cy="61.1" r="1" fill="#FFFFFF" opacity="0.9" />
        </g>
        {/* nose */}
        <path d="M60 63.5 C 59 67, 59 70, 60.6 72" stroke="#D99A6C" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* neat beard framing the jaw */}
        <path
          d="M40 66 C 40 88, 47.5 98.5, 60 98.5 C 72.5 98.5, 80 88, 80 66 C 80 84, 71.5 91, 60 91 C 48.5 91, 40 84, 40 66 Z"
          fill="#4A3423" />
        {/* mustache */}
        <path d="M53 78.8 Q 60 82.6, 67 78.8" stroke="#4A3423" strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* smile */}
        <path d="M55 84 Q 60 88, 65 84" stroke="#8C4F2C" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  )
}
