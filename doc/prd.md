# Sprout - Product Requirements Document (PRD)

## 1. Introduction
Sprout is an AI-native day care management system designed to streamline communication between school administrators, teachers, and parents. It serves as a modern, intelligent competitor to Procare, leveraging AI to enhance the daycare experience with automated insights and seamless real-time updates.

## 2. Target Audience
- **School Administrators**: Manage classes, teachers, parents, and student assignments.
- **Teachers**: Manage daily activities, log updates for children, and communicate with parents.
- **Parents**: Receive real-time updates and notifications about their children's activities and well-being.

## 3. Key Features
### 3.1 Web Admin Portal
- **User Management**: Invite and add new parents and teachers to the system.
- **Class Management**: Create classes and assign teachers and kids to them.
- **Dashboard**: Overview of school activities, active classes, and pending invitations.

### 3.2 Mobile App (React Native)
#### Teacher View
- **Class List**: View assigned classes and kids.
- **Activity Logging**: Provide updates (meals, naps, activities, photos) for individual kids or the whole class.
- **AI Integration**: AI-assisted update generation (e.g., auto-drafting daily summaries based on quick tags).

#### Parent View
- **Feed**: Receive real-time updates and photos of their kid's activities.
- **Notifications**: Push notifications for important updates or messages.
- **Profile**: View kid's profile and historical updates.

## 4. User Journeys
1. **Admin Setup**: Admin logs into the web portal -> Creates a class -> Invites a teacher -> Invites parents -> Adds kids and assigns them to the class/teacher.
2. **Teacher Daily Log**: Teacher logs into the mobile app -> Selects a class -> Selects a kid -> Logs a "Nap" update -> Submits.
3. **Parent Update**: Parent receives a push notification -> Opens the mobile app -> Views the "Nap" update in their feed.

## 5. Non-Functional Requirements
- **Performance**: Fast loading times for the mobile app and admin portal.
- **Security**: Secure authentication and data privacy (especially for kid's photos and data).
- **Scalability**: Ability to handle multiple schools and thousands of users.
