import { answerCrimeStats } from "@/utils/answers/crimeAnswer";
import { answerMedianPrice } from "@/utils/answers/medianPriceAnswer";

export async function answerMultiSuburbComparison(suburbs: string[], topic: string): Promise<string> {
  const results: string[] = [];

  for (const suburb of suburbs) {
    let result = "";

    if (topic === "crime") {
      result = await answerCrimeStats(suburb);
    } else if (topic === "price") {
      result = await answerMedianPrice(suburb);
    } else {
      result = `I don't yet support "${topic}" data.`;
    }

    results.push(`**${suburb}:** ${result}`);
  }

  return `Here's a side-by-side comparison:\n\n${results.join("\n\n")}`;
}
