/* global React */
// Shared primitives for the Sprout Quick Log prototype.
// - AccentContext: live colour swap from Tweaks
// - Sprout glyphs (Classes / AI / Chat / Settings — outline style, matches Icons.html)
// - Action glyphs (mic / camera / send / x / chevron / sparkle / spinner / check)
// - Mock data: educator, class, kids, sample photos, sample voice transcript

const SproutColors = {
  sprout:  { accent: "oklch(0.55 0.12 145)", tint: "oklch(0.92 0.04 145)", bg: "#f6f4ec", ink: "#1d2a22" },
  terra:   { accent: "oklch(0.60 0.14 35)",  tint: "oklch(0.93 0.04 35)",  bg: "#f8f2ea", ink: "#2a201a" },
  indigo:  { accent: "oklch(0.52 0.13 270)", tint: "oklch(0.93 0.03 270)", bg: "#f3f3f8", ink: "#1d1d2a" },
};

const AccentContext = React.createContext(SproutColors.sprout);
const useAccent = () => React.useContext(AccentContext);

// ─── Icon primitives (24px viewBox-64 — clone of Icons.html outline set)
const SproutIcon = {
  Home: ({ size = 22 }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 30 L 32 10 L 56 30" />
      <path d="M14 28 L14 52 L50 52 L50 28" />
      <path d="M26 52 L26 38 L38 38 L38 52" />
    </svg>
  ),
  Classes: ({ size = 22 }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 28 L32 14 L54 28" />
      <path d="M14 28 L14 52 L50 52 L50 28" />
      <path d="M27 52 L27 38 L37 38 L37 52" />
      <path d="M32 14 L32 6 L42 9 L32 12" />
      <circle cx="20" cy="34" r="2" fill="currentColor" stroke="none" />
      <circle cx="44" cy="34" r="2" fill="currentColor" stroke="none" />
    </svg>
  ),
  AI: ({ size = 22 }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M24 32 C 32 32, 36 28, 36 10 C 36 28, 40 32, 56 32 C 40 32, 36 36, 36 54 C 36 36, 32 32, 24 32 Z" />
      <path d="M8 18 C 14 18, 16 16, 16 8 C 16 16, 18 18, 24 18 C 18 18, 16 20, 16 28 C 16 20, 14 18, 8 18 Z" />
    </svg>
  ),
  Chat: ({ size = 22 }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 20 C 10 14, 14 10, 20 10 L 44 10 C 50 10, 54 14, 54 20 L 54 36 C 54 42, 50 46, 44 46 L 28 46 L 18 54 L 18 46 C 14 46, 10 42, 10 36 Z" />
      <circle cx="22" cy="28" r="2.2" fill="currentColor" stroke="none" />
      <circle cx="32" cy="28" r="2.2" fill="currentColor" stroke="none" />
      <circle cx="42" cy="28" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  ),
  Settings: ({ size = 22 }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="10" y1="18" x2="54" y2="18" />
      <line x1="10" y1="32" x2="54" y2="32" />
      <line x1="10" y1="46" x2="54" y2="46" />
      <circle cx="40" cy="18" r="5" fill="white" />
      <circle cx="22" cy="32" r="5" fill="white" />
      <circle cx="44" cy="46" r="5" fill="white" />
    </svg>
  ),
  // The "AI working" badge glyph: smaller sparkle, no companion
  SparkSmall: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2 C 12 9, 14 11, 22 11 C 14 11, 12 13, 12 22 C 12 13, 10 11, 2 11 C 10 11, 12 9, 12 2 Z" />
    </svg>
  ),
};

