export default function arcPrompt(contact, hasDeck, dossier) {
  return `Draft a cold outreach email from Nyayanidhi, Founder of Suvarna Nyayanidhi Pvt. Ltd. — Bangalore-based managed litigation infrastructure (not software). "Pair-co" model: AI + practicing advocates. Embeds as the execution layer between client legal strategy and court outcomes. Covers SARFAESI enforcement, DRT execution, debt recovery, possession and auction lifecycle for Asset Reconstruction Companies.

RECIPIENT: ${contact.name} | ${contact.title} | ${contact.company}
Email: ${contact.email}
${contact.linkedin ? `LinkedIn: ${contact.linkedin}` : ""}
Notes: ${contact.notes || "None"}

RESEARCH + DOSSIER:
${dossier || "None provided. Use only contact notes. Do not invent intelligence."}

STEP 0 — RELEVANCE CHECK (MANDATORY)
Read the research above. Check the RELEVANCE CHECK section. If the person's actual role is in IT, HR, marketing, treasury, or ANY function unrelated to: distressed asset resolution, SARFAESI enforcement, DRT execution, portfolio recovery, legal operations, investment, or C-suite — then this person is NOT a fit for our services.
If NOT relevant, return ONLY: {"subject":"","body":"","skip":true,"reason":"[explain why]"}

STEP 1 — ABSORB THE RESEARCH
Read ALL research above carefully. Extract:
- Person's career trajectory and professional background
- Their LinkedIn activity, posts, talks, or published views
- Their public opinions on distressed assets, recovery execution, portfolio resolution, or related topics
- Their ACTUAL function (decoded from research — do not assume from title alone)
(Company intelligence comes from the dossier section — focus the research on the PERSON.)

STEP 2 — MAP THE ROLE
Based on their ACTUAL role (from research, not just title) AND the research, determine exactly what this person owns:
- What decisions do they make daily?
- What metrics/KPIs are they measured on?
- What keeps them up at night?
- What would make them look good to their leadership/investors?
- What frustrations do they likely have with current recovery/legal operations?

STEP 3 — CLASSIFY into one profile. Build entire email around it.

A) LEGAL / COMPLIANCE (Head Legal, VP Legal, General Counsel)
Pain: Managing large acquired NPA portfolios with SARFAESI enforcement across multiple jurisdictions. Panel advocates lack accountability. No centralised visibility into possession/auction status.
Frame us: Governance infrastructure — centralised SARFAESI lifecycle tracking, SOP enforcement, advocate accountability across states. Not a law firm, a delivery partner.
Tone: Strategic, governance, peer-to-peer. NO tech/AI/software mentions.

B) RECOVERY / RESOLUTION (Head Recovery, VP Resolution, Portfolio Manager, DGM Recovery)
Pain: Acquired distressed portfolios need aggressive SARFAESI/DRT execution. Tracking possession notices, DM orders, auction timelines across hundreds of accounts manually. Advocates not following up.
Frame us: Execution layer for portfolio recovery — structured SARFAESI lifecycle tracking, statutory deadline alerts, advocate accountability, clean MIS per portfolio tranche.
Tone: Operational, direct. Possession, auction, DM orders, DRT hearings. NO financial metrics or board language.

C) INVESTMENT / PORTFOLIO (Head Investments, CIO, Portfolio Head)
Pain: Recovery rate on acquired portfolios below expectations. Slow legal execution erodes IRR on acquired NPAs. Vintage ageing without resolution.
Frame us: Missing link between portfolio acquisition and actual recovery — structured legal execution compresses resolution timeline = improved recovery rates and IRR.
Tone: Portfolio returns, resolution speed, vintage performance. NO advocate/court detail.

D) C-SUITE (CEO, MD, CFO)
Pain: ARC business model depends on recovery execution. Capital locked in unresolved portfolios. Investor returns tied to legal resolution speed.
Frame us: Structural intervention in legal execution = faster recovery, improved capital recycling, better investor returns.
Tone: Financial materiality only. NO advocates, courts, or operational detail.

STEP 4 — PERSONALISE WITH RESEARCH
Using the research, find 2-3 specific facts that are relevant to THIS person's role:
- If they posted about recovery challenges or portfolio performance → reference that theme
- If they spoke at a distressed assets conference → nod to that topic
- If their ARC has specific portfolio/recovery pressures → connect it to what this role cares about
- If their career path shows they moved from X to Y → understand what that says about their priorities
Do NOT quote them directly or name-drop their LinkedIn. Weave the intelligence naturally.

STEP 5 — WRITE THE EMAIL (200-300 words)

SUBJECT: Specific to company + role. Feels like an observation, not a pitch.
Example register: "SARFAESI possession timelines — where acquired portfolios stall" / "The execution gap between acquisition and recovery"

OPENING: Most important line. Reference a specific insight from the research — a structural gap or tension relevant to their role. Must NOT introduce yourself, compliment them, state generic problems, or begin with "I"/"We".

BODY (3-5 sentences): Connect the research insight to their specific role pain. Name the structural problem they face. Position Suvarna Nyayanidhi as the specific solution. No bullets, no feature lists.

CTA: One sentence, 15-minute call, easy yes.${hasDeck ? " Reference attached deck in a short clause before CTA." : ""}

Sign-off:
Nyayanidhi
Founder, Suvarna Nyayanidhi Pvt. Ltd.
+91-XXXXXXXXXX

GUARDRAILS (absolute):
- Every claim must trace to research/dossier/notes. No invented facts.
- No specific numbers (recovery rates, IRR, AUM) in email body.
- No fabricated quotes or attributed statements.
- No claims of working with this or any named client unless stated in notes.
- No speculation on undisclosed decisions or plans.
- Do NOT say "I saw on LinkedIn" or "According to your profile" — weave insights naturally.
- If research lacks specificity, write strong conceptual lines instead of fabricating.

OUTPUT: Return ONLY valid JSON. No markdown, no explanation.
{"subject":"...","body":"..."}
Use \\n for line breaks. No HTML.`;
}
