import { useState } from 'react';
import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

/**
 * Hook to generate comprehensive PDF reports for customers
 * Includes: customer details, contracts, payments, vehicles, history
 */
export const useCustomerPDFReport = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateCustomerReport = async (customerId: string) => {
    setIsGenerating(true);
    setError(null);

    try {
      // Fetch customer data
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (customerError) throw customerError;
      if (!customer) throw new Error('Customer not found');

      // Fetch contracts
      const { data: contracts, error: contractsError } = await supabase
        .from('contracts')
        .select(`
          *,
          vehicles (
            make,
            model,
            year,
            plate_number
          )
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (contractsError) throw contractsError;

      // Fetch payments
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('customer_id', customerId)
        .order('payment_date', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Create PDF with Arabic support
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Add Arabic font support (using default font for now)
      // Note: For proper Arabic support, you'd need to add a custom font
      doc.setFont('helvetica');
      doc.setFontSize(16);

      let yPosition = 20;

      // Header
      doc.setFontSize(20);
      doc.text('Customer Report / تقرير العميل', 105, yPosition, { align: 'center' });
      yPosition += 15;

      // Customer Information
      doc.setFontSize(14);
      doc.text('Customer Information / معلومات العميل', 20, yPosition);
      yPosition += 10;

      doc.setFontSize(11);
      const customerInfo = [
        `Name / الاسم: ${customer.first_name || ''} ${customer.last_name || ''}`,
        `Email / البريد: ${customer.email || 'N/A'}`,
        `Phone / الهاتف: ${customer.phone || 'N/A'}`,
        `ID Number / رقم الهوية: ${customer.id_number || 'N/A'}`,
        `Type / النوع: ${customer.customer_type === 'individual' ? 'Individual / فرد' : 'Corporate / شركة'}`,
        `Status / الحالة: ${customer.is_active ? 'Active / نشط' : 'Inactive / غير نشط'}`,
      ];

      customerInfo.forEach((line) => {
        doc.text(line, 20, yPosition);
        yPosition += 7;
      });

      yPosition += 5;

      // Contracts Section
      doc.setFontSize(14);
      doc.text(`Contracts / العقود (${contracts?.length || 0})`, 20, yPosition);
      yPosition += 10;

      if (contracts && contracts.length > 0) {
        doc.setFontSize(10);
        contracts.slice(0, 5).forEach((contract: any, index: number) => {
          const vehicle = contract.vehicles;
          const contractInfo = [
            `${index + 1}. Contract #${contract.contract_number || 'N/A'}`,
            `   Vehicle / المركبة: ${vehicle?.make || ''} ${vehicle?.model || ''} ${vehicle?.year || ''}`,
            `   Plate / اللوحة: ${vehicle?.plate_number || 'N/A'}`,
            `   Period / الفترة: ${contract.start_date ? format(new Date(contract.start_date), 'dd/MM/yyyy') : 'N/A'} - ${contract.end_date ? format(new Date(contract.end_date), 'dd/MM/yyyy') : 'N/A'}`,
            `   Amount / المبلغ: ${contract.contract_amount || 0} QAR`,
            `   Status / الحالة: ${contract.status || 'N/A'}`,
          ];

          contractInfo.forEach((line) => {
            if (yPosition > 270) {
              doc.addPage();
              yPosition = 20;
            }
            doc.text(line, 20, yPosition);
            yPosition += 5;
          });

          yPosition += 3;
        });

        if (contracts.length > 5) {
          doc.text(`... and ${contracts.length - 5} more contracts`, 20, yPosition);
          yPosition += 7;
        }
      } else {
        doc.text('No contracts found / لا توجد عقود', 20, yPosition);
        yPosition += 7;
      }

      yPosition += 5;

      // Payments Section
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.text(`Payments / المدفوعات (${payments?.length || 0})`, 20, yPosition);
      yPosition += 10;

      if (payments && payments.length > 0) {
        doc.setFontSize(10);
        
        // Calculate totals
        const totalPaid = payments
          .filter((p: any) => p.status === 'completed')
          .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
        
        const totalPending = payments
          .filter((p: any) => p.status === 'pending')
          .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

        doc.text(`Total Paid / إجمالي المدفوع: ${totalPaid.toFixed(2)} QAR`, 20, yPosition);
        yPosition += 7;
        doc.text(`Total Pending / إجمالي المعلق: ${totalPending.toFixed(2)} QAR`, 20, yPosition);
        yPosition += 10;

        // Recent payments
        doc.text('Recent Payments / المدفوعات الأخيرة:', 20, yPosition);
        yPosition += 7;

        payments.slice(0, 10).forEach((payment: any, index: number) => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }

          const paymentInfo = `${index + 1}. ${payment.payment_date ? format(new Date(payment.payment_date), 'dd/MM/yyyy') : 'N/A'} - ${payment.amount || 0} QAR - ${payment.status || 'N/A'}`;
          doc.text(paymentInfo, 20, yPosition);
          yPosition += 5;
        });

        if (payments.length > 10) {
          yPosition += 3;
          doc.text(`... and ${payments.length - 10} more payments`, 20, yPosition);
        }
      } else {
        doc.text('No payments found / لا توجد مدفوعات', 20, yPosition);
      }

      // Footer
      doc.setFontSize(9);
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(
          `Page ${i} of ${pageCount} - Generated on ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
          105,
          290,
          { align: 'center' }
        );
      }

      // Save PDF
      const fileName = `customer_report_${customer.first_name || 'unknown'}_${format(new Date(), 'yyyyMMdd')}.pdf`;
      doc.save(fileName);

      setIsGenerating(false);
      return { success: true, fileName };
    } catch (err: any) {
      console.error('Error generating customer report:', err);
      setError(err.message || 'Failed to generate report');
      setIsGenerating(false);
      return { success: false, error: err.message };
    }
  };

  return {
    generateCustomerReport,
    isGenerating,
    error,
  };
};
