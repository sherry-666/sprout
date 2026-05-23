/* global React, useAccent, MOCK, SproutIcon, ActionIcon, AIBadge, KidAvatar, PhotoTile, Eyebrow, WorkingDots, CTA, Card, ClassGlyph, kidsInClass, findClass */
const { useState: useStateChat, useEffect: useEffectChat, useRef: useRefChat, useMemo: useMemoChat } = React;

// ═══════════════════════════════════════════════════════════════════════
// AI tab — conversational interface for Quick Log jobs.
//
// Each Quick Log opens (or pins) a chat thread. The thread walks the
// educator through:
//   1. Photo matching      (inline interactive card — drag photos to kids,
//                           tap to toggle assignment, skip kids, add kids)
//   2. Draft review        (per-kid editable cards — make warmer / shorter)
//   3. Sent confirmation
//
// All state lives on a single `job` object passed by the parent so the
// chat list can show progress and the conversation can mutate it.
// ═══════════════════════════════════════════════════════════════════════

// ── Initial job factory — call this in the parent when a Quick Log
//    sheet is sent. Captures the transcript, raw photos, and a seed
//    assignment guess (one kid per photo, unassigned photos kept blank).
function makeInitialJob({ classId, photos = MOCK.photos, transcript = MOCK.transcript }) {
  const matches = {};
  for (const p of photos) {
    matches[p.id] = p.kid ? [p.kid] : [];
  }
  // Seed with whichever kids already appear in matches; an educator can add more.
  const seedKids = new Set();
  Object.values(matches).flat().forEach((k) => seedKids.add(k));
  return {
    id: `qlj-${Date.now()}`,
    classId,
    createdAt: new Date(),
    phase: "thinking", // thinking | matching | writing | drafted | sending | sent
    photos,
    transcript,
    matches,                     // photoId -> [kidId, ...]
    includedKids: [...seedKids], // kids who will get an update
  };
}

function phaseLabel(p) {
  return ({
    thinking: "Scanning photos…",
    matching: "Review photo matching",
    writing:  "Writing updates…",
    drafted:  "Drafts ready · review",
    sending:  "Sending…",
    sent:     "Sent",
  })[p] ?? "";
}

