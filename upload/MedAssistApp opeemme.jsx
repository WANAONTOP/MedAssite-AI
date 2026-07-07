import React, { useState, useRef, useEffect } from "react";
import {
  Pill, Send, Stethoscope, ClipboardList, Users, AlertTriangle, CheckCircle2, XCircle, Clock,
  FileText, MessageSquareText, Sparkles, Siren, PhoneCall, MapPin, BellRing, X, History,
  LifeBuoy, Navigation, ShieldCheck, LogOut, ChevronRight, ScanLine, Camera, Upload,
  RotateCcw, ShieldAlert,
} from "lucide-react";

const C = {
  bg: "#0B0F14",
  panel: "#121821",
  border: "rgba(47,129,194,0.22)",
  borderStrong: "#2F81C2",
  ink: "#F3F6F9",
  dim: "#8B98A5",
  blue: "#2F81C2",
  blueSoft: "rgba(47,129,194,0.16)",
  red: "#E2495B",
  redSoft: "rgba(226,73,91,0.14)",
};

const STATUS_STYLE = {
  pending: { color: C.blue, bg: C.blueSoft, label: "Pending" },
  emergency: { color: C.red, bg: C.redSoft, label: "Emergency" },
  solved: { color: C.ink, bg: "rgba(255,255,255,0.08)", label: "Solved" },
  unsolved: { color: C.dim, bg: "rgba(255,255,255,0.04)", label: "Unsolved" },
};

const CLINIC_KNOWLEDGE = `
You are the triage assistant for Riverside Community Clinic.
Departments: General Medicine, Dermatology, Orthopedics, Pediatrics, ENT, Cardiology.
Clinic hours: Mon-Sat 8am-8pm.
Ask short, focused follow-up questions (max 2) about symptoms, duration, and severity, then recommend a
department and whether the case seems routine or urgent. Keep replies conversational, warm, under 3 sentences.
Never diagnose. Never prescribe medication. Always remind that a doctor makes the final call.

EMERGENCY RULE: If signs of a possible medical emergency appear (chest pain, difficulty breathing, stroke signs,
heavy uncontrolled bleeding, loss of consciousness, severe allergic reaction, suicidal intent), your reply MUST
start on its own first line with exactly:
EMERGENCY_FLAG: <very short reason, under 8 words>
Then a line break, then your normal short reply. Only use this for genuine emergencies.
`;

const MEDICINE_LENS_KNOWLEDGE = `
You are a Medicine Lens assistant. The person has shared a photo of a medicine strip, box, bottle, or loose
pill/tablet. Your job is purely educational identification support, never a prescription.

How to respond:
- Describe what you can actually read or see: printed name, dosage strength shown ON the packaging (you may
  repeat text that is visibly printed on the packaging itself, since that's just reading a label), shape, color,
  or imprint code, if visible.
- If you recognize the medicine name, briefly explain in plain language what general category it belongs to and
  what it is commonly used for (e.g. "this is an antihistamine, commonly used for allergy symptoms").
- NEVER invent a name if the packaging is unreadable or the pill has no visible identifying marks — say clearly
  that you can't confidently identify it from the photo and recommend showing it to a pharmacist in person instead.
- NEVER recommend a dosage, tell the person to take/stop/adjust a medicine, or confirm it is safe for them
  personally — that depends on their medical history.
- If the photo shows a loose, unmarked pill with no packaging, be extra cautious: state plainly that visual
  identification of loose pills is unreliable and a pharmacist or poison control should confirm it before anyone
  takes it.
- Keep the reply under 5 short sentences. Always close with a reminder to confirm with a pharmacist or doctor
  before use.
`;

const NEARBY_HOSPITALS = [
  { name: "Riverside General Hospital", distance: "1.2 km", eta: "5 min", type: "Multi-specialty" },
  { name: "St. Mary's Emergency Care", distance: "2.4 km", eta: "9 min", type: "24/7 Emergency" },
  { name: "Sunrise Family Clinic", distance: "0.8 km", eta: "3 min", type: "Outpatient" },
];

