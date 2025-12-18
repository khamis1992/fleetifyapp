# Phase 1: Critical Infrastructure Fixes - Detailed Task List

## Immediate Action Required - Week 1

### Task 1: Fix Dependency Management Issues
**Deadline**: Day 1-2
**Priority**: CRITICAL
**Impact**: Prevents deployment failures

#### Subtask 1.1: Generate package-lock.json
```bash
# Commands to execute:
cd C:\Users\khamis\Desktop\fleetifyapp
npm install
```

**Verification Steps**:
- [ ] `package-lock.json` exists in project root
- [ ] `npm ci` works in fresh directory
- [ ] All dependencies install without errors

#### Subtask 1.2: Fix Node.js Version Mismatch
**Files to modify**:
- `.github/workflows/deploy.yml`
- `.github/workflows/quality-checks.yml`

**Changes needed**:
```yaml
# Change from:
node-version: '18'
# To:
node-version: '20'
```

**Verification Steps**:
- [ ] Both workflow files updated
- [ ] Node version matches package.json engines field
- [ ] CI/CD runs successfully with Node 20

#### Subtask 1.3: Remove legacy-peer-deps Flag
**Files to modify**:
- `vercel.json`
- `package.json` (scripts section)

**Changes needed**:
```json
// vercel.json - Remove from installCommand
"installCommand": "npm install --legacy-peer-deps --production=false"
// Becomes:
"installCommand": "npm install --production=false"

// package.json - Update any scripts using the flag
```

**Verification Steps**:
- [ ] All references to --legacy-peer-deps removed
- [ ] npm install works without the flag
- [ ] No peer dependency warnings/errors

### Task 2: Harden Build System
**Deadline**: Day 3-4
**Priority**: HIGH
**Impact**: Improves build performance and reliability

#### Subtask 2.1: Add Compression Plugin
**File to modify**: `vite.config.ts`

**Installation**:
```bash
npm install --save-dev vite-plugin-compression
```

**Configuration to add**:
```typescript
import { defineConfig } from 'vite';
import compression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    compression({
      algorithm: 'gzip',
      ext: '.gz',
    }),
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
    }),
  ],
  // ... rest of config
});
```

**Verification Steps**:
- [ ] Plugin installed successfully
- [ ] Build generates .gz and .br files
- [ ] Compression headers present in deployment

#### Subtask 2.2: Implement Bundle Size Limits
**File to modify**: `vite.config.ts`

**Changes needed**:
```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: (id) => {
        // Existing chunking logic...
      },
      // Add size limits
      chunkFileNames: (chunkInfo) => {
        const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
        return `js/[name]-${facadeModuleId}-[hash].js`;
      }
    }
  },
  // Add build analyzer
  minify: 'terser',
  sourcemap: false,
  // Set chunk size limit (500KB instead of 1500KB)
  chunkSizeWarningLimit: 500
}
```

**Verification Steps**:
- [ ] Build shows warnings for chunks >500KB
- [ ] Bundle analyzer runs with build command
- [ ] CI/CD fails if bundles exceed limits

#### Subtask 2.3: Configure Differential Loading
**File to modify**: `vite.config.ts`

**Changes needed**:
```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: ['es2015', 'chrome58'],
    polyfillDynamicImport: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Create separate chunks for modern vs legacy
          if (id.includes('node_modules')) {
            if (id.includes('core-js')) {
              return 'polyfills';
            }
            return 'vendor';
          }
        }
      }
    }
  }
});
```

**Verification Steps**:
- [ ] Modern browsers get ES modules
- [ ] Legacy browsers get polyfilled code
- - [ ] Build produces both modern and legacy bundles

### Task 3: Fix Security Vulnerabilities
**Deadline**: Day 5-7
**Priority**: CRITICAL
**Impact**: Prevents SQL injection and data breaches

#### Subtask 3.1: Fix SQL Injection in Python Scripts
**Files to audit and fix**:
- All `.py` files in project
- Pay special attention to scripts directory

**Example Fix**:
```python
# BEFORE (Vulnerable):
query = f"SELECT * FROM users WHERE id = {user_id}"

# AFTER (Secure):
query = "SELECT * FROM users WHERE id = %s"
cursor.execute(query, (user_id,))
```