// ═══════════════════════════════════════════════════════════════════════
// AI tab — chat list
// ═══════════════════════════════════════════════════════════════════════
function AIChatList({ job, onOpenJob }) {
  const a = useAccent();
  const cls = job ? findClass(job.classId) : null;

  const HISTORY = [
    { id: "h1", classId: "sunflowers",   when: "Yesterday · 4:32 PM", subtitle: "Sent to 12 families · 8 photos" },
    { id: "h2", classId: "caterpillars", when: "Mon · 4:18 PM",        subtitle: "Sent to 7 families · 5 photos" },
    { id: "h3", classId: "sunflowers",   when: "Fri · 5:01 PM",        subtitle: "Sent to 11 families · 12 photos" },
  ];

  return (
    <div className="sp-screen" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "60px 20px 14px", flex: "0 0 auto" }}>
        <Eyebrow>Conversations</Eyebrow>
        <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.6, marginTop: 4 }}>AI</div>
      </div>

      <div className="sp-noscroll" style={{ flex: 1, overflow: "auto", padding: "4px 20px 20px" }}>
        {/* ACTIVE THREAD (pinned) */}
        {job && (
          <>
            <Eyebrow style={{ marginBottom: 8 }}>In progress</Eyebrow>
            <button onClick={() => onOpenJob(job.id)} style={{
              width: "100%", textAlign: "left", border: "none", padding: 0,
              background: "transparent", cursor: "pointer", fontFamily: "inherit", marginBottom: 22,
            }}>
              <Card style={{
                border: `1.5px solid ${a.tint}`,
                background: `linear-gradient(135deg, ${a.tint} 0%, ${a.bg} 100%)`,
                boxShadow: "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ position: "relative", width: 40, height: 40, flex: "0 0 auto" }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 20, background: a.accent,
                      color: "white", display: "grid", placeItems: "center",
                    }}>
                      <SproutIcon.SparkSmall size={16} />
                    </div>
                    {(job.phase === "thinking" || job.phase === "writing" || job.phase === "sending") && (
                      <div style={{
                        position: "absolute", inset: 0, borderRadius: 20,
                        border: `2px solid ${a.accent}`, animation: "sp-ring 1.6s infinite",
                      }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 15, fontWeight: 600 }}>Today's Quick Log</span>
                      <AIBadge small />
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(60,60,67,0.65)", marginTop: 2 }}>
                      {cls?.name} · {job.photos.length} photos
                    </div>
                  </div>
                  <div style={{ color: a.accent, display: "flex", alignItems: "center", gap: 4 }}>
                    {(job.phase === "thinking" || job.phase === "writing" || job.phase === "sending") && (
                      <WorkingDots color={a.accent} />
                    )}
                  </div>
                </div>
                <div style={{
                  marginTop: 12, padding: "8px 12px",
                  background: "rgba(255,255,255,0.65)",
                  borderRadius: 10, fontSize: 13,
                  color: a.accent, fontWeight: 600,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <span>{phaseLabel(job.phase)}</span>
                  <ActionIcon.ChevronRight size={14} />
                </div>
              </Card>
            </button>
          </>
        )}

        {/* HISTORY */}
        <Eyebrow style={{ marginBottom: 8 }}>Earlier</Eyebrow>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {HISTORY.map(h => {
            const c = findClass(h.classId);
            return (
              <div key={h.id} style={{
                background: "white", borderRadius: 14, padding: "12px 14px",
                display: "flex", alignItems: "center", gap: 12,
                boxShadow: "0 1px 0 rgba(0,0,0,0.04), 0 6px 16px -14px rgba(20,40,30,0.10)",
              }}>
                <ClassGlyph cls={c} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name} Quick Log</div>
                  <div style={{ fontSize: 12, color: "rgba(60,60,67,0.55)", marginTop: 1 }}>{h.subtitle}</div>
                </div>
                <div style={{ fontSize: 11, color: "rgba(60,60,67,0.5)" }}>{h.when}</div>
              </div>
            );
          })}
        </div>

        {/* EMPTY STATE — only when there's no active job AND no history */}
        {!job && false && (
          <div style={{ padding: "60px 20px", textAlign: "center", color: "rgba(60,60,67,0.6)", fontSize: 14, lineHeight: 1.5 }}>
            <SproutIcon.AI size={48} />
            <div style={{ marginTop: 14 }}>No conversations yet.<br/>Start a Quick Log from Home to begin.</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// AI conversation — the chat thread
// ═══════════════════════════════════════════════════════════════════════
function AIConversation({ job, onBack, onUpdateJob }) {
  const a = useAccent();
  const cls = findClass(job.classId);
  const scrollerRef = useRefChat(null);

  // Auto-scroll to bottom when phase advances
  useEffectChat(() => {
    const el = scrollerRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  }, [job.phase, job.includedKids?.length]);

  // Simulated backend transitions
  useEffectChat(() => {
    if (job.phase === "thinking") {
      const t = setTimeout(() => onUpdateJob({ phase: "matching" }), 1800);
      return () => clearTimeout(t);
    }
    if (job.phase === "writing") {
      const t = setTimeout(() => onUpdateJob({ phase: "drafted" }), 2200);
      return () => clearTimeout(t);
    }
    if (job.phase === "sending") {
      const t = setTimeout(() => onUpdateJob({ phase: "sent" }), 1200);
      return () => clearTimeout(t);
    }
  }, [job.phase]);

  const setMatches = (next) => onUpdateJob({ matches: next });
  const setIncluded = (next) => onUpdateJob({ includedKids: next });

  return (
    <div className="sp-screen" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* HEADER */}
      <div style={{ padding: "56px 16px 12px", flex: "0 0 auto", borderBottom: "1px solid rgba(0,0,0,0.05)", background: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onBack} style={{
            background: "transparent", border: "none", padding: 4, color: a.accent, cursor: "pointer",
            display: "flex", alignItems: "center", fontFamily: "inherit",
          }}>
            <ActionIcon.ChevronLeft size={22} />
          </button>
          <div style={{ width: 36, height: 36, borderRadius: 18, background: a.accent, color: "white", display: "grid", placeItems: "center", flex: "0 0 auto" }}>
            <SproutIcon.SparkSmall size={14} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.2 }}>Today's Quick Log</div>
            <div style={{ fontSize: 11, color: "rgba(60,60,67,0.6)", marginTop: 1 }}>
              {cls.name} · {job.photos.length} photos · {job.includedKids.length} kids
            </div>
          </div>
        </div>
      </div>

      {/* CHAT BODY */}
      <div ref={scrollerRef} className="sp-noscroll" style={{ flex: 1, overflow: "auto", padding: "16px 12px 20px" }}>

        {/* user message — initial Quick Log input */}
        <UserMessage time={fmtTime(job.createdAt)}>
          <div style={{ fontStyle: "italic", fontSize: 14, lineHeight: 1.5, color: "white" }}>
            "{job.transcript}"
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, marginTop: 10 }}>
            {job.photos.map(p => <PhotoTile key={p.id} photo={p} size="100%" radius={6} />)}
          </div>
        </UserMessage>

        {/* AI: thinking */}
        {job.phase === "thinking" && (
          <AIThinking text="Looking at your photos…" accent={a} />
        )}

        {/* AI: matching prompt + interactive card */}
        {job.phase !== "thinking" && (
          <>
            <AIMessage accent={a} time={fmtTime(job.createdAt, 1)}>
              I matched <strong>{job.photos.length} photos</strong> to <strong>{job.includedKids.length} kids</strong>.
              {" "}Drag a photo to a kid to add it (a photo can go to multiple kids).
              {" "}Tap the eye to skip a kid for today.
            </AIMessage>
            <PhotoMatchingCard
              job={job}
              setMatches={setMatches}
              setIncluded={setIncluded}
              readOnly={job.phase !== "matching"}
            />
          </>
        )}

        {/* User confirms matches */}
        {(job.phase === "writing" || job.phase === "drafted" || job.phase === "sending" || job.phase === "sent") && (
          <UserMessage time={fmtTime(job.createdAt, 3)}>
            <div style={{ fontSize: 14, color: "white" }}>
              Looks good — write {job.includedKids.length} updates.
            </div>
          </UserMessage>
        )}

        {/* AI: writing */}
        {job.phase === "writing" && (
          <AIThinking text={`Writing ${job.includedKids.length} updates…`} accent={a} />
        )}

        {/* AI: drafts ready prompt + cards */}
        {(job.phase === "drafted" || job.phase === "sending" || job.phase === "sent") && (
          <>
            <AIMessage accent={a} time={fmtTime(job.createdAt, 4)}>
              Here are <strong>{job.includedKids.length} drafts</strong>. Edit anything that doesn't sound like you,
              then send them out.
            </AIMessage>
            <DraftsCard job={job} readOnly={job.phase !== "drafted"} />
          </>
        )}

        {/* User sends */}
        {(job.phase === "sending" || job.phase === "sent") && (
          <UserMessage time={fmtTime(job.createdAt, 6)}>
            <div style={{ fontSize: 14, color: "white" }}>Send to all {job.includedKids.length} families.</div>
          </UserMessage>
        )}

        {/* AI: sending */}
        {job.phase === "sending" && (
          <AIThinking text="Sending to families…" accent={a} />
        )}

        {/* AI: sent confirmation */}
        {job.phase === "sent" && (
          <AIMessage accent={a} time={fmtTime(job.createdAt, 7)}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: a.accent, fontWeight: 600 }}>
              <ActionIcon.CheckCircle size={18} /> Sent to {job.includedKids.length} families
            </div>
            <div style={{ fontSize: 12, color: "rgba(60,60,67,0.6)", marginTop: 4 }}>
              Parents will see the update in their feed.
            </div>
          </AIMessage>
        )}
      </div>

      {/* STICKY ACTION BAR */}
      <div style={{
        padding: "10px 16px 14px",
        borderTop: "1px solid rgba(0,0,0,0.05)",
        background: "white",
        flex: "0 0 auto",
      }}>
        {job.phase === "matching" && (
          <CTA onClick={() => onUpdateJob({ phase: "writing" })} disabled={job.includedKids.length === 0}>
            Confirm matches · write {job.includedKids.length} update{job.includedKids.length === 1 ? "" : "s"}
          </CTA>
        )}
        {job.phase === "drafted" && (
          <CTA onClick={() => onUpdateJob({ phase: "sending" })}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <ActionIcon.Send size={16} /> Send to {job.includedKids.length} families
            </span>
          </CTA>
        )}
        {(job.phase === "thinking" || job.phase === "writing" || job.phase === "sending") && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 8, padding: "13px 16px", borderRadius: 14,
            background: a.bg, color: a.accent, fontSize: 14, fontWeight: 500,
          }}>
            <WorkingDots color={a.accent} />
            <span>{phaseLabel(job.phase)}</span>
          </div>
        )}
        {job.phase === "sent" && (
          <button onClick={onBack} style={{
            width: "100%", padding: "13px 16px", borderRadius: 14,
            border: `1.5px solid ${a.accent}`, background: "transparent", color: a.accent,
            fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}>Back to AI</button>
        )}
      </div>
    </div>
  );
}