const ActionIcon = {
  Mic: ({ size = 26 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11 a7 7 0 0 0 14 0" />
      <line x1="12" y1="18" x2="12" y2="22" />
    </svg>
  ),
  Camera: ({ size = 22 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8 L 7 8 L 9 5 L 15 5 L 17 8 L 20 8 a2 2 0 0 1 2 2 v9 a2 2 0 0 1 -2 2 H 4 a2 2 0 0 1 -2 -2 V 10 a2 2 0 0 1 2 -2 Z" />
      <circle cx="12" cy="14" r="4" />
    </svg>
  ),
  Plus: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Send: ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 11.5 L 21 4 L 13.5 21 L 11 13 Z" />
    </svg>
  ),
  X: ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  ),
  ChevronRight: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 6 15 12 9 18" />
    </svg>
  ),
  ChevronLeft: ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 6 9 12 15 18" />
    </svg>
  ),
  Check: ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="5 12 10 17 19 7" />
    </svg>
  ),
  CheckCircle: ({ size = 22 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="7 12 11 16 17 9" />
    </svg>
  ),
  Pause: ({ size = 22 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  ),
};

// ─── Mock data ──────────────────────────────────────────────────────────
const MOCK = {
  educator: { name: "Aria", initials: "AR" },
  // Single "focal" class — used by Quick Log composer scope picker etc.
  class: { name: "Sunflowers", count: 6 },
  // The educator's full caseload — surfaced on the new Home tab.
  classes: [
    { id: "sunflowers",    name: "Sunflowers",    ageGroup: "Toddlers · 2–3 yrs",  count: 6, hue: 60,  glyph: "S" },
    { id: "caterpillars",  name: "Caterpillars",  ageGroup: "Infants · 0–1 yr",   count: 4, hue: 130, glyph: "C" },
    { id: "owls",          name: "Owls",          ageGroup: "Preschool · 3–5 yrs", count: 8, hue: 215, glyph: "O" },
  ],
  // Today's schedule (educator's view — same room may host multiple groups).
  calendar: [
    { time: "08:00", label: "Arrivals",         room: "All rooms",   kind: "event"  },
    { time: "09:15", label: "Morning circle",   room: "Sunflowers",  kind: "main",  current: true },
    { time: "10:00", label: "Outdoor play",     room: "All rooms",   kind: "main"  },
    { time: "11:30", label: "Lunch",            room: "All rooms",   kind: "meal"  },
    { time: "12:30", label: "Nap time",         room: "All rooms",   kind: "rest"  },
    { time: "14:30", label: "Snack",            room: "All rooms",   kind: "meal"  },
    { time: "15:30", label: "Art & sensory",    room: "Sunflowers",  kind: "main"  },
    { time: "16:30", label: "Pickup",           room: "All rooms",   kind: "event" },
  ],
  kids: [
    // Sunflowers (6)
    { id: "emma", name: "Emma",   last: "Carter",  hue: 38,  initials: "EC", classId: "sunflowers" },
    { id: "liam", name: "Liam",   last: "Park",    hue: 210, initials: "LP", classId: "sunflowers" },
    { id: "noah", name: "Noah",   last: "Singh",   hue: 280, initials: "NS", classId: "sunflowers" },
    { id: "mia",  name: "Mia",    last: "Lopez",   hue: 0,   initials: "ML", classId: "sunflowers" },
    { id: "zoe",  name: "Zoe",    last: "Tran",    hue: 170, initials: "ZT", classId: "sunflowers" },
    { id: "kai",  name: "Kai",    last: "Wright",  hue: 90,  initials: "KW", classId: "sunflowers" },
    // Caterpillars (4)
    { id: "ava",  name: "Ava",    last: "Brooks",  hue: 320, initials: "AB", classId: "caterpillars" },
    { id: "theo", name: "Theo",   last: "Khan",    hue: 50,  initials: "TK", classId: "caterpillars" },
    { id: "iris", name: "Iris",   last: "Moreno",  hue: 195, initials: "IM", classId: "caterpillars" },
    { id: "leo",  name: "Leo",    last: "Doyle",   hue: 110, initials: "LD", classId: "caterpillars" },
    // Owls (8)
    { id: "maya",  name: "Maya",  last: "Patel",   hue: 25,  initials: "MP", classId: "owls" },
    { id: "felix", name: "Felix", last: "Romero",  hue: 250, initials: "FR", classId: "owls" },
    { id: "ruby",  name: "Ruby",  last: "Ono",     hue: 350, initials: "RO", classId: "owls" },
    { id: "otto",  name: "Otto",  last: "Schmidt", hue: 145, initials: "OS", classId: "owls" },
    { id: "june",  name: "June",  last: "Walsh",   hue: 290, initials: "JW", classId: "owls" },
    { id: "sage",  name: "Sage",  last: "Park",    hue: 80,  initials: "SP", classId: "owls" },
    { id: "wren",  name: "Wren",  last: "Holt",    hue: 180, initials: "WH", classId: "owls" },
    { id: "reo",   name: "Reo",   last: "Tan",     hue: 230, initials: "RT", classId: "owls" },
  ],
  // photos[i] = { id, kidId | null (unassigned), hueA, hueB }
  photos: [
    { id: "p1", kid: "emma", a: 38,  b: 60 },
    { id: "p2", kid: "emma", a: 50,  b: 30 },
    { id: "p3", kid: "liam", a: 210, b: 230 },
    { id: "p4", kid: "noah", a: 280, b: 300 },
    { id: "p5", kid: "noah", a: 260, b: 320 },
    { id: "p6", kid: "mia",  a: 0,   b: 20 },
    { id: "p7", kid: "zoe",  a: 170, b: 200 },
    { id: "p8", kid: null,   a: 90,  b: 130 }, // unassigned
  ],
  transcript: "Sunny morning outside. Emma painted a big sun, super proud. Liam read three books in the reading corner. Noah and Kai built a tall tower with the wooden blocks. Mia napped well — straight through. Zoe tried carrots at lunch for the first time!",
  drafts: [
    { kid: "emma", text: "Emma had a creative morning — she painted a big bright sun at the easel and was beaming about it. Lots of focus today." },
    { kid: "liam", text: "Liam spent quiet time in the reading corner this morning and got through three picture books on his own." },
    { kid: "noah", text: "Noah and Kai built an impressive tower together with the wooden blocks. Lots of teamwork and gentle problem-solving." },
    { kid: "mia",  text: "Mia napped well today — straight through her usual window. Calm afternoon." },
    { kid: "zoe",  text: "Big food win — Zoe tried carrots at lunch for the first time! She wasn't sure at first but came back for more." },
    { kid: "kai",  text: "Kai had a great time block-building with Noah. Lots of focus and back-and-forth." },
  ],
};

// ─── UI primitives ──────────────────────────────────────────────────────

// Subtle AI badge — small sparkle + "AI" lockup, never a character
function AIBadge({ small = false }) {
  const a = useAccent();
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: small ? "2px 6px" : "3px 8px",
      borderRadius: 999,
      background: a.tint,
      color: a.accent,
      fontSize: small ? 10 : 11,
      fontWeight: 600,
      letterSpacing: 0.3,
      lineHeight: 1,
    }}>
      <SproutIcon.SparkSmall size={small ? 10 : 11} />
      AI
    </span>
  );
}

