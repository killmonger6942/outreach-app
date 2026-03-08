export default function nbfcPrompt(contact, hasDeck, dossier) {
  return `Draft a cold outreach email from Nyayanidhi, Founder of Suvarna Nyayanidhi Pvt. Ltd. — Bangalore-based managed litigation infrastructure (not software). "Pair-co" model: AI + practicing advocates. Embeds as the execution layer between client legal strategy and court outcomes. Covers NI Act, SARFAESI, debt recovery, loan default litigation, and cheque bounce matters for NBFCs.

RECIPIENT: ${contact.name} | ${contact.title} | ${contact.company}
Email: ${contact.email}
${contact.linkedin ? `LinkedIn: ${contact.linkedin}` : ""}
Notes: ${contact.notes || "None"}

RESEARCH + DOSSIER:
${dossier || "None provided. Use only contact notes. Do not invent intelligence."}

STEP 0 — RELEVANCE CHECK (MANDATORY)
Read the research above. Check the RELEVANCE CHECK section. If the person's actual role is in sales, IT, HR, marketing, product, or ANY function unrelated to: collections, legal recovery, NI Act, SARFAESI, credit risk, delinquency management, or finance/C-suite — then this person is NOT a fit for our services.
If NOT relevant, return ONLY: {"subject":"","body":"","skip":true,"reason":"[explain why]"}

STEP 1 — ABSORB THE RESEARCH
Read ALL research above carefully. Extract:
- Person's career trajectory and professional background
- Their LinkedIn activity, posts, talks, or published views
- Their public opinions on collections, legal recovery, delinquency management, or related topics
- Their ACTUAL function (decoded from research — do not assume from title alone)
(Company intelligence comes from the dossier section — focus the research on the PERSON.)

STEP 2 — MAP THE ROLE
Based on their ACTUAL role (from research, not just title) AND the research, determine exactly what this person owns:
- What decisions do they make daily?
- What metrics/KPIs are they measured on?
- What keeps them up at night?
- What would make them look good to their leadership?
- What frustrations do they likely have with current collections/legal operations?

STEP 3 — CLASSIFY into one profile. Build entire email around it.

A) LEGAL / COMPLIANCE (Head Legal, VP Legal, Compliance Head, Company Secretary)
Pain: High-volume NI Act (cheque bounce) and loan default cases across jurisdictions. Scattered panel advocates, no SOP enforcement, inconsistent outcomes.
Frame us: Governance infrastructure — centralised matter tracking, SOP enforcement, advocate accountability across courts. Not a law firm, a delivery partner.
Tone: Strategic, governance, peer-to-peer. NO tech/AI/software mentions.

B) COLLECTIONS / RECOVERY (Head Collections, VP Recovery, DGM Collections)
Pain: Thousands of default accounts requiring legal action. Manual tracking of NI Act timelines (30-day notice, filing, hearings), SARFAESI possession dates. Advocates not accountable.
Frame us: Execution layer for collection litigation — structured tracking, statutory deadline alerts, advocate accountability, clean MIS across jurisdictions.
Tone: Operational, direct. Cases, timelines, advocates, courts. NO financial metrics or board language.

C) CREDIT / RISK (Chief Credit Officer, Head Risk, VP Credit)
Pain: Portfolio stress from unresolved delinquencies. Slow legal resolution delays write-offs and recovery. Provision burden growing.
Frame us: Missing link between credit portfolio and legal resolution — structured intake, SLAs, faster execution = faster NPA resolution.
Tone: Portfolio quality, resolution speed, provision impact. NO advocate/court detail.

D) FINANCE / C-SUITE (CFO, MD, CEO)
Pain: Asset quality pressure, provision coverage ratios, capital impact of ageing NPAs. Regulatory scrutiny on unresolved defaults.
Frame us: Structural intervention compressing legal lifecycle = faster resolution, improved asset quality, reduced provision drag.
Tone: Financial materiality only. NO advocates, courts, or operational detail.

STEP 4 — PERSONALISE WITH RESEARCH
Using the research, find 2-3 specific facts that are relevant to THIS person's role:
- If they posted about collection challenges or legal bottlenecks → reference that theme
- If they spoke at an NBFC/fintech conference → nod to that topic
- If their company has specific delinquency or regulatory pressures → connect it to what this role cares about
- If their career path shows they moved from X to Y → understand what that says about their priorities
Do NOT quote them directly or name-drop their LinkedIn. Weave the intelligence naturally.

STEP 5 — WRITE THE EMAIL (200-300 words)

SUBJECT: Specific to company + role. Feels like an observation, not a pitch.
Example register: "NI Act timelines after the bounce — where execution breaks down" / "The collections-to-legal handoff gap"

OPENING: Most important line. Reference a specific insight from the research — a structural gap or tension relevant to their role. Must NOT introduce yourself, compliment them, state generic problems, or begin with "I"/"We".

BODY (3-5 sentences): Connect the research insight to their specific role pain. Name the structural problem they face. Position Suvarna Nyayanidhi as the specific solution. No bullets, no feature lists.

CTA: One sentence, 15-minute call, easy yes.${hasDeck ? " Reference attached deck in a short clause before CTA." : ""}

Sign-off:
Nyayanidhi
Founder, Suvarna Nyayanidhi Pvt. Ltd.
+91-XXXXXXXXXX

GUARDRAILS (absolute):
- Every claim must trace to research/dossier/notes. No invented facts.
- No specific numbers (AUM, NPA ratios, collection rates) in email body.
- No fabricated quotes or attributed statements.
- No claims of working with this or any named client unless stated in notes.
- No speculation on undisclosed decisions or plans.
- Do NOT say "I saw on LinkedIn" or "According to your profile" — weave insights naturally.
- If research lacks specificity, write strong conceptual lines instead of fabricating.

OUTPUT: Return ONLY valid JSON. No markdown, no explanation.
{"subject":"...","body":"..."}
Use \\n for line breaks. No HTML.`;
}
