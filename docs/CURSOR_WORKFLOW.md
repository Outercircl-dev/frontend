# CURSOR_WORKFLOW.md

## Overview

This document defines the standardized Cursor-driven development workflow for executing Jira tickets within the OuterCircl codebase. Each ticket follows a repeatable, multi-phase process that integrates with GitHub and maintains code quality while accelerating development.

---

## Quick Start: Execute Ticket Flow

### Command: `Execute ticket OD-XX`

When you paste this into Cursor chat, the AI will:

1. **Fetch context** from Jira (via branch naming convention & PR details)
2. **Follow Phase A-C workflow** (design → implement → test)
3. **Keep IMPLEMENTATION_RULES.md in focus** (consistency)
4. **Auto-generate PR description** with SRS traceability

---

## Phase A: Scope & Impact Analysis (15–20 minutes)

### What Cursor Does

When you say: **"Phase A: Execute ticket OD-80"**

Cursor will:

```markdown
I will now:
1. Parse the Jira ticket ID (OD-80) from branch name: feature/OD-80-*
2. Infer ticket scope from branch name and GitHub PR (if exists)
3. Read /docs/Software_Requirements_Specification.pdf
4. Identify which SRS functional requirements (F1–F10) this ticket touches
5. List affected code modules based on IMPLEMENTATION_RULES.md
6. Output an impact map before making any changes
```

### Cursor Prompt (Copy-Paste into Chat)

```
PHASE A: SCOPE & IMPACT ANALYSIS

Ticket ID: OD-80
Context: OuterCircl FFP (see /docs/SRS summary or full SRS in /docs)

Tasks:
1. Infer ticket title/scope from current branch name: (git branch -a | grep *)
   - If branch is feature/OD-80-onboarding-flow, then: Onboarding Flow
   - If PR exists on GitHub, parse PR title for ticket scope

2. Map to SRS:
   - Which functional requirements (F1–F10) does OD-80 touch?
   - List specific user stories or flows impacted.
   - Call out any cross-cutting concerns (auth, notifications, safety, etc.)

3. Identify code modules (per IMPLEMENTATION_RULES.md):
   - Backend modules affected: (list from /src/services, /src/controllers, etc.)
   - Frontend modules affected: (list from /src/pages, /src/components, etc.)
   - Database/schema changes: (yes/no; if yes, which tables?)
   - APIs affected: (which REST endpoints?)

4. Dependency check:
   - Does this ticket depend on any unmerged branches?
   - Are any critical infrastructure components needed?

5. Output:
   - A markdown table: [SRS Req] -> [Files/Modules] -> [Risk Level: Low/Medium/High]
   - A manual QA checklist (3–5 key flows to test manually)
   - Any questions before proceeding to Phase B

STOP before making changes. Wait for my confirmation to proceed.
```

### Expected Output

```
✓ Phase A Complete for OD-80

SRS Mapping:
| SRS Req | User Flow | Modules | Risk |
|---------|-----------|---------|------|
| F1      | User Auth | /src/auth, /src/api/auth.ts | Low |
| F7      | Profile Setup | /src/pages/profile, /src/forms | Medium |

Dependencies:
- OD-79 (PR #145) must be merged first ← BLOCKING
- Migration scripts ready ← YES

Files to Review:
- /src/auth/sessions.ts
- /src/pages/onboarding/profile-setup.tsx
- /src/api/controllers/user.controller.ts
- /db/migrations/user_profile_fields.sql

Next: Review this map, confirm, then I'll proceed to Phase B (Design Plan).
```

---

## Phase B: Design Plan & Architecture (20–30 minutes)

### Cursor Prompt

