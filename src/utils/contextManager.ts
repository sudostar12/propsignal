// src/utils/contextManager.ts

export type UserContext = {
  suburb?: string;
  lga?: string;
  state?: string;
  budget?: string;
  purpose?: string; // invest, live, rent
  propertyType?: string;
    clarificationOptions?: Array<{
    suburb: string;
    lga: string;
    state: string;
    }>
  pendingTopic?: string; // ✅ New field for clarification topic
  nearbySuburbs?: string[];
};

let sessionContext: UserContext = {};

export function updateContext(newData: Partial<UserContext>) {
  sessionContext = { ...sessionContext, ...newData };
}

export function getContext() {
  return sessionContext;
}

export function resetContext() {
  sessionContext = {};
}
