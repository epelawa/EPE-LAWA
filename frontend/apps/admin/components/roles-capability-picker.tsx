"use client";

import { useMemo, useState } from "react";

import { CAPABILITY_GROUPS, type CapabilityGroup } from "../lib/capability-groups";

export { CAPABILITY_GROUPS, type CapabilityGroup };

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
