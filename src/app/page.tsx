import { Header } from "@/app/components/header"
import { HeroSection } from "@/app/components/hero-section"
import { FeaturesSection } from "@/app/components/features-section"
import { NewsletterSection } from "@/app/components/newsletter-section"
import { Footer } from "@/app/components/footer"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <NewsletterSection />
      </main>
      <Footer />
    </div>
  )
}


