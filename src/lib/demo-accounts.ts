export const DEMO_PASSWORD = "folio-demo";

export const DEMO_ACCOUNTS = [
  { id: "user_khawer", name: "Khawer Ali", email: "khawer.ali@ajaia.test" },
  { id: "user_alex", name: "Alex Chen", email: "alex.chen@ajaia.test" },
  { id: "user_sam", name: "Sam Okafor", email: "sam.okafor@ajaia.test" },
] as const;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
