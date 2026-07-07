/** Occupation choices for student profiles (sync with prisma/schema.prisma Occupation enum). */
export const OCCUPATION_OPTIONS = [
  { value: "STUDENT", label: "Student" },
  { value: "WORKING", label: "Working (private sector)" },
  { value: "GOVERNMENT_EMPLOYEE", label: "Government employee" },
  { value: "SELF_EMPLOYED", label: "Self-employed / business owner" },
  { value: "LABOURER", label: "Labour / daily wage worker" },
  { value: "POLICE_OFFICER", label: "Police officer" },
  { value: "ARMED_FORCES", label: "Armed forces" },
  { value: "TEACHER", label: "Teacher / educator" },
  { value: "HEALTHCARE_WORKER", label: "Healthcare worker" },
  { value: "ENGINEER", label: "Engineer" },
  { value: "IT_PROFESSIONAL", label: "IT / software professional" },
  { value: "ACCOUNTANT", label: "Accountant / finance" },
  { value: "LAWYER", label: "Lawyer / legal professional" },
  { value: "DRIVER", label: "Driver / transport worker" },
  { value: "FARMER", label: "Farmer / agriculture" },
  { value: "SHOPKEEPER", label: "Shopkeeper / retail" },
  { value: "CLERGY", label: "Imam / religious scholar" },
  { value: "HOMEMAKER", label: "Homemaker" },
  { value: "RETIRED", label: "Retired" },
  { value: "UNEMPLOYED", label: "Unemployed" },
] as const;

export type OccupationValue = (typeof OCCUPATION_OPTIONS)[number]["value"];

export const OCCUPATION_VALUES = OCCUPATION_OPTIONS.map((o) => o.value) as [
  OccupationValue,
  ...OccupationValue[],
];

const labelByValue = new Map(OCCUPATION_OPTIONS.map((o) => [o.value, o.label]));

export function occupationLabel(occupation: string | null | undefined): string {
  if (!occupation) return "—";
  return labelByValue.get(occupation as OccupationValue) ?? occupation.replace(/_/g, " ").toLowerCase();
}