```
PHASE B: DESIGN PLAN & ARCHITECTURE

Ticket ID: OD-80
[Assuming Phase A is confirmed]

Tasks:
1. Propose implementation strategy:
   - Backend changes (new endpoints, service logic, DB schema)
   - Frontend changes (new pages, components, forms, hooks)
   - Data contracts (DTOs, request/response shapes)

2. For EACH step, reference:
   - Exact file paths
   - Existing patterns from IMPLEMENTATION_RULES.md
   - SRS requirements being met

3. Output format:
   a) High-level plan (3–5 bullet points)
   b) Detailed step-by-step breakdown (numbered 1–N)
   c) Acceptance criteria mapping table: [AC from Jira] -> [Implementation Step]

4. Highlight:
   - Reusable components/functions to leverage
   - Testing strategy (unit + integration + manual)
   - Estimated effort per step (15 min, 30 min, etc.)

DO NOT write code. Return the plan for review.
Example format:

---
## Plan Overview

- **Step 1**: Create user_profile table schema with required fields (interests, hobbies, etc.)
- **Step 2**: Build ProfileSetupForm component (reusable, follows DesignSystem)
- **Step 3**: Wire ProfileSetupForm to /api/users/profile endpoint
- **Step 4**: Add profile update logic to UserService
- **Step 5**: Integrate profile validation (per SRS security rules)
- **Step 6**: Add tests (Jest for logic, RTL for components)

## Detailed Steps

1. **DB Schema** (Migration)
   - File: /db/migrations/001_user_profiles.sql
   - Add columns: interests (JSONB), hobbies (TEXT[]), profile_pic_url (VARCHAR)
   - Existing pattern: See /db/migrations/user_auth.sql

2. **API Endpoint** (Backend)
   - File: /src/api/routes/users.ts
   - Endpoint: PUT /users/:id/profile
   - Validation: Use existing UserProfileValidator (pattern from IMPLEMENTATION_RULES.md > Validation)

3. ... [continue for each step]

## Acceptance Criteria Mapping

| AC from Jira | Implementation Step | Validation |
|--------------|-------------------|-----------|
| "Users can update interests" | Step 2 (Form), Step 4 (Service) | Manual: Can select interests, POST saves them |
| "Profile shows picture" | Step 1 (DB), Step 3 (Endpoint) | Manual: Image uploads and displays |

---

Wait for my approval of this plan before proceeding to Phase C.
```

### Expected Output

```
✓ Phase B Complete: Design Plan for OD-80

[Detailed plan as above with 5–7 steps clearly mapped]

Questions for you:
- Is the database schema correct?
- Should we add a "verified interests" enum or free-text?
- Any existing components I should reuse?

Status: Ready for Phase C (Implementation) upon your approval.
```

---

## Phase C: Implementation (30–60 minutes per step)

### Cursor Prompt (Step-by-Step)

```
PHASE C: IMPLEMENTATION (Step 1 of 6)

Ticket ID: OD-80
Plan: [Reference Phase B plan]

**Step 1: Database Schema Migration**

Tasks:
1. Read the existing migration format from /db/migrations/
2. Create file: /db/migrations/001_user_profiles_OD_80.sql
3. Follow naming convention from IMPLEMENTATION_RULES.md:
   - Table: public.user_profiles (camelCase fields)
   - Include created_at, updated_at timestamps
   - Foreign key to users.id with cascade delete
4. Add constraints per SRS security rules
5. Add indexes on frequently queried fields (e.g., user_id)

Output:
- Show the migration SQL (wrapped in code block)
- Explain which SRS security requirements are addressed
- List the new schema fields and their purposes

After Step 1, I will review and say "OK, proceed to Step 2" or ask for adjustments.
```

### Example Step Execution

You run this in Cursor chat, and Cursor responds:

