# Sprout - Product Requirements Document (PRD)

## 1. Introduction
Sprout is an AI-native day care management system designed to streamline communication between school administrators, teachers, and parents. It serves as a modern, intelligent competitor to Procare, leveraging AI to enhance the daycare experience with automated insights and seamless real-time updates.

## 2. Target Audience
- **System Administrators**: Manage the platform globally, onboard new schools, and set up School Admins.
- **School Administrators**: Manage classes, teachers, parents, and student assignments for their specific school.
- **Teachers**: Manage daily activities, log updates for children, and communicate with parents.
- **Parents**: Receive real-time updates and notifications about their children's activities and well-being.

### 3.1 Web Admin Portal (Role-Based)
- **System Admin View**: Manage multiple schools across the platform and invite School Admins.
- **School Admin View**: 
  - **User Management**: Invite and add new parents and teachers to the system via email deep-links.
  - **Class Management**: Create classes and assign teachers and kids to them.
  - **Dashboard**: Overview of school activities, active classes, and pending invitations.

### 3.2 Mobile App (React Native)
#### Teacher View
- **Class List**: View assigned classes and kids.
- **Activity Logging**: Provide updates (meals, naps, activities, photos) for individual kids or the whole class.
- **Photo Upload**: Take or upload photos. AI automatically identifies which kids are in the photo and routes it to the correct parents.
- **AI-Assisted Updates**: AI drafts daily summaries and parent-friendly messages based on quick tags and logged activities.

#### Parent View
- **Feed**: Receive real-time updates and photos of their kid's activities.
- **AI-Enhanced Photos**: Photos received may include AI-generated stickers, captions, or fun overlays added by the teacher.
- **Daily Summaries**: AI-generated end-of-day summaries describing what their child did throughout the day.
- **Notifications**: Push notifications for important updates or messages.
- **Profile**: View kid's profile and historical updates.

### 3.3 AI Features (Core — Not Add-ons)
These are first-class, native features of Sprout that differentiate it from competitors:

1. **Smart Photo Recognition**: When a teacher uploads a photo, AI automatically identifies which kids are in the frame using face recognition. The photo is then routed to the correct parents without manual tagging.
2. **AI-Generated Parent Updates**: Teachers log quick tags (e.g., "nap 1hr", "ate well"), and the LLM drafts a warm, parent-friendly update message that the teacher can review and send.
3. **Photo Enhancement**: Teachers can use AI to add fun stickers, captions, or decorative messages onto photos before sending them to parents.
4. **Photo Understanding & Summarization**: AI analyzes uploaded photos to understand the activity context (e.g., "outdoor play", "arts and crafts") and incorporates this into daily summaries.

## 4. User Journeys
1. **System Admin Setup (CLI)**: Platform owner runs a secure CLI script to seed the initial `super_admin` account.
2. **School Onboarding**: System Admin logs into the portal -> Creates a new School profile -> Invites a School Admin.
3. **School Admin Setup**: School Admin logs into the web portal -> Creates a class -> Invites a teacher -> Invites parents -> Adds kids and assigns them.
2. **Teacher Daily Log**: Teacher logs into the mobile app -> Selects a class -> Selects a kid -> Logs a "Nap" update -> AI drafts a message -> Teacher reviews and sends.
3. **Teacher Photo Upload**: Teacher takes a group photo -> Uploads it -> AI identifies kids in the photo -> Photo is auto-routed to the correct parents -> Teacher optionally adds AI stickers/captions.
4. **Parent Update**: Parent receives a push notification -> Opens the mobile app -> Views the update and AI-enhanced photos in their feed.
5. **End-of-Day Summary**: At the end of the day, AI generates a summary of all updates and photos for each kid -> Parents receive a comprehensive daily report.

## 5. Non-Functional Requirements
- **Performance**: Fast loading times for the mobile app and admin portal.
- **Security**: Secure authentication and data privacy (especially for kid's photos and biometric face data). COPPA compliance considerations.
- **Scalability**: Ability to handle multiple schools and thousands of users.
- **Privacy**: Face embeddings stored securely and used only for internal kid identification. Parents must consent to face recognition during onboarding.
