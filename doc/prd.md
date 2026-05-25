# Sprout - Product Requirements Document (PRD)

## 1. Introduction
Sprout is an AI-native day care management system designed to streamline communication between school administrators, educators, and parents. It serves as a modern, intelligent competitor to legacy platforms like Procare, leveraging AI to enhance the daycare experience with automated insights, seamless real-time updates, and an incredibly intuitive, premium user experience.

## 2. Target Roles
- **System Administrator (super_admin)**: Platform owners. Manage Sprout globally, onboard new day care institutions, and set up Institution Admins.
- **Institution Administrator (admin)**: Manage operations for a specific day care center. Responsible for class creation, educator management, parent onboarding, and student assignments.
- **Educator (educator)**: Teachers and staff who interact directly with children. They manage daily activities, log updates, take photos, and communicate with parents.
- **Parent (parent)**: Guardians who receive real-time updates, photos, and daily summaries about their children's activities and well-being.

## 3. Web Admin Portal (Platform Management)
The Web Portal is a React-based application designed for System and Institution Administrators. It features a premium, glassmorphism-inspired design with a focus on speed and usability. The interface supports English, Chinese (Simplified), and French via i18n.

### 3.1 System Admin Experience
**Purpose:** Provide platform-level oversight and client onboarding.
- **System Overview Dashboard (`/dashboard`)**: Displays high-level platform metrics including Total Day Cares, Total Kids Enrolled, and Active Day Cares. Lists all institutions with their Institution Admin, kid count, class count, and status badge.
- **Institution Management (`/institutions`)**: A list of all active day care centers on the platform. Allows the System Admin to view details and status of each center.
- **Onboarding Flow (`/institutions/new`)**: A form to register a new day care institution (Name, Street Address, City, Province/State). Includes an optional Institution Administrator section (First Name, Last Name, Email) — if provided, a pending admin account is created and an activation email is sent immediately. A success modal confirms the email was sent and shows the admin's address.
- **Delete Institution**: A trash icon on each institution card opens a confirmation modal. The modal displays a danger warning and requires the admin to type the institution's exact name before the delete button becomes active. On success, a second modal confirms the deletion. Deletion is a **soft-delete** — the institution's status is set to `deleted`; no data is removed from the database.

### 3.2 Institution Admin Experience
**Purpose:** Daily operational management for a specific day care center.
- **Institution Dashboard (`/dashboard`)**: Overview of the specific day care's activities, active classes, educator count, and pending invitations.
- **User Management (`/users`)**: Interface to invite and manage educators. Supports generating email deep-links for seamless onboarding.
- **Class Management (`/classes`)**: Institution admins can create classes and manage membership.
  - **List view**: All classes for the institution are shown in a table with class name, educator count, and kid count. Clicking a row navigates to the class detail page.
  - **Add Class flow**: An "Add Class" button opens a modal where the admin enters a class name, searches for educators and kids (real-time prefix search, max 10 results each), selects them as chips, and submits. Submitting creates the class and immediately assigns the selected members.
  - An empty-state is shown when no classes exist.
- **Class Detail (`/classes/:id`)**: Shows full class info — name, list of educators (name, email, status), list of enrolled kids (name, DOB, gender).
  - **Edit Class**: An "Edit Class" button opens a modal pre-populated with the current name, educators, and kids. The admin can rename, add/remove educators, and add/remove kids using the same real-time search pattern.
  - **Delete Class**: A "Delete Class" button opens a confirmation modal. On confirm, the class is deleted and the admin is redirected to `/classes`. All kids in the class have their `class_id` cleared.

### 3.3 Parent Web Experience
**Purpose:** Give parents a focused view of their own children only.

- **Nav:** Parents see only **My Kids** (`/my-kids`). Classes, Kids, and Users tabs are hidden.
- **My Kids (`/my-kids`):** Lists all kids linked to the parent's account. Each kid card shows the enrolled day care, assigned class, and educators.
- Parents do **not** appear in the institution's User Management view — that list is educators only.

### 3.3a Profile Photo Upload *(TODO)*
- Kids and users have a profile photo field in the UI, but photos are not currently saved.
- Requires cloud file storage (e.g. S3 or Cloudinary) to be configured before this can ship.
- Once available, photos should be uploadable from the Register Kid form and editable from the kid/user profile page.

### 3.5 Educator Web Experience *(TODO)*
**Purpose:** Give educators a focused view of only what is relevant to them.

