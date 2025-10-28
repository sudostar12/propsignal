import Link from "next/link"
import Image from "next/image"
import { FeedbackDialog } from "@/app/components/feedback-dialog";

export function Header() {
  return (
    <header className="bg-white/80 backdrop-blur-md px-4 py-2">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Use a 3-column layout that behaves well on mobile */}
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 h-16 min-w-0">
          
          {/* 🔗 Logo + Brand */}
          <Link href="/" className="flex items-center gap-2 min-w-0">
            {/* Logo (unchanged colours) */}
            <div className="w-10 h-10 rounded-[8px] overflow-hidden flex items-center justify-center bg-gradient-to-b from-[#28C381] to-[#27A4C8] shrink-0">
              <Image
                src="/PropSignal-logo.svg"
                alt="PropSignal logo"
                width={40}
                height={40}
                priority
              />
            </div>

            {/* Brand Name — allow truncation on narrow screens */}
            <span className="text-xl font-semibold text-gray-900 truncate">
              Prop <span className="text-gray-400">Signal</span>
            </span>
          </Link>

          {/* spacer is implicit via 1fr middle column */}

          {/* ✉️ Feedback Button (launcher) */}
          <div className="justify-self-end shrink-0">
            <FeedbackDialog
              triggerClassName="
                px-4 sm:px-6 py-2
                rounded-[10px]
                bg-gradient-to-r from-[#28C381] to-[#27A4C8]
                text-white text-sm sm:text-base font-medium font-dm-sans
                leading-[20px] sm:leading-[22px]
                whitespace-nowrap
                transition-all duration-300 hover:opacity-90 hover:text-black
                shadow-none border-0
              "
            />
          </div>
        </div>
      </div>
    </header>
  );
}
