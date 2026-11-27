"use client";

import Link from "./admin-link";
import { useState } from "react";
import { staffHref } from "../lib/admin-path";

type QuickAction = {
  label: string;
  href: string;
  icon: string;
  description: string;
};

const actions: QuickAction[] = [
  {
    label: "New Article",
    href: "/newsroom/new",
    icon: "📝",
    description: "Create a new article",
  },
  {
    label: "Add Business",
    href: "/business-review/new",
    icon: "🏢",
    description: "Add a new business",
  },
  {
    label: "Broadcast",
    href: "/broadcast",
    icon: "📢",
    description: "Send notification to members",
  },
  {
    label: "Settings",
    href: "/settings",
    icon: "⚙️",
    description: "Manage workspace settings",
  },
];

export default function QuickActions() {
  const [open, setOpen] = useState(false);

  return (
    <div className="admin-quick-actions">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="admin-quick-actions__toggle"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span aria-hidden="true">⚡</span>
        Quick Actions
      </button>
      {open && (
        <div className="admin-quick-actions__dropdown" role="menu">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={staffHref(action.href)}
              className="admin-quick-actions__item"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <span className="admin-quick-actions__icon" aria-hidden="true">
                {action.icon}
              </span>
              <div className="admin-quick-actions__content">
                <span className="admin-quick-actions__label">{action.label}</span>
                <span className="admin-quick-actions__description">{action.description}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
