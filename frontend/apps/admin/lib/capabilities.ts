export const CAPABILITIES = ["admin.access", "article.create", "article.publish", "article.review", "article.unpublish", "audit.read", "business.review", "moderation.review", "order.manage", "people.manage", "radio.manage", "staff.manage"] as const;
export type Capability = (typeof CAPABILITIES)[number];
