# Architecture Diagram (Mermaid)

```mermaid
flowchart LR
  A[MLB Stats API] --> B[Python ETL Pollers]
  B --> C[(Postgres/Supabase)]
  C --> D[Read Models / Marts]
  D --> E[Next.js API Routes]
  E --> F[Web UI]
  F --> G[Contextual Copilot]
  G --> H[OpenAI Guarded NL->SQL]
  H --> E
  B --> I[ETL Run Logs + Ingest Errors]
```

## Notes
- V1 uses adaptive polling and idempotent writes.
- UI queries curated read models; no direct table exposure.
- Copilot is scoped by route context and SQL allowlist.