```sql
-- /db/migrations/001_user_profiles_OD_80.sql

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Profile data
  interests JSONB DEFAULT '[]'::jsonb,
  hobbies TEXT[] DEFAULT ARRAY[]::TEXT[],
  profile_pic_url VARCHAR(512),
  bio TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_user_profile UNIQUE(user_id),
  CONSTRAINT interests_not_empty CHECK (jsonb_array_length(interests) > 0 OR interests = '[]'::jsonb)
);

CREATE INDEX idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX idx_user_profiles_created_at ON public.user_profiles(created_at);

-- Trigger for updated_at
CREATE TRIGGER update_user_profiles_timestamp
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
```

**Step 1 Status: Ready for review**
- ✓ Follows IMPLEMENTATION_RULES.md naming
- ✓ Includes SRS security constraints
- ✓ Indexed for performance
- Risk: None (migration only)

**Proceed to Step 2?** (Say: "OK, Step 2")
```

---

## Phase D: Testing & Validation (15–20 minutes)

### Cursor Prompt

```
PHASE D: TESTING & VALIDATION

Ticket ID: OD-80
Implementation: All steps complete

Tasks:
1. Generate unit tests:
   - Test ProfileService (create, update, fetch profile)
   - Framework: Jest (or your framework from IMPLEMENTATION_RULES.md)
   - File: /tests/services/profile.service.test.ts
   
2. Generate component tests:
   - Test ProfileSetupForm (form submission, validation)
   - Framework: React Testing Library
   - File: /tests/components/ProfileSetupForm.test.tsx

3. Generate integration tests:
   - Test full flow: form submit → API call → DB update → form success
   - File: /tests/integration/profile-setup.integration.test.ts

4. Run all tests:
   - Command: npm test -- --testPathPattern="OD_80|profile"
   - Output: Coverage report

5. Generate manual QA checklist:
   - 5–7 test cases a human QA should verify
   - Include edge cases, error scenarios, browser compatibility

Output:
- Test code (ready to paste)
- Test execution results
- Manual QA checklist (markdown table)
```

### Expected Output

```
✓ Tests generated and passing

Unit Tests: 12 passing ✓
Component Tests: 8 passing ✓
Integration Tests: 5 passing ✓

Coverage:
- Services: 95%
- Components: 88%
- API: 100%

Manual QA Checklist:
| Test Case | Steps | Expected | Status |
|-----------|-------|----------|--------|
| Add interests | Click interests, select 3, save | Profile updated | [ ] |
| Invalid interest | Try submit empty interests | Error message | [ ] |
| ... | ... | ... | [ ] |

Status: Ready for Phase E (PR & Review)
```

---

## Phase E: PR & Code Review (10–15 minutes)

### Cursor Prompt

```
PHASE E: GENERATE PR DESCRIPTION

Ticket ID: OD-80
All implementation & tests complete

Tasks:
1. Generate professional PR description:
   - Title: [OD-80] <short description>
   - Summary: What was built (2–3 sentences)
   - SRS traceability: Which F* requirements are met
   - Changes: Bullet list of files changed
   - Testing: Test coverage + manual QA steps
   - Risk assessment: Low/Medium/High + mitigation
   - Screenshots/demo: If applicable

2. Generate commit message:
   - Convention: "OD-80: <verb> <object>"
   - Example: "OD-80: implement user profile setup flow"

Output:
- Ready-to-paste PR description (for GitHub)
- Recommended commit message
```

### Example PR Description (Cursor Output)

```markdown
## [OD-80] Implement User Profile Setup Flow

### Summary
Added profile setup functionality allowing users to configure interests, hobbies, and profile pictures during onboarding. Includes profile management, validation, and integration with the notification system per SRS F1 & F7 requirements.

### SRS Traceability
- **F1**: User Registration & Authentication (extended with profile creation)
- **F7**: User Profile & Preferences (full implementation)
- **F2**: Personalized Datafeed (now feeds off profile interests)

### Changes
- **Backend**:
  - `/src/api/controllers/user.controller.ts` (new profile endpoints)
  - `/src/services/profile.service.ts` (new service layer)
  - `/db/migrations/001_user_profiles_OD_80.sql` (schema)
