import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { requireSupabaseScriptConfig } from './_shared/supabase-env.mjs'

const { url: supabaseUrl, key: supabaseServiceKey } = requireSupabaseScriptConfig({ serviceRole: true })

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkFunctionExists() {
  try {
    console.log('🔍 Checking if function exists...')
    
    // Try to call the function with a dummy UUID to see if it exists
    const { data, error } = await supabase
      .rpc('create_contract_journal_entry', { 
        contract_id_param: '00000000-0000-0000-0000-000000000000' 
      })
    
    if (error) {
      if (error.message.includes('does not exist')) {
        console.log('❌ Function create_contract_journal_entry does not exist')
        return false
      } else {
        console.log('✅ Function exists (got expected error for dummy UUID)')
        return true
      }
    } else {
      console.log('✅ Function exists')
      return true
    }
  } catch (error) {
    if (error.message.includes('does not exist')) {
      console.log('❌ Function create_contract_journal_entry does not exist')
      return false
    } else {
      console.log('⚠️ Function check inconclusive:', error.message)
      return false
    }
  }
}

async function createFunction() {
  try {
    console.log('🔧 Creating missing function...')
    
    // Read the SQL file
    const sql = readFileSync('create_missing_function.sql', 'utf8')
    
    // Split the SQL into individual statements
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim() + ';'
      
      if (statement.length > 1) {
        console.log(`📝 Executing statement ${i + 1}/${statements.length}...`)
        
        try {
          // Execute each statement using a simple query
          const { data, error } = await supabase
            .from('_dummy_table_that_does_not_exist')
            .select('*')
            .limit(0)
          
          // Since we can't execute SQL directly, let's try a different approach
          // Create a simple test function first
          const { data: testData, error: testError } = await supabase
            .rpc('version')
          
          if (testError) {
            console.log('⚠️ Cannot connect to database properly')
          } else {
            console.log('✅ Database connection working')
            
            // Now let's try to create the function using raw SQL query
            // This requires executing the SQL through a different method
            console.log('💡 Please execute the SQL manually in Supabase SQL Editor:')
            console.log('🔗 Go to: https://qwhunliohlkkahbspfiu.supabase.co/project/qwhunliohlkkahbspfiu/sql')
            console.log('\n📄 Copy and paste this SQL:')
            console.log('━'.repeat(80))
            console.log(sql)
            console.log('━'.repeat(80))
            
            return true
          }
        } catch (err) {
          console.log(`❌ Error executing statement: ${err.message}`)
        }
      }
    }
    
    return false
  } catch (error) {
    console.error('❌ Error creating function:', error.message)
    return false
  }
}

async function testConnection() {
  try {
    console.log('🔍 Testing Supabase connection...')
    
    const { data, error } = await supabase
      .from('contracts')
      .select('count', { count: 'exact', head: true })
    
    if (error) {
      console.log('❌ Connection failed:', error.message)
      return false
    } else {
      console.log('✅ Connected successfully to Supabase')
      console.log(`📊 Database connection working properly`)
      return true
    }
  } catch (error) {
    console.log('❌ Connection test failed:', error.message)
    return false
  }
}

async function main() {
  console.log('🚀 Starting contract creation fix...')
  console.log('━'.repeat(50))
  
  // Test connection first
  const connected = await testConnection()
  if (!connected) {
    console.log('❌ Cannot connect to database')
    return
  }
  
  // Check if function exists
  const functionExists = await checkFunctionExists()
  
  if (!functionExists) {
    console.log('\n🔧 Function is missing, will provide manual fix instructions...')
    await createFunction()
  } else {
    console.log('\n✅ Function already exists, no action needed!')
  }
  
  console.log('\n🎉 Process completed!')
}

main().catch(console.error)
