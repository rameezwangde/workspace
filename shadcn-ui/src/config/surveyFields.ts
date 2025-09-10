import { CarbonCategories } from "@/types";

export type NumericField = {
  id: keyof CarbonCategories;         // must match your numeric keys
  label: string;
  kind: "slider";
  min: number; max: number; step: number;
  unit?: string;
  defaultValue: number;
};

export type SelectField = {
  id: "Diet" | "Heating Energy Source" | "Recycling" | "Cooking_With" | "Social Activity";
  label: string;
  kind: "select";
  options: string[];
  defaultValue: string;
};

export type Field = NumericField | SelectField;

export const NUMERIC_FIELDS: NumericField[] = [
  { id: "transport_km",       label: "Transportation (km/month)",     kind:"slider", min:0, max:1000, step:10, unit:"km/month", defaultValue:100 },
  { id: "electricity_kWh",    label: "Electricity (kWh/month)",       kind:"slider", min:0, max:1000, step:10, unit:"kWh/month", defaultValue:300 },
  { id: "lpg_kg",             label: "LPG/Gas (kg/month)",            kind:"slider", min:0, max:50,   step:1,  unit:"kg/month",  defaultValue:15 },
  { id: "flights_hours",      label: "Air travel (hours/year)",       kind:"slider", min:0, max:100,  step:1,  unit:"h/year",    defaultValue:5 },
  { id: "meat_meals",         label: "Meat meals / month",            kind:"slider", min:0, max:90,   step:1,                  defaultValue:30 },
  { id: "dining_out",         label: "Dining out / month",            kind:"slider", min:0, max:30,   step:1,                  defaultValue:10 },
  { id: "shopping_spend",     label: "Shopping (₹/month)",            kind:"slider", min:0, max:50000,step:100,unit:"₹/month",  defaultValue:500 },
  { id: "waste_kg",           label: "Waste (kg/month)",              kind:"slider", min:0, max:200,  step:1,                  defaultValue:50 },
];

export const SELECT_FIELDS: SelectField[] = [
  { id: "Diet",                   label: "Diet",                   kind:"select", options:["Vegan","Vegetarian","Pescatarian","Omnivore","Meat-Heavy"], defaultValue:"Omnivore" },
  { id: "Cooking_With",           label: "Cooking energy",         kind:"select", options:["Electricity","LPG","Wood","Coal"], defaultValue:"LPG" },
  { id: "Heating Energy Source",  label: "Heating energy source",  kind:"select", options:["Electricity","Natural Gas","Coal","Renewable","None"], defaultValue:"Electricity" },
  { id: "Recycling",              label: "Recycling habit",        kind:"select", options:["Always","Sometimes","Never"], defaultValue:"Sometimes" },
  { id: "Social Activity",        label: "Social activity level",  kind:"select", options:["Low","Medium","High"], defaultValue:"Medium" },
];
