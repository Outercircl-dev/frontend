# .cursor/rules.md

## 🚀 OuterCircl Development: Cursor Execution Rules

This file defines how Cursor should behave when executing Jira tickets for OuterCircl FFP development.

**IMPORTANT**: Place this file in `.cursor/rules.md` at your repo root. Cursor reads it automatically.

---

## Core Execution Command

### "Execute ticket OD-XX" Pattern

**When user says**: `Execute ticket OD-80 [+ Jira details]`

**Cursor MUST**:

1. ✅ **Parse ticket ID** (e.g., OD-80)
2. ✅ **Check current Git branch** (`git branch` to verify on `feature/OD-XX-*`)
3. ✅ **Load workflow documents**:
   - `/CURSOR_WORKFLOW.md` (phases A-E)
   - `/IMPLEMENTATION_RULES.md` (code standards)
   - `/docs/Software_Requirements_Specification.pdf` (SRS requirements)
4. ✅ **Execute Phase A → B → C → D → E** (sequentially, asking user confirmation between phases)
5. ✅ **Reference IMPLEMENTATION_RULES.md** for all code patterns, naming, architecture
6. ✅ **Track acceptance criteria** mapping in PHASE B output
7. ✅ **Generate PR description** in PHASE E with SRS traceability

---

## Architecture & Code Style Rules

### Rule 1: Naming Conventions (from IMPLEMENTATION_RULES.md Section 2)

✅ **ALWAYS follow**:
- Files: `camelCase` for services/utils, `PascalCase` for components
- Folders: `kebab-case` (`/user-profile`, `/onboarding`)
- Functions: `camelCase` (`fetchUserProfile()`, `validateEmail()`)
- Constants: `UPPER_SNAKE_CASE` (`MAX_ACTIVITY_SIZE`, `API_BASE_URL`)
- Database tables: `snake_case`, plural (`users`, `activities`, `notifications`)
- Database columns: `snake_case` (`user_id`, `created_at`, `is_verified`)
- API endpoints: `/v1/[resource]` or `/v1/[resource]/:id` (always versioned)
- Branches: `feature/OD-XX-<slug>` (lowercase, kebab-case)
- Commits: `OD-XX: <verb> <object>` (e.g., `OD-80: implement user profile setup`)

❌ **NEVER use**:
- Branches like: `OD-80`, `feature/onboarding`, `OD80` (must match `feature/OD-XX-*`)
- camelCase for folders
- PascalCase for utilities
- Inconsistent naming across similar files

**Action**: Before proposing code, verify naming matches this table.

### Rule 2: React Component Pattern (from IMPLEMENTATION_RULES.md Section 3)

✅ **ALWAYS**:
```typescript
// Functional component with explicit props interface
interface ComponentNameProps {
  prop1: Type;
  optional?: string;
}

export const ComponentName: React.FC<ComponentNameProps> = ({ prop1, optional = 'default' }) => {
  return <div>JSX here</div>;
};
```

❌ **NEVER**:
```typescript
// Class components, implicit any types, or default exports
export default function ComponentName(props: any) { ... }
```

### Rule 3: Service Layer Pattern (from IMPLEMENTATION_RULES.md Section 3)

Backend services MUST follow this structure:

```typescript
// ✓ Correct
export class AuthService {
  private userRepository = new UserRepository();
  
  async register(email: string, password: string): Promise<User> {
    // Business logic here
    // Use repository for data access
  }
}

// ✓ Use repository pattern for DB queries
export class UserRepository {
  async findById(id: string): Promise<User | null> { ... }
  async create(data: Partial<User>): Promise<User> { ... }
}
```

**Action**: Any backend logic must use: Controller → Service → Repository pattern.

### Rule 4: Type Safety

✅ **ALWAYS**:
- Define explicit interfaces for all objects (no `any`)
- Use strict TypeScript config (in tsconfig.json)
- Type function parameters and returns
- Use union types instead of string literals: `type Status = 'active' | 'inactive'`

❌ **NEVER**:
- Use `any` type
- Skip type annotations on function params
- Store untyped data from API responses

**Before writing code**: Ask yourself "Is every variable and function typed?"

