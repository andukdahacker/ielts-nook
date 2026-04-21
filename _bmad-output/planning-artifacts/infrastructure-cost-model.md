# ClassLite Infrastructure Cost Model

> Last updated: 2026-04-21
> Baseline assumptions: 2 centers, ~200 users (students + teachers + admins)

---

## How to use this document

Each service section has:
- **Unit cost** — the provider's pricing
- **Formula** — how to estimate monthly usage
- **Baseline estimate** — using the assumptions below
- **⚙️ Your input** — values you should adjust based on real usage

---

## Input Assumptions

| Variable | Baseline | ⚙️ Your value | Notes |
|---|---|---|---|
| `CENTERS` | 2 | | Number of active centers |
| `USERS` | 200 | | Total MAU across all centers |
| `STUDENTS` | 160 | | ~80% of users |
| `TEACHERS` | 30 | | ~15% of users |
| `ADMINS` | 10 | | ~5% of users |
| `EXERCISES_PER_CENTER` | 100 | | Published exercises |
| `DOCUMENTS_PER_CENTER` | 100 | | Uploaded documents |
| `CLASSES_PER_CENTER` | 10 | | Active classes |
| `SESSIONS_PER_CLASS_MONTH` | 12 | | ~3 per week |
| `ASSIGNMENTS_PER_CLASS_MONTH` | 8 | | ~2 per week |
| `AI_CALLS_PER_EXERCISE` | 10 | | Gemini question generation calls |
| `SUBMISSIONS_PER_STUDENT_MONTH` | 8 | | Writing/speaking submissions for AI grading |

---

## 1. Railway — Hosting & Database

### 1a. Backend (Fastify)

| Item | Unit cost | Formula | Baseline estimate |
|---|---|---|---|
| vCPU | $0.000463/min | Depends on load. 200 users ≈ 0.5 vCPU avg | ~$10/mo |
| RAM | $0.000231/GB/min | 512MB–1GB for Fastify | ~$5–10/mo |
| Egress | $0.10/GB | API responses, ~50KB avg × requests | ~$1–3/mo |

**Baseline: ~$15–25/mo**

### 1b. PostgreSQL

| Item | Unit cost | Formula | Baseline estimate |
|---|---|---|---|
| Compute | Same vCPU/RAM rates | 0.25–0.5 vCPU, 512MB RAM for 200 users | ~$8–15/mo |
| Storage | $0.25/GB/mo | 40 models, 200 users. ~1–5GB first year | ~$1–2/mo |

**Baseline: ~$10–17/mo**

### Railway total: ~$25–42/mo

> 💡 Railway has a $5/mo Hobby plan or usage-based Pro plan ($20/mo credit included). At this scale, **Pro plan at ~$20–40/mo actual spend** is likely.

---

## 2. Firebase Authentication

| Tier | Cost | Limit |
|---|---|---|
| Free (Spark) | $0 | Up to 50,000 MAU |
| Phone auth | $0.01–0.06/verification | If using SMS OTP |

**Formula:** `USERS` × auth method cost

**Baseline: $0/mo** (200 MAU is well within free tier)

> ⚠️ Only costs money if you use Phone/SMS auth or exceed 50K MAU.

---

## 3. Firebase Cloud Storage

| Item | Unit cost | Formula |
|---|---|---|
| Storage | $0.026/GB/mo | Total stored files |
| Downloads | $0.12/GB | File downloads by users |
| Upload operations | $0.05/10K ops | Upload requests |
| Download operations | $0.004/10K ops | Download requests |

### Storage estimate

| File type | Avg size | Count formula | Baseline total |
|---|---|---|---|
| Audio (MP3) | ~5MB | `EXERCISES_PER_CENTER × CENTERS × 0.3` (30% have audio) | 60 files = 300MB |
| Images/diagrams | ~500KB | `EXERCISES_PER_CENTER × CENTERS × 0.5` | 100 files = 50MB |
| Documents (PDF/DOCX) | ~2MB | `DOCUMENTS_PER_CENTER × CENTERS` | 200 files = 400MB |
| Student submission photos | ~3MB | `STUDENTS × SUBMISSIONS_PER_STUDENT_MONTH × 2` photos/submission | 2,560 files = 7.5GB/mo cumulative |

