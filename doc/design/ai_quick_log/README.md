# Handoff: Quick Log → AI Conversation Flow

## Overview

This is a redesign of the educator's primary daily-logging workflow for **Sprout**, the AI-first day-care app. It covers:

1. A new **Home tab** (replacing the old "Classes" tab) — today's schedule + "My Classes" list + Quick Log entry point.
2. The **Class roster** screen — kid profile grid, reached by tapping a class on Home.
3. The **Quick Log composer** — voice + photos + scope, opened as a bottom sheet from Home.
4. The **AI tab as a chat interface** — every Quick Log opens a conversational thread where photo matching, draft review, and sending all happen inline as messages.

The flow the user walks through:

```
Home → Quick Log card → Compose sheet → Send to AI
  ↓
AI chat thread opens with the user's input
  ↓ (backend: face recognition, ~1–2s)
AI message + interactive Photo-Matching card (drag photos to kids,
   skip kids, include more kids from the class)
  ↓ Confirm matches
AI message + per-kid editable Draft cards (Make warmer / Shorter /
   More detail)
  ↓ Send to families
Sent confirmation, thread moves to history
```

## About the Design Files

The files in `prototype/` are **design references**, not production code. They are an HTML/React prototype built with inline JSX + Babel for fast iteration. The goal of this handoff is to **recreate the designs in the existing Sprout React Native codebase** (`sprout/mobile/`), using its existing patterns:

- React Native + Expo
- React Navigation (`@react-navigation/bottom-tabs` + `@react-navigation/native-stack`)
- Apollo GraphQL for data
- The existing `theme.ts` (`Colors`, `Spacing`, `Radius`, `Shadow`)

**Do not ship the prototype HTML.** It uses web-only APIs (CSS gradients, pointer events, `elementFromPoint`, HTML `<textarea>`) that have to be translated to native equivalents (`LinearGradient` from `expo-linear-gradient`, `PanResponder` / `Reanimated`, `<TextInput multiline>`, etc.).

## Fidelity

**High-fidelity for layout, behavior, and copy. Medium-fidelity for visual styling.** Color and spacing values in the prototype are aspirational — use the existing `theme.ts` tokens. The structural decisions (where things live, what the flow looks like, what controls exist) are final.

## Existing files to map onto

The Sprout codebase already has scaffolding for most of this. Replace or rewrite these:

