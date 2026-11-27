import { NEWS_HASHTAG_TOPICS } from "./news-hashtag-topics";

/** Editorial suggestions are keyword matches, not AI or factual classification. */
export const NEWS_HASHTAGS = [
  { tag: "EpeNews", words: ["epe"] }, { tag: "EpeLawa", words: ["epe lawa"] },
  { tag: "LagosNews", words: ["lagos"] }, { tag: "NigeriaNews", words: ["nigeria", "nigerian"] },
  { tag: "CommunityNews", words: ["community", "communities"] }, { tag: "LocalNews", words: ["local"] },
  { tag: "Education", words: ["education", "school", "student"] }, { tag: "Schools", words: ["school", "schools"] },
  { tag: "Students", words: ["student", "students"] }, { tag: "Teachers", words: ["teacher", "teachers"] },
  { tag: "Scholarships", words: ["scholarship", "scholarships"] }, { tag: "Health", words: ["health", "healthcare"] },
  { tag: "PublicHealth", words: ["public health"] }, { tag: "Hospitals", words: ["hospital", "hospitals"] },
  { tag: "Environment", words: ["environment", "environmental"] }, { tag: "Climate", words: ["climate"] },
  { tag: "Flooding", words: ["flood", "flooding"] }, { tag: "CleanWater", words: ["water", "water supply"] },
  { tag: "Agriculture", words: ["agriculture", "farming"] }, { tag: "Farmers", words: ["farmer", "farmers"] },
  { tag: "Fishing", words: ["fishing", "fishermen"] }, { tag: "FoodSecurity", words: ["food security"] },
  { tag: "Business", words: ["business", "businesses"] }, { tag: "SmallBusiness", words: ["small business"] },
  { tag: "Markets", words: ["market", "markets"] }, { tag: "Jobs", words: ["job", "jobs", "employment"] },
  { tag: "Entrepreneurship", words: ["entrepreneur", "entrepreneurship"] }, { tag: "Technology", words: ["technology", "digital"] },
  { tag: "Infrastructure", words: ["infrastructure"] }, { tag: "Roads", words: ["road", "roads"] },
  { tag: "Transport", words: ["transport", "transportation"] }, { tag: "Electricity", words: ["electricity", "power supply"] },
  { tag: "Housing", words: ["housing", "homes"] }, { tag: "Safety", words: ["safety", "security"] },
  { tag: "Emergency", words: ["emergency", "emergencies"] }, { tag: "Government", words: ["government"] },
  { tag: "LocalGovernment", words: ["local government", "lcda"] }, { tag: "CivicEngagement", words: ["civic", "public meeting"] },
  { tag: "Elections", words: ["election", "elections"] }, { tag: "Youth", words: ["youth", "young people"] },
  { tag: "Women", words: ["women", "woman"] }, { tag: "Culture", words: ["culture", "cultural"] },
  { tag: "Heritage", words: ["heritage", "history"] }, { tag: "Arts", words: ["art", "arts"] },
  { tag: "Music", words: ["music", "musician"] }, { tag: "Tourism", words: ["tourism", "tourist"] },
  { tag: "Sports", words: ["sport", "sports"] }, { tag: "Football", words: ["football"] },
  { tag: "Events", words: ["event", "events"] }, { tag: "Radio", words: ["radio", "broadcast"] },
  ...NEWS_HASHTAG_TOPICS,
] as const;

export function suggestNewsHashtags(text: string): string[] {
  const normalized = text.toLocaleLowerCase("en").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const padded = ` ${normalized} `;
  return NEWS_HASHTAGS.filter(({ words }) => words.some((word) => padded.includes(` ${word} `))).map(({ tag }) => tag);
}

export const ARTICLE_TAG_LIMIT = 12;
export const ARTICLE_TAG_INPUT_LIMIT = 500;

export function articleTags(value: string): string[] {
  const seen = new Set<string>();
  return value.split(",").map((tag) => tag.trim().replace(/^#/, "").trim()).filter((tag) => {
    const key = tag.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Mirrors the character coverage of public.slugify in the editorial core migration.
const TAG_SLUG_CHARACTER = /[a-z0-9àáâãäåāăąçćčèéêëēĕėęěìíîïĩīĭįñńņǹòóôõöøōŏőùúûüũūŭůűųšśşžźżẹọṣ]/;

export function articleTagsError(value: string): string | null {
  const tags = articleTags(value);
  if (tags.length > ARTICLE_TAG_LIMIT) return `Choose up to ${ARTICLE_TAG_LIMIT} hashtags.`;
  if (value.length > ARTICLE_TAG_INPUT_LIMIT || tags.some((tag) => Array.from(tag).length < 2 || Array.from(tag).length > 40 || !TAG_SLUG_CHARACTER.test(tag.toLowerCase()))) {
    return "Use 2 to 40 characters per hashtag, including at least one letter or digit supported by the newsroom.";
  }
  return null;
}
