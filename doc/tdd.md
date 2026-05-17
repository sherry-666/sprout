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
- **Mobile App**: React Native (Expo) for cross-platform (iOS/Android) support. *(Not yet implemented.)*
- **Web Admin**: React (Vite + TypeScript) with react-i18next for EN/ZH/FR internationalisation.
- **AI/ML Libraries**:
  - `google-generativeai` — Gemini API for LLM text generation and vision tasks.
  - `face_recognition` / `deepface` — Kid identification from photos. *(Not yet wired up.)*
  - `Pillow` / `OpenCV` — Image manipulation (stickers, text overlays, captions). *(Not yet wired up.)*
- **Email**: SendGrid (`sendgrid>=6.11.0`). Falls back to console logging if `SENDGRID_API_KEY` is not set.
- **Hosting/Deployment**: Railway. Railway supports native deployment for Python and static sites.
- **File Storage** *(TODO)*: No file storage is configured yet. Profile photos (kids, users) are accepted by the frontend UI but `profilePhotoUrl` is always stored as `null`. Requires a cloud storage solution (e.g. AWS S3, Cloudinary, or Railway volume) and a `POST /api/upload` endpoint that returns a URL. Until implemented, profile photos are not persisted.

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
├── mobile/            # React Native (Expo) app — not yet implemented
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
- `profilePhotoUrl`: String (optional)
- `createdAt`: Date

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
- `POST /api/classes` — Create a class.
- `PUT /api/classes/{id}/assign` — Assign educators/kids to a class.
- `GET /api/classes` — List all classes for the institution.
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
- Uses Pillow and/or OpenCV.
- **Sticker Overlay**: Composites stickers onto photos.
- **Text Overlay**: Adds captions with customisable fonts/colours.

## 8. Frontend Conventions

- **CSS classes**: `btn-primary` (filled indigo), `btn-secondary` (transparent with border), `glass-card`, `input-field`, `form-group` — all defined in `src/index.css`.
- **API calls**: All authenticated requests go through `authFetch()` in `src/lib/api.ts`, which injects the JWT from `localStorage`.
- **i18n**: All user-facing strings use `useTranslation()` with keys in `src/lib/i18n.ts`. Three locales: `en`, `zh`, `fr`.
- **Modals**: Implemented as fixed-position overlays with `zIndex: 1000` and a semi-transparent backdrop.

## 9. Deployment Strategy (Railway)

- **Railway Services**:
  - `sprout-backend`: Python FastAPI service (Dockerfile-based deploy).
  - `sprout-web`: React (Vite) static site.
  - `MongoDB`: Railway managed MongoDB plugin or external MongoDB Atlas connected via `MONGODB_URL` env variable.
- **Environment Variables**: `MONGODB_URL`, `DATABASE_NAME`, `JWT_SECRET`, `GEMINI_API_KEY`, `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `FRONTEND_URL`, `EMAIL_WHITELIST_ENABLED`, `EMAIL_WHITELIST`.
- **CI/CD**: GitHub integration with Railway. Pushes to `main` automatically trigger builds and deployments.
- **File Storage**: Cloud storage (e.g., AWS S3 or Cloudflare R2) for photos and media. URLs stored in MongoDB. *(Not yet configured.)*
