import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Data structures for traffic violation reports
interface TrafficViolationReportData {
  id: string;
  penalty_number: string;
  penalty_date: string;
  vehicle_id: string;
  customer_id: string;
  amount: number;
  status: string;
  payment_status: string;
  reason: string;
  location?: string;
  vehicle?: {
    plate_number: string;
    make: string;
    model: string;
  };
  customer?: {
    first_name?: string;
    last_name?: string;
    company_name?: string;
    phone: string;
  };
}

interface TrafficViolationPaymentReportData {
  id: string;
  payment_number: string;
  penalty_number: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  payment_type: string;
  status: string;
  reference_number?: string;
  notes?: string;
  penalty?: {
    reason: string;
    vehicle?: {
      plate_number: string;
    };
  };
}

// Custom hook for Traffic Violations Report
export const useTrafficViolationsReport = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ["traffic-violations-report", startDate, endDate],
    queryFn: async (): Promise<TrafficViolationReportData[]> => {
      let query = supabase
        .from("penalties")
        .select(`
          id,
          penalty_number,
          penalty_date,
          vehicle_plate,
          customer_id,
          amount,
          status,
          payment_status,
          reason,
          location
        `)
        .order("penalty_date", { ascending: false });

      if (startDate) {
        query = query.gte("penalty_date", startDate);
      }
      if (endDate) {
        query = query.lte("penalty_date", endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching traffic violations report:", error);
        throw error;
      }

      return data?.map(item => ({
        id: item.id,
        penalty_number: item.penalty_number,
        penalty_date: item.penalty_date,
        vehicle_id: item.vehicle_plate || '',
        customer_id: item.customer_id || '',
        amount: item.amount || 0,
        status: item.status,
        payment_status: item.payment_status,
        reason: item.reason || '',
        location: item.location,
        vehicle: item.vehicle_plate ? {
          plate_number: item.vehicle_plate,
          make: '',
          model: ''
        } : undefined,
        customer: undefined
      })) || [];
    },
    enabled: true,
  });
};

// Custom hook for Traffic Violation Payments Report
export const useTrafficViolationPaymentsReport = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ["traffic-violation-payments-report", startDate, endDate],
    queryFn: async (): Promise<TrafficViolationPaymentReportData[]> => {
      let query = supabase
        .from("traffic_violation_payments")
        .select(`
          id,
          payment_number,
          payment_date,
          amount,
          payment_method,
          payment_type,
          status,
          reference_number,
          notes,
          traffic_violation_id,
          penalties:traffic_violation_id (
            penalty_number,
            reason,
            vehicle_plate
          )
        `)
        .order("payment_date", { ascending: false });

      if (startDate) {
        query = query.gte("payment_date", startDate);
      }
      if (endDate) {
        query = query.lte("payment_date", endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching traffic violation payments report:", error);
        throw error;
      }

      return data?.map(item => ({
        id: item.id,
        payment_number: item.payment_number,
        penalty_number: item.penalties?.penalty_number || '',
        payment_date: item.payment_date,
        amount: item.amount || 0,
        payment_method: item.payment_method,
        payment_type: item.payment_type,
        status: item.status,
        reference_number: item.reference_number,
        notes: item.notes,
        penalty: item.penalties ? {
          reason: item.penalties.reason,
          vehicle: item.penalties.vehicle_plate ? {
            plate_number: item.penalties.vehicle_plate
          } : undefined
        } : undefined
      })) || [];
    },
    enabled: true,
  });
};

// HTML Export Utility
export const exportTrafficViolationReportToHTML = (
  content: string,
  title: string,
  companyName?: string
) => {
  const currentDate = new Date().toLocaleDateString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const htmlContent = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        @page {
            size: A4;
            margin: 2cm;
        }
        
        @media print {
            body { 
                margin: 0; 
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .no-print { display: none; }
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e9ecef;
        }
        
        .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #2c5aa0;
            margin-bottom: 10px;
        }
        
        .report-title {
            font-size: 20px;
            color: #495057;
            margin-bottom: 5px;
        }
        
        .report-date {
            font-size: 14px;
            color: #6c757d;
        }
        
        .content {
            margin-bottom: 30px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 12px;
        }
        
        th, td {
            padding: 8px 12px;
            text-align: left;
            border: 1px solid #dee2e6;
        }
        
        th {
            background-color: #f8f9fa;
            font-weight: 600;
            color: #495057;
        }
        
        tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        
        tr:hover {
            background-color: #e9ecef;
        }
        
        .summary-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            text-align: center;
            border-left: 4px solid #2c5aa0;
        }
        
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #2c5aa0;
            margin-bottom: 5px;
        }
        
        .stat-label {
            font-size: 12px;
            color: #6c757d;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .footer {
            text-align: center;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            color: #6c757d;
            font-size: 12px;
        }
        
        .controls {
            text-align: center;
            margin-bottom: 20px;
        }
        
        .btn {
            background-color: #2c5aa0;
            color: white;
            border: none;
            padding: 10px 20px;
            margin: 0 10px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
        }
        
        .btn:hover {
            background-color: #1e3d72;
        }
        
        .btn-secondary {
            background-color: #6c757d;
        }
        
        .btn-secondary:hover {
            background-color: #545b62;
        }
        
        @media print {
            .controls {
                display: none;
            }
            
            body {
                background-color: white;
                padding: 0;
            }
            
            .container {
                box-shadow: none;
                padding: 20px;
            }
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 15px;
            }
            
            table {
                font-size: 10px;
            }
            
            th, td {
                padding: 6px 8px;
            }
            
            .summary-stats {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="controls">
            <button class="btn" onclick="window.print()">🖨️ Print Report</button>
            <button class="btn btn-secondary" onclick="window.close()">✖️ Close</button>
        </div>
        
        <div class="header">
            <div class="company-name">${companyName || 'Fleetify'}</div>
            <div class="report-title">${title}</div>
            <div class="report-date">Generated on ${currentDate}</div>
        </div>
        
        <div class="content">
            ${content}
        </div>
        
        <div class="footer">
            <p>This report was generated automatically by Fleetify</p>
            <p>© ${new Date().getFullYear()} ${companyName || 'Fleetify'}. All rights reserved.</p>
        </div>
    </div>

    <script>
        // Auto-focus for better printing experience
        window.onload = function() {
            window.focus();
        };
        
        // Enhanced print handling
        function printReport() {
            window.print();
        }
        
        // Handle keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                window.print();
            }
            if (e.key === 'Escape') {
                window.close();
            }
        });
    </script>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  const newWindow = window.open(url, '_blank');
  if (!newWindow) {
    // Fallback for popup blockers
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '_')}_${new Date().getTime()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  // Clean up the blob URL after a delay
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
};