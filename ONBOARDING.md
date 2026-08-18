# SQ1 Bid Intake — Operator Onboarding

**For:** Jatin Patel
**Signing in as:** `bidroom@squareoneceilings.com`
**Prepared:** 2026-08-18

You are taking over Bid Intake: turning red-flagged emails in the bidroom inbox into complete,
verified Dynamics 365 opportunities with drawings filed, a takeoff started, and a Bluebeam Studio
project published for the estimator.

Everything you need to follow lives in GitHub (`squareoneceilings/sq1-agents`) and Azure. Nothing
important lives in someone's head or on one Mac. Read this page once, do the setup, then work from
the agent itself.

---

## 1. The four rules that matter most

These are enforced by hooks, not by trust. You will be blocked if you break them.

1. **Red-flagged emails only.** Mike puts a red flag on a bidroom email to mean "set this job up."
   You never bulk-process the inbox, and you never create a job from an unflagged email.
2. **Owner is always Mike.** Every opportunity you create is owned by Mike Keisker, even though you
   created it. A PreToolUse hook rejects any other owner. This is intentional — don't work around it.
3. **Never set up the same job twice.** Dedupe before you create: same GC + same bid date, then
   architect, then name/address. A hook does a live duplicate check and will block the create.
4. **Nothing goes out without Mike's approval.** No email, text, or message to a GC, vendor, or
   architect — ever — until Mike has seen the draft and said send. Draft it, show it, wait.

**You may not change any rule.** Rule changes go through Mike or Caleb only, as a pull request to
`sq1-agents`. If you think a rule is wrong, say so — that's useful — but don't edit it.

---

## 2. Setup

### 2.1 Accounts — already done, no action

Verified 2026-08-18. `bidroom@squareoneceilings.com` already has:

- A licensed, enabled sign-in (Business Premium, Sales Enterprise, BC Premium)
- Dynamics 365 **System Administrator** + Sales Enterprise app access
- SharePoint access to the D365 document library, via the **SQUARE ONE CEILINGS Office** group
- The bidroom mailbox itself

Your GitHub account `SQ1-Jatin` is already a member of the `squareoneceilings` org.

### 2.2 Azure — Mike grants these once

Without these two, everything works **except** publishing to Bluebeam and refreshing the gate key.

Set the subscription ID first. It is not published in this repo — get it from Mike, or read it out of
`~/.config/sq1/gate.env`:

```bash
SQ1_SUBSCRIPTION_ID="<ask Mike>"
```

```bash
az role assignment create --assignee bidroom@squareoneceilings.com \
  --role "Key Vault Secrets Officer" \
  --scope "/subscriptions/$SQ1_SUBSCRIPTION_ID/resourceGroups/sq1-platform-rg/providers/Microsoft.KeyVault/vaults/sq1-platform-kv"
```

```bash
az role assignment create --assignee bidroom@squareoneceilings.com \
  --role "Contributor" \
  --scope "/subscriptions/$SQ1_SUBSCRIPTION_ID/resourceGroups/sq1-bidintake-gate-rg/providers/Microsoft.Web/sites/sq1-bidintake-gate-fn"
```

Secrets **Officer**, not User — the Bluebeam helper rotates its refresh token back into the vault, so
it needs write as well as read.

### 2.3 Your machine

Sign in to Microsoft 365 and `az` as **bidroom@**. Sign in to GitHub as **SQ1-Jatin** — keep those
separate, so there is one honest record of who was at the keyboard.

```bash
az login
gh auth login
```

Install Claude Code, then the agent:

```
/plugin marketplace add squareoneceilings/sq1-agents
/plugin install sq1-core@sq1-agents
/plugin install sq1-bid-intake@sq1-agents
```

Tooling the takeoff scripts need:

```bash
brew install tesseract
pip3 install PyMuPDF openpyxl python-docx fpdf2
```

Three credential files, from Mike, in `~/.config/sq1/` — **chmod 600, never commit them anywhere**:

| File | What breaks without it |
|---|---|
| `gate.env` | The cloud "definition of done" gate can't audit your run |
| `d365-dedup.env` | Duplicate-job blocking and the verifier's live audit |
| `sq1-automation-mail.env` | You can't read the bidroom mailbox verbatim — see §5.1 |

```bash
chmod 600 ~/.config/sq1/*.env
```

Connect the **Dynamics 365** and **SharePoint** MCP connectors in claude.ai, authorized as bidroom@.

Finally, browser logins you will need: BuildingConnected, Procore, SmartBid, PipelineSuite, Bluebeam
Studio.

### 2.4 Confirm it worked

Start a fresh Claude Code session. The banner prints a **Rules version** line with a commit hash and
date. If it's missing or old, the plugin hasn't synced — restart Claude Code (syncing alone does not
update a session already running).

---

## 3. Running it

