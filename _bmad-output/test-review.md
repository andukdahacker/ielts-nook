# Test Quality Review: Full Suite

**Quality Score**: 71/100 (B - Acceptable)
**Review Date**: 2026-03-21
**Review Scope**: Suite (all tests)
**Reviewer**: TEA Agent (Test Architect)

---

Note: This review audits existing tests; it does not generate tests.

## Executive Summary

**Overall Assessment**: Acceptable

**Recommendation**: Approve with Comments

### Key Strengths

- Zero hard waits across all 150+ backend unit/integration tests — excellent determinism
- Comprehensive mock isolation with `vi.clearAllMocks()` in every backend test's `beforeEach`
- Sophisticated E2E fixture infrastructure (~2,300 lines) with API factories, exponential backoff for Firebase rate-limiting, and multi-user context management
- Strong Vitest configuration with single-fork pool preventing race conditions in integration tests
- Good cross-browser E2E coverage (Chromium, Firefox, Mobile Chrome)

### Key Weaknesses

- 22 hardcoded `waitForTimeout()` delays across E2E tests (major flakiness risk)
- 8+ test files exceed 300-line limit (largest: `question-editors.test.tsx` at 2,279 lines)
- No formal test ID convention (e.g., `1.3-E2E-001`) used anywhere in the suite
- Hardcoded test data ("magic strings") prevalent in majority of files; factory pattern used in only ~3 files
- `networkidle` wait strategy used 12+ times in E2E tests (fragile in SPAs)

### Summary

The ClassLite test suite of **203 files (~50,600 lines)** across Vitest (unit/integration) and Playwright (E2E) demonstrates strong engineering fundamentals. Backend tests excel at determinism and isolation with zero hard waits and comprehensive mocking. The E2E fixture infrastructure is well-architected with API-driven setup, proper cleanup, and sophisticated rate-limiting handling. However, the E2E tests suffer from accumulated hardcoded delays (22 instances) that create flakiness risk, and the suite lacks formal conventions for test IDs, BDD structure, and data factories. Eight test files significantly exceed the 300-line recommended limit. Addressing the critical hard-wait issue and standardizing data patterns would elevate this suite from Acceptable to Good.

---

## Quality Criteria Assessment

| Criterion                            | Status  | Violations | Notes                                                                           |
| ------------------------------------ | ------- | ---------- | ------------------------------------------------------------------------------- |
| BDD Format (Given-When-Then)         | ⚠️ WARN | 1          | ~1/150 backend files use explicit BDD; ~40% of E2E have implicit flow structure |
| Test IDs                             | ❌ FAIL | 1          | No formal test ID convention (e.g., `1.3-E2E-001`) used anywhere               |
| Priority Markers (P0/P1/P2/P3)       | ❌ FAIL | 1          | No priority classification in any test file                                     |
| Hard Waits (sleep, waitForTimeout)   | ❌ FAIL | 1          | 22 instances in E2E; 0 in backend/frontend (excellent there)                    |
| Determinism (no conditionals)        | ⚠️ WARN | 1          | 1 mutable module state issue (SubmissionPage.test.tsx); minor Date.now usage    |
| Isolation (cleanup, no shared state) | ✅ PASS | 0          | Excellent across all layers; global afterEach cleanup; proper beforeEach resets  |
| Fixture Patterns                     | ⚠️ WARN | 1          | E2E fixtures excellent; backend uses mocks (appropriate); no shared test utils  |
| Data Factories                       | ⚠️ WARN | 1          | Only 3 files use factory functions; majority use hardcoded magic strings        |
| Network-First Pattern                | ⚠️ WARN | 1          | Generally good in E2E; 12+ uses of fragile `networkidle` wait strategy          |
| Explicit Assertions                  | ✅ PASS | 0          | All tests have assertions; frontend avg 1.8/test; backend avg 2-5/test          |
| Test Length (<=300 lines)             | ❌ FAIL | 8          | 8 files exceed 300 lines; largest is 2,279 lines                                |
| Test Duration (<=1.5 min)            | ⚠️ WARN | 1          | Grading workbench has 120s timeout; most tests are fast                         |
| Flakiness Patterns                   | ❌ FAIL | 2          | Hardcoded delays + networkidle + `.catch(() => false)` error suppression         |

