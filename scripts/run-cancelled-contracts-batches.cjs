/**
 * Run all cancelled contracts migration batches in sequence
 * Usage: node scripts/run-cancelled-contracts-batches.cjs
 */

const { execSync } = require('child_process');
const path = require('path');

const batches = [
  '2025102520000001_link_cancelled_batch_1.sql',
  '2025102520000002_link_cancelled_batch_2.sql',
  '2025102520000003_link_cancelled_batch_3.sql',
  '2025102520000004_link_cancelled_batch_4.sql',
  '2025102520000005_link_cancelled_batch_5.sql',
  '2025102520000006_link_cancelled_batch_6.sql',
  '2025102520000007_link_cancelled_batch_7.sql',
  '2025102520000008_link_cancelled_batch_8.sql',
];

console.log('🚀 Starting cancelled contracts migration (8 batches)\n');

let totalSuccess = 0;
let totalFailed = 0;

batches.forEach((batch, index) => {
  const batchNum = index + 1;
  const filepath = path.join('supabase', 'migrations', batch);

  console.log(`\n📦 Running Batch ${batchNum}/8: ${batch}`);
  console.log('─'.repeat(60));

  try {
    const startTime = Date.now();

    // Run the migration
    execSync(`npx supabase db execute --file ${filepath}`, {
      stdio: 'inherit',
      encoding: 'utf8'
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Batch ${batchNum} completed in ${duration}s`);
    totalSuccess++;

  } catch (error) {
    console.error(`❌ Batch ${batchNum} failed:`, error.message);
    totalFailed++;

    console.log('\n⚠️  Migration stopped due to error.');
    console.log(`Progress: ${totalSuccess}/${batches.length} batches completed`);
    process.exit(1);
  }
});

console.log('\n' + '='.repeat(60));
console.log('🎉 All batches completed successfully!');
console.log('='.repeat(60));
console.log(`✅ Success: ${totalSuccess}/${batches.length} batches`);
console.log(`❌ Failed: ${totalFailed}/${batches.length} batches`);
console.log('\n💡 Next steps:');
console.log('1. Verify the contracts in your database');
console.log('2. Check the Supabase logs for detailed output');
console.log('3. Run a query to count linked contracts:');
console.log('   SELECT COUNT(*) FROM contracts WHERE vehicle_id IS NOT NULL AND customer_id IS NOT NULL;');
