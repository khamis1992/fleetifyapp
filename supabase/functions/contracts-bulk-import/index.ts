import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function normalize(s?: string) {
  return (s || '').toString().trim().toLowerCase().replace(/\s+/g, ' ')
}

function isUUID(s?: string) {
  return !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
}

function isCancelledDescription(desc?: string) {
  const t = (desc || '').toString().toLowerCase()
  const keywords = ['cancelled', 'canceled', 'cancel', 'ملغي', 'ملغى']
  return keywords.some(k => t.includes(k))
}

function normalizeContractType(t?: string) {
  const v = normalize(t)
  const map: Record<string, string> = {
    'rental': 'rental',
    'daily': 'daily_rental',
    'daily_rental': 'daily_rental',
    'weekly': 'weekly_rental',
    'weekly_rental': 'weekly_rental',
    'monthly': 'monthly_rental',
    'monthly_rental': 'monthly_rental',
    'yearly': 'yearly_rental',
    'yearly_rental': 'yearly_rental',
    'rent_to_own': 'rent_to_own',
    'ايجار': 'rental',
    'شهري': 'monthly_rental',
    'سنوي': 'yearly_rental',
  }
  return map[v] || (v || 'rental')
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !serviceKey) {
      return new Response(JSON.stringify({ error: 'Missing service configuration' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    const supabase = createClient(url, serviceKey)

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    const body = await req.json()
    const companyId: string | undefined = body?.companyId
    const rows: any[] = Array.isArray(body?.rows) ? body.rows : []
    const dryRun: boolean = Boolean(body?.dryRun)
    const upsertDuplicates: boolean = Boolean(body?.upsertDuplicates)

    if (!companyId) {
      return new Response(JSON.stringify({ error: 'companyId is required' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }
    if (!rows.length) {
      return new Response(JSON.stringify({ error: 'rows must be a non-empty array' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    const results = { total: rows.length, successful: 0, failed: 0, errors: [] as Array<{ row: number; message: string }> }

    // Build list of contract_numbers to detect duplicates quickly
    const numbers = rows.map((r, i) => (r.contract_number ? String(r.contract_number) : `CON-${Date.now()}-${i + 1}`))
    const { data: existing, error: existingErr } = await supabase
      .from('contracts')
      .select('id, contract_number')
      .eq('company_id', companyId)
      .in('contract_number', numbers)
    if (existingErr) {
      return new Response(JSON.stringify({ error: `Failed to check duplicates: ${existingErr.message}` }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }
    const dupMap = new Map<string, string>()
    ;(existing || []).forEach((r: any) => dupMap.set(String(r.contract_number), r.id))

    // Preload cost centers for mapping by code/name
    const { data: centers, error: centersErr } = await supabase
      .from('cost_centers')
      .select('id, center_code, center_name')
      .eq('company_id', companyId)
      .eq('is_active', true)
    if (centersErr) {
      return new Response(JSON.stringify({ error: `Failed to load cost centers: ${centersErr.message}` }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }
    const byCode = new Map<string, string>()
    const byName = new Map<string, string>()
    ;(centers || []).forEach((c: any) => {
      if (c.center_code) byCode.set(normalize(c.center_code), c.id)
      if (c.center_name) byName.set(normalize(c.center_name), c.id)
    })

    // Process rows one by one (clear error reporting)
    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i] || {}
      const rowIndex = raw.rowNumber || i + 2
      try {
        const contract_number = raw.contract_number ? String(raw.contract_number) : numbers[i]
        // Resolve cost center
        let resolvedCostCenterId: string | null = raw.cost_center_id && isUUID(String(raw.cost_center_id)) ? String(raw.cost_center_id) : null
        if (!resolvedCostCenterId && raw.cost_center_code) {
          const ccId = byCode.get(normalize(String(raw.cost_center_code)))
          if (ccId) resolvedCostCenterId = ccId
        }
        if (!resolvedCostCenterId && raw.cost_center_name) {
          const ccId = byName.get(normalize(String(raw.cost_center_name)))
          if (ccId) resolvedCostCenterId = ccId
        }

        const payload: any = {
          company_id: companyId,
          customer_id: raw.customer_id || null,
          vehicle_id: raw.vehicle_id || null,
          cost_center_id: resolvedCostCenterId,
          contract_number,
          contract_type: normalizeContractType(raw.contract_type),
          contract_date: raw.contract_date || new Date().toISOString().slice(0, 10),
          start_date: raw.start_date,
          end_date: raw.end_date,
          contract_amount: raw.contract_amount !== undefined && raw.contract_amount !== null && String(raw.contract_amount) !== '' ? Number(raw.contract_amount) : null,
          monthly_amount: raw.monthly_amount !== undefined && raw.monthly_amount !== null && String(raw.monthly_amount) !== '' ? Number(raw.monthly_amount) : null,
          description: raw.description || null,
          terms: raw.terms || null,
          status: isCancelledDescription(raw.description) ? 'cancelled' : 'draft',
        }

        // Basic validation
        const errors: string[] = []
        if (!payload.customer_id) errors.push('customer_id مفقود (الوضع بالجملة يتطلب معرف العميل)')
        if (!payload.contract_type) errors.push('contract_type مفقود')
        if (!payload.start_date) errors.push('start_date مفقود')
        if (!payload.end_date) errors.push('end_date مفقود')
        if (payload.contract_amount === null) errors.push('contract_amount مفقود')
        if (payload.contract_amount !== null && isNaN(Number(payload.contract_amount))) errors.push('contract_amount يجب أن يكون رقماً')
        if (payload.monthly_amount !== null && isNaN(Number(payload.monthly_amount))) errors.push('monthly_amount يجب أن يكون رقماً')
        if (payload.start_date && payload.end_date) {
          const sd = new Date(payload.start_date)
          const ed = new Date(payload.end_date)
          if (!(sd instanceof Date) || isNaN(sd.getTime()) || !(ed instanceof Date) || isNaN(ed.getTime()) || ed <= sd) {
            errors.push('تواريخ العقد غير صحيحة (end_date يجب أن يكون بعد start_date)')
          }
        }
        if (errors.length) {
          results.failed++; results.errors.push({ row: rowIndex, message: errors.join(' | ') }); continue
        }
        if (payload.monthly_amount === null) payload.monthly_amount = Number(payload.contract_amount)

        if (dryRun) { results.successful++; continue }

        const existingId = dupMap.get(contract_number)
        if (existingId) {
          if (upsertDuplicates) {
            const { error: upErr } = await supabase
              .from('contracts')
              .update({
                customer_id: payload.customer_id,
                vehicle_id: payload.vehicle_id,
                cost_center_id: payload.cost_center_id,
                contract_type: payload.contract_type,
                contract_date: payload.contract_date,
                start_date: payload.start_date,
                end_date: payload.end_date,
                contract_amount: payload.contract_amount,
                monthly_amount: payload.monthly_amount,
                description: payload.description,
                terms: payload.terms,
                status: payload.status,
              })
              .eq('id', existingId)
              .eq('company_id', companyId)
            if (upErr) throw new Error(upErr.message)
            results.successful++
          } else {
            results.failed++; results.errors.push({ row: rowIndex, message: `رقم العقد موجود مسبقاً (${contract_number})` })
          }
          continue
        }

        const { error: insErr } = await supabase.from('contracts').insert([payload])
        if (insErr) throw new Error(insErr.message)
        results.successful++
      } catch (e: any) {
        results.failed++
        results.errors.push({ row: raw.rowNumber || i + 2, message: e?.message || 'Unknown error' })
      }
    }

    return new Response(JSON.stringify(results), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Unexpected error' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
  }
})