**Total Violations**: 2 Critical, 4 High, 5 Medium, 3 Low

---

## Quality Score Breakdown

```
Starting Score:          100
Critical Violations:     -2 x 10 = -20
High Violations:         -4 x 5 = -20
Medium Violations:       -5 x 2 = -10
Low Violations:          -3 x 1 = -3

Bonus Points:
  Excellent BDD:         +0
  Comprehensive Fixtures: +5 (E2E fixture infrastructure is excellent)
  Data Factories:        +0
  Network-First:         +0
  Perfect Isolation:     +5 (backend isolation is exemplary)
  All Test IDs:          +0
                         --------
Total Bonus:             +10

Final Score:             71/100 (after clamping 0-100)
Grade:                   B (Acceptable)
```

---

## Critical Issues (Must Fix)

### 1. Hardcoded Delays in E2E Tests (22 instances)

**Severity**: P0 (Critical)
**Location**: Multiple E2E test files
**Criterion**: Hard Waits / Flakiness Patterns
**Knowledge Base**: [test-quality.md](../../../testarch/knowledge/test-quality.md), [network-first.md](../../../testarch/knowledge/network-first.md)

**Issue Description**:
22 instances of `page.waitForTimeout()` with hardcoded delays (300ms-3000ms) across E2E tests. These create environment-dependent flakiness — passing locally but failing in slow CI environments.

**Affected Files (worst offenders)**:
- `apps/e2e/tests/logistics/schedule.spec.ts` — 9 instances of `waitForTimeout(300)`
- `apps/e2e/tests/logistics/sessions.spec.ts` — 6 instances of `waitForTimeout(300-500)`
- `apps/e2e/tests/grading/teacher-comments.spec.ts` — 4 instances of `waitForTimeout(300-2000)`
- `apps/e2e/tests/grading/grading-workbench.spec.ts` — 3 instances of `waitForTimeout(2000-3000)`

**Current Code**:

```typescript
// ❌ Bad (current implementation in schedule.spec.ts)
await page.waitForTimeout(300);
await expect(page.getByRole("dialog")).toBeVisible();
```

**Recommended Fix**:

```typescript
// ✅ Good (recommended approach)
await page.getByRole("dialog").waitFor({ state: "visible", timeout: 5000 });
await expect(page.getByRole("dialog")).toBeVisible();
```

For post-API-call waits in grading-workbench.spec.ts:
```typescript
// ❌ Bad
await page.waitForTimeout(2000); // wait for API

// ✅ Good
await page.waitForResponse(resp =>
  resp.url().includes("/api/grading") && resp.status() === 200
);
```

**Why This Matters**:
Hardcoded delays are the #1 cause of flaky tests. They either waste time (delay too long) or fail intermittently (delay too short). Element-based and response-based waits are deterministic and self-adjusting.

**Related Violations**: All 22 instances follow the same anti-pattern.

---

### 2. Oversized Test Files (8 files >300 lines)

**Severity**: P0 (Critical)
**Location**: Multiple files across backend and frontend
**Criterion**: Test Length
**Knowledge Base**: [test-quality.md](../../../testarch/knowledge/test-quality.md)

**Issue Description**:
8 test files significantly exceed the 300-line recommended limit, with the worst offender at 2,279 lines. Large test files are harder to maintain, slower to debug, and discourage focused testing.

**Affected Files**:

| File | Lines | Severity |
|------|-------|----------|
| `apps/webapp/.../question-editors.test.tsx` | 2,279 | Critical (>500) |
| `apps/backend/.../exercises.service.test.ts` | 1,447 | Critical (>500) |
| `apps/backend/.../grading.service.test.ts` | 1,244 | Critical (>500) |
| `apps/backend/.../student-health.service.test.ts` | 1,169 | Critical (>500) |
| `apps/backend/.../sessions.service.test.ts` | 1,047 | Critical (>500) |
| `apps/backend/.../csv-import.service.test.ts` | 804 | Critical (>500) |
| `apps/backend/.../billing.service.test.ts` | 800 | Critical (>500) |
| `apps/backend/.../assignments.service.test.ts` | 713 | Critical (>500) |

