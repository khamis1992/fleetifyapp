# Task: Critical Security Vulnerabilities Assessment & Remediation

## Objective
Conduct comprehensive security assessment of FleetifyApp and address critical vulnerabilities, particularly XSS attacks and credential exposure risks.

## Acceptance Criteria
- [ ] All user-generated content sanitized before rendering using DOMPurify
- [ ] No hardcoded credentials or API keys in frontend code
- [ ] Centralized environment variable management implemented
- [ ] Security scan passes with 0 critical issues
- [ ] All `dangerouslySetInnerHTML` usage properly secured

## Scope & Impact Radius
Modules/files likely touched:
- `src/utils/htmlSanitizer.ts` - Critical sanitization utility
- `src/components/contracts/ContractHtmlViewer.tsx` - HTML rendering
- `src/components/settings/TemplateManagement.tsx` - Template rendering
- `src/lib/env.ts` - New environment management
- All `.tsx` files rendering dynamic content
- `package.json` - Add DOMPurify dependency

Out-of-scope:
- Backend security (separate assessment needed)
- Network security configurations
- Database security

## Risks & Mitigations
- Risk: XSS attacks through unsanitized HTML content → Mitigation: Implement DOMPurify, audit all HTML rendering
- Risk: API key exposure in frontend code → Mitigation: Environment variable validation, centralized management
- Risk: Break existing functionality with sanitization → Mitigation: Gradual implementation, thorough testing

## Steps
- [ ] Pre-flight: Install DOMPurify and types
- [ ] Audit all components using dangerouslySetInnerHTML
- [ ] Implement enhanced HTML sanitization with DOMPurify
- [ ] Create centralized environment variable management
- [ ] Scan for hardcoded credentials and sensitive data
- [ ] Update all components to use secure sanitization
- [ ] Add security tests for XSS prevention
- [ ] Verify sanitization works correctly with test cases
- [ ] Create security scan scripts
- [ ] Document security best practices

## Review (after implementation)
Summary of changes:
Known limitations:
Follow-ups:

## Critical Findings Summary

### 1. HTML Sanitization Issues - HIGH RISK
**Files Affected:**
- `src/components/contracts/ContractHtmlViewer.tsx` - Line 366-369
- `src/components/settings/TemplateManagement.tsx` - Uses `sanitizeTemplateHtml`
- `src/components/ui/chart.tsx` - Uses `dangerouslySetInnerHTML`

**Current Status:** Basic sanitization implemented but NOT production-ready

### 2. Environment Variable Security - MEDIUM RISK
**Issues Found:**
- Environment variables scattered across components
- No centralized validation
- Potential for missing required variables

**Files Requiring Updates:**
- `src/integrations/supabase/client.ts`
- Multiple components using environment variables

## Security Score: 6/10 (Needs Immediate Attention)