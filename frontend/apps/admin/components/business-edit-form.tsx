"use client";

import { useActionState, useEffect, useRef, useState, type ChangeEvent } from "react";
import { LiveField, SubmitButton, validateField, type FieldRules } from "@epelawa/ui";
import { staffUpdateBusiness, type StaffUpdateState } from "../app/(protected)/business-review/actions";
import { pushToast } from "../../main/components/toast";
import BusinessHoursEditor from "../../main/components/business-hours-editor";

type Option = { id: string; label: string };

export type BusinessEditValues = {
  id: string;
  name: string;
  category_id: string;
  description: string;
  area: string;
  address: string;
  landmark: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  hours_json: string;
  logo_url: string;
};

const NAME_RULES: FieldRules = { required: true, minLength: 2, maxLength: 160 };
const CATEGORY_RULES: FieldRules = { required: true, message: "Choose a category." };
const DESCRIPTION_RULES: FieldRules = { maxLength: 4000 };
const PHONE_RULES: FieldRules = { pattern: /^\+?[0-9][0-9 ()-]{6,19}$/, message: "Use digits, spaces and + ( ) - only." };
const EMAIL_RULES: FieldRules = { email: true };
const WEBSITE_RULES: FieldRules = { url: true, message: "Enter a full link starting with https://" };

export default function BusinessEditForm({ business, categories }: { business: BusinessEditValues; categories: Option[] }) {
  const initial: StaffUpdateState = { status: "idle", message: "" };
  const [state, action] = useActionState(staffUpdateBusiness, initial);
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...business }));
  const change = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
  useEffect(() => {
    if (state.status === "success" && state.message) pushToast("success", state.message);
    else if (state.status === "error" && state.message) pushToast("error", state.message);
  }, [state]);
  const nameError = validateField(values.name ?? "", NAME_RULES);
  const categoryError = values.category_id ? "" : "Choose a category.";
  const blocked = nameError !== "" || categoryError !== "";
  return (
    <form action={action} noValidate className="ui-stack-sm">
      <input type="hidden" name="business_id" value={business.id} />
      <div className="ui-form-grid">
        <LiveField label="Business name" rules={NAME_RULES} value={values.name ?? ""} onChange={change}><input name="name" value={values.name ?? ""} onChange={change} className="input" /></LiveField>
        <LiveField label="Category" rules={CATEGORY_RULES} value={values.category_id ?? ""} onChange={change}>
          <select name="category_id" value={values.category_id ?? ""} onChange={change} className="input">{categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
        </LiveField>
        <LiveField label="Description" optional rules={DESCRIPTION_RULES} value={values.description ?? ""} onChange={change}><textarea name="description" value={values.description ?? ""} onChange={change} rows={3} className="input" /></LiveField>
        <LiveField label="Area or community" optional value={values.area ?? ""} onChange={change}><input name="area" value={values.area ?? ""} onChange={change} maxLength={160} className="input" /></LiveField>
        <LiveField label="Address" optional value={values.address ?? ""} onChange={change}><input name="address" value={values.address ?? ""} onChange={change} maxLength={300} className="input" /></LiveField>
        <LiveField label="Landmark" optional value={values.landmark ?? ""} onChange={change}><input name="landmark" value={values.landmark ?? ""} onChange={change} maxLength={200} className="input" /></LiveField>
        <LiveField label="Phone" optional rules={PHONE_RULES} value={values.phone ?? ""} onChange={change}><input name="phone" value={values.phone ?? ""} onChange={change} maxLength={24} className="input" placeholder="+234…" /></LiveField>
        <LiveField label="WhatsApp" optional rules={PHONE_RULES} value={values.whatsapp ?? ""} onChange={change}><input name="whatsapp" value={values.whatsapp ?? ""} onChange={change} maxLength={24} className="input" placeholder="+234…" /></LiveField>
        <LiveField label="Email" optional rules={EMAIL_RULES} value={values.email ?? ""} onChange={change}><input name="email" type="email" value={values.email ?? ""} onChange={change} maxLength={254} className="input" /></LiveField>
        <LiveField label="Website (HTTPS)" optional rules={WEBSITE_RULES} value={values.website ?? ""} onChange={change}><input name="website" value={values.website ?? ""} onChange={change} maxLength={2048} className="input" placeholder="https://" /></LiveField>
        <LiveField label="Logo link (HTTPS)" optional rules={WEBSITE_RULES} value={values.logo_url ?? ""} onChange={change}><input name="logo_url" value={values.logo_url ?? ""} onChange={change} maxLength={2048} className="input" placeholder="https://" /></LiveField>
      </div>
      <BusinessHoursEditor initial={business.hours_json || undefined} name="hours_json" />
      <div className="ui-actions"><SubmitButton pendingLabel="Saving…" disabled={blocked}>Save changes</SubmitButton></div>
    </form>
  );
}
