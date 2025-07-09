// src/utils/answers/newProjectsAnswer.ts

import { fetchProjects } from "@/utils/fetchSuburbData";

export interface ProjectRecord {
  project: string;
  description: string;
  investment: string;
}

// [DEBUG-NP1] New projects answer function
export async function answerNewProjects(suburb: string, lga: string): Promise<string> {
  console.log("[DEBUG-NP1] Fetching projects for: Suburb:", suburb, 'and LGA:', lga);

  const dataResult = await fetchProjects(lga);
  const projects: ProjectRecord[] = dataResult.data ?? [];

  console.log("[DEBUG-NP2] Total projects found:", projects.length);

  if (projects.length === 0) {
    return `I couldn't find any major projects reported in ${suburb}.`;
  }
// Note to user about LGA-level data
  const note = `⚡ Note: Project insights are provided at the LGA (local government area) level and may cover a broader area than just ${suburb}.`;

// Show top 3 example projects with investment info
  const topExamples = projects.slice(0, 3).map((p) => {
    return `🏗️ ${p.project}\n💬 ${p.description}\n💰 Investment: ${p.investment || "N/A"}`;
  }).join("\n\n");

   return `${note}\n\nI found ${projects.length} projects in LGA: ${lga} area). Here are a couple of examples:\n\n${topExamples}\n\nLet me know if you'd like more details on the full list!`;
}