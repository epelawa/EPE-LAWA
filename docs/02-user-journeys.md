# EPE LAWA — User Research and Journeys

**Document:** 02 — Workstream 0.2\
**Status:** Approved by the owner on 2 November 2026; journeys and research plan remain hypotheses, not research findings or implementation authorisation.\
**Prepared:** 2 November 2026\
**Source of scope:** [Approved Workstream 0.1 product requirements](01-product-requirements.md).\
**Follow-on work:** Workstream 0.3 information architecture. Phase 1 still requires approval of the entire Phase 0 exit condition.

## 1. Purpose and evidence status

These journeys describe what people may need to accomplish, the proposed experience, likely failures and testable outcomes. They are derived from the owner-supplied master brief and approved Phase 1 baseline, **not interviews, usability tests or observed analytics**. No participant identities, research results, usage figures or quotations are invented here. Personas are role-based scenarios, not claims about real individuals.

The owner approved live radio as a launch requirement, a general contact form and WhatsApp, and owner/developer responsibility; the exact stream, number, recipient and division of responsibilities remain open. Later-phase workflows are included to preserve the long-term vision and are explicitly labelled; they do not authorise Phase 1 implementation or specify final permissions, routes, data structures or visual design.

## 2. Research objectives and plan

### Questions to validate

- Can residents and diaspora users understand the difference between the main platform and the news publication, and find trustworthy news and recordings?
- Can listeners start, stop and understand live radio on affordable Android devices and unreliable connections? What do they expect during an outage?
- Can users distinguish general contact and WhatsApp from future confidential reporting, and understand what happens to their message?
- Can journalists and editors use the review, approval and corrections workflow without exposing unpublished content or confusing responsibilities?
- For future phases, what safety, privacy, moderation, cultural verification and accessibility concerns must be addressed before participation or publication?

### Proposed methods — not yet conducted

| Method | Participants to seek, subject to owner approval | What it tests | Output |
| --- | --- | --- | --- |
| Short contextual interviews | Residents from different communities, diaspora members, news/media audiences and EPE LAWA staff. Include affordable Android, low-bandwidth and accessibility perspectives. | Needs, trust, language, information access and operational capacity. | Attributed, consented notes and unresolved needs; avoid treating a small sample as representative. |
| Task-based usability sessions | A small, diverse set of voluntary participants recruited with local input; sample size and recruitment plan require approval. | Finding an article, playing radio, watching a recording, contacting the organisation, and understanding an outage. | Observed task outcomes and anonymised friction points, not fabricated success rates. |
| Staff walkthrough | Owner, developer and prospective editorial staff; invite other actual operators when identified. | Draft/review/publish, correction, access management, real-world ownership and recovery. | Documented workflow gaps and proposed role decisions. |
| Later-phase safeguarding consultation | Community representatives, prospective moderators and appropriate privacy/legal advisers before Phase 2 design. | Consent, reporting risks, escalation, cultural context and moderation capacity. | Approved safeguards and open risks; do not collect real sensitive reports as test data. |

**Ethics and privacy:** Recruit voluntarily, explain purpose and expected use, obtain informed consent before participation or recording, permit withdrawal, minimise personal data, and avoid collecting actual allegations or sensitive reports in exercises. Agree who may access notes, retention/deletion and compensation before sessions. Use synthetic, clearly labelled test scenarios in private research only; never present them as real public content. Provide accessible participation options and do not assume every participant has a fast connection or speaks the same language. Seek appropriate legal guidance for personal data handling.

**Evidence and decision log:** Record date, method, participant group and consent status, tasks, observed outcomes, limitations and resulting product decisions in an approved, access-controlled location. Distinguish observations from interpretation and proposed changes. Do not use raw personal information in public documentation. Update this document only after findings are reviewed; changes to the approved scope require owner approval.

## 3. Shared journey principles

