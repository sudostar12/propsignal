import * as React from "react"
//import { cva, type VariantProps } from "class-variance-authority"

//import { cn } from "@/lib/utils"

export const GraphUpIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
    <rect width="24" height="24" rx="6" fill="currentColour" />
    <path d="M6 16L10 12L13 15L18 10" stroke="#28C381" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="6" cy="16" r="1.5" fill="#28C381" />
    <circle cx="10" cy="12" r="1.5" fill="#28C381" />
    <circle cx="13" cy="15" r="1.5" fill="#28C381" />
    <circle cx="18" cy="10" r="1.5" fill="#28C381" />
  </svg>
)
