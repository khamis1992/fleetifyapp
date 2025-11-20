# FleetifyApp API Documentation

## Overview
The FleetifyApp API provides comprehensive REST endpoints and real-time capabilities for fleet management, customer operations, financial tracking, and more. Built on Supabase with PostgreSQL, our API offers secure, scalable access to all platform features.

## 🚀 Quick Start
- **[Authentication](./AUTHENTICATION.md)** - API authentication and authorization
- [Interactive API Explorer](https://fleetifyapp.vercel.app/api-explorer) - Try API endpoints live
- **[Rate Limiting](./RATE_LIMITING.md)** - API usage limits and throttling
- **[Error Handling](./ERROR_HANDLING.md)** - Common error responses and troubleshooting

## 🔐 Authentication

### Getting API Credentials
1. Log into your FleetifyApp account
2. Navigate to **Settings** → **API Keys**
3. Click **"Generate New API Key"**
4. Set permissions for the key
5. Copy and securely store your API key

### Authentication Methods
```bash
# Bearer Token (Recommended)
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://api.fleetifyapp.com/vehicles

# Service Role Key (Backend only)
curl -H "apikey: YOUR_SERVICE_KEY" \
     -H "Authorization: Bearer YOUR_SERVICE_KEY" \
     https://api.fleetifyapp.com/admin/vehicles
```

## 📋 API Endpoints

### 🚗 Fleet Management
```http
# Vehicles
GET    /api/v1/vehicles                    # List all vehicles
POST   /api/v1/vehicles                    # Create new vehicle
GET    /api/v1/vehicles/{id}               # Get vehicle details
PUT    /api/v1/vehicles/{id}               # Update vehicle
DELETE /api/v1/vehicles/{id}               # Delete vehicle

# Vehicle Groups
GET    /api/v1/vehicle-groups              # List vehicle groups
POST   /api/v1/vehicle-groups              # Create vehicle group
PUT    /api/v1/vehicle-groups/{id}         # Update vehicle group
DELETE /api/v1/vehicle-groups/{id}         # Delete vehicle group

# Maintenance
GET    /api/v1/maintenance                 # List maintenance records
POST   /api/v1/maintenance                 # Create maintenance record
PUT    /api/v1/maintenance/{id}            # Update maintenance record
DELETE /api/v1/maintenance/{id}            # Delete maintenance record

# Insurance
GET    /api/v1/insurance                   # List insurance policies
POST   /api/v1/insurance                   # Create insurance policy
PUT    /api/v1/insurance/{id}              # Update insurance policy
DELETE /api/v1/insurance/{id}              # Delete insurance policy
```

### 👥 Customer Management
```http
# Customers
GET    /api/v1/customers                   # List all customers
POST   /api/v1/customers                   # Create new customer
GET    /api/v1/customers/{id}              # Get customer details
PUT    /api/v1/customers/{id}              # Update customer
DELETE /api/v1/customers/{id}              # Delete customer

# Customer Statements
GET    /api/v1/customers/{id}/statements   # Get customer statements
POST   /api/v1/customers/{id}/statements   # Generate statement
GET    /api/v1/customers/{id}/balance      # Get customer balance
```

### 📄 Contract Management
```http
# Contracts
GET    /api/v1/contracts                   # List all contracts
POST   /api/v1/contracts                   # Create new contract
GET    /api/v1/contracts/{id}              # Get contract details
PUT    /api/v1/contracts/{id}              # Update contract
DELETE /api/v1/contracts/{id}              # Delete contract

# Contract Templates
GET    /api/v1/contract-templates           # List templates
POST   /api/v1/contract-templates           # Create template
PUT    /api/v1/contract-templates/{id}      # Update template
DELETE /api/v1/contract-templates/{id}      # Delete template

# Contract Documents
GET    /api/v1/contracts/{id}/documents    # List contract documents
POST   /api/v1/contracts/{id}/documents    # Upload document
DELETE /api/v1/contracts/{id}/documents/{docId}  # Delete document
```

### 💰 Financial Operations
```http
# Payments
GET    /api/v1/payments                    # List all payments
POST   /api/v1/payments                    # Create payment
GET    /api/v1/payments/{id}               # Get payment details
PUT    /api/v1/payments/{id}               # Update payment
DELETE /api/v1/payments/{id}               # Delete payment

# Invoices
GET    /api/v1/invoices                    # List all invoices
POST   /api/v1/invoices                    # Create invoice
GET    /api/v1/invoices/{id}               # Get invoice details
PUT    /api/v1/invoices/{id}               # Update invoice
DELETE /api/v1/invoices/{id}               # Delete invoice

# Financial Reports
GET    /api/v1/reports/revenue             # Revenue report
GET    /api/v1/reports/expenses            # Expenses report
GET    /api/v1/reports/profit-loss         # Profit & loss statement
GET    /api/v1/reports/cash-flow           # Cash flow statement
```

### ⚖️ Legal Management
```http
# Legal Cases
GET    /api/v1/legal-cases                 # List legal cases
POST   /api/v1/legal-cases                 # Create legal case
GET    /api/v1/legal-cases/{id}            # Get case details
PUT    /api/v1/legal-cases/{id}            # Update legal case
DELETE /api/v1/legal-cases/{id}            # Delete legal case

# Traffic Violations
GET    /api/v1/traffic-violations          # List traffic violations
POST   /api/v1/traffic-violations          # Create violation record
GET    /api/v1/traffic-violations/{id}     # Get violation details
PUT    /api/v1/traffic-violations/{id}     # Update violation record
DELETE /api/v1/traffic-violations/{id}     # Delete violation record
```

### 👔 HR Management
```http
# Employees
GET    /api/v1/employees                   # List all employees
POST   /api/v1/employees                   # Create new employee
GET    /api/v1/employees/{id}              # Get employee details
PUT    /api/v1/employees/{id}              # Update employee
DELETE /api/v1/employees/{id}              # Delete employee

# Payroll
GET    /api/v1/payroll                     # List payroll records
POST   /api/v1/payroll                     # Create payroll record
GET    /api/v1/payroll/{id}                # Get payroll details
PUT    /api/v1/payroll/{id}                # Update payroll record

# Attendance
GET    /api/v1/attendance                  # List attendance records
POST   /api/v1/attendance                  # Record attendance
GET    /api/v1/attendance/{employeeId}     # Get employee attendance
```

### 📦 Inventory Management
```http
# Inventory Items
GET    /api/v1/inventory/items             # List inventory items
POST   /api/v1/inventory/items             # Create inventory item
GET    /api/v1/inventory/items/{id}        # Get item details
PUT    /api/v1/inventory/items/{id}        # Update item
DELETE /api/v1/inventory/items/{id}        # Delete item

# Warehouses
GET    /api/v1/inventory/warehouses         # List warehouses
POST   /api/v1/inventory/warehouses         # Create warehouse
PUT    /api/v1/inventory/warehouses/{id}    # Update warehouse
DELETE /api/v1/inventory/warehouses/{id}    # Delete warehouse

# Stock Levels
GET    /api/v1/inventory/stock-levels       # Get stock levels
POST   /api/v1/inventory/stock-adjustments  # Adjust stock levels
GET    /api/v1/inventory/stock-movements   # Get stock movement history
```

## 🔧 Query Parameters

### Pagination
```http
GET /api/v1/vehicles?page=1&limit=20&offset=0

# Response Structure
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Filtering
```http
# Filter by status
GET /api/v1/vehicles?status=available

# Filter by date range
GET /api/v1/contracts?start_date=2024-01-01&end_date=2024-12-31

# Filter by multiple criteria
GET /api/v1/vehicles?make=Toyota&year=2022&status=available
```

### Sorting
```http
# Sort by single field
GET /api/v1/vehicles?sort=created_at&order=desc

# Sort by multiple fields
GET /api/v1/vehicles?sort=make,year&order=asc,desc
```

### Search
```http
# Global search
GET /api/v1/search?q=Toyota

# Field-specific search
GET /api/v1/vehicles?search=license_plate&term=ABC123
```

## 📊 Real-time Features

### WebSocket Connections
```javascript
// Connect to real-time updates
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Subscribe to vehicle updates
const subscription = supabase
  .channel('vehicle-updates')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'vehicles' },
    (payload) => {
      console.log('Vehicle updated:', payload);
    }
  )
  .subscribe();

