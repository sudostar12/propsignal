// /src/utils/suggestions.ts

export function getSuggestionsForTopic(topic: string): string[] {
  console.log("[DEBUG-SUGGEST] Getting suggestions for topic:", topic);

  let pool: string[] = [];

  switch (topic) {
    case "price":
      pool = [
        "How has the median price changed over 3 years?",
        "What are price trends for houses vs units?",
        "Is it a good time to buy now?",
        "How does this suburb's price compare to nearby suburbs?",
        "Are prices expected to grow further?",
        "Is it a buyer’s or seller’s market?",
        "What drives price changes here?",
        "How negotiable are prices in this suburb?",
        "What is the average days on market?",
        "Are there seasonal price fluctuations?"
      ];
      break;

    case "crime":
      pool = [
        "How does crime compare to nearby suburbs?",
        "What types of crimes are most common here?",
        "Has crime increased or decreased recently?",
        "Does crime affect rental demand here?",
        "How does safety impact price growth?",
        "Are there active safety programs here?",
        "How safe is this suburb for families?",
        "Are there crime hotspots within the suburb?",
        "How does safety compare to the state average?",
        "What safety initiatives are planned?"
      ];
      break;

    case "yield":
      pool = [
        "What is the current gross rental yield?",
        "How has yield changed in the past 3 years?",
        "What property types achieve highest yield?",
        "How does yield compare with nearby suburbs?",
        "What tenant demographics are common here?",
        "Are rents increasing in line with prices?",
        "What is the typical vacancy rate?",
        "Is this suburb better for long- or short-term rentals?",
        "What are typical rental increases yearly?",
        "What drives rental demand here?"
      ];
      break;

    case "profile":
      pool = [
        "What is the demographic breakdown here?",
        "How do schools impact demand here?",
        "What new infrastructure is coming?",
        "How are transport links and commute options?",
        "What lifestyle features stand out here?",
        "How family friendly is this suburb?",
        "What future growth potential is there?",
        "How does community engagement look?",
        "What is the median household income?",
        "How does local planning shape future development?"
      ];
      break;

    default:
      pool = [
        "Suggest a good suburb under my budget",
        "What suburbs are best for families?",
        "Compare two suburbs for investment",
        "Which suburbs have lowest vacancy rates?",
        "Where are upcoming investor hotspots?",
        "What suburbs are good for first-home buyers?",
        "Which suburbs balance growth and yield?",
        "How can I find suburbs with strong price growth?",
        "What suburbs have strong community vibe?",
        "What are top growth suburbs in my state?"
      ];
      break;
  }

  // ✅ Pick 2 random unique suggestions
  const selected: string[] = [];
  while (selected.length < 2 && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    selected.push(pool[idx]);
    pool.splice(idx, 1);
  }

  console.log("[DEBUG-SUGGEST] Selected suggestions:", selected);
  return selected;
}
