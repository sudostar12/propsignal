// utils/aiPromptBuilder.ts

interface SuburbPromptInput {
  suburb: string
  state: string
  lga: string
  data: Record<string, unknown>
}

export function buildSuburbPrompt({ suburb, state, lga, data }: SuburbPromptInput): string {
  return `
You are a real estate investment analyst. Provide a structured investment overview for:

Suburb: ${suburb}
State: ${state}
LGA: ${lga}

Available Data:
${JSON.stringify(data, null, 2)}

Your response must be structured with markdown headings and include these sections:

## 💡 Executive Summary
Start with a 1-2 line TL;DR summarising the investment attractiveness of the suburb.

## 📈 Capital Growth
- Median house prices and growth trends (mention % or $ where applicable)
- Compare to Melbourne/VIC average if data exists

## 🏡 Rental Market
- Median rent and rental yield (estimate yield if rent + price data is available)
- Mention rental trends and demand drivers
- Use emojis like 🟢🟡🔴 to indicate strength

## 👥 Demographics & Demand Drivers
- Median age, population growth, cultural diversity
- Notable demographic patterns compared to metro

## 🎓 Infrastructure & Schools
- Key schools and infrastructure projects
- Pressures (e.g., over-enrolment, transport gaps)

## ⚠️ Risks & Watchlist
- Crime trends and any year-on-year changes
- Any risks (e.g. oversupply, lack of amenities)
- Add smart triggers to monitor ("If X happens, risk improves")

## 🧠 Investment Verdict
Summarise:
- Capital Growth: 🟢🟡🔴
- Yield Potential: 🟢🟡🔴
- Risk Level: 🟢🟡🔴
- Best suited for: Long-term investor / yield-focused buyer / etc
- Final rating (optional): ⭐⭐⭐⭐ out of 5

Keep the language clear, informative, and analytical. Avoid fluff.
`.trim()
}
