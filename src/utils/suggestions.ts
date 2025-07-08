export function getSuggestionsForTopic(topic: string): string[] {
  switch (topic) {
    case "price":
      return [
        "How has the price changed in 3 years?",
        "What is the price trend compared to nearby suburbs?",
        "Is it a good time to buy now?"
      ];
    case "crime":
      return [
        "Compare crime to a nearby suburb",
        "Show historical crime trends",
        "How does safety affect price growth?"
      ];
    case "yield":
      return [
        "Compare rental yield to other suburbs",
        "What type of properties give better yield?",
        "How has the yield changed recently?"
      ];
    case "profile":
      return [
        "Tell me about demographics",
        "Show price growth trends",
        "What new projects are coming?"
      ];
    default:
      return [
        "Suggest a good suburb for my budget",
        "Compare different suburbs",
        "What are top growth suburbs nearby?"
      ];
  }
}
