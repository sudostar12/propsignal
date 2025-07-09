// src/utils/answers/newProjectsAnswer.ts

import { fetchProjects } from "@/utils/fetchSuburbData";

export interface ProjectRecord {
  project_name: string;
  status: string;
}

// [DEBUG-NP1] New projects answer function
export async function answerNewProjects(suburb: string): Promise<string> {
  console.log("[DEBUG-NP1] Fetching projects for:", suburb);

  const dataResult = await fetchProjects(suburb);
  const projects: ProjectRecord[] = dataResult.data ?? [];

  console.log("[DEBUG-NP2] Total projects found:", projects.length);

  if (projects.length === 0) {
    return `I couldn't find any active or planned projects in ${suburb}.`;
  }

  // Example: count active projects
  const activeProjects: ProjectRecord[] = projects.filter(
    (p: ProjectRecord) => p.status === "active" || p.status === "planned"
  );

  if (activeProjects.length === 0) {
    return `There are no major upcoming projects currently reported for ${suburb}.`;
  }

  const majorExamples = activeProjects.slice(0, 2).map((p) => p.project_name).join(", ");

  return `I found ${activeProjects.length} active or planned projects in ${suburb}. For example: ${majorExamples}. Let me know if you'd like to see more details on each project.`;
}