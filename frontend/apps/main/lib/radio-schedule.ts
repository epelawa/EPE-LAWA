import type { IcsSlot } from "../app/radio/programmes/ics";

export const PUBLIC_SCHEDULE_COLUMNS = "id,day_of_week,starts_at,ends_at,note,programmes!inner(name)";

type ScheduleRow = Omit<IcsSlot, "programme"> & {
  programmes: { name: string } | { name: string }[] | null;
};

export function publicScheduleSlot({ programmes, ...slot }: ScheduleRow): IcsSlot {
  const programme = Array.isArray(programmes) ? programmes[0] : programmes;
  return { ...slot, programme: programme?.name ?? null };
}