// Kid avatar — initials on a hue-derived swatch
function KidAvatar({ kid, size = 36, ring = false }) {
  const a = useAccent();
  const bg = `oklch(0.85 0.07 ${kid.hue})`;
  const ink = `oklch(0.32 0.07 ${kid.hue})`;
  return (
    <div style={{
      width: size, height: size, borderRadius: size,
      background: bg, color: ink,
      display: "grid", placeItems: "center",
      fontSize: size * 0.32, fontWeight: 600, letterSpacing: 0.3,
      boxShadow: ring ? `0 0 0 2px ${a.accent}` : "none",
      flex: "0 0 auto",
    }}>{kid.initials}</div>
  );
}

// Photo placeholder — soft gradient + tiny tag
function PhotoTile({ photo, size = 76, radius = 14, label }) {
  const grad = `linear-gradient(135deg, oklch(0.78 0.10 ${photo.a}), oklch(0.62 0.12 ${photo.b}))`;
  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      background: grad,
      flex: "0 0 auto",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* subtle highlight to suggest depth */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at 30% 25%, rgba(255,255,255,0.35), transparent 55%)",
      }} />
      {label && (
        <div style={{
          position: "absolute", left: 6, bottom: 6,
          fontSize: 9, fontWeight: 600, color: "white",
          background: "rgba(0,0,0,0.35)", padding: "2px 5px", borderRadius: 4,
          letterSpacing: 0.2,
        }}>{label}</div>
      )}
    </div>
  );
}