// ── Chat row primitives ────────────────────────────────────────────────
function UserMessage({ children, time }) {
  const a = useAccent();
  return (
    <div className="sp-screen" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", marginBottom: 12 }}>
      <div style={{
        maxWidth: "82%", padding: 12,
        background: a.accent, borderRadius: 16, borderBottomRightRadius: 4,
      }}>
        {children}
      </div>
      {time && (
        <div style={{ fontSize: 10, color: "rgba(60,60,67,0.5)", marginTop: 4, marginRight: 4 }}>{time}</div>
      )}
    </div>
  );
}

function AIMessage({ children, time, accent }) {
  return (
    <div className="sp-screen" style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 12 }}>
      <div style={{
        width: 24, height: 24, borderRadius: 12, background: accent.accent, color: "white",
        display: "grid", placeItems: "center", flex: "0 0 auto", marginTop: 2,
      }}>
        <SproutIcon.SparkSmall size={11} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, lineHeight: 1.5, color: "#1d2a22",
          padding: "10px 14px", background: "white", borderRadius: 16, borderTopLeftRadius: 4,
          boxShadow: "0 1px 0 rgba(0,0,0,0.04)",
        }}>
          {children}
        </div>
        {time && (
          <div style={{ fontSize: 10, color: "rgba(60,60,67,0.5)", marginTop: 4, marginLeft: 6 }}>{time}</div>
        )}
      </div>
    </div>
  );
}

