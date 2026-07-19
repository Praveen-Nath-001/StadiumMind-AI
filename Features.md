# Core Features Reference - StadiumMind AI

StadiumMind AI provides eight core functional layers to support smart stadium operations for the FIFA World Cup 2026:

---

## 1. Universal Fan Companion Chatbot
- **Implementation**: Utilizes Gemini 2.5 Flash inside [aiService.ts](file:///d:/FIFIA%20PROJECT/backend/src/services/ai/aiService.ts).
- **Features**: Automatically detects user languages (English, Spanish, French, Portuguese, Arabic, Hindi) and answers spectator queries.
- **Accessibility**: Support for Text-to-Speech (audio synthesis) and Speech-to-Text (vocal query input).

---

## 2. Graph Navigation Routing
- **Implementation**: Solved using Dijkstra's shortest path solver in [graphEngine.ts](file:///d:/FIFIA%20PROJECT/backend/src/services/navigation/graphEngine.ts).
- **Modes**:
  - `FASTEST`: normal physical distance routing.
  - `LEAST_CROWDED`: augments path weights dynamically based on telemetry crowd densities.
  - `WHEELCHAIR_ACCESSIBLE`: filters out stairs and nodes not marked wheelchair friendly.
  - `FAMILY_FRIENDLY`: avoids highly congested walkways for low stress.

---

## 3. Real-Time Telemetry & Crowd Heatmap
- **Implementation**: Mock data fluctuations generated in [simulator.ts](file:///d:/FIFIA%20PROJECT/backend/src/utils/simulator.ts) and broadcasted via Socket.IO.
- **Client Render**: Renders density circles dynamically on the Leaflet map overlay, turning red during critical situations.

---

## 4. Emergency Evacuation advisor
- **Implementation**: Gemini AI computes response scripts during reports: volunteer deployment tasks, public announcement script, and exit routing.

---

## 5. Live Transit Hub
- **Implementation**: Pushes live shuttle capacity levels, Metro delays, and wait times to the fan view interface.
