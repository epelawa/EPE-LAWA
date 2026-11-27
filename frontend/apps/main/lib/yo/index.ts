// Yorùbá interface dictionary, keyed by the exact English UI text.
// Machine-assisted first pass: a native-speaker review is still required before
// it is presented as an official translation.
import { yorubaInterfaceLabels } from "../i18n-messages";
import { PART_1 } from "./part-1";
import { PART_2 } from "./part-2";
import { PART_3 } from "./part-3";
import { PART_4 } from "./part-4";
import { PART_5 } from "./part-5";
import { PART_6 } from "./part-6";
import { PART_7 } from "./part-7";
import { PART_8 } from "./part-8";

const latest = {
  "Advertising opportunities": "Àwọn àǹfààní ìpolówó",
  "Could not check notification settings for this device.": "A kò lè ṣàyẹ̀wò ètò ìkìlọ̀ fún ẹ̀rọ yìí.",
  "Check again": "Ṣàyẹ̀wò lẹ́ẹ̀kan sí i.",
  "Listen without mobile data": "Gbọ́ rédíò láìlo dátà fóònù",
  "Live streaming on this site needs internet access. If your phone has an FM tuner and an FM Radio app, open that app and tune to a station below. Some phones use wired headphones as the antenna.": "O nílò íńtánẹ́ẹ̀tì láti gbọ́ rédíò tààrà lórí ojú-òpó yìí. Bí fóònù rẹ bá ní ẹ̀rọ agbóhùnsáfẹ́fẹ́ FM àti áàpù Rédíò FM, ṣí áàpù náà, kí o sì yan ọ̀kan lára àwọn ilé rédíò tó wà nísàlẹ̀. Àwọn fóònù kan máa ń lo agbétí etí oníwáyà gẹ́gẹ́ bí eriali.",
  "Reception depends on your location and device.": "Ibi tí o wà àti irú ẹ̀rọ rẹ ni yóò pinnu bí o ṣe lè gbọ́ rédíò náà.",
  "Save for offline reading": "Fi pamọ́ láti kà láìsí íńtánẹ́ẹ̀tì",
  "Saving story…": "À ń fi ìròyìn pamọ́…",
  "Saved on this device. Reopen this story at the same address to read it offline.": "A ti fi pamọ́ sórí ẹ̀rọ yìí. Padà sí àdírẹ́sì ìròyìn yìí láti kà á láìsí íńtánẹ́ẹ̀tì.",
  "Could not save this story in your browser. Try downloading a copy instead.": "A kò lè fi ìròyìn yìí pamọ́ sínú aṣàwákiri rẹ. Gbìyànjú láti gba ẹ̀dà rẹ̀ sílẹ̀.",
  "Offline copies contain story text only. Your browser keeps up to 20 saved stories on this device.": "Ọ̀rọ̀ ìròyìn nìkan ló wà nínú ẹ̀dà àìsí-íńtánẹ́ẹ̀tì. Aṣàwákiri rẹ lè fi ìròyìn ogún pamọ́ sórí ẹ̀rọ yìí.",
  "Your settings could not be saved. Please try again.": "A kò lè fi ètò rẹ pamọ́. Jọ̀wọ́ gbìyànjú lẹ́ẹ̀kan sí i.",
  "Your choice could not be saved. Please try again.": "A kò lè fi ohun tí o yàn pamọ́. Jọ̀wọ́ gbìyànjú lẹ́ẹ̀kan sí i.",
  "The address may have changed, or the page may not be public.": "Àdírẹ́sì náà lè ti yí padà, tàbí ojú-ìwé náà kò sí fún gbogbo ènìyàn.",
  "Stay Connected": "Má ṣe jáwọ́ nínú ìbáṣepọ̀",
};

export const YO: Record<string, string> = {
  ...yorubaInterfaceLabels(), ...PART_1, ...PART_2, ...PART_3, ...PART_4, ...PART_5, ...PART_6, ...PART_7, ...PART_8, ...latest,
};