function AIThinking({ text, accent }) {
  return (
    <div className="sp-screen" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, paddingLeft: 32 }}>
      <WorkingDots color={accent.accent} />
      <span style={{ fontSize: 13, color: "rgba(60,60,67,0.65)", fontStyle: "italic" }}>{text}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Photo matching card — drag photos from carousel to kid cards.
// Tap-to-assign also works as a fallback.
// ═══════════════════════════════════════════════════════════════════════
function PhotoMatchingCard({ job, setMatches, setIncluded, readOnly }) {
  const a = useAccent();
  const cls = findClass(job.classId);
  const classKids = kidsInClass(job.classId);

  // Drag state — { photoId, x, y, w, h, startedAt } | null
  const [drag, setDrag] = useStateChat(null);
  const dropTargetRef = useRefChat(null); // currently hovered kid id

  // Add-kid sheet
  const [showAddKid, setShowAddKid] = useStateChat(false);

  const onPointerDown = (e, photoId) => {
    if (readOnly) return;
    const target = e.currentTarget;
    const r = target.getBoundingClientRect();
    e.preventDefault();
    e.stopPropagation();
    target.setPointerCapture?.(e.pointerId);
    setDrag({ photoId, x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2, sx: e.clientX, sy: e.clientY, w: r.width, h: r.height });
  };

  useEffectChat(() => {
    if (!drag) return;
    const move = (e) => {
      setDrag(d => d && ({ ...d, sx: e.clientX, sy: e.clientY }));
      // Identify drop target via elementFromPoint
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const drop = el && el.closest?.("[data-kid-drop]");
      const kidId = drop?.dataset?.kidDrop ?? null;
      if (dropTargetRef.current !== kidId) {
        dropTargetRef.current = kidId;
        // Highlight active drop zone via CSS class toggle
        document.querySelectorAll("[data-kid-drop]").forEach(n => {
          n.classList.toggle("dragover", n.dataset.kidDrop === kidId);
        });
      }
    };
    const up = (e) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const drop = el && el.closest?.("[data-kid-drop]");
      const kidId = drop?.dataset?.kidDrop;
      if (kidId && drag) {
        // Assign (toggle add)
        const next = { ...job.matches };
        const arr = next[drag.photoId] ? [...next[drag.photoId]] : [];
        if (!arr.includes(kidId)) arr.push(kidId);
        next[drag.photoId] = arr;
        setMatches(next);
        // If not yet included, include
        if (!job.includedKids.includes(kidId)) {
          setIncluded([...job.includedKids, kidId]);
        }
      }
      document.querySelectorAll("[data-kid-drop]").forEach(n => n.classList.remove("dragover"));
      dropTargetRef.current = null;
      setDrag(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [drag, job.matches, job.includedKids]);

  // Tap a photo's chip to remove from a kid
  const removePhotoFromKid = (photoId, kidId) => {
    if (readOnly) return;
    const next = { ...job.matches };
    next[photoId] = (next[photoId] || []).filter(k => k !== kidId);
    setMatches(next);
  };

  const toggleSkipKid = (kidId) => {
    if (readOnly) return;
    if (job.includedKids.includes(kidId)) {
      setIncluded(job.includedKids.filter(k => k !== kidId));
    } else {
      setIncluded([...job.includedKids, kidId]);
    }
  };

  const addClassKid = (kidId) => {
    setShowAddKid(false);
    if (!job.includedKids.includes(kidId)) setIncluded([...job.includedKids, kidId]);
  };

  const includedKidObjects = job.includedKids
    .map(id => classKids.find(k => k.id === id))
    .filter(Boolean);

  // Unmatched photos (zero kids assigned) — surfaced to user
  const unmatchedPhotos = job.photos.filter(p => (job.matches[p.id] || []).length === 0);
  const availableToAdd = classKids.filter(k => !job.includedKids.includes(k.id));

  return (
    <div style={{
      background: "white", borderRadius: 16, padding: 14, marginBottom: 12,
      boxShadow: "0 1px 0 rgba(0,0,0,0.04), 0 8px 24px -18px rgba(20,40,30,0.10)",
      border: "1px solid rgba(0,0,0,0.05)",
      position: "relative",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <Eyebrow>Photo matching</Eyebrow>
        {unmatchedPhotos.length > 0 && !readOnly && (
          <span style={{ fontSize: 11, color: a.accent, fontWeight: 600, background: a.tint, padding: "2px 8px", borderRadius: 8 }}>
            {unmatchedPhotos.length} unmatched
          </span>
        )}
      </div>

      {/* Photo carousel */}
      <div className="sp-noscroll" style={{
        display: "flex", gap: 6, overflowX: "auto", padding: "4px 0 8px",
        margin: "0 -14px", paddingLeft: 14, paddingRight: 14,
        touchAction: drag ? "none" : "pan-x",
      }}>
        {job.photos.map(p => {
          const assigned = job.matches[p.id] || [];
          const isDragging = drag?.photoId === p.id;
          return (
            <div key={p.id} onPointerDown={(e) => onPointerDown(e, p.id)} style={{
              position: "relative", width: 68, height: 68, borderRadius: 10,
              flex: "0 0 auto", cursor: readOnly ? "default" : "grab",
              opacity: isDragging ? 0.3 : 1,
              touchAction: "none",
              userSelect: "none",
            }}>
              <PhotoTile photo={p} size={68} radius={10} />
              {/* assigned kid chips */}
              {assigned.length > 0 && (
                <div style={{
                  position: "absolute", left: 4, bottom: 4,
                  display: "flex",
                }}>
                  {assigned.slice(0, 3).map((kid, i) => {
                    const k = classKids.find(c => c.id === kid);
                    if (!k) return null;
                    return (
                      <div key={kid} style={{ marginLeft: i === 0 ? 0 : -6 }}>
                        <KidAvatar kid={k} size={18} />
                      </div>
                    );
                  })}
                  {assigned.length > 3 && (
                    <div style={{
                      marginLeft: -6, width: 18, height: 18, borderRadius: 9,
                      background: "rgba(0,0,0,0.6)", color: "white", fontSize: 10, fontWeight: 600,
                      display: "grid", placeItems: "center",
                    }}>+{assigned.length - 3}</div>
                  )}
                </div>
              )}
              {assigned.length === 0 && (
                <div style={{
                  position: "absolute", top: 4, right: 4,
                  width: 16, height: 16, borderRadius: 8,
                  background: a.accent, color: "white",
                  fontSize: 11, fontWeight: 700,
                  display: "grid", placeItems: "center",
                }}>!</div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 11, color: "rgba(60,60,67,0.55)", marginTop: 4, marginBottom: 12 }}>
        {readOnly ? "Photos as matched" : "Drag a photo onto a kid below ↓"}
      </div>

      {/* Kid drop zones */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {includedKidObjects.map(k => {
          const myPhotos = job.photos.filter(p => (job.matches[p.id] || []).includes(k.id));
          return (
            <div key={k.id} data-kid-drop={k.id} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 12,
              background: "white",
              border: "1.5px dashed rgba(0,0,0,0.08)",
              transition: "background .15s, border-color .15s",
            }} className="dropzone">
              <KidAvatar kid={k} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{k.name}</div>
                <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                  {myPhotos.length === 0 && (
                    <div style={{ fontSize: 11, color: "rgba(60,60,67,0.5)", fontStyle: "italic" }}>
                      No photos yet
                    </div>
                  )}
                  {myPhotos.map(p => (
                    <button key={p.id} onClick={() => removePhotoFromKid(p.id, k.id)} style={{
                      width: 28, height: 28, borderRadius: 6,
                      border: "none", padding: 0, cursor: readOnly ? "default" : "pointer",
                      position: "relative", overflow: "hidden",
                    }}>
                      <PhotoTile photo={p} size={28} radius={6} />
                      {!readOnly && (
                        <div style={{
                          position: "absolute", inset: 0, opacity: 0,
                          background: "rgba(0,0,0,0.4)", display: "grid", placeItems: "center",
                          color: "white", transition: "opacity .15s",
                        }} className="rm-hover">
                          <ActionIcon.X size={12} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              {!readOnly && (
                <button onClick={() => toggleSkipKid(k.id)} title="Skip this kid" style={{
                  background: "transparent", border: "none", padding: 8, cursor: "pointer",
                  color: "rgba(60,60,67,0.55)",
                }}>
                  <EyeIcon />
                </button>
              )}
            </div>
          );
        })}

        {/* Skipped kids (collapsed) */}
        {classKids.some(k => !job.includedKids.includes(k.id) && Object.values(job.matches).some(arr => arr.includes(k.id))) && (
          <div style={{ fontSize: 11, color: "rgba(60,60,67,0.5)" }}>
            Some kids were skipped for today.
          </div>
        )}

        {/* Add kid */}
        {!readOnly && availableToAdd.length > 0 && (
          <>
            <button onClick={() => setShowAddKid(s => !s)} style={{
              padding: "10px 12px", borderRadius: 12,
              background: a.bg, color: a.accent,
              border: `1.5px dashed ${a.accent}`,
              cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              fontSize: 13, fontWeight: 600,
            }}>
              <ActionIcon.Plus size={16} /> Include another kid from {cls.name}
            </button>
            {showAddKid && (
              <div style={{
                padding: 10, borderRadius: 12, background: a.bg,
                display: "flex", gap: 6, flexWrap: "wrap",
              }}>
                {availableToAdd.map(k => (
                  <button key={k.id} onClick={() => addClassKid(k.id)} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "5px 10px 5px 5px", borderRadius: 16,
                    border: "1px solid rgba(0,0,0,0.08)", background: "white",
                    cursor: "pointer", fontFamily: "inherit",
                    fontSize: 12, fontWeight: 500,
                  }}>
                    <KidAvatar kid={k} size={20} />
                    {k.name}
                    <ActionIcon.Plus size={12} />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Drag ghost — follows the pointer */}
      {drag && (() => {
        const photo = job.photos.find(p => p.id === drag.photoId);
        if (!photo) return null;
        return (
          <div style={{
            position: "fixed",
            left: drag.sx - drag.w / 2,
            top: drag.sy - drag.h / 2,
            width: drag.w, height: drag.h,
            pointerEvents: "none",
            zIndex: 9999,
            transform: "scale(1.18) rotate(-3deg)",
            transition: "transform .12s",
            filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.25))",
          }}>
            <PhotoTile photo={photo} size={drag.w} radius={10} />
          </div>
        );
      })()}
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12 c 3 -6 7 -9 11 -9 s 8 3 11 9 c -3 6 -7 9 -11 9 s -8 -3 -11 -9 Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Drafts card — list of per-kid editable drafts
// ═══════════════════════════════════════════════════════════════════════
function DraftsCard({ job, readOnly }) {
  const a = useAccent();
  const classKids = kidsInClass(job.classId);

  // Per-kid draft state. Seeded from MOCK.drafts by kid id; falls back to a generated stub.
  const [drafts, setDrafts] = useStateChat(() => {
    const seed = {};
    for (const id of job.includedKids) {
      const found = MOCK.drafts.find(d => d.kid === id);
      const kid = classKids.find(k => k.id === id);
      seed[id] = found?.text ?? `${kid?.name ?? "Your child"} had a lovely day. Plenty of play and lots of smiles.`;
    }
    return seed;
  });

  return (
    <div style={{
      background: "white", borderRadius: 16, padding: 14, marginBottom: 12,
      boxShadow: "0 1px 0 rgba(0,0,0,0.04), 0 8px 24px -18px rgba(20,40,30,0.10)",
      border: "1px solid rgba(0,0,0,0.05)",
    }}>
      <Eyebrow style={{ marginBottom: 10 }}>
        Drafts · {job.includedKids.length} family update{job.includedKids.length === 1 ? "" : "s"}
      </Eyebrow>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {job.includedKids.map(kidId => {
          const kid = classKids.find(k => k.id === kidId);
          if (!kid) return null;
          const photos = job.photos.filter(p => (job.matches[p.id] || []).includes(kidId));
          const text = drafts[kidId] ?? "";
          return (
            <div key={kidId} style={{
              borderRadius: 12, padding: 12,
              background: a.bg,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <KidAvatar kid={kid} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{kid.name}</div>
                  <div style={{ fontSize: 11, color: "rgba(60,60,67,0.55)" }}>For 2 parents · {photos.length} photo{photos.length === 1 ? "" : "s"}</div>
                </div>
              </div>

              {photos.length > 0 && (
                <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
                  {photos.map(p => <PhotoTile key={p.id} photo={p} size={44} radius={8} />)}
                </div>
              )}

              <textarea
                value={text}
                disabled={readOnly}
                onChange={e => setDrafts(d => ({ ...d, [kidId]: e.target.value }))}
                style={{
                  width: "100%", minHeight: 76, padding: "10px 12px",
                  border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10,
                  background: "white", color: "#1d2a22",
                  fontSize: 13, lineHeight: 1.5, fontFamily: "inherit",
                  resize: "none", outline: "none",
                  boxSizing: "border-box",
                }}
              />

              {!readOnly && (
                <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                  {["Make warmer", "Shorter", "More detail"].map(label => (
                    <button key={label} style={{
                      padding: "5px 10px", borderRadius: 999,
                      border: "1px solid rgba(0,0,0,0.10)", background: "white",
                      fontSize: 11, fontWeight: 500, color: "#3a4a3f",
                      cursor: "pointer", fontFamily: "inherit",
                    }}>{label}</button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────
function fmtTime(d, addMinutes = 0) {
  if (!(d instanceof Date)) d = new Date(d);
  const t = new Date(d.getTime() + addMinutes * 60_000);
  let h = t.getHours();
  const m = String(t.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

Object.assign(window, {
  makeInitialJob, AIChatList, AIConversation,
  phaseLabel,
});
