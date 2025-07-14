import Link from "next/link"
import { ExternalLink } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0">
          <div>
            <p className="text-gray-600 mb-2">Contact us at</p>
            <Link
              href="mailto:propsignal@gmail.com"
              className="flex items-center space-x-2 text-gray-900 hover:text-teal-600 transition-colors"
            >
              <span>propsignal@gmail.com</span>
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