- **Nav:** Educators see Classes and Kids only — User Management is hidden.
- **Classes (`/classes`):** Educators see only the classes they are assigned to, not all institution classes.
- **Kids (`/kids`):** Educators see only the kids enrolled in their assigned classes, not all kids in the institution.
- Scoped views require backend filtering by `educator_user_ids` on the class documents.

### 3.6 Institution Permission System *(TODO)*
**Purpose:** Give the Institution Admin granular control over what each institution user can do.

**Rules:**
- Institution Admin always has full access to all permissions.
- When inviting a new user, the admin selects which permissions to grant.
- Permissions can be changed at any time from the User Management screen.

**Available permissions:**
| Permission | Description |
|---|---|
| `edit_profile` | Edit institution profile and settings |
| `edit_class` | Create, update, and delete classes |
| `invite_user` | Invite new users to the institution |
| `register_kid` | Add and manage kids |

**UI touch-points:**
- Invite User modal — permission checkboxes shown after filling in name/email.
- User Management table — each row has an "Edit Permissions" action that opens a permissions panel.

### 3.7 Forgot Password Flow *(TODO)*
**Purpose:** Allow institution admins, educators, and parents to recover access if they forget their password.

- Available to: `admin`, `educator`, `parent` roles only. System admins (`super_admin`) are excluded — they must reset via the backend directly.
- Flow:
  1. "Forgot password?" link on the login page.
  2. User enters their email address.
  3. A password reset email is sent with a time-limited link (e.g. 1 hour).
  4. Clicking the link opens a page to set a new password.
  5. On success, the old token is invalidated and the user is redirected to login.
- Requires a new `password_reset_tokens` collection and a `POST /api/auth/forgot-password` + `POST /api/auth/reset-password` endpoint pair.
- A dedicated reset email template should be added to `backend/app/core/email/`.

### 3.8 Phone Number Setup *(TODO)*
**Purpose:** Allow users to add or update their phone number from within the app.

- Available to all roles.
- Accessible from the Settings page (`/settings`).
- Phone number is stored in `users.profile.phone`.
- UI: a simple edit field in the account section of Settings with a Save button.

### 3.9 Two-Factor Authentication via SMS *(TODO)*
**Purpose:** Provide an optional second factor for login using a one-time SMS code.

- Depends on 3.8 (phone number must be set before 2FA can be enabled).
- User opts in from the Settings page; enabling 2FA requires verifying the phone number first via a test SMS.
- On login, after correct password, user is prompted to enter the SMS code before being granted access.
- Requires an SMS provider (e.g. Twilio) and a `POST /api/auth/verify-otp` endpoint.

### 3.10 Photo Storage & Parental Consent *(TODO)*
**Purpose:** Legally and ethically store children's photos with explicit, granular parental consent.

Photos of minors fall under **COPPA** (US, under-13) and **GDPR** (EU). Before any photo upload feature ships, the following must be in place:

- **Granular consent at kid registration / activation**. Parents must opt in (or out) separately for:
  1. Storing photos of their child on Sprout servers.
  2. AI analysis of those photos (captioning, scene understanding via Gemini).
  3. Face recognition (storing a face embedding and using it to auto-tag the child in group photos).
- Each consent flag is recorded on the `Kid` document with a timestamp and the consenting parent's `user_id` (audit trail). Parents can revoke any of the three at any time from the parent app.
- **Photo capture / display gating**: educators cannot upload a photo *featuring* a kid who hasn't consented to photo storage. The AI pipeline must skip embedding/captioning for kids who haven't consented to AI processing.
- **Right-to-delete**: when a parent revokes consent, when a kid leaves the institution, or when an institution is deleted, the system must purge:
  - All photo objects from the bucket (not just MongoDB references).
  - The kid's face embedding (and any cached AI metadata).
  - Any photo updates that *only* feature that kid.
- A weekly background job reconciles MongoDB photo references against the bucket and deletes orphaned objects.
- A consent dashboard in the parent app shows the current state of all three flags and the date each was granted/revoked.
- System admins are out of scope (they do not use the app login flow).

## 4. Mobile App Experience (React Native)
The Mobile App is designed for on-the-go usage by Educators in the classroom and Parents at home or work.

### 4.1 Educator Flow
**Purpose:** Fast, frictionless logging of activities with minimal screen time.

The educator app has three bottom tabs:

1. **Classes** — Browse assigned classes, tap a class to view its roster, then tap a child to open the full activity log form (activity type + free-text note). Logs are scoped to a specific child.
2. **Quick Log** — AI-first whole-class logging in a 3-step wizard. See §4.1a for full detail.
3. **Settings** — Contains:
   - **My Profile**: Displays name and role.
   - **Language**: Inline language picker (English / 中文 / Français). Selection persists across sessions.

- **Photo Enhancement**: Optional tools to apply AI-generated stickers, captions, or fun overlays to photos before sharing. *(Not yet implemented.)*

### 4.1a AI Quick Log (Educator Mobile) — 3-Step Flow
**Purpose:** Let an educator capture a voice note and/or batch photos in seconds, then hand off to an AI agent that drafts per-kid parent updates in the background while the educator gets on with their day.

**Step 1 — Capture (QuickLogScreen)**
- Single full-height input card between an optional class chip selector and a "Send to Agent" footer.
- **Voice note**: round mic button at the card's bottom-right; tap to start on-device speech recognition (expo-speech-recognition); transcribed text streams into the note field in real time. Tap again to stop.
- **Photos**: tap "Add Photos" to multi-select up to 10 images; each is presigned and uploaded to S3 in the background, then shown in a 3-column wrap grid inside the card.
- **Send to Agent** creates a Quick Log conversation (`agent_type: "quick_log"`) in the AI tab and immediately navigates the educator there. The conversation stores `transcript` and `all_photo_keys` at creation. A `quick_log_analysis` background job is enqueued.

**Step 2 — Photo Review (PhotoClassificationScreen)**
- The background job runs face recognition on every submitted photo, groups them by identified child, and creates empty `draft_card` messages (no text yet). Conversation status transitions to `awaiting_photo_review`.
- In the AI tab conversation, a **"Review photo grouping →"** card appears. Tapping it opens the Photo Review screen.
- The educator sees one card per detected child, each with their avatar, name, and matched photos.
- **Drag-and-drop**: educator can drag a photo from one child's card to another to reassign it.
- **Remove photo**: tap "×" on any photo to exclude it from a child's card.
- **Add child**: "+ Add child" dashed button opens a picker to add a child who wasn't auto-detected; an empty draft card is created for them.
- **Disable child**: toggle button disables a child's card (they won't get an update).
- **Confirm & Summarise**: footer button transitions the conversation back to `processing` and enqueues a `quick_log_summarize` job.

**Step 3 — Text Review (QuickLogReviewScreen)**
- The summarizer job reads the educator-confirmed photo assignments (current `draft_card` messages) plus the original transcript. For each enabled draft card it:
  1. Extracts any voice mention for that child from the transcript.
  2. If photos are assigned, describes each scene and generates a warm parent update text.
  3. Combines voice and photo context into a single update draft.
- Conversation status transitions to `awaiting_review`. A **"Drafts are ready — review & send"** card appears in the conversation.
- Tapping opens the Review screen: editable draft cards (avatar, name, photo strip, content textbox, Remove button).
- A footer button "Send N updates to parents" submits every remaining draft in a single batch as `Update` documents. The educator can edit text inline or remove individual drafts before sending.

### 4.1e Linked Calendars (Educator Mobile)
**Purpose:** Let educators see their personal and work calendar events alongside their class schedule on the home screen.

**Home screen — Today's Schedule:**
- The "TODAY'S SCHEDULE" section above My Classes shows events from all linked calendars for the current day, sorted by start time.
- Each event row shows a coloured dot (provider colour), event title, optional location, and start time (or "All day" for full-day events).
- Empty state: "No events today — link a calendar in Settings."
- Google and Outlook events are fetched from the backend (synced via OAuth); Apple Calendar events are read directly from the device.

**Settings → Linked Calendars (`CalendarSettingsScreen`):**
- Lists three provider rows: Google Calendar, Outlook Calendar, Apple Calendar.
- **Connect** (Google/Outlook): launches OAuth in the system browser via `expo-web-browser`; on success the backend stores tokens and kicks off an immediate sync.
- **Connect** (Apple): requests iOS EventKit permission; on grant, creates a stub integration record in the backend. Events are always read directly from the device — no tokens are stored.
- **Disconnect**: removes the OAuth token and deletes all cached calendar events for that provider. A confirmation alert is shown before disconnecting.
- Connected accounts show the linked email address (or "This device" for Apple) below the provider name.

**Privacy:** OAuth tokens are stored server-side. Apple Calendar events never leave the device. Read-only access only — Sprout never writes to user calendars.

### 4.1b AI Tab (Educator Mobile)
**Purpose:** Unified view of all AI conversations — both Quick Log tasks and free-form chat sessions.
- Conversation list (recent first) with status badges (Working… / Review / Sent / Failed) and last-update timestamps.
- **New Chat button** in the header: creates a `chat` conversation, opens it immediately with an AI greeting.
- Conversation detail subscribes to a GraphQL subscription so new messages appear live as the worker writes them.
- Educator can leave any conversation at any time; status updates continue in the background.
- **Chat input bar**: visible in all conversations except `status === 'sent'`. Typing and sending exchanges free-form messages with the Sprout AI assistant (powered by Gemini Flash).
- **User bubbles**: educator's own messages appear right-aligned with a primary-colour background; agent messages appear left-aligned.
- The "Send to parents" footer and "Review photo grouping / Drafts ready" cards appear only in `quick_log` conversations at the appropriate step.

### 4.1c Kid Profile & Activity Detail (Educator Mobile)
**Purpose:** Let an educator dive into a specific child's record directly from the class roster, review logged activities, and share milestones.

**Kid Profile screen** (reached by tapping a child's card in the Roster):
- **Header**: child's avatar (hue-based gradient or profile photo), full name, class pill ("S · Sunflowers"), age ("2y 11m"), and date of birth.
- **Parents section**: list of linked parents with their avatar, name, and relationship label (Mom / Dad). A green **Message** button opens the child's group chat thread directly.
- **Activity section**: displays the most recent 5 logged activities. Scrolling to the bottom fetches the next page (10 at a time), sorted by time descending. Each activity card shows:
  - Up to 2 photos (full-bleed at the top of the card)
  - Update text (AI-enhanced if available)
  - Timestamp, `+AI` badge if AI-enhanced, and "✓ Sent to parents" label

**Activity Detail screen** (reached by tapping an activity card):
- Horizontally pageable full-width photo strip (all photos for that update).
- Activity type badge + AI badge.
- Educator name and timestamp.
- Full update text.
- **Share section**: four buttons (Facebook, Twitter/X, WhatsApp, WeChat) *(TODO — UI only, platform SDK integration pending)*

**Post-send activity links** (ConversationScreen after Quick Log is sent):
- After the educator sends drafts via the Quick Log flow, a "View logged activities" card appears at the bottom of the conversation. Each enabled child is shown with a tap-target that navigates directly to their Kid Profile screen.

### 4.1d Chat Tab (Educator Mobile)
**Purpose:** Group messaging channel per child, accessible to all educators assigned to the child's class and all parents linked to that child.
- **Chat list**: one row per child, showing the child's avatar, name, last message preview, sender prefix, and time. Activity-card messages are previewed as `📋 <first line of update>` so the row isn't empty.
- **Kid chat**: real-time group chat for a single child. The viewer's own messages appear right-aligned (primary colour); other senders appear left-aligned with their first name and role label (`Sender · Parent` / `Sender · Educator`).
- **Activity card messages**: when an educator sends drafts through Quick Log, the resulting Update is mirrored into the kid's chat thread as a special **activity card** (kind `activity_card`). The card shows up to 3 photo thumbnails (with `+N` overflow chip), a 1–3 line preview of the update text, and a "View activity ›" link. Tapping the card opens the full **Activity Detail** screen — for educators this lands in the Home stack, for parents in the Feed stack.
- Messages are delivered via GraphQL subscription (`kidChatMessageAdded`).
- Parents have a symmetric Chat tab in the parent app showing only children linked to their account.

### 4.2 Parent Flow
**Purpose:** Delightful, real-time connection to their child's day.
- **Live Activity Feed**: A visually rich timeline of their child's day, featuring photos, meal updates, and nap times.
- **Push Notifications**: Real-time alerts for important updates, direct messages, or emergencies.
- **AI Daily Summaries**: At the end of the day, an AI-generated personalized story or summary describing what their child learned and did, synthesizing all the individual logs into a cohesive narrative.
- **Profile & History**: Access to historical updates, medical info, and saved photos.

## 5. AI Features (Core Native Capabilities)
These are first-class, native features of Sprout that differentiate it from competitors:
1. **Smart Photo Recognition**: Face embeddings match kids in group photos, automatically routing the photo to the correct parents without manual tagging.
2. **Generative Parent Updates**: LLM-powered drafting turns fragmented educator notes into warm, grammatically correct messages.
3. **Photo Understanding**: AI analyzes uploaded photos to detect activity context (e.g., "outdoor play", "arts and crafts") and enriches the metadata.
4. **End-of-Day Synthesis**: Aggregates daily data points into a readable, engaging daily report for parents.

## 6. End-to-End User Journeys

### Journey 1: Platform Scaling (System Admin)
1. System Admin logs into the Web Portal.
2. Navigates to **Day Cares** and clicks **+ Add Day Care**.
3. Fills in the details for "Sunshine Daycare" and the admin's name and email.
4. The system provisions the institution, creates a **pending** admin user account (no password), and sends an **activation email** to the admin's email address.
5. A success modal confirms the email was sent and shows the recipient address. The activation link expires in 72 hours.

### Journey 1b: Admin Account Activation (Institution Admin)
**Purpose:** Allow an invited admin to securely set their password and gain access.
1. Institution Admin receives the "You've been invited to Sprout" email.
2. Clicks the **"Activate Your Account"** button in the email.
3. Is directed to the public **Account Activation page** (`/activate?token=xxx`).
4. The page validates the token and displays the admin's name, email, and institution name.
5. Admin enters and confirms a new password.
6. On submit, the account status changes from `pending` → `active`, and the admin is redirected to the **Login** page.
7. Admin logs in with their email and new password.

### Journey 1c: Institution Deletion (System Admin)
1. System Admin clicks the trash icon on an institution card.
2. A confirmation modal appears with a danger warning.
3. Admin types the exact institution name to unlock the Delete button.
4. On confirm, the institution status is set to `deleted` (soft-delete — data is preserved).
5. The institution disappears from all lists immediately.
6. A success modal confirms the deletion.
7. Any `admin` or `educator` users belonging to that institution can no longer log in (they receive a generic "user not found" error).

### Journey 2: Day Care Setup (Institution Admin)
1. Institution Admin logs in with their newly created credentials.
2. Navigates to **Classes** and creates "Toddler Room A".
3. Navigates to **Users** and sends email invites to 3 Educators.
4. Assigns the Educators to "Toddler Room A" and imports the roster of kids.

### Journey 3: The Classroom Experience (Educator)
1. Educator opens the Sprout Mobile App on a tablet.
2. Sees today's calendar events in "TODAY'S SCHEDULE" (if a calendar is linked in Settings).
3. Selects "Toddler Room A".
3. Takes a photo of 4 kids doing a painting activity.
4. Sprout AI detects the faces of the 4 specific kids and tags them.
5. Educator types "messy painting session".
6. Sprout AI drafts: *"The kids had a wonderful and creative time today exploring colors during a messy painting session!"*
7. Educator taps **Send**.

### Journey 4: The Parent Experience (Parent)
1. Parent's phone buzzes with a Sprout notification: *"New photo of Leo!"*
2. Parent opens the app and sees the painting photo and the AI-crafted message in their Feed.
3. At 5:00 PM, Parent receives the **Daily Summary** detailing the painting session, a 1-hour nap, and a full lunch, beautifully formatted by AI.

## 7. Technical & Non-Functional Requirements
- **Architecture**: FastAPI backend (Python), React frontend (Vite/TS), MongoDB Atlas database.
- **Authentication**: JWT-based session management. Account activation via secure, time-limited invitation tokens. Login is blocked for `admin` and `educator` users belonging to a `deleted` institution.
- **Email**: Transactional emails via SendGrid. Dev environment uses an email whitelist with Gmail alias normalization to prevent accidental sends. If no SendGrid API key is configured, activation URLs are logged to the console.
- **Internationalisation**: Web portal supports English, Chinese (Simplified), and French.
- **Performance**: Millisecond response times for logging to ensure educators aren't waiting on spinners.
- **Security & Privacy**: Face embeddings stored securely and used exclusively for internal kid identification. Strict COPPA compliance considerations. Parents must explicitly consent to face recognition during onboarding.
- **Scalability**: Designed with a multi-tenant database strategy using `institution_id` indexing to cleanly separate data across hundreds of day cares.
- **Data Retention**: Institutions are never hard-deleted. Deletion sets `status: deleted`; all associated data is retained for audit and recovery purposes.