async function callClaude(messages, systemPrompt, wantJson = false) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, system: systemPrompt, messages }),
  });
  const data = await res.json();
  const text = (data.content || []).map((b) => b.text || "").join("\n");
  if (wantJson) {
    const cleaned = text.replace(/```json|```/g, "").trim();
    try { return JSON.parse(cleaned); } catch { return null; }
  }
  return text;
}

async function callClaudeVision(base64Data, mediaType, systemPrompt, note) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } },
            { type: "text", text: note?.trim() ? `Extra context from the person: ${note.trim()}` : "Please look at this photo of a medicine." },
          ],
        },
      ],
    }),
  });
  const data = await res.json();
  return (data.content || []).map((b) => b.text || "").join("\n");
}

function CapsuleLoader() {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ width: 7, height: 14, borderRadius: 999, background: C.blue, animation: `capsuleBounce 1s ${i * 0.15}s ease-in-out infinite` }} />
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.pending;
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: "4px 11px", borderRadius: 999, letterSpacing: 0.3, display: "inline-flex", alignItems: "center", gap: 5 }}>
      {status === "emergency" && <span style={{ width: 6, height: 6, borderRadius: 999, background: C.red, animation: "dotPulse 1s infinite" }} />}
      {s.label}
    </span>
  );
}

function Card({ children, style = {}, ...rest }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 18, ...style }} {...rest}>
      {children}
    </div>
  );
}

function PillButton({ children, tone = "blue", onClick, disabled, style = {} }) {
  const map = {
    blue: { bg: C.blue, color: "#fff" },
    red: { bg: C.red, color: "#fff" },
    outline: { bg: "transparent", color: C.ink, border: `1px solid ${C.border}` },
    soft: { bg: C.blueSoft, color: C.blue },
  };
  const s = map[tone];
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: "inline-flex", alignItems: "center", gap: 7, background: s.bg, color: s.color,
      border: s.border || "none", borderRadius: 999, padding: "9px 16px", fontSize: 13, fontWeight: 700,
      cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.6 : 1, whiteSpace: "nowrap", ...style,
    }}>{children}</button>
  );
}

