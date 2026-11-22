export type CapabilityGroup = {
  label: string;
  capabilities: Array<{ key: string; label: string }>;
};

export const CAPABILITY_GROUPS: CapabilityGroup[] = [
  {
    label: "Administration",
    capabilities: [
      { key: "admin.access", label: "Full administrative access" },
      { key: "staff.manage", label: "Manage staff accounts and capabilities" },
      { key: "audit.read", label: "Read the audit log" },
    ],
  },
  {
    label: "Newsroom",
    capabilities: [
      { key: "article.create", label: "Create and edit draft articles" },
      { key: "article.review", label: "Review articles and request revisions" },
      { key: "article.publish", label: "Publish articles and flag breaking news" },
      { key: "article.unpublish", label: "Unpublish published articles" },
    ],
  },
  {
    label: "Community",
    capabilities: [
      { key: "moderation.review", label: "Moderate forum discussions" },
      { key: "history.review", label: "Review community history contributions" },
      { key: "tourism.review", label: "Review tourism suggestions" },
      { key: "people.manage", label: "Who is Who profiles" },
    ],
  },
  {
    label: "Business",
    capabilities: [
      { key: "business.review", label: "Verify business submissions" },
    ],
  },
  {
    label: "Radio",
    capabilities: [{ key: "radio.manage", label: "Manage programmes, episodes and schedule" }],
  },
  {
    label: "Backups",
    capabilities: [
      { key: "backup.read", label: "View database backups" },
      { key: "backup.create", label: "Create database backups" },
      { key: "backup.restore", label: "Restore database backups" },
    ],
  },
];
