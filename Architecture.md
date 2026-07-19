# System Architecture - StadiumMind AI

This document provides a technical walkthrough of the architecture of StadiumMind AI.

## Component Block Diagram

The project uses clean, modular service boundaries following a Clean Architecture pattern on the backend and components separation on the frontend:

```mermaid
graph LR
    subgraph Frontend Client
        PWA[Fan PWA View]
        Dashboard[Operations Console]
        Acc[Accessibility Context]
        Map[Leaflet Stadium Map]
    end

    subgraph Backend Gateways
        API[Express Router]
        Socket[Socket.IO Server]
        Auth[JWT Guard Middleware]
        Shield[Security Prompt Shield]
    end

    subgraph Logic & Data
        GraphSolver[Dijkstra Route Solver]
        AIServ[Gemini AI Interface]
        Prisma[Prisma client]
    end

    PWA --> API
    Dashboard --> Socket
    API --> Auth --> Shield
    Shield --> GraphSolver
    Shield --> AIServ
    AIServ --> Prisma
    GraphSolver --> Prisma
```

---

## Entity-Relationship (ER) Database Schema

The database is built on PostgreSQL. Below is the relational entity model:

```mermaid
erDiagram
    User {
        string id PK
        string email UNIQUE
        string passwordHash
        string name
        enum role
    }
    Session {
        string id PK
        string userId FK
        string refreshToken
        datetime expiresAt
    }
    VolunteerInfo {
        string id PK
        string userId FK
        string status
        string currentZone
        string specialties
    }
    CrowdZone {
        string id PK
        string zoneName UNIQUE
        float currentDensity
        int queueLength
        int occupancyCount
        string status
    }
    RouteNode {
        string id PK
        string name UNIQUE
        float latitude
        float longitude
        boolean isAccessible
    }
    RouteEdge {
        string id PK
        string fromNode
        string toNode
        float distance
        float weightModifier
        boolean isAccessible
    }
    Incident {
        string id PK
        string type
        string severity
        string status
        string zone
        string description
        string aiSummary
        json aiResponse
    }
    AIConversation {
        string id PK
        string userId FK
        string language
    }
    AIMessage {
        string id PK
        string conversationId FK
        string role
        string content
    }

    User ||--o{ Session : "has"
    User ||--o| VolunteerInfo : "details"
    User ||--o{ AIConversation : "starts"
    AIConversation ||--o{ AIMessage : "contains"
    RouteNode ||--o{ RouteEdge : "defines"
```

---

## Technical Routing Operations Flow (Sequence Diagram)

This sequence diagram details the process when a fan requests dynamic navigation routes in wheelchair-accessible mode:

```mermaid
sequenceDiagram
    autonumber
    actor Fan as Spectator (PWA)
    participant API as Navigation Endpoint
    participant Solver as Dijkstra Engine
    participant Gemini as Google Gemini 2.5 Flash
    participant DB as PostgreSQL Database

    Fan->>API: POST /route (Gate C to Section 101, Mode: WHEELCHAIR)
    API->>DB: Fetch nodes and edges marked accessible
    DB-->>API: List of wheelchair accessible nodes & coordinates
    API->>Solver: Compute shortest accessible path
    Solver-->>API: Mathematical Path (Nodes: Gate C -> Concourse West -> Section 101)
    API->>Gemini: Request natural language explanation of path
    Gemini-->>API: "Proceed from Gate C, follow the ramp at Concourse West..."
    API-->>Fan: Returns coordinates overlay + Natural AI text guidance
```
