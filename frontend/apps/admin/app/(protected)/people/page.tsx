import { createStaffClient } from "../../../lib/supabase";
import { EmptyPanel, Notice, PageFrame, PageIntro, Panel, SectionHeading, StatusBadge } from "@epelawa/ui";
import { addOffice, addSource, changeStatus, resolveCorrection, savePerson, sourceVisibility, unverifyPerson, verifyPerson } from "./actions";
import UploadModalField from "../../../components/upload-modal-field";

import ConfirmSubmit from "../../../components/confirm-submit";
export const dynamic = "force-dynamic";
type Params = { q?: string; error?: string; updated?: string };
const input = "input";
const label = "label ui-field";
const primaryButton = "btn-primary";
const secondaryButton = "btn-secondary";
const ERROR_TEXT: Record<string, string> = {
  invalid: "The entry was incomplete or too long. Fill the required fields and try again.",
  "save-failed": "The profile could not be saved. Check the source and revision, then retry.",
  "achievements-failed": "The profile was saved, but the achievements could not be updated. Open the profile and retry.",
  "create-failed": "The new profile could not be created. Check the details and retry.",
  "source-failed": "The source could not be recorded. Check the citation and try again.",
  "office-failed": "The term could not be recorded. Check the details and try again.",
  "status-failed": "The status could not be changed. Someone may have edited the profile; reload and retry.",
  "portrait-too-large": "The portrait photo is larger than 10 MB. Choose a smaller file.",
  "portrait-invalid": "Portraits must be JPEG, PNG, WebP or AVIF photos.",
  "portrait-alt-required": "Describe the portrait in the alt text field (at least 3 characters) so it can be published.",
  "portrait-failed": "The portrait could not be stored right now. Try again later, or paste an asset key instead.",
  "correction-failed": "The correction decision could not be recorded. Reload and retry.",
};

