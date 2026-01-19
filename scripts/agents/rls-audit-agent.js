#!/usr/bin/env node
/**
 * RLS & Architecture Audit Agent
 * Checks Supabase tables for proper RLS configuration
 */

const https = require('https');
const url = require('url');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function supabaseQuery(sql) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`);
    
    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify({ query: sql }));
    req.end();
  });
}

async function runAudit() {
  const report = {
    timestamp: new Date().toISOString(),
    tablesWithoutRls: [],
    missingPolicies: [],
    securityDefinerIssues: [],
    crossTenantRisks: [],
    recommendations: []
  };

  try {
    // Check tables without RLS
    const tablesWithoutRls = await supabaseQuery(`
      SELECT 
        schemaname, 
        tablename,
        rowsecurity
      FROM pg_tables 
      WHERE schemaname = 'public'
        AND rowsecurity = false
        AND tablename NOT LIKE 'pg_%'
        AND tablename NOT LIKE '_prisma%'
    `);

    if (Array.isArray(tablesWithoutRls)) {
      report.tablesWithoutRls = tablesWithoutRls.map(t => ({
        schema: t.schemaname,
        table: t.tablename,
        severity: 'high',
        recommendation: `Enable RLS: ALTER TABLE ${t.tablename} ENABLE ROW LEVEL SECURITY;`
      }));
    }

    // Check tables missing company_id/org_id column (multi-tenant requirement)
    const tablesWithoutTenantId = await supabaseQuery(`
      SELECT table_name
      FROM information_schema.tables t
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN (
          SELECT table_name 
          FROM information_schema.columns 
          WHERE column_name IN ('company_id', 'org_id', 'organization_id')
            AND table_schema = 'public'
        )
        AND table_name NOT LIKE '%_audit'
        AND table_name NOT LIKE 'cto_%'
        AND table_name NOT IN ('schema_migrations', 'spatial_ref_sys')
    `);

    if (Array.isArray(tablesWithoutTenantId)) {
      tablesWithoutTenantId.forEach(t => {
        report.crossTenantRisks.push({
          table: t.table_name,
          issue: 'Missing tenant isolation column (company_id)',
          severity: 'critical',
          recommendation: `Add company_id: ALTER TABLE ${t.table_name} ADD COLUMN company_id UUID REFERENCES companies(id);`
        });
      });
    }

    // Check for dangerous RLS policies using 'true'
    const dangerousPolicies = await supabaseQuery(`
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual
      FROM pg_policies
      WHERE schemaname = 'public'
        AND (
          qual::text = 'true' 
          OR qual::text LIKE '%true%'
        )
        AND roles::text NOT LIKE '%service_role%'
    `);

    if (Array.isArray(dangerousPolicies)) {
      dangerousPolicies.forEach(p => {
        report.crossTenantRisks.push({
          table: p.tablename,
          policy: p.policyname,
          issue: 'RLS policy allows unrestricted access (uses true)',
          severity: 'critical',
          cmd: p.cmd
        });
      });
    }

    // Check SECURITY DEFINER functions
    const securityDefinerFuncs = await supabaseQuery(`
      SELECT 
        routine_name,
        routine_schema,
        security_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND security_type = 'DEFINER'
    `);

    if (Array.isArray(securityDefinerFuncs)) {
      report.securityDefinerIssues = securityDefinerFuncs.map(f => ({
        function: f.routine_name,
        schema: f.routine_schema,
        issue: 'Function uses SECURITY DEFINER - verify this is intentional',
        severity: 'warning'
      }));
    }

    // Check for missing SELECT/INSERT/UPDATE/DELETE policies
    const tablesWithPolicies = await supabaseQuery(`
      SELECT 
        t.tablename,
        array_agg(DISTINCT p.cmd) as policy_commands
      FROM pg_tables t
      LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
      WHERE t.schemaname = 'public'
        AND t.rowsecurity = true
      GROUP BY t.tablename
    `);

    if (Array.isArray(tablesWithPolicies)) {
      const requiredCmds = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];
      tablesWithPolicies.forEach(t => {
        const existingCmds = t.policy_commands || [];
        const missingCmds = requiredCmds.filter(cmd => !existingCmds.includes(cmd));
        
        if (missingCmds.length > 0) {
          report.missingPolicies.push({
            table: t.tablename,
            missing: missingCmds,
            severity: 'medium'
          });
        }
      });
    }

    // Generate recommendations
    if (report.tablesWithoutRls.length > 0) {
      report.recommendations.push({
        priority: 'high',
        action: `Enable RLS on ${report.tablesWithoutRls.length} tables`
      });
    }

    if (report.crossTenantRisks.length > 0) {
      report.recommendations.push({
        priority: 'critical',
        action: 'Fix cross-tenant data access risks immediately'
      });
    }

  } catch (error) {
    report.error = error.message;
  }

  console.log(JSON.stringify(report, null, 2));
  return report;
}

runAudit().catch(console.error);

