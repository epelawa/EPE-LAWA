export const EVENT_CATEGORIES = [
  ["festival", "Festival or celebration"],
  ["community", "Community meeting"],
  ["business", "Business or market"],
  ["civic", "Civic or town hall"],
  ["culture", "Culture and heritage"],
  ["faith", "Faith gathering"],
  ["sports", "Sports"],
] as const;

export function eventCategoryLabel(value: string | null | undefined): string {
  return EVENT_CATEGORIES.find(([key]) => key === value)?.[1] ?? "Community";
}
