# Environment Variable Configurations - StadiumMind AI

StadiumMind AI manages settings using environmental variables. Below is the list of keys, description parameters, and defaults:

## Configuration Parameters

| Key Name | Default Value | Purpose | Requirements |
|:---|:---|:---|:---|
| **DATABASE_URL** | `postgresql://postgres:postgres@localhost:5432/stadiummind` | PostgreSQL Connection string. | Must support schema options. |
| **REDIS_URL** | `redis://localhost:6379` | Redis Host Connection URL. | Required for cache stores. |
| **JWT_ACCESS_SECRET** | `super-secret-access-token-key-2026-fifa` | Cryptographic secret key used to sign access JWTs. | Min length of 8 chars. |
| **JWT_REFRESH_SECRET** | `super-secret-refresh-token-key-2026-fifa` | Cryptographic secret key used to sign refresh JWTs. | Min length of 8 chars. |
| **PORT** | `5000` | Local port backend server listens on. | Target port number. |
| **GEMINI_API_KEY** | `DummyKey` | Google AI Studio Developer API key. | Required for AI operations. |
| **NODE_ENV** | `development` | Target mode server runs in. | `development` or `production`. |

---

## Production Security Notes

1. **Never commit secrets to repository control**. Keep `.env` in the `.gitignore` directory exclusions list.
2. In production, ensure `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` use strong, randomly generated keys.
