import { useState, useEffect, useRef } from "react";
import insurancePrompt from "./prompts/insurance.js";
import banksPrompt from "./prompts/banks.js";
import nbfcPrompt from "./prompts/nbfc.js";
import arcPrompt from "./prompts/arc.js";

const CATEGORIES = [
  { key: "Insurance", label: "Insurance", color: "#C4A35A" },
  { key: "Bank", label: "Banks", color: "#5B9BD5" },
  { key: "NBFC", label: "NBFCs", color: "#4A9E6B" },
  { key: "ARC", label: "ARCs", color: "#C45A8A" },
];
const PROMPT_MAP = { Insurance: insurancePrompt, Bank: banksPrompt, NBFC: nbfcPrompt, ARC: arcPrompt };

// ─── ZOHO FLOW WEBHOOK URLs ───────────────────────────────────────────────────
// Paste your Zoho Flow webhook URLs here once set up
const FLOW_URL_LOAD       = "https://flow.zoho.in/60066531714/flow/webhook/incoming?zapikey=1001.55f06bd9429a48e5a1f13d54af30937e.b006217b0aa930f7da9fec335a3bbff6&isdebug=false"; // Flow 1 — Load contacts from CRM
const FLOW_URL_CRM_UPDATE = ""; // Flow 2 — Push status to CRM
const FLOW_URL_SEND       = ""; // Flow 3 — Send email via Campaigns

// ─── SAMPLE DATA (used until Zoho Flow is connected) ─────────────────────────
const SAMPLE_CONTACTS = [
  { id:"s1", zohoId:"Z001", name:"Rajeev Chandrasekhar", title:"Chief Legal Officer",        company:"Bajaj Allianz General Insurance", email:"rajeev.c@bajajallianz.co.in",   notes:"Handles motor & MACT claims litigation. Company reported ₹12,400 Cr GWP last year.", linkedin:"", status:"pending", crmSyncStatus:null, generatedEmail:null, syncLog:[] },
  { id:"s2", zohoId:"Z002", name:"Priya Sharma",          title:"VP – Claims Strategy",       company:"Bajaj Allianz General Insurance", email:"priya.s@bajajallianz.co.in",    notes:"Leads claims transformation. Vocal about reducing time-to-settlement.", linkedin:"", status:"pending", crmSyncStatus:null, generatedEmail:null, syncLog:[] },
  { id:"s3", zohoId:"Z003", name:"Sunita Menon",          title:"Head of Legal & Compliance", company:"HDFC ERGO",                       email:"sunita.menon@hdfcergo.com",     notes:"Spoke at FICCI Insurance Summit on rising litigation costs. Focused on process efficiency.", linkedin:"", status:"pending", crmSyncStatus:null, generatedEmail:null, syncLog:[] },
  { id:"s4", zohoId:"Z004", name:"Kartik Nair",           title:"Senior Legal Manager",       company:"HDFC ERGO",                       email:"kartik.nair@hdfcergo.com",      notes:"Handles MACT and NI Act matters. Manages panel advocates across 8 states.", linkedin:"", status:"pending", crmSyncStatus:null, generatedEmail:null, syncLog:[] },
  { id:"s5", zohoId:"Z005", name:"Arvind Krishnaswamy",   title:"VP – Claims & Litigation",   company:"New India Assurance",             email:"a.krishnaswamy@newindia.co.in", notes:"PSU insurer with large MACT docket. Court backlog across 15+ states.", linkedin:"", status:"pending", crmSyncStatus:null, generatedEmail:null, syncLog:[] },
];

// ─── API CALLS ────────────────────────────────────────────────────────────────
async function apiLoadContacts() {
  const res = await fetch("http://localhost:3001/api/contacts");
  if (!res.ok) throw new Error("CRM fetch failed");
  const data = await res.json();
  return (data.contacts || []).map(c => ({
    id: c.id, zohoId: c.id,
    name: c.Full_Name || [c.First_Name, c.Last_Name].filter(Boolean).join(" ") || "",
    title: c.Title || c.Department || "",
    company: (typeof c.Account_Name === "object" ? c.Account_Name?.name : c.Account_Name) || "Unassigned",
    accountId: (typeof c.Account_Name === "object" ? c.Account_Name?.id : null) || null,
    email: c.Email || "",
    notes: [c.Outreach_notes, c.Outreach_Notes, c.Description].filter(Boolean).join(" — "),
    linkedin: c.Linkedin || c.LinkedIn || "",
    category: c._category || "",
    // Restore status from CRM fields
    status: c.Outreach_Status ? c.Outreach_Status.toLowerCase() : "pending",
    crmSyncStatus: c.Outreach_Status ? "synced" : null,
    generatedEmail: c.Outreach_Subject ? { subject: c.Outreach_Subject, body: c.Outreach_Body || "" } : null,
    skipReason: c.Outreach_Skip_Status || null,
    _dossier: c._dossier || null,
    _deck: c._deck || null,
    syncLog: [],
  }));
}

async function apiCRMUpdate(zohoId, status, lastOutreachDate, followUpDue, { outreachSubject, outreachBody, skipReason } = {}) {
  const res = await fetch("http://localhost:3001/api/crm-update", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ zohoId, status, lastOutreachDate, followUpDue, outreachSubject, outreachBody, skipReason }) });
  if (!res.ok) throw new Error("CRM update failed");
  return res.json();
}

async function apiSendEmail(contact, subject, body, deckFile) {
  const payload = { toEmail: contact.email, toName: contact.name, subject, body, zohoId: contact.zohoId };
  if (deckFile) {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(deckFile.file);
    });
    payload.attachment = { name: deckFile.name, type: deckFile.type, base64 };
  }
  const res = await fetch("http://localhost:3001/api/send-email", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Send failed");
  }
  return res.json();
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const IS_DEMO = !FLOW_URL_LOAD;
function fmt(b) { if(b<1024)return`${b} B`; if(b<1048576)return`${(b/1024).toFixed(1)} KB`; return`${(b/1048576).toFixed(1)} MB`; }
function today() { return new Date().toISOString().split("T")[0]; }
function followUpDate() { const d=new Date(); d.setDate(d.getDate()+5); return d.toISOString().split("T")[0]; }
function groupByCompany(contacts) {
  const map = {};
  contacts.forEach(c => { if(!map[c.company]) map[c.company]=[]; map[c.company].push(c); });
  return map;
}
// Prompt is now loaded from src/prompts/{category}.js