Say **"red flag run"** or **"run bid intake"**. The agent works one flagged email at a time, all the
way through, before starting the next.

Per job, in order:

1. Confirm the email is genuinely red-flagged
2. **Dedupe** — decide new vs. enrich an existing job, and record which
3. Create the opportunity (project name only — CRM assigns the number)
4. GC + contact onto the Customers tab
5. Bid deadline, address, canonical portal link
6. Architect (from the drawing cover sheet if the platform doesn't say)
7. Download the drawings and file them to `Drawings n Specs`
8. Takeoff prep — room list, ACT scan, tile count, ACT spec section
9. Publish to Bluebeam Studio, write the link back to the opportunity
10. Log the invitation to the Timeline **verbatim**
11. **Verify** — then, and only then, move the email to Completed

You don't have to memorize this. The agent follows it and checks itself after every step.

---

## 4. What "done" means

Done is not your opinion, and it isn't the agent's either. There are **20 numbered definition-of-done
items** in `sq1-core/agent-rules/bid-intake.md`, and three layers check them:

- a **verifier** that independently re-reads D365 and SharePoint and reports gaps
- a **finish gate** that blocks the session from ending with unverified work
- a **cloud gate** in Azure that audits the run independently of your machine

**Order matters: the verifier passes first, then the email moves to Completed.** A job whose email is
still sitting flagged in the Inbox is the visible signal that work is outstanding. Never move it early
to tidy up.

Real example from 2026-08-18: on job 26-0620 the verifier caught three genuine misses — including a
Timeline entry that had been *summarized instead of copied*. All three were fixed before the email
moved. That is the system working. Expect it to catch you; that's what it's for.

---

## 5. Gotchas that will actually bite you

### 5.1 Log emails verbatim — never retype one

The Timeline copy of an invitation must be the mailbox's raw body, byte for byte. Not a summary, not
a cleaned-up version, and with the platform's own links left intact. Fetch it programmatically using
`sq1-automation-mail.env`. Retyping loses links and quietly changes the record.

### 5.2 Verify uploads by re-opening, not by size

SharePoint **rewrites** `.docx`, `.xlsx` and `.pptx` on upload — a 39 KB Word file can land at 50 KB.
That is not corruption. PDFs and CSVs are byte-exact and *should* match exactly.

### 5.3 Bid and walk dates are stored as wall-clock, literally

`advic_biddeadline` and `advic_jobwalkdate` are timezone-independent. A 2:00 PM CT bid is stored
`T14:00:00Z`. Do **not** convert to UTC — that shifts the displayed time and has caused real errors.

### 5.4 Never invent a time

If an invitation gives a date but no time, go get the time from the bid platform's own record, and
write down where you got it. If you can't find one, leave it blank and flag it. A guessed bid time is
worse than an empty field.

### 5.5 Check the scale before you trust a measurement

Drawing sets get rescaled, and a printed scale note can be wrong. Measure the drawn grid and confirm
it before any quantity leaves the building. On one job this turned a "7,600 SF" job into 7,300 SF.

### 5.6 Folder names sanitize punctuation

SharePoint turns `.` and `#` into `-`. `St. Louis` becomes `St- Louis`. Job-folder lookups fail
otherwise.

### 5.7 A fresh job folder won't show up in search

The SharePoint index lags provisioning by minutes. List the folder directly by name instead of
searching for it.

### 5.8 Say what you didn't do

If drawings don't exist, if there's no room schedule, if a spec is missing — record the reason on the
opportunity. Never invent a room list, a tile count, or an architect. "Not available, here's why" is
a complete answer. A fabricated one is not.

---

## 6. When to stop and ask Mike

- Anything that would go **out** — email, text, transmittal, RFQ
- A bid or scope conflict in the documents (they happen constantly)
- A job that may not be a bid at all, or that we may not want to bid
- A duplicate or wrong record in CRM that needs merging or renaming
- Anything you'd have to guess at to finish

Flag it, park the email in **Waiting on Mike**, and move on to the next job. Blocking on one unknown
while five other jobs sit idle helps nobody.

---

## 7. Where things live

| Thing | Where |
|---|---|
| Rules, agent, skills | `squareoneceilings/sq1-agents` → `sq1-core/agent-rules/bid-intake.md` |
| Job folders | SharePoint → `SQUARE ONE CEILINGS Office` → `opportunity/` |
| Opportunities | Dynamics 365 |
| Drawing markup | Bluebeam Studio (projects owned by bidroom@) |
| Cloud done-gate | Azure — `sq1-bidintake-gate-fn` |

To read the current rules at any time, ask for them by name rather than trusting this page — this
document is a starting point, the repo is the source of truth.

---

## 8. Questions

**Mike Keisker** — mike@squareoneceilings.com. Rule changes go through Mike or Caleb only.