- Public browsing needs no account; use semantic, keyboard-accessible controls, visible focus, clear labels and understandable error messages.
- Design for small screens, limited data and interrupted connectivity. Avoid autoplay and heavy third-party embeds where they would impose unnecessary cost; allow a clear path to external media.
- Identify which experience the user is in when moving among main, news and admin. The precise navigation and routes will be settled in Workstream 0.3.
- Use only approved, published content; empty and unavailable states must be honest. Do not imply unbuilt community, governance, heritage or directory features are operational.
- Radio is required for launch but may be temporarily unavailable after launch; never claim “LIVE” without verified status. Media playback must handle loading, buffering and errors.
- Contact and future civic reports have different purposes and protections. Do not suggest that a general contact form or WhatsApp is an emergency service or guarantees anonymity or confidentiality.
- Protect drafts, editorial history and staff functions in the backend, not merely by hiding navigation. Future reports need a separate access model and safeguarding policy.

## 4. Phase 1 public journeys

### J01 — First-time visitor finds the platform's purpose

**Actor and goal:** Visitor seeks to understand EPE LAWA and find a useful next step.\
**Entry / prerequisites:** Main homepage or direct link; no account. Approved organisational information must be available.

1. Visitor opens the main site on a phone or desktop and identifies the organisation and its purpose.
2. Visitor chooses an available action: explore approved organisational information, open the news publication, listen to radio, browse media, or contact the team.
3. When moving to news, the visitor can recognise the distinct publication and return to the main site.
4. The visitor reaches a meaningful page without encountering an active-looking link to an unfinished service.

**Alternative / failure:** If no approved stories or recordings exist, show an honest empty state; on connection failure, offer a comprehensible retry path. Do not fabricate material.\
**Success:** A participant can explain the site's purpose and reach their chosen available destination without signing in.\
**Dependencies / validation:** Approved copy, assets and information architecture; test comprehension and mobile navigation. Future discovery areas must not be represented as live services.

### J02 — Resident checks local news and contacts EPE LAWA

**Actor and goal:** Resident wants to find a relevant published story and, if needed, contact the organisation.\
**Entry / prerequisites:** Main site or news publication; approved stories and operational contact channels.

1. Resident follows the news link or opens the publication directly.
2. Resident browses latest stories or a category, opens a published article and identifies its author, date and source context where provided.
3. To contact EPE LAWA, the resident chooses the general contact form or the approved WhatsApp link.
4. For the form, the resident completes the agreed fields, reviews the privacy information and submits; the system confirms success only when delivery succeeds, or gives a useful error and retry path. For WhatsApp, the visitor knowingly leaves for the external service.
5. The agreed recipient handles the message according to the approved process.

**Alternative / failure:** No relevant stories: show a genuine empty/search result; WhatsApp unavailable: preserve access to the form; delivery failure: do not claim receipt. Do not automatically publish a message or promise a response time not agreed by operators.\
**Success:** Resident can find published coverage and contact the organisation through one available channel, with an accurate result.\
**Dependencies / validation:** Form fields, recipient, delivery service, spam protection, handling, retention, WhatsApp number and privacy notice are unresolved. Test whether users understand these are general contact channels, not Speak Up Epe or emergency reporting.

### J03 — Diaspora member catches up from abroad

**Actor and goal:** An indigene outside Epe or Nigeria wants to catch up with news and recorded broadcasts.\
**Entry / prerequisites:** Public main or news experience; published content and internationally accessible media.

1. Visitor opens the website from abroad and moves to latest news or the media archive.
2. Visitor opens an available article or programme and sees relevant publication or programme information where supplied.
3. Visitor reads or watches on a mobile or desktop device, then follows related published content or an external source link.
4. Visitor can share the article or return to browse more content.

**Alternative / failure:** An unavailable video or geographically restricted service must show an honest failure and offer an external link when appropriate. Do not assume a timezone, translate content automatically, or promise global stream availability without testing.\
**Success:** Visitor can discover and access a published item or understand why it is unavailable.\
**Dependencies / validation:** Real content, rights, access testing and network conditions. Dedicated diaspora services and newsletter are Phase 5, not launch requirements.

