// ================================================================
// BACKFILL HISTORICAL INVOICES EDGE FUNCTION
// ================================================================
// Purpose: Generate missing invoices from contract start dates
// Author: AI Assistant
// Date: 2025-11-18
// ================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Contract {
  id: string
  contract_number: string
  customer_id: string
  start_date: string
  end_date: string | null
  monthly_rate: number
  payment_frequency: string
  company_id: string
  status: string
}

interface InvoiceGeneration {
  contract_id: string
  contract_number: string
  customer_id: string
  invoice_month: string
  amount: number
  status: 'success' | 'error' | 'skipped'
  message: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('🚀 Starting historical invoice backfill...')

    // Get all active contracts
    const { data: contracts, error: contractsError } = await supabaseClient
      .from('contracts')
      .select('id, contract_number, customer_id, start_date, end_date, monthly_rate, payment_frequency, company_id, status')
      .eq('status', 'active')
      .order('start_date', { ascending: true })

    if (contractsError) {
      throw new Error(`Failed to fetch contracts: ${contractsError.message}`)
    }

    if (!contracts || contracts.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active contracts found', invoices_generated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📋 Found ${contracts.length} active contracts`)

    const results: InvoiceGeneration[] = []
    let totalGenerated = 0
    let totalSkipped = 0
    let totalErrors = 0

    // Process each contract
    for (const contract of contracts as Contract[]) {
      try {
        console.log(`\n📝 Processing contract: ${contract.contract_number}`)

        const startDate = new Date(contract.start_date)
        const endDate = contract.end_date ? new Date(contract.end_date) : new Date()
        const today = new Date()

        // Generate invoices from start date to current month
        let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1)

        while (currentDate <= today) {
          const invoiceMonth = currentDate.toISOString().substring(0, 7) // YYYY-MM format

          // Check if invoice already exists for this month
          const { data: existingInvoice } = await supabaseClient
            .from('invoices')
            .select('id')
            .eq('contract_id', contract.id)
            .gte('invoice_date', `${invoiceMonth}-01`)
            .lt('invoice_date', `${invoiceMonth}-31`)
            .single()

          if (existingInvoice) {
            console.log(`  ⏭️  Invoice already exists for ${invoiceMonth}`)
            results.push({
              contract_id: contract.id,
              contract_number: contract.contract_number,
              customer_id: contract.customer_id,
              invoice_month: invoiceMonth,
              amount: contract.monthly_rate,
              status: 'skipped',
              message: 'Invoice already exists'
            })
            totalSkipped++
            currentDate.setMonth(currentDate.getMonth() + 1)
            continue
          }

          // Generate invoice number
          const invoiceNumber = `INV-${contract.contract_number}-${invoiceMonth}`

          // Calculate due date (15 days from invoice date)
          const invoiceDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
          const dueDate = new Date(invoiceDate)
          dueDate.setDate(dueDate.getDate() + 15)

          // Create invoice
          const { data: newInvoice, error: invoiceError } = await supabaseClient
            .from('invoices')
            .insert({
              company_id: contract.company_id,
              customer_id: contract.customer_id,
              contract_id: contract.id,
              invoice_number: invoiceNumber,
              invoice_date: invoiceDate.toISOString().split('T')[0],
              due_date: dueDate.toISOString().split('T')[0],
              invoice_type: 'sales',
              subtotal: contract.monthly_rate,
              tax_amount: 0,
              discount_amount: 0,
              total_amount: contract.monthly_rate,
              paid_amount: 0,
              balance_due: contract.monthly_rate,
              currency: 'KWD',
              status: 'sent',
              payment_status: 'unpaid',
              notes: `Monthly rental invoice for ${invoiceMonth} (Historical backfill)`
            })
            .select()
            .single()

          if (invoiceError) {
            console.error(`  ❌ Error creating invoice for ${invoiceMonth}:`, invoiceError.message)
            results.push({
              contract_id: contract.id,
              contract_number: contract.contract_number,
              customer_id: contract.customer_id,
              invoice_month: invoiceMonth,
              amount: contract.monthly_rate,
              status: 'error',
              message: invoiceError.message
            })
            totalErrors++
          } else {
            console.log(`  ✅ Created invoice ${invoiceNumber} for ${invoiceMonth}`)
            results.push({
              contract_id: contract.id,
              contract_number: contract.contract_number,
              customer_id: contract.customer_id,
              invoice_month: invoiceMonth,
              amount: contract.monthly_rate,
              status: 'success',
              message: `Invoice ${invoiceNumber} created successfully`
            })
            totalGenerated++
          }

          // Move to next month
          currentDate.setMonth(currentDate.getMonth() + 1)
        }
      } catch (error) {
        console.error(`❌ Error processing contract ${contract.contract_number}:`, error)
        totalErrors++
      }
    }

    console.log(`\n✅ Backfill complete!`)
    console.log(`   Generated: ${totalGenerated}`)
    console.log(`   Skipped: ${totalSkipped}`)
    console.log(`   Errors: ${totalErrors}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Historical invoice backfill completed',
        summary: {
          contracts_processed: contracts.length,
          invoices_generated: totalGenerated,
          invoices_skipped: totalSkipped,
          errors: totalErrors
        },
        details: results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('❌ Fatal error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