- **Frontend**:
  - `/src/pages/onboarding/profile-setup.tsx` (new page)
  - `/src/components/ProfileForm.tsx` (reusable form)
  - `/src/hooks/useProfile.ts` (API integration hook)
- **Tests**:
  - `/tests/services/profile.service.test.ts` (12 tests)
  - `/tests/components/ProfileSetupForm.test.tsx` (8 tests)
  - `/tests/integration/profile-setup.integration.test.ts` (5 tests)

### Testing
- **Unit**: 12/12 passing ✓
- **Component**: 8/8 passing ✓
- **Integration**: 5/5 passing ✓
- **Coverage**: 95% (services), 88% (components)
- **Manual QA**: Checklist in PR comments

### Risk Assessment
- **Level**: Low
- **Impact**: Profile data is isolated; no changes to auth/security core
- **Rollback**: Simple: revert migration + code commits
- **Dependencies**: None (OD-79 merged ✓)

### Review Checklist
- [ ] Code follows IMPLEMENTATION_RULES.md patterns
- [ ] All acceptance criteria met (see linked Jira)
- [ ] Tests passing with acceptable coverage
- [ ] PR description complete
- [ ] No breaking changes to existing APIs

### Demo / Manual Test Steps
1. Go to onboarding flow
2. Fill in profile: 3+ interests, hobbies, upload picture
3. Submit; should see success message
4. Go to /profile; verify data persists
5. Try joining activity; datafeed should show relevant activities based on interests
```

---

## Git & Commit Workflow

### Commit Discipline

After each phase or logical step:

```bash
# After Phase C Step 1 (DB migration)
git add db/migrations/
git commit -m "OD-80: add user_profiles table schema"

# After Phase C Step 2 (Backend service)
git add src/api/ src/services/
git commit -m "OD-80: implement profile service & endpoints"

# After Phase C Step 3 (Frontend)
git add src/pages/onboarding/ src/components/ src/hooks/
git commit -m "OD-80: build profile setup form & integration"

# After Phase D (Tests)
git add tests/
git commit -m "OD-80: add profile tests (unit, component, integration)"

# Final: Push to GitHub
git push -u origin feature/OD-80-onboarding-flow
```

### Branch Protection Rules (GitHub)

In your GitHub repo settings, enforce:
- ✓ Require pull request reviews before merging (≥1 reviewer)
- ✓ Require status checks to pass: `npm test`, `npm build`, linting
- ✓ Require branches to be up to date before merging

This ensures no commits bypass review.

---

## Jira Integration Checkpoints

After completing each phase, check Jira:

| Phase | Jira Action | Auto-linked? |
|-------|------------|-------------|
| Phase A Complete | Add comment: "Phase A scope analysis done" | If branch linked ✓ |
| Phase B Complete | Add comment: "Phase B design plan approved" | If branch linked ✓ |
| Phase C Complete | Add comment: "Implementation done; PR link" | Manual (paste PR URL) |
| Phase D Complete | Add comment: "Testing complete: 100% passing" | Manual (paste test results) |
| Phase E/PR Merged | Jira auto-closes when PR referenced in commit | Auto ✓ (if configured) |

---

## Standard Cursor Prompts (Reference)

### Quick-Start Prompts (Copy-Paste)

#### 1. Start a New Ticket
```
I'm starting Jira ticket: OD-XX

Context:
- Branch: feature/OD-XX-<slug>
- SRS: /docs/Software_Requirements_Specification.pdf
- Rules: /IMPLEMENTATION_RULES.md
- Workflow: /CURSOR_WORKFLOW.md (this file)

Action: Execute Phase A (Scope & Impact Analysis)

I will provide:
1. Jira title, description, AC, subtasks
2. You will map to SRS, list affected modules, identify risks
3. Output a scope map before we proceed

Ready?
```

#### 2. Approve & Move to Phase B
```
Phase A confirmed. Proceed to Phase B (Design Plan).