function EmergencyAlert({ reason, onDismiss }) {
  const actions = [
    { label: "Call Ambulance (108)", icon: Siren },
    { label: "Call Hospital", icon: PhoneCall },
    { label: "Notify Doctor Now", icon: BellRing },
    { label: "Nearest Emergency Dept", icon: MapPin },
  ];
  return (
    <Card style={{ padding: 20, marginBottom: 18, background: C.redSoft, border: `1px solid rgba(226,73,91,0.4)`, animation: "emergencyGlow 1.6s ease-in-out infinite", position: "relative" }}>
      <button onClick={onDismiss} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", color: C.dim, cursor: "pointer" }}><X size={16} /></button>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ width: 42, height: 42, flexShrink: 0, borderRadius: 12, background: "rgba(0,0,0,0.25)", border: `1px solid rgba(226,73,91,0.4)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Siren size={21} color={C.red} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: C.red }}>Possible Medical Emergency</div>
          <div style={{ fontSize: 13.5, color: C.ink, marginTop: 3 }}>{reason} — please don't wait. A case has already been routed to the doctor's urgent queue.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, marginTop: 14 }}>
            {actions.map(({ label, icon: Icon }, i) => (
              <button key={i} style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(0,0,0,0.2)", color: C.ink, border: `1px solid rgba(226,73,91,0.3)`, borderRadius: 10, padding: "8px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                <Icon size={14} color={C.red} /> {label}
              </button>
            ))}
          </div>
          <button onClick={onDismiss} style={{ marginTop: 10, background: "none", border: "none", color: C.dim, fontSize: 11.5, cursor: "pointer", textDecoration: "underline" }}>
            This isn't an emergency, continue chatting
          </button>
        </div>
      </div>
    </Card>
  );
}

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  return (
    <div style={{ minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, padding: 24 }}>
      <div style={{ display: "flex", maxWidth: 780, width: "100%", borderRadius: 24, overflow: "hidden", border: `1px solid ${C.border}` }}>
        <div style={{ flex: 1, background: `linear-gradient(160deg, #0E1A26, ${C.blue})`, padding: 36, color: "#fff", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 420 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}><Pill size={18} /></div>
            <div style={{ fontWeight: 800, fontSize: 17 }}>MedAssist AI</div>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.3 }}>One shared copilot across your whole clinic.</div>
            <div style={{ fontSize: 13, opacity: 0.9, marginTop: 10, lineHeight: 1.6 }}>AI assists with triage and documentation. A doctor always confirms the final call.</div>
          </div>
          <div style={{ fontSize: 11.5, opacity: 0.8 }}>Riverside Community Clinic &middot; Secure Portal</div>
        </div>

        <div style={{ flex: 1, background: C.panel, padding: 36 }}>
          <div style={{ fontWeight: 800, fontSize: 19, color: C.ink }}>Sign in</div>
          <div style={{ fontSize: 12.5, color: C.dim, marginTop: 4, marginBottom: 24 }}>Access your MedAssist AI workspace</div>

          <label style={{ fontSize: 11.5, fontWeight: 700, color: C.dim }}>EMAIL</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@clinic.com"
            style={{ width: "100%", marginTop: 5, marginBottom: 14, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 14px", fontSize: 14, color: C.ink }} />

          <label style={{ fontSize: 11.5, fontWeight: 700, color: C.dim }}>PASSWORD</label>
          <input type="password" placeholder="••••••••"
            style={{ width: "100%", marginTop: 5, marginBottom: 22, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 14px", fontSize: 14, color: C.ink }} />

          <PillButton tone="blue" style={{ width: "100%", justifyContent: "center", padding: "11px 0" }} onClick={onLogin}>
            <ShieldCheck size={15} /> Sign in
          </PillButton>
          <div style={{ textAlign: "center", fontSize: 11.5, color: C.dim, marginTop: 14 }}>Demo login — no real credentials required</div>
        </div>
      </div>
    </div>
  );
}

export default function MedAssistApp() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState("chat");
  const [messages, setMessages] = useState([{ role: "assistant", content: "Hi, I'm here to help. What symptoms are you experiencing today?" }]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [summaries, setSummaries] = useState([]);
  const [selectedSummaryId, setSelectedSummaryId] = useState(null);
  const [reminders, setReminders] = useState({});
  const [emergency, setEmergency] = useState(null);
  const [historyFilter, setHistoryFilter] = useState("all");
  const scrollRef = useRef(null);

  // Medicine Lens (camera / photo upload identification)
  const [lensPhoto, setLensPhoto] = useState(null); // { dataUrl, base64, mediaType }
  const [lensNote, setLensNote] = useState("");
  const [lensResult, setLensResult] = useState(null);
  const [lensThinking, setLensThinking] = useState(false);
  const [lensError, setLensError] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const exchangeCount = messages.filter((m) => m.role === "user").length;

  async function sendMessage() {
    if (!input.trim() || thinking) return;
    const next = [...messages, { role: "user", content: input.trim() }];
    setMessages(next); setInput(""); setThinking(true);
    try {
      const reply = await callClaude(next, CLINIC_KNOWLEDGE);
      const flagMatch = reply && reply.match(/^EMERGENCY_FLAG:\s*(.+?)(?:\n|$)/i);
      if (flagMatch) {
        const reason = flagMatch[1].trim();
        const rest = reply.slice(flagMatch[0].length).trim();
        setMessages([...next, { role: "assistant", content: rest || "This may be a medical emergency — please see the alert above." }]);
        setEmergency({ reason });
        const id = Date.now();
        setSummaries((s) => [...s, {
          id, chiefComplaint: reason, duration: "just now", department: "Emergency", urgency: "urgent",
          flags: ["Auto-flagged by AI as possible emergency"], aiNote: `Emergency auto-detected: ${reason}`,
          status: "emergency", doctorNotes: "", createdAt: new Date().toLocaleString(),
        }]);
      } else {
        setMessages([...next, { role: "assistant", content: reply || "Sorry, could you rephrase that?" }]);
      }
    } catch {
      setMessages([...next, { role: "assistant", content: "Connection issue — please try again." }]);
    }
    setThinking(false);
  }

  async function generateSummary() {
    setThinking(true);
    const transcript = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
    const prompt = `Based on this conversation, output ONLY valid JSON with keys:
chiefComplaint (string, short), duration (string), department (string), urgency ("routine" or "urgent"),
flags (array of short strings), aiNote (one sentence summary for the doctor).
Conversation:\n${transcript}`;
    const result = await callClaude([{ role: "user", content: prompt }], "You output only raw JSON, nothing else.", true);
    setThinking(false);
    if (result) {
      const id = Date.now();
      setSummaries((s) => [...s, { id, ...result, status: "pending", doctorNotes: "", createdAt: new Date().toLocaleString() }]);
      setMessages((m) => [...m, { role: "assistant", content: "Thanks — I've sent a summary to the doctor's queue." }]);
    }
  }

  function updateSummary(id, patch) { setSummaries((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x))); }

  async function draftReminder(summary) {
    setThinking(true);
    const prompt = `Write a short, warm SMS reminder (under 300 characters) recommending a visit to
${summary.department} at Riverside Community Clinic for "${summary.chiefComplaint}". Just the message text.`;
    const text = await callClaude([{ role: "user", content: prompt }], "You write concise SMS reminders.");
    setThinking(false);
    setReminders((r) => ({ ...r, [summary.id]: text }));
  }

  async function startCamera() {
    setLensError(null);
    setLensResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setCameraActive(true);
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch {
      setLensError("Couldn't access the camera. Check permissions, or upload a photo instead.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setLensPhoto({ dataUrl, base64: dataUrl.split(",")[1], mediaType: "image/jpeg" });
    stopCamera();
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLensError(null);
    setLensResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setLensPhoto({ dataUrl, base64: dataUrl.split(",")[1], mediaType: file.type || "image/jpeg" });
    };
    reader.readAsDataURL(file);
  }

  function resetLens() {
    setLensPhoto(null);
    setLensResult(null);
    setLensError(null);
    setLensNote("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function identifyMedicine() {
    if (!lensPhoto || lensThinking) return;
    setLensThinking(true);
    setLensError(null);
    setLensResult(null);
    try {
      const reply = await callClaudeVision(lensPhoto.base64, lensPhoto.mediaType, MEDICINE_LENS_KNOWLEDGE, lensNote);
      setLensResult(reply || "I couldn't read anything useful from this photo — please try a clearer, well-lit shot, or ask a pharmacist directly.");
    } catch {
      setLensError("Connection issue while identifying the photo — please try again.");
    }
    setLensThinking(false);
  }

  if (!session) return <LoginScreen onLogin={() => setSession({})} />;

  const selectedSummary = summaries.find((s) => s.id === selectedSummaryId) || summaries.find((s) => s.status === "pending" || s.status === "emergency");
  const pendingCount = summaries.filter((s) => s.status === "pending" || s.status === "emergency").length;
  const historyItems = summaries.filter((s) => s.status === "solved" || s.status === "unsolved");
  const filteredHistory = historyFilter === "all" ? historyItems : historyItems.filter((s) => s.status === historyFilter);

  const tabs = [
    { key: "chat", label: "Chat", icon: MessageSquareText },
    { key: "medicine", label: "Medicine Assistant", icon: ScanLine },
    { key: "doctor", label: "Doctor", icon: Stethoscope, count: pendingCount },
    { key: "staff", label: "Staff", icon: Users },
    { key: "history", label: "History", icon: History },
    { key: "support", label: "Support", icon: LifeBuoy },
  ];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: C.bg, minHeight: "100%", color: C.ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes capsuleBounce { 0%,100% { transform: translateY(0); opacity: .5 } 50% { transform: translateY(-6px); opacity: 1 } }
        @keyframes dotPulse { 0%,100% { opacity: .4 } 50% { opacity: 1 } }
        @keyframes emergencyGlow { 0%,100% { box-shadow: 0 0 0px rgba(226,73,91,0.1) } 50% { box-shadow: 0 0 20px rgba(226,73,91,0.25) } }
        .ma-scroll::-webkit-scrollbar { width: 6px; }
        .ma-scroll::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
        ::placeholder { color: #566472; }
        button:focus-visible, input:focus-visible, textarea:focus-visible { outline: 2px solid ${C.blue}; outline-offset: 2px; }
      `}</style>

      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "14px 28px", background: "rgba(10,15,20,0.9)", position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(8px)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, maxWidth: 1080, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: C.blueSoft, display: "flex", alignItems: "center", justifyContent: "center" }}><Pill size={17} color={C.blue} /></div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16.5, lineHeight: 1 }}>MedAssist AI</div>
              <div style={{ fontSize: 10.5, color: C.dim, marginTop: 3 }}>Riverside Community Clinic</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", padding: 4, borderRadius: 999, flexWrap: "wrap", border: `1px solid ${C.border}` }}>
            {tabs.map(({ key, label, icon: Icon, count }) => (
              <button key={key} onClick={() => setView(key)} style={{
                display: "flex", alignItems: "center", gap: 6, border: "none", borderRadius: 999, padding: "7px 13px",
                fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                background: view === key ? C.blue : "transparent", color: view === key ? "#fff" : C.dim,
              }}>
                <Icon size={13} /> {label}
                {!!count && <span style={{ background: view === key ? "rgba(255,255,255,0.3)" : C.red, color: "#fff", fontSize: 10, padding: "1px 6px", borderRadius: 999 }}>{count}</span>}
              </button>
            ))}
          </div>

          <button onClick={() => setSession(null)} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", display: "flex" }}><LogOut size={16} /></button>
        </div>
      </div>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "26px 20px" }}>
        {view === "chat" && (
          <>
            {emergency && <EmergencyAlert reason={emergency.reason} onDismiss={() => setEmergency(null)} />}
            <Card style={{ overflow: "hidden" }}>
              <div ref={scrollRef} className="ma-scroll" style={{ height: 420, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
                {messages.map((m, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                    <div style={{
                      maxWidth: "72%", padding: "10px 15px", borderRadius: 16, fontSize: 14, lineHeight: 1.55,
                      background: m.role === "user" ? C.blue : "rgba(255,255,255,0.05)", color: "#fff",
                      border: m.role === "user" ? "none" : `1px solid ${C.border}`,
                      borderBottomRightRadius: m.role === "user" ? 4 : 16, borderBottomLeftRadius: m.role === "user" ? 16 : 4,
                    }}>{m.content}</div>
                  </div>
                ))}
                {thinking && <div style={{ display: "flex", gap: 8, alignItems: "center" }}><CapsuleLoader /> <span style={{ fontSize: 12, color: C.dim }}>thinking…</span></div>}
              </div>
              <div style={{ borderTop: `1px solid ${C.border}`, padding: 14, display: "flex", gap: 10, alignItems: "center" }}>
                <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Describe how you're feeling…"
                  style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 999, padding: "11px 18px", fontSize: 14, color: C.ink }} />
                <PillButton tone="blue" onClick={sendMessage} disabled={thinking} style={{ padding: "11px 14px" }}><Send size={16} /></PillButton>
                {exchangeCount >= 2 && <PillButton tone="outline" onClick={generateSummary} disabled={thinking}><Sparkles size={14} color={C.blue} /> End & summarize</PillButton>}
              </div>
            </Card>
          </>
        )}

        {view === "medicine" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Card style={{ padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: C.blueSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ScanLine size={20} color={C.blue} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 17 }}>Medicine Assistant</div>
                  <div style={{ fontSize: 12.5, color: C.dim, marginTop: 2 }}>Point your camera at a medicine strip, box, or pill — or upload a photo</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 14, background: C.blueSoft, borderRadius: 12, padding: 12 }}>
                <ShieldAlert size={15} color={C.blue} style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 12, color: C.ink, lineHeight: 1.5 }}>
                  For informational purposes only. AI photo identification isn't always accurate, especially for
                  loose or unmarked pills — always confirm with a pharmacist or doctor before taking anything.
                </div>
              </div>
            </Card>

            {lensError && (
              <Card style={{ padding: 16, background: C.redSoft, border: `1px solid rgba(226,73,91,0.4)`, display: "flex", alignItems: "center", gap: 10 }}>
                <AlertTriangle size={16} color={C.red} />
                <span style={{ fontSize: 13, color: C.ink }}>{lensError}</span>
              </Card>
            )}

            <Card style={{ padding: 22 }}>
              {!cameraActive && !lensPhoto && (
                <div style={{ textAlign: "center", padding: "34px 16px" }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: C.blueSoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                    <Camera size={26} color={C.blue} />
                  </div>
                  <div style={{ fontSize: 14, color: C.dim, marginBottom: 18 }}>No photo yet — use your camera or upload one to get started</div>
                  <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                    <PillButton tone="blue" onClick={startCamera}><Camera size={15} /> Use Camera</PillButton>
                    <PillButton tone="outline" onClick={() => fileInputRef.current?.click()}><Upload size={15} /> Upload Photo</PillButton>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: "none" }} />
                  </div>
                </div>
              )}

              {cameraActive && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                  <video ref={videoRef} autoPlay playsInline
                    style={{ width: "100%", maxWidth: 480, borderRadius: 16, background: "#000", border: `1px solid ${C.border}` }} />
                  <div style={{ display: "flex", gap: 10 }}>
                    <PillButton tone="blue" onClick={capturePhoto}><ScanLine size={15} /> Capture</PillButton>
                    <PillButton tone="outline" onClick={stopCamera}><X size={15} /> Cancel</PillButton>
                  </div>
                </div>
              )}

              {lensPhoto && !cameraActive && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                  <img src={lensPhoto.dataUrl} alt="Captured medicine"
                    style={{ width: "100%", maxWidth: 380, borderRadius: 16, border: `1px solid ${C.border}`, objectFit: "cover" }} />
                  <input value={lensNote} onChange={(e) => setLensNote(e.target.value)}
                    placeholder="Optional: anything you already know (e.g. strip color, where you found it)…"
                    style={{ width: "100%", maxWidth: 420, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 999, padding: "10px 16px", fontSize: 13, color: C.ink }} />
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                    <PillButton tone="blue" onClick={identifyMedicine} disabled={lensThinking}>
                      {lensThinking ? <CapsuleLoader /> : <Sparkles size={15} />} {lensThinking ? "Analyzing…" : "Identify Medicine"}
                    </PillButton>
                    <PillButton tone="outline" onClick={resetLens}><RotateCcw size={15} /> Retake</PillButton>
                  </div>
                </div>
              )}
            </Card>

            {lensResult && (
              <Card style={{ padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <Sparkles size={15} color={C.blue} />
                  <span style={{ fontWeight: 800, fontSize: 13.5 }}>AI Identification</span>
                </div>
                <div style={{ fontSize: 13.5, lineHeight: 1.6, color: C.ink }}>{lensResult}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14, fontSize: 11, color: C.dim }}>
                  <ShieldCheck size={12} /> Educational only — a pharmacist or doctor always makes the final call.
                </div>
              </Card>
            )}

            <canvas ref={canvasRef} style={{ display: "none" }} />
          </div>
        )}

        {view === "doctor" && (
          <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 18 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: 0.5 }}>Active Queue ({pendingCount})</div>
              {summaries.filter((s) => s.status === "pending" || s.status === "emergency").length === 0 && (
                <Card style={{ padding: 16, fontSize: 13, color: C.dim, borderStyle: "dashed" }}>No active cases right now.</Card>
              )}
              {summaries.filter((s) => s.status === "pending" || s.status === "emergency").map((s) => (
                <button key={s.id} onClick={() => setSelectedSummaryId(s.id)} style={{ textAlign: "left", cursor: "pointer", border: "none", padding: 0, background: "none" }}>
                  <Card style={{ padding: 13, borderLeft: `4px solid ${s.status === "emergency" ? C.red : C.blue}`, borderColor: selectedSummary?.id === s.id ? C.borderStrong : C.border }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 6, color: C.ink }}>{s.chiefComplaint}</div>
                    <StatusBadge status={s.status} />
                  </Card>
                </button>
              ))}
            </div>

            <Card style={{ padding: 22 }}>
              {!selectedSummary ? (
                <div style={{ color: C.dim, fontSize: 14 }}>Select a case from the queue to review.</div>
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 19 }}>{selectedSummary.chiefComplaint}</div>
                      <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>Duration: {selectedSummary.duration} &middot; {selectedSummary.createdAt}</div>
                    </div>
                    <StatusBadge status={selectedSummary.status} />
                  </div>

                  <div style={{ marginTop: 16, padding: 14, background: C.blueSoft, border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 13.5 }}>
                    <ClipboardList size={14} style={{ verticalAlign: -2, marginRight: 6 }} color={C.blue} />
                    Suggested department: <strong>{selectedSummary.department}</strong>
                  </div>

                  {selectedSummary.flags?.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: "uppercase", marginBottom: 6 }}>Flagged concerns</div>
                      {selectedSummary.flags.map((f, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5, marginBottom: 4 }}>
                          <AlertTriangle size={13} color={C.red} /> {f}
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop: 14, fontSize: 13.5, color: C.dim, fontStyle: "italic" }}>"{selectedSummary.aiNote}"</div>

                  <textarea placeholder="Add your clinical notes…" value={selectedSummary.doctorNotes}
                    onChange={(e) => updateSummary(selectedSummary.id, { doctorNotes: e.target.value })}
                    style={{ width: "100%", marginTop: 16, minHeight: 70, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 12, padding: 10, fontSize: 13.5, color: C.ink }} />

                  <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                    <PillButton tone="blue" onClick={() => updateSummary(selectedSummary.id, { status: "solved" })}><CheckCircle2 size={15} /> Confirm & Solve</PillButton>
                    <PillButton tone="red" onClick={() => updateSummary(selectedSummary.id, { status: "unsolved" })}><XCircle size={15} /> Reject</PillButton>
                    {selectedSummary.status !== "emergency" && (
                      <PillButton tone="outline" onClick={() => updateSummary(selectedSummary.id, { status: "emergency" })}><Siren size={14} color={C.red} /> Escalate</PillButton>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: C.dim, marginTop: 8 }}>AI assists triage — final decision always confirmed by the doctor.</div>
                </>
              )}
            </Card>
          </div>
        )}

        {view === "staff" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <Card style={{ padding: 16, flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 11.5, color: C.dim, fontWeight: 700, textTransform: "uppercase" }}>Total cases</div>
                <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6, color: C.blue }}>{summaries.length}</div>
              </Card>
              <Card style={{ padding: 16, flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 11.5, color: C.dim, fontWeight: 700, textTransform: "uppercase" }}>Emergency</div>
                <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6, color: C.red }}>{summaries.filter((s) => s.status === "emergency").length}</div>
              </Card>
              <Card style={{ padding: 16, flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 11.5, color: C.dim, fontWeight: 700, textTransform: "uppercase" }}>Solved</div>
                <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6, color: C.ink }}>{summaries.filter((s) => s.status === "solved").length}</div>
              </Card>
            </div>

            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.dim, textTransform: "uppercase" }}>Cases</div>
            {summaries.length === 0 && <Card style={{ padding: 16, fontSize: 13, color: C.dim, borderStyle: "dashed" }}>No cases yet.</Card>}
            {summaries.map((s) => (
              <Card key={s.id} style={{ padding: 16, borderLeft: `4px solid ${STATUS_STYLE[s.status].color}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{s.chiefComplaint} — {s.department}</div>
                    <div style={{ fontSize: 11.5, color: C.dim, marginTop: 4, display: "flex", gap: 8, alignItems: "center" }}>
                      <Clock size={12} /> {s.duration} <StatusBadge status={s.status} />
                    </div>
                  </div>
                  <PillButton tone="soft" onClick={() => draftReminder(s)} disabled={thinking}><FileText size={13} /> Draft reminder</PillButton>
                </div>
                {reminders[s.id] && <div style={{ marginTop: 10, background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, fontSize: 13 }}>{reminders[s.id]}</div>}
              </Card>
            ))}
          </div>
        )}

        {view === "history" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", gap: 6 }}>
              {["all", "solved", "unsolved"].map((f) => (
                <button key={f} onClick={() => setHistoryFilter(f)} style={{
                  border: "none", borderRadius: 999, padding: "7px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                  background: historyFilter === f ? C.blue : "rgba(255,255,255,0.05)", color: historyFilter === f ? "#fff" : C.dim, textTransform: "capitalize",
                }}>{f}</button>
              ))}
            </div>
            {filteredHistory.length === 0 && <Card style={{ padding: 16, fontSize: 13, color: C.dim, borderStyle: "dashed" }}>No resolved cases yet — confirm or reject a case in the Doctor tab.</Card>}
            <div style={{ display: "flex", flexDirection: "column" }}>
              {filteredHistory.map((s, i) => (
                <div key={s.id} style={{ display: "flex", gap: 14 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: 10, height: 10, borderRadius: 999, background: STATUS_STYLE[s.status].color, marginTop: 6 }} />
                    {i < filteredHistory.length - 1 && <div style={{ width: 2, flex: 1, background: C.border }} />}
                  </div>
                  <Card style={{ padding: 14, marginBottom: 14, flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{s.chiefComplaint}</div>
                      <StatusBadge status={s.status} />
                    </div>
                    <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>{s.department} &middot; {s.createdAt}</div>
                    {s.doctorNotes && <div style={{ fontSize: 12.5, marginTop: 8 }}>Doctor notes: {s.doctorNotes}</div>}
                  </Card>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === "support" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Card style={{ padding: 20, background: C.redSoft, border: `1px solid rgba(226,73,91,0.4)`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}><Siren size={22} color={C.red} /></div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: C.red }}>Need immediate help?</div>
                  <div style={{ fontSize: 12.5, color: C.ink }}>National ambulance number — available 24/7</div>
                </div>
              </div>
              <PillButton tone="red" style={{ padding: "11px 20px" }}><PhoneCall size={15} /> Call Ambulance — 108</PillButton>
            </Card>

            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.dim, textTransform: "uppercase" }}>Nearby hospitals</div>
            {NEARBY_HOSPITALS.map((h, i) => (
              <Card key={i} style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: C.blueSoft, display: "flex", alignItems: "center", justifyContent: "center" }}><MapPin size={18} color={C.blue} /></div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{h.name}</div>
                    <div style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>{h.type} &middot; {h.distance} &middot; ~{h.eta}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <PillButton tone="outline"><PhoneCall size={13} /> Call</PillButton>
                  <PillButton tone="soft"><Navigation size={13} /> Directions</PillButton>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