| Existing file | What it becomes |
|---|---|
| `screens/educator/ClassesScreen.tsx` | **Home screen** (today's schedule + My Classes + Quick Log entry) |
| `screens/educator/RosterScreen.tsx` | Mostly kept — refine to match the new profile-card grid spec |
| `screens/educator/QuickLogScreen.tsx` | **ComposeSheet** — convert to a bottom-sheet modal opened from Home |
| `screens/agents/AgentsListScreen.tsx` | **AIChatList** — list of Quick Log conversation threads |
| `screens/agents/ConversationScreen.tsx` | **AIConversation** — the chat-thread shell |
| `screens/agents/PhotoClassificationScreen.tsx` | Folded **into** AIConversation as the inline photo-matching card |
| `screens/agents/QuickLogReviewScreen.tsx` | Folded **into** AIConversation as the inline drafts card |
| `navigation/EducatorNavigator.tsx` | Rename "Classes" tab to "Home" + new icon. AI / Chat / Settings tabs unchanged. |

The big consolidation: the old multi-screen agent flow (list → conversation → photo classification → review) is now a **single conversation screen** with cards appearing inline as the AI works.

---

## Screens / Views

### 1. Home tab (replaces ClassesScreen)

**Purpose:** Educator's daily landing surface. Quickly see today's schedule, pick a class to go into, or kick off a Quick Log.

**Layout (top → bottom, single scrolling column, 20px horizontal padding):**

1. **Header** — eyebrow "Tuesday · 14 May" then big title "Good morning, Aria"
2. **Quick Log entry card** — tinted accent gradient background, contains:
   - Mic icon (40×40 filled circle in accent color)
   - Title row: "Quick Log" + AI badge pill
   - Sub: "Speak, snap, send to families"
   - "Start" button (accent fill)
   - **Active job nudge:** if an in-flight Quick Log exists, shows a row with working dots + "Today's Quick Log — open chat" → tapping jumps to AI tab → conversation
3. **Today's schedule** section
   - Eyebrow "TODAY'S SCHEDULE" + right-aligned "{N} items"
   - White card containing the time-rail (see Today Calendar component below)
4. **My Classes** section
   - Eyebrow "MY CLASSES · {N}"
   - Vertical list of class rows (see ClassRow component below)

**Reference:** `proto-var-a.jsx` → `Home()` function

#### Today Calendar component
Vertical time-rail:
- Each row: `[time monospace][dot on rail][label + room]`
- The "now" item is highlighted: accent-colored dot with ring halo (`box-shadow: 0 0 0 4px {accent.tint}`), bold label with a small "NOW" pill (uppercase, accent color)
- Rail is a 2px vertical line at 50px from the left edge of the card, colored `rgba(0,0,0,0.06)`
- Items sample: `08:00 Arrivals · All rooms`, `09:15 Morning circle · Sunflowers (now)`, `10:00 Outdoor play`, `11:30 Lunch`, `12:30 Nap time`, `14:30 Snack`, `15:30 Art & sensory · Sunflowers`, `16:30 Pickup`

#### ClassRow component
- White card, radius 14, padding `12px 14px`, soft shadow
- Layout: `[ClassGlyph 44px][name + ageGroup][kid-count pill][chevron]`
- ClassGlyph: rounded square 44×44 (radius ~12), background `oklch(0.86 0.08 {hue})`, ink `oklch(0.36 0.10 {hue})`, single-letter glyph (e.g. "S" for Sunflowers), font size ~18, bold
- Kid-count pill: `{accent.bg}` background, accent text, `{count}` bold + " kids" muted
- Tap → navigate to RosterScreen with the classId

**Sample classes:**
- Sunflowers · Toddlers 2–3 yrs · 6 kids · hue 60
- Caterpillars · Infants 0–1 yr · 4 kids · hue 130
- Owls · Preschool 3–5 yrs · 8 kids · hue 215

---

### 2. Roster screen (refined RosterScreen)

**Purpose:** See all kids in one class and start a Quick Log scoped to that class.

**Layout:**
- Header (56px top padding): back button "← Home" (accent color), then a row with ClassGlyph 52px + class name + "{ageGroup} · {N} kids" subtitle
- Body: **3-column grid** of kid profile cards (14px gap, 14px horizontal padding)
- Footer: full-width sticky CTA "Quick Log for {className}" with mic icon

**Kid profile card:**
- White card, radius 14, padding `10px 8px 12px`
- Square gradient "photo" (aspect-ratio 1, radius 12) — `linear-gradient(160deg, oklch(0.85 0.09 {hue}), oklch(0.62 0.13 {(hue+30)%360}))` with a soft radial highlight overlay, white initials centered. **In production, replace with the real `profilePhotoUrl` if present, falling back to this gradient + initials.**
- Below the photo: first name (13px, weight 600, ink) and last name (11px, muted)

**Reference:** `proto-shared.jsx` → `RosterScreen` and `KidProfileCard`

---

### 3. Quick Log Compose Sheet

**Purpose:** Capture voice + photos + scope before sending to AI.

**Layout (bottom sheet, dim backdrop, slide up animation):**
- 24px top corner radius, 20px horizontal padding, 30px bottom padding
- Grabber handle (36×5px, rounded, neutral grey, centered, 14px margin below)
- Header row: "Quick Log" (20px, 600) + close X button
- Subtitle: AI badge pill + "Speak, snap, send. We'll write to families."
- **Recording control:**
  - Tint-bg rounded card, padding `20px 16px`
  - Left: 52px circular mic/pause button in accent
  - Animated pulsing ring around mic (CSS keyframe — translate to `Animated.loop` on native)
  - Middle: "Recording…" label + 28-bar synthetic waveform (bars at variable heights from `Math.sin(i*0.7 + seconds) * 18 + 6`)
  - Right: monospace timer `0:NN`
- **Photo strip:** label "Photos · {N}" + "+ Add" link, then a horizontal scrollable strip of 64px photo tiles
- **Scope pill:** tint-bg rounded row with Home icon + "{className} · {N} kids" + chevron — tappable to change class
- **CTA:** "Send to AI" full-width with Send icon (accent fill)

**Reference:** `proto-var-a.jsx` → `ComposeSheet()`

**On Send:** dismiss sheet, switch to AI tab, push a brand-new conversation screen. The conversation's initial state is built from the composer's transcript + selected photos + classId. In code, this is `makeInitialJob({ classId, photos, transcript })` — see Mock Data section.

---

### 4. AI tab — Chat List (replaces AgentsListScreen)

**Purpose:** Persistent list of Quick Log conversations, with the active one pinned at top.

**Layout:**
- Header: eyebrow "CONVERSATIONS" + title "AI" (30px, 600, letter-spacing -0.6)
- **In progress section** (only when an active job exists):
  - Eyebrow "IN PROGRESS"
  - Tappable card with gradient tint background, border `1.5px solid {accent.tint}`:
    - Left: 40px sparkle avatar in accent. If `phase ∈ {thinking, writing, sending}` show pulsing ring overlay (`animation: sp-ring 1.6s infinite`).
    - Middle: "Today's Quick Log" + AI badge, then `{className} · {N} photos`
    - Right: working dots if active
    - Below: status pill ("Scanning photos…" / "Review photo matching" / "Drafts ready · review" / etc.) + chevron
- **Earlier section:** plain history rows, each with ClassGlyph + title + subtitle + timestamp

**Reference:** `proto-ai-chat.jsx` → `AIChatList()`

---

### 5. AI Conversation (the heart of the feature)

**Purpose:** Single chat-style screen that walks the educator through everything from "AI is looking at your photos" to "Sent to N families."

**Layout:**
- **Header** (white, 1px bottom border): back chevron + 36px sparkle avatar + title "Today's Quick Log" + subtitle "{className} · {N} photos · {N} kids"
- **Scrollable chat body** (12px horizontal padding, 16px top, 20px bottom)
- **Sticky bottom action bar** (white, 1px top border) — content depends on phase

#### Chat message types

**UserMessage** (right-aligned, accent bubble):
- Max-width 82%, padding 12, radius 16, bottom-right corner radius 4
- Background: accent color
- Text: white
- Timestamp 10px muted below, right-aligned

**AIMessage** (left-aligned, with avatar):
- Avatar: 24px circle, accent fill, sparkle glyph
- Bubble: white background, radius 16, top-left corner 4, padding `10px 14px`, fontSize 14, line-height 1.5, ink color, subtle shadow `0 1px 0 rgba(0,0,0,0.04)`
- Timestamp 10px muted below

**AIThinking** (ephemeral status):
- Left-padded 32px, working dots + italic muted text e.g. "Looking at your photos…"

#### Phase state machine

The conversation is driven by `job.phase`:

```
thinking  → matching  → writing  → drafted  → sending  → sent
```

| Phase | Trigger | Messages added |
|---|---|---|
| `thinking` | initial (on Send to AI) | UserMessage (transcript + photos) → AIThinking "Looking at your photos…" |
| `matching` | auto after ~1.8s | AIMessage "I matched N photos to M kids..." + PhotoMatchingCard (editable). Action bar: "Confirm matches · write N updates" |
| `writing` | user taps Confirm | UserMessage "Looks good — write N updates" → AIThinking "Writing N updates…". Action bar: working pill |
| `drafted` | auto after ~2.2s | AIMessage "Here are N drafts..." + DraftsCard (editable). Action bar: "Send to N families" |
| `sending` | user taps Send | UserMessage "Send to all N families" → AIThinking "Sending to families…". Action bar: working pill |
| `sent` | auto after ~1.2s | AIMessage with green check + "Sent to N families". Action bar: secondary "Back to AI" button |

**Reference:** `proto-ai-chat.jsx` → `AIConversation()`

In production the auto-advance delays would be replaced with real backend events. The proto's `useEffect` timers map directly to subscription/polling events from the agents service.

#### Auto-scroll

When phase advances OR `includedKids.length` changes, the chat scroller auto-scrolls to bottom (`scrollTo({ top: scrollHeight, behavior: "smooth" })` — in RN, `scrollViewRef.current.scrollToEnd({ animated: true })`).

---

### 6. PhotoMatchingCard — interactive (inline in AIConversation)

**Purpose:** Let the educator review and adjust which photos go to which kids before drafts are generated. **A photo can be assigned to multiple kids.**

**Layout (white card, radius 16, padding 14, inside the chat scroll):**

1. **Header row:** eyebrow "PHOTO MATCHING" + (if there are unmatched photos) a small pill "N unmatched" in accent
2. **Photo carousel** — horizontal scrollable strip, 6px gap, `-14px` negative margin on both sides so it bleeds to the card edges
   - Each photo: 68×68px, radius 10
   - Stacked kid-avatar chips at bottom-left (18px circles, overlapped −6px, max 3 + "+N" overflow)
   - If unassigned: red "!" badge top-right (16px, accent fill, white)
3. **Hint text:** "Drag a photo onto a kid below ↓"
4. **Kid drop-zone list** — vertical stack of kid rows:
   - Each row: `padding: 10px 12px`, radius 12, `border: 1.5px dashed rgba(0,0,0,0.08)` (highlights on drop hover)
   - Layout: `[KidAvatar 32px][name + matched-photo strip][eye button]`
   - Matched photos as 28×28 tiles in a row, each tappable to **remove** that photo from this kid
   - If empty: italic muted "No photos yet"
   - Eye button toggles "skipped" (kid removed from `includedKids`)
5. **Include another kid** — accent-tint button with plus icon, "Include another kid from {className}". On tap, expands a chip picker showing class kids not yet in `includedKids`

#### Drag-and-drop behavior

**Web prototype uses pointer events.** In React Native, use **PanResponder** or **Reanimated v3 gestures**:

- `onPointerDown` on a photo tile → capture and start tracking; lift the source tile (opacity 0.3) and render a **ghost** (a fixed-position copy of the tile, scaled 1.18, rotated -3°, big drop shadow) that follows the pointer.
- `onPointerMove` → update ghost position; on every move, identify the drop target via `document.elementFromPoint(x, y).closest('[data-kid-drop]')`. Toggle a `.dragover` class. On native, use `measureInWindow` on each drop zone and hit-test against pointer location.
- `onPointerUp` → if released over a drop zone, append the kidId to `matches[photoId]` (de-duped). If the kid wasn't in `includedKids`, add them.

**Tap-to-remove fallback:** Tapping any assigned photo chip on a kid's row removes that one mapping (without removing the photo from the carousel).

**Skip behavior:** Tapping the eye icon toggles the kid in/out of `includedKids`. Their existing photo assignments are preserved (so re-including restores them).

**Reference:** `proto-ai-chat.jsx` → `PhotoMatchingCard()`

---

### 7. DraftsCard — per-kid editable updates (inline)

**Purpose:** After AI writes one update per included kid, let the educator tweak each before sending.

**Layout (white card, radius 16, padding 14):**

- Eyebrow: "DRAFTS · {N} family update{s}"
- Vertical stack (12px gap) of one **draft block** per kid in `includedKids`:
  - Tint-bg pad, radius 12, padding 12
  - Header: KidAvatar 32 + name + "For 2 parents · {N} photo{s}"
  - Photo strip (44×44 tiles, wrapped)
  - **Editable textarea** — min height 76px, padding `10px 12px`, white bg, border `1px solid rgba(0,0,0,0.08)`, radius 10, fontSize 13, line-height 1.5. In RN: `<TextInput multiline />` with `textAlignVertical="top"`.
  - Quick chips: `[Make warmer] [Shorter] [More detail]` — 5px 10px padding, 999 radius, 1px neutral border, white bg

In production, the chip taps fire follow-up agent calls that rewrite that single kid's draft and replace the textarea content. Show a brief inline spinner over the textarea while rewriting.

**Reference:** `proto-ai-chat.jsx` → `DraftsCard()`

---

## Tab bar

Same across all variations. Four tabs:

| Tab | Icon | Notes |
|---|---|---|
| **Home** | House outline | Was "Classes" |
| **AI** | Sparkle (4-point + companion) | Shows a small accent dot top-right of the icon when a job is `thinking`/`writing`/`sending` |
| **Chat** | Speech bubble with 3 dots | Out of scope for this iteration |
| **Settings** | 3-track sliders | Out of scope |

Active tab is rendered in `Colors.primary`; inactive in `#a8b0a4`. Active label is `fontWeight: 600`.

The SVG icon set is defined in `proto-shared.jsx` → `SproutIcon`. Copy the paths directly into native SVG icons (e.g. `react-native-svg`).

**Reference:** `proto-shared.jsx` → `TabBar()`

---

## Interactions & Behavior

### Navigation

- **Home → Compose Sheet:** Slide up from bottom with backdrop dim. Tap backdrop to dismiss.
- **Home → Roster:** Push (stack navigation). Back via header chevron.
- **Compose Sheet → AI Conversation:** Dismiss sheet, jump to AI tab programmatically, push the new conversation screen.
- **AI tab tap during active job:** If `job` exists, open directly to the conversation. If `job` is `sent` or null, open chat list.
- **Roster → Compose Sheet:** "Quick Log for {className}" CTA opens the same compose sheet with `classId` pre-set.

### Auto-advancing phases (replace with real backend events in production)

- `thinking → matching` after ~1800ms (face recognition complete)
- `writing → drafted` after ~2200ms (drafts generated)
- `sending → sent` after ~1200ms (POST /messages succeeded for all kids)

### Animations

| Element | Animation |
|---|---|
| Screen transition | 0.25s ease-out fade + 6px translate-Y |
| Compose sheet | 0.35s `cubic-bezier(.2,.7,.3,1)` slide-up from bottom |
| AI working ring | 1.6s infinite — `transform: scale(1 → 1.6), opacity: 0.5 → 0` |
| Working dots | 1.2s each dot with 0.15s stagger — `opacity: 0.25→1→0.25, scale: 0.8→1→0.8` |
| Drag ghost | Lift to `scale(1.18) rotate(-3deg)` with shadow `drop-shadow(0 8px 20px rgba(0,0,0,0.25))` in ~120ms |
| Auto-scroll on phase change | Smooth scroll to bottom |

### Empty / error / loading states

| State | Treatment |
|---|---|
| AI tab, no jobs ever | Centered sparkle icon + "No conversations yet. Start a Quick Log from Home to begin." |
| Matching, no faces found | AI message: "I couldn't find any faces in your photos. Drag them onto kids manually below." Unmatched count pill shows total. |
| Send failure (single kid) | Per-draft inline red banner: "Couldn't send to Emma's parents. [Retry]" |
| Network offline | Banner above action bar: "Offline — your Quick Log is saved and will send when you reconnect." |

---

## State Management

### Job model

This is the canonical structure for one Quick Log session. In Sprout's GraphQL schema this corresponds to a `Conversation` (or `AgentJob`) backed by the agents service.

```ts
type QuickLogJob = {
  id: string;                               // server-issued
  classId: string;
  createdAt: Date;
  phase: 'thinking' | 'matching' | 'writing' | 'drafted' | 'sending' | 'sent';
  photos: Photo[];                          // uploaded with the job
  transcript: string;                       // from voice or text input
  matches: Record<PhotoId, KidId[]>;        // ← a photo can belong to multiple kids
  includedKids: KidId[];                    // kids who will get an update
  drafts?: Record<KidId, string>;           // populated when phase ≥ 'drafted'
};
```

### Mutations exposed to the UI

```ts
// Photo matching screen
assignPhotoToKid(photoId, kidId)            // append to matches[photoId]
removePhotoFromKid(photoId, kidId)          // remove from matches[photoId]
toggleSkipKid(kidId)                        // toggle membership in includedKids
includeClassKid(kidId)                      // add a class kid who wasn't auto-matched

// Phase advance
confirmMatches()                            // → POST /jobs/:id/confirm-matching → phase 'writing'
sendDrafts()                                // → POST /jobs/:id/send → phase 'sending'
updateDraftText(kidId, text)                // local-only until send
requestRewrite(kidId, instruction)          // → POST returns new draft text for that kid
```

### Live status

The chat list and the Home Quick Log card both need to react when `job.phase` changes. In the prototype they subscribe to a shared `job` state. In production, use **Apollo subscriptions** (already in use elsewhere) or polling on the active job's status field.

---

## Design Tokens

The prototype uses three swappable accent palettes (via a Tweaks toggle) but **default to Sprout green**, which maps best to `theme.ts`'s `Colors.primary`.

### Recommended mapping (Sprout-green palette)

| Token | Prototype value | Maps to `theme.ts` |
|---|---|---|
| accent | `oklch(0.55 0.12 145)` ≈ `#5fa37a` | Replace `Colors.primary` (currently `#4F46E5`) OR keep both — designer prefers a sage green over indigo, but final call is yours |
| accent tint | `oklch(0.92 0.04 145)` ≈ `#cfe4d8` | New: `Colors.primaryLight` analog |
| accent bg | `#f6f4ec` | New: `Colors.tintBg` |
| ink | `#1d2a22` | `Colors.textPrimary` |
| muted ink | `rgba(60,60,67,0.65)` | `Colors.textSecondary` |
| surface | `#fbfaf6` | `Colors.bg` |
| card | `white` | `Colors.card` |
| border | `rgba(0,0,0,0.06)` | `Colors.border` |

**Don't** literally swap the primary color without discussion — it propagates through the whole app. Run the proposed sage green past the team first; if rejected, keep indigo and treat the prototype's accent as illustrative.

### Spacing

Use existing `Spacing` from `theme.ts`. The prototype uses ad-hoc pixel values that align roughly to: 4 / 8 / 10 / 12 / 14 / 16 / 20 / 22 / 24.

### Radii

| Use | Value |
|---|---|
| Sheet top corners | 24 |
| Large card | 16 |
| Standard card | 14 |
| Pill / tag | 999 |
| Photo tile | 10–12 |
| Small chip | 10 |

### Typography

System font (`-apple-system, system-ui, ...`). RN: default `System`.

| Use | Size | Weight | Letter-spacing |
|---|---|---|---|
| Big title (Home / AI) | 30 | 600 | -0.6 |
| Section heading (sheet / roster) | 20–24 | 600 | -0.3 to -0.5 |
| Card title | 14–16 | 600 | — |
| Body | 13–14 | 400–500 | — |
| Eyebrow / overline | 11 | 600 | 1.2–1.4, uppercase |
| Mono / timer | 11–13 | 500 | tabular-nums |

### Shadows

Use existing `Shadow.small` / `Shadow.medium`. Avoid hand-rolling new shadow values.

---

## Mock data

The prototype uses fake data in `proto-shared.jsx` → `MOCK`. The shape mirrors what the existing GraphQL schema returns (kids belong to classes, classes have a name + ageGroup + count). Use this for fixture/storybook builds and tests.

Notable fields the existing schema doesn't have but the design assumes:

- **Class `glyph`** — single letter; can derive from `name.charAt(0)`
- **Class `hue`** — number 0–360 for the gradient/glyph color; can be assigned deterministically by hashing the class id or stored alongside the class
- **Class `ageGroup`** — string like "Toddlers · 2–3 yrs". Not in the schema today. Either add it as a column on `classes`, or derive from a min/max age range.

---

## Assets

No bitmap assets in this design. Everything is SVG (icons) or generated (gradient photo placeholders).

**Icon SVG paths** are inline in `proto-shared.jsx` → `SproutIcon` and `ActionIcon`. Copy paths into `react-native-svg` components.

Real photo handling: in `KidProfileCard`, prefer `<Image source={{ uri: kid.profilePhotoUrl }} />` when present, fall back to the gradient + initials.

---

## Files in this bundle

```
prototype/
  demo.html              — entry point; open in a browser
  proto-shared.jsx       — design tokens, icons, MOCK data, Home/Roster/Calendar/MyClasses primitives
  proto-var-a.jsx        — PhoneA: orchestrates tab routing + ComposeSheet
  proto-ai-chat.jsx      — AIChatList + AIConversation + PhotoMatchingCard + DraftsCard
  ios-frame.jsx          — iPhone bezel (not relevant to the codebase implementation)
  tweaks-panel.jsx       — design-time accent picker (not for production)
  icons.html             — earlier icon exploration; reference for the 4 tab-bar glyphs
```

`demo.html` is the runnable prototype. Open it in a browser, walk the flow:

1. Tap **Start** on the Quick Log card.
2. Hit **Send to AI** in the compose sheet.
3. Wait ~2s for AI to "look at" the photos.
4. **Drag** a photo from the top carousel onto a kid row to add it.
5. Tap an assigned photo (the small thumbnails inside a kid row) to remove it from that kid.
6. Use the eye icon to skip a kid.
7. Tap **Include another kid from Sunflowers** to add a class kid.
8. Hit **Confirm matches** → wait for drafts.
9. Edit any draft text.
10. Hit **Send to N families**.

---

## Open questions for the developer

1. **Color decision** — keep existing indigo `#4F46E5` or move to the sage green the design lands on?
2. **Voice capture backend** — the compose sheet implies on-device transcription before send. Confirm whether transcription happens client-side (Expo Speech) or server-side (upload audio).
3. **`matches` data shape** — schema change required to support multi-kid-per-photo. If the existing schema is one-photo-one-kid, that's a backend lift.
4. **Class `glyph` + `hue`** — add to the GraphQL schema, or compute client-side?
5. **Realtime status** — Apollo subscription, polling, or something else?

These are blockers worth resolving before sinking days into the build.
