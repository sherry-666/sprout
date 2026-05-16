# Sprout - Technical Design Document (TDD)

## 1. System Architecture
The system consists of a centralized backend service communicating with a mobile app (React Native) and a web admin portal. The database is MongoDB, enabling flexible data modeling.

## 2. Tech Stack
- **Database**: MongoDB (Atlas for managed cloud hosting, integrates easily with Railway).
- **Backend**: Node.js with Express or NestJS (TypeScript). Chosen for seamless integration with MongoDB (Mongoose) and easy deployment to Railway via Docker or buildpacks.
- **Mobile App**: React Native (Expo) for cross-platform (iOS/Android) support.
- **Web Admin**: Next.js (React) for a fast, SEO-friendly, and easy-to-build admin interface.
- **Hosting/Deployment**: Railway. Railway supports native deployment for Node.js, Next.js, and provides easy provisioning for MongoDB.

## 3. Data Model (MongoDB)
### 3.1 Users Collection
- `_id`: ObjectId
- `role`: Enum ('admin', 'teacher', 'parent')
- `email`: String
- `passwordHash`: String
- `profile`: Object (Name, Phone, etc.)

### 3.2 Kids Collection
- `_id`: ObjectId
- `name`: String
- `parents`: Array of User ObjectIds
- `classId`: ObjectId

### 3.3 Classes Collection
- `_id`: ObjectId
- `name`: String
- `teachers`: Array of User ObjectIds
- `kids`: Array of Kid ObjectIds

### 3.4 Updates/Activities Collection
- `_id`: ObjectId
- `kidId`: ObjectId
- `teacherId`: ObjectId
- `type`: Enum ('meal', 'nap', 'activity', 'photo')
- `content`: String
- `mediaUrl`: String (optional)
- `timestamp`: Date

## 4. API Endpoints (REST)
### Admin APIs
- `POST /api/admin/invite` - Invite a user.
- `POST /api/classes` - Create a class.
- `PUT /api/classes/:id/assign` - Assign teachers/kids to a class.

### Teacher APIs
- `GET /api/teacher/classes` - Get assigned classes.
- `POST /api/updates` - Create a new update for a kid.

### Parent APIs
- `GET /api/parent/kids` - Get kid's info.
- `GET /api/updates/:kidId` - Get feed of updates for a kid.

## 5. Deployment Strategy (Railway)
- **Monorepo Approach**: Use a Turborepo monorepo for shared types between backend, web admin, and mobile app.
- **Railway Services**:
  - `sprout-backend`: Node.js service running the API.
  - `sprout-web`: Next.js service for the admin portal.
  - `mongo-db`: Railway managed MongoDB plugin (or external MongoDB Atlas connected via `DATABASE_URL` env variable in Railway).
- **CI/CD**: GitHub integration with Railway. Pushes to `main` automatically trigger builds and deployments.

## 6. AI Features (Future/Native)
- Integrate OpenAI/LLM API in the backend to generate daily summaries for parents based on the discrete updates logged by teachers.
- Image recognition for auto-tagging kids in photos.
