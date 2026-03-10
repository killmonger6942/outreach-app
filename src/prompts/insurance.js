export default function insurancePrompt(contact, hasDeck, dossier) {
  return `Draft a cold outreach email from Ujwal Uthappa, Founder's Office, Nyayanidhi.

ABOUT NYAYANIDHI:
Litigation operating system for MACT (Motor Accident Claims Tribunal) cases. 15–20 lakh MACT cases pending across 700–1,000+ tribunals in India. Every motor insurer is a potential customer.

We do not build software for insurers to operate. Insurers can run their MACT litigation using our infrastructure. What this means in practice:
- On claims intake, the case is digested and a defense strategy is drafted within seconds.
- Case files are assigned to vetted network advocates through a click of a button.
- The entire case lifecycle — claim petition → hearings → orders → award → deposit → execution → closure — is managed through the operating system. Complete visibility into how cases are run, irrespective of jurisdiction, village, or district.
- Granular research on each case file flags inconsistencies across the record of events, evidences, medical reports, and attached documents. A defensible strategy is built in seconds — work that would take a human weeks.
- If potential fraud is visible through document analysis and granular research, it is flagged to the investigation/ILM team immediately.
- Along the entire lifecycle, every legal document that needs to be submitted into court — written arguments, cross-examination prep, settlement memos, interlocutory applications — is drafted because the full case context is maintained on the system.
- Deadlines are system-enforced across the entire case lifecycle.
- Pre-claim intelligence: up to 3 months early warning on cases entering litigation, before the insurer is even served.

RECIPIENT: ${contact.name} | ${contact.title} | ${contact.company}
Email: ${contact.email}
${contact.linkedin ? `LinkedIn: ${contact.linkedin}` : ""}
Notes: ${contact.notes || "None"}

RESEARCH + DOSSIER:
${dossier || "None provided. Use only contact notes. Do not invent intelligence."}

STEP 0 — ABSORB RESEARCH FIRST
Extract: career trajectory, LinkedIn activity/posts/talks, public opinions on litigation/claims/legal ops, ACTUAL function (decode from research, not title alone). Do NOT rely on title alone — research may reveal the person's actual domain.

STEP 1 — RELEVANCE CHECK (MANDATORY — apply AFTER research)
Based on research + title + notes, determine the person's ACTUAL function. If they work primarily in health insurance, life insurance, motor OD only, IT infrastructure, HR, marketing, distribution/agency, reinsurance treaty, investment/treasury, customer service, product development (non-motor) — NOT a fit. Title may say "Claims" or "VP" generically — use research to determine if they are in a relevant motor TP / litigation-adjacent role.
If NOT relevant: {"subject":"","body":"","skip":true,"reason":"[explain]"}

STEP 2 — CLASSIFY into ONE profile. Build entire email around WHAT MATTERS TO THEM — their daily responsibilities, the problems they personally face, and how Nyayanidhi fits directly into their workflow. Do NOT describe tech features. Describe operational outcomes.

A) LEGAL LEADERSHIP (CLO, GC, Head Legal, VP Legal, Compliance Head)
What they own: The entire MACT portfolio across hundreds of tribunals. Answerable for quantum exposure, compliance, advocate performance, and IRDAI reporting. Problems reach them as escalations — by then it's too late.
What matters to them: Legal intelligence that actually builds defense. Can they see every case, every tribunal, every advocate's performance in one place? Can they answer "what is our total quantum exposure right now" without calling 15 people? Do they know which cases are at risk of adverse awards before they land? Most critically — do they have a system that understands real-world legal nuances, frameworks, and precedent to comprehensively build a defense strategy for any case in their portfolio, and draft any legal document — written arguments, cross-examination prep, settlement memos, interlocutory applications — within minutes, not weeks?
Frame: Nyayanidhi is the only system built on real-world legal nuances and frameworks that comprehensively builds defense strategies and drafts any legal document for their cases within minutes. It gives them a live portfolio — every case's stage, quantum, advocate discipline, compliance status. They stop firefighting escalations and start governing the function with legal intelligence that covers the entire portfolio. Not a vendor relationship — an infrastructure partner through which they can run their litigation.
Tone: Strategic, governance. Speak about portfolio-wide legal intelligence and defense capability, not technology.

B) MOTOR TP / LITIGATION OPS (VP Motor TP, AVP, Hub Manager, TP Officer, Branch Legal Officer, Litigation Head)
What they own: Day-to-day MACT case execution — intake, advocate coordination, hearing tracking, deposit compliance. Currently running on Excel registers, email threads, and memory.
What matters to them: On claims intake, cases digested and defense strategies drafted in seconds instead of days. Advocate assignment through a click, not phone calls. Knowing what happened at every hearing without chasing advocates. Deadlines that the system enforces, not ones they have to remember. One source of truth per case instead of scattered email chains.
Frame: You can run your MACT litigation using Nyayanidhi's infrastructure. Every case has a live spine from petition to closure. They manage by exception, not by chasing.
Tone: Operational, direct. Cases, hearings, advocates, deadlines. Speak their daily language.

C) CLAIMS LEADERSHIP (Head Claims, VP Claims, CCO, Claims Strategy, Head Motor Claims)
What they own: Claims closure and reserves. Once a case enters litigation, it disappears into a black box. No SLAs, no visibility, no structured handoff from claims to legal. Litigation becomes the bottleneck that keeps reserves inflated and closure rates low.
What matters to them: Visibility into every litigated case feeding back into their claims system. Structured handoff from claims to litigation with SLAs. Knowing which cases are stuck, which are moving, which need intervention — without asking legal.
Frame: Nyayanidhi is the claims-to-litigation bridge. Cases don't disappear anymore. Real-time status, defensible strategies built in seconds, faster resolution feeding directly into faster closure and lower reserves.
Tone: Closure rates, reserve pressure, claims outcomes. Not court procedure.

D) CFO / FINANCE / C-SUITE (CFO, MD, CEO)
What they own: The P&L. Motor TP combined ratio often exceeds 100%. Litigation inefficiency inflates costs across every line — unnecessary adjournments, missed hearings, manual coordination overhead, interest penalties from missed deposit windows, reserve shocks from unprovided awards.
What matters to them: How does this move the combined ratio? Where does cost leave the system? Deadline enforcement eliminates interest penalties. Coordination overhead drops because the insurer runs litigation through Nyayanidhi's infrastructure. Structured case data means reserves are estimated on facts, not guesswork. Faster resolution compresses the tail.
Frame: Every Nyayanidhi capability maps to a P&L line. This is not a technology investment — it is an operational cost reduction that shows up in the combined ratio.
Tone: Financial materiality only. Combined ratio, reserves, cost structure. No operational detail.

E) RISK (CRO, Head Risk, VP Risk, Chief Risk Officer)
What they own: Reserve adequacy, solvency compliance, IRDAI reporting. Motor TP is the hardest class to reserve — 5-10 year tails, unpredictable awards, tens of thousands of cases with thin development data. Under-reserving hits solvency; over-reserving locks capital. IRDAI has flagged motor TP reserving as systemic risk.
What matters to them: Case-level data instead of statistical guesswork. Every case has a live spine — stage, quantum, liability posture, expected timeline. Quantum projection using Supreme Court multiplier guidelines (Sarla Verma, Pranay Sethi) applied to actual case facts. Reserve estimates built on matter-level granularity, not aggregate triangles.
Frame: Nyayanidhi replaces thin development data with structured, case-level litigation intelligence. Each case feeds the reserve model directly. The tail becomes visible.
Tone: Analytical. Reserve adequacy, solvency, loss development. Not court operations.

F) UNDERWRITING (Chief Underwriter, Head Underwriting, VP Motor Underwriting)
What they own: Portfolio strategy, pricing, risk selection. Motor TP is IRDAI-priced. No feedback loop from litigation outcomes — they don't know which cohorts generate the worst awards, which geographies drive adverse development. Can't inform IRDAI pricing consultations without outcome data.
What matters to them: Litigation outcome data — award patterns by geography, court, claim type — feeding back into risk selection and portfolio strategy. Closing the loop between what they price and what they actually pay.
Frame: Nyayanidhi provides the litigation outcome data that underwriting has never had. Award patterns, geographic trends, cohort performance — the feedback loop that makes motor TP portfolio decisions evidence-based.
Tone: Portfolio, pricing, loss ratio. Not court or advocate detail.

G) ACTUARIAL / PROVISIONING (Appointed Actuary, Head Provisioning, VP Reserving, Head IBNR)
What they own: IBNR estimation, reserve certification, development triangles. Motor TP is the hardest class — long tails, unpredictable awards, evolving Supreme Court multiplier guidelines. Development triangles built on aggregate data. Reserve shocks when large awards land without warning.
What matters to them: Case-level quantum projection — multiplier guidelines applied to actual case facts, litigation trajectory tracked per matter. Structured data feeding IBNR models directly instead of aggregate guesswork. Seeing awards coming before they land.
Frame: Nyayanidhi provides matter-level inputs for reserve models. Each case carries its projected quantum based on actual facts and applicable multipliers. Development triangles built on structured data, not statistical proxies.
Tone: Technical, actuarial. IBNR, development factors, reserve adequacy.

H) ILM / INVESTIGATION (Head ILM, VP Investigation, SIU Head, Head ICLM, Loss Mitigation Head)
What they own: Fraud detection, investigation, defense strategy. Currently, investigation teams find out about cases late — by the time a claim enters litigation, months have passed. No early warning. Document inconsistencies across police reports, claim forms, medical records are spotted manually, if at all.
What matters to them: Pre-claim intelligence — knowing about cases up to 3 months before the insurer is even served, so investigation starts while the claim is still being drafted. Granular document research that scours every filing for inconsistencies across the record of events, medical evidence, and attached documents — flagging potential fraud immediately. Earlier investigation means a stronger defense file. A defensible strategy built in seconds, not weeks.
Frame: Nyayanidhi gives the investigation team a head start. Pre-claim intelligence for early warning. Document-level research that flags inconsistencies automatically. Every case with fraud indicators is surfaced to the ILM team immediately — not months later when the opportunity to build a defense has passed.
Tone: Early warning, speed, defense strength. NOT tech jargon, NOT "AI/ML," NOT "scraper" or "algorithm."

I) STRATEGY & INNOVATION (Head Strategy, VP Innovation, CSO, Head Claims Transformation)
What they own: Transformation roadmap. They've digitized FNOL, survey, fraud detection — but litigation (the biggest motor TP cost center, 15-20 lakh pending cases) remains completely untouched. Every vendor builds trackers. Nobody provides the infrastructure to actually run it.
What matters to them: The last undigitized cost center now has an operating system. Not software they need to operate — a managed system that absorbs volume, enforces discipline, and delivers outcomes. This is the missing piece in claims transformation.
Frame: Nyayanidhi is the litigation layer that completes the transformation stack. Everything upstream has been digitized. This is the piece that hasn't — and it's the largest cost driver.
Tone: Strategic, transformation. "Operating system" and "infrastructure" are fine. NOT "AI platform" or "tech solution."

J) LIFECYCLE / REGIONAL (Head Claims Lifecycle, Regional/Zonal Manager, Head Motor Claims Operations)
What they own: End-to-end claims flow across states/zones. Litigation is the black box in their lifecycle. Regional managers have no real-time view across 3-5 states — problems surface as escalations. No hub comparison, no advocate performance data, no deadline early warnings. IRDAI requires centralized databases, advocate performance reviews, expeditious award satisfaction.
What matters to them: Seeing every case across every hub in their region. Comparing advocate performance (attendance, outcomes, adjournments). Getting alerts on deadline risks before they become penalties. Drill-down from regional summary to individual case.
Frame: Nyayanidhi completes the lifecycle. Litigation stops being a black box. Regional roll-up with drill-down, advocate scorecards, exception-based alerts. They manage by data, not by escalation.
Tone: Operational, process. Visibility, SLAs, hub performance.

K) GENERAL C-SUITE / TOP MANAGEMENT (CTO, CHRO, COO, Chief - UW/Claims/Reinsurance, or any C-suite NOT directly in motor TP/legal/claims)
What they own: They run the company. Motor TP litigation — 15-20 lakh pending MACT cases — is one of the largest cost centers in any general insurer. Even if their personal function is technology, HR, or operations, motor TP litigation cost and efficiency directly affects the P&L they are accountable for.
What matters to them: A comprehensive view of what Nyayanidhi does across the entire litigation function. They need to understand the full scope — not just one angle.
Frame: Present Nyayanidhi as the litigation operating system that handles the full MACT lifecycle end-to-end:
  • Claims intake — case digested and defense strategy drafted in seconds
  • Advocate network — vetted advocates assigned through the system, performance tracked
  • Full lifecycle management — petition → hearings → orders → award → deposit → execution → closure, with complete visibility across every tribunal
  • Granular case research — inconsistencies flagged across documents, medical records, and evidence; defensible strategies built in seconds
  • Fraud detection — document-level analysis surfaces potential fraud to investigation teams immediately
  • Legal document generation — written arguments, cross-examination prep, settlement memos drafted with full case context
  • Deadline enforcement — system-enforced compliance across the entire case lifecycle
  • Pre-claim intelligence — up to 3 months early warning before the insurer is even served
This is not software the insurer needs to operate. Insurers can run their entire MACT litigation through Nyayanidhi's infrastructure — absorbing volume, enforcing discipline, and delivering outcomes.
Tone: Executive, comprehensive. Paint the full picture. Show the scale of the problem (15-20 lakh cases, 700+ tribunals) and how Nyayanidhi structurally solves it. Keep it high-level but concrete — outcomes, not features.

STEP 3 — PERSONALISE WITH RESEARCH
Find 2-3 specific facts relevant to THIS person's role from research:
- LinkedIn posts/talks → reference the theme (but do NOT name-drop LinkedIn or quote them)
- Company-specific pressure (IRDAI observations, combined ratio issues, reserving flags) → connect to their role
- Career trajectory → understand priorities
Weave insights naturally into the email. Never say "I saw" or "I read."

EARLY ADOPTER SIGNAL (high priority): If research shows this person has championed process innovation, operational transformation, or new approaches — especially in motor/claims/litigation — lean into this. They don't need to be convinced that change is needed. They need to see that THIS specific solution exists. Position Nyayanidhi as the structural answer to the gap they already know about. Tone: warmer, more direct.

STEP 4 — WRITE THE EMAIL (200-300 words)

SUBJECT: Specific to company + role. An observation, not a pitch. No "Introduction" or "Improving your..." formulas.

SALUTATION: "Hi [First Name]," on its own line before the body.

OPENING: Most important line. Reference a specific research insight — a structural gap relevant to their role. Must NOT introduce yourself, compliment them, state generic problems, or begin with "I"/"We".

BODY (3-5 sentences): Connect research insight to their specific responsibilities. Name the problem they live with. Show how Nyayanidhi fits into their workflow — describe operational outcomes, not features. What changes in their day-to-day? What becomes visible that was invisible? What gets done in seconds that took weeks?

CTA: Use this EXACT CTA (adjust slightly for natural flow): "We would love to set up a 15-minute call at your convenience to show you how we can operationalise your claims litigation and help you pay lesser."${hasDeck ? " Reference attached deck in a short clause before the CTA." : ""}

Sign-off:
Ujwal Uthappa
Founder's Office
Nyayanidhi
+91 7026312130

GUARDRAILS:
- NEVER mention any other company, partnership, vendor, or competitor in the email. Not even ones found in research. Nyayanidhi stands in its own category.
- Do NOT use tech jargon: no "scraper," "algorithm," "AI/ML," "platform," "dashboard," "tech stack," "API," "automation tool." Use operational language — describe what happens, not how it's built.
- Every claim must trace to research/dossier/notes. No invented facts.
- No specific numbers (revenue, reserves, GWP, ratios) in email body.
- No fabricated quotes. No claims of working with named clients unless in notes.
- Do NOT say "I saw on LinkedIn" — weave insights naturally.
- If research lacks specificity, write strong conceptual lines instead of fabricating.
- Speak about what matters to THEM — their responsibilities, their pain, their workflow. Not about Nyayanidhi's features or technology.

OUTPUT: Return ONLY valid JSON. No markdown, no explanation.
{"subject":"...","body":"..."}
Use \\n for line breaks. No HTML.`;
}
