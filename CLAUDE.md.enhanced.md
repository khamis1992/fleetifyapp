# Claude Rules - Enhanced for Streamlined Development

## 🎯 Core Philosophy
**Prime directive:** Improve the system safely, incrementally, and reversibly with minimal back-and-forth.

## 🔧 Enhanced Workflow for Reduced Back & Forth

### 0) Rapid Assessment & Scoping (5 minutes max)
**Before starting any work:**

```bash
# Quick health check
npm run typecheck && npm run lint && npm run test:ci
git status  # Check for uncommitted changes
```

**Decision Tree:**
- ❌ **Build/test fails** → Stop and fix first
- ⚠️ **Major architectural changes** → Use comprehensive planning
- ✅ **Small feature/bug fix** → Streamlined workflow

---

## 1) Streamlined Planning (choose one)

### 1A) Quick Planning Template (for small features < 300 LOC)
```markdown
# Task: <title>

## Quick Plan
- **Goal**: <one-sentence objective>
- **Impact**: <what changes>
- **Files**: <key files to modify>
- **Risks**: <major blockers>

## Validation
- [ ] Build passes locally
- [ ] Core functionality tested
- [ ] No breaking changes
```

### 1B) Comprehensive Planning (for complex features)
```markdown
# Task: <title>

## Detailed Analysis
### Requirements
- **User Story**: <who needs what and why>
- **Acceptance Criteria**:
  - [ ] <measurable outcome 1>
  - [ ] <measurable outcome 2>

### Technical Approach
- **Architecture Impact**: <high-level design>
- **Dependencies**: <external packages needed>
- **Migration Path**: <database changes required>

### Risk Assessment
- **Breaking Changes**: <potential user impact>
- **Performance Impact**: <resource considerations>
- **Rollback Strategy**: <how to revert if needed>
```

---

## 2) Smart Pre-Flight Checks (automated)

### 2.1) Auto-Run Commands (create `scripts/pre-check.sh`)
```bash
#!/bin/bash
# Auto-run pre-flight checks
echo "🔍 Running pre-flight checks..."

# Type checking
echo "📝 TypeScript check..."
npm run typecheck || { echo "❌ TypeCheck failed"; exit 1; }

# Linting
echo "🧹 ESLint check..."
npm run lint || { echo "❌ Lint failed"; exit 1; }

# Unit tests
echo "🧪 Test suite..."
npm run test:ci || { echo "⚠️ Tests failing - proceed with caution"; }

# Build verification
echo "🏗️ Build verification..."
npm run build:ci || { echo "❌ Build failed"; exit 1; }

# Package manager consistency
echo "📦 Package manager check..."
if [ -f "pnpm-lock.yaml" ]; then
  echo "✅ Using pnpm"
elif [ -f "package-lock.json" ]; then
  echo "✅ Using npm"
else
  echo "❌ No lockfile found"
  exit 1
fi

# React bundling check
echo "⚛️ React bundle verification..."
npm run build:ci && npm run preview &
PREVIEW_PID=$!
sleep 3
curl -s http://localhost:3001 > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ React bundling OK"
else
  echo "❌ React bundling failed"
fi
kill $PREVIEW_PID 2>/dev/null

echo "✅ All pre-flight checks passed!"
```

### 2.2) Dependency Management (automated)
```bash
# After adding dependencies
pnpm install && git add pnpm-lock.yaml
```

---

## 3) Implementation with Built-in Quality Gates

### 3.1) Feature Development Flow
```bash
# Create feature branch
git checkout -b feat/<descriptive-name>

# Development with auto-saves
npm run dev

# Periodic validation (every 15 mins)
npm run typecheck && npm run lint
```

### 3.2) Quality Assurance Checklist (add to code review template)
```markdown
## Code Review Checklist

### ✅ Requirements
- [ ] Acceptance criteria clearly defined
- [ ] No hardcoded credentials or secrets
- [ ] Error handling implemented
- [ ] Loading states considered

### ✅ Code Quality
- [ ] TypeScript types properly defined
- [ ] No console.errors in production
- [ ] Performance optimizations considered
- [ ] Accessibility standards met

### ✅ Testing
- [ ] Unit tests cover critical paths
- [ ] Integration tests work correctly
- [ ] Manual testing steps documented
- [ ] Edge cases handled
```