**Storage growth: ~8GB first month, growing ~7.5GB/mo from submissions**

| Month | Cumulative storage | Storage cost |
|---|---|---|
| 1 | ~8 GB | $0.21 |
| 6 | ~46 GB | $1.20 |
| 12 | ~91 GB | $2.37 |

**Download bandwidth:** Students reviewing submissions + teachers viewing exercises
- Estimate: `STUDENTS × 20 downloads/mo × 3MB avg` = ~9.6GB/mo → **$1.15/mo**

**Baseline: ~$1–4/mo** (growing over time with submission photos)

> ⚙️ Submission photos are the biggest storage driver. Adjust `SUBMISSIONS_PER_STUDENT_MONTH` and photo count based on actual usage. Consider a retention/cleanup policy for old submissions.

---

## 4. Resend — Transactional Email

| Tier | Cost | Limit |
|---|---|---|
| Free | $0 | 100 emails/day (3,000/mo) |
| Pro | $20/mo | 50,000 emails/mo |

### Email volume estimate

| Email type | Formula | Baseline/mo |
|---|---|---|
| Session schedule changes | `CLASSES × SESSIONS × 0.1 change rate × STUDENTS_PER_CLASS` | ~200 |
| Session cancellations | `CLASSES × SESSIONS × 0.05 cancel rate × STUDENTS_PER_CLASS` | ~100 |
| Recurrence changes | Rare, ~2/center/mo × recipients | ~30 |
| Parent welcome | One-time, amortized | ~10 |
| Engagement (streak/PB) | `STUDENTS × 0.3` (30% hit streak/mo, 1/day cap) | ~48 |
| Intervention | Manual, ~5/center/mo | ~10 |
| Billing reminders | `CENTERS × 2` (7-day + 1-day) | ~4 |
| User invitations | One-time, amortized over onboarding | ~20 |
| **Total** | | **~420/mo** |

**Baseline: $0/mo** (well within free tier of 3,000/mo)

> ⚠️ At 10 centers (~1,000 users), you'd approach the free tier limit. Budget $20/mo for Pro at that scale.

---

## 5. Inngest — Background Jobs

| Tier | Cost | Limit |
|---|---|---|
| Free | $0 | 50,000 runs/mo |
| Team | $50/mo | 500,000 runs/mo |

### Job volume estimate

| Job type | Formula | Baseline/mo |
|---|---|---|
| Email notification jobs (6 types) | Same as email count above | ~420 |
| AI question generation | `EXERCISES_PER_CENTER × CENTERS × 0.2 new/mo × AI_CALLS_PER_EXERCISE` | ~400 |
| AI grading | `STUDENTS × SUBMISSIONS_PER_STUDENT_MONTH` | ~1,280 |
| Billing crons (3 daily/monthly) | ~90 + 2 | ~92 |
| CSV imports | Rare, ~2/center/mo | ~4 |
| User deletion | Rare | ~2 |
| Content moderation | Rare batch scans | ~5 |
| **Total** | | **~2,200/mo** |

**Baseline: $0/mo** (well within 50K free tier)

---

## 6. Google Gemini API — AI Features

**Model: gemini-2.0-flash**

| Item | Cost |
|---|---|
| Input tokens | $0.10 / 1M tokens |
| Output tokens | $0.40 / 1M tokens |
| Free tier | 1,500 req/day, 1M tokens/min |

### 6a. Question Generation

| Variable | Estimate |
|---|---|
| New exercises/mo | `EXERCISES_PER_CENTER × CENTERS × 0.2` = 40 |
| Calls per exercise | `AI_CALLS_PER_EXERCISE` = 10 |
| Input tokens/call | ~2,000 (passage + system prompt) |
| Output tokens/call | ~1,500 (JSON questions) |
| **Monthly input** | 40 × 10 × 2,000 = **800K tokens** |
| **Monthly output** | 40 × 10 × 1,500 = **600K tokens** |

