import { useState } from 'react';
import jsPDF from 'jspdf';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { SalesQuote } from '@/hooks/useSalesQuotes';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

/**
 * Hook for generating PDF quotes
 * Creates professional PDF documents for sales quotes
 */
export const useQuotePDFGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateQuotePDF = async (quoteId: string): Promise<boolean> => {
    try {
      setIsGenerating(true);

      // Fetch quote details with relations
      const { data: quote, error: quoteError } = await supabase
        .from('sales_quotes')
        .select(`
          *,
          company:companies(id, name_ar, name_en, address, phone, email, logo_url, commercial_reg_no),
          customer:customers(id, first_name, last_name, company_name, phone, email, address),
          opportunity:sales_opportunities(id, opportunity_name, opportunity_name_ar)
        `)
        .eq('id', quoteId)
        .single();

      if (quoteError) throw quoteError;
      if (!quote) throw new Error('Quote not found');

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPos = 20;

      // Add Arabic font support (using default for now)
      pdf.setFont('helvetica');

      // Header - Company Info
      pdf.setFontSize(20);
      pdf.setTextColor(41, 128, 185);
      const companyName = quote.company?.name_ar || quote.company?.name_en || 'شركة العراف لتأجير السيارات';
      pdf.text(companyName, pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      if (quote.company?.address) {
        pdf.text(quote.company.address, pageWidth / 2, yPos, { align: 'center' });
        yPos += 5;
      }
      if (quote.company?.phone) {
        pdf.text(`Tel: ${quote.company.phone}`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 5;
      }
      if (quote.company?.email) {
        pdf.text(`Email: ${quote.company.email}`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 5;
      }
      if (quote.company?.commercial_reg_no) {
        pdf.text(`CR: ${quote.company.commercial_reg_no}`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 10;
      }

      // Title
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text('عرض سعر / QUOTATION', pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // Quote Info Box
      pdf.setDrawColor(200, 200, 200);
      pdf.setFillColor(245, 245, 245);
      pdf.rect(15, yPos, pageWidth - 30, 25, 'FD');

      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      
      // Left column
      pdf.text(`Quote Number: ${quote.quote_number}`, 20, yPos + 7);
      pdf.text(`Date: ${format(new Date(quote.created_at), 'dd/MM/yyyy', { locale: ar })}`, 20, yPos + 14);
      if (quote.valid_until) {
        pdf.text(`Valid Until: ${format(new Date(quote.valid_until), 'dd/MM/yyyy', { locale: ar })}`, 20, yPos + 21);
      }

      // Right column
      const rightX = pageWidth - 20;
      pdf.text(`رقم العرض: ${quote.quote_number}`, rightX, yPos + 7, { align: 'right' });
      pdf.text(`التاريخ: ${format(new Date(quote.created_at), 'dd/MM/yyyy', { locale: ar })}`, rightX, yPos + 14, { align: 'right' });
      if (quote.valid_until) {
        pdf.text(`صالح حتى: ${format(new Date(quote.valid_until), 'dd/MM/yyyy', { locale: ar })}`, rightX, yPos + 21, { align: 'right' });
      }

      yPos += 35;

      // Customer Info
      if (quote.customer) {
        pdf.setFontSize(12);
        pdf.setTextColor(41, 128, 185);
        pdf.text('Customer Information / معلومات العميل', 20, yPos);
        yPos += 8;

        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        
        const customerName = quote.customer.company_name || 
                           `${quote.customer.first_name} ${quote.customer.last_name}`;
        pdf.text(`Name: ${customerName}`, 20, yPos);
        yPos += 6;

        if (quote.customer.phone) {
          pdf.text(`Phone: ${quote.customer.phone}`, 20, yPos);
          yPos += 6;
        }

        if (quote.customer.email) {
          pdf.text(`Email: ${quote.customer.email}`, 20, yPos);
          yPos += 6;
        }

        if (quote.customer.address) {
          pdf.text(`Address: ${quote.customer.address}`, 20, yPos);
          yPos += 6;
        }

        yPos += 5;
      }

      // Items Table
      pdf.setFontSize(12);
      pdf.setTextColor(41, 128, 185);
      pdf.text('Quote Items / بنود العرض', 20, yPos);
      yPos += 8;

      // Table Header
      pdf.setFillColor(41, 128, 185);
      pdf.setTextColor(255, 255, 255);
      pdf.rect(15, yPos, pageWidth - 30, 8, 'F');
      
      pdf.setFontSize(10);
      pdf.text('#', 20, yPos + 5);
      pdf.text('Description', 35, yPos + 5);
      pdf.text('Qty', pageWidth - 70, yPos + 5);
      pdf.text('Price', pageWidth - 50, yPos + 5);
      pdf.text('Total', pageWidth - 25, yPos + 5);
      
      yPos += 10;

      // Table Rows
      pdf.setTextColor(0, 0, 0);
      const items = quote.items || [];
      
      items.forEach((item: any, index: number) => {
        if (yPos > pageHeight - 60) {
          pdf.addPage();
          yPos = 20;
        }

        pdf.text(`${index + 1}`, 20, yPos + 5);
        pdf.text(item.description || item.name || 'Item', 35, yPos + 5);
        pdf.text(`${item.quantity || 1}`, pageWidth - 70, yPos + 5);
        pdf.text(formatCurrency(item.price || 0), pageWidth - 50, yPos + 5);
        pdf.text(formatCurrency((item.quantity || 1) * (item.price || 0)), pageWidth - 25, yPos + 5);
        
        yPos += 8;
      });

      // Add line
      pdf.setDrawColor(200, 200, 200);
      pdf.line(15, yPos, pageWidth - 15, yPos);
      yPos += 10;

      // Totals
      pdf.setFontSize(11);
      const totalsX = pageWidth - 70;
      
      pdf.text('Subtotal:', totalsX, yPos);
      pdf.text(formatCurrency(quote.subtotal || 0), pageWidth - 25, yPos);
      yPos += 7;

      if (quote.tax && quote.tax > 0) {
        pdf.text('Tax:', totalsX, yPos);
        pdf.text(formatCurrency(quote.tax), pageWidth - 25, yPos);
        yPos += 7;
      }

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Total:', totalsX, yPos);
      pdf.text(formatCurrency(quote.total || 0), pageWidth - 25, yPos);
      yPos += 10;

      // Notes
      if (quote.notes) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.text('Notes:', 20, yPos);
        yPos += 6;
        
        const splitNotes = pdf.splitTextToSize(quote.notes, pageWidth - 40);
        pdf.text(splitNotes, 20, yPos);
        yPos += splitNotes.length * 5;
      }

      // Footer
      yPos = pageHeight - 30;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(15, yPos, pageWidth - 15, yPos);
      yPos += 7;

      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Thank you for your business!', pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;
      pdf.text('شكراً لتعاملكم معنا', pageWidth / 2, yPos, { align: 'center' });

      // Save PDF
      const fileName = `Quote_${quote.quote_number}_${format(new Date(), 'yyyyMMdd')}.pdf`;
      pdf.save(fileName);

      toast({
        title: 'تم الإنشاء',
        description: `تم إنشاء ملف PDF للعرض ${quote.quote_number}`,
      });

      return true;
    } catch (err: any) {
      console.error('Error generating quote PDF:', err);
      toast({
        title: 'خطأ',
        description: 'فشل إنشاء ملف PDF',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateQuotePDF,
    isGenerating,
  };
};