const STATUS_CONFIG = {
  pending:     { label:"Pending",          color:"#8B7355", bg:"#2A2218" },
  researching: { label:"Researching…",   color:"#9B7FD4", bg:"#1A1025" },
  generating:  { label:"Generating…",    color:"#C4A35A", bg:"#251E0F" },
  ready:      { label:"Ready to Review", color:"#4A9E6B", bg:"#0F2018" },
  approved:   { label:"Approved",        color:"#5B9BD5", bg:"#0F1A25" },
  scheduled:  { label:"Scheduled",       color:"#B07CD8", bg:"#1A1025" },
  sending:    { label:"Sending…",        color:"#C4A35A", bg:"#251E0F" },
  sent:       { label:"Sent",            color:"#555",    bg:"#1A1A1A" },
  skipped:    { label:"Not Relevant",   color:"#C45A5A", bg:"#2A1515" },
};
const SYNC_CONFIG = {
  syncing:{ color:"#C4A35A", label:"Syncing…" },
  synced: { color:"#4A9E6B", label:"CRM Updated" },
  failed: { color:"#C45A5A", label:"Sync Failed" },
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function App() {
  const [allContacts, setAllContacts]    = useState([]);
  const [activeCategory, setActiveCategory] = useState("Insurance");
  const [loading, setLoading]           = useState(true);
  const [loadError, setLoadError]       = useState(null);
  const [selectedId, setSelectedId]     = useState(null);
  const [expandedCos, setExpandedCos]   = useState({});
  const [companyDecks, setCompanyDecks] = useState({});
  const [companyDossiers, setCompanyDossiers] = useState({});
  const [editSubject, setEditSubject]   = useState("");
  const [editBody, setEditBody]         = useState("");
  const [isEditing, setIsEditing]       = useState(false);
  const [toast, setToast]               = useState(null);
  const [showSync, setShowSync]         = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [noteDraft, setNoteDraft]       = useState("");
  const [isDragOver, setIsDragOver]     = useState(null);
  const [schedulePopover, setSchedulePopover] = useState(null); // contactId or null
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const fileRefs = useRef({});
  const dossierRefs = useRef({});

  const contacts    = allContacts.filter(c => c.category === activeCategory);
  const current     = allContacts.find(c => c.id === selectedId) || null;
  const currentDeck = current ? companyDecks[current.company] || null : null;
  const currentDossier = current ? companyDossiers[current.company] || "" : "";
  const companies   = groupByCompany(contacts);
  const getPrompt   = PROMPT_MAP[activeCategory] || insurancePrompt;

  // ── Load contacts ──────────────────────────────────────────────────────────
  const loadContacts = async () => {
    setLoading(true); setLoadError(null);
    try {
      let loaded;
      try {
        loaded = await apiLoadContacts();
      } catch {
        console.warn("CRM API failed, falling back to sample contacts");
        loaded = SAMPLE_CONTACTS;
      }
      if (!loaded || loaded.length === 0) loaded = SAMPLE_CONTACTS;
      // Restore persisted statuses from localStorage
      try {
        const saved = JSON.parse(localStorage.getItem("outreach-contact-state") || "{}");
        loaded = loaded.map(c => saved[c.id] ? { ...c, ...saved[c.id] } : c);
      } catch {}
      setAllContacts(loaded);
      // Populate dossiers and decks from CRM data
      const dossiers = {};
      const decks = {};
      loaded.forEach(c => {
        if (c._dossier && c._dossier.length > 0 && c.company && !dossiers[c.company]) {
          const d = c._dossier[0];
          dossiers[c.company] = { name: d.File_Name__s || "dossier", size: d.Size__s || 0, type: "", content: "", fromCRM: true };
        }
        if (c._deck && c._deck.length > 0 && c.company && !decks[c.company]) {
          const d = c._deck[0];
          decks[c.company] = { name: d.File_Name__s || "deck", size: d.Size__s || 0, type: "", fromCRM: true };
        }
      });
      if (Object.keys(dossiers).length > 0) setCompanyDossiers(prev => ({ ...dossiers, ...prev }));
      if (Object.keys(decks).length > 0) setCompanyDecks(prev => ({ ...decks, ...prev }));
      // Select first contact in the active category
      const catContacts = loaded.filter(c => c.category === activeCategory);
      if (catContacts.length > 0) {
        setExpandedCos({ [catContacts[0].company]: true });
        setSelectedId(catContacts[0].id);
      } else if (loaded.length > 0) {
        // Fallback: switch to first available category
        const firstCat = CATEGORIES.find(cat => loaded.some(c => c.category === cat.key));
        if (firstCat) {
          setActiveCategory(firstCat.key);
          const first = loaded.find(c => c.category === firstCat.key);
          if (first) { setExpandedCos({ [first.company]: true }); setSelectedId(first.id); }
        }
      }
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadContacts(); }, []);

  useEffect(() => {
    if (current?.company) setExpandedCos(p => ({ ...p, [current.company]: true }));
  }, [current?.company]);

  useEffect(() => {
    if (current?.generatedEmail) {
      setEditSubject(current.generatedEmail.subject);
      setEditBody(current.generatedEmail.body);
      setIsEditing(false);
    }
  }, [current?.id, current?.generatedEmail]);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3200); };
  const updateContact = (id, patch) => setAllContacts(p => p.map(c => c.id===id?{...c,...patch}:c));

  // ── Persist contact statuses to localStorage ─────────────────────────────
  const STORAGE_KEY = "outreach-contact-state";
  const saveContactState = (contacts) => {
    const state = {};
    contacts.forEach(c => {
      if (c.status !== "pending") {
        state[c.id] = { status: c.status, generatedEmail: c.generatedEmail, skipReason: c.skipReason, scheduledAt: c.scheduledAt };
      }
    });
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  };
  useEffect(() => { if (allContacts.length > 0) saveContactState(allContacts); }, [allContacts]);
  const addSyncLog = (id, entry) => setAllContacts(p => p.map(c => c.id===id?{...c,syncLog:[entry,...(c.syncLog||[])]}:c));

  // ── Deck ──────────────────────────────────────────────────────────────────
  const handleDeckFile = (company, file) => {
    if (!file) return;
    if (!file.name.match(/\.(pdf|ppt|pptx)$/i)) { showToast("Only PDF, PPT, PPTX supported.", "error"); return; }
    if (file.size > 25*1024*1024) { showToast("Max 25 MB.", "error"); return; }
    const b64Reader = new FileReader();
    b64Reader.onload = async () => {
      const accountId = getAccountIdForCompany(company);
      if (accountId) {
        showToast(`Uploading deck to CRM for ${company.split(" ")[0]}...`);
        try {
          const r = await fetch("http://localhost:3001/api/crm-account-deck", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accountId, fileName: file.name, fileContent: b64Reader.result }),
          });
          const data = await r.json();
          console.log("CRM deck response:", data);
          if (data?.verified === false) {
            setCompanyDecks(p => ({...p, [company]:{ name:file.name, size:file.size, type:file.type, file }}));
            showToast("Deck attached locally but CRM field not updated — check console", "error");
            return;
          }
          if (data?.error) { showToast("Deck failed to upload to CRM", "error"); return; }
          setCompanyDecks(p => ({...p, [company]:{ name:file.name, size:file.size, type:file.type, file }}));
          showToast(`Deck uploaded to CRM for ${company.split(" ")[0]}`, "success");
        } catch (err) {
          console.error("CRM deck upload error:", err);
          showToast("Failed to upload deck to CRM", "error");
        }
      } else {
        setCompanyDecks(p => ({...p, [company]:{ name:file.name, size:file.size, type:file.type, file }}));
        showToast(`Deck attached locally for ${company.split(" ")[0]} (no CRM account linked)`, "error");
      }
    };
    b64Reader.readAsDataURL(file);
  };
  const removeDeck = async (company) => {
    setCompanyDecks(p => { const n = {...p}; delete n[company]; return n; });
    const accountId = getAccountIdForCompany(company);
    if (accountId) {
      try {
        await fetch("http://localhost:3001/api/crm-account-deck", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId, fileContent: null }),
        });
        showToast("Deck removed from CRM", "success");
      } catch (err) { showToast("Deck removed locally, CRM clear failed", "error"); }
    } else { showToast("Deck removed."); }
  };
  const deckColor  = (t) => t?.includes("pdf")?"#C45A5A":t?.includes("presentation")||t?.includes("powerpoint")?"#C4A35A":"#5B9BD5";

  // ── Dossier ────────────────────────────────────────────────────────────────
  const getAccountIdForCompany = (company) => {
    const c = allContacts.find(x => x.company === company && x.accountId);
    return c?.accountId || null;
  };

  const handleDossierFile = (company, file) => {
    if (!file) return;
    if (!file.name.match(/\.(txt|md|pdf|doc|docx)$/i)) { showToast("Only TXT, MD, PDF, DOC, DOCX supported.", "error"); return; }
    if (file.size > 10*1024*1024) { showToast("Max 10 MB.", "error"); return; }

    // Read as text for prompt usage
    const textReader = new FileReader();
    textReader.onload = () => {
      const textContent = textReader.result;
      // Read as base64 for CRM upload
      const b64Reader = new FileReader();
      b64Reader.onload = async () => {
        const accountId = getAccountIdForCompany(company);
        if (accountId) {
          showToast(`Uploading dossier to CRM for ${company.split(" ")[0]}...`);
          try {
            const r = await fetch("http://localhost:3001/api/crm-account-dossier", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ accountId, fileName: file.name, fileContent: b64Reader.result }),
            });
            const data = await r.json();
            console.log("CRM dossier response:", data);
            if (data?.verified === false) {
              console.error("CRM dossier: file uploaded but field not linked.", data);
              setCompanyDossiers(p => ({...p, [company]: { name: file.name, size: file.size, type: file.type, content: textContent }}));
              showToast("Dossier attached locally but CRM field not updated — check console", "error");
              return;
            }
            if (data?.error) {
              console.error("CRM dossier upload failed:", data);
              showToast("Dossier failed to upload to CRM", "error");
              return;
            }
            setCompanyDossiers(p => ({...p, [company]: { name: file.name, size: file.size, type: file.type, content: textContent }}));
            showToast(`Dossier uploaded to CRM for ${company.split(" ")[0]}`, "success");
          } catch (err) {
            console.error("CRM dossier upload error:", err);
            showToast("Failed to upload dossier to CRM", "error");
          }
        } else {
          // No CRM account linked, just store locally
          setCompanyDossiers(p => ({...p, [company]: { name: file.name, size: file.size, type: file.type, content: textContent }}));
          showToast(`Dossier attached locally for ${company.split(" ")[0]} (no CRM account linked)`, "error");
        }
      };
      b64Reader.readAsDataURL(file);
    };
    textReader.onerror = () => showToast("Failed to read file.", "error");
    textReader.readAsText(file);
  };

  const removeDossier = async (company) => {
    // Remove from UI immediately
    setCompanyDossiers(p => { const n = {...p}; delete n[company]; return n; });
    // Also clear from CRM
    const accountId = getAccountIdForCompany(company);
    if (accountId) {
      try {
        await fetch("http://localhost:3001/api/crm-account-dossier", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId, fileContent: null }),
        });
        showToast("Dossier removed from CRM", "success");
      } catch (err) {
        showToast("Dossier removed locally, CRM clear failed", "error");
      }
    } else {
      showToast("Dossier removed.");
    }
  };

  // ── CRM sync ──────────────────────────────────────────────────────────────
  const syncToCRM = async (contact, status, emailData = {}) => {
    updateContact(contact.id, { crmSyncStatus:"syncing" });
    const entry = { time:new Date().toLocaleTimeString(), status, field:status };
    try {
      await apiCRMUpdate(contact.zohoId, status, today(), followUpDate(), emailData);
      updateContact(contact.id, { crmSyncStatus:"synced" });
      addSyncLog(contact.id, { ...entry, result:"success" });
      showToast(IS_DEMO ? `[Demo] CRM would update → ${status}` : `CRM updated → ${status}`);
    } catch (err) {
      updateContact(contact.id, { crmSyncStatus:"failed" });
      addSyncLog(contact.id, { ...entry, result:"failed" });
      showToast(`CRM sync failed: ${err.message}`, "error");
    }
  };

  // ── Research + Generate ─────────────────────────────────────────────────
  const generateEmail = async (contact) => {
    updateContact(contact.id, { status:"researching" });
    try {
      // Build the email prompt (with dossier only — research happens inside the same Claude call)
      const dossier = companyDossiers[contact.company]?.content || "";
      const emailPrompt = getPrompt(contact, !!companyDecks[contact.company], dossier || "You will use the research you gathered above. Do not invent intelligence.");

      // Single combined call: research + generate in one Claude CLI invocation (max 4 turns)
      updateContact(contact.id, { status:"generating" });
      console.log("Sending combined research+generate for:", contact.name);
      const res = await fetch("http://localhost:3001/api/research-and-generate", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          name: contact.name,
          title: contact.title,
          company: contact.company,
          linkedin: contact.linkedin,
          notes: contact.notes,
          emailPrompt,
        }),
      });
      const data = await res.json();
      console.log("Combined response:", JSON.stringify(data).slice(0, 500));
      if (data.error) throw new Error(data.error);
      const fullText = (data.text || "").replace(/```json|```/g,"").trim();
      // Extract JSON: find last { ... } block containing "subject" or "skip" key
      let parsed = null;
      for (let i = fullText.lastIndexOf('}'); i >= 0; i = fullText.lastIndexOf('}', i - 1)) {
        // Walk backwards to find matching opening brace
        let depth = 0;
        for (let j = i; j >= 0; j--) {
          if (fullText[j] === '}') depth++;
          if (fullText[j] === '{') depth--;
          if (depth === 0) {
            const candidate = fullText.slice(j, i + 1);
            try {
              const obj = JSON.parse(candidate);
              if (obj && typeof obj === 'object' && ('subject' in obj || 'skip' in obj)) { parsed = obj; break; }
            } catch {}
            break;
          }
        }
        if (parsed) break;
      }
      if (!parsed) {
        console.log("Could not extract JSON from:", fullText.slice(0, 500));
        throw new Error("Could not parse email JSON from response");
      }
      if (parsed.skip) {
        const reason = parsed.reason || "Not relevant for our services";
        updateContact(contact.id, { status:"skipped", skipReason: reason });
        showToast(`Skipped ${contact.name}: ${reason}`, "error");
        syncToCRM(contact, "Skipped", { skipReason: reason });
        return;
      }
      updateContact(contact.id, { status:"ready", generatedEmail:parsed });
      if (selectedId===contact.id) { setEditSubject(parsed.subject); setEditBody(parsed.body); }
    } catch (err) {
      console.error("generateEmail error:", err, err?.message);
      updateContact(contact.id, { status:"pending" });
      showToast("Generation failed: " + (err?.message || "unknown"), "error");
    }
  };

  // ── Save notes to CRM ────────────────────────────────────────────────────
  const saveNotes = async () => {
    if (!current) return;
    const trimmed = noteDraft.trim();
    updateContact(current.id, { notes: trimmed });
    setEditingNotes(false);
    try {
      await fetch("http://localhost:3001/api/crm-notes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zohoId: current.zohoId, notes: trimmed }),
      });
      showToast(`Notes saved for ${current.name}`, "success");
    } catch (err) {
      showToast(`Failed to save notes: ${err.message}`, "error");
    }
  };

  // ── Approve ───────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    const emailData = { subject:editSubject, body:editBody };
    updateContact(current.id, { status:"approved", generatedEmail:emailData });
    setIsEditing(false);
    await syncToCRM(current, "Approved", { outreachSubject: editSubject, outreachBody: editBody });
  };

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!window.confirm(`Send email to ${current.email}?`)) return;
    updateContact(current.id, { status:"sending" });
    try {
      await apiSendEmail(current, editSubject, editBody, companyDecks[current.company] || null);
      updateContact(current.id, { status:"sent" });
      showToast(`Sent to ${current.email}`);
      await syncToCRM(current, "Sent", { outreachSubject: editSubject, outreachBody: editBody });
    } catch (err) {
      updateContact(current.id, { status:"approved" });
      showToast(`Send failed: ${err.message}`, "error");
    }
  };

  // ── Schedule Send ───────────────────────────────────────────────────────
  const getNextMonday9AM = () => {
    const now = new Date();
    const day = now.getDay(); // 0=Sun..6=Sat
    const daysUntilMon = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
    const mon = new Date(now);
    mon.setDate(now.getDate() + daysUntilMon);
    mon.setHours(9, 0, 0, 0);
    return { date: mon.toISOString().slice(0, 10), time: "09:00" };
  };

  const openSchedulePopover = () => {
    const def = getNextMonday9AM();
    setScheduleDate(def.date);
    setScheduleTime(def.time);
    setSchedulePopover(current.id);
  };

  const handleScheduleSend = async () => {
    if (!scheduleDate || !scheduleTime) return;
    const sendAt = new Date(`${scheduleDate}T${scheduleTime}:00`);
    if (sendAt <= new Date()) { showToast("Scheduled time must be in the future.", "error"); return; }
    const contact = current;
    updateContact(contact.id, { status: "scheduled", scheduledAt: sendAt.toISOString() });
    setSchedulePopover(null);
    showToast(`Scheduled for ${sendAt.toLocaleDateString("en-IN", { weekday:"short", day:"numeric", month:"short" })} at ${scheduleTime}`);
    await syncToCRM(contact, "Scheduled");

    // Set a timer to send at the scheduled time
    const delay = sendAt.getTime() - Date.now();
    setTimeout(async () => {
      updateContact(contact.id, { status: "sending" });
      try {
        await apiSendEmail(contact, editSubject, editBody, companyDecks[contact.company] || null);
        updateContact(contact.id, { status: "sent" });
        showToast(`Scheduled email sent to ${contact.email}`);
        await syncToCRM(contact, "Sent");
      } catch (err) {
        updateContact(contact.id, { status: "approved" });
        showToast(`Scheduled send failed: ${err.message}`, "error");
      }
    }, delay);
  };

  // ── Bulk Actions ────────────────────────────────────────────────────────
  const bulkSend = async () => {
    const approved = contacts.filter(c => c.status === "approved" && c.generatedEmail);
    if (!approved.length) return;
    if (!window.confirm(`Send ${approved.length} email${approved.length > 1 ? "s" : ""} now?`)) return;
    for (const c of approved) {
      updateContact(c.id, { status: "sending" });
      try {
        await apiSendEmail(c, c.generatedEmail.subject, c.generatedEmail.body, companyDecks[c.company] || null);
        updateContact(c.id, { status: "sent" });
        await syncToCRM(c, "Sent");
      } catch (err) {
        updateContact(c.id, { status: "approved" });
        showToast(`Failed: ${c.name} — ${err.message}`, "error");
      }
    }
    showToast(`Sent ${approved.filter(c => contacts.find(x=>x.id===c.id)?.status !== "approved").length} emails`);
  };

  const [bulkScheduleOpen, setBulkScheduleOpen] = useState(false);
  const [bulkSchedDate, setBulkSchedDate] = useState("");
  const [bulkSchedTime, setBulkSchedTime] = useState("");

  const openBulkSchedule = () => {
    const def = getNextMonday9AM();
    setBulkSchedDate(def.date);
    setBulkSchedTime(def.time);
    setBulkScheduleOpen(true);
  };

  const bulkSchedule = async () => {
    const approved = contacts.filter(c => c.status === "approved" && c.generatedEmail);
    if (!approved.length) return;
    const sendAt = new Date(`${bulkSchedDate}T${bulkSchedTime}:00`);
    if (sendAt <= new Date()) { showToast("Scheduled time must be in the future.", "error"); return; }
    setBulkScheduleOpen(false);

    for (const c of approved) {
      updateContact(c.id, { status: "scheduled", scheduledAt: sendAt.toISOString() });
      await syncToCRM(c, "Scheduled");

      const delay = sendAt.getTime() - Date.now();
      const subj = c.generatedEmail.subject;
      const bod = c.generatedEmail.body;
      const deck = companyDecks[c.company] || null;
      setTimeout(async () => {
        updateContact(c.id, { status: "sending" });
        try {
          await apiSendEmail(c, subj, bod, deck);
          updateContact(c.id, { status: "sent" });
          showToast(`Scheduled email sent to ${c.email}`);
          await syncToCRM(c, "Sent");
        } catch (err) {
          updateContact(c.id, { status: "approved" });
        }
      }, delay);
    }
    showToast(`Scheduled ${approved.length} email${approved.length > 1 ? "s" : ""} for ${sendAt.toLocaleDateString("en-IN", { weekday:"short", day:"numeric", month:"short" })} at ${bulkSchedTime}`);
  };

  const stats = {
    pending:  contacts.filter(c=>c.status==="pending").length,
    ready:    contacts.filter(c=>c.status==="ready").length,
    approved: contacts.filter(c=>c.status==="approved").length,
    sent:     contacts.filter(c=>c.status==="sent").length,
  };

  const coSummary = (coContacts) => {
    const counts = {};
    coContacts.forEach(c => { counts[c.status]=(counts[c.status]||0)+1; });
    if (counts.sent===coContacts.length) return { label:"All Sent", color:"#555" };
    if (counts.scheduled) return { label:`${counts.scheduled} scheduled`, color:"#B07CD8" };
    if (counts.approved) return { label:`${counts.approved} approved`, color:"#5B9BD5" };
    if (counts.ready) return { label:`${counts.ready} ready`, color:"#4A9E6B" };
    if (counts.generating) return { label:"Generating…", color:"#C4A35A" };
    if (counts.researching) return { label:"Researching…", color:"#9B7FD4" };
    return { label:`${coContacts.length} pending`, color:"#8B7355" };
  };

  return (
    <div style={s.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@300;400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:#222;border-radius:2px;}
        textarea{resize:none;} button:hover{opacity:.8;transition:opacity .15s;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
        @keyframes slideIn{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:translateX(0)}}
        @keyframes expandDown{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {toast && (
        <div style={{...s.toast, background:toast.type==="error"?"#2A0F0F":"#0A1F12", borderColor:toast.type==="error"?"#6B2A2A":"#1A5533"}}>
          <span style={{marginRight:8}}>{toast.type==="error"?"✗":"✓"}</span>{toast.msg}
        </div>
      )}

      {/* HEADER */}
      <div style={s.header}>
        <div>
          <div style={s.logo}>SUVARNA NYAYANIDHI</div>
          <div style={s.logoSub}>
            {CATEGORIES.find(c=>c.key===activeCategory)?.label || "Insurance"} Outreach · Review Queue
            {IS_DEMO && <span style={s.demoBadge}>DEMO MODE</span>}
          </div>
        </div>
        <div style={s.headerRight}>
          {Object.entries(stats).map(([k,v]) => (
            <div key={k} style={s.stat}><span style={s.statN}>{v}</span><span style={s.statL}>{k}</span></div>
          ))}
          <div style={s.sep}/>
          <button style={s.btnGold}
            onClick={async () => {
              const pending = contacts.filter(c=>c.status==="pending");
              for (const c of pending) await generateEmail(c);
            }}
            disabled={loading||stats.pending===0}>
            ⚡ Generate All
          </button>
          <button style={{...s.btnGold,background:"#2A1F0A",borderColor:"#5A4A2A"}}
            onClick={async () => {
              const generated = contacts.filter(c=>["approved","skipped"].includes(c.status));
              if (generated.length===0) return;
              for (const c of generated) {
                updateContact(c.id, {status:"pending",generatedEmail:null,skipReason:null,crmSyncStatus:null});
              }
              for (const c of generated) await generateEmail({...c,status:"pending",generatedEmail:null,skipReason:null});
            }}
            disabled={loading||(stats.approved+(stats.skipped||0))===0}>
            ↻ Regenerate All
          </button>
          <button style={s.btnBlue}
            onClick={bulkSend}
            disabled={stats.approved===0}>
            ➤ Send All
          </button>
          <div style={{position:"relative"}}>
            <button style={s.btnSchedule}
              onClick={openBulkSchedule}
              disabled={stats.approved===0}>
              🕐 Schedule All
            </button>
            {bulkScheduleOpen && (
              <div style={{...s.schedulePopover, right:0}}>
                <div style={s.scheduleTitle}>SCHEDULE {contacts.filter(c=>c.status==="approved"&&c.generatedEmail).length} EMAILS</div>
                <div style={{display:"flex",gap:8,marginBottom:10}}>
                  <input type="date" value={bulkSchedDate} onChange={e=>setBulkSchedDate(e.target.value)} style={s.scheduleInput} />
                  <input type="time" value={bulkSchedTime} onChange={e=>setBulkSchedTime(e.target.value)} style={s.scheduleInput} />
                </div>
                <div style={{fontSize:10,color:"#888",marginBottom:10,fontFamily:"'IBM Plex Mono',monospace"}}>
                  {bulkSchedDate && bulkSchedTime ? new Date(`${bulkSchedDate}T${bulkSchedTime}`).toLocaleString("en-IN",{weekday:"long",day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : ""}
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button style={s.btnGhost} onClick={()=>setBulkScheduleOpen(false)}>Cancel</button>
                  <button style={{...s.btnSchedule,flex:1}} onClick={bulkSchedule}>Confirm</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CATEGORY TABS */}
      <div style={s.catBar}>
        {CATEGORIES.map(cat => {
          const active = cat.key === activeCategory;
          const count = allContacts.filter(c => c.category === cat.key).length;
          return (
            <button key={cat.key} style={{...s.catTab, ...(active ? {color:cat.color, borderBottomColor:cat.color} : {})}}
              onClick={() => {
                if (cat.key === activeCategory) return;
                setActiveCategory(cat.key);
                setSelectedId(null);
                setExpandedCos({});
                setShowSync(false);
                setIsEditing(false);
                setEditingNotes(false);
                const catContacts = allContacts.filter(c => c.category === cat.key);
                if (catContacts.length > 0) {
                  setExpandedCos({ [catContacts[0].company]: true });
                  setSelectedId(catContacts[0].id);
                }
              }}>
              <span style={{...s.catDot, background: active ? cat.color : "#333"}}/>
              {cat.label}
              <span style={s.catCount}>{count}</span>
            </button>
          );
        })}
      </div>

      <div style={s.body}>
        {/* SIDEBAR */}
        <div style={s.sidebar}>
          <div style={s.sideLabel}>COMPANIES · {Object.keys(companies).length}</div>

          {loading && (
            <div style={s.sideLoading}>
              <div style={s.miniSpinner}/>
              Loading contacts…
            </div>
          )}

          {loadError && (
            <div style={s.sideError}>
              <div style={{color:"#C45A5A",marginBottom:6,fontSize:11}}>✗ Failed to load</div>
              <div style={{color:"#555",fontSize:10,marginBottom:10}}>{loadError}</div>
              <button style={s.btnMini} onClick={loadContacts}>Retry</button>
            </div>
          )}

          {!loading && !loadError && Object.entries(companies).map(([company, coContacts]) => {
            const expanded = !!expandedCos[company];
            const deck     = companyDecks[company];
            const summary  = coSummary(coContacts);
            const dragOver = isDragOver === company;

            return (
              <div key={company} style={s.coGroup}>
                <div style={{...s.coBar,...(expanded?s.coBarOpen:{})}}
                  onClick={()=>setExpandedCos(p=>({...p,[company]:!expanded}))}>
                  <div style={s.coBarLeft}>
                    <span style={{...s.coChevron,transform:expanded?"rotate(90deg)":"rotate(0deg)"}}>›</span>
                    <div>
                      <div style={s.coName}>{company}</div>
                      <div style={{...s.coSummary,color:summary.color}}>{summary.label}</div>
                    </div>
                  </div>
                  <div style={s.coBarRight}>
                    {!!companyDossiers[company] && <span style={s.dossierDotSmall}>📋</span>}
                    {!!deck && <span style={s.deckDotSmall}>📎</span>}
                    <span style={s.coCount}>{coContacts.length}</span>
                  </div>
                </div>

                {expanded && (
                  <div style={{...s.coExpand,animation:"expandDown .18s ease"}}>
                    {/* Deck zone */}
                    <div style={{...s.deckZone,...(dragOver?s.deckZoneActive:{})}}
                      onDragOver={e=>{e.preventDefault();setIsDragOver(company);}}
                      onDragLeave={()=>setIsDragOver(null)}
                      onDrop={e=>{e.preventDefault();setIsDragOver(null);handleDeckFile(company,e.dataTransfer.files[0]);}}>
                      <input type="file" accept=".pdf,.ppt,.pptx" style={{display:"none"}}
                        ref={el=>fileRefs.current[company]=el}
                        onChange={e=>handleDeckFile(company,e.target.files[0])}/>
                      {!deck ? (
                        <div style={s.deckEmpty} onClick={()=>fileRefs.current[company]?.click()}>
                          <span style={{fontSize:13,opacity:.35}}>📎</span>
                          <span style={s.deckEmptyText}>Attach deck</span>
                          <span style={s.deckEmptySub}>PDF · PPT · PPTX</span>
                        </div>
                      ) : (
                        <div style={s.deckAttached}>
                          <div style={s.deckFileRow}>
                            <span style={{...s.deckTypeTag,color:deckColor(deck.type)}}>{deck.type?.includes("pdf")?"PDF":"PPT"}</span>
                            <span style={s.deckFileName}>{deck.name}</span>
                          </div>
                          <div style={s.deckActions}>
                            <span style={s.deckSize}>{fmt(deck.size)}</span>
                            <button style={s.btnDeckReplace} onClick={e=>{e.stopPropagation();fileRefs.current[company]?.click();}}>Replace</button>
                            <button style={s.btnDeckRemove} onClick={e=>{e.stopPropagation();removeDeck(company);}}>✕</button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Intelligence dossier */}
                    <div style={s.dossierZone}>
                      <input type="file" accept=".txt,.md,.pdf,.doc,.docx" style={{display:"none"}}
                        ref={el=>dossierRefs.current[company]=el}
                        onChange={e=>handleDossierFile(company,e.target.files[0])}/>
                      {!companyDossiers[company] ? (
                        <div style={s.deckEmpty} onClick={()=>dossierRefs.current[company]?.click()}>
                          <span style={{fontSize:13,opacity:.35}}>📋</span>
                          <span style={s.deckEmptyText}>Attach dossier</span>
                          <span style={s.deckEmptySub}>TXT · MD · PDF · DOC</span>
                        </div>
                      ) : (
                        <div style={s.deckAttached}>
                          <div style={s.deckFileRow}>
                            <span style={{...s.deckTypeTag,color:"#5B9BD5"}}>{companyDossiers[company].name.split(".").pop().toUpperCase()}</span>
                            <span style={s.deckFileName}>{companyDossiers[company].name}</span>
                          </div>
                          <div style={s.deckActions}>
                            <span style={s.deckSize}>{fmt(companyDossiers[company].size)}</span>
                            <button style={s.btnDeckReplace} onClick={e=>{e.stopPropagation();dossierRefs.current[company]?.click();}}>Replace</button>
                            <button style={s.btnDeckRemove} onClick={e=>{e.stopPropagation();removeDossier(company);}}>✕</button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Contact tabs */}
                    {coContacts.map(c => {
                      const st = STATUS_CONFIG[c.status] || STATUS_CONFIG.pending;
                      const sync = c.crmSyncStatus ? SYNC_CONFIG[c.crmSyncStatus] : null;
                      const active = c.id === selectedId;
                      return (
                        <div key={c.id} style={{...s.contactTab,...(active?s.contactTabOn:{})}}
                          onClick={()=>{setSelectedId(c.id);setEditingNotes(false);}}>
                          <div style={s.tabLeft}>
                            <div style={{...s.tabBar,background:active?(CATEGORIES.find(c=>c.key===activeCategory)?.color||"#C4A35A"):"transparent"}}/>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={s.tabName}>{c.name}</div>
                              <div style={s.tabTitle}>{c.title}</div>
                            </div>
                          </div>
                          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3,flexShrink:0}}>
                            <span style={{...s.badge,color:st.color,background:st.bg}}>
                              {(c.status==="generating"||c.status==="researching")&&<span style={{...s.pulseDot,background:st.color}}/>}
                              {st.label}
                            </span>
                            {sync && <span style={{fontSize:9,color:sync.color,fontFamily:"'IBM Plex Mono',monospace"}}>{c.crmSyncStatus==="synced"?"✓":c.crmSyncStatus==="failed"?"✗":""} {sync.label}</span>}
                          </div>
                        </div>
                      );
                    })}

                    {coContacts.some(c=>c.status==="pending") && (
                      <button style={s.coGenBtn}
                        onClick={()=>coContacts.filter(c=>c.status==="pending").forEach(generateEmail)}>
                        ⚡ Generate all for {company.split(" ")[0]}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* MAIN PANEL */}
        <div style={s.main}>
          {loading ? (
            <div style={s.emptyMain}><div style={{...s.spinner,marginBottom:14}}/>Loading contacts…</div>
          ) : !current ? (
            <div style={s.emptyMain}><div style={{fontSize:26,marginBottom:10,opacity:.08}}>←</div>Select a contact from the sidebar</div>
          ) : (
            <div style={{animation:"fadeUp .2s ease"}}>
              {/* Top bar */}
              <div style={s.topBar}>
                <div>
                  <div style={s.coTag}>{current.company}</div>
                  <div style={s.pName}>{current.name}</div>
                  <div style={s.pMeta}>{current.title}</div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={s.pEmail}>{current.email}</div>
                    {current.linkedin && <a href={current.linkedin.startsWith("http")?current.linkedin:`https://${current.linkedin}`} target="_blank" rel="noopener noreferrer" style={{color:"#0A66C2",fontSize:13,textDecoration:"none",fontWeight:600}}>LinkedIn ↗</a>}
                  </div>
                </div>
                <div style={s.actions}>
                  {current.status==="ready" && <>
                    <button style={s.btnGhost} onClick={()=>{updateContact(current.id,{status:"pending",generatedEmail:null,skipReason:null,crmSyncStatus:null});generateEmail({...current,status:"pending",generatedEmail:null,skipReason:null});}}>↻ Regenerate</button>
                    <button style={s.btnGhost} onClick={()=>setIsEditing(!isEditing)}>{isEditing?"Cancel":"✎ Edit"}</button>
                    <button style={s.btnGreen} onClick={handleApprove}>✓ Approve</button>
                  </>}
                  {current.status==="approved" && <>
                    <button style={s.btnGhost} onClick={()=>updateContact(current.id,{status:"ready",crmSyncStatus:null})}>✎ Edit</button>
                    <button style={s.btnBlue} onClick={handleSend}>
                      ➤ Send{currentDeck&&<span style={{fontSize:9.5,marginLeft:5,opacity:.65}}>+ deck</span>}
                    </button>
                    <div style={{position:"relative"}}>
                      <button style={s.btnSchedule} onClick={openSchedulePopover}>🕐 Schedule</button>
                      {schedulePopover === current.id && (
                        <div style={s.schedulePopover}>
                          <div style={s.scheduleTitle}>SCHEDULE SEND</div>
                          <div style={{display:"flex",gap:8,marginBottom:10}}>
                            <input type="date" value={scheduleDate} onChange={e=>setScheduleDate(e.target.value)} style={s.scheduleInput} />
                            <input type="time" value={scheduleTime} onChange={e=>setScheduleTime(e.target.value)} style={s.scheduleInput} />
                          </div>
                          <div style={{fontSize:10,color:"#888",marginBottom:10,fontFamily:"'IBM Plex Mono',monospace"}}>
                            {scheduleDate && scheduleTime ? new Date(`${scheduleDate}T${scheduleTime}`).toLocaleString("en-IN",{weekday:"long",day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : ""}
                          </div>
                          <div style={{display:"flex",gap:8}}>
                            <button style={s.btnGhost} onClick={()=>setSchedulePopover(null)}>Cancel</button>
                            <button style={{...s.btnSchedule,flex:1}} onClick={handleScheduleSend}>Confirm</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>}
                  {current.status==="scheduled" && <>
                    <button style={s.btnGhost} onClick={()=>updateContact(current.id,{status:"approved",scheduledAt:null})}>Cancel Schedule</button>
                    <span style={{fontSize:11,color:"#B07CD8",fontFamily:"'IBM Plex Mono',monospace"}}>
                      🕐 {new Date(current.scheduledAt).toLocaleString("en-IN",{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
                    </span>
                  </>}
                  {current.status==="sending" && <button style={{...s.btnBlue,opacity:.5}} disabled>Sending…</button>}
                  {current.status==="pending" && <button style={s.btnGold} onClick={()=>generateEmail(current)}>⚡ Generate</button>}
                  {current.status==="skipped" && <button style={s.btnGold} onClick={()=>{updateContact(current.id,{status:"pending",skipReason:null});generateEmail(current);}}>⚡ Retry</button>}
                  {["approved","skipped"].includes(current.status) && (
                    <button style={s.btnGhost} onClick={()=>{updateContact(current.id,{status:"pending",generatedEmail:null,skipReason:null,crmSyncStatus:null});generateEmail({...current,status:"pending",generatedEmail:null,skipReason:null});}}>↻ Regenerate</button>
                  )}
                  {["sent","approved","scheduled"].includes(current.status) && (
                    <button style={{...s.btnGhost,...(showSync?{borderColor:"#1E3A2A",color:"#4A9E6B"}:{})}} onClick={()=>setShowSync(!showSync)}>⇄ CRM</button>
                  )}
                </div>
              </div>

              {/* Notes — editable */}
              <div style={s.strip}>
                <span style={s.stripLbl}>NOTES </span>
                {editingNotes ? (
                  <span style={{display:"flex",alignItems:"center",gap:6,flex:1}}>
                    <input
                      value={noteDraft}
                      onChange={e=>setNoteDraft(e.target.value)}
                      onKeyDown={e=>{ if(e.key==="Enter") saveNotes(); if(e.key==="Escape"){ setEditingNotes(false); setNoteDraft(current.notes||""); } }}
                      autoFocus
                      style={{flex:1,background:"#1A1A1A",border:"1px solid #333",color:"#EEE",borderRadius:4,padding:"4px 8px",fontSize:12,fontFamily:"inherit"}}
                      placeholder="Add notes to help personalise the email..."
                    />
                    <button onClick={saveNotes} style={{background:"#1E3A2A",color:"#4A9E6B",border:"none",borderRadius:4,padding:"4px 10px",fontSize:11,cursor:"pointer"}}>Save</button>
                    <button onClick={()=>{setEditingNotes(false);setNoteDraft(current.notes||"");}} style={{background:"none",color:"#888",border:"1px solid #333",borderRadius:4,padding:"4px 8px",fontSize:11,cursor:"pointer"}}>✕</button>
                  </span>
                ) : (
                  <span style={{cursor:"pointer",flex:1}} onClick={()=>{setNoteDraft(current.notes||"");setEditingNotes(true);}}>
                    {current.notes || <span style={{color:"#999",fontStyle:"italic"}}>No notes in CRM — click to add</span>}
                    <span style={{color:"#666",fontSize:10,marginLeft:6}}>✎</span>
                  </span>
                )}
              </div>

              {/* Deck status */}
              <div style={s.strip}>
                <span style={s.stripLbl}>DECK </span>
                {currentDeck
                  ? <span style={{color:"#4A9E6B",fontSize:11.5}}>📎 {currentDeck.name} <span style={{color:"#AAA",marginLeft:4}}>({fmt(currentDeck.size)}) · Will be attached on send</span></span>
                  : <span style={{color:"#999",fontSize:11}}>No deck — upload in the {current.company.split(" ")[0]} sidebar panel</span>}
              </div>

              {/* Dossier status */}
              <div style={s.strip}>
                <span style={s.stripLbl}>DOSSIER </span>
                {currentDossier
                  ? <span style={{color:"#5B9BD5",fontSize:11.5}}>📋 {currentDossier.name} <span style={{color:"#AAA",marginLeft:4}}>({fmt(currentDossier.size)}) · Will be used for personalisation</span></span>
                  : <span style={{color:"#999",fontSize:11}}>No dossier — upload in the {current.company.split(" ")[0]} sidebar panel</span>}
              </div>

              {/* Research intel — now handled inside the combined Claude call */}

              {/* Email + sync panel */}
              <div style={{display:"flex",gap:18,alignItems:"flex-start"}}>
                <div style={{flex:1,minWidth:0}}>
                  {current.status==="researching" && (
                    <div style={{...s.genState,color:"#9B7FD4"}}><div style={{...s.spinner,borderTopColor:"#9B7FD4"}}/>Researching {current.name} — LinkedIn, web, role mapping…</div>
                  )}
                  {current.status==="generating" && (
                    <div style={s.genState}><div style={s.spinner}/>Drafting personalised email…</div>
                  )}

                  {current.generatedEmail && !["generating","researching"].includes(current.status) && (
                    <div style={s.emailCard}>
                      <div style={s.emailSec}>
                        <div style={s.lbl}>SUBJECT</div>
                        {isEditing
                          ? <input style={s.inpSubject} value={editSubject} onChange={e=>setEditSubject(e.target.value)}/>
                          : <div style={s.subjDisplay}>{editSubject}</div>}
                      </div>
                      <div style={s.hr}/>
                      <div style={s.emailSec}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                          <div style={s.lbl}>BODY</div>
                          <div style={s.wc}>{editBody.split(" ").filter(Boolean).length} words</div>
                        </div>
                        {isEditing
                          ? <textarea style={s.ta} value={editBody} onChange={e=>setEditBody(e.target.value)} rows={12}/>
                          : <div style={s.bodyTxt}>{editBody.split("\n").map((ln,i)=><p key={i} style={{marginBottom:ln?10:4,minHeight:ln?"auto":4}}>{ln}</p>)}</div>}
                      </div>
                      {currentDeck && (
                        <div style={s.attachBadge}>
                          <span style={{color:deckColor(currentDeck.type),marginRight:6}}>📎</span>
                          <span style={{color:"#555",fontSize:11}}>{currentDeck.name}</span>
                          <span style={{color:"#333",fontSize:10,marginLeft:6}}>({fmt(currentDeck.size)})</span>
                        </div>
                      )}
                      {isEditing && (
                        <div style={{display:"flex",gap:9,padding:"0 22px 18px"}}>
                          <button style={s.btnGhost} onClick={()=>{setEditSubject(current.generatedEmail.subject);setEditBody(current.generatedEmail.body);setIsEditing(false);}}>Reset</button>
                          <button style={s.btnGreen} onClick={handleApprove}>✓ Save & Approve</button>
                        </div>
                      )}
                    </div>
                  )}

                  {current.status==="pending" && !current.generatedEmail && (
                    <div style={s.emptyEmail}>
                      <div style={{fontSize:28,marginBottom:10,opacity:.1}}>✉</div>
                      {currentDeck?"Deck attached. Click Generate to draft with deck reference.":"Click Generate to draft a personalised outreach."}
                    </div>
                  )}

                  {current.status==="skipped" && (
                    <div style={{...s.emptyEmail, borderColor:"#3A1515"}}>
                      <div style={{fontSize:28,marginBottom:10,opacity:.3}}>✗</div>
                      <div style={{color:"#C45A5A",fontSize:12,fontWeight:500,marginBottom:6}}>NOT RELEVANT</div>
                      <div style={{color:"#AAA",fontSize:11.5,lineHeight:1.6}}>{current.skipReason || "This person's role doesn't align with our litigation/recovery services."}</div>
                      <div style={{color:"#666",fontSize:10,marginTop:8,fontFamily:"'IBM Plex Mono',monospace"}}>Click Retry to re-generate if you think this is wrong.</div>
                    </div>
                  )}

                  {current.status==="sent" && (
                    <div style={s.sentState}>
                      <span style={{fontSize:22,color:"#2A6B47"}}>✓</span>
                      <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11.5,color:"#CCC",marginTop:6}}>
                        {IS_DEMO?"[Demo] Would have sent to":"Sent to"} {current.email}{currentDeck?" · deck attached":""}
                      </span>
                      {current.generatedEmail && (
                        <div style={{...s.emailCard,marginTop:18,opacity:.45,width:"100%"}}>
                          <div style={s.emailSec}>
                            <div style={s.lbl}>SUBJECT</div>
                            <div style={s.subjDisplay}>{current.generatedEmail.subject}</div>
                          </div>
                          <div style={s.hr}/>
                          <div style={s.emailSec}>
                            <div style={s.lbl}>BODY</div>
                            <div style={s.bodyTxt}>{current.generatedEmail.body.split("\n").map((ln,i)=><p key={i} style={{marginBottom:ln?10:4}}>{ln}</p>)}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* CRM Sync Panel */}
                {showSync && (
                  <div style={{...s.syncPanel,animation:"slideIn .2s ease"}}>
                    <div style={s.syncTitle}>ZOHO CRM SYNC{IS_DEMO&&<span style={{color:"#555",marginLeft:6,fontSize:8}}>DEMO</span>}</div>
                    <div style={s.syncRow}><div style={s.syncKey}>ZOHO RECORD ID</div><div style={s.syncVal}>{current.zohoId}</div></div>
                    <div style={s.syncRow}>
                      <div style={s.syncKey}>STATUS</div>
                      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,
                        color:current.crmSyncStatus==="synced"?"#4A9E6B":current.crmSyncStatus==="failed"?"#C45A5A":current.crmSyncStatus==="syncing"?"#C4A35A":"#CCC"}}>
                        {current.crmSyncStatus==="synced"?"✓ Synced":current.crmSyncStatus==="failed"?"✗ Failed":current.crmSyncStatus==="syncing"?"Syncing…":"—"}
                      </div>
                    </div>
                    <div style={s.syncDivider}/>
                    <div style={s.syncKey}>FIELDS WRITTEN TO CRM</div>
                    <div style={s.fieldList}>
                      {["Outreach_Status","Outreach_Subject","Outreach_Body","Outreach_Skip_Status","Last_Outreach_Date","Follow_Up_Due"].map(f=>(
                        <div key={f} style={s.fieldItem}><span style={{color:"#999",marginRight:5}}>›</span>{f}</div>
                      ))}
                    </div>
                    <div style={s.syncDivider}/>
                    <div style={s.syncKey}>MANUAL PUSH</div>
                    <div style={{display:"flex",flexDirection:"column",gap:5,marginTop:6}}>
                      {["Approved","Sent","Opened","Replied","Not Interested"].map(status=>(
                        <button key={status} style={s.manualBtn} disabled={current.crmSyncStatus==="syncing"}
                          onClick={()=>syncToCRM(current,status)}>
                          <span style={{color:"#4A9E6B",marginRight:7}}>⇄</span>"{status}"
                        </button>
                      ))}
                    </div>
                    {current.syncLog?.length>0 && (
                      <>
                        <div style={s.syncDivider}/>
                        <div style={s.syncKey}>LOG</div>
                        <div style={s.logBox}>
                          {current.syncLog.map((e,i)=>(
                            <div key={i} style={s.logRow}>
                              <span style={{color:e.result==="success"?"#4A9E6B":"#C45A5A",marginRight:5,fontSize:9}}>{e.result==="success"?"✓":"✗"}</span>
                              <span style={{color:"#CCC",marginRight:7,fontSize:9}}>{e.time}</span>
                              <span style={{color:"#DDD",fontSize:9}}>{e.field}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  root:{ background:"#0C0C0C", minHeight:"100vh", color:"#D4C9B8", fontFamily:"'IBM Plex Sans',sans-serif", display:"flex", flexDirection:"column" },
  toast:{ position:"fixed", top:18, right:18, zIndex:999, padding:"9px 16px", borderRadius:5, border:"1px solid", fontSize:12.5, fontFamily:"'IBM Plex Mono',monospace" },
  header:{ borderBottom:"1px solid #181818", padding:"15px 26px", display:"flex", justifyContent:"space-between", alignItems:"center", background:"#070707" },
  logo:{ fontFamily:"'Playfair Display',serif", fontSize:13.5, letterSpacing:".15em", color:"#C4A35A", fontWeight:600 },
  logoSub:{ fontSize:9.5, color:"#AAA", letterSpacing:".1em", marginTop:3, textTransform:"uppercase", display:"flex", alignItems:"center", gap:8 },
  demoBadge:{ background:"#251E0F", border:"1px solid #3A2E10", color:"#C4A35A", fontSize:8.5, padding:"1px 6px", borderRadius:3, letterSpacing:".08em" },
  headerRight:{ display:"flex", alignItems:"center", gap:22 },
  stat:{ display:"flex", flexDirection:"column", alignItems:"center", gap:2 },
  statN:{ fontFamily:"'IBM Plex Mono',monospace", fontSize:16, color:"#D4C9B8" },
  statL:{ fontSize:9.5, color:"#AAA", letterSpacing:".08em", textTransform:"uppercase" },
  sep:{ width:1, height:28, background:"#1E1E1E" },
  catBar:{ display:"flex", gap:0, background:"#070707", borderBottom:"1px solid #181818", padding:"0 26px" },
  catTab:{ display:"flex", alignItems:"center", gap:6, padding:"10px 18px", background:"none", border:"none", borderBottom:"2px solid transparent", color:"#666", fontSize:12, fontFamily:"'IBM Plex Sans',sans-serif", fontWeight:500, cursor:"pointer", letterSpacing:".03em", transition:"color .15s" },
  catDot:{ width:7, height:7, borderRadius:"50%", flexShrink:0 },
  catCount:{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9.5, color:"#555", background:"#111", border:"1px solid #1E1E1E", borderRadius:3, padding:"0 5px", marginLeft:2 },
  body:{ display:"flex", flex:1, overflow:"hidden", height:"calc(100vh - 104px)" },
  sidebar:{ width:268, borderRight:"1px solid #181818", overflowY:"auto", padding:"12px 10px", background:"#070707", flexShrink:0 },
  sideLabel:{ fontSize:9.5, letterSpacing:".12em", color:"#AAA", marginBottom:10, padding:"0 5px" },
  sideLoading:{ display:"flex", alignItems:"center", gap:9, padding:"16px 6px", color:"#CCC", fontSize:11, fontFamily:"'IBM Plex Mono',monospace" },
  sideError:{ padding:"14px 8px" },
  miniSpinner:{ width:12, height:12, border:"1.5px solid #C4A35A", borderTopColor:"transparent", borderRadius:"50%", animation:"spin .8s linear infinite", flexShrink:0 },
  coGroup:{ marginBottom:5 },
  coBar:{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 10px 10px 8px", borderRadius:5, cursor:"pointer", border:"1px solid #181818", background:"#0A0A0A", userSelect:"none" },
  coBarOpen:{ border:"1px solid #242218", background:"#0E0B07", borderBottomLeftRadius:0, borderBottomRightRadius:0 },
  coBarLeft:{ display:"flex", alignItems:"center", gap:8, minWidth:0 },
  coChevron:{ color:"#CCC", fontSize:14, transition:"transform .2s", flexShrink:0, lineHeight:1 },
  coName:{ fontSize:11.5, fontWeight:500, color:"#C8BCA8", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:148 },
  coSummary:{ fontSize:9.5, marginTop:2, fontFamily:"'IBM Plex Mono',monospace", letterSpacing:".03em" },
  coBarRight:{ display:"flex", alignItems:"center", gap:7, flexShrink:0 },
  deckDotSmall:{ fontSize:11, opacity:.7 },
  dossierDotSmall:{ fontSize:10, opacity:.7 },
  dossierZone:{ padding:"9px 10px", borderBottom:"1px solid #141414" },
  coCount:{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:"#CCC", background:"#161616", border:"1px solid #222", borderRadius:3, padding:"1px 5px" },
  coExpand:{ background:"#090909", border:"1px solid #242218", borderTop:"none", borderBottomLeftRadius:5, borderBottomRightRadius:5, overflow:"hidden" },
  deckZone:{ padding:"9px 10px", borderBottom:"1px solid #141414", transition:"background .15s" },
  deckZoneActive:{ background:"#130F05" },
  deckEmpty:{ display:"flex", alignItems:"center", gap:7, cursor:"pointer", padding:"3px" },
  deckEmptyText:{ fontSize:10.5, color:"#CCC", flex:1 },
  deckEmptySub:{ fontSize:9, color:"#999", fontFamily:"'IBM Plex Mono',monospace" },
  deckAttached:{ padding:"2px 3px" },
  deckFileRow:{ display:"flex", alignItems:"center", gap:6, marginBottom:5 },
  deckTypeTag:{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, border:"1px solid #222", borderRadius:2, padding:"1px 5px", background:"#111", flexShrink:0 },
  deckFileName:{ fontSize:10.5, color:"#DDD", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1, minWidth:0 },
  deckActions:{ display:"flex", alignItems:"center", gap:6 },
  deckSize:{ fontSize:9.5, color:"#AAA", fontFamily:"'IBM Plex Mono',monospace", flex:1 },
  btnDeckReplace:{ fontSize:9.5, padding:"1px 7px", background:"transparent", border:"1px solid #222", borderRadius:3, color:"#CCC", cursor:"pointer" },
  btnDeckRemove:{ fontSize:10, padding:"1px 6px", background:"transparent", border:"1px solid #2A1818", borderRadius:3, color:"#6B3333", cursor:"pointer" },
  contactTab:{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 10px 9px 0", cursor:"pointer", borderBottom:"1px solid #111", transition:"background .12s" },
  contactTabOn:{ background:"#110F08" },
  tabLeft:{ display:"flex", alignItems:"center", flex:1, minWidth:0 },
  tabBar:{ width:2, height:28, borderRadius:1, marginRight:10, flexShrink:0, transition:"background .15s" },
  tabName:{ fontSize:11.5, color:"#C8BCA8", marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  tabTitle:{ fontSize:10, color:"#BBB", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  badge:{ fontSize:9, padding:"2px 6px", borderRadius:20, display:"flex", alignItems:"center", whiteSpace:"nowrap" },
  pulseDot:{ display:"inline-block", width:5, height:5, borderRadius:"50%", marginRight:4, animation:"pulse 1s infinite" },
  coGenBtn:{ width:"100%", padding:"8px 10px", background:"#0D0A05", border:"none", borderTop:"1px solid #141414", color:"#8B7355", fontSize:10.5, cursor:"pointer", textAlign:"left", fontFamily:"'IBM Plex Sans',sans-serif" },
  main:{ flex:1, overflowY:"auto", padding:"22px 26px" },
  emptyMain:{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", color:"#CCC", fontFamily:"'IBM Plex Mono',monospace", fontSize:12 },
  topBar:{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 },
  coTag:{ fontSize:9.5, color:"#7A6A4A", letterSpacing:".08em", textTransform:"uppercase", marginBottom:5, fontFamily:"'IBM Plex Mono',monospace" },
  pName:{ fontFamily:"'Playfair Display',serif", fontSize:20, color:"#E8DCC8", marginBottom:3 },
  pMeta:{ fontSize:11, color:"#CCC", marginBottom:2 },
  pEmail:{ fontSize:11, color:"#7A6A4A", fontFamily:"'IBM Plex Mono',monospace" },
  actions:{ display:"flex", gap:9, alignItems:"center" },
  strip:{ background:"#090909", border:"1px solid #181818", borderRadius:5, padding:"9px 13px", fontSize:11, color:"#CCC", marginBottom:10, lineHeight:1.65 },
  stripLbl:{ color:"#AAA", letterSpacing:".1em", fontSize:9, marginRight:7 },
  emailCard:{ border:"1px solid #181818", borderRadius:6, overflow:"hidden", background:"#070707" },
  emailSec:{ padding:"16px 20px" },
  lbl:{ fontSize:9, color:"#AAA", letterSpacing:".12em" },
  subjDisplay:{ fontSize:14.5, color:"#D4C9B8", fontFamily:"'Playfair Display',serif", lineHeight:1.4 },
  inpSubject:{ width:"100%", background:"#0E0E0E", border:"1px solid #2A2318", borderRadius:3, padding:"8px 11px", color:"#D4C9B8", fontSize:14, fontFamily:"'Playfair Display',serif", outline:"none" },
  hr:{ height:1, background:"#141414" },
  bodyTxt:{ fontSize:12.5, color:"#968C7E", lineHeight:1.85 },
  ta:{ width:"100%", background:"#0E0E0E", border:"1px solid #2A2318", borderRadius:3, padding:"9px 11px", color:"#968C7E", fontSize:12.5, fontFamily:"'IBM Plex Sans',sans-serif", lineHeight:1.85, outline:"none" },
  wc:{ fontSize:9.5, color:"#AAA", fontFamily:"'IBM Plex Mono',monospace" },
  attachBadge:{ padding:"10px 22px", borderTop:"1px solid #141414", display:"flex", alignItems:"center" },
  genState:{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"50px 0", color:"#CCC", fontSize:11.5, fontFamily:"'IBM Plex Mono',monospace" },
  spinner:{ width:26, height:26, border:"2px solid #C4A35A", borderTopColor:"transparent", borderRadius:"50%", animation:"spin .8s linear infinite", marginBottom:13 },
  emptyEmail:{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"50px 0", color:"#CCC", fontSize:11.5, textAlign:"center", fontFamily:"'IBM Plex Mono',monospace", lineHeight:1.8 },
  sentState:{ display:"flex", flexDirection:"column", alignItems:"center", padding:"28px 0 0" },
  syncPanel:{ width:224, flexShrink:0, background:"#070707", border:"1px solid #181818", borderRadius:6, padding:14, position:"sticky", top:0 },
  syncTitle:{ fontSize:9, color:"#AAA", letterSpacing:".15em", marginBottom:13, display:"flex", alignItems:"center" },
  syncRow:{ marginBottom:11 },
  syncKey:{ fontSize:9, color:"#AAA", letterSpacing:".12em", marginBottom:5 },
  syncVal:{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10.5, color:"#CCC" },
  syncDivider:{ height:1, background:"#141414", margin:"12px 0" },
  fieldList:{ background:"#0C0C0C", borderRadius:3, padding:"9px 10px", marginTop:6 },
  fieldItem:{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9.5, color:"#CCC", marginBottom:4 },
  manualBtn:{ background:"#0C0C0C", border:"1px solid #181818", borderRadius:3, padding:"6px 9px", color:"#CCC", fontSize:10.5, cursor:"pointer", textAlign:"left", fontFamily:"'IBM Plex Sans',sans-serif" },
  logBox:{ background:"#090909", borderRadius:3, padding:"7px 9px", maxHeight:90, overflowY:"auto" },
  logRow:{ display:"flex", alignItems:"center", marginBottom:4 },
  btnGold:{ background:"#C4A35A", color:"#080808", border:"none", borderRadius:4, padding:"8px 13px", fontSize:11.5, fontWeight:500, cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif" },
  btnGhost:{ background:"transparent", color:"#CCC", border:"1px solid #222", borderRadius:4, padding:"7px 12px", fontSize:11.5, cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif" },
  btnGreen:{ background:"#0C2218", color:"#4A9E6B", border:"1px solid #18442E", borderRadius:4, padding:"7px 13px", fontSize:11.5, cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif", fontWeight:500 },
  btnBlue:{ background:"#0C1828", color:"#5B9BD5", border:"1px solid #18304A", borderRadius:4, padding:"7px 13px", fontSize:11.5, cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif", fontWeight:500 },
  btnSchedule:{ background:"#1A1030", color:"#B07CD8", border:"1px solid #2E1F4A", borderRadius:4, padding:"7px 13px", fontSize:11.5, cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif", fontWeight:500 },
  schedulePopover:{ position:"absolute", top:"100%", right:0, marginTop:6, background:"#141414", border:"1px solid #2E1F4A", borderRadius:6, padding:14, zIndex:50, width:280, boxShadow:"0 8px 24px rgba(0,0,0,.5)" },
  scheduleTitle:{ fontSize:9.5, letterSpacing:".1em", color:"#B07CD8", marginBottom:10, fontFamily:"'IBM Plex Mono',monospace" },
  scheduleInput:{ background:"#0C0C0C", border:"1px solid #222", borderRadius:4, padding:"6px 8px", color:"#DDD", fontSize:11.5, fontFamily:"'IBM Plex Mono',monospace", flex:1, colorScheme:"dark" },
  btnMini:{ fontSize:10, padding:"4px 10px", background:"transparent", border:"1px solid #2A2318", borderRadius:3, color:"#C4A35A", cursor:"pointer" },
};
