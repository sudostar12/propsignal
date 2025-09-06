// src/utils/schemaRegistry.ts
export const schemaRegistry = {
  tables: {
    median_price: {
      columns: ["suburb", "postcode", "state", "year", "propertyType", "bedroom", "medianPrice"],
    },
    median_rentals: {
      columns: ["suburb", "postcode", "state", "year", "propertyType", "bedroom", "medianRent"],
    },
  },
  enums: {
    propertyType: ["house", "unit"] as const,
  },
  prefs: {
    houseBedrooms: [4, 3, 2],
    unitBedrooms: [2, 1, 3], // more representative stock
  },
} as const;

export type PT = (typeof schemaRegistry.enums.propertyType)[number];