### Rule 5: Database Migrations

✅ **ALWAYS**:
- File naming: `/db/migrations/NNN_OD_XX_description.sql`
- Example: `db/migrations/042_OD_80_user_profiles.sql`
- Include explicit column constraints and indexes
- Add timestamps: `created_at`, `updated_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- Use UUID primary keys: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- Foreign keys: `user_id UUID REFERENCES users(id) ON DELETE CASCADE`

❌ **NEVER**:
- Non-sequential migration numbers
- Missing timestamp columns
- Integer IDs (use UUID)
- Missing indexes on foreign keys

**Before creating DB: Review IMPLEMENTATION_RULES.md Section 4 (Database).**

---

## Workflow Phases (Reference CURSOR_WORKFLOW.md)

### Phase A: Scope & Impact (15–20 min)

**Output**:
- SRS requirements touched (F1–F10)
- Affected modules/files
- Impact table: [SRS Req] → [Files] → [Risk Level]
- Ask for user confirmation

**Stop here. Do NOT code. Wait for user "OK".**

### Phase B: Design Plan (20–30 min)

**Output**:
- 5–7 implementation steps (numbered)
- Acceptance criteria mapping table: [AC from Jira] → [Implementation Step]
- File paths and functions you'll modify
- Effort estimate per step

**Stop here. Do NOT code. Wait for user confirmation.**

### Phase C: Implementation (30–60 min)

**For each step**:
- Show what you'll change (diffs/snippets)
- Explain SRS/AC fulfillment
- Keep changes surgical (focused on step only)
- Pause after each step; wait for "OK" before next step

**Commits after each major step**:
- `OD-80: implement db schema for user profiles`
- `OD-80: build profile service & endpoints`
- `OD-80: create frontend form component`

### Phase D: Testing (15–20 min)

**Output**:
- Unit tests (Services: Jest)
- Component tests (React Testing Library)
- Integration tests (API endpoints)
- Manual QA checklist (5–7 test cases)

**Verify**: `npm test -- --testPathPattern="OD_80"` passes 100%

### Phase E: PR & Review (10–15 min)

**Output**:
- PR title: `[OD-80] Short description`
- PR body:
  - Summary (2–3 sentences)
  - SRS traceability (which F* requirements)
  - Changes (bullet list of files)
  - Testing (coverage + manual QA)
  - Risk assessment (Low/Medium/High + mitigation)
- Commit message(s) per convention

**User will**: Create PR on GitHub, request review, merge after approval.

---

## Code Quality Checklist (Before Each Commit)

✅ **Before proposing code**:
- [ ] Naming follows IMPLEMENTATION_RULES.md Section 2
- [ ] Code style matches IMPLEMENTATION_RULES.md Section 3
- [ ] No `console.log()` statements (use logger)
- [ ] No `any` types (explicit TypeScript)
- [ ] Error handling implemented (try-catch, custom errors)
- [ ] Database migrations numbered correctly
- [ ] No breaking changes to existing APIs
- [ ] Tests written alongside code
- [ ] All tests passing locally

✅ **Before committing**:
- [ ] `npm test` passes (if tests exist)
- [ ] `npm run lint` passes (if linter exists)
- [ ] `npm run build` succeeds (or `tsc --noEmit`)
- [ ] Commit message format: `OD-XX: <verb> <object>`
- [ ] No `.env` file in commit (only `.env.example`)
- [ ] No node_modules/ in commit

---

## SRS Traceability (Critical)

For every feature you implement, **MUST map to SRS** (Section 3 in SRS document).

### Functional Requirements to Code:

| SRS Requirement | User Flow | What to Build |
|-----------------|-----------|---------------|
| **F1** User Registration & Auth | Sign up, login | /src/api/auth, JWT tokens |
| **F2** Personalized Datafeed | Browse activities | /src/services/datafeed |
| **F3** Activity Participation | Join activity | /src/api/activities, endpoints |
| **F4** Activity Hosting | Create activity | Host role, permissions |
| **F5** Group Communication | In-app messaging | WebSocket or polling |
| **F6** Post-Activity Feedback | Leave rating | Rating system, trust metrics |
| **F7** User Profile & Preferences | Update interests | /src/pages/profile, forms |
| **F8** Moderation & Safety | Admin tools | Admin dashboard, reports |
| **F9** Notifications | Alerts | Email/push/in-app |
| **F10** Membership & Subscriptions | Premium tier | Subscription logic, features |

**Action in PHASE B**: Create mapping table showing which SRS items OD-XX touches.

---

## Common Mistakes to Avoid

### Mistake 1: Out-of-Scope Changes

❌ **Wrong**: "OD-80 is about profiles, so I'll refactor the entire Auth service"

✅ **Right**: "OD-80 only touches profile setup. No refactors unless blocking."

**Fix**: When tempted, ask: "Does this directly fulfill OD-80 acceptance criteria?" If NO, skip it.

### Mistake 2: Mixing Tickets on One Branch

❌ **Wrong**: Branch `feature/OD-80-and-OD-81-together`

✅ **Right**: Separate branches: `feature/OD-80-onboarding`, `feature/OD-81-discovery`

**Fix**: One Jira issue = One branch. ALWAYS.

### Mistake 3: Breaking Existing APIs

❌ **Wrong**: Change `/v1/users/:id` response shape without migration

✅ **Right**: Add new endpoint `/v1/users/:id/profile` or version the change

**Fix**: Before modifying existing endpoints, check SRS and existing usages.

### Mistake 4: Skipping Tests

❌ **Wrong**: "I'll add tests later"

✅ **Right**: Write tests alongside code in Phase C

**Fix**: Generate tests BEFORE proposing code. Show test failures first, then implementation.

### Mistake 5: No SRS Mapping

❌ **Wrong**: Implement feature without saying which SRS requirement (F1–F10) it satisfies

✅ **Right**: PR description says: "Fulfills F7 (User Profile), F2 (Datafeed Learning)"

**Fix**: Every PR must have SRS traceability table.

---

## Command Examples

### Start a Ticket

```
Execute ticket OD-80