// Tab bar — universal across variations
function TabBar({ active, onChange, working = false }) {
  const a = useAccent();
  const tabs = [
    { id: "home",     label: "Home",     Icon: SproutIcon.Home },
    { id: "ai",       label: "AI",       Icon: SproutIcon.AI },
    { id: "chat",     label: "Chat",     Icon: SproutIcon.Chat },
    { id: "settings", label: "Settings", Icon: SproutIcon.Settings },
  ];
  return (
    <div style={{
      flex: "0 0 auto",
      borderTop: "1px solid rgba(0,0,0,0.06)",
      background: "rgba(255,255,255,0.92)",
      backdropFilter: "blur(20px)",
      padding: "8px 8px 0",
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
    }}>
      {tabs.map(t => {
        const on = t.id === active;
        const hasBadge = t.id === "ai" && working;
        return (
          <button key={t.id} onClick={() => onChange?.(t.id)} style={{
            background: "transparent", border: "none",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            padding: "6px 4px 10px",
            color: on ? a.accent : "#a8b0a4",
            cursor: "pointer",
            position: "relative",
          }}>
            <div style={{ position: "relative" }}>
              <t.Icon size={24} />
              {hasBadge && (
                <span style={{
                  position: "absolute", top: -2, right: -4,
                  width: 8, height: 8, borderRadius: 4,
                  background: a.accent,
                  boxShadow: "0 0 0 2px white",
                }} />
              )}
            </div>
            <span style={{
              fontSize: 10, fontWeight: on ? 600 : 500, letterSpacing: 0.1,
            }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Section eyebrow text
function Eyebrow({ children, style }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, letterSpacing: 1.2,
      textTransform: "uppercase", color: "rgba(60,60,67,0.55)",
      ...style,
    }}>{children}</div>
  );
}

// Animated three-dot working indicator
function WorkingDots({ color }) {
  return (
    <span style={{ display: "inline-flex", gap: 3, alignItems: "center" }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: 3, background: color,
          animation: `sp-pulse 1.2s ${i * 0.15}s infinite ease-in-out`,
          display: "inline-block",
        }} />
      ))}
    </span>
  );
}

// Primary CTA
function CTA({ children, onClick, disabled = false, style = {}, secondary = false }) {
  const a = useAccent();
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: "100%",
      padding: "15px 20px",
      borderRadius: 14,
      border: secondary ? `1.5px solid ${a.accent}` : "none",
      background: secondary ? "transparent" : a.accent,
      color: secondary ? a.accent : "white",
      fontSize: 16, fontWeight: 600,
      letterSpacing: 0.2,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1,
      fontFamily: "inherit",
      ...style,
    }}>{children}</button>
  );
}

// Card with header
function Card({ children, style = {}, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: "white",
      borderRadius: 16,
      padding: 16,
      boxShadow: "0 1px 0 rgba(0,0,0,0.04), 0 8px 24px -16px rgba(20,40,30,0.10)",
      cursor: onClick ? "pointer" : "default",
      ...style,
    }}>{children}</div>
  );
}

// Inject global animations once
(function injectStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById("sprout-anim")) return;
  const s = document.createElement("style");
  s.id = "sprout-anim";
  s.textContent = `
    @keyframes sp-pulse {
      0%, 60%, 100% { opacity: 0.25; transform: scale(0.8); }
      30% { opacity: 1; transform: scale(1); }
    }
    @keyframes sp-spin { to { transform: rotate(360deg); } }
    @keyframes sp-ring { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(1.6); opacity: 0; } }
    @keyframes sp-sheet { from { transform: translateY(100%); } to { transform: translateY(0); } }
    @keyframes sp-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    .sp-screen { animation: sp-fade .25s ease both; }
    .sp-sheet { animation: sp-sheet .35s cubic-bezier(.2,.7,.3,1) both; }
    /* hide scrollbars inside phone for cleaner look */
    .sp-noscroll::-webkit-scrollbar { display: none; }
    .sp-noscroll { scrollbar-width: none; }
  `;
  document.head.appendChild(s);
})();

// ─── Helpers ───────────────────────────────────────────────────────────
function kidsInClass(classId) {
  return MOCK.kids.filter(k => k.classId === classId);
}
function findClass(classId) {
  return MOCK.classes.find(c => c.id === classId);
}

// ─── Class glyph (initial in a hue-derived rounded square) ─────────────
function ClassGlyph({ cls, size = 44 }) {
  const bg = `oklch(0.86 0.08 ${cls.hue})`;
  const ink = `oklch(0.36 0.10 ${cls.hue})`;
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: bg, color: ink,
      display: "grid", placeItems: "center",
      fontSize: size * 0.42, fontWeight: 700, letterSpacing: -0.4,
      flex: "0 0 auto",
    }}>{cls.glyph}</div>
  );
}