### 6b. Submission Grading

| Variable | Estimate |
|---|---|
| Submissions/mo | `STUDENTS × SUBMISSIONS_PER_STUDENT_MONTH` = 1,280 |
| Input tokens/call | ~3,000 (student text + rubric + golden samples) |
| Output tokens/call | ~2,000 (scores + feedback + highlights) |
| **Monthly input** | 1,280 × 3,000 = **3.84M tokens** |
| **Monthly output** | 1,280 × 2,000 = **2.56M tokens** |

### Gemini total

| | Input tokens | Output tokens | Cost |
|---|---|---|---|
| Question gen | 800K | 600K | $0.08 + $0.24 = $0.32 |
| Grading | 3.84M | 2.56M | $0.38 + $1.02 = $1.40 |
| **Total** | **4.64M** | **3.16M** | **~$1.72/mo** |

**Baseline: ~$2/mo**

> 💡 Gemini 2.0 Flash is very cheap. This stays low even at 10x scale (~$17/mo). The free tier (1,500 req/day) likely covers this entirely at baseline.

---

## 7. Polar — Payment Processing

| Item | Cost |
|---|---|
| Platform fee | 4% of transaction amount |

**Formula:** `CENTERS × subscription_price × 0.04`

**Baseline:** Depends on your pricing. Example: 2 centers × $100/mo = $200 revenue → **$8/mo to Polar**

> ⚙️ Replace `subscription_price` with your actual per-center pricing.

---

## 8. Domain & DNS

| Item | Cost | Notes |
|---|---|---|
| Domain registration | ~$10–15/yr | .com pricing |
| DNS | Usually free | Included with registrar or Cloudflare |

**Baseline: ~$1/mo**

---

## Monthly Cost Summary

| Service | Baseline (2 centers, 200 users) | At 10 centers (~1,000 users) |
|---|---|---|
| Railway (backend + DB) | $25–42 | $50–80 |
| Firebase Auth | $0 | $0 |
| Firebase Storage | $1–4 | $5–20 |
| Resend (email) | $0 | $0–20 |
| Inngest (jobs) | $0 | $0 |
| Gemini API (AI) | $0–2 | $10–17 |
| Polar (payments) | 4% of revenue | 4% of revenue |
| Domain | $1 | $1 |
| **Total (excl. Polar)** | **~$27–49/mo** | **~$66–138/mo** |

---

## Key Takeaways for Pricing

1. **Infra cost per center: ~$14–25/mo** at 2 centers
2. **Infra cost per center drops to ~$7–14/mo** at 10 centers (economies of scale)
3. **Biggest cost driver:** Railway hosting (fixed-ish regardless of usage)
4. **Biggest variable cost:** Firebase Storage (grows with submission volume)
5. **AI costs are negligible** thanks to Gemini Flash pricing
6. **Most services are within free tiers** at this scale
7. **Polar takes 4%** — factor this into your margin

### Suggested minimum pricing floor

To cover infra + margin at 2 centers:

| | Per center/mo |
|---|---|
| Infra cost | ~$20 |
| Buffer (2x for safety) | $40 |
| Polar cut (4%) | +$1.70 |
| **Minimum price to break even with margin** | **~$42/mo per center** |

> This is just the infrastructure floor. Your actual pricing should factor in development time, support costs, and the value delivered.

---

## Scaling Triggers

| When you hit... | Action needed | Cost impact |
|---|---|---|
| 50K MAU | Firebase Auth paid tier | +$0.01–0.06/user |
| 3,000 emails/mo | Resend Pro plan | +$20/mo |
| 50K Inngest runs/mo | Inngest Team plan | +$50/mo |
| 100GB+ storage | Consider cleanup policy or S3 migration | Variable |
| 10+ centers | Consider Railway dedicated DB | +$20–50/mo |
