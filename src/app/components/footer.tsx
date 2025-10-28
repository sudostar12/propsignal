import Link from "next/link"
import { ExternalLink } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-gray-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto text-center space-y-4">

        {/* ✅ VIC Status Message */}
        <p className="text-sm text-gray-600">
          Now live in{" "}
          <span className="font-semibold text-[#28C381]">VIC</span>{" "}
          <span className="text-gray-400">|</span>{" "}
          NSW & QLD coming soon.
        </p>

        {/* ✅ Footer Links */}
        <div className="flex justify-center space-x-8 text-sm">
          <Link
            href="/privacy"
            className="text-gray-500 hover:text-gray-800 transition-colors"
          >
            Privacy policy
          </Link>
          <Link
            href="/terms"
            className="text-gray-500 hover:text-gray-800 transition-colors"
          >
            Terms and conditions
          </Link>
        </div>

        {/* Optional — small copyright note */}
        {/* <p className="text-xs text-gray-400 mt-4">
          © {new Date().getFullYear()} PropSignal. All rights reserved.
        </p> */}

      </div>
    </footer>

  )
}
