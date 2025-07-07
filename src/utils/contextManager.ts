// src/utils/contextManager.ts

export type UserContext = {
  suburb?: string;
  lga?: string;
  state?: string;
  budget?: string;
  purpose?: string; // invest, live, rent
  propertyType?: string;
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
