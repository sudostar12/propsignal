import Link from "next/link"
import Image from "next/image"
import { FeedbackDialog } from "@/app/components/feedback-dialog";

export function Header() {
  return (
    <header className="bg-white/80 backdrop-blur-md px-4 py-2">
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
          <FeedbackDialog />
        </div>
      </div>
    </header>
  )
}