**Verification Steps**:
- [ ] All SQL queries use parameterized statements
- [ ] No string concatenation for SQL
- [ ] All scripts pass security scan
- [ ] Unit tests verify safe queries

#### Subtask 3.2: Implement CSRF Protection
**Files to create/modify**:
- `src/lib/csrf.ts` - CSRF token utilities
- Middleware files for API routes

**Implementation steps**:
1. Create CSRF token generation/verification
2. Add CSRF middleware to API routes
3. Include CSRF token in all forms
4. Verify token on POST/PUT/DELETE requests

**Verification Steps**:
- [ ] CSRF middleware implemented
- [ ] All forms include CSRF token
- [ ] Server validates CSRF tokens
- [ ] CSRF protection blocks invalid requests

#### Subtask 3.3: Add API Request Signing
**File to create**: `src/lib/request-signing.ts`

**Implementation**:
```typescript
import crypto from 'crypto';

export class RequestSigner {
  private secret: string;

  constructor(secret: string) {
    this.secret = secret;
  }

  sign(request: { method: string; path: string; body?: any }): string {
    const payload = `${request.method}:${request.path}:${JSON.stringify(request.body || {})}`;
    return crypto.createHmac('sha256', this.secret).update(payload).digest('hex');
  }

  verify(request: { method: string; path: string; body?: any; signature: string }): boolean {
    const expectedSignature = this.sign({
      method: request.method,
      path: request.path,
      body: request.body
    });
    return crypto.timingSafeEqual(Buffer.from(request.signature), Buffer.from(expectedSignature));
  }
}
```

**Verification Steps**:
- [ ] Request signing utility created
- [ ] Sensitive endpoints require signature
- [ ] Signature verification works
- [ ] API rejects unsigned requests for sensitive ops

#### Subtask 3.4: Implement Audit Logging
**File to create**: `src/lib/audit-logger.ts`

**Implementation requirements**:
- Log all data modifications (CREATE, UPDATE, DELETE)
- Log authentication events (login, logout, failed attempts)
- Log permission changes
- Log admin actions
- Include user ID, timestamp, action, and affected resource

**Verification Steps**:
- [ ] Audit logger captures all required events
- [ ] Logs are stored securely
- [ ] Log rotation is configured
- [ ] Audit trail is tamper-evident

## Weekly Progress Tracking

### Day 1 Checklist
- [ ] npm install executed
- [ ] package-lock.json generated and committed
- [ ] Team notified of dependency changes

### Day 2 Checklist
- [ ] CI/CD workflows updated for Node 20
- [ ] Test run of CI/CD with new Node version
- [ ] legacy-peer-deps flag removed

### Day 3 Checklist
- [ ] Compression plugin installed
- [ ] Build tested with compression
- [ ] Bundle size limits configured

### Day 4 Checklist
- [ ] Differential loading implemented
- [ ] Modern/legacy builds tested
- [ ] Browser compatibility verified

### Day 5 Checklist
- [ ] Python scripts audited for SQL injection
- [ ] All vulnerabilities fixed
- [ ] Security scan passes

### Day 6 Checklist
- [ ] CSRF protection implemented
- [ ] All forms updated with tokens
- [ ] CSRF middleware tested

### Day 7 Checklist
- [ ] Request signing implemented
- [ ] Audit logging created
- [ ] All Phase 1 tasks completed
- [ ] Documentation updated

## Rollback Plan

If any task causes issues:
1. **Dependency changes**: Revert to previous commit
2. **Build changes**: Remove new plugins/config
3. **Security changes**: Keep fixes but adjust implementation
4. **Critical errors**: Immediately rollback and investigate

## Success Metrics

- [ ] Zero deployment failures due to dependencies
- [ ] Build time reduced by 20%
- [ ] Zero critical security vulnerabilities
- [ ] All security headers passing tests
- [ ] Bundle size reduction of 15%

## Next Steps Preparation

After completing Phase 1:
1. Review performance baseline
2. Set up monitoring for Phase 2 metrics
3. Prepare development branch for Phase 2
4. Schedule code reviews for Phase 2 tasks

---

**Important**: Document any deviations from this plan and reasons for changes.
**Contact**: Review blockers daily with the team.