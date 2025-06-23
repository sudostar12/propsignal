// utils/aiPromptBuilder.ts

export function buildSuburbPrompt({
  suburb,
  state,
  lga,
  data,
}: {
  suburb: string;
  state: string;
  lga: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}): string {
  return `
You are an expert real estate investment analyst.
Create a structured suburb investment report with bullet points and data-driven insights.
Only use the data provided.

Suburb: ${suburb}
State: ${state}
LGA: ${lga}

---

Data:
${JSON.stringify(data, null, 2)}

---

Output format:

🏘️ Suburb Investment Snapshot: ${suburb}, ${state}
---------------------------------------------

📈 Capital Growth
- Median House Price: [latest]
- Historical Growth: [trend or CAGR]

🏡 Rental Market
- Median Rent: [latest]
- Yield Estimate: [if possible]
- Rental Demand: [comment on growth or stability]

👥 Demographics
- Median Age: [value]
- Population Growth: [if available]
- Cultural Diversity: [summarise % or comment]

🎓 Infrastructure
- Key Schools: [list or summarise]
- Pressure on schools or transport: [Yes/No/Comment]

⚠️ Risks & Watchlist
- Crime Trend: [e.g. +40% YoY]
- Infrastructure Gaps: [comment if any]

✅ Investment Verdict
- Score: [1–10 if known]
- Risk Level: [Low / Moderate / High]
- Summary: [1-line call to action for buyers]
`.trim();
}