// Subscribe to contract status changes
const contractSubscription = supabase
  .channel('contract-status')
  .on('postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'contracts', filter: 'status=eq.active' },
    (payload) => {
      console.log('Contract status changed:', payload);
    }
  )
  .subscribe();
```

### Real-time Events
- **Vehicle Status Changes**: Available → Rented → Maintenance
- **Contract Updates**: New contracts, status changes, amendments
- **Payment Events**: New payments, failed transactions
- **Maintenance Alerts**: Due dates, completed maintenance
- **Inventory Updates**: Stock level changes, new items

## 🛡️ Security

### Rate Limiting
- **Standard Tier**: 1000 requests per hour
- **Professional Tier**: 5000 requests per hour
- **Enterprise Tier**: 10000 requests per hour

### Data Validation
All API requests are validated against schemas:
```javascript
// Vehicle creation validation schema
{
  license_plate: { type: "string", required: true, pattern: "^[A-Z]{3}-[0-9]{4}$" },
  make: { type: "string", required: true, minLength: 2 },
  model: { type: "string", required: true, minLength: 2 },
  year: { type: "integer", required: true, min: 1900, max: new Date().getFullYear() + 1 },
  color: { type: "string", optional: true },
  vin: { type: "string", optional: true, pattern: "^[A-HJ-NPR-Z0-9]{17}$" }
}
```

### Access Control
- **Row Level Security**: Users can only access their company's data
- **Role-Based Permissions**: Different access levels for different user roles
- **API Key Permissions**: Scoped permissions for API keys

## 🔍 API Explorer

### Interactive Testing
Access our interactive API explorer at:
[https://fleetifyapp.vercel.app/api-explorer](https://fleetifyapp.vercel.app/api-explorer)

Features:
- **Live API Testing**: Try endpoints with your data
- **Authentication**: Test with your API keys
- **Request Builder**: Build requests with validation
- **Response Viewer**: View formatted responses
- **Code Generation**: Generate code snippets in multiple languages

### SDK Libraries

### JavaScript/TypeScript
```bash
npm install @fleetifyapp/api-client
```

```javascript
import { FleetifyAPI } from '@fleetifyapp/api-client';