Title: Implement User Profile Setup Flow
Description: Allow users to configure interests, hobbies, and upload profile pictures during onboarding
Acceptance Criteria:
- Users can select 3+ interests from a curated list
- Users can add hobbies (free-text)
- Users can upload a profile picture
- Profile data persists after logout
- Profile data feeds the recommendation engine
Subtasks:
- OD-80.1: Create user_profiles DB table
- OD-80.2: Implement profile endpoints (POST, PATCH, GET)
- OD-80.3: Build ProfileSetupForm component
- OD-80.4: Add integration tests
- OD-80.5: Wire profile data to datafeed service
```

### Approve & Move Forward

```
Phase A confirmed. Approved. Proceed to Phase B.
```

### During Implementation

```
Phase C Step 2 looks good. Continue to Step 3.
```

### Fix an Issue

```
Tests are failing. Debug the issue and show me the fix.
Remember: IMPLEMENTATION_RULES.md error handling pattern in Section 6.
```

### Rollback

```
That change is out of scope for OD-80. Revert to the approved Phase B plan.
What's the minimal change to satisfy OD-80 AC?
```

---

## Integration with GitHub/Jira

### Branch Naming (for auto-linking)

- ✅ Cursor creates: `feature/OD-80-onboarding-flow`
- ✅ GitHub auto-links: Jira sees branch in ticket
- ✅ Commit messages include: `OD-80: ...`
- ✅ PR title includes: `[OD-80] ...`

### Commit Discipline

After each logical step in Phase C:

```bash
git add .
git commit -m "OD-80: implement user_profiles table schema"
git push
```

**NOT**: One mega-commit at end. Multiple focused commits.

### PR Auto-Linking

When you create a PR:

```
Title: [OD-80] Implement User Profile Setup Flow

Body:
Closes OD-80

