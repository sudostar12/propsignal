import { Database, Brain, Zap } from "lucide-react"

export function FeaturesSection() {
  const features = [
    {
      icon: Database,
      title: "Real Data Sources",
      description: "Combines government data, trends and market insights.",
    },
    {
      icon: Brain,
      title: "Smart Analysis",
      description: "Contextual insights you won't find elsewhere",
    },
    {
      icon: Zap,
      title: "Instant Insights",
      description: "Type your question and get answers in seconds.",
    },
  ]

  return (
    <section className="py-10 px-4 sm:px-6 lg:px-8 font-dm-sans bg-transparent">
      {/* 🔹 Divider to separate hero from features */}
<div
  role="separator"
  aria-label="Section divider"
  className="border-t border-dotted border-[#B2E5D4] mt-2 mb-6 w-1/2 md:w-[60%] mx-auto"
/>


      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">Why Use Our AI Property Tool?</h2>

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
      {/* 🔥 Differentiator Section */}
      <div className="mt-20 text-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Not Another Property Report
          </h2>
          <p className="text-gray-600 text-base leading-relaxed">
            Most suburb tools dump raw data. <strong>Prop Signal</strong> gives you real insight — context, comparisons, and investor-friendly analysis in seconds.
          </p>
        </div>
      </div>

    </section>
  )  
}
