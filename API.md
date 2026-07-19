# API Reference Specification - StadiumMind AI

StadiumMind AI exposes REST API endpoints secured with JSON Web Tokens (JWT). Real-time telemetry is pushed via Socket.IO events.

---

## Authentication Endpoints

### 1. Register User
`POST /api/auth/register`
- **Request Body**:
  ```json
  {
    "email": "fan@stadiummind.ai",
    "password": "password123",
    "name": "Jane Spectator",
    "role": "FAN"
  }
  ```
- **Response (201)**:
  ```json
  {
    "message": "User registered successfully",
    "user": { "id": "uuid", "email": "fan@stadiummind.ai", "name": "Jane Spectator", "role": "FAN" },
    "tokens": { "accessToken": "jwt-string", "refreshToken": "jwt-string" }
  }
  ```

### 2. Login User
`POST /api/auth/login`
- **Request Body**:
  ```json
  {
    "email": "fan@stadiummind.ai",
    "password": "password123"
  }
  ```
- **Response (200)**: returns tokens and user object.

### 3. Rotate Tokens
`POST /api/auth/refresh`
- **Request Body**: `{ "refreshToken": "jwt-string" }`
- **Response (200)**: returns rotated `accessToken` and `refreshToken`.

---

## Smart Navigation Endpoints

### 1. Compute Path Navigation
`POST /api/navigation/route`
- **Request Headers**: `Authorization: Bearer <accessToken>`
- **Request Body**:
  ```json
  {
    "startNode": "Gate A",
    "endNode": "Section 101",
    "mode": "FASTEST"
  }
  ```
- **Response (200)**:
  ```json
  {
    "path": ["Gate A", "Concourse West", "Section 101"],
    "distanceMeters": 140,
    "estimatedTimeMin": 2,
    "mode": "FASTEST",
    "aiExplanation": "Head forward from Gate A towards Concourse West..."
  }
  ```

---

## Crowd & Crisis Endpoints

### 1. Report Crisis Incident
`POST /api/incidents`
- **Request Headers**: `Authorization: Bearer <accessToken>`
- **Request Body**:
  ```json
  {
    "type": "CROWD_STAMPEDE",
    "severity": "CRITICAL",
    "zone": "Gate B",
    "description": "Crowd surge reported due to ticket scanning failure."
  }
  ```
- **Response (210)**: Returns full incident object along with Gemini dynamic evacuation routes and instructions.