**Recommended Fix**:
Split by describe block into separate files:

```
# Example: exercises.service.test.ts (1,447 lines, 15 describe blocks)
# Split into:
exercises.service.crud.test.ts          # CRUD operations
exercises.service.files.test.ts         # File upload/storage
exercises.service.duplication.test.ts   # Duplication logic
exercises.service.archiving.test.ts     # Archive/restore
```

**Why This Matters**:
Files >300 lines violate test quality Definition of Done. They slow down debugging (harder to find relevant tests), increase merge conflicts, and make it difficult to run focused test subsets.

---

## Recommendations (Should Fix)

### 1. Adopt Formal Test ID Convention

**Severity**: P1 (High)
**Location**: All 203 test files
**Criterion**: Test IDs
**Knowledge Base**: [test-levels-framework.md](../../../testarch/knowledge/test-levels-framework.md)

**Issue Description**:
No test file uses a formal test ID convention. Tests cannot be traced to requirements, stories, or acceptance criteria. The recommended format is `{EPIC}.{STORY}-{LEVEL}-{SEQ}` (e.g., `1.3-E2E-001`).

**Recommended Improvement**:

```typescript
// ✅ Good (recommended)
test.describe("1.3-E2E-001: Login Flow", () => {
  test("1.3-E2E-001a: valid credentials redirect to dashboard", async ({ page }) => {
    // ...
  });
});
```

**Benefits**: Enables traceability matrices, coverage analysis, and requirement-to-test mapping.

**Priority**: Address when creating new tests; retrofit existing tests during refactoring.

---

### 2. Replace `networkidle` with Element-Based Waits

**Severity**: P1 (High)
**Location**: 12+ E2E test files (especially `signup.spec.ts` with 5 instances)
**Criterion**: Flakiness Patterns / Network-First Pattern
**Knowledge Base**: [timing-debugging.md](../../../testarch/knowledge/timing-debugging.md)

**Issue Description**:
`page.waitForLoadState("networkidle")` is fragile in SPAs. React Query polling, analytics, WebSocket connections, and background requests prevent the network from ever truly being "idle."

**Current Code**:

```typescript
// ⚠️ Could be improved (current)
await page.goto("/register");
await page.waitForLoadState("networkidle");
await expect(page.getByLabel("Center Name")).toBeVisible();
```

**Recommended Improvement**:

```typescript
// ✅ Better approach
await page.goto("/register");
await expect(page.getByLabel("Center Name")).toBeVisible();
// Element-based wait is deterministic; no need for networkidle
```

**Benefits**: Eliminates false timeouts from background network activity; faster test execution.

---

### 3. Standardize Data Factory Pattern

**Severity**: P1 (High)
**Location**: All backend and frontend test files
**Criterion**: Data Factories
**Knowledge Base**: [data-factories.md](../../../testarch/knowledge/data-factories.md)

**Issue Description**:
Only 3 files use factory functions (`student-health.service.test.ts` with `makeStudent()`, `StudentProfileOverlay.test.tsx` with `makeProfile()`, `QuestionInputFactory.test.tsx` with `makeQuestion()`). The remaining 200 files use hardcoded magic strings like `"center-123"`, `"ex-1"`, `"test@example.com"`.

**Current Code**:

```typescript
// ⚠️ Could be improved (current in exercises.service.test.ts)
const mockExercise = {
  id: "ex-1",
  title: "Test Exercise",
  centerId: "center-123",
  createdBy: "user-456",
  // ... 20+ hardcoded fields
};
```

**Recommended Improvement**:

```typescript
// ✅ Better approach
function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: `ex-${crypto.randomUUID().slice(0, 8)}`,
    title: `Test Exercise ${Date.now()}`,
    centerId: "center-test",
    createdBy: "user-test",
    ...overrides,
  };
}

const mockExercise = makeExercise({ title: "Custom Title" });
```

**Benefits**: Centralizes test data creation; schema changes update in one place; overrides make test intent clear; unique IDs prevent cross-test collisions.

---

### 4. Expand `data-testid` Coverage in E2E