Here's the approved scope:
[Paste Phase A output]

Action: Generate detailed step-by-step implementation plan per IMPLEMENTATION_RULES.md patterns.

Output:
- 5–7 implementation steps (numbered)
- Acceptance criteria mapping table
- Effort estimate per step
- Any questions or blockers

Do NOT write code yet.
```

#### 3. Approve & Execute Implementation
```
Phase B plan confirmed. Proceed to Phase C (Implementation).

Action: Implement Step 1 (title from plan).

Output:
- Code changes (show diffs)
- Explanation of changes
- How this step satisfies SRS/AC
- Ready for Step 2? (I'll say OK or ask for revisions)

Keep changes surgical, focused on this step only.
```

#### 4. Run Tests & QA
```
Phase C complete (all steps done). Proceed to Phase D (Testing).

Action:
1. Generate unit + component + integration tests
2. Run: npm test --testPathPattern="OD_XX"
3. Generate manual QA checklist (5–7 test cases)

Output:
- Test code (file paths + content)
- Test results (passing/failing counts)
- Coverage report
- Manual QA table
```

#### 5. Generate PR & Merge
```
Phase D complete (tests passing). Proceed to Phase E (PR & Review).

Action:
1. Generate PR description (title, summary, SRS mapping, changes, testing, risk)
2. Generate commit message(s) per convention
3. Output: Ready-to-paste PR content

I will then:
- git push -u origin feature/OD-XX-<slug>
- Create PR on GitHub
- Paste your generated PR description
- Tag reviewer
- After merge: delete branch
```

---

## Troubleshooting & Rollback

### If Cursor Proposes Out-of-Scope Changes

**Problem**: Cursor suggests refactoring unrelated code.

**Solution**: Interrupt with:
```
Hold on. This task is out-of-scope for OD-XX.

Constraint: Only implement OD-XX acceptance criteria.
No refactors, no improvements to unrelated modules.

Refocus on: [list the exact AC from Jira]

What's the minimal change to satisfy OD-XX?
```

### If Tests Fail

**Problem**: Tests are failing after Phase C.

**Solution**:
```
Tests are failing. Debug:
1. Show the failing test output
2. Trace the failure to the code
3. Propose a minimal fix (no architecture changes)
4. If unclear, roll back Phase C Step N and redo it

Remember: IMPLEMENTATION_RULES.md has error handling patterns. Did we follow them?
```

### If a Step Takes Too Long

**Problem**: Phase C Step 3 is estimated 30 min but taken 60 min.

**Solution**:
```
Step 3 is taking longer than planned.

Options:
1. Continue (we're close, will be done in 10 min)
2. Break this step into sub-steps and pick it up tomorrow
3. Ask for a code review checkpoint before finishing

What do you prefer?
```

---

## Checklist: End of Ticket Execution

Before marking OD-XX as "Done" in Jira:

- [ ] Phase A: Scope map approved by you
- [ ] Phase B: Design plan approved by you
- [ ] Phase C: All steps implemented & committed
- [ ] Phase D: Tests 100% passing (unit + component + integration)
- [ ] Phase E: PR description complete & ready
- [ ] GitHub PR created with auto-link to Jira OD-XX
- [ ] Reviewer assigned & review complete
- [ ] All PR comments resolved
- [ ] Branch merged to main
- [ ] Jira ticket auto-closed (or manually closed)
- [ ] Feature branch deleted (local + remote)

---

## Summary

This workflow ensures:

✅ **Consistency**: Same phases every ticket  
✅ **Quality**: Tests before review  
✅ **Traceability**: SRS → Code → PR → Jira  
✅ **Speed**: Parallel review + minimal back-and-forth  
✅ **Professionalism**: Clean git history, thorough documentation  

---

**Next**: Start with OD-80. Paste the Jira details + say "Execute Phase A" in Cursor chat.