// ─── Today's calendar (vertical time-rail) ─────────────────────────────
function TodayCalendar({ compact = false }) {
  const a = useAccent();
  return (
    <div style={{ position: "relative", paddingLeft: 8 }}>
      {/* vertical rail */}
      <div style={{
        position: "absolute", top: 8, bottom: 8, left: 50,
        width: 2, background: "rgba(0,0,0,0.06)", borderRadius: 1,
      }} />
      {MOCK.calendar.map((item, i) => {
        const on = item.current;
        return (
          <div key={i} style={{
            display: "flex", alignItems: "flex-start", gap: 12,
            padding: compact ? "8px 0" : "10px 0",
            position: "relative",
          }}>
            <div style={{
              width: 44, flex: "0 0 auto", textAlign: "right",
              fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
              fontSize: 12, fontVariantNumeric: "tabular-nums",
              color: on ? a.accent : "rgba(60,60,67,0.55)",
              fontWeight: on ? 700 : 500,
              paddingTop: 2,
            }}>{item.time}</div>
            <div style={{
              width: 14, height: 14, borderRadius: 7, marginTop: 3,
              background: on ? a.accent : "white",
              boxShadow: on ? `0 0 0 4px ${a.tint}` : "0 0 0 2px rgba(0,0,0,0.10) inset",
              flex: "0 0 auto", zIndex: 1,
            }} />
            <div style={{ flex: 1, minWidth: 0, paddingTop: 0 }}>
              <div style={{
                fontSize: 14, fontWeight: on ? 700 : 500,
                color: on ? "#1d2a22" : "#3a4a3f",
                lineHeight: 1.3,
              }}>{item.label}{on && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 600, color: a.accent, background: a.tint, padding: "2px 6px", borderRadius: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>now</span>}</div>
              <div style={{ fontSize: 11, color: "rgba(60,60,67,0.55)", marginTop: 1 }}>{item.room}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── "My Classes" list — each row tappable into roster ────────────────
function MyClassesList({ onOpenClass }) {
  const a = useAccent();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {MOCK.classes.map(c => (
        <button key={c.id} onClick={() => onOpenClass?.(c.id)} style={{
          background: "white", borderRadius: 14, padding: "12px 14px",
          display: "flex", alignItems: "center", gap: 14, width: "100%",
          border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left",
          boxShadow: "0 1px 0 rgba(0,0,0,0.04), 0 6px 16px -14px rgba(20,40,30,0.10)",
        }}>
          <ClassGlyph cls={c} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#1d2a22" }}>{c.name}</div>
            <div style={{ fontSize: 12, color: "rgba(60,60,67,0.55)", marginTop: 1 }}>{c.ageGroup}</div>
          </div>
          <div style={{
            background: a.bg, borderRadius: 10,
            padding: "4px 10px",
            fontSize: 12, fontWeight: 600, color: a.accent,
            display: "flex", alignItems: "center", gap: 4,
          }}>
            {c.count}<span style={{ fontWeight: 500, color: "rgba(60,60,67,0.55)" }}>kids</span>
          </div>
          <div style={{ color: "rgba(60,60,67,0.4)" }}>
            <ActionIcon.ChevronRight size={14} />
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Roster screen (shared across variations) ─────────────────────────
function RosterScreen({ classId, onBack, onQuickLog }) {
  const a = useAccent();
  const cls = findClass(classId);
  const kids = kidsInClass(classId);
  if (!cls) return null;
  return (
    <div className="sp-screen" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "56px 20px 0", flex: "0 0 auto" }}>
        <button onClick={onBack} style={{
          background: "transparent", border: "none", padding: 0, marginLeft: -4,
          color: a.accent, cursor: "pointer", display: "flex", alignItems: "center", gap: 2, fontSize: 15,
          fontFamily: "inherit",
        }}>
          <ActionIcon.ChevronLeft size={20} /> Home
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14 }}>
          <ClassGlyph cls={cls} size={52} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.4 }}>{cls.name}</div>
            <div style={{ fontSize: 13, color: "rgba(60,60,67,0.6)", marginTop: 1 }}>
              {cls.ageGroup} · {kids.length} kids
            </div>
          </div>
        </div>
      </div>

      <div className="sp-noscroll" style={{ flex: 1, overflow: "auto", padding: "20px 14px 16px" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
        }}>
          {kids.map(k => <KidProfileCard key={k.id} kid={k} />)}
        </div>
      </div>

      {onQuickLog && (
        <div style={{ padding: "0 20px 14px", flex: "0 0 auto" }}>
          <CTA onClick={onQuickLog}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <ActionIcon.Mic size={18} /> Quick Log for {cls.name}
            </span>
          </CTA>
        </div>
      )}
    </div>
  );
}

// Kid card on the Roster — full name + profile picture (gradient placeholder)
function KidProfileCard({ kid }) {
  // Profile "photo" — gradient + a tiny smiley placeholder. Keeps the look
  // consistent with the design system (no real photos) while reading as a
  // portrait, not just a coloured square.
  const grad = `linear-gradient(160deg, oklch(0.85 0.09 ${kid.hue}), oklch(0.62 0.13 ${(kid.hue + 30) % 360}))`;
  return (
    <div style={{
      background: "white", borderRadius: 14, padding: "10px 8px 12px",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
      boxShadow: "0 1px 0 rgba(0,0,0,0.04), 0 6px 14px -12px rgba(20,40,30,0.10)",
    }}>
      <div style={{
        width: "100%", aspectRatio: "1 / 1", borderRadius: 12,
        background: grad, position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 35% 30%, rgba(255,255,255,0.45), transparent 55%)",
        }} />
        <div style={{
          position: "absolute", left: "50%", top: "55%", transform: "translate(-50%, -50%)",
          color: "rgba(255,255,255,0.9)",
          fontSize: 22, fontWeight: 700, letterSpacing: 0.5,
          textShadow: "0 1px 4px rgba(0,0,0,0.15)",
        }}>{kid.initials}</div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#1d2a22", lineHeight: 1.2 }}>{kid.name}</div>
        <div style={{ fontSize: 11, color: "rgba(60,60,67,0.55)", marginTop: 1, lineHeight: 1.2 }}>{kid.last}</div>
      </div>
    </div>
  );
}

Object.assign(window, {
  AccentContext, useAccent, SproutColors,
  SproutIcon, ActionIcon,
  MOCK, kidsInClass, findClass,
  AIBadge, KidAvatar, PhotoTile, TabBar, Eyebrow, WorkingDots, CTA, Card,
  ClassGlyph, TodayCalendar, MyClassesList, RosterScreen, KidProfileCard,
});