### 3.3) Automated Quality Gates (package.json scripts)
```json
{
  "scripts": {
    "pre-commit": "npm run typecheck && npm run lint && npm run test:ci",
    "pre-push": "npm run build:ci && npm run test:coverage",
    "quality-check": "npm run typecheck && npm run lint && npm run build:ci"
  }
}
```

---

## 4) Streamlined Documentation

### 4.1) Auto-Generated Documentation
**SYSTEM_REFERENCE.md auto-update script:**
```bash
# Auto-update docs after changes
npm run docs:update
```

### 4.2) Living Documentation Standards
```markdown
## Feature Template

### User Story
As a <role>, I want <goal> so that <benefit>.

### Implementation
**Files Modified:**
- `src/components/NewFeature.tsx` - Main component
- `src/hooks/useNewFeature.ts` - Custom hook
- `src/types/newFeature.types.ts` - Type definitions

### Acceptance Criteria
- [ ] <observable criteria 1>
- [ ] <observable criteria 2>

### Testing
```bash
# Unit tests
npm run test:unit -- --grep "NewFeature"

# Integration tests
npm run test:integration -- --path "src/features/NewFeature"

# Manual testing
npm run dev && open http://localhost:3000/new-feature
```
```

---

## 5) Dependency Management Guidelines

### 5.1) Before Adding Dependencies
```bash
# Research alternatives
npm info <package-name>
pnpm why <package-name>

# Check bundle impact
npx bundlephobia <package-name>

# Test in isolation
npm install <package-name> --save-dev && npm run build:ci
```

### 5.2) Package Manager Lockfile Updates
```bash
# After ANY package.json change
pnpm install
git add pnpm-lock.yaml
git commit -m "chore: update dependencies"
```

### 5.3) Common Dependencies Quick Reference
```markdown
## Common Package Patterns

### UI Components
- Forms: `@hookform/resolvers` + `react-hook-form`
- Charts: `recharts` + `d3` (data-heavy)
- Tables: `@tanstack/table` + pagination

### Utility Libraries
- Date handling: `date-fns` (preferred) over `moment`
- HTTP client: `axios` or `fetch` (built-in)
- State management: Use existing patterns in codebase
```

---

## 6) Testing Strategy with Built-in Efficiency

### 6.1) Test Pyramid (automated)
```
🔺 E2E Tests (5%) - Critical user journeys
🧪 Integration Tests (15%) - Component interactions
🔬 Unit Tests (80%) - Business logic
```

### 6.2) Smart Test Selection
```bash
# Run only relevant tests
npm run test:affected --main

# Coverage for new features
npm run test:coverage -- src/components/NewFeature

# Fast feedback loop during development
npm run test:unit -- --watch
```

### 6.3) Test Templates (auto-generated)
```typescript
// Template: NewFeature.test.tsx
describe('NewFeature', () => {
  describe('when user interacts', () => {
    it('should show correct state', () => {
      // Test implementation
    })
  })
})
```

---

## 7) Deployment Prevention Checklist

### 7.1) Pre-Push Verification (5 minutes)
```bash
# Automated deployment prep
npm run quality-check
git status  # Ensure clean working directory
```

### 7.2) Common Deployment Blockers & Solutions
| Issue | Prevention | Quick Fix |
|-------|------------|----------|
| Lockfile mismatch | Auto `pnpm install` | Manual sync |
| Build fails | Pre-push check | Fix locally |
| Import errors | TypeScript check | Fix types |
| Bundle too large | Bundle analyzer | Optimize chunks |

### 7.3) Deployment Safety Net
```bash
# Rollback plan always ready
git log --oneline -5  # Last 5 commits for quick rollback
git tag -a "backup-$(date +%Y%m%d-%H%M%S)"  # Safety tag
```

---

## 8) Communication Protocol

