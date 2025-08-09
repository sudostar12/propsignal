import Link from "next/link"
import { ExternalLink } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-transparent border-t border-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">

        {/* ✅ VIC Status Message */}
        <div className="text-center mb-6">
          <p className="text-sm text-gray-500">
            Now live in <span className="font-medium text-[#28C381]">VIC</span> &nbsp;|&nbsp; NSW & QLD coming soon.
          </p>
        </div>

        {/* Existing footer content */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0">
          <div>
            <p className="text-gray-600 mb-2">Contact us at</p>
            <Link
              href="mailto:support@propsignal.com.au"
              className="flex items-center space-x-2 text-gray-900 hover:text-teal-600 transition-colors"
            >
              <span>support@propsignal.com.au</span>
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>

          <div className="flex space-x-8">
            <Link href="/privacy" className="text-gray-600 hover:text-gray-900 transition-colors">
              Privacy policy
            </Link>
            <Link href="/terms" className="text-gray-600 hover:text-gray-900 transition-colors">
              Terms and conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
