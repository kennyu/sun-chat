# **MessageAI Rubric**

---

## **Section 1: Core Messaging Infrastructure**

### **Real-Time Message Delivery (12 points)**

**Excellent (11-12 points)**

* Sub-200ms message delivery on good network  
* Messages appear instantly for all online users  
* Zero visible lag during rapid messaging (20+ messages)  
* Typing indicators work smoothly  
* Presence updates (online/offline) sync immediately

### **Offline Support & Persistence (12 points)**

**Excellent (11-12 points)**

* User goes offline → messages queue locally → send when reconnected  
* App force-quit → reopen → full chat history preserved  
* Messages sent while offline appear for other users once online  
* Network drop (30s+) → auto-reconnects with complete sync  
* Clear UI indicators for connection status and pending messages  
* Sub-1 second sync time after reconnection

**Testing Scenarios:**

1. Send 5 messages while offline → go online → all messages deliver  
2. Force quit app mid-conversation → reopen → chat history intact  
3. Network drop for 30 seconds → messages queue and sync on reconnect  
4. Receive messages while offline → see them immediately when online

### **Group Chat Functionality (11 points)**

**Excellent (10-11 points)**

* 3+ users can message simultaneously  
* Clear message attribution (names/avatars)  
* Read receipts show who's read each message  
* Typing indicators work with multiple users  
* Group member list with online status  
* Smooth performance with active conversation

## **Section 2: Mobile App Quality (20 points)**

### **Mobile Lifecycle Handling (8 points)**

**Excellent (7-8 points)**

* App backgrounding → WebSocket maintains or reconnects instantly  
* Foregrounding → instant sync of missed messages  
* Push notifications work when app is closed  
* No messages lost during lifecycle transitions  
* Battery efficient (no excessive background activity)

### **Performance & UX (12 points)**

**Excellent (11-12 points)**

* App launch to chat screen \<2 seconds  
* Smooth 60 FPS scrolling through 1000+ messages  
* Optimistic UI updates (messages appear instantly before server confirm)  
* Images load progressively with placeholders  
* Keyboard handling perfect (no UI jank)  
* Professional layout and transitions

## **Section 3: AI Features Implementation (30 points)**

### **Required AI Features for Chosen Persona (15 points)**

**Excellent (14-15 points)**

* All 5 required AI features implemented and working excellently  
* Features genuinely useful for persona's pain points  
* Natural language commands work 90%+ of the time  
* Fast response times (\<2s for simple commands)  
* Clean UI integration (contextual menus, chat interface, or hybrid)  
* Clear loading states and error handling

**Feature Evaluation by Persona:**

*Remote Team Professional:*

1. Thread summarization captures key points  
2. Action items correctly extracted  
3. Smart search finds relevant messages  
4. Priority detection flags urgent messages accurately  
5. Decision tracking surfaces agreed-upon decisions

*International Communicator:*

1. Real-time translation accurate and natural  
2. Language detection works automatically  
3. Cultural context hints actually helpful  
4. Formality adjustment produces appropriate tone  
5. Slang/idiom explanations clear

*Busy Parent/Caregiver:*

1. Calendar extraction finds dates/times correctly  
2. Decision summarization captures group consensus  
3. Priority highlighting surfaces urgent info  
4. RSVP tracking accurate  
5. Deadline extraction finds commitments

*Content Creator/Influencer:*

1. Auto-categorization sorts correctly  
2. Response drafting matches creator's voice  
3. FAQ auto-responder handles common questions  
4. Sentiment analysis flags concerning messages  
5. Collaboration scoring identifies opportunities

### **Persona Fit & Relevance ( 5 points )**

**Excellent (5 points)**

*  AI features clearly map to real pain points of the chosen persona.  
*  Each feature demonstrates daily usefulness and contextual value.  
*  The overall experience feels purpose-built for that user type.

### **Advanced AI Capability (10 points)**

