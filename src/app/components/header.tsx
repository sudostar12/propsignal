import Link from "next/link"
import { Button } from "@/app/components/ui/button"
import Image from "next/image"

export function Header() {
  return (
    <header className="bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* 🔗 Logo + Icon */}
          <Link href="/" className="flex items-center space-x-2">
            {/* Gradient glass effect icon container */}
           
              {/* Inner icon background */}
             <div className="w-10 h-10 rounded-[8px] overflow-hidden flex items-center justify-center bg-gradient-to-b from-[#28C381] to-[#27A4C8]">
                  <Image
                  src="/PropSignal-logo.svg"
                  alt="PropSignal logo"
                  width={40}
                  height={40}
                />
              </div>
            

            {/* Brand Name */}
            <span className="text-xl font-semibold text-gray-900">
              Prop <span className="text-gray-400">Signal</span>
            </span>
          </Link>

          {/* ✉️ Feedback Button */}
          <Button
           variant="outline"
  className="px-3 py-2 rounded-[8px] border border-[#1E9464] text-[#1E9464] text-sm font-medium bg-white hover:bg-teal-50 transition-colors"
>
            Submit your feedback
          </Button>
        </div>
      </div>
    </header>
  )
}
