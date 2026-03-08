import express from "express";
import { exec } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import cors from "cors";
import { readFileSync } from "fs";

// Load .env manually (avoid extra dependency)
try {
  const env = readFileSync(new URL(".env", import.meta.url), "utf8");
  env.split("\n").forEach(line => {
    const [k, ...v] = line.split("=");
    if (k?.trim()) process.env[k.trim()] = v.join("=").trim();
  });
} catch {}

const app = express();
app.use(cors());
app.use(express.json({ limit: "35mb" }));

// ── Zoho OAuth token management ─────────────────────────────────────────────
let accessToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;
  const res = await fetch("https://accounts.zoho.in/oauth/v2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.ZOHO_CLIENT_ID,
      client_secret: process.env.ZOHO_CLIENT_SECRET,
      refresh_token: process.env.ZOHO_REFRESH_TOKEN,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Token refresh failed: " + JSON.stringify(data));
  accessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // refresh 60s early
  console.log("Zoho access token refreshed");
  return accessToken;
}

// ── Zoho CRM: Load contacts (with Account category) ────────────────────────
app.get("/api/contacts", async (req, res) => {
  try {
    const token = await getAccessToken();
    const domain = process.env.ZOHO_API_DOMAIN || "https://www.zohoapis.in";

    // Fetch contacts
    const crmRes = await fetch(`${domain}/crm/v2/Contacts?per_page=200`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    if (!crmRes.ok) {
      const errText = await crmRes.text();
      console.error("CRM fetch error:", crmRes.status, errText);
      return res.status(crmRes.status).json({ error: "CRM fetch failed" });
    }
    const contactData = await crmRes.json();
    const contacts = contactData.data || [];

    // Fetch accounts to get category field
    const acctRes = await fetch(`${domain}/crm/v2/Accounts?per_page=200&fields=id,Account_Name,Category`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    let acctMap = {};
    if (acctRes.ok) {
      const acctData = await acctRes.json();
      (acctData.data || []).forEach(a => { acctMap[a.id] = a.Category || ""; });
    }

    // Merge category into contacts
    const enriched = contacts.map(c => {
      const acctId = typeof c.Account_Name === "object" ? c.Account_Name?.id : null;
      return { ...c, _category: acctId ? (acctMap[acctId] || "") : "" };
    });

    res.json({ contacts: enriched });
  } catch (err) {
    console.error("Contacts error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Zoho CRM: Update contact ────────────────────────────────────────────────
app.post("/api/crm-update", async (req, res) => {
  const { zohoId, status, lastOutreachDate, followUpDue } = req.body;
  try {
    const token = await getAccessToken();
    const domain = process.env.ZOHO_API_DOMAIN || "https://www.zohoapis.in";
    const crmRes = await fetch(`${domain}/crm/v2/Contacts/${zohoId}`, {
      method: "PUT",
      headers: { Authorization: `Zoho-oauthtoken ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ data: [{ Outreach_Status: status, Last_Outreach_Date: lastOutreachDate ? new Date().toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" }).replace(" ", "T") + "+05:30" : null, Follow_Up_Due: followUpDue }] }),
    });
    const data = await crmRes.json();
    res.json(data);
  } catch (err) {
    console.error("CRM update error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Zoho Flow proxy (for send email via Campaigns) ──────────────────────────
app.post("/api/zoho", async (req, res) => {
  const { url, payload } = req.body;
  if (!url) return res.status(400).json({ error: "url required" });
  try {
    const zohoRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    });
    if (!zohoRes.ok) return res.status(zohoRes.status).json({ error: "Zoho request failed" });
    const data = await zohoRes.json();
    res.json(data);
  } catch (err) {
    console.error("Zoho proxy error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Zoho CRM: Send email via contact record ─────────────────────────────────
app.post("/api/send-email", async (req, res) => {
  const { toEmail, toName, subject, body, fromName, zohoId, attachment } = req.body;
  if (!toEmail || !subject || !body) return res.status(400).json({ error: "toEmail, subject, body required" });
  try {
    const token = await getAccessToken();
    const domain = process.env.ZOHO_API_DOMAIN || "https://www.zohoapis.in";
    const senderEmail = process.env.ZOHO_SENDER_EMAIL;
    if (!senderEmail) return res.status(500).json({ error: "ZOHO_SENDER_EMAIL not configured in .env" });
    if (!zohoId) return res.status(400).json({ error: "zohoId required to send via CRM" });

    const htmlBody = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#333;">${body.replace(/\n/g, "<br>")}</div>`;

    // If there's an attachment, upload it to Zoho CRM Files first
    let attachmentIds = [];
    if (attachment?.base64) {
      console.log("Uploading attachment:", attachment.name, "size:", attachment.base64.length);
      const fileBuffer = Buffer.from(attachment.base64, "base64");
      const blob = new Blob([fileBuffer], { type: attachment.type || "application/octet-stream" });
      const form = new FormData();
      form.append("file", blob, attachment.name);

      const uploadRes = await fetch(`${domain}/crm/v2/files`, {
        method: "POST",
        headers: { Authorization: `Zoho-oauthtoken ${token}` },
        body: form,
      });
      const uploadText = await uploadRes.text();
      console.log("File upload response:", uploadRes.status, uploadText.slice(0, 300));
      let uploadData;
      try { uploadData = JSON.parse(uploadText); } catch { uploadData = {}; }
      if (uploadData.data?.[0]?.details?.id) {
        attachmentIds.push(uploadData.data[0].details.id);
        console.log("File uploaded, id:", attachmentIds[0]);
      }
    }

    // Use Zoho CRM Send Mail API (sends email linked to the contact record)
    const mailData = {
      from: { user_name: fromName || "Nyayanidhi", email: senderEmail },
      to: [{ user_name: toName || toEmail, email: toEmail }],
      subject,
      content: htmlBody,
      mail_format: "html",
    };
    if (attachmentIds.length > 0) {
      mailData.attachments = attachmentIds.map(id => ({ id }));
    }

    const endpoint = `${domain}/crm/v2/Contacts/${zohoId}/actions/send_mail`;
    console.log("Sending email via CRM:", endpoint, attachmentIds.length ? `with ${attachmentIds.length} attachment(s)` : "no attachments");
    const crmRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: [mailData] }),
    });
    const text = await crmRes.text();
    console.log("CRM send raw response:", crmRes.status, text.slice(0, 500));
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    if (!crmRes.ok || data.status === "error") {
      console.error("CRM send error:", JSON.stringify(data));
      return res.status(crmRes.status || 400).json({ error: data.message || data.raw || "Email send failed", detail: data });
    }
    res.json({ success: true, data });
  } catch (err) {
    console.error("Send email error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Claude CLI: Research a contact (LinkedIn + web) ─────────────────────────
app.post("/api/research", async (req, res) => {
  const { name, title, company, linkedin, notes } = req.body;
  if (!name || !company) return res.status(400).json({ error: "name and company required" });

  const researchPrompt = `You are a business research assistant. Research the following person. Return a structured brief.

PERSON: ${name}
TITLE: ${title || "Unknown"}
COMPANY: ${company}
${linkedin ? `LINKEDIN URL: ${linkedin}` : ""}
${notes ? `KNOWN NOTES: ${notes}` : ""}

SEARCH STRATEGY (follow this order):
1. ${linkedin ? `FIRST: Fetch their LinkedIn profile directly: ${linkedin} — extract headline, summary, job history, education, skills, and any recent posts/activity visible on the page.` : `Search Google for: site:linkedin.com/in "${name}" "${company}" — find their LinkedIn profile and extract headline, summary, job history, education, skills.`}
2. CRITICAL: If their title contains an acronym (e.g. ICLM, CLM, SIU, FNOL, etc.), search Google for: "${company}" "[acronym]" meaning — understand what this department actually does at THIS company. Do NOT guess what acronyms mean.
3. Search Google for: "${name}" "${company}" — find conference talks, interviews, articles, quotes, press mentions.
4. Search Google for: "${name}" "${company}" (their domain keywords based on what you learned) — find domain-specific views.
5. If LinkedIn profile was found, also try fetching their LinkedIn activity/posts page (add /recent-activity/ to profile URL).

WHAT TO EXTRACT:
- Full career history (all roles, companies, durations) from LinkedIn
- Education and certifications
- LinkedIn headline and summary text (EXACT text, do not paraphrase)
- LinkedIn skill tags and endorsement areas
- Recent LinkedIn posts, articles, or comments (topics, themes, opinions)
- Conference appearances, panel discussions, published articles
- Quotes in media or industry publications
- Professional interests and areas they engage with publicly

CRITICAL — UNDERSTAND THE ACTUAL ROLE:
- Do NOT assume what a title means. Research it. "Head ICLM" could mean fraud prevention, not litigation. "Head SIU" means investigations, not legal. Decode every acronym.
- Read their LinkedIn headline keywords carefully — these reveal what they ACTUALLY do (e.g. "Health Claims | Fraud Risk Mitigation" = health insurance fraud, NOT Motor TP litigation).
- If the person works in health insurance, fraud, underwriting, IT, HR, marketing, or any function unrelated to litigation/recovery/legal/claims — flag this clearly.

Do NOT spend time researching the company in depth — a separate company dossier handles that. Focus almost entirely on the PERSON.

OUTPUT FORMAT (plain text, not JSON):

=== PERSON PROFILE ===
- LinkedIn headline: [exact headline if found]
- Background: [full career history with dates — each role on its own line]
- Education: [degrees, institutions]
- Current focus: [what they're working on based on LinkedIn/web]
- Recent LinkedIn activity: [posts, articles, comments — with topics and dates if visible]
- Conference/media appearances: [talks, interviews, quotes — with source]
- Professional interests: [topics they engage with]
- Public views/opinions: [anything they've said publicly about their domain]

=== ROLE MAPPING ===
- Decoded title: [what their title/acronym actually means at this company]
- Actual function: [their real domain — e.g. fraud prevention, health claims, Motor TP litigation, legal, recovery, etc.]
- What this role owns: [their domain of responsibility]
- Key pain points for this role: [specific operational/strategic challenges]
- What would get their attention: [the angle that matters to someone in this seat]
- Decision-making power: [what they can greenlight vs. what needs escalation]

=== RELEVANCE CHECK ===
- Is this person relevant for litigation/legal/recovery/claims services? [YES or NO]
- If NO, explain why: [e.g. "This person works in health insurance fraud prevention, not litigation or legal recovery"]
- If YES, which area: [Motor TP litigation / SARFAESI / debt recovery / NPA resolution / legal ops / claims / etc.]

Be factual. If you cannot find specific information, say so — do not fabricate. Cite sources where possible.`;

  const tmpFile = join(tmpdir(), `claude-research-${Date.now()}.txt`);
  writeFileSync(tmpFile, researchPrompt, "utf8");
  console.log("Starting research for:", name, "at", company);

  const cmd = `cat "${tmpFile.replace(/\\/g, "/")}" | claude -p --max-turns 10 --tools "default" --dangerously-skip-permissions`;
  const env = { ...process.env };
  delete env.CLAUDECODE;
  exec(cmd, { maxBuffer: 2 * 1024 * 1024, timeout: 600000, shell: true, env }, (err, stdout, stderr) => {
    try { unlinkSync(tmpFile); } catch {}
    console.log("research done, stdout:", stdout?.length, "stderr:", stderr?.length);
    if (err && !stdout) {
      console.error("research error:", err.message, stderr?.slice(0, 300));
      return res.status(500).json({ error: "Research failed" });
    }
    res.json({ research: (stdout || stderr || "").trim() });
  });
});

// ── Claude CLI proxy (for email generation) ─────────────────────────────────
app.post("/api/generate", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "prompt required" });

  // Write prompt to temp file, pipe to claude to avoid shell escaping issues
  const tmpFile = join(tmpdir(), `claude-prompt-${Date.now()}.txt`);
  writeFileSync(tmpFile, prompt, "utf8");
  console.log("Starting Claude generation, prompt length:", prompt.length);

  const cmd = `cat "${tmpFile.replace(/\\/g, "/")}" | claude -p --max-turns 1`;
  const env = { ...process.env };
  delete env.CLAUDECODE;
  exec(cmd, { maxBuffer: 1024 * 1024, timeout: 300000, shell: true, env }, (err, stdout, stderr) => {
    try { unlinkSync(tmpFile); } catch {}
    console.log("claude done, stdout:", stdout?.length, "stderr:", stderr?.length);
    if (stdout) console.log("output preview:", stdout.slice(0, 300));
    if (err && !stdout) {
      console.error("claude error:", err.message, stderr?.slice(0, 300));
      return res.status(500).json({ error: "Generation failed" });
    }
    res.json({ text: (stdout || stderr || "").trim() });
  });
});

// ── Combined: Research + Generate in ONE Claude call (4 turns) ──────────────
app.post("/api/research-and-generate", async (req, res) => {
  const { name, title, company, linkedin, notes, emailPrompt } = req.body;
  if (!name || !company || !emailPrompt) return res.status(400).json({ error: "name, company, emailPrompt required" });

  const combinedPrompt = `You are doing TWO tasks in sequence. You MUST complete both.

═══ TASK 1: RESEARCH (use web search tools) ═══

Research this person. Be focused and efficient — you have limited turns.

PERSON: ${name}
TITLE: ${title || "Unknown"}
COMPANY: ${company}
${linkedin ? `LINKEDIN: ${linkedin}` : ""}
${notes ? `NOTES: ${notes}` : ""}

SEARCH STRATEGY (do these in PARALLEL where possible, max 2-3 searches total):
1. ${linkedin ? `Fetch their LinkedIn profile: ${linkedin}` : `Search: site:linkedin.com/in "${name}" "${company}"`} — get headline, summary, career history, recent posts.
2. Search: "${name}" "${company}" — find talks, articles, quotes, press mentions.${title && /[A-Z]{2,}/.test(title) ? `\n3. Search: "${company}" "${title.match(/[A-Z]{2,}/)?.[0]}" meaning — decode the acronym.` : ""}

Extract: career history, LinkedIn headline, recent activity/posts, public views, actual role function.
If their title has acronyms, decode them from research — do NOT guess.

CRITICAL — DETERMINE ACTUAL DOMAIN:
- Do NOT assume what a title means. "Head ICLM" could mean fraud prevention, not litigation. "Head SIU" means investigations, not legal. Decode every acronym from research.
- Read their LinkedIn headline keywords carefully — these reveal what they ACTUALLY do (e.g. "Health Claims | Fraud Risk Mitigation" = health insurance fraud, NOT Motor TP litigation).
- Determine if this person works in: health insurance, life insurance, motor OD only, IT, HR, marketing, distribution/agency, reinsurance, investment/treasury, customer service, or product development (non-motor). If so, flag them clearly as NOT RELEVANT for motor TP litigation.
- State their actual domain explicitly in your research output (e.g. "DOMAIN: Health insurance claims" or "DOMAIN: Motor TP litigation ops").

IMPORTANT: Keep research focused. Do NOT spend more than 3 tool-use turns on research.

═══ TASK 2: GENERATE EMAIL ═══

Using ALL the research you just gathered (it's in your conversation context from Task 1), now follow these email generation instructions EXACTLY:

${emailPrompt}

CRITICAL: Your FINAL output must be ONLY the JSON from Task 2. No research summary, no explanation — just the JSON email output.`;

  const tmpFile = join(tmpdir(), `claude-combined-${Date.now()}.txt`);
  writeFileSync(tmpFile, combinedPrompt, "utf8");
  console.log("Starting combined research+generate for:", name, "at", company);

  const cmd = `cat "${tmpFile.replace(/\\/g, "/")}" | claude -p --max-turns 4 --tools "default" --dangerously-skip-permissions`;
  const env = { ...process.env };
  delete env.CLAUDECODE;
  exec(cmd, { maxBuffer: 2 * 1024 * 1024, timeout: 600000, shell: true, env }, (err, stdout, stderr) => {
    try { unlinkSync(tmpFile); } catch {}
    console.log("combined done, stdout:", stdout?.length, "stderr:", stderr?.length);
    if (stdout) console.log("output preview:", stdout.slice(0, 500));
    if (err && !stdout) {
      console.error("combined error:", err.message, stderr?.slice(0, 300));
      return res.status(500).json({ error: "Research+Generate failed" });
    }
    res.json({ text: (stdout || stderr || "").trim() });
  });
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Proxy server running on http://localhost:${PORT}`));
