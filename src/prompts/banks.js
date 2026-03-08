export default function banksPrompt(contact, hasDeck, dossier) {
  return `Draft a cold outreach email from Nyayanidhi, Founder of Suvarna Nyayanidhi Pvt. Ltd. — Bangalore-based managed litigation infrastructure (not software). "Pair-co" model: AI + practicing advocates. Embeds as the execution layer between client legal strategy and court outcomes. Covers NI Act, SARFAESI, debt recovery, DRT matters, and loan default litigation for banks.

RECIPIENT: ${contact.name} | ${contact.title} | ${contact.company}
Email: ${contact.email}
${contact.linkedin ? `LinkedIn: ${contact.linkedin}` : ""}
Notes: ${contact.notes || "None"}

RESEARCH + DOSSIER:
${dossier || "None provided. Use only contact notes. Do not invent intelligence."}

STEP 0 — RELEVANCE CHECK (MANDATORY)
Read the research above. Check the RELEVANCE CHECK section. If the person's actual role is in retail banking, IT, HR, marketing, treasury, forex, or ANY function unrelated to: NPA resolution, SARFAESI, DRT, recovery, legal operations, credit risk, or finance/C-suite — then this person is NOT a fit for our services.
If NOT relevant, return ONLY: {"subject":"","body":"","skip":true,"reason":"[explain why]"}

STEP 1 — ABSORB THE RESEARCH
Read ALL research above carefully. Extract:
- Person's career trajectory and professional background
- Their LinkedIn activity, posts, talks, or published views
- Their public opinions on NPA resolution, recovery, legal ops, or related topics
- Their ACTUAL function (decoded from research — do not assume from title alone)
(Company intelligence comes from the dossier section — focus the research on the PERSON.)

STEP 2 — MAP THE ROLE
Based on their ACTUAL role (from research, not just title) AND the research, determine exactly what this person owns:
- What decisions do they make daily?
- What metrics/KPIs are they measured on?
- What keeps them up at night?
- What would make them look good to their leadership?
- What frustrations do they likely have with current recovery/legal operations?

STEP 3 — CLASSIFY into one profile. Build entire email around it.

A) LEGAL / COMPLIANCE (Head Legal, General Counsel, VP Legal, Compliance Head, Company Secretary)
Pain: Scattered panel advocates across states, inconsistent SARFAESI/DRT outcomes, no centralised matter tracking, delayed possession/recovery.
Frame us: Governance infrastructure — SOP enforcement across jurisdictions, matter lifecycle tracking, advocate accountability. Not a law firm, a delivery partner.
Tone: Strategic, governance, peer-to-peer. NO tech/AI/software mentions.

B) RECOVERY / NPA (Head Recovery, DGM Recovery, NPA Head, Chief Recovery Officer)
Pain: Managing thousands of NPA accounts across SARFAESI, DRT, Lok Adalat. Manual tracking of possession dates, auction timelines, advocate follow-ups. Poor recovery rates.
Frame us: Execution layer for recovery litigation — structured tracking, proactive alerts on statutory timelines, advocate accountability, clean MIS.
Tone: Operational, direct. Recovery, possession, auction, DRT hearings. NO financial metrics or board language.

C) CREDIT / RISK (Chief Credit Officer, Head Credit Risk, VP Risk)
Pain: Ageing NPA book, provision burden from unresolved litigation. Slow legal execution delays write-back potential.
Frame us: Missing link between credit decisions and legal recovery — structured intake, SLAs, faster execution = faster resolution + better provision outcomes.
Tone: Portfolio quality, provision impact, resolution speed. NO advocate/court detail.

D) FINANCE / C-SUITE (CFO, MD, CEO)
Pain: Balance sheet drag from gross NPA ratios. Provision coverage pressure, capital adequacy impact of unresolved NPAs.
Frame us: Structural intervention compressing recovery lifecycle = reduced provision burden, improved asset quality ratios.
Tone: Financial materiality only. NO advocates, courts, or operational detail.

STEP 4 — PERSONALISE WITH RESEARCH
Using the research, find 2-3 specific facts that are relevant to THIS person's role:
- If they posted about NPA resolution or recovery challenges → reference that theme
- If they spoke at a banking conference → nod to that topic
- If their bank has specific GNPA/NNPA pressures or RBI observations → connect it to what this role cares about
- If their career path shows they moved from X to Y → understand what that says about their priorities
Do NOT quote them directly or name-drop their LinkedIn. Weave the intelligence naturally.

STEP 5 — WRITE THE EMAIL (200-300 words)

SUBJECT: Specific to company + role. Feels like an observation, not a pitch.
Example register: "SARFAESI timelines after notice — where the execution gap sits" / "The recovery coordination problem at scale"

OPENING: Most important line. Reference a specific insight from the research — a structural gap or tension relevant to their role. Must NOT introduce yourself, compliment them, state generic problems, or begin with "I"/"We".

BODY (3-5 sentences): Connect the research insight to their specific role pain. Name the structural problem they face. Position Suvarna Nyayanidhi as the specific solution. No bullets, no feature lists.

CTA: One sentence, 15-minute call, easy yes.${hasDeck ? " Reference attached deck in a short clause before CTA." : ""}

Sign-off:
Nyayanidhi
Founder, Suvarna Nyayanidhi Pvt. Ltd.
+91-XXXXXXXXXX

GUARDRAILS (absolute):
- Every claim must trace to research/dossier/notes. No invented facts.
- No specific numbers (NPA ratios, provision amounts, recovery rates) in email body.
- No fabricated quotes or attributed statements.
- No claims of working with this or any named client unless stated in notes.
- No speculation on undisclosed decisions or plans.
- Do NOT say "I saw on LinkedIn" or "According to your profile" — weave insights naturally.
- If research lacks specificity, write strong conceptual lines instead of fabricating.

OUTPUT: Return ONLY valid JSON. No markdown, no explanation.
{"subject":"...","body":"..."}
Use \\n for line breaks. No HTML.`;
}
