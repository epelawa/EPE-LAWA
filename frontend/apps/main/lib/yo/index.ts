// Yorùbá interface dictionary, keyed by the exact English UI text.
// Machine-assisted first pass: a native-speaker review is still required before
// it is presented as an official translation (see docs/YORUBA_TRANSLATION.md).
import { PART_1 } from "./part-1";
import { PART_2 } from "./part-2";
import { PART_3 } from "./part-3";
import { PART_4 } from "./part-4";
import { PART_5 } from "./part-5";
import { PART_6 } from "./part-6";
import { PART_7 } from "./part-7";
import { PART_8 } from "./part-8";

export const YO: Record<string, string> = { ...PART_1, ...PART_2, ...PART_3, ...PART_4, ...PART_5, ...PART_6, ...PART_7, ...PART_8 };
