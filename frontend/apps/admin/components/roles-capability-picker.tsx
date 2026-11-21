"use client";

import { useMemo, useState } from "react";

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

export default function CapabilityPicker({
  groups,
  selected,
}: {
  groups: CapabilityGroup[];
  selected: string[];
}) {
  const allKeys = useMemo(() => groups.flatMap((group) => group.capabilities.map((c) => c.key)), [groups]);
  const [chosen, setChosen] = useState<Set<string>>(new Set(selected));

  function toggle(key: string, on: boolean) {
    setChosen((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  const fullAccess = allKeys.length > 0 && allKeys.every((key) => chosen.has(key));

  return (
    <div className="ui-stack-sm">
      <label className="ui-row roles-full-access">
        <input
          type="checkbox"
          checked={fullAccess}
          onChange={(event) => setChosen(event.target.checked ? new Set(allKeys) : new Set())}
        />
        <span><strong>Full access</strong> — every capability below, including destructive actions such as deletions and restores.</span>
      </label>

      {groups.map((group) => {
        const keys = group.capabilities.map((c) => c.key);
        const groupChecked = keys.every((key) => chosen.has(key));
        return (
          <fieldset className="roles-group" key={group.label}>
            <legend className="ui-row">
              <input
                type="checkbox"
                checked={groupChecked}
                onChange={(event) => keys.forEach((key) => toggle(key, event.target.checked))}
                aria-label={`Select all ${group.label} capabilities`}
              />
              <span>{group.label}</span>
            </legend>
            {group.capabilities.map((item) => (
              <label className="ui-row roles-capability" key={item.key}>
                <input
                  type="checkbox"
                  name="capability"
                  value={item.key}
                  checked={chosen.has(item.key)}
                  onChange={(event) => toggle(item.key, event.target.checked)}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </fieldset>
        );
      })}
    </div>
  );
}