export default async function PeoplePage({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const db = await createStaffClient();
  const { data: grants, error: grantError } = await db.from("staff_capability_grants").select("capability").eq("capability", "people.manage").limit(1);
  if (grantError) return <PageFrame className="ui-stack"><PageIntro eyebrow="Staff workspace" title="People" description="Who is Who profile administration." /><Notice tone="danger" role="alert">The people workspace is unavailable right now. Reload the page to try again.</Notice></PageFrame>;
  if (!grants?.length) return <PageFrame className="ui-stack"><PageIntro eyebrow="Staff workspace" title="People" description="Who is Who profile administration." /><Notice tone="danger" role="alert">The people.manage capability is required. No records are shown.</Notice></PageFrame>;

  let query = db.from("people").select("id,full_name,preferred_name,community,community_note,biography,achievements,is_deceased,portrait_key,portrait_alt,portrait_credit,status,revision,published_at").is("deleted_at", null).order("updated_at", { ascending: false }).limit(100);
  if (p.q?.trim()) query = query.ilike("full_name", `%${p.q.trim().replace(/[,%]/g, " ")}%`);
  const [{ data: people, error }, { data: corrections, cerror }] = await Promise.all([query, db.from("people_corrections").select("id,person_id,claim,evidence,state,created_at").eq("state", "open").order("created_at").limit(100).then(x => ({ data: x.data, cerror: x.error }))]);
  const ids = (people ?? []).map(x => x.id);
  const [{ data: sources }, { data: offices }, { data: verifications }] = ids.length ? await Promise.all([db.from("people_sources").select("id,person_id,kind,citation,url,visibility").in("person_id", ids).order("recorded_at", { ascending: false }).limit(300), db.from("people_offices").select("id,person_id,title,institution,term_start,term_end,is_current,source_id").in("person_id", ids).limit(300), db.from("people_verifications").select("person_id,source_id,note,verified_at").in("person_id", ids).is("superseded_at", null).limit(100)]) : [{ data: [] }, { data: [] }, { data: [] }];

  return <PageFrame className="ui-stack">
    <PageIntro eyebrow="Staff workspace · People verification and authoring" title="Who is Who" description="Review real submissions and maintain carefully sourced public profiles. Publish only after recording a source. Verification requires human review, evidence, and a note." />
    {p.error ? <Notice tone="danger" role="alert">{ERROR_TEXT[p.error] ?? `Action could not be completed (${p.error}). Check your capability, source, and revision, then retry.`}</Notice> : null}
    {p.updated ? <Notice tone="success" role="status">Staff action recorded.</Notice> : null}

    <section className="ui-stack-sm" aria-labelledby="corrections-title">
      <SectionHeading eyebrow="Submissions" title="Open correction submissions" id="corrections-title" />
      {cerror ? <EmptyPanel title="Submissions unavailable" description="Open corrections could not be loaded." /> : !corrections?.length ? <EmptyPanel title="No open corrections" description="There are no correction submissions awaiting review." /> : <ul className="ui-list ui-stack-sm">{corrections.map(c => <li key={c.id}><Panel className="ui-stack-sm"><p className="ui-meta">Received {new Date(c.created_at).toLocaleString("en-NG")}</p><p className="ui-prose" style={{ whiteSpace: "pre-wrap" }}>{c.claim}</p>{c.evidence ? <p className="ui-muted" style={{ whiteSpace: "pre-wrap" }}>Evidence: {c.evidence}</p> : null}<form action={resolveCorrection} className="ui-actions"><input type="hidden" name="correction_id" value={c.id} /><ConfirmSubmit className={primaryButton} confirmFirst message="Publish this correction to the public profile now?" name="state" value="accepted">Accept correction</ConfirmSubmit><ConfirmSubmit className={secondaryButton} confirmFirst message="Reject this correction? The submitter can raise it again." name="state" value="rejected">Reject</ConfirmSubmit></form></Panel></li>)}</ul>}
    </section>

    <section className="ui-stack-sm" aria-labelledby="profiles-title">
      <SectionHeading eyebrow="Directory" title="Search and manage profiles" id="profiles-title" />
      <Panel className="ui-toolbar"><form className="ui-row" role="search"><label className={label}>Name<input className={input} name="q" defaultValue={p.q} placeholder="Search full name" /></label><button className={`${primaryButton} self-end`}>Search</button></form></Panel>
      {error ? <Notice tone="danger" role="alert">Profile search unavailable.</Notice> : null}
      <details className="ui-panel"><summary className="cursor-pointer font-semibold">Create sourced profile</summary><p className="ui-muted">New records start as draft; add at least one source before publishing.</p><ProfileForm action={savePerson} /></details>
      {error ? <EmptyPanel title="Profiles unavailable" description="The profile list could not be loaded. You can retry the search." /> : !people?.length ? <EmptyPanel title="No matching profiles" description={p.q ? "No profiles matched this search. Try another name or create a sourced profile." : "No profiles are available yet. Create a sourced profile to begin."} /> : <ul className="ui-list ui-stack-sm">{people.map(person => {
        const ps = (sources ?? []).filter(s => s.person_id === person.id), verify = (verifications ?? []).find(v => v.person_id === person.id);
        return <li key={person.id}><Panel className="ui-stack-sm">
          <header className="ui-row"><div><div className="ui-meta"><StatusBadge tone={person.status === "published" ? "success" : person.status === "withdrawn" ? "danger" : "neutral"}>{person.status}</StatusBadge><span>Revision {person.revision}</span></div><h3 className="ui-item-title">{person.full_name}</h3><p className="ui-meta">{ps.length} recorded source{ps.length === 1 ? "" : "s"} · {verify ? "Currently verified" : "Not verified"}</p></div></header>
          <details><summary className="cursor-pointer font-semibold">Edit profile and achievements</summary><ProfileForm action={savePerson} person={person} /></details>
          <details><summary className="cursor-pointer font-semibold">Sources ({ps.length})</summary><div className="ui-stack-sm">
            <ul className="ui-list">{ps.map(s => <li key={s.id} className="ui-item"><p>{s.kind}: {s.citation}{s.url ? <> · <a className="ui-text-link" href={s.url} target="_blank" rel="noreferrer">Open source</a></> : null}</p><form action={sourceVisibility} className="ui-row"><input type="hidden" name="source_id" value={s.id} /><label className={label}>Visibility<select className={input} name="visibility" defaultValue={s.visibility}><option value="public">Public</option><option value="staff">Staff only</option></select></label><button className={secondaryButton}>Save visibility</button></form></li>)}</ul>
            <form action={addSource} className="ui-form-grid"><input type="hidden" name="person_id" value={person.id} /><label className={label}>Source type<select name="kind" className={input}><option value="publication">Publication</option><option value="government_record">Government record</option><option value="document">Document</option><option value="interview">Interview</option><option value="family_record">Family record</option></select></label><label className={label}>Visibility<select name="visibility" className={input}><option value="public">Public</option><option value="staff">Staff only</option></select></label><label className={label}>Citation<textarea name="citation" required minLength={3} maxLength={2000} className={input} /></label><label className={label}>HTTPS URL<input type="url" name="url" className={input} /></label><button className={`${primaryButton} w-fit`}>Add source</button></form>
          </div></details>
          <details><summary className="cursor-pointer font-semibold">Public-office terms</summary><div className="ui-stack-sm"><ul className="ui-list">{(offices ?? []).filter(o => o.person_id === person.id).map(o => <li key={o.id} className="ui-item">{o.title}, {o.institution} {o.is_current ? "(current)" : `(${o.term_start ?? "?"}–${o.term_end ?? "present"})`}</li>)}</ul><form action={addOffice} className="ui-form-grid"><input type="hidden" name="person_id" value={person.id} /><label className={label}>Office/title<input required name="title" maxLength={160} className={input} /></label><label className={label}>Institution<input required name="institution" maxLength={160} className={input} /></label><label className={label}>Term start<input type="date" name="term_start" className={input} /></label><label className={label}>Term end<input type="date" name="term_end" className={input} /></label><label className="ui-row"><input type="checkbox" name="is_current" />Current term (only if supported)</label><label className={label}>Supporting source<select name="source_id" className={input}><option value="">No linked source</option>{ps.map(s => <option key={s.id} value={s.id}>{s.kind}: {s.citation.slice(0, 80)}</option>)}</select></label><button className={`${primaryButton} w-fit`}>Add term</button></form></div></details>
          <div className="ui-divider" />
          <div className="ui-grid ui-grid--2"><form action={changeStatus} className="ui-stack-sm"><input type="hidden" name="person_id" value={person.id} /><input type="hidden" name="revision" value={person.revision} /><label className={label}>Profile status<select name="status" className={input} defaultValue={person.status}><option value="draft">Draft</option><option value="review">Review</option><option value="published">Published (requires source)</option><option value="withdrawn">Withdrawn</option></select></label><button className={`${primaryButton} w-fit`}>Save status</button></form><form action={verifyPerson} className="ui-stack-sm"><input type="hidden" name="person_id" value={person.id} /><label className={label}>Verify only with supporting source<select name="source_id" required className={input}><option value="">Select source</option>{ps.map(s => <option key={s.id} value={s.id}>{s.kind}: {s.citation.slice(0, 80)}</option>)}</select></label><label className={label}>Reviewer note<textarea name="note" required minLength={10} maxLength={2000} className={input} /></label><button className={`${primaryButton} w-fit`}>Record verification</button></form></div>
          {verify ? <form action={unverifyPerson} className="ui-row"><input type="hidden" name="person_id" value={person.id} /><label className={label}>Unverify reason<textarea name="reason" required minLength={3} maxLength={2000} className={input} /></label><button className={secondaryButton}>Unverify</button></form> : null}
        </Panel></li>;
      })}</ul>}
    </section>
  </PageFrame>;
}

function ProfileForm({ action, person }: { action: (f: FormData) => void; person?: any }) {
  return <form action={action} className="ui-form-grid"><input type="hidden" name="id" value={person?.id ?? ""} /><input type="hidden" name="revision" value={person?.revision ?? "0"} /><label className={label}>Full name<input required minLength={2} maxLength={160} name="full_name" defaultValue={person?.full_name ?? ""} className={input} /></label><label className={label}>Preferred name<input name="preferred_name" defaultValue={person?.preferred_name ?? ""} className={input} /></label><label className={label}>Community<select name="community" defaultValue={person?.community ?? ""} className={input}><option value="">Not recorded</option><option value="eko_epe">Eko Epe</option><option value="ijebu_epe">Ijebu Epe</option><option value="other">Other</option></select></label><label className={label}>Community note<input name="community_note" defaultValue={person?.community_note ?? ""} className={input} /></label><label className={`${label} sm:col-span-2`}>Biography<textarea name="biography" maxLength={20000} defaultValue={person?.biography ?? ""} className={input} /></label><label className={`${label} sm:col-span-2`}>Achievements / contributions<textarea name="achievements" maxLength={12000} defaultValue={person?.achievements ?? ""} className={input} /></label><UploadModalField name="portrait_file" label="Portrait image" accept="image/jpeg,image/png,image/webp,image/avif" hint="JPEG, PNG, WebP or AVIF, up to 10 MB. The portrait uploads through the EPE LAWA server when the profile is saved." description="Choose a portrait photo from this device. You can still fill in an asset key or alt text after closing this dialog." /><label className={label}>Portrait asset key (optional if a file is chosen)<input name="portrait_key" defaultValue={person?.portrait_key ?? ""} className={input} /></label><label className={label}>Portrait alt text<input name="portrait_alt" defaultValue={person?.portrait_alt ?? ""} className={input} /></label><label className={label}>Portrait credit / rights<input name="portrait_credit" defaultValue={person?.portrait_credit ?? ""} className={input} /></label><label className="ui-row"><input type="checkbox" name="is_deceased" defaultChecked={person?.is_deceased ?? false} />Deceased (recorded only)</label><button className={`${primaryButton} w-fit`}>Save sourced profile</button><button className={secondaryButton} type="reset">Clear form</button></form>;
}