### J04 — News reader discovers, reads and shares an article

**Actor and goal:** Reader wants to locate credible coverage and share a specific story.\
**Entry / prerequisites:** News homepage, category, search result or direct article link; only approved published articles are accessible.

1. Reader browses latest/category content or searches for a subject; pagination allows further discovery when results exist.
2. Reader selects a headline and reads the article, identifying author, publication/update dates, media credit and available correction information.
3. Reader follows related coverage, an author, or a tag when there is corresponding published content.
4. Reader uses a share action or copies the article's public link; the destination resolves to the published article.

**Alternative / failure:** Empty search and invalid/unavailable or archived article routes show an honest outcome; private versions and internal notes remain inaccessible even through direct links, previews or cache. Trending and breaking sections appear only with real eligible data/stories.\
**Success:** Reader finds and shares the intended published story without seeing a draft.\
**Dependencies / validation:** Editorial metadata and corrections policy; category and search behaviour and publication status must be tested with real or private synthetic test records.

### J05 — Listener starts and stops live radio

**Actor and goal:** Listener wants to access the authorised live broadcast.\
**Entry / prerequisites:** Main site or radio page; official direct stream, embedding permission and browser/mobile testing are launch prerequisites.

1. Listener finds the radio player and available programme information without an account.
2. Listener deliberately presses play; the interface communicates loading and buffering before audio starts.
3. Listener pauses or stops playback and adjusts volume where supported by the device/browser.
4. Verified stream status and available programme information are presented accurately; a listener may continue to recordings if desired.

**Alternative / failure:** If the stream fails, is offline or cannot be verified, show an honest unavailable/error state, allow retry and link to available recordings; never assert live status based only on a channel/page URL. A fallback after launch does not remove the requirement for a verified working stream at launch.\
**Success:** During acceptance testing an authorised stream plays on agreed desktop and mobile environments, controls behave correctly and errors do not mislead.\
**Dependencies / validation:** Official URL, format, permission, station relationship and schedule not yet supplied; test data usage, buffering, accessibility and supported browser behaviour. Do not infer a streaming solution from a social link.

### J06 — Viewer finds and watches a recorded programme

**Actor and goal:** Viewer wants a relevant recorded interview or broadcast without unnecessary data use.\
**Entry / prerequisites:** Curated media records and permitted YouTube/Facebook embeds or external links.

1. Viewer opens the media experience and browses approved programme or video records and categories.
2. Viewer sees available title, description, thumbnail and date, then deliberately chooses playback or an external link.
3. The embed is loaded on demand where supported; viewer can operate the player with applicable accessibility controls and return to the archive.
4. Viewer opens related recordings if available.

**Alternative / failure:** Missing/deleted/restricted embeds show an honest message and an external link where useful; an empty archive is labelled honestly. Captions or transcripts are offered only where available, without claiming they exist.\
**Success:** Viewer can reach an available curated recording, or understand the failure and access any available alternative.\
**Dependencies / validation:** Approved curation, rights, third-party availability and metadata; test embed performance and keyboard access. Automatic imports are not assumed.

## 5. Phase 1 staff and editorial journeys

Staff are authorised users, not members of the public. Owner and developer have been identified as responsible, but the role split, permissions, reviewer independence, recovery process and operational staffing have not been settled.

### J07 — Journalist / authorised contributor creates and submits a draft

**Actor and goal:** Authorised journalist prepares a story for editorial review.\
**Entry / prerequisites:** Provisioned staff account with appropriate access; initial content and media rights.

1. Journalist signs in to the private admin application and reaches the newsroom.
2. Journalist creates a draft with the agreed story details, sources, author/category/tag information and appropriately credited images or embeds.
3. Journalist saves progress and previews the draft through an authorised private preview.
4. Journalist submits the draft for review and receives the resulting status; the reviewer can access it according to approved permissions.
5. If changes are requested, journalist revises and resubmits through the agreed workflow.

**Alternative / failure:** Invalid input, failed upload or save failure is explained without falsely claiming the draft was saved; expired access requires reauthentication. A private preview must not expose the draft to the public or search engines.\
**Success:** An authorised draft is saved and reviewable, while unauthorised users cannot access it.\
**Dependencies / validation:** Exact mandatory fields, supported content, assignment, return-for-revision transition and permissions are pending. External public story submission is not approved; this is an authorised staff journey.

### J08 — Editor reviews, approves, publishes and corrects a story

**Actor and goal:** Editor ensures a story is suitable and makes an approved version public.\
**Entry / prerequisites:** Authorised reviewer/publisher access; a draft submitted for review; editorial standards and role boundaries.

1. Editor opens the review queue and examines the story, supporting information, credits and any private review notes.
2. Editor requests revisions or approves the eligible version under the agreed rules; status and action are recorded.
3. An authorised publisher publishes the approved version. The public news page and relevant listings show only that version, with appropriate metadata.
4. If an error is reported, an authorised editor prepares a correction/update, follows the still-to-be-agreed approval path, and publishes the corrected version with appropriate public correction information.
5. Earlier versions and internal review history remain retained and access-controlled; authorised staff may unpublish or archive according to the agreed rules.

**Alternative / failure:** Failed publication must not appear successful. Unapproved edits and private notes must not leak; cache or indexing must not expose a draft or retain withdrawn private material. If publication or approval is denied, show the user an appropriate reason without revealing restricted information.\
**Success:** A published article can be discovered publicly only after approval; corrections preserve previous versions and operational history.\
**Dependencies / validation:** Who approves/publishes, whether authors may approve their own work, update reapproval and correction policy are unresolved. Verify all permitted and prohibited transitions in later security and acceptance work.

**Conceptual editorial journey:**

```text
Authorised draft → submit for review → review ──request changes──→ revise / resubmit
                                      └─ approve → publish → correction/update or archive
```

This diagram is an experience overview, not a complete permission or state-transition specification.

### J09 — Administrator manages staff, media and radio settings

**Actor and goal:** Authorised administrator keeps Phase 1 operations functioning securely.\
**Entry / prerequisites:** Private admin account with relevant permissions and verified operational materials.

1. Administrator signs in and views actual operational records and pending work, not sample counts.
2. Administrator manages staff access and approved settings within assigned authority; access changes are recorded.
3. Administrator curates a permitted media record, supplies credits and metadata, and makes approved content available publicly.
4. Administrator configures or updates official radio information after rights and compatibility are confirmed, then checks its status through the agreed operational procedure.
5. Administrator reviews relevant audit activity and follows the incident or recovery procedure if something fails.

**Alternative / failure:** Unauthorised access, invalid upload or settings change is rejected server-side; an absent stream is not substituted with a fabricated one. Deactivated staff lose access as defined by the security model.\
**Success:** Only permitted actions succeed and operational changes are traceable; published media is genuinely available.\
**Dependencies / validation:** Actual access control, onboarding/offboarding, audit detail, media restrictions, stream credentials and ownership need later design. No service keys or private staff information may appear publicly.

## 6. Later-phase journeys — vision only

These are not available at the first release; they require separate phase approval, research, legal/privacy review, design and implementation.

### J10 — Contributor submits a community concern (Phase 2)

**Actor and goal:** Resident wishes to raise a non-emergency community concern through Speak Up Epe.\
**Entry / prerequisites:** Phase 2 approval, explicit privacy notice, secure submission workflow, staff capacity and tested abuse/escalation safeguards.

1. Contributor reads what the service can and cannot do, including that it is not an emergency service, how data is used and any anonymity limitations.
2. Contributor selects a category, provides a location/community and message, and supplies optional identity/contact details only as desired under the approved form design.
3. Contributor acknowledges the privacy/consent information and submits securely.
4. Contributor receives a secure reference number without publicising the report. The team reviews it privately; follow-up occurs only through an agreed and available channel.
5. The workflow progresses through received, review, verification, editorial decision and follow-up/closure as applicable; no report is automatically published.

