const fs = require('fs');
const path = require('path');

// Load vehicle data from the JSON file
const vehicleDataPath = path.join(__dirname, 'vehicle-numbers.json');
const { vehicleMap } = JSON.parse(fs.readFileSync(vehicleDataPath, 'utf-8'));

// Contract data from the database (pasted from query result)
const contractsData = require('./contracts-data.json');

console.log('\n=== Analysis of Cancelled Contracts ===\n');

// Group contracts by vehicle number
const contractsByVehicle = {};
contractsData.forEach(contract => {
  const plate = contract.license_plate;
  if (!contractsByVehicle[plate]) {
    contractsByVehicle[plate] = [];
  }
  contractsByVehicle[plate].push(contract);
});

// Analysis results
const analysis = {
  matchingContracts: [],
  mismatchedMonthlyAmount: [],
  mismatchedStartDate: [],
  missingCustomerInfo: [],
  noExpectedData: []
};

Object.entries(contractsByVehicle).forEach(([vehicleNumber, contracts]) => {
  const expectedData = vehicleMap[vehicleNumber];

  if (!expectedData) {
    analysis.noExpectedData.push({ vehicleNumber, contracts });
    return;
  }

  console.log(`\nVehicle ${vehicleNumber}:`);
  console.log(`  Expected: ${expectedData.customer_name}, Phone: ${expectedData.phone_number}, Start: ${expectedData.contract_start_date}, Monthly: ${expectedData.monthly_payment}`);
  console.log(`  Found ${contracts.length} cancelled contract(s):`);

  contracts.forEach(contract => {
    console.log(`    - Contract ${contract.contract_number}: Start: ${contract.start_date}, Monthly: ${contract.monthly_amount}`);

    const issues = [];

    // Check monthly amount
    if (parseFloat(contract.monthly_amount) !== expectedData.monthly_payment) {
      issues.push(`monthly_amount mismatch (DB: ${contract.monthly_amount}, Expected: ${expectedData.monthly_payment})`);
      analysis.mismatchedMonthlyAmount.push({
        vehicleNumber,
        contract,
        expected: expectedData
      });
    }

    // Check start date (allow some tolerance - within same month/year or close)
    const contractDate = new Date(contract.start_date);
    const expectedDate = new Date(expectedData.contract_start_date);
    const daysDiff = Math.abs((contractDate - expectedDate) / (1000 * 60 * 60 * 24));

    if (daysDiff > 30) {
      issues.push(`start_date mismatch (DB: ${contract.start_date}, Expected: ${expectedData.contract_start_date}, ${Math.round(daysDiff)} days difference)`);
      analysis.mismatchedStartDate.push({
        vehicleNumber,
        contract,
        expected: expectedData,
        daysDifference: Math.round(daysDiff)
      });
    }

    // Note: Customer info would need to be checked via customers table
    // For now, we'll flag that we need to verify customer data
    analysis.missingCustomerInfo.push({
      vehicleNumber,
      contract,
      expected: expectedData
    });

    if (issues.length > 0) {
      console.log(`      Issues: ${issues.join('; ')}`);
    } else {
      console.log(`      ✓ Matches expected data`);
      analysis.matchingContracts.push({ vehicleNumber, contract, expected: expectedData });
    }
  });
});

// Summary
console.log('\n\n=== SUMMARY ===\n');
console.log(`Total vehicles in SQL file: ${Object.keys(vehicleMap).length}`);
console.log(`Vehicles with cancelled contracts: ${Object.keys(contractsByVehicle).length}`);
console.log(`Total cancelled contracts found: ${contractsData.length}`);
console.log(`\nMatching contracts: ${analysis.matchingContracts.length}`);
console.log(`Contracts with monthly amount mismatch: ${analysis.mismatchedMonthlyAmount.length}`);
console.log(`Contracts with start date mismatch: ${analysis.mismatchedStartDate.length}`);
console.log(`Contracts needing customer info verification: ${analysis.missingCustomerInfo.length}`);

// Generate SQL updates for monthly amounts
if (analysis.mismatchedMonthlyAmount.length > 0) {
  console.log('\n\n=== SQL UPDATES FOR MONTHLY AMOUNTS ===\n');
  analysis.mismatchedMonthlyAmount.forEach(({ contract, expected }) => {
    console.log(`-- Contract ${contract.contract_number} for vehicle ${contract.license_plate}`);
    console.log(`UPDATE contracts SET monthly_amount = ${expected.monthly_payment} WHERE id = '${contract.id}';`);
    console.log('');
  });
}

// Save analysis to file
fs.writeFileSync(
  path.join(__dirname, 'contract-analysis-results.json'),
  JSON.stringify(analysis, null, 2)
);

console.log('\n✓ Analysis saved to contract-analysis-results.json');
