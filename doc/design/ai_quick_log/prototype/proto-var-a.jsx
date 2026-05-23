/* global React, useAccent, MOCK, SproutIcon, ActionIcon, AIBadge, KidAvatar, PhotoTile, TabBar, Eyebrow, WorkingDots, CTA, Card, kidsInClass, findClass, RosterScreen, TodayCalendar, MyClassesList, makeInitialJob, AIChatList, AIConversation */
const { useState, useEffect, useRef } = React;

// ═══════════════════════════════════════════════════════════════════════
// VARIATION A — "Composer Sheet" + AI chat conversation.
//
// Home → Quick Log half-sheet (record + photos + scope) → on Send, jump
// straight into a new AI chat thread where photo matching, draft review,
// and sending all happen as inline cards inside the conversation.
// ═══════════════════════════════════════════════════════════════════════
function PhoneA() {
  const a = useAccent();
  const [tab, setTab] = useState("home");
  const [homeScreen, setHomeScreen] = useState("home"); // home | roster
  const [selClass, setSelClass] = useState("sunflowers");
  const [sheet, setSheet] = useState(false);

  // The active Quick Log job — null when no job is in flight.
  const [job, setJob] = useState(null);
  const [aiScreen, setAiScreen] = useState("list"); // list | conversation

  const updateJob = (patch) => setJob(j => j ? { ...j, ...patch } : j);

  const onQuickLogSend = ({ classId }) => {
    setSheet(false);
    const newJob = makeInitialJob({ classId });
    setJob(newJob);
    setTab("ai");
    setAiScreen("conversation");
  };

  const openRoster = (id) => {
    setSelClass(id);
    setHomeScreen("roster");
  };

  const headerStyle = { padding: "60px 20px 14px", flex: "0 0 auto" };

  // ── HOME ────────────────────────────────────────────────────────────
  function Home() {
    return (
      <div className="sp-screen" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={headerStyle}>
          <Eyebrow>Tuesday · 14 May</Eyebrow>
          <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.6, marginTop: 4 }}>Good morning, Aria</div>
        </div>

        <div className="sp-noscroll" style={{ flex: 1, overflow: "auto", padding: "4px 20px 20px" }}>
          {/* AI / Quick Log entry — kept on Home */}
          <Card style={{ marginBottom: 22, background: `linear-gradient(135deg, ${a.tint} 0%, ${a.bg} 100%)`, border: `1px solid ${a.tint}`, boxShadow: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 20, background: a.accent, color: "white", display: "grid", placeItems: "center", flex: "0 0 auto" }}>
                <ActionIcon.Mic size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>Quick Log</span>
                  <AIBadge small />
                </div>
                <div style={{ fontSize: 12, color: "rgba(60,60,67,0.6)", marginTop: 1 }}>Speak, snap, send to families</div>
              </div>
              <button onClick={() => setSheet(true)} style={{
                background: a.accent, color: "white", border: "none",
                borderRadius: 10, padding: "8px 12px", fontSize: 13, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}>Start</button>
            </div>

            {/* Active job nudge */}
            {job && job.phase !== "sent" && (
              <div onClick={() => { setTab("ai"); setAiScreen("conversation"); }} style={{
                marginTop: 12, padding: "10px 12px", background: "rgba(255,255,255,0.65)",
                borderRadius: 10, fontSize: 12, color: a.accent, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
              }}>
                <WorkingDots color={a.accent} />
                <span>Today's Quick Log — open chat</span>
                <span style={{ flex: 1 }} />
                <ActionIcon.ChevronRight size={14} />
              </div>
            )}
          </Card>

          {/* Today's calendar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <Eyebrow>Today's schedule</Eyebrow>
            <span style={{ fontSize: 11, color: "rgba(60,60,67,0.5)" }}>8 items</span>
          </div>
          <Card style={{ padding: "4px 12px 8px", marginBottom: 22 }}>
            <TodayCalendar />
          </Card>

          {/* My Classes */}
          <Eyebrow style={{ marginBottom: 8 }}>My Classes · {MOCK.classes.length}</Eyebrow>
          <MyClassesList onOpenClass={openRoster} />
        </div>
      </div>
    );
  }

  // ── COMPOSE SHEET (Quick Log composer) ──────────────────────────────
  function ComposeSheet() {
    const [recording, setRecording] = useState(true);
    const [seconds, setSeconds] = useState(8);
    const [scope, setScope] = useState("sunflowers"); // single-class for proto
    const cls = findClass(scope);
    const sunKids = kidsInClass(scope);

    useEffect(() => {
      if (!recording) return;
      const t = setInterval(() => setSeconds(s => s + 1), 1000);
      return () => clearInterval(t);
    }, [recording]);

    return (
      <div onClick={() => setSheet(false)} style={{
        position: "absolute", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.42)",
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
      }}>
        <div onClick={e => e.stopPropagation()} className="sp-sheet" style={{
          background: "white",
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: "10px 20px 30px",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.12)",
        }}>
          {/* grabber */}
          <div style={{ width: 36, height: 5, borderRadius: 3, background: "rgba(0,0,0,0.15)", margin: "0 auto 14px" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ fontSize: 20, fontWeight: 600 }}>Quick Log</div>
            <button onClick={() => setSheet(false)} style={{ background: "transparent", border: "none", padding: 6, cursor: "pointer", color: "#3a4a3f" }}>
              <ActionIcon.X size={20} />
            </button>
          </div>
          <div style={{ fontSize: 13, color: "rgba(60,60,67,0.6)", marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
            <AIBadge small /> Speak, snap, send. We'll write to families.
          </div>

          {/* mic / waveform */}
          <div style={{
            background: a.bg, borderRadius: 16, padding: "20px 16px",
            display: "flex", alignItems: "center", gap: 14,
            marginBottom: 12,
          }}>
            <div style={{ position: "relative" }}>
              <button onClick={() => setRecording(r => !r)} style={{
                width: 52, height: 52, borderRadius: 26, background: a.accent,
                border: "none", color: "white",
                display: "grid", placeItems: "center", cursor: "pointer", fontFamily: "inherit",
              }}>
                {recording ? <ActionIcon.Pause size={22} /> : <ActionIcon.Mic size={22} />}
              </button>
              {recording && (
                <div style={{
                  position: "absolute", inset: 0, borderRadius: 26,
                  border: `2px solid ${a.accent}`, animation: "sp-ring 1.6s infinite",
                  pointerEvents: "none",
                }} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: a.accent }}>
                {recording ? "Recording…" : "Paused"}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 2, marginTop: 6, height: 24 }}>
                {Array.from({ length: 28 }).map((_, i) => {
                  const h = 6 + Math.abs(Math.sin(i * 0.7 + (recording ? seconds : 0))) * 18;
                  return <div key={i} style={{ width: 3, height: h, borderRadius: 2, background: a.accent, opacity: recording ? 0.7 : 0.25 }} />;
                })}
              </div>
            </div>
            <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, color: "#3a4a3f", fontVariantNumeric: "tabular-nums" }}>
              0:{String(seconds).padStart(2, "0")}
            </div>
          </div>

          {/* photos row */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Photos · {MOCK.photos.length}</span>
              <span style={{ fontSize: 13, color: a.accent, fontWeight: 500 }}>+ Add</span>
            </div>
            <div style={{ display: "flex", gap: 8, overflowX: "auto" }} className="sp-noscroll">
              {MOCK.photos.map(p => <PhotoTile key={p.id} photo={p} size={64} radius={12} />)}
            </div>
          </div>

          {/* scope pill */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
            padding: "10px 14px", background: a.bg, borderRadius: 12,
          }}>
            <SproutIcon.Home size={16} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>{cls.name} · {sunKids.length} kids</span>
            <span style={{ flex: 1 }} />
            <ActionIcon.ChevronRight size={14} />
          </div>

          <CTA onClick={() => onQuickLogSend({ classId: scope })}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <ActionIcon.Send size={16} /> Send to AI
            </span>
          </CTA>
        </div>
      </div>
    );
  }

  // ── ROUTING ─────────────────────────────────────────────────────────
  let content;
  if (tab === "home") {
    content = homeScreen === "roster"
      ? <RosterScreen
          classId={selClass}
          onBack={() => setHomeScreen("home")}
          onQuickLog={() => setSheet(true)}
        />
      : <Home />;
  } else if (tab === "ai") {
    content = (aiScreen === "conversation" && job)
      ? <AIConversation
          job={job}
          onBack={() => setAiScreen("list")}
          onUpdateJob={updateJob}
        />
      : <AIChatList job={job} onOpenJob={() => setAiScreen("conversation")} />;
  } else {
    content = <PlaceholderTab name={tab} />;
  }

  const aiWorking = job && (job.phase === "thinking" || job.phase === "writing" || job.phase === "sending");

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#fbfaf6", position: "relative" }}>
      {sheet && <ComposeSheet />}
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>{content}</div>
      <TabBar active={tab} onChange={(t) => {
        setTab(t);
        setHomeScreen("home");
        if (t === "ai") setAiScreen(job ? "conversation" : "list");
      }} working={aiWorking} />
    </div>
  );
}

// Generic placeholder for non-focal tabs
function PlaceholderTab({ name }) {
  return (
    <div className="sp-screen" style={{
      height: "100%", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      color: "rgba(60,60,67,0.45)", fontSize: 14, textAlign: "center", padding: 40,
    }}>
      <SproutIcon.Settings size={42} />
      <div style={{ marginTop: 12 }}>{name[0].toUpperCase() + name.slice(1)} tab<br/><span style={{ fontSize: 12 }}>(out of scope for this prototype)</span></div>
    </div>
  );
}

window.PhoneA = PhoneA;
window.PlaceholderTab = PlaceholderTab;
