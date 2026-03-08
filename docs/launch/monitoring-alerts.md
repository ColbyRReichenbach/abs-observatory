# Monitoring And Alerting Plan

## Primary Signals
- web request latency and error rate
- DB latency and pool saturation
- AI request rate, refusal rate, latency, and estimated cost
- queue backlog age and failed job count
- ingest lag for live game updates
- moderation backlog and hidden/pending review counts

## Dashboard Views
- `web-overview`
  - request volume
  - 4xx/5xx rate
  - hottest endpoints
- `ai-operations`
  - requests per minute
  - queued vs complete
  - overloaded / misuse / out-of-scope counts
  - estimated cost by model
- `data-platform`
  - ETL run success/failure
  - standings/article/enrichment job lag
  - latest source snapshot freshness
- `community-moderation`
  - comments per minute
  - pending review queue
  - moderator actions

## Initial Alert Thresholds
- AI overload or provider failures above baseline for 5 minutes
- queue backlog age above 2 minutes for interactive AI jobs
- ETL ingest lag above 60 seconds on active games
- 5xx rate above 2% for 5 minutes
- moderation queue growth above 25 pending items
- repeated webhook signature/replay failures

## Implementation Notes
- emit structured JSON logs for server errors and moderation/admin actions
- keep telemetry OpenTelemetry-compatible so a sink can be added without changing app code
- tie incident kill switches to alert response playbooks
