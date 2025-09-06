// src/utils/responseFormatter.ts
export function cat(v?: number|null) {
  if (v == null || Number.isNaN(Number(v))) return "";
  const n = Number(v);
  return n >= 5 ? "🟢 High" : n >= 4 ? "🟡 Moderate" : n >= 3 ? "🟠 Low" : "🔴 Very Low";
}

export function fmtPrice(n?: number|null) {
  return n == null ? "N/A" : `$${Number(n).toLocaleString()}`;
}

export function formatMarkdownReply(suburb: string, result: any) {
  const latestPR = result.latestPR || {};
  const rentH = latestPR?.rent?.house, priceH = latestPR?.price?.house;
  const latestYearPR = latestPR?.year ?? "";

  const hy = result.latestYield?.house;
  const uy = result.latestYield?.unit;

  const houseHeadline = hy!=null ? `${hy.toFixed(1)}% (${cat(hy)})` : "N/A";
  const unitHeadline  = uy!=null ? `${uy.toFixed(1)}% (${cat(uy)})` : "N/A";

  // Yield series
  const hs = (result.yieldSeries||[]).find((s:any)=>s.propertyType==="house");
  const us = (result.yieldSeries||[]).find((s:any)=>s.propertyType==="unit");
  const houseTrend = hs?.points?.filter((p:any)=>p.value!=null).length
    ? `• 🏠 **House**: ${hs.points.map((p:any)=>`${p.year}: ${p.value?.toFixed(1)}%`).join(", ")}`
    : "";
  const unitTrend = us?.points?.filter((p:any)=>p.value!=null).length
    ? `• 🏢 **Unit**: ${us.points.map((p:any)=>`${p.year}: ${p.value?.toFixed(1)}%`).join(", ")}`
    : "";
  const trendBlock = (houseTrend || unitTrend)
    ? `\n📈 **${Math.max(hs?.points?.length||0, us?.points?.length||0)}-Year Yield Trend**\n${[houseTrend, unitTrend].filter(Boolean).join("\n")}\n`
    : "";

  // Nearby
  const nb = result.nearbyCompare?.rows || [];
  const nearbyBlock = nb.length
    ? `\n🔎 **Nearby suburbs perspective**\n${nb.map((r:any)=>`• **${r.suburb}** → 🏠 House: ${r.house!=null?r.house.toFixed(1)+'%':'N/A'}, 🏢 Unit: ${r.unit!=null?r.unit.toFixed(1)+'%':'N/A'}`).join("\n")}`
    : "";

  // Bedroom snapshot
  const bh = result.bedroomHouse, bu = result.bedroomUnit;
  const bedLines:string[] = [];
  if (bh) bedLines.push(`• 🏠 **House (${bh.bedroom}BR, ${bh.year})** — Price: ${fmtPrice(bh.price)} | Rent: ${fmtPrice(bh.rentWeekly)}/wk | Implied Yield: ${bh.impliedYield.toFixed(1)}%`);
  if (bu) bedLines.push(`• 🏢 **Unit (${bu.bedroom}BR, ${bu.year})** — Price: ${fmtPrice(bu.price)} | Rent: ${fmtPrice(bu.rentWeekly)}/wk | Implied Yield: ${bu.impliedYield.toFixed(1)}%`);
  const bedBlock = bedLines.length ? `\n🛏️ **Bedroom snapshot**\n${bedLines.join("\n")}` : "";

  // Capital-city avg deltas (optional but useful)
  const d = (v?:number|null,a?:number|null)=> (v!=null && a!=null) ? Number((v-a).toFixed(1)) : null;
  const dH = d(hy, result.capitalAvg?.house);
  const dU = d(uy, result.capitalAvg?.unit);
  const arrow = (n:number)=> n>0?'▲':n<0?'▼':'■';
  const deltaLine = (dH!=null || dU!=null)
    ? `\n↕️ **Vs capital-city avg** — House: ${dH!=null?`${dH.toFixed(1)} pp ${arrow(dH)}`:'N/A'}, Unit: ${dU!=null?`${dU.toFixed(1)} pp ${arrow(dU)}`:'N/A'}\n`
    : "";

  return (
`**Rental Insights for ${suburb}**

- Median Weekly Rent (${latestYearPR}): ${fmtPrice(rentH)}
- Median House Price (${latestYearPR}): ${fmtPrice(priceH)}
- Estimated Gross Yield — House: ${houseHeadline}
- Estimated Gross Yield — Unit: ${unitHeadline}
${deltaLine}${trendBlock}${nearbyBlock}${bedBlock}`
  );
}
