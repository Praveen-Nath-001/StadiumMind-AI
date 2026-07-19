# Security Architecture - StadiumMind AI

StadiumMind AI runs on a DevSecOps-hardened core framework to protect tournament operators and fans from security vulnerabilities.

## Security Controls Mapping

| Vulnerability Threat | Platform Defense System | Code Location / Implementation |
|:---|:---|:---|
| **SQL Injection** | Prisma ORM parameterization | Automatic parameterization in all model queries. |
| **XSS Attacks** | Helmet middleware & Input Sanitizers | Express [app.ts](file:///d:/FIFIA%20PROJECT/backend/src/app.ts) configures strict Content Security Policies. [promptShield.ts](file:///d:/FIFIA%20PROJECT/backend/src/middleware/promptShield.ts) strips script tags. |
| **Prompt Injection** | Shield Guard and Isolated Prompts | [promptShield.ts](file:///d:/FIFIA%20PROJECT/backend/src/middleware/promptShield.ts) rejects instruct override strings. Prompts use system-first wrappers. |
| **Brute Force / DDoS** | Rate Limiters | Express [rateLimiter.ts](file:///d:/FIFIA%20PROJECT/backend/src/middleware/rateLimiter.ts) limits endpoints to 100/15m. |
| **JWT Hijacking** | Short-lived tokens & Rotation | [jwt.ts](file:///d:/FIFIA%20PROJECT/backend/src/utils/jwt.ts) implements access token lifespans of 15 minutes, rotated on refresh updates. |
| **Tampering Logs** | Audit Logging | Database writes record administrative actions and client security violations. |

---

## Content Security Policy (CSP)

The NGINX and Express configuration enables a strict CSP:
- Scripts and style bundles are restricted to `'self'` and trusted CDNs.
- Leaflet map imagery is allowed to pull directly from OSM tiles (`*.openstreetmap.org`).
- WebSocket connections are explicitly constrained to backend gateways.
