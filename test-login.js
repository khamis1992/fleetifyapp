/**
 * Test Authentication Script
 *
 * This script tests the login functionality with provided credentials
 *
 * Usage:
 * 1. Set your Supabase credentials in .env file:
 *    VITE_SUPABASE_URL=your-url
 *    VITE_SUPABASE_ANON_KEY=your-key
 *
 * 2. Run the script:
 *    node test-login.js
 *
 * 3. Or pass credentials as environment variables:
 *    VITE_SUPABASE_URL=your-url VITE_SUPABASE_ANON_KEY=your-key node test-login.js
 */

// Test script to verify authentication functionality
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get current directory (ES module compatibility)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to read from .env file
function getEnvVar(key, defaultValue = '') {
  // Check environment variable first
  if (process.env[key]) {
    return process.env[key];
  }

  // Try to read from .env file
  const envPath = path.resolve(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      if (line.startsWith(`${key}=`)) {
        return line.split('=')[1].trim();
      }
    }
  }

  return defaultValue;
}

// Get Supabase configuration
const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || 'https://your-project.supabase.co';
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || 'your-anon-key';

if (supabaseUrl === 'https://your-project.supabase.co' || supabaseAnonKey === 'your-anon-key') {
  console.error('⚠️  Please configure your Supabase credentials:');
  console.error('   - Set VITE_SUPABASE_URL in your .env file');
  console.error('   - Set VITE_SUPABASE_ANON_KEY in your .env file');
  console.error('   - Or pass them as environment variables');
  process.exit(1);
}

// Create a Supabase client instance
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Alternative: Use the project's auth service directly
// Uncomment this section and comment out the direct Supabase client creation
// if you want to test with the actual authService from the project
// Note: This requires proper TypeScript compilation setup
/*
// @ts-ignore - For standalone script testing
const { authService } = await import('./src/lib/auth.ts');
*/

async function testLogin() {
  console.log('🔐 Testing authentication...');

  try {
    const credentials = {
      email: 'khamis-1992@hotmail.com',
      password: '123456789'
    };

    console.log('📧 Attempting to sign in with:', credentials.email);

    const { data, error } = await supabase.auth.signInWithPassword(credentials);

    if (error) {
      console.error('❌ Login failed:', error.message);
      console.error('Error details:', error);
      return false;
    }

    if (data && data.user) {
      console.log('✅ Login successful!');
      console.log('User ID:', data.user.id);
      console.log('User email:', data.user.email);

      // Test getting current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('❌ Error getting user data:', userError.message);
      } else {
        console.log('✅ Successfully retrieved user data');
        console.log('User:', userData.user.email);
      }

      // Sign out
      await supabase.auth.signOut();
      console.log('✅ Signed out successfully');

      return true;
    } else {
      console.error('❌ Login failed: No user data returned');
      return false;
    }
  } catch (error) {
    console.error('❌ Unexpected error during login test:', error);
    return false;
  }
}

// Run the test
testLogin().then(success => {
  if (success) {
    console.log('\n✅ Authentication test passed!');
  } else {
    console.log('\n❌ Authentication test failed!');
  }
  process.exit(success ? 0 : 1);
});