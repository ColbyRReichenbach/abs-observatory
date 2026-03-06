# Future Iterations: Auth, Community, and Secure Backend

## Purpose
Capture post-V1 initiatives that require authentication, moderation systems, and stronger backend/security architecture.

This is intentionally separated from the core frontend design plan to avoid early technical debt.

---

## 1) Why This Is Future Scope
These features introduce significant complexity:
- user identity and account lifecycle
- session/token security
- moderation and abuse handling
- data privacy and retention policies
- infrastructure hardening and operational monitoring

They should be added only after core ABS analytics UX and trust are stable.

---

## 2) Candidate Features Moved Here
1. In-product call discussion threads
2. Persistent user profiles and reputation
3. Structured reactions + free-text comments
4. Moderation tooling and escalation workflows
5. Community leaderboards / badges
6. Social posting automation tied to user-generated content

---

## 3) Authentication Roadmap
## Phase A: Lightweight Identity
- anonymous session IDs
- ephemeral nickname
- no PII required
- read-mostly, limited write actions

## Phase B: Real Accounts
- OAuth/social login or magic link
- verified email (if needed for write actions)
- account settings + consent management

## Phase C: Role-Based Access
- roles: `user`, `moderator`, `admin`
- scoped privileges for moderation and analytics operations

---

## 4) Security Requirements
1. Secure session handling (httpOnly, secure cookies, rotation)
2. CSRF protection for state-changing endpoints
3. strict input validation/sanitization on comments and profile fields
4. rate limiting by IP + user + endpoint
5. abuse/threat logging with alerting
6. secrets management and key rotation process
7. audit logs for moderation/admin actions

---

## 5) Moderation and Safety
1. Pre-submit filters: profanity/toxicity checks
2. Post-submit controls: report, hide, soft-delete, restore
3. Reputation-based posting constraints
4. Auto-freeze high-abuse threads
5. Moderator queue with priority scoring
6. clear policy: discuss calls, not personal attacks

---

## 6) Data Model Additions (Future)
- `users`
- `sessions`
- `user_profiles`
- `call_threads`
- `call_comments`
- `comment_reactions`
- `comment_reports`
- `moderation_actions`
- `rate_limit_events`

---

## 7) Operational Readiness Checklist
1. auth incident playbook
2. moderation playbook and SLA
3. privacy/retention policy
4. backup + restore test coverage
5. load test for write-heavy discussion spikes
6. observability dashboards (auth errors, abuse spikes, moderation backlog)

---

## 8) Recommended Trigger to Start This Work
Begin only after:
1. core analytics pages are stable and visually complete
2. line score + challenge explorer + AI explainability are production-ready
3. baseline DAU/engagement signals justify community investment

---

## 9) Open Decisions (for later)
1. auth provider (Supabase Auth / Clerk / custom)
2. moderation vendor vs in-house policy engine
3. anonymous-by-default vs authenticated-by-default posting
4. retention period for user-generated content
5. legal review requirements for user content and moderation