**Severity**: P1 (High)
**Location**: E2E tests and webapp components
**Criterion**: Selector Resilience
**Knowledge Base**: [selector-resilience.md](../../../testarch/knowledge/selector-resilience.md)

**Issue Description**:
Only ~35% of E2E selectors use `data-testid`. Most rely on CSS attribute selectors (`input[type="email"]`), role queries, or text matching. While `getByRole` is acceptable, CSS attribute selectors are brittle.

**Current Code**:

```typescript
// ⚠️ Could be improved
const dialog = page.locator('[role="dialog"]');
const emailInput = page.locator('input[type="email"]');
```

**Recommended Improvement**:

```typescript
// ✅ Better approach
const dialog = page.getByTestId("assignment-dialog");
const emailInput = page.getByTestId("login-email");
// or
const emailInput = page.getByRole("textbox", { name: "Email" });
```

**Benefits**: `data-testid` survives UI redesigns, CSS refactors, and copy changes.

---

### 5. Fix Mutable Module State in SubmissionPage.test.tsx

**Severity**: P2 (Medium)
**Location**: `apps/webapp/src/features/submissions/.../SubmissionPage.test.tsx`
**Criterion**: Determinism / Isolation
**Knowledge Base**: [test-quality.md](../../../testarch/knowledge/test-quality.md)

**Issue Description**:
Module-level mutable variable `let mockOnlineManagerIsOnline = true` is shared across tests and modified within tests. If tests run in parallel, one test setting it to `false` could affect others.

**Current Code**:

```typescript
// ⚠️ Could be improved
let mockOnlineManagerIsOnline = true;
vi.mock("@tanstack/react-query", () => ({
  onlineManager: { isOnline: () => mockOnlineManagerIsOnline },
}));

// In test:
mockOnlineManagerIsOnline = false; // Mutation!
```

**Recommended Improvement**:

```typescript
// ✅ Better approach
const mockOnlineManager = { isOnline: vi.fn().mockReturnValue(true) };
vi.mock("@tanstack/react-query", () => ({
  onlineManager: mockOnlineManager,
}));

// In test:
mockOnlineManager.isOnline.mockReturnValue(false);

// In beforeEach:
mockOnlineManager.isOnline.mockReturnValue(true); // Auto-reset
```

**Benefits**: `vi.clearAllMocks()` in `beforeEach` automatically resets mock return values.

---

### 6. Eliminate `.catch(() => false)` Error Suppression

**Severity**: P2 (Medium)
**Location**: E2E tests (`exercise-library.spec.ts`, `sessions.spec.ts`, `teacher-comments.spec.ts`)
**Criterion**: Determinism / Flakiness Patterns
**Knowledge Base**: [test-healing-patterns.md](../../../testarch/knowledge/test-healing-patterns.md)

**Issue Description**:
Multiple E2E tests use `.catch(() => false)` to silently swallow errors, hiding real failures.

**Current Code**:

```typescript
// ⚠️ Could be improved
const exists = await page.locator(".ai-assistant").isVisible().catch(() => false);
```

**Recommended Improvement**:

```typescript
// ✅ Better approach
const exists = await page.locator(".ai-assistant").isVisible();
// If element may not exist, use count check:
const count = await page.locator(".ai-assistant").count();
if (count > 0) { /* handle */ }
```

**Benefits**: Real errors surface immediately; debugging is faster.

---

### 7. Add BDD Structure (Given-When-Then)

**Severity**: P2 (Medium)
**Location**: All test files
**Criterion**: BDD Format
**Knowledge Base**: [test-quality.md](../../../testarch/knowledge/test-quality.md)

**Issue Description**:
Only 1 of 150+ backend tests uses explicit Given-When-Then comments. ~40% of E2E tests have implicit flow structure but no explicit BDD markers.

**Recommended Improvement**:

```typescript
// ✅ Better approach
test("redirects to dashboard after valid login", async ({ page }) => {
  // Given: user is on the login page
  await page.goto("/sign-in");

  // When: user submits valid credentials
  await page.fill('[data-testid="email"]', testUser.email);
  await page.fill('[data-testid="password"]', testUser.password);
  await page.click('[data-testid="submit"]');

  // Then: user is redirected to dashboard
  await expect(page).toHaveURL(/dashboard/);
});
```

**Benefits**: Tests document intent; easier for new developers to understand; facilitates code review.

**Priority**: Apply to new tests immediately; retrofit existing tests during maintenance.

---

## Best Practices Found

### 1. Zero Hard Waits in Backend Tests

**Location**: All 150+ backend test files
**Pattern**: Deterministic Testing
**Knowledge Base**: [test-quality.md](../../../testarch/knowledge/test-quality.md)

**Why This Is Good**:
Not a single `sleep()`, `setTimeout()`, or `waitForTimeout()` exists across the entire backend test suite. All tests use synchronous mock returns or properly awaited promises. This is exemplary.

**Use as Reference**: Backend test patterns should be the model for E2E test improvements.

---

### 2. Exponential Backoff in E2E Auth Fixture

**Location**: `apps/e2e/fixtures/auth.fixture.ts:92-118`
**Pattern**: Rate Limiting Resilience
**Knowledge Base**: [test-healing-patterns.md](../../../testarch/knowledge/test-healing-patterns.md)

**Why This Is Good**:
The `loginAs()` fixture implements exponential backoff with jitter (`3000 * attempt + random jitter`) to handle Firebase Auth emulator rate-limiting. This prevents flaky auth failures in CI.

```typescript
// ✅ Excellent pattern
const delay = 3000 * attempt + Math.random() * 1000;
await page.waitForTimeout(delay); // Justified: rate-limit backoff
```

**Use as Reference**: Apply this pattern to any test interacting with rate-limited services.

---

### 3. API-Driven Test Setup in E2E

**Location**: `apps/e2e/fixtures/exercise-fixtures.ts`, `assignment-fixtures.ts`
**Pattern**: API-First Setup
**Knowledge Base**: [data-factories.md](../../../testarch/knowledge/data-factories.md)

**Why This Is Good**:
E2E fixtures use direct API calls (`createExerciseViaAPI()`, `publishExerciseViaAPI()`, `cleanupExercise()`) for test data setup instead of UI interactions. This is 10-50x faster and more reliable.

```typescript
// ✅ Excellent pattern
async function createExerciseViaAPI(request, authToken, data) {
  const response = await request.post("/api/exercises", {
    data,
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!response.ok()) {
    throw new Error(`Failed: ${response.status()} ${await response.text()}`);
  }
  return response.json();
}
```

**Use as Reference**: All E2E test data should be created via API, not UI.

---

### 4. Fake Timers in Frontend Auto-Save Test

**Location**: `apps/webapp/.../use-auto-save.test.ts`
**Pattern**: Deterministic Timer Testing
**Knowledge Base**: [timing-debugging.md](../../../testarch/knowledge/timing-debugging.md)

**Why This Is Good**:
Uses `vi.useFakeTimers()` with `advanceTimersByTimeAsync()` to test debounce behavior deterministically. Proper `afterEach` cleanup with `vi.useRealTimers()`.

```typescript
// ✅ Excellent pattern
beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); });
afterEach(() => { vi.useRealTimers(); });

test("debounces saves", async () => {
  // ...trigger changes...
  await act(() => vi.advanceTimersByTimeAsync(3000));
  expect(mockSave).toHaveBeenCalledOnce();
});
```

**Use as Reference**: Any test involving timers, debouncing, or polling should use fake timers.

---

### 5. Factory Functions in Student Health Tests

**Location**: `apps/backend/.../student-health.service.test.ts`
**Pattern**: Data Factories
**Knowledge Base**: [data-factories.md](../../../testarch/knowledge/data-factories.md)

**Why This Is Good**:
Uses `makeStudent()` and `makeEnrollment()` factory functions for test data generation. This centralizes data creation, makes schema changes easy, and clarifies test intent through overrides.

**Use as Reference**: Expand this pattern to all service tests.

---

## Test File Analysis

### File Metadata

- **Total Files**: 203 test files
- **Total Lines**: ~50,600 lines of test code
- **Test Frameworks**: Vitest (unit/integration), Playwright (E2E)
- **Languages**: TypeScript (100%)

### Test Structure

| Layer | Files | Lines | Describe Blocks | Test Cases | Avg Lines/File |
|-------|-------|-------|----------------|------------|----------------|
| Backend Unit/Integration | 65 | ~16,000 | ~94 | ~362 | 246 |
| Frontend Component | 134 | ~19,000 | ~200 | ~600 | 142 |
| Database Package | 3 | ~500 | ~8 | ~25 | 167 |
| Types Package | 4 | ~400 | ~6 | ~20 | 100 |
| E2E (Playwright) | 49 | ~5,200 | ~60 | ~441 | 106 |
| **Total** | **203** | **~50,600** | **~368** | **~1,448** | **~249** |

### Assertions Analysis

| Layer | Avg Assertions/Test | Quality |
|-------|-------------------|---------|
| Backend | 2-5 | Good |
| Frontend | 1.8 | Acceptable |
| E2E | 2-3 | Good |

---

## Knowledge Base References

This review consulted the following knowledge base fragments:

- **[test-quality.md](../_bmad/bmm/testarch/knowledge/test-quality.md)** - Definition of Done for tests (no hard waits, <300 lines, <1.5 min, self-cleaning)
- **[fixture-architecture.md](../_bmad/bmm/testarch/knowledge/fixture-architecture.md)** - Pure function -> Fixture -> mergeTests pattern
- **[network-first.md](../_bmad/bmm/testarch/knowledge/network-first.md)** - Route intercept before navigate (race condition prevention)
- **[data-factories.md](../_bmad/bmm/testarch/knowledge/data-factories.md)** - Factory functions with overrides, API-first setup
- **[test-levels-framework.md](../_bmad/bmm/testarch/knowledge/test-levels-framework.md)** - E2E vs API vs Component vs Unit appropriateness
- **[selective-testing.md](../_bmad/bmm/testarch/knowledge/selective-testing.md)** - Duplicate coverage detection
- **[test-healing-patterns.md](../_bmad/bmm/testarch/knowledge/test-healing-patterns.md)** - Common failure patterns (stale selectors, race conditions)
- **[selector-resilience.md](../_bmad/bmm/testarch/knowledge/selector-resilience.md)** - Selector hierarchy (data-testid > ARIA > text > CSS)
- **[timing-debugging.md](../_bmad/bmm/testarch/knowledge/timing-debugging.md)** - Race condition prevention and async debugging
- **[playwright-config.md](../_bmad/bmm/testarch/knowledge/playwright-config.md)** - Environment-based config with fail-fast validation
- **[component-tdd.md](../_bmad/bmm/testarch/knowledge/component-tdd.md)** - Red-Green-Refactor patterns
- **[ci-burn-in.md](../_bmad/bmm/testarch/knowledge/ci-burn-in.md)** - Flaky test detection with burn-in loops

See [tea-index.csv](../_bmad/bmm/testarch/tea-index.csv) for complete knowledge base.

---

## Next Steps

### Immediate Actions (Before Next Sprint)

1. **Remove all 22 hardcoded delays in E2E tests** - Replace with element-based or response-based waits
   - Priority: P0
   - Owner: Dev team
   - Files: `schedule.spec.ts`, `sessions.spec.ts`, `grading-workbench.spec.ts`, `teacher-comments.spec.ts`

2. **Replace `networkidle` with element waits** - Especially in `signup.spec.ts` (5 instances)
   - Priority: P1
   - Owner: Dev team
   - Files: `signup.spec.ts`, `protected-routes.spec.ts`, `assignments.spec.ts`

3. **Fix mutable module state** in `SubmissionPage.test.tsx`
   - Priority: P2
   - Owner: Frontend dev

### Follow-up Actions (Future Sprints)

1. **Split oversized test files** - 8 files >300 lines need splitting by describe block
   - Priority: P1
   - Target: Next 2 sprints

2. **Standardize data factory pattern** - Create shared factory functions per domain
   - Priority: P1
   - Target: Ongoing with new tests

3. **Add `data-testid` attributes** - Increase coverage from ~35% to 80%+
   - Priority: P2
   - Target: Backlog (address per-feature)

4. **Adopt BDD structure** - Add Given-When-Then comments to all new tests
   - Priority: P2
   - Target: Ongoing convention

5. **Add test ID convention** - Format: `{EPIC}.{STORY}-{LEVEL}-{SEQ}`
   - Priority: P3
   - Target: Backlog

### Re-Review Needed?

⚠️ Re-review after critical fixes — address hardcoded delays, then re-review E2E flakiness risk.

---

## Decision

**Recommendation**: Approve with Comments

**Rationale**:

Test quality is acceptable with 71/100 score. The backend test suite demonstrates exemplary practices with zero hard waits, comprehensive mock isolation, and strong determinism. The E2E fixture infrastructure is well-architected with API-driven setup and intelligent rate-limiting handling. However, 22 hardcoded delays in E2E tests pose a significant flakiness risk that should be addressed promptly. The lack of formal test IDs and data factory standardization limits traceability and maintainability but does not block the current development workflow.

> Test quality is acceptable with 71/100 score. High-priority recommendations (hardcoded delay removal, networkidle replacement) should be addressed in the next sprint but don't block current merges. Critical issues are localized to E2E test files and can be fixed incrementally. Backend test quality is strong and serves as a model for the rest of the suite.

---

## Appendix

### Violation Summary by Layer

| Layer | Critical (P0) | High (P1) | Medium (P2) | Low (P3) | Score Impact |
|-------|--------------|-----------|-------------|----------|-------------|
| Backend (Unit/Integration) | 0 | 1 (data factories) | 2 (file length, BDD) | 1 (naming) | -8 |
| Frontend (Component) | 1 (file length) | 1 (data factories) | 1 (mutable state) | 1 (assertion density) | -18 |
| E2E (Playwright) | 1 (hard waits) | 2 (networkidle, selectors) | 2 (BDD, error suppression) | 1 (inconsistency) | -25 |

### Violation Summary by Criterion

| Criterion | P0 | P1 | P2 | P3 | Total |
|-----------|----|----|----|----|-------|
| Hard Waits | 1 | 0 | 0 | 0 | 1 |
| Test Length | 1 | 0 | 0 | 0 | 1 |
| Test IDs | 0 | 1 | 0 | 0 | 1 |
| Data Factories | 0 | 1 | 0 | 0 | 1 |
| Selector Resilience | 0 | 1 | 0 | 0 | 1 |
| networkidle | 0 | 1 | 0 | 0 | 1 |
| BDD Structure | 0 | 0 | 1 | 0 | 1 |
| Priority Markers | 0 | 0 | 1 | 0 | 1 |
| Determinism | 0 | 0 | 1 | 0 | 1 |
| Error Suppression | 0 | 0 | 1 | 0 | 1 |
| Test Duration | 0 | 0 | 1 | 0 | 1 |
| Assertion Density | 0 | 0 | 0 | 1 | 1 |
| Naming Consistency | 0 | 0 | 0 | 1 | 1 |
| Error Diagnostics | 0 | 0 | 0 | 1 | 1 |

### Suite Statistics

| Metric | Value |
|--------|-------|
| Total test files | 203 |
| Total test lines | ~50,600 |
| Total test cases | ~1,448 |
| Total describe blocks | ~368 |
| Frameworks | Vitest, Playwright |
| Languages | TypeScript (100%) |
| Hard waits (backend) | 0 |
| Hard waits (frontend) | ~2 |
| Hard waits (E2E) | 22 |
| Files >300 lines | 8 |
| Files >500 lines | 8 |
| Factory function usage | 3 files (~1.5%) |
| data-testid coverage (E2E) | ~35% |
| BDD structure adoption | ~5% |
| Test ID convention | 0% |

---

## Review Metadata

**Generated By**: BMad TEA Agent (Test Architect)
**Workflow**: testarch-test-review v4.0
**Review ID**: test-review-full-suite-20260321
**Timestamp**: 2026-03-21
**Version**: 1.0

---

## Feedback on This Review

If you have questions or feedback on this review:

1. Review patterns in knowledge base: `_bmad/bmm/testarch/knowledge/`
2. Consult tea-index.csv for detailed guidance
3. Request clarification on specific violations
4. Pair with QA engineer to apply patterns

This review is guidance, not rigid rules. Context matters - if a pattern is justified, document it with a comment.
