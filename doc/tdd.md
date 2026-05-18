# Sprout - Technical Design Document (TDD)

## 1. System Architecture
The system consists of a centralized Python backend service communicating with a mobile app (React Native) and a web admin portal (React). The database is MongoDB, enabling flexible data modeling. AI/ML processing is handled natively in the Python backend.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React (Vite)  │     │  React Native   │     │   MongoDB       │
│   Web Admin     │     │  (Expo) Mobile  │     │   (Atlas)       │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────┬───────────┘                       │
                     │ REST API                          │
              ┌──────▼──────┐                            │
              │   Python    │◄───────────────────────────┘
              │  (FastAPI)  │
              │   Backend   │
              └──────┬──────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
    ┌────▼────┐ ┌────▼────┐ ┌───▼─────┐
    │ Google  │ │  Face   │ │ Image   │
    │ Gemini  │ │ Recog.  │ │ Process │
    └─────────┘ └─────────┘ └─────────┘
```

## 2. Tech Stack
- **Database**: MongoDB (Atlas for managed cloud hosting, integrates easily with Railway).
- **Backend**: Python 3.12+ with FastAPI. Uses Motor (async MongoDB driver) for database access.
- **Mobile App**: React Native (Expo SDK 54, RN 0.81.5) for cross-platform (iOS/Android). Apollo Client for GraphQL. `@react-navigation/native` v7 for navigation (bottom tabs + native stacks). `@react-native-async-storage/async-storage` for JWT storage and language persistence. `i18next` + `react-i18next` for EN/ZH/FR internationalisation (language saved under key `sprout_lang` in AsyncStorage).
- **Web Admin**: React (Vite + TypeScript) with react-i18next for EN/ZH/FR internationalisation.
- **AI/ML Libraries**:
  - `google-generativeai` — Gemini API for LLM text generation and vision tasks.
  - `face_recognition` / `deepface` — Kid identification from photos. *(Not yet wired up.)*
  - `Pillow` / `OpenCV` — Image manipulation (stickers, text overlays, captions). *(Not yet wired up.)*
- **Email**: SendGrid (`sendgrid>=6.11.0`). Falls back to console logging if `SENDGRID_API_KEY` is not set.
- **Hosting/Deployment**: Railway. Railway supports native deployment for Python and static sites.
- **File Storage**: Railway Bucket (S3-compatible). Credentials live in env vars `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`. The backend wrapper is `app/core/storage.py` (boto3). Image pre-processing (EXIF strip, 1600px full, 400px thumbnail) is in `app/ai/image_processor.py` (Pillow). Profile photo URLs in MongoDB are stored as `null` until Phase 2 wires the upload mutation.

## 3. Project Structure
```
sprout/
├── backend/           # Python FastAPI backend
│   ├── app/
│   │   ├── main.py           # FastAPI app entry point, CORS, router registration
│   │   ├── models/           # Pydantic models & MongoDB schemas
│   │   ├── routes/           # API route handlers
│   │   ├── core/             # Config, auth, database connection, email service
│   │   └── ai/               # AI module stubs (face_recognizer, llm_service, image_processor)
│   ├── requirements.txt
│   └── Dockerfile
├── web/               # React (Vite) admin portal
│   ├── src/
│   │   ├── pages/            # Login, Dashboard, Institutions, NewInstitution,
│   │   │                     #   ActivateAccount, Users, Classes, Settings
│   │   ├── components/       # Layout, sidebar
│   │   └── lib/              # api.ts (authFetch), i18n.ts
│   ├── package.json
│   └── Dockerfile
├── mobile/            # React Native (Expo) app for educators and parents
│   ├── src/
│   │   ├── apollo/client.ts      # ApolloClient with JWT auth link
│   │   ├── contexts/AuthContext.tsx  # JWT + user state, role-aware routing
│   │   ├── navigation/           # AppNavigator, EducatorNavigator, ParentNavigator
│   │   ├── screens/educator/     # ClassesScreen, RosterScreen, LogActivityScreen
│   │   ├── screens/parent/       # FeedScreen, KidDetailScreen, SummaryScreen
│   │   ├── screens/ProfileScreen.tsx
│   │   ├── config.ts             # GRAPHQL_URL constant
│   │   └── theme.ts              # Colors, Spacing, Radius, Shadow
│   ├── App.tsx
│   └── package.json
├── doc/               # PRD, TDD, and runbook
└── CLAUDE.md          # AI agent rules (enforces doc sync)
```

## 4. Data Model (MongoDB)

> **Note on `_id` storage**: Pydantic v2's `model_dump()` serialises `PyObjectId` fields to strings by default. As a result, all `_id` and `institution_id` fields are stored as strings in MongoDB, not BSON ObjectIds. All queries must use the string form — never `ObjectId(id)`.

### 4.1 Users Collection
- `_id`: String (PyObjectId serialised to string on insert)
- `role`: Enum (`super_admin`, `admin`, `educator`, `parent`)
- `email`: String (unique, sparse)
- `username`: String (unique, sparse)
- `passwordHash`: String (nullable — null for pending users)
- `status`: Enum (`active`, `pending`) — pending until account is activated
- `profile`: Object
  - `firstName`: String
  - `lastName`: String
  - `phone`: String (optional)
  - `avatarUrl`: String (optional)
- `institution_id`: String (FK → institutions._id; null for super_admin)
- `createdAt`: Date
- `updatedAt`: Date

### 4.2 Kids Collection
- `_id`: String
- `firstName`: String
- `lastName`: String
- `dateOfBirth`: Date
- `parent_user_ids`: Array of User ID strings
- `class_id`: String
- `institution_id`: String (FK → institutions._id)
- `faceEmbedding`: Binary (128-d vector for face recognition, encrypted at rest)
- `profilePhotoKey`: String (optional) — S3 object key for the processed full-size profile photo. The GraphQL `profilePhotoUrl` field is resolved from this key at read time via `safe_presign_get(key)` (1-hour pre-signed GET URL). Thumbnail is at `{prefix}/profile-thumb.jpg` by convention.
- `createdAt`: Date
- `consent` *(TODO — required before any photo feature ships)*: Embedded document recording parental consent for media handling. Shape:
  ```
  consent: {
    photoStorage:    { granted: bool, by_user_id: str, at: datetime, revoked_at?: datetime },
    aiProcessing:    { granted: bool, by_user_id: str, at: datetime, revoked_at?: datetime },
    faceRecognition: { granted: bool, by_user_id: str, at: datetime, revoked_at?: datetime },
  }
  ```
  Default for all three is `granted: false` (opt-in, not opt-out). Backend enforcement:
  - Photo upload mutation rejects when `photoStorage.granted` is false for any kid featured in the upload.
  - The face-embedding job skips kids where `faceRecognition.granted` is false (and deletes any previously stored `faceEmbedding`).
  - The AI captioning job skips photos when *any* featured kid has `aiProcessing.granted = false`.
  - Revoking any flag triggers the deletion job in [Section 9.1](#91-photo-storage-todo).

### 4.3 Classes Collection
- `_id`: String
- `name`: String
- `institution_id`: String (FK → institutions._id)
- `educator_user_ids`: Array of User ID strings
- `kid_ids`: Array of Kid ID strings
- `createdAt`: Date

### 4.4 Updates/Activities Collection
- `_id`: String
- `kid_id`: String (or Array for group updates)
- `educator_user_id`: String
- `class_id`: String
- `type`: Enum (`meal`, `nap`, `activity`, `photo`, `daily_summary`)
- `content`: String (teacher's raw input or AI-generated text)
- `aiGeneratedContent`: String (optional, LLM-drafted parent-friendly message)
- `mediaUrls`: Array of Strings (photos, optionally AI-enhanced)
- `detectedKidIds`: Array of Strings (auto-detected kids from photos)
- `timestamp`: Date

### 4.5 Institutions Collection
- `_id`: String
- `name`: String
- `address`: String (optional)
- `city`: String (optional)
- `province`: String (optional)
- `status`: Enum (`active`, `inactive`, `deleted`) — `deleted` institutions are soft-deleted and hidden from all listings
- `createdAt`: Date

### 4.6 Invitations Collection
- `token`: String (unique index, secure random token via `secrets.token_urlsafe(32)`)
- `user_id`: String (FK → users._id)
- `institution_id`: String (FK → institutions._id)
- `role`: Enum (`admin`, `educator`, `parent`)
- `expires_at`: Date (TTL index, default: 72 hours)
- `used`: Boolean (default: false)
- `created_at`: Date

## 5. API Endpoints

> **GraphQL Migration Completed**: All REST routes have been removed. The sole API entry point is `/graphql` (Strawberry + FastAPI). It supports all queries, mutations, Node interface, errors-as-data unions, and Relay cursor pagination. Schema reference: [`doc/graphql-schema.html`](./graphql-schema.html). The legacy REST endpoints listed below are retained for historical reference only — they no longer exist in the codebase.

### Auth APIs
- `POST /api/auth/register` — Register a new user directly (used for bootstrapping super_admin).
- `POST /api/auth/login` — Login and receive JWT token. Rejects `pending` users. Rejects `admin`/`educator` users whose institution has `status: deleted` with a generic 401.
- `GET /api/auth/validate-token/{token}` — Validate an invitation token; returns user/institution info for the activation page.
- `POST /api/auth/activate` — Activate a pending account (set password via invitation token, sets status → `active`).

### Institution APIs
- `GET /api/institutions` — List all institutions where `status != deleted`.
- `POST /api/institutions` — Create a new institution. If admin info is provided, creates a pending user and sends an activation email via SendGrid.
- `GET /api/institutions/{id}` — Get a single institution with full detail: admin info (id, name, email, status), `educators` array (id, name, email, status), `kids` array (id, firstName, lastName, dateOfBirth, class_id), and `classCount`.
- `DELETE /api/institutions/{id}` — Soft-delete: sets `status: deleted`. Does not remove data.

### Admin APIs
- `POST /api/admin/invite` — Invite an educator by email. Requires `admin` JWT. Body: `{ first_name, last_name, email }`. Validates whitelist + email uniqueness, creates a pending user with the caller's `institution_id`, generates an invitation token, and sends an activation email. Returns `{ success, email }`.
- `GET /api/admin/users` — List all educators and parents for the caller's institution. Requires `admin` JWT. Returns array of `{ id, firstName, lastName, email, role, status }`.
- `mutation createClass(input: { name: String! }) → Class` — Create a class scoped to the caller's institution. Requires `admin` or `super_admin` role. Returns the new class with empty educator/kid lists. Generates an explicit string `_id` via `str(ObjectId())`.
- `mutation assignClass(input: { classId: ID!, name: String, educatorIds: [ID!], kidIds: [ID!] }) → Class` — Replace educator and/or kid membership on a class, and optionally rename it. Setting `kidIds` also sets `class_id` on each affected kid document. Includes ObjectId fallback lookup for classes created before the string-ID fix. Requires `admin` or `super_admin` role.
- `mutation deleteClass(classId: ID!) → Boolean` — Delete a class. Clears `class_id` from all kids in the class, then removes the class document. Includes ObjectId fallback for legacy classes. Requires `admin` or `super_admin` role.
- `query class(id: ID!) → Class` — Fetch a single class by ID. Includes ObjectId fallback for classes created before the string-ID fix.
- `query classes → [Class]` — List all classes for the caller's institution (or all classes for `super_admin`).
- `POST /api/kids` — Add a new kid.
- `PUT /api/kids/{id}` — Update kid info.

### Educator APIs *(planned)*
- `GET /api/teacher/classes` — Get assigned classes and their kids.
- `POST /api/updates` — Create a new update for a kid.
- `POST /api/updates/photo` — Upload a photo; AI identifies kids and generates captions.
- `POST /api/ai/draft-update` — Generate an AI-drafted parent-friendly message from quick tags.

### Kids APIs
- `POST /api/kids/register` — Register a kid. Requires `admin` JWT. Body: `{ firstName, lastName, gender, dateOfBirth (YYYY-MM-DD), profilePhotoUrl?, parents: [{ firstName, lastName, email, phone? }] }`. For each parent: if email already exists, links to existing account (no email sent); otherwise creates a pending parent user, generates an invitation token, and sends a parent activation email. Returns `{ success, kid_id, emails_invited }`.
- `GET /api/kids` — List all kids for the caller's institution. Requires `admin` JWT. Returns array of `{ id, firstName, lastName, gender, dateOfBirth, profilePhotoUrl, parentCount }`.

**Photo upload (GraphQL mutations):**
- `presignKidPhotoUpload(kidId, contentType)` → `{ uploadUrl, objectKey, expiresAt }` — Returns a 5-minute pre-signed PUT URL. Caller is admin, educator (same institution), or parent of the kid. Accepted content types: `image/jpeg`, `image/png`, `image/webp`. Raw object key: `institutions/{inst}/kids/{id}/raw-{uuid}.jpg`.
- `confirmKidPhotoUpload(kidId, objectKey)` → `Kid` — Server downloads raw from S3, runs through `image_processor.process()` (EXIF strip + resize), uploads full (`profile.jpg`) and thumb (`profile-thumb.jpg`), deletes raw, stores `profilePhotoKey` in MongoDB. Returns updated Kid with fresh `profilePhotoUrl`.

### Parent APIs
- `GET /api/parent/kids` — List all kids linked to the authenticated parent. Requires `parent` JWT. For each kid returns: `id`, `firstName`, `lastName`, `gender`, `dateOfBirth`, `profilePhotoUrl`, `institution` (id, name), `class` (id, name), `educators` (id, name). Class and educator fields are `null` if not yet assigned.

### Parent APIs (further planned)
- `GET /api/parent/kids` — Get kid's info and assigned class.
- `GET /api/updates/{kidId}` — Get feed of updates for a kid (paginated).
- `GET /api/updates/{kidId}/summary` — Get AI-generated daily summary.

## 6. Email Service (`backend/app/core/email_service.py`)

- Sends transactional emails via SendGrid (`sendgrid` Python SDK).
- **Dev whitelist**: When `EMAIL_WHITELIST_ENABLED=true`, only emails matching addresses in `EMAIL_WHITELIST` (comma-separated) are sent. Gmail addresses are normalised (dots stripped, `+suffix` removed) before comparison.
- **No API key fallback**: If `SENDGRID_API_KEY` is empty, the activation URL is printed to the console instead of sent. The API returns success in this case so the UI flow is unaffected.
- The `uvicorn` reloader does **not** watch `.env` — restart the server after changing `SENDGRID_API_KEY`.

## 7. AI Module Design (`backend/app/ai/`)

Stub files exist; none are wired into routes yet.

### 7.1 Face Recognition (`face_recognizer.py`)
- On kid onboarding, admin uploads a reference photo. The system generates a 128-d face embedding and stores it in the Kids collection.
- When an educator uploads a photo, the system extracts faces, generates embeddings, and matches against stored kid embeddings.

### 7.2 LLM Service (`llm_service.py`)
- Uses Google Gemini API.
- **Draft Update**: Takes educator's quick tags + context and generates a warm parent-friendly message.
- **Photo Summarisation**: Uses Gemini Vision to analyse a photo and return a text description of the activity.
- **Daily Summary**: Aggregates all updates for a kid on a given day and generates a comprehensive narrative.

### 7.3 Image Processor (`image_processor.py`)
Processing pipeline for every uploaded photo. Returns a `ProcessedImage(full, thumbnail)` named tuple.
- **EXIF strip**: `ImageOps.exif_transpose` corrects orientation then a clean RGB copy is built — no metadata in stored object.
- **Full image**: longest side ≤ 1600 px, JPEG @ 80% quality (never upscaled).
- **Thumbnail**: longest side ≤ 400 px, JPEG @ 75% quality — used for feed previews.
- Raises `ValueError` for non-image input so the caller can return a 400.

Sticker/caption overlay helpers are deferred to Phase 4 (AI photo enhancement).

## 8. Mobile App — GraphQL Usage

The mobile app uses the same GraphQL endpoint as the web portal. JWT is stored in AsyncStorage and attached by an Apollo `setContext` link on every request.

### Educator screens
- **ClassesScreen**: `query { me { classes { id name kids { id } educators { id } } } }` — uses the `User.classes` sub-field (filters by `educator_user_ids`), not the admin-restricted `classes` query.
- **RosterScreen**: `query { class(id) { id name kids { ... } educators { ... } } }` — visible to any authenticated user.
- **LogActivityScreen**: `mutation createUpdate(input: { classId, type, content, kidId? })` — logs a meal, nap, activity, or photo update.

### Parent screens
- **FeedScreen**: `query { kids(first: 50) { edges { node { ... institution { ... } class { ... educators { ... } } } } } }` — `kids` query is scoped to the caller's kids when the JWT role is `parent`.
- **KidDetailScreen**: `query { kid(id) { updates(first, after) { edges { ... pageInfo { hasNextPage endCursor } } } } }` — paginated update feed for a single kid, newest-first.
- **SummaryScreen**: `query { kid(id) { dailySummary(date) { content aiGeneratedContent timestamp } } }` — generates an AI summary on demand if it doesn't exist for that date.

### Navigation structure
- `AppNavigator` (root) → role-aware routing: Login | EducatorNavigator | ParentNavigator | UnsupportedRoleScreen
- `EducatorNavigator`: three bottom tabs:
  - **Classes** — `ClassesStack`: ClassesScreen → RosterScreen → LogActivityScreen (params: classId, className, optional kidId/kidName)
  - **Quick Log** — `QuickLogScreen`: standalone tab; loads educator's classes, shows horizontal chip selector + activity form; submits via `createUpdate` mutation scoped to a class (no kidId)
  - **Settings** — `SettingsStack`: SettingsScreen (language picker + My Profile link) → ProfileScreen
- `ParentNavigator`: bottom tabs (Feed stack → KidDetail → Summary, Profile)

### Mobile i18n
- Translations live in `mobile/src/i18n/index.ts` (EN, ZH, FR). Keys: `tabs.*`, `profile.*`, `settings.*`, `language.*`, `roles.*`, `quickLog.*`.
- On app start (`App.tsx` `useEffect`) `loadSavedLanguage()` reads `sprout_lang` from AsyncStorage and calls `i18n.changeLanguage()`.
- `setLanguage(code)` (exported from `i18n/index.ts`) changes language at runtime and persists to AsyncStorage.

### Config
- Backend URL is set in `mobile/src/config.ts` as `GRAPHQL_URL`. Change to the machine's LAN IP when testing on a physical device.

## 8b. Web Frontend Conventions

- **CSS classes**: `btn-primary` (filled indigo), `btn-secondary` (transparent with border), `glass-card`, `input-field`, `form-group` — all defined in `src/index.css`.
- **API calls**: All authenticated requests go through `authFetch()` in `src/lib/api.ts`, which injects the JWT from `localStorage`.
- **i18n**: All user-facing strings use `useTranslation()` with keys in `src/lib/i18n.ts`. Three locales: `en`, `zh`, `fr`.
- **Modals**: Implemented as fixed-position overlays with `zIndex: 1000` and a semi-transparent backdrop.
- **Auth failure handling**: Apollo error link in `src/lib/apollo.ts` watches for GraphQL errors with `extensions.code === "UNAUTHENTICATED"` (raised by the backend `IsAuthenticated` permission) or 401 network errors. On match it calls `clearSession()` and dispatches a `window` `auth:logout` event. `PrivateRoute` in `App.tsx` wraps every authenticated route, listens for the event, and uses React Router `navigate('/login')` for the redirect — no hard reload.

## 9. Deployment Strategy (Railway)

- **Railway Services**:
  - `sprout-backend`: Python FastAPI service (Dockerfile-based deploy).
  - `sprout-web`: React (Vite) static site.
  - `MongoDB`: Railway managed MongoDB plugin or external MongoDB Atlas connected via `MONGODB_URL` env variable.
- **Environment Variables**: `MONGODB_URL`, `DATABASE_NAME`, `JWT_SECRET`, `GEMINI_API_KEY`, `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `FRONTEND_URL`, `EMAIL_WHITELIST_ENABLED`, `EMAIL_WHITELIST`.
- **CI/CD**: GitHub integration with Railway. Pushes to `main` automatically trigger builds and deployments.
- **File Storage**: Cloud storage (e.g., AWS S3 or Cloudflare R2) for photos and media. URLs stored in MongoDB. *(Not yet configured.)*