**Alternative / failure:** Clear validation, rate-limit and delivery errors must not falsely confirm receipt. Explain what the reference number can and cannot do; lookup, tracking and notification mechanisms are **not yet specified**. Do not promise confidentiality or anonymity beyond the security model.\
**Success:** Eligible staff receive the report securely, the contributor gets a reference and private information is not publicly exposed.\
**Dependencies / validation:** Retention/deletion, encryption, access, abuse prevention, escalation, consent and emergency messaging must be approved before build.

### J11 — Resident participates in the digital village square (Phase 2)

**Actor and goal:** Resident wants a moderated public discussion.\
**Entry / prerequisites:** Approved community guidelines, account controls, moderation staffing and Phase 2 authorisation.

1. Resident reviews the guidelines and registers or signs in using the eventual approved account process.
2. Resident chooses a discussion category, reads an existing topic or creates a topic and posts an appropriate comment or reply.
3. Other participants can report problematic content through the approved reporting mechanism.
4. Resident receives a clear outcome if content is removed or an account action occurs, subject to the approved moderation and appeal policy.

**Alternative / failure:** Invalid input, abuse or account restrictions produce understandable feedback without exposing reporters or private moderator notes.\
**Success:** A permitted topic/comment can be created and read while reports and moderation controls work.\
**Dependencies / validation:** Identity model, community rules, consent, moderation and escalation remain open. No private messaging, polls or real-time chat are implied.

### J12 — Community moderator reviews a submission or report (Phase 2)

**Actor and goal:** Authorised moderator protects participants and routes issues appropriately.\
**Entry / prerequisites:** Separate role-based access, policies, secure queues, audit, training and coverage.

1. Moderator signs in and opens only the submissions or community reports their role permits.
2. Moderator reviews the report with its context, records an evidence-based decision and escalates safety or legal concerns according to approved policy.
3. For a community discussion, moderator applies an authorised action and records the reason. For Speak Up, moderator follows the private verification/editorial process; contact details stay restricted.
4. Moderator closes or hands off the case and records follow-up, retention and any applicable appeal outcome according to policy.

**Alternative / failure:** Access to a confidential report is denied to staff without permission; duplicate/abusive reports are managed without automatic public disclosure. No response or rescue is promised beyond actual capacity.\
**Success:** Actions are authorised, auditable and private data stays isolated.\
**Dependencies / validation:** Staffing, response expectations, escalation, role segregation, appeal rules and retention must be defined before Phase 2. Moderator is not an active Phase 1 module.

### J13 — Community member finds an event (Phase 2)

**Actor and goal:** Resident or diaspora member wants reliable details of an upcoming or past event.\
**Entry / prerequisites:** Approved event information and staff-managed event publishing.

1. Visitor browses upcoming or past events and opens a relevant listing.
2. Visitor sees approved date, location, description and any genuinely needed registration information.
3. Visitor follows the approved registration method if offered, or reads a past-event report.

**Alternative / failure:** Cancelled, changed or unavailable events are clearly identified; no fabricated event details or registration claims.\
**Success:** Visitor finds a current, approved event or a truthful empty state.\
**Dependencies / validation:** Event verification, management ownership and registration/privacy requirements are Phase 2 decisions.

### J14 — Reader checks governance or development evidence (Phase 3)

**Actor and goal:** Reader wants to inspect an approved profile or the evidence behind a development record.\
**Entry / prerequisites:** Reviewed records, source documentation and verification process.

1. Reader browses approved people or projects and opens a relevant record.
2. Reader examines the attributed description, verification status/date and available sources; for projects, the evidence-supported status and update history are visible.
3. Reader can understand how to report an error under the approved corrections process.

