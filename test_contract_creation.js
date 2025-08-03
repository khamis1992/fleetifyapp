import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qwhunliohlkkahbspfiu.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3aHVubGlvaGxra2FoYnNwZml1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQxMzA4NiwiZXhwIjoyMDY4OTg5MDg2fQ.vw3DWeoAyLSe_0MLQPFgSu-TL28W8mbTx7tEfhKe6Zg'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function getCompanyAndCustomer() {
  console.log('🔍 Getting test company and customer...')
  
  // Get first company
  const { data: companies, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .limit(1)
  
  if (companyError || !companies || companies.length === 0) {
    console.log('❌ No companies found:', companyError?.message)
    return null
  }
  
  const company = companies[0]
  console.log('✅ Found company:', company.name, '(ID:', company.id, ')')
  
  // Get first customer for this company
  const { data: customers, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .eq('company_id', company.id)
    .eq('is_active', true)
    .eq('is_blacklisted', false)
    .limit(1)
  
  if (customerError || !customers || customers.length === 0) {
    console.log('❌ No active customers found for company:', customerError?.message)
    return null
  }
  
  const customer = customers[0]
  console.log('✅ Found customer:', customer.first_name, customer.last_name, '(ID:', customer.id, ')')
  
  return { company, customer }
}

async function testContractCreation() {
  try {
    console.log('🚀 Testing contract creation...')
    console.log('━'.repeat(50))
    
    const testData = await getCompanyAndCustomer()
    if (!testData) {
      console.log('❌ Cannot proceed without company and customer data')
      return
    }
    
    const { company, customer } = testData
    
    // Prepare test contract data
    const contractParams = {
      p_company_id: company.id,
      p_customer_id: customer.id,
      p_vehicle_id: null, // No vehicle for this test
      p_contract_type: 'rental',
      p_start_date: '2024-01-15',
      p_end_date: '2024-02-15',
      p_contract_amount: 100,
      p_monthly_amount: 100,
      p_description: 'Test contract creation',
      p_terms: 'Test terms',
      p_cost_center_id: null,
      p_created_by: null
    }
    
    console.log('📋 Contract parameters:')
    console.log(JSON.stringify(contractParams, null, 2))
    console.log('━'.repeat(30))
    
    // Test the main function
    console.log('🔧 Calling create_contract_with_journal_entry...')
    const { data: result, error: createError } = await supabase
      .rpc('create_contract_with_journal_entry', contractParams)
    
    if (createError) {
      console.log('❌ Error calling main function:', createError.message)
      console.log('🔍 Full error details:', createError)
      
      // Check if it's specifically about the missing function
      if (createError.message.includes('create_contract_journal_entry') && 
          createError.message.includes('does not exist')) {
        console.log('🚨 CONFIRMED: The create_contract_journal_entry function is missing!')
        console.log('💡 Need to create this function in the database')
        return false
      }
    } else {
      console.log('✅ Contract creation successful!')
      console.log('📄 Result:', JSON.stringify(result, null, 2))
      
      // Clean up the test contract
      if (result && result.contract_id) {
        console.log('🧹 Cleaning up test contract...')
        await supabase
          .from('contracts')
          .delete()
          .eq('id', result.contract_id)
        
        if (result.journal_entry_id) {
          await supabase
            .from('journal_entries')
            .delete()
            .eq('id', result.journal_entry_id)
        }
      }
      
      return true
    }
    
  } catch (error) {
    console.log('❌ Test failed with exception:', error.message)
    return false
  }
}

async function listAvailableFunctions() {
  try {
    console.log('🔍 Checking available functions...')
    
    const { data, error } = await supabase
      .from('pg_proc')
      .select('proname')
      .like('proname', '%contract%')
    
    if (error) {
      console.log('⚠️ Cannot access pg_proc:', error.message)
    } else {
      console.log('📋 Available contract-related functions:')
      data.forEach(func => console.log('  -', func.proname))
    }
  } catch (error) {
    console.log('⚠️ Cannot list functions:', error.message)
  }
}

async function main() {
  console.log('🧪 Contract Creation Test Suite')
  console.log('━'.repeat(50))
  
  await listAvailableFunctions()
  console.log('━'.repeat(30))
  
  const success = await testContractCreation()
  
  console.log('━'.repeat(50))
  if (success) {
    console.log('🎉 All tests passed! Contract creation is working.')
  } else {
    console.log('❌ Tests failed. Contract creation needs to be fixed.')
  }
}

main().catch(console.error)