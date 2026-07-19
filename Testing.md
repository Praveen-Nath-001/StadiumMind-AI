# Testing Strategy & Guidelines - StadiumMind AI

StadiumMind AI contains a comprehensive automated test suite spanning unit test tiers and integration boundaries.

## Testing Stack

- **Unit Testing**: Jest & `ts-jest` for fast execution in TypeScript.
- **Mocking**: Custom mock wrappers for database engines (Prisma client) and Gemini AI APIs.
- **Target Coverage**: 95% on backend services, 90% on frontend helpers.

---

## Test Execution

### 1. Execute Backend Service Tests
To validate Dijkstra routing calculations, input sanitization routines, and API router flows:
```bash
cd backend
npm run test
```

### 2. Verify Output Validation Mocks
The system includes code validating that when AI responses are mocked or fail, correct fallback responses are supplied to prevent interface crashes.