**Excellent (9-10points)**

* Advanced capability fully implemented and impressive  
* **Multi-Step Agent**: Executes complex workflows autonomously, maintains context across 5+ steps, handles edge cases gracefully  
* **Proactive Assistant**: Monitors conversations intelligently, triggers suggestions at right moments, learns from user feedback  
* **Context-Aware Smart Replies**: Learns user style accurately, generates authentic-sounding replies, provides 3+ relevant options  
* **Intelligent Processing**: Extracts structured data accurately, handles multilingual content, presents clear summaries  
* Uses required agent framework correctly (if applicable)  
* Response times meet targets (\<15s for agents, \<8s for others)  
* Seamless integration with other features

## **Section 4: Technical Implementation (10 points)**

### **Architecture (5 points)**

**Excellent (5 points)**

* Clean, well-organized code  
* API keys secured (never exposed in mobile app)  
* Function calling/tool use implemented correctly  
* RAG pipeline for conversation context  
* Rate limiting implemented  
* Response streaming for long operations (if applicable)

### **Authentication & Data Management (5 points)**

**Excellent (5 points)**

* Robust auth system (Clerk)  
* Secure user management  
* Proper session handling  
* Local database (SQLite/Realm/SwiftData) implemented correctly  
* Data sync logic handles conflicts  
* User profiles with photos working

## **Section 5: Documentation & Deployment (5 points)**

### **Repository & Setup (3 points)**

**Excellent (3 points)**

* Clear, comprehensive README  
* Step-by-step setup instructions  
* Architecture overview with diagrams  
* Environment variables template  
* Easy to run locally  
* Code is well-commented

### **Deployment (2 points)**

**Excellent (2 points)**

* App deployed to TestFlight/APK/Expo Go  
* Or, app runs on emulator locally  
* Works on real devices  
* Fast and reliable

## **Section 6: Required Deliverables (Pass/Fail)**

### **Demo Video (Required \- Pass/Fail)**

**PASS Requirements**: 5-7 minute video demonstrating:

* Real-time messaging between two physical devices (show both screens)  
* Group chat with 3+ participants  
* Offline scenario (go offline, receive messages, come online)  
* App lifecycle (background, foreground, force quit)  
* All 5 required AI features with clear examples  
* Advanced AI capability with specific use cases  
* Brief technical architecture explanation  
* Clear audio and video quality

**FAIL Penalty**: Missing requirements OR poor quality OR not submitted \= **\-15 points**

### **Persona Brainlift (Required \- Pass/Fail)**

**PASS Requirements**: 1-page document including:

* Chosen persona and justification  
* Specific pain points being addressed  
* How each AI feature solves a real problem  
* Key technical decisions made

**FAIL Penalty**: Missing or inadequate \= **\-10 points**

### **Social Post (Required \- Pass/Fail)**

**PASS Requirements**: Post on X or LinkedIn with:

* Brief description (2-3 sentences)  
* Key features and persona  
* Demo video or screenshots  
* Link to GitHub  
* Tag @GauntletAI

**FAIL Penalty**: Not posted \= **\-5 points**

## **Bonus Points (Maximum \+10)**

**Innovation (+3 points)**

* Novel AI features beyond requirements  
* Examples: Voice message transcription with AI, smart message clustering, conversation insights dashboard, AI-powered search with semantic understanding

**Polish (+3 points)**

* Exceptional UX/UI design  
* Smooth animations throughout  
* Professional design system  
* Delightful micro-interactions  
* Dark mode support  
* Accessibility features

**Technical Excellence (+2 points)**

* Advanced offline-first architecture (CRDTs, OT)  
* Exceptional performance (handles 5000+ messages smoothly)  
* Sophisticated error recovery  
* Comprehensive test coverage

**Advanced Features (+2 points)**

* Voice messages  
* Message reactions  
* Rich media previews (link unfurling)  
* Advanced search with filters  
* Message threading

