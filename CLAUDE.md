# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Fleetify** is a comprehensive ERP system for car rental and fleet management, built for شركة العراف لتأجير السيارات (Al-Araf Car Rental) in Qatar.

- **Company ID**: `24bc0b21-4e2d-4413-9842-31719a3669f4`
- **Currency**: QAR (Qatari Riyal)
- **Business Type**: Car rental and fleet management
- **Deployment**: Vercel (https://www.alaraf.online)

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Library**: shadcn/ui (Radix UI primitives) + Tailwind CSS
- **State Management**: React Query (@tanstack/react-query)
- **Database/Backend**: Supabase (PostgreSQL 17.6)
- **Routing**: React Router v6 with custom route registry
- **Internationalization**: i18next (Arabic/English, RTL support)
- **Charts**: Recharts
- **Mobile**: Capacitor (iOS/Android apps)

## Common Development Commands

### Development
```bash
npm run dev              # Start dev server on port 8080
npm run build:ci        # Production build (matches CI command)
npm run preview         # Preview production build
```

### Testing
```bash
npm run test            # Run unit tests (Vitest)
npm run test:run        # Run tests once
npm run test:coverage   # Coverage report
npm run test:e2e        # Playwright E2E tests
```

### Code Quality
```bash
npm run lint            # ESLint
npm run type-check      # TypeScript check
```

### Database & Scripts
```bash
supabase status         # Check local Supabase status
supabase db push        # Push migrations
supabase db dump        # Dump database schema
```

### Mobile (Capacitor)
```bash
npm run build:mobile    # Build for mobile
npm run mobile:sync     # Sync Capacitor
npm run android:build   # Build Android APK
npm run ios:build       # Build iOS app
```

## Architecture

### Route Registry System
Routes are centrally defined in `src/routes/index.ts` instead of being scattered across components. This reduces complexity and improves maintainability.

**Route Config Structure:**
- `path`: URL path
- `component`: Page component (lazy or regular import)
- `lazy`: Whether component is lazy-loaded
- `protected`: Requires authentication
- `layout`: Layout type (`bento`, `admin`, `none`)
- `requiredRole`: Role-based access (`super_admin`, `admin`)
- `group`: Route group for organization
- `priority`: Loading priority

**Key Route Groups:**
- `public` - No authentication required (landing, auth)
- `dashboard` - Main application dashboard
- `finance` - Financial management
- `customers` - Customer CRM
- `contracts` - Contract management
- `fleet` - Vehicle/fleet management
- `admin` - Super admin routes
- `legal` - Legal/cases tracking

### Context Providers (App.tsx)
The app wraps components in multiple contexts:
- `AuthProvider` - User authentication state
- `CompanyContextProvider` - Current company context
- `FABProvider` - Floating action button state
- `FinanceProvider` - Financial data context
- `MobileOptimizationProvider` - Performance optimization

### Database Schema Critical Points

**Company Multi-Tenancy:**
- Most tables include `company_id` for multi-tenancy
- RLS policies enforce company isolation
- Always filter by `company_id` in queries

**Financial System:**
- `chart_of_accounts` - Hierarchical chart (levels 1-6)
  - Only `is_header = false AND account_level >= 3` can have postings
  - `account_code` is the primary identifier
  - `account_name` (NOT `account_name_en`)
- `journal_entries` - Header table for transactions
- `journal_entry_lines` - Line items
  - Uses `line_description` (NOT `description`)
  - Uses `line_number` for sequencing
  - Each entry must have at least 2 lines (balanced debits/credits)

**Key Tables:**
- `contracts` - Rental contracts (588 records)
- `customers` - Customer records (781 records)
- `vehicles` - Fleet vehicles (510 records)
- `invoices` - Billing documents (1,250 records)
- `payments` - Payment records (6,568 records)

**Important Column Name Corrections:**
- ❌ `description` → ✅ `line_description` (journal_entry_lines)
- ❌ `level` → ✅ `account_level` (chart_of_accounts)
- ❌ `parent_code` → ✅ `parent_account_code`
- ❌ `account_name_en` → ✅ `account_name`
- ❌ `status` → ✅ `payment_status` (payments table)

### Component Structure

**Components are organized by domain:**
- `src/components/{domain}/` - Feature-specific components
- `src/components/common/` - Shared UI components
- `src/components/ui/` - shadcn/ui base components
- `src/pages/` - Page-level components
- `src/pages/{domain}/` - Domain-specific pages

**Key Component Directories:**
- `src/components/contracts/` - Contract management UI
- `src/components/customers/` - Customer components
- `src/components/fleet/` - Vehicle/fleet components
- `src/components/finance/` - Financial components
- `src/components/legal/` - Legal/cases components

### Hooks Organization

Custom hooks are organized in `src/hooks/`:
- `hooks/api/` - API interaction hooks
- `hooks/business/` - Business logic hooks
- `hooks/company/` - Company-related hooks
- `hooks/finance/` - Financial hooks
- `hooks/integrations/` - Integration hooks
- Many domain-specific hooks (contracts, vehicles, customers, etc.)

## Development Guidelines

### Database Operations
**CRITICAL: Never assume schema - always verify!**
1. Check `src/integrations/supabase/types.ts` for actual schema
2. Use `information_schema` to verify table structures
3. Test migrations on staging before production
4. Always write reversible migrations

### React Module Bundling
**To prevent blank page/forwardRef errors:**
- Keep React bundled with vendor dependencies
- Add all Radix UI components to `vite.config.ts` `optimizeDeps.include`
- Test with `npm run build:ci && npm run preview` before deploying
- Verify no forwardRef errors in console

### Build & Deployment
**Package Manager Consistency:**
- This project uses `npm` (check for `package-lock.json`)
- `vercel.json` must use `npm install` (NOT pnpm)
- Build command: `npm run build:ci` (uses `npx vite build`)

**Pre-Deployment Checklist:**
1. `npm run build:ci` succeeds
2. `npm run preview` loads correctly
3. Console shows no React/forwardRef errors
4. All UI components render properly

### UI Consistency
- Use shadcn/ui components from `src/components/ui/`
- Follow existing color scheme and layout patterns
- Maintain RTL (Arabic) support - use `dir="rtl"` where appropriate
- Use existing icons from `lucide-react`

### Code Style
- Use TypeScript for all new code
- Follow existing naming conventions (camelCase for variables, PascalCase for components)
- Add proper error handling with try-catch
- Use React Query for data fetching
- Maintain existing component structure

## Important Notes

### Database-Specific Rules
1. **Always verify schema** - Don't guess column names
2. **Migrations can conflict** - Check timestamps and test thoroughly
3. **Use information_schema** - For checking actual table structures
4. **Test on staging first** - Never apply directly to production

### Token Optimization
- Do NOT create documentation files automatically
- Only create docs when explicitly requested
- Keep responses brief (2-3 lines when possible)

### MCP Usage
- Database operations → Use Supabase MCP
- UI/design work → Use design MCP
- Planning → Use thinking MCP
- Verification → Use browser MCP

## Common Pitfalls

| Issue | Cause | Solution |
|-------|-------|----------|
| `vite: command not found` | Package manager mismatch | Ensure vercel.json uses `npm install` |
| Blank page in production | React module bundling | Keep React in vendor chunk |
| forwardRef undefined | Radix UI chunking | Add to optimizeDeps.include |
| Type errors | Missing DB columns | Verify schema in types.ts |
| RLS policy errors | Missing company_id filter | Always include company_id in queries |

## Testing

- Unit tests: Vitest + @testing-library/react
- E2E tests: Playwright
- Test location: `src/__tests__/`
- Component tests: Co-located with components in `__tests__` directories

## Localization

- Primary language: Arabic (RTL)
- Secondary: English (LTR)
- Use `useTranslation()` hook from `react-i18next`
- Translation files: `src/locales/`
- Always test UI in both directions

## Mobile (Capacitor)

- iOS and Android apps supported
- Build with `npm run build:mobile`
- Capacitor config: `capacitor.config.ts`
- Native features: Camera, Geolocation, etc.
