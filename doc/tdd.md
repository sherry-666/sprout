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
    │ OpenAI  │ │  Face   │ │ Image   │
    │ LLM API │ │ Recog.  │ │ Process │
    └─────────┘ └─────────┘ └─────────┘
```

## 2. Tech Stack
- **Database**: MongoDB (Atlas for managed cloud hosting, integrates easily with Railway).
- **Backend**: Python 3.12+ with FastAPI. Chosen for its strong AI/ML ecosystem (face recognition, image processing, OpenAI SDK) and async support. Uses Motor (async MongoDB driver) for database access.
- **Mobile App**: React Native (Expo) for cross-platform (iOS/Android) support.
- **Web Admin**: React (Vite) for a fast, lightweight admin interface.
- **AI/ML Libraries**:
  - `openai` — LLM API calls (GPT-4o for text generation & vision).
  - `face_recognition` / `deepface` — Kid identification from photos.
  - `Pillow` / `OpenCV` — Image manipulation (stickers, text overlays, captions).
- **Hosting/Deployment**: Railway. Railway supports native deployment for Python and static sites, and provides easy provisioning for MongoDB.

## 3. Project Structure
```
sprout/
├── backend/           # Python FastAPI backend
│   ├── app/
│   │   ├── main.py           # FastAPI app entry point
│   │   ├── models/           # Pydantic models & MongoDB schemas
│   │   ├── routes/           # API route handlers
│   │   ├── services/         # Business logic
│   │   ├── ai/               # AI modules (face recog, LLM, image processing)
│   │   └── core/             # Config, auth, database connection
│   ├── requirements.txt
│   └── Dockerfile
├── web/               # React (Vite) admin portal
│   ├── src/
│   ├── package.json
│   └── Dockerfile
├── mobile/            # React Native (Expo) app
│   ├── src/
│   └── package.json
└── doc/               # PRD, TDD, and other documentation
```

## 4. Data Model (MongoDB)

### 4.1 Users Collection
- `_id`: ObjectId
- `role`: Enum ('super_admin', 'school_admin', 'teacher', 'parent')
- `email`: String (unique)
- `passwordHash`: String
- `profile`: Object
  - `firstName`: String
  - `lastName`: String
  - `phone`: String (optional)
  - `avatarUrl`: String (optional)
- `schoolId`: ObjectId
- `createdAt`: Date
- `updatedAt`: Date

### 4.2 Kids Collection
- `_id`: ObjectId
- `firstName`: String
- `lastName`: String
- `dateOfBirth`: Date
- `parents`: Array of User ObjectIds
- `classId`: ObjectId
- `faceEmbedding`: Binary (128-d vector for face recognition, encrypted at rest)
- `profilePhotoUrl`: String (optional)
- `createdAt`: Date

### 4.3 Classes Collection
- `_id`: ObjectId
- `name`: String
- `schoolId`: ObjectId
- `teachers`: Array of User ObjectIds
- `kids`: Array of Kid ObjectIds
- `createdAt`: Date

### 4.4 Updates/Activities Collection
- `_id`: ObjectId
- `kidId`: ObjectId (or Array for group updates)
- `teacherId`: ObjectId
- `classId`: ObjectId
- `type`: Enum ('meal', 'nap', 'activity', 'photo', 'daily_summary')
- `content`: String (teacher's raw input or AI-generated text)
- `aiGeneratedContent`: String (optional, LLM-drafted parent-friendly message)
- `mediaUrls`: Array of Strings (photos, optionally AI-enhanced)
- `detectedKidIds`: Array of ObjectIds (auto-detected kids from photos)
- `timestamp`: Date

### 4.5 Schools Collection
- `_id`: ObjectId
- `name`: String
- `address`: String
- `adminIds`: Array of User ObjectIds
- `createdAt`: Date

## 5. API Endpoints (REST)

### Auth APIs
- `POST /api/auth/register` — Register a new user (admin-initiated invite flow).
- `POST /api/auth/login` — Login and receive JWT token.
- `POST /api/auth/refresh` — Refresh an expired token.

### Admin APIs
- `POST /api/admin/invite` — Invite a user (teacher or parent) via email.
- `GET /api/admin/users` — List all users for the school.
- `POST /api/classes` — Create a class.
- `PUT /api/classes/{id}/assign` — Assign teachers/kids to a class.
- `GET /api/classes` — List all classes for the school.
- `POST /api/kids` — Add a new kid.
- `PUT /api/kids/{id}` — Update kid info (including uploading initial face photo for recognition).

### Teacher APIs
- `GET /api/teacher/classes` — Get assigned classes and their kids.
- `POST /api/updates` — Create a new update for a kid.
- `POST /api/updates/photo` — Upload a photo; AI identifies kids and generates captions.
- `POST /api/ai/enhance-photo` — Add AI stickers/messages to a photo.
- `POST /api/ai/draft-update` — Generate an AI-drafted parent-friendly message from quick tags.

### Parent APIs
- `GET /api/parent/kids` — Get kid's info and assigned class.
- `GET /api/updates/{kidId}` — Get feed of updates for a kid (paginated).
- `GET /api/updates/{kidId}/summary` — Get AI-generated daily summary.

## 6. AI Module Design (`backend/app/ai/`)

### 6.1 Face Recognition (`face_recognizer.py`)
- On kid onboarding, admin uploads a reference photo. The system generates a 128-d face embedding and stores it in the Kids collection.
- When a teacher uploads a photo, the system extracts faces, generates embeddings, and matches against stored kid embeddings.
- Returns a list of detected `kidId`s with confidence scores.

### 6.2 LLM Service (`llm_service.py`)
- Uses OpenAI GPT-4o API.
- **Draft Update**: Takes teacher's quick tags + context and generates a warm parent-friendly message.
- **Photo Summarization**: Uses GPT-4o Vision to analyze a photo and return a text description of the activity.
- **Daily Summary**: Aggregates all updates for a kid on a given day and generates a comprehensive summary.

### 6.3 Image Processor (`image_processor.py`)
- Uses Pillow and/or OpenCV.
- **Sticker Overlay**: Takes a photo + sticker selection and composites them.
- **Text Overlay**: Adds captions or messages onto photos with customizable fonts/colors.
- Outputs the enhanced image, which is uploaded to cloud storage and its URL saved.

## 7. Deployment Strategy (Railway)

- **Railway Services**:
  - `sprout-backend`: Python FastAPI service (Dockerfile-based deploy).
  - `sprout-web`: React (Vite) static site or served via a lightweight Node.js container.
  - `MongoDB`: Railway managed MongoDB plugin or external MongoDB Atlas connected via `MONGODB_URL` env variable.
- **Environment Variables**: `MONGODB_URL`, `JWT_SECRET`, `OPENAI_API_KEY`, `CLOUD_STORAGE_BUCKET`.
- **CI/CD**: GitHub integration with Railway. Pushes to `main` automatically trigger builds and deployments.
- **File Storage**: Cloud storage (e.g., AWS S3 or Cloudflare R2) for photos and media. URLs stored in MongoDB.
