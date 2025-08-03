// Test script to check Supabase connection and ambassadors table
import { createClient } from '@supabase/supabase-js'

// You need to set these environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-key-here'

console.log('Testing Supabase connection...')
console.log('URL:', supabaseUrl)
console.log('Key:', supabaseAnonKey.substring(0, 20) + '...')

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testConnection() {
  try {
    console.log('\n1. Testing basic connection...')
    
    // Test if we can connect to Supabase
    const { data, error } = await supabase
      .from('ambassadors')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Connection failed:', error.message)
      return
    }
    
    console.log('✅ Connection successful!')
    
    // Test if ambassadors table exists and has data
    console.log('\n2. Testing ambassadors table...')
    const { data: ambassadors, error: ambassadorsError } = await supabase
      .from('ambassadors')
      .select('id, full_name, phone, status')
      .limit(5)
    
    if (ambassadorsError) {
      console.error('❌ Ambassadors table error:', ambassadorsError.message)
      return
    }
    
    console.log('✅ Ambassadors table accessible!')
    console.log('Found', ambassadors.length, 'ambassadors:')
    
    ambassadors.forEach(amb => {
      console.log(`- ${amb.full_name} (${amb.phone}) - Status: ${amb.status}`)
    })
    
    // Test specific ambassador
    console.log('\n3. Testing specific ambassador...')
    const { data: testAmb, error: testError } = await supabase
      .from('ambassadors')
      .select('*')
      .eq('phone', '27169458')
      .single()
    
    if (testError) {
      console.error('❌ Test ambassador not found:', testError.message)
      console.log('\n💡 You need to create the test ambassador account.')
      console.log('Run this SQL in your Supabase SQL editor:')
      console.log(`
INSERT INTO ambassadors (
  full_name, phone, password, city, status, commission_rate, created_at, updated_at
) VALUES (
  'Test Ambassador', '27169458', '1234567890', 'Tunis', 'approved', 10.00, NOW(), NOW()
);`)
    } else {
      console.log('✅ Test ambassador found:', testAmb.full_name)
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

testConnection() 