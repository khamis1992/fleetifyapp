import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, FileText, Clock, User, MessageCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import html2pdf from 'html2pdf.js';

interface ConversationMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  confidence?: number;
  metadata?: {
    sources?: string[];
    legal_references?: string[];
    suggested_actions?: string[];
    attachments?: Array<{
      name: string;
      type: string;
      size: number;
      url?: string;
    }>;
  };
}

interface PDFExportProps {
  messages: ConversationMessage[];
  conversationTitle?: string;
  userName?: string;
}

export const PDFExport: React.FC<PDFExportProps> = ({ 
  messages, 
  conversationTitle = 'استشارة قانونية',
  userName = 'المستخدم'
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const generatePDF = async () => {
    setIsExporting(true);
    
    try {
      // Create a formatted HTML document for PDF export
      const pdfContent = createPDFContent();
      
      const options = {
        margin: [10, 10, 10, 10],
        filename: `${conversationTitle}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          allowTaint: true
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait',
          compressPDF: true
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      await html2pdf().set(options).from(pdfContent).save();
      
      toast({
        title: "تم تصدير التقرير",
        description: "تم إنشاء ملف PDF بنجاح",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "خطأ في التصدير",
        description: "حدث خطأ أثناء إنشاء ملف PDF",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const createPDFContent = () => {
    const aiMessages = messages.filter(m => m.type === 'ai');
    const userMessages = messages.filter(m => m.type === 'user');
    const totalMessages = messages.length;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: 'Arial', sans-serif;
            direction: rtl;
            text-align: right;
            margin: 0;
            padding: 20px;
            color: #333;
            line-height: 1.6;
          }
          
          .header {
            text-align: center;
            border-bottom: 3px solid #3b82f6;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          
          .header h1 {
            color: #1e40af;
            font-size: 28px;
            margin: 0;
            font-weight: bold;
          }
          
          .header p {
            color: #64748b;
            font-size: 14px;
            margin: 10px 0 0 0;
          }
          
          .metadata {
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 25px;
            border: 1px solid #e2e8f0;
          }
          
          .metadata-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
          }
          
          .metadata-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .metadata-label {
            font-weight: bold;
            color: #475569;
          }
          
          .metadata-value {
            color: #1e40af;
            font-weight: 600;
          }
          
          .conversation {
            space-y: 20px;
          }
          
          .message {
            margin-bottom: 25px;
            page-break-inside: avoid;
          }
          
          .message-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
          }
          
          .message-type {
            font-weight: bold;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
          }
          
          .user-type {
            background: #dbeafe;
            color: #1e40af;
          }
          
          .ai-type {
            background: #dcfce7;
            color: #166534;
          }
          
          .system-type {
            background: #fef3c7;
            color: #92400e;
          }
          
          .message-time {
            color: #64748b;
            font-size: 12px;
          }
          
          .message-content {
            background: white;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            white-space: pre-wrap;
          }
          
          .user-message .message-content {
            background: #eff6ff;
            border-color: #bfdbfe;
          }
          
          .ai-message .message-content {
            background: #f0fdf4;
            border-color: #bbf7d0;
          }
          
          .confidence {
            margin-top: 10px;
            font-size: 12px;
            color: #059669;
          }
          
          .metadata-section {
            margin-top: 15px;
            padding: 10px;
            background: #f8fafc;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
          }
          
          .metadata-title {
            font-weight: bold;
            color: #475569;
            margin-bottom: 5px;
            font-size: 12px;
          }
          
          .metadata-list {
            list-style: none;
            padding: 0;
            margin: 0;
          }
          
          .metadata-list li {
            padding: 2px 0;
            font-size: 11px;
            color: #64748b;
          }
          
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
            text-align: center;
            color: #64748b;
            font-size: 12px;
          }
          
          .summary-box {
            background: #fef9e7;
            border: 1px solid #fbbf24;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
          }
          
          .summary-title {
            color: #92400e;
            font-weight: bold;
            margin-bottom: 10px;
          }
          
          @media print {
            body { margin: 0; }
            .page-break { page-break-before: always; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${conversationTitle}</h1>
          <p>تقرير الاستشارة القانونية - نظام الذكاء الاصطناعي القانوني</p>
        </div>
        
        <div class="metadata">
          <div class="metadata-grid">
            <div class="metadata-item">
              <span class="metadata-label">تاريخ الاستشارة:</span>
              <span class="metadata-value">${new Date().toLocaleDateString('ar-KW')}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">وقت الاستشارة:</span>
              <span class="metadata-value">${new Date().toLocaleTimeString('ar-KW')}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">اسم المستشير:</span>
              <span class="metadata-value">${userName}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">عدد الرسائل:</span>
              <span class="metadata-value">${totalMessages}</span>
            </div>
          </div>
        </div>
        
        ${aiMessages.length > 0 ? `
        <div class="summary-box">
          <div class="summary-title">ملخص الاستشارة</div>
          <p>تم تقديم ${aiMessages.length} إجابة من المساعد الذكي في هذه الجلسة، استجابة لـ ${userMessages.length} استفسار من المستخدم.</p>
        </div>
        ` : ''}
        
        <div class="conversation">
          ${messages.map((message, index) => `
            <div class="message ${message.type}-message">
              <div class="message-header">
                <span class="message-type ${message.type}-type">
                  ${message.type === 'user' ? 'المستخدم' : 
                    message.type === 'ai' ? 'المساعد الذكي' : 'النظام'}
                </span>
                <span class="message-time">${message.timestamp.toLocaleString('ar-KW')}</span>
              </div>
              
              <div class="message-content">
                ${message.content}
              </div>
              
              ${message.confidence ? `
                <div class="confidence">
                  مستوى الثقة: ${Math.round(message.confidence * 100)}%
                </div>
              ` : ''}
              
              ${message.metadata?.legal_references?.length ? `
                <div class="metadata-section">
                  <div class="metadata-title">المراجع القانونية:</div>
                  <ul class="metadata-list">
                    ${message.metadata.legal_references.map(ref => `<li>• ${ref}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}
              
              ${message.metadata?.suggested_actions?.length ? `
                <div class="metadata-section">
                  <div class="metadata-title">الإجراءات المقترحة:</div>
                  <ul class="metadata-list">
                    ${message.metadata.suggested_actions.map(action => `<li>• ${action}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}
            </div>
            ${index < messages.length - 1 && (index + 1) % 3 === 0 ? '<div class="page-break"></div>' : ''}
          `).join('')}
        </div>
        
        <div class="footer">
          <p>تم إنشاء هذا التقرير بواسطة نظام الذكاء الاصطناعي القانوني</p>
          <p>التاريخ: ${new Date().toLocaleString('ar-KW')}</p>
          <p>هذا التقرير للمراجعة الداخلية ولا يشكل استشارة قانونية رسمية</p>
        </div>
      </body>
      </html>
    `;
    
    // Create a temporary div to hold the HTML content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    document.body.appendChild(tempDiv);
    
    // Return the div for PDF generation, then remove it
    setTimeout(() => {
      document.body.removeChild(tempDiv);
    }, 1000);
    
    return tempDiv;
  };

  return (
    <Button
      onClick={generatePDF}
      disabled={isExporting || messages.length === 0}
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
    >
      {isExporting ? (
        <>
          <FileText className="h-4 w-4 animate-pulse" />
          جاري التصدير...
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          تصدير PDF
        </>
      )}
    </Button>
  );
};

export default PDFExport;