### 9.1 Photo Storage *(TODO)*

Planned: **Railway Buckets** (S3-compatible object storage, same project as the backend). All vendor-specific bits (endpoint, region, key, secret, bucket name) live in env vars (`S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`) so the backend can swap to R2 / S3 / GCS later without code changes.

Required pieces before launch:

- **Pre-signed upload mutation**: `presignPhotoUpload(input: { kidIds: [ID!]!, contentType }) → { uploadUrl, objectKey, expiresAt }`. Backend verifies the educator owns the class, all `kidIds` have `consent.photoStorage.granted = true`, and returns a one-time PUT URL (TTL 5 min). Object key format: `institutions/{inst_id}/kids/{primary_kid_id}/{uuid}.jpg`.
- **Pre-signed read URLs**: `Update.mediaUrls` field resolves to time-limited GET URLs (TTL 15 min) instead of bare object paths. The bucket itself stays private.
- **Image preprocessing**: an `ImageProcessor` step on upload that (a) strips EXIF metadata (location data leaks home addresses), (b) resizes to max 1600px wide JPEG @ 80% quality, (c) generates a 400px thumbnail. Stored under `…/{uuid}.jpg` and `…/{uuid}_thumb.jpg`.
- **Delete-on-revocation hook**: when `consent.photoStorage` is revoked OR a kid is removed OR an institution is deleted, an async job:
  1. Enumerates all `updates` documents where `detectedKidIds` contains the kid.
  2. For each, removes the kid from `detectedKidIds`. If the kid was the *only* tagged kid, deletes the bucket objects (`{key}` and `{key}_thumb`) and the update document.
  3. Deletes the kid's `faceEmbedding` field.
- **Orphan-reconciliation cron**: weekly job that lists all bucket objects under `institutions/…` and removes any whose object key is not referenced by any `updates.mediaUrls` or `kids.profilePhotoUrl`.
- **Audit log collection**: a new `consent_audit` collection records every consent grant/revoke event (`kid_id`, `flag`, `granted`, `by_user_id`, `at`) for compliance retention.
