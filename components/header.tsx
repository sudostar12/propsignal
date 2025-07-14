import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home } from "lucide-react"

export function Header() {
  return (
    <header className="bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
              <Home className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-gray-900">
              Prop <span className="text-gray-400">Signal</span>
            </span>
          </Link>

          <Button variant="outline" className="border-teal-500 text-teal-600 hover:bg-teal-50 bg-transparent">
            Submit your feedback
          </Button>
        </div>
      </div>
    </header>
  )
}
