## 🧠 Claude Code Development Reference – *Journamate/pathwise*

You are contributing backend logic to a lifestyle AI app called **Journamate**. This file defines the architecture, responsibilities, and workflow boundaries that must be followed throughout development.

---

### 🔒 Development Guardrails

- **Do not modify or generate any UI code.**  
  All UI prototyping and design is handled manually in **Replit**. If any UI changes are needed, delegate that task to Replit and notify the user.

- **Your role is backend-only.**  
  You are responsible for implementing backend logic, database schemas, integrations, and AI workflows that bring the UI features to life.

- **Workflow protocol:**  
  When a new feature is requested, the user will first prototype the UI in Replit. Once finalized, you will implement the backend functionality to support that feature. This workflow is fixed and must be respected.

---

### 🧱 Architecture Stack

| Layer | Tool |
|-------|------|
| **Frontend/UI** | Replit + React Native + Expo MCO |
| **Backend** | Supabase (PostgreSQL) |
| **Hosting & AI Logic** | Google Cloud Platform (Cloud Run + Cloud Functions) |
| **Notifications** | Firebase Cloud Messaging |
| **Authentication** | Supabase Auth (Google, Gmail, Facebook, etc.) |

---

### 🧠 AI Agent Responsibilities

You will also implement the backend logic for the lifestyle AI agent, including:
- Prompt parsing and goal planning
- Journaling and nudging cadence
- Travel prep and calendar sync
- Multi-user collaboration and contributor-aware feedback

---

### 🧪 Development Environment

- Create and maintain a virtual environment named `journamate`
- Use modular file structure for backend logic, agent workflows, and API integrations
- Ensure all code is clean, scalable, and mobile-compatible

---

This file is to be referenced in every Claude Code session and adhered to strictly throughout the development journey.

---

Would you like me to scaffold the journaling schema next or draft the first Cloud Function for AI goal planning? I can also help you set up the `journamate` environment structure.
