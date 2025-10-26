const fs = require('fs');
const path = require('path');

// Parse the SQL file to extract vehicle data
function parseVehiclesData(sqlContent) {
  const vehicles = [];
  const insertRegex = /INSERT INTO vehicles_data \(vehicle_number, customer_name, phone_number, contract_start_date, monthly_payment\) VALUES \('([^']+)', '([^']+)', '([^']+)', '([^']+)', ([0-9.]+)\);/g;

  let match;
  while ((match = insertRegex.exec(sqlContent)) !== null) {
    vehicles.push({
      vehicle_number: match[1],
      customer_name: match[2],
      phone_number: match[3],
      contract_start_date: match[4],
      monthly_payment: parseFloat(match[5])
    });
  }

  return vehicles;
}

// Read the SQL file
const sqlFilePath = path.join(__dirname, '..', '.qoder', 'vehicles_data.sql');
const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');
const vehiclesData = parseVehiclesData(sqlContent);

console.log(`\n=== Vehicles Data from SQL File ===`);
console.log(`Total vehicles in SQL file: ${vehiclesData.length}\n`);

// Create a map by vehicle number for easy lookup
const vehicleMap = new Map();
vehiclesData.forEach(v => {
  vehicleMap.set(v.vehicle_number, v);
});

// Export for use in Supabase query
const vehicleNumbers = vehiclesData.map(v => v.vehicle_number);

console.log(`Vehicle numbers to check: ${vehicleNumbers.join(', ')}\n`);
console.log(`\n=== Sample Vehicle Data ===`);
console.log(JSON.stringify(vehiclesData.slice(0, 5), null, 2));

// Save vehicle numbers to a file for SQL query
fs.writeFileSync(
  path.join(__dirname, 'vehicle-numbers.json'),
  JSON.stringify({ vehicleNumbers, vehicleMap: Object.fromEntries(vehicleMap) }, null, 2)
);

console.log(`\n✓ Saved vehicle data to vehicle-numbers.json`);
