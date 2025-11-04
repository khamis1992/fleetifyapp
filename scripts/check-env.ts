/**
 * Environment Variables Verification Script
 * Checks if all required environment variables are properly configured
 */

// Required environment variables for the application
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
];

// Optional environment variables (won't fail build but good to have)
const optionalEnvVars = [
  'VITE_OPENAI_API_KEY',
];

console.log('🔍 Checking Environment Variables...\n');

let hasErrors = false;
let hasWarnings = false;

// Check required variables
console.log('📋 Required Variables:');
console.log('─'.repeat(50));

requiredEnvVars.forEach((varName) => {
  const value = process.env[varName] || import.meta?.env?.[varName];
  
  if (!value) {
    console.log(`❌ ${varName}: MISSING (REQUIRED)`);
    hasErrors = true;
  } else {
    // Mask sensitive data
    const maskedValue = value.substring(0, 10) + '...' + value.substring(value.length - 4);
    console.log(`✅ ${varName}: ${maskedValue}`);
  }
});

console.log('');

// Check optional variables
console.log('📋 Optional Variables:');
console.log('─'.repeat(50));

optionalEnvVars.forEach((varName) => {
  const value = process.env[varName] || import.meta?.env?.[varName];
  
  if (!value) {
    console.log(`⚠️  ${varName}: Not set (optional)`);
    hasWarnings = true;
  } else {
    const maskedValue = value.substring(0, 10) + '...' + value.substring(value.length - 4);
    console.log(`✅ ${varName}: ${maskedValue}`);
  }
});

console.log('');
console.log('─'.repeat(50));

// Final status
if (hasErrors) {
  console.log('');
  console.log('❌ CONFIGURATION ERROR: Required environment variables are missing!');
  console.log('');
  console.log('🔧 To fix this:');
  console.log('');
  console.log('1. Local Development:');
  console.log('   - Create a .env file in the project root');
  console.log('   - Add the required variables (see .env.example)');
  console.log('');
  console.log('2. Vercel Deployment:');
  console.log('   - Go to: https://vercel.com/[your-project]/settings/environment-variables');
  console.log('   - Add all required variables');
  console.log('   - Redeploy your application');
  console.log('');
  console.log('📖 For detailed instructions, see: VERCEL_DEPLOYMENT_FIX.md');
  console.log('');
  process.exit(1);
} else if (hasWarnings) {
  console.log('');
  console.log('✅ All required variables are configured');
  console.log('⚠️  Some optional variables are missing (this is OK)');
  console.log('');
  process.exit(0);
} else {
  console.log('');
  console.log('✅ All environment variables are properly configured!');
  console.log('');
  process.exit(0);
}