const client = new FleetifyAPI({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.fleetifyapp.com'
});

// Get vehicles
const vehicles = await client.vehicles.list();

// Create vehicle
const vehicle = await client.vehicles.create({
  license_plate: 'ABC-1234',
  make: 'Toyota',
  model: 'Camry',
  year: 2022
});
```

### Python
```bash
pip install fleetifyapp-python
```

```python
from fleetifyapp import FleetifyAPI

client = FleetifyAPI(api_key='your-api-key')

# Get vehicles
vehicles = client.vehicles.list()

# Create vehicle
vehicle = client.vehicles.create({
    'license_plate': 'ABC-1234',
    'make': 'Toyota',
    'model': 'Camry',
    'year': 2022
})
```

### cURL Examples
```bash
# List vehicles
curl -X GET "https://api.fleetifyapp.com/v1/vehicles" \
     -H "Authorization: Bearer YOUR_API_KEY"

# Create vehicle
curl -X POST "https://api.fleetifyapp.com/v1/vehicles" \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "license_plate": "ABC-1234",
       "make": "Toyota",
       "model": "Camry",
       "year": 2022
     }'

# Upload document
curl -X POST "https://api.fleetifyapp.com/v1/contracts/{id}/documents" \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -F "file=@document.pdf" \
     -F "document_type=contract"
```

## 📝 API Changelog

### Version 1.2.0 (Latest)
- **Added**: Inventory management endpoints
- **Added**: Real-time WebSocket subscriptions
- **Enhanced**: Advanced filtering and search capabilities
- **Fixed**: Pagination consistency issues

### Version 1.1.0
- **Added**: HR management endpoints
- **Added**: Bulk operations support
- **Enhanced**: Error response formatting
- **Security**: Improved rate limiting

### Version 1.0.0
- **Initial release**
- **Core endpoints**: Vehicles, customers, contracts, payments
- **Authentication**: JWT-based auth system
- **Documentation**: Complete API reference

## 🆘 Support

### Getting Help
- **[API Documentation](./)** - Complete API reference
- **[Troubleshooting Guide](./TROUBLESHOOTING.md)** - Common issues and solutions
- **[Support Center](../support/)** - Help articles and FAQs
- **[Community Forum](../support/COMMUNITY.md)** - Developer community

### Reporting Issues
- **Bug Reports**: [GitHub Issues](https://github.com/fleetifyapp/fleetifyapp/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/fleetifyapp/fleetifyapp/discussions)
- **Security Issues**: security@fleetifyapp.com

### Contact Support
- **Email**: api-support@fleetifyapp.com
- **Documentation**: docs@fleetifyapp.com
- **Status Page**: [https://status.fleetifyapp.com](https://status.fleetifyapp.com)

---

**Next Step**: Check out the [Authentication Guide](./AUTHENTICATION.md) to learn how to secure your API requests, or try the [Interactive API Explorer](https://fleetifyapp.vercel.app/api-explorer) to test endpoints live.