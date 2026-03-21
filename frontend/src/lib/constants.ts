export const COMPANY_TYPES = [
  { value: "landscaping", label: "Landscaping / Lawn Care" },
  { value: "trucking_local", label: "Local / Regional Trucking" },
  { value: "trucking_longhaul", label: "Long-Haul Trucking" },
  { value: "delivery", label: "Delivery / Last Mile" },
  { value: "construction", label: "Construction" },
  { value: "other", label: "Other" },
];

export const FUEL_TYPES = [
  { value: "gasoline", label: "Gasoline" },
  { value: "diesel", label: "Diesel" },
  { value: "both", label: "Both (Gasoline & Diesel)" },
];

export const VEHICLE_TYPES = [
  { value: "pickup_truck", label: "Pickup Truck" },
  { value: "van", label: "Van" },
  { value: "box_truck", label: "Box Truck" },
  { value: "flatbed", label: "Flatbed" },
  { value: "semi", label: "Semi Truck" },
  { value: "dump_truck", label: "Dump Truck" },
  { value: "mower_trailer", label: "Mower/Trailer" },
  { value: "heavy_equipment", label: "Heavy Equipment" },
  { value: "tanker", label: "Tanker" },
];

export const US_STATES = [
  { value: "AL", label: "Alabama" }, { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" }, { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" }, { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" }, { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" }, { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" }, { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" }, { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" }, { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" }, { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" }, { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" }, { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" }, { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" }, { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" }, { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" }, { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" }, { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" }, { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" }, { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" }, { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" }, { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" }, { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" }, { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" }, { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" }, { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" }, { value: "WY", label: "Wyoming" },
  { value: "DC", label: "Washington DC" },
];

export const PADD_LABELS: Record<string, string> = {
  R10: "East Coast (PADD 1)",
  R20: "Midwest (PADD 2)",
  R30: "Gulf Coast (PADD 3)",
  R40: "Rocky Mountain (PADD 4)",
  R50: "West Coast (PADD 5)",
  NUS: "U.S. Average",
};

export const DEAL_STAGES = [
  { value: "prospect", label: "Prospect", color: "bg-gray-100 text-gray-700" },
  { value: "proposed", label: "Proposed", color: "bg-blue-100 text-blue-700" },
  { value: "signed", label: "Signed", color: "bg-green-100 text-green-700" },
  { value: "active", label: "Active", color: "bg-emerald-100 text-emerald-700" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-700" },
];

export const FEE_STRUCTURES = [
  { value: "flat", label: "Flat Advisory Fee", description: "One-time fee per hedging plan ($500–$2,000)" },
  { value: "aum_percentage", label: "AUM-Based Fee", description: "Annual % of hedge position value (1.0–2.0%)" },
  { value: "subscription", label: "Monthly Subscription", description: "Ongoing monthly fee ($200–$500/mo)" },
];

export const INDUSTRY_DEFAULTS: Record<string, { fuel_type: string; gallons_per_unit: number; }> = {
  landscaping: { fuel_type: "gasoline", gallons_per_unit: 225 },
  trucking_local: { fuel_type: "diesel", gallons_per_unit: 2000 },
  trucking_longhaul: { fuel_type: "diesel", gallons_per_unit: 7500 },
  delivery: { fuel_type: "gasoline", gallons_per_unit: 350 },
  construction: { fuel_type: "diesel", gallons_per_unit: 1000 },
};
