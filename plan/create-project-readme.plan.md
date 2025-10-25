<!-- f6e5d98f-fd37-4b56-bbf9-7829b738e841 4e687763-733b-41da-8f55-5bd7e34b5707 -->
# Create Comprehensive README for Sun Chat

## Overview

Create a professional README.md documenting the Sun Chat messaging app built for Remote Team Professionals, including a Mermaid architecture diagram showing the real-time messaging system with Convex backend and React Native frontend.

## Changes

### 1. Update package.json

Change the project name from "whats-up" to "sun-chat" to match the folder name and branding.

**File**: `package.json`

- Update `name` field from `"whats-up"` to `"sun-chat"`

### 2. Create README.md

Create a comprehensive README.md with standard detail level including:

**Sections to include:**

- **Project Title & Description**: Sun Chat - Real-time messaging app for Remote Team Professionals
- **Features**: 
  - Core messaging (real-time delivery, offline support, group chat, typing indicators, read receipts)
  - AI Features for Remote Teams (thread summarization, action item extraction, smart search, priority message detection, decision tracking)
- **Tech Stack**: 
  - Frontend: React Native, Expo, Expo Router
  - Backend: Convex (real-time database, serverless functions)
  - Auth: Clerk
  - AI: OpenAI/Anthropic via AI SDK
  - Local: Expo SQLite, Drizzle ORM
- **Architecture Diagram**: Mermaid diagram showing:
  - Mobile app layer (React Native + Expo)
  - Real-time sync layer (Convex WebSocket)
  - Backend layer (Convex functions, database)
  - Auth layer (Clerk)
  - AI layer (LLM integration)
  - Data flow between components
- **Prerequisites**: Node.js, npm, Expo CLI, Convex account, Clerk account
- **Installation**: Step-by-step setup instructions
- **Environment Variables**: Template with required keys (CONVEX_URL, CLERK_PUBLISHABLE_KEY, etc.)
- **Running the App**: Commands for development (expo start, convex dev)
- **Deployment**: Expo Go link and instructions
- **Project Structure**: Brief overview of key directories
- **Key Features Walkthrough**: How to use main features
- **License**: MIT or appropriate license

**Mermaid Architecture Diagram Structure:**

```
Mobile App <-> Convex Real-time <-> Convex Backend <-> Database
               (WebSocket)           (Queries/Mutations)
                                           |
                                     Auth (Clerk)
                                           |
                                     AI Layer (LLM)
```

The diagram should show:

- React Native components connecting to Convex
- Real-time subscriptions for messages, presence, typing indicators
- Offline-first architecture with SQLite
- AI features calling serverless functions
- Authentication flow with Clerk

### To-dos

- [ ] Update package.json name from 'whats-up' to 'sun-chat'
- [ ] Create comprehensive README.md with all sections and Mermaid architecture diagram