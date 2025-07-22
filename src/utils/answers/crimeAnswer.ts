import { fetchCrime } from "@/utils/fetchSuburbData";
import { getContext } from "@/utils/contextManager";

export async function answerCrimeStats(suburb: string): Promise<string> {
  console.log("[DEBUG-C1] Fetching crime data for suburb:", suburb);

  const context = getContext();
  const nearbySuburbs = context.nearbySuburbs || [];

  const { suburbData, error } = await fetchCrime(suburb);

  if (error || !suburbData || suburbData.length === 0) {
    console.error('[ERROR-C1] No crime data found for:', suburb);
    return `Sorry, I couldn't find crime data for ${suburb}.`;
  }

  const latest = suburbData[suburbData.length - 1];
  const prev = suburbData[suburbData.length - 2];

let trendMsg = "";

if (prev && latest.offenceCount && prev.offenceCount) {
  const changePercent = ((latest.offenceCount - prev.offenceCount) / prev.offenceCount) * 100;
  const rounded = changePercent.toFixed(1);

  if (changePercent > 5) {
    trendMsg = `⬆️ Increased by ${rounded}% compared to last year.`;
  } else if (changePercent < -5) {
    trendMsg = `⬇️ Decreased by ${Math.abs(Number(rounded))}% compared to last year.`;
  } else {
    trendMsg = `⚖️ Relatively stable (±5%) compared to last year.`;
  }
}


  // 💡 Build nearby suburbs message
  const nearbyResults: string[] = [];
  for (const nbSuburb of nearbySuburbs.slice(0, 2)) {
    const { suburbData: nbData } = await fetchCrime(nbSuburb);
    if (nbData && nbData.length > 0) {
      const nbLatest = nbData[nbData.length - 1];
      nearbyResults.push(`• ${nbSuburb}: ${nbLatest.offenceCount} offences in ${nbLatest.year}`);
    } else {
      nearbyResults.push(`• ${nbSuburb}: data not available`);
    }
  }

const nearbyMsg = nearbyResults.length
  ? `\n\n🏘️ **Nearby suburbs perspective:**\n${nearbyResults.join('\n')}`
  : "\n\n🏘️ No nearby suburb data found.";

const finalMsg = `🔎 **Crime Snapshot for ${suburb}**

🗓️ **Year**: ${latest.year}
🚨 **Reported Offences**: ${latest.offenceCount}
📈 **Trend**: ${trendMsg}${nearbyMsg}

💬 Let me know if you'd like to explore other trends or dive deeper into any specific areas!`;

return finalMsg;

}