### 8.1) Regular Updates (every 30 mins during work)
```markdown
## Progress Update

**Completed:**
- [x] Component structure designed
- [ ] Core logic implemented
- [ ] Testing in progress

**Next Steps:**
- [ ] Error handling
- [ ] Edge cases
- [ ] Documentation

**Blockers:**
- <any current issues>
```

### 8.2) Escalation Triggers
- ⚠️ **Complexity spike** → Request planning assistance
- 🔴 **Breaking changes** → Immediate review required
- ⚡ **Production impact** → Rollback consideration
- ❓ **Unclear requirements** → Clarification needed

### 8.3) Decision Points Framework
```markdown
## Decision: <clear choice>

**Options:**
1. **Option A**: <description with pros/cons>
2. **Option B**: <description with pros/cons>
3. **Option C**: <description with pros/cons>

**Recommendation:** <rationale>
**Timeline:** <implementation estimate>
**Rollback:** <if Option A fails>
```

---

## 9) Code Review Process

### 9.1) Review Categories (assign based on change type)
```markdown
## Review Type Matrix

| Change Type | Primary Reviewer | Secondary Reviewer |
|-------------|------------------|----------------|
| Backend API | backend-architect | code-reviewer |
| Frontend Component | frontend-developer | typescript-pro |
| Database Schema | database-architect | supabase-schema-architect |
| Security Changes | penetration-tester | code-reviewer |
| Performance | code-reviewer | typescript-pro |
| Architecture | architect-reviewer | relevant domain expert |
```

### 9.2) Review Focus Areas
```markdown
## Code Review Focus

### Security Review (Critical)
- [ ] Input validation
- [ ] Authentication/Authorization
- [ ] Data exposure risks
- [ ] Dependency vulnerabilities

### Performance Review
- [ ] Bundle size impact
- [ ] Memory usage
- [ ] Database query efficiency
- [ ] Rendering performance

### Maintainability Review
- [ ] Code readability
- [ ] Test coverage
- [ ] Documentation quality
- [ ] Adherence to patterns
```

### 9.3) Auto-Review Tools
```json
{
  "scripts": {
    "review:security": "npm audit && npm run test:security",
    "review:performance": "npm run build:analyze && npm run test:performance",
    "review:types": "npm run type-check:strict"
  }
}
```

---

## 10) Continuous Improvement

### 10.1) Retrospective Template
```markdown
## Feature Retrospective

### What Went Well
- <success factor 1>
- <success factor 2>

### Challenges Faced
- <challenge 1> → <resolution>
- <challenge 2> → <resolution>

### Lessons Learned
- <key takeaway 1>
- <key takeaway 2>

### Process Improvements
- <process change 1>
- <process change 2>
```

### 10.2) Metric Tracking
```bash
# Development metrics
npm run metrics:coverage
npm run metrics:performance
npm run metrics:complexity
```

### 10.3) Pattern Library Updates
```bash
# Update common patterns
npm run patterns:update
npm run components:sync
```

---

## 🚀 Quick Start Summary

### For Small Features (1-2 hours)
```bash
npm run pre-check
git checkout -b feat/<feature-name>
# Develop
npm run quality-check && git push
```

### For Medium Features (1-3 days)
```bash
npm run pre-check
git checkout -b feat/<feature-name>
# Use comprehensive planning template
# Develop with regular checkpoints
npm run quality-check && git push
```

### For Large Features (3+ days)
```bash
npm run pre-check
git checkout -b feat/<feature-name>
# Use comprehensive planning + risk assessment
# Incremental development with regular demos
# Full testing and documentation
npm run quality-check && git push
```

This enhanced CLAUDE.md reduces back-and-forth by:
- **Streamlined planning** with decision trees
- **Automated quality gates** to catch issues early
- **Template-based documentation** for consistency
- **Clear escalation triggers** for getting help
- **Comprehensive testing strategy** with smart selection
- **Built-in deployment prevention** and safety nets
- **Continuous improvement framework** for learning

The key is **clarity at the start** and **automation throughout** to minimize uncertainty and back-and-forth communication.