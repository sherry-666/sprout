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
- **User Management (`/users`)**: Interface to invite and manage Parents and Educators. Supports generating email deep-links for seamless onboarding.
- **Class Management (`/classes`)**: Interface to create physical or virtual classes, assign Educators to those classes, and enroll Kids.

## 4. Mobile App Experience (React Native)
The Mobile App is designed for on-the-go usage by Educators in the classroom and Parents at home or work.

### 4.1 Educator Flow
**Purpose:** Fast, frictionless logging of activities with minimal screen time.
- **Class Selection & Roster**: Educators view their assigned classes and a grid of children present that day.
- **Quick Logging**: One-tap interfaces to log common activities (Meals, Naps, Potty, Learning).
- **Smart Camera Integration**: Take or upload photos directly within the app. AI automatically identifies which kids are in the photo (via facial recognition) and tags them.
- **AI-Assisted Updates**: Instead of typing long paragraphs, educators use quick tags (e.g., "nap 1hr", "ate all lunch"). The AI drafts a warm, professional, and parent-friendly message that the educator can review and send with one tap.
- **Photo Enhancement**: Optional tools to apply AI-generated stickers, captions, or fun overlays to photos before sharing.

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
2. Selects "Toddler Room A".
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