**Alternative / failure:** Unverified, missing or outdated evidence is clearly identified; unavailable sources are not presented as proof.\
**Success:** Reader can trace an important published claim to its source or see its verification limitation.\
**Dependencies / validation:** Verification rules, publication authority, sensitive claim handling and correction policy; no invented officeholders, projects or accusations.

### J15 — Visitor discovers heritage, places or a business (Phase 4)

**Actor and goal:** Resident, tourist or business seeker wants credible local discovery.\
**Entry / prerequisites:** Approved heritage, community, tourism or reviewed business listings and rights-cleared images.

1. Visitor browses the appropriate archive or directory and filters/searches available published records.
2. Visitor opens a record, reads its attribution, relevant details and verification status, and follows available related stories or contact information.
3. A prospective business owner uses the future approved submission/review process; only a reviewed listing becomes public.

**Alternative / failure:** Missing or disputed cultural material must be attributed or labelled rather than stated as settled fact; an unverified listing must not appear verified. An empty category shows no invented listings.\
**Success:** Visitor can find an approved record and understand its sources or verification state.\
**Dependencies / validation:** Local research and culturally sensitive review, distinct Eko Epe and Ijebu Epe histories, contributor consent, business review and listing ownership. Submission details are not yet defined; no checkout or marketplace is implied.

### J16 — Diaspora member subscribes and uses an expanded archive (Phase 5)

**Actor and goal:** Diaspora member wants reliable updates and better media discovery.\
**Entry / prerequisites:** Approved consent-based newsletter and expanded archive, email provider and operational capacity.

1. Visitor searches or filters available programmes and explores collections or transcripts when available.
2. If interested, visitor opts in to the newsletter and confirms their email through the approved process.
3. Subscriber receives only consented campaigns and can unsubscribe; unsubscribe and delivery outcomes are recorded appropriately.

**Alternative / failure:** Failed confirmation or delivery must be communicated honestly; consent and unsubscribe choices are respected. Do not assume a transcript, campaign, or subscriber count exists.\
**Success:** Confirmed subscription, consented delivery and unsubscribe work; media discovery opens available recordings.\
**Dependencies / validation:** Provider, consent language, sender reputation, retention and campaign operations require Phase 5 approval. No newsletter entry point is active in Phase 1.

## 7. Cross-journey risks and validation priorities

| Priority | Hypothesis or risk | Validation needed | Current status |
| --- | --- | --- | --- |
| 1 | Users can find and operate the live radio player on slower Android connections. | Test an authorised official stream on representative devices, browser/network conditions and accessibility controls. | Blocked by missing unverified stream and permission; live radio is required at launch. |
| 2 | Users understand what happens when they contact the organisation. | Agree recipient, WhatsApp number, form fields, delivery failure and privacy rules; test expectations and accessibility. | Owner chose form + WhatsApp; operational details open. |
| 3 | Staff can safely review and publish without exposing drafts or losing corrections. | Staff walkthrough plus later security/integration testing of roles, review, preview, versions and caching. | Owner and developer identified; role split and policies open. |
| 4 | Visitors recognise available services and can navigate between main and news. | Task-based mobile and desktop research with representative audiences. | Not yet researched. |
| 5 | Future sensitive submissions and cultural records are handled safely. | Community consultation and privacy/legal review before relevant phase. | Future-only; no implied approval. |

## 8. Workstream 0.2 review and gate

**Deliverable prepared:** Hypothesis-based public, staff and future-phase journeys, research plan and validation priorities. No interviews, usability sessions or real stream tests have been conducted. Detailed page structure, role matrix, system architecture and acceptance tests will be developed in their respective later workstreams.

**Review scope:** These journeys cover the intended experience, including the general contact versus future Speak Up distinction and the radio launch requirement. Approval does not validate untested research assumptions, resolve missing stream/WhatsApp details, or authorise Phase 1.

**Approval record:** Owner approved Workstream 0.2 on 2 November 2026, with no changes requested. Proceed to Workstream 0.3 (information architecture). Do not proceed to production development until the complete Phase 0 exit condition is met.
