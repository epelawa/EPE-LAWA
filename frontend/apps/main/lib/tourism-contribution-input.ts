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
  return typeof value === "string" ? value.trim() : "";
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

  if (
    values.name.length < 2 ||
    values.description.length < 20 ||
    values.source_citation.length < 5 ||
    !isHttpsUrl(values.source_url) ||
    !isHttpsUrl(values.media_url) ||
    (values.media_url && values.media_rights.length < 5) ||
    formData.get("consent") !== "yes"
  ) {
    return null;
  }

  return {
    name: values.name,
    description: values.description,
    sourceCitation: values.source_citation,
    sourceUrl: values.source_url,
    mediaUrl: values.media_url,
    mediaRights: values.media_rights,
    visitorContext: values.visitor_context,
    visitDetails: values.visit_details,
  };
}
