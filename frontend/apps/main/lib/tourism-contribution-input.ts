const limits = {
  name: 180,
  description: 12_000,
  source_citation: 2_000,
  source_url: 1_000,
  media_url: 1_000,
  media_rights: 2_000,
  visitor_context: 3_000,
  visit_details: 3_000,
} as const;

export type TourismContributionInput = {
  name: string;
  description: string;
  sourceCitation: string;
  sourceUrl: string;
  mediaUrl: string;
  mediaRights: string;
  visitorContext: string;
  visitDetails: string;
};

function readField(formData: Pick<FormData, "get">, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function isHttpsUrl(value: string): boolean {
  if (!value) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/** Validate the full submitted values; never change content to make it fit. */
export function parseTourismContribution(formData: Pick<FormData, "get">): TourismContributionInput | null {
  const values = {
    name: readField(formData, "name"),
    description: readField(formData, "description"),
    source_citation: readField(formData, "source_citation"),
    source_url: readField(formData, "source_url"),
    media_url: readField(formData, "media_url"),
    media_rights: readField(formData, "media_rights"),
    visitor_context: readField(formData, "visitor_context"),
    visit_details: readField(formData, "visit_details"),
  };

  if (Object.entries(limits).some(([key, maximum]) => values[key as keyof typeof values].length > maximum)) {
    return null;
  }

  const normalizedValues = {
    name: values.name.trim(),
    description: values.description.trim(),
    source_citation: values.source_citation.trim(),
    source_url: values.source_url.trim(),
    media_url: values.media_url.trim(),
    media_rights: values.media_rights.trim(),
    visitor_context: values.visitor_context.trim(),
    visit_details: values.visit_details.trim(),
  };

  if (
    normalizedValues.name.length < 2 ||
    normalizedValues.description.length < 20 ||
    normalizedValues.source_citation.length < 5 ||
    !isHttpsUrl(normalizedValues.source_url) ||
    !isHttpsUrl(normalizedValues.media_url) ||
    (normalizedValues.media_url && normalizedValues.media_rights.length < 5) ||
    formData.get("consent") !== "yes"
  ) {
    return null;
  }

  return {
    name: normalizedValues.name,
    description: normalizedValues.description,
    sourceCitation: normalizedValues.source_citation,
    sourceUrl: normalizedValues.source_url,
    mediaUrl: normalizedValues.media_url,
    mediaRights: normalizedValues.media_rights,
    visitorContext: normalizedValues.visitor_context,
    visitDetails: normalizedValues.visit_details,
  };
}
