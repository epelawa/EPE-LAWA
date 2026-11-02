# EPE LAWA — User Journeys

**Document:** 02
**Status:** Active. These are hypotheses derived from the client brief, **not research findings**. No
interviews, usability sessions or analytics have been conducted.

---

## 1. Actors

| Actor | Needs | Constraint |
| --- | --- | --- |
| Visitor | Understand what this is; find something useful | Unknown to the platform, probably on mobile |
| Reader (home) | Local news they can trust | Cheap Android, metered data, intermittent power |
| Reader (diaspora) | To feel connected; the archive | Different timezone, may need to share |
| Listener | The programme, live or recorded | Cannot stream for an hour on 200 MB of data |
| Member | To say something and be heard | Wants their name; may want to stay semi-anonymous |
| Business owner | To be found, then to sell | Will judge the product in 10 seconds on a phone |
| Buyer | To pay safely and know it worked | Distrusts online payment in Nigeria, with reason |
| Journalist | To get a story published | May only have a phone |
| Editor | To stop something wrong being published | Needs the workflow to not be in the way |
| Moderator | To remove harm quickly and accountably | Needs a record, not a mood |

---

## 2. Public journeys

### J1 — First visit

Visitor opens `epelawa.ng` on a phone. Within a few seconds they should be able to answer: what is
this, who is it for, what can I do.

1. Lands on the home page. Reads one sentence that says what EPE LAWA is.
2. Sees the real sections. Every one of them is live or honestly marked.
3. Taps the one that matters to them.

**Fails if:** the page describes a product that does not exist yet; a section link 404s; anything on
the page is a fabricated metric, testimonial or "coming soon".

### J2 — Reading the news

1. Taps News → `news.epelawa.ng`.
2. Sees the lead story, then a feed by recency.
3. Filters by category, or searches.
4. Opens an article, reads it, sees author and date and any correction notice.
5. Shares the canonical link.

**Fails if:** a draft appears; the shared link resolves to something else; the correction notice is
hidden; search returns unpublished work.

### J3 — Listening to the programme

1. Taps Radio.
2. Sees whether it is live, and the schedule if it is not.
3. Presses play deliberately — nothing autoplays.
4. Buffering is visible; a drop is acknowledged; an outage offers the archive.

**Fails if:** "LIVE" shows when nothing has been verified; the spinner never ends; the page looks
broken instead of unavailable.

### J4 — Finding out who someone is

1. Searches Who is Who for a name, or filters by office.
2. Opens the profile: biography, offices with term dates, sources, verification badge.
3. Taps the badge and reads what verification actually means.
4. Submits a correction if something is wrong.

**Fails if:** a claim has no source; the badge appeared without a recorded review; a correction goes
into a void with no acknowledgement.

### J5 — Finding a business

1. Opens Businesses, filters by category and area.
2. Opens a profile: hours, phone, WhatsApp, address with a landmark, photos, reviews.
3. Calls or taps through to WhatsApp.
4. Leaves a review if signed in.

**Fails if:** an unverified business looks endorsed; hours are prose; the phone number is dead; a
review can be posted anonymously.

### J6 — Buying something

1. Opens a product, adds to cart.
2. Sees the cart with prices, then checkout with delivery options.
3. Pays through Paystack.
4. Returns to an honest status page: paid, pending or failed — with a way forward.

**Fails if:** the total on the confirmation differs from the total charged; a failed payment leaves a
dead end; the order shows "paid" before the webhook confirms it.

### J7 — Joining the conversation

1. Registers with email and a handle, verifies the email.
2. Opens a forum category, reads a thread, replies.
3. Reports a post that breaks the guidelines.
4. Later: a moderator action is explained to them.

**Fails if:** registration asks for more than it needs; the handle collides silently; the report goes
nowhere; nobody ever knows what happened.

---

## 3. Staff journeys

### J8 — Publishing a story

1. Journalist signs in to `admin.epelawa.ng`.
2. Creates a draft: title, summary, body, category, author, tags, image with credit.
3. Previews it privately.
4. Submits for review.
5. Editor requests a change or approves.
6. Publisher publishes.

**Fails if:** the journalist can approve their own work; preview is reachable without a session; a
save failure reports success; publish does not purge the public cache.

### J9 — Correcting a published story

1. Editor opens the article, creates a new version.
2. Edits, submits, is approved by someone else.
3. Publishes. A dated correction notice appears publicly. The old version stays in history.

**Fails if:** the correction silently replaces the text; the notice is missing; history is lost.

### J10 — Moderating

1. Moderator opens the queue, sorted by age.
2. Reads the report in context.
3. Hides the post with a reason, or dismisses with a reason.
4. The action is recorded and the member is told.

**Fails if:** a hide can happen without a reason; the audit row is missing; the same moderator can
silently remove anything with no trail.

### J11 — Verifying a business

1. Reviewer opens the submission.
2. Checks the phone number, the address and a photo.
3. Verifies, records what was checked and when.
4. Or rejects with a reason the owner can act on.

**Fails if:** the badge can be set without a recorded check.

---

## 4. Cross-cutting needs

| Need | Where it shows up |
| --- | --- |
| Data cost | Every image sized and lazy; no autoplay; no third-party script unless needed |
| Trust | Sources on claims, corrections visible, no invented anything |
| Offline | Cached shell, honest connectivity state, retry not a dead end |
| Language | English now. Yoruba is a future decision requiring translation and review |
| Accessibility | Keyboard, screen reader, contrast — every journey above |
| Privacy | Contact detail minimum; email never public; deletion actually deletes |
| Reputation | Who is Who and business verification are the two places we can do real harm |

---

## 5. What is not researched

Who actually uses this, what they can afford to spend on data, whether they will pay online, whether
moderation can be staffed, and what "Epe Division" means to people in each of its communities. All of
that requires real interviews and must not be invented. Design decisions taken on assumption are
recorded as assumptions.
