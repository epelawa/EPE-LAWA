// Yorùbá interface dictionary, keyed by the exact English UI text.
// Machine-assisted first pass: a native-speaker review is still required before
// it is presented as an official translation (see docs/YORUBA_TRANSLATION.md).
import { PART_1 } from "./part-1";
import { PART_2 } from "./part-2";
import { PART_3 } from "./part-3";

export const YO: Record<string, string> = { ...PART_1, ...PART_2, ...PART_3 };
