import * as React from "react"

export function ChatMoneyIcon({ className }: { className?: string }) {
  return (
    <div className={className}>
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer chat bubble (20x20), offset by (2,2), with 50% opacity */}
        <rect
          x="2"
          y="2"
          width="20"
          height="20"
          rx="10"
          fill="#28C283"
          opacity="0.5"
        />
        {/* Dollar bar (5.5 x 9.5), aligned as per Figma at top: 7.25, left: 9.25 */}
        <rect
          x="9.25"
          y="7.25"
          width="5.5"
          height="9.5"
          rx="1"
          fill="#28C283"
        />
      </svg>
    </div>
  )
}
