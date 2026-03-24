# Architecture Diagram (Mermaid)

```mermaid
flowchart LR
  A[MLB Stats API] --> B[Python ETL Pollers]
  B --> C[(Postgres)]
  C --> D[Read Models / Marts]
  D --> E[Next.js API Routes / BFF]
  E --> F[Web UI]
  F --> G[Contextual Copilot]
  G --> H[Typed AI Tools]
  H --> E
  E --> J[Worker Queue]
  J --> K[Background Jobs]
  B --> I[ETL Run Logs + Ingest Errors]
```

## Notes
- V1 uses adaptive polling and idempotent writes.
- UI queries curated read models; no direct table exposure.
- Copilot is scoped by route context and typed tool contracts.
- Background AI/article/enrichment work is queued outside the web request path.
