import { Database, Brain, Zap } from "lucide-react"

export function FeaturesSection() {
  const features = [
    {
      icon: Database,
      title: "Real Data Sources",
      description: "Combines public data, trends and market insights.",
    },
    {
      icon: Brain,
      title: "AI-Generated Insights",
      description: "Instant analysis tailored to suburb-specific growth drivers.",
    },
    {
      icon: Zap,
      title: "Free & Instant",
      description: "Type a suburb and get answers in seconds.",
    },
  ]

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-transparent">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">Why Use Our AI Property Tool?</h2>

        <div className="grid md:grid-cols-3 gap-12">
          {features.map((feature, index) => (
            <div key={index} className="text-center">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <feature.icon className="w-8 h-8 text-teal-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