## Summary
Added profile setup functionality...
```

→ GitHub auto-links to Jira OD-80 ✓

---

## Context Management (Inside Cursor)

### What to Pin (Use Cursor's "Add as context")

- ✅ Pin: `IMPLEMENTATION_RULES.md`
- ✅ Pin: `CURSOR_WORKFLOW.md`
- ✅ Pin: `/docs/SRS.pdf` (or summary)
- ✅ Pin: Relevant backend/frontend modules (e.g., `/src/services`, `/src/pages`)

### What NOT to Bloat

- ❌ Don't pin: `node_modules/` (irrelevant for code gen)
- ❌ Don't pin: Entire repo (too large; select specific files)
- ❌ Don't pin: Old merged branches

### How to Reduce Hallucinations

1. **Be specific**: "Check the pattern in /src/services/auth.service.ts"
2. **Reference rules**: "Per IMPLEMENTATION_RULES.md Section 3, services must use Repository pattern"
3. **Correct immediately**: "That's out of scope for OD-80. Focus on [AC from Jira]"
4. **Ask Cursor to reference**: "Before coding, show me the existing pattern you'll follow"

---

## Approval Gates (What Blocks Merge)

A PR for OD-XX can only merge if:

- ✅ Branch follows convention: `feature/OD-XX-*`
- ✅ Code follows IMPLEMENTATION_RULES.md (naming, patterns, style)
- ✅ Tests passing: `npm test` (100% for OD-XX affected code)
- ✅ Linting passing: `npm run lint`
- ✅ Build succeeding: `npm run build`
- ✅ PR description complete (SRS mapping, changes, testing, risk)
- ✅ No unrelated refactors
- ✅ 1+ approved code review
- ✅ Jira AC all checked (manually verify in PR description)
- ✅ No breaking changes to existing APIs (unless SRS-driven)

---

## Quick Troubleshooting

### Cursor proposes massive refactor

**Problem**: Cursor wants to rewrite entire auth system for OD-80

**Solution**: 
```
Hold on. OD-80 acceptance criteria doesn't require that.
Constraint: Only implement OD-80 AC. No refactors.
What's the minimal, surgical change to satisfy OD-80?
```

### Tests fail after Phase C

**Problem**: Tests failing, Phase D blocked

**Solution**:
```
Show me the test error. Then trace to the code bug.
Minimal fix only. IMPLEMENTATION_RULES.md Section 9 has test patterns.
After fix, show passing test results before proceeding.
```

### Cursor forgets SRS requirements

**Problem**: Cursor implements feature but doesn't map to SRS F1–F10

**Solution**:
```
Before finalizing Phase B, show me the SRS traceability table.
Which F* requirements does OD-80 touch?
Include this in the PR description (Phase E).
```

### Branch not linking to Jira

**Problem**: Created `feature/OD-80-*` but Jira doesn't see it

**Solution**:
1. Wait 30–60 seconds (auto-linking can be slow)
2. Ensure branch exists: `git push -u origin feature/OD-80-*`
3. In Jira, manually link: "Link issue" → "GitHub Branch"
4. Verify GitHub app has permissions

---

## Final Checklist: Before Saying "Execute ticket OD-XX"

In Cursor chat, ensure:

- [ ] You're on branch: `feature/OD-XX-*` (run `git branch` to verify)
- [ ] Jira ticket copied exactly (title, description, AC, subtasks)
- [ ] CURSOR_WORKFLOW.md is visible/pinned in context
- [ ] IMPLEMENTATION_RULES.md is visible/pinned in context
- [ ] SRS PDF is accessible (pinned or mentioned)
- [ ] You've read the SRS section for relevant functional requirements
- [ ] You understand the AC (acceptance criteria)
- [ ] Ready to review Phase A scope map (takes 5 min)

**Then**: Paste "Execute ticket OD-80" + details.

---

## Summary

✅ This `.cursor/rules.md` ensures:

1. **Consistency**: Same rules for every ticket
2. **Quality**: Code follows IMPLEMENTATION_RULES.md standards
3. **Traceability**: SRS → Jira → GitHub → Cursor → Code
4. **Speed**: Phase A-E workflow minimizes back-and-forth
5. **Professionalism**: Clean commits, thorough PRs, proper versioning

**Reference this file in every Cursor execution.**

---

**Last Updated**: December 4, 2025  
**For**: OuterCircl FFP Project  
**By**: Development Team
