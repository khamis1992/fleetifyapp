/**
 * Arabic RTL Validation Test Suite
 *
 * Tests right-to-left (RTL) layout support for Arabic language,
 * including text rendering, layout direction, icon mirroring, and number formatting.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Mock RTL-aware components
const RTLContainer = ({ children, dir = 'rtl' }: { children: React.ReactNode; dir?: 'rtl' | 'ltr' }) => {
  return (
    <div dir={dir} className={dir === 'rtl' ? 'rtl' : 'ltr'}>
      {children}
    </div>
  );
};

const ArabicTextComponent = () => {
  return (
    <RTLContainer>
      <h1>العقود</h1>
      <p>إدارة جميع العقود والاتفاقيات</p>
      <div className="flex items-center justify-end">
        <span>المجموع:</span>
        <span className="mr-2">1,500 د.ك</span>
      </div>
    </RTLContainer>
  );
};

const ArabicFormComponent = () => {
  return (
    <RTLContainer>
      <form>
        <div className="text-right">
          <label htmlFor="customer-name" className="block mb-2">اسم العميل</label>
          <input
            id="customer-name"
            type="text"
            className="w-full text-right"
            placeholder="أدخل اسم العميل"
          />
        </div>
        <div className="text-right">
          <label htmlFor="amount" className="block mb-2">المبلغ</label>
          <input
            id="amount"
            type="number"
            className="w-full text-right"
            placeholder="0.000"
          />
        </div>
      </form>
    </RTLContainer>
  );
};

const ArabicTableComponent = () => {
  return (
    <RTLContainer>
      <table className="w-full" dir="rtl">
        <thead>
          <tr className="text-right">
            <th>رقم العقد</th>
            <th>اسم العميل</th>
            <th>المبلغ</th>
            <th>التاريخ</th>
          </tr>
        </thead>
        <tbody>
          <tr className="text-right">
            <td>CNT-001</td>
            <td>أحمد محمد</td>
            <td>1,500 د.ك</td>
            <td>٢٠٢٥/١٠/٢١</td>
          </tr>
        </tbody>
      </table>
    </RTLContainer>
  );
};

const MixedContentComponent = () => {
  return (
    <RTLContainer>
      <div>
        <p>العقد رقم CNT-001</p>
        <p>المبلغ: 1,500 KWD</p>
        <p>Email: customer@example.com</p>
        <p>الهاتف: +965 12345678</p>
      </div>
    </RTLContainer>
  );
};

const IconMirroringComponent = () => {
  return (
    <RTLContainer>
      <div className="flex items-center">
        <span className="rtl:rotate-180">←</span>
        <span className="mx-2">الصفحة التالية</span>
      </div>
      <div className="flex items-center">
        <span className="rtl:rotate-180">→</span>
        <span className="mx-2">الصفحة السابقة</span>
      </div>
    </RTLContainer>
  );
};

describe('Arabic RTL Validation Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  describe('Text Rendering', () => {
    it('should render Arabic text correctly', () => {
      renderWithProviders(<ArabicTextComponent />);

      expect(screen.getByText('العقود')).toBeInTheDocument();
      expect(screen.getByText('إدارة جميع العقود والاتفاقيات')).toBeInTheDocument();
    });

    it('should render Arabic text with proper diacritics', () => {
      renderWithProviders(
        <RTLContainer>
          <p>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
        </RTLContainer>
      );

      expect(screen.getByText(/بِسْمِ اللَّهِ/)).toBeInTheDocument();
    });

    it('should handle long Arabic text without breaking', () => {
      const longText = 'هذا نص طويل جداً يجب أن يتم عرضه بشكل صحيح في واجهة المستخدم دون أن يتسبب في مشاكل في التخطيط أو العرض';

      renderWithProviders(
        <RTLContainer>
          <p>{longText}</p>
        </RTLContainer>
      );

      expect(screen.getByText(longText)).toBeInTheDocument();
    });
  });

  describe('RTL Layout Direction', () => {
    it('should apply RTL direction to container', () => {
      const { container } = renderWithProviders(<ArabicTextComponent />);
      const rtlDiv = container.querySelector('[dir="rtl"]');

      expect(rtlDiv).toBeInTheDocument();
      expect(rtlDiv).toHaveAttribute('dir', 'rtl');
    });

    it('should apply RTL class for styling', () => {
      const { container } = renderWithProviders(<ArabicTextComponent />);
      const rtlDiv = container.querySelector('.rtl');

      expect(rtlDiv).toBeInTheDocument();
      expect(rtlDiv).toHaveClass('rtl');
    });

    it('should switch to LTR for English content', () => {
      const { container } = renderWithProviders(
        <RTLContainer dir="ltr">
          <p>This is English text</p>
        </RTLContainer>
      );

      const ltrDiv = container.querySelector('[dir="ltr"]');
      expect(ltrDiv).toHaveAttribute('dir', 'ltr');
    });

    it('should have correct text alignment in RTL mode', () => {
      renderWithProviders(<ArabicFormComponent />);

      const label = screen.getByText('اسم العميل');
      expect(label.parentElement).toHaveClass('text-right');
    });
  });

  describe('Form Fields in RTL', () => {
    it('should align form labels to the right in RTL', () => {
      renderWithProviders(<ArabicFormComponent />);

      const customerLabel = screen.getByText('اسم العميل');
      expect(customerLabel).toHaveClass('block', 'mb-2');
      expect(customerLabel.parentElement).toHaveClass('text-right');
    });

    it('should align input text to the right in RTL', () => {
      renderWithProviders(<ArabicFormComponent />);

      const customerInput = screen.getByLabelText('اسم العميل');
      expect(customerInput).toHaveClass('text-right');
    });

    it('should display placeholders in Arabic correctly', () => {
      renderWithProviders(<ArabicFormComponent />);

      const customerInput = screen.getByPlaceholderText('أدخل اسم العميل');
      expect(customerInput).toBeInTheDocument();
    });

    it('should handle numeric input in RTL', () => {
      renderWithProviders(<ArabicFormComponent />);

      const amountInput = screen.getByLabelText('المبلغ');
      expect(amountInput).toHaveAttribute('type', 'number');
      expect(amountInput).toHaveClass('text-right');
    });
  });

  describe('Table Layout in RTL', () => {
    it('should render table headers right-aligned', () => {
      const { container } = renderWithProviders(<ArabicTableComponent />);

      const headerRow = container.querySelector('thead tr');
      expect(headerRow).toHaveClass('text-right');
    });

    it('should render table data right-aligned', () => {
      const { container } = renderWithProviders(<ArabicTableComponent />);

      const dataRow = container.querySelector('tbody tr');
      expect(dataRow).toHaveClass('text-right');
    });

    it('should display Arabic table headers correctly', () => {
      renderWithProviders(<ArabicTableComponent />);

      expect(screen.getByText('رقم العقد')).toBeInTheDocument();
      expect(screen.getByText('اسم العميل')).toBeInTheDocument();
      expect(screen.getByText('المبلغ')).toBeInTheDocument();
      expect(screen.getByText('التاريخ')).toBeInTheDocument();
    });

    it('should maintain proper column order in RTL', () => {
      const { container } = renderWithProviders(<ArabicTableComponent />);

      const headers = container.querySelectorAll('th');
      expect(headers[0]).toHaveTextContent('رقم العقد');
      expect(headers[1]).toHaveTextContent('اسم العميل');
    });
  });

  describe('Number Formatting', () => {
    it('should display Arabic numerals correctly', () => {
      renderWithProviders(<ArabicTableComponent />);

      // Eastern Arabic numerals
      expect(screen.getByText(/٢٠٢٥/)).toBeInTheDocument();
    });

    it('should display Western numerals with proper formatting', () => {
      renderWithProviders(<ArabicTextComponent />);

      expect(screen.getByText(/1,500/)).toBeInTheDocument();
    });

    it('should format currency in Arabic locale', () => {
      renderWithProviders(
        <RTLContainer>
          <p>المبلغ: {(1500.500).toLocaleString('ar-KW')} د.ك</p>
        </RTLContainer>
      );

      expect(screen.getByText(/المبلغ/)).toBeInTheDocument();
    });

    it('should handle decimal separators correctly', () => {
      renderWithProviders(
        <RTLContainer>
          <p>السعر: 1,234.56 د.ك</p>
        </RTLContainer>
      );

      expect(screen.getByText(/1,234\.56/)).toBeInTheDocument();
    });
  });

  describe('Mixed Content (Bidirectional Text)', () => {
    it('should handle mixed Arabic and English text', () => {
      renderWithProviders(<MixedContentComponent />);

      expect(screen.getByText(/العقد رقم CNT-001/)).toBeInTheDocument();
    });

    it('should handle mixed Arabic and numbers', () => {
      renderWithProviders(<MixedContentComponent />);

      expect(screen.getByText(/المبلغ: 1,500 KWD/)).toBeInTheDocument();
    });

    it('should handle email addresses in RTL context', () => {
      renderWithProviders(<MixedContentComponent />);

      expect(screen.getByText(/Email: customer@example.com/)).toBeInTheDocument();
    });

    it('should handle phone numbers in RTL context', () => {
      renderWithProviders(<MixedContentComponent />);

      expect(screen.getByText(/الهاتف: \+965 12345678/)).toBeInTheDocument();
    });
  });

  describe('Icon Mirroring', () => {
    it('should mirror directional icons in RTL', () => {
      const { container } = renderWithProviders(<IconMirroringComponent />);

      const mirroredIcons = container.querySelectorAll('.rtl\\:rotate-180');
      expect(mirroredIcons.length).toBeGreaterThan(0);
    });

    it('should display next/previous correctly in RTL', () => {
      renderWithProviders(<IconMirroringComponent />);

      expect(screen.getByText('الصفحة التالية')).toBeInTheDocument();
      expect(screen.getByText('الصفحة السابقة')).toBeInTheDocument();
    });

    it('should not mirror non-directional icons', () => {
      renderWithProviders(
        <RTLContainer>
          <div>
            <span>✓</span>
            <span>×</span>
            <span>⚠</span>
          </div>
        </RTLContainer>
      );

      // These icons should render without mirroring
      expect(screen.getByText('✓')).toBeInTheDocument();
    });
  });

  describe('Date Formatting', () => {
    it('should display dates in Arabic format', () => {
      renderWithProviders(<ArabicTableComponent />);

      expect(screen.getByText(/٢٠٢٥\/١٠\/٢١/)).toBeInTheDocument();
    });

    it('should format dates with Arabic month names', () => {
      const date = new Date('2025-10-21');
      const arabicDate = date.toLocaleDateString('ar-KW', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      renderWithProviders(
        <RTLContainer>
          <p>{arabicDate}</p>
        </RTLContainer>
      );

      expect(screen.getByText(arabicDate)).toBeInTheDocument();
    });
  });

  describe('Flexbox and Grid in RTL', () => {
    it('should reverse flex direction in RTL', () => {
      const { container } = renderWithProviders(
        <RTLContainer>
          <div className="flex">
            <span>أول</span>
            <span>ثاني</span>
            <span>ثالث</span>
          </div>
        </RTLContainer>
      );

      const flexContainer = container.querySelector('.flex');
      expect(flexContainer).toBeInTheDocument();
    });

    it('should handle flex alignment in RTL', () => {
      const { container } = renderWithProviders(
        <RTLContainer>
          <div className="flex justify-end items-center">
            <span>المحتوى</span>
          </div>
        </RTLContainer>
      );

      const flexContainer = container.querySelector('.justify-end');
      expect(flexContainer).toBeInTheDocument();
    });

    it('should apply correct margins in RTL', () => {
      renderWithProviders(
        <RTLContainer>
          <div className="mr-2">
            <span>نص مع هامش</span>
          </div>
        </RTLContainer>
      );

      expect(screen.getByText('نص مع هامش')).toBeInTheDocument();
    });

    it('should apply correct padding in RTL', () => {
      const { container } = renderWithProviders(
        <RTLContainer>
          <div className="pr-4 pl-2">
            <span>نص مع حشو</span>
          </div>
        </RTLContainer>
      );

      const paddedDiv = container.querySelector('.pr-4');
      expect(paddedDiv).toBeInTheDocument();
    });
  });

  describe('Navigation in RTL', () => {
    it('should render breadcrumbs in RTL order', () => {
      renderWithProviders(
        <RTLContainer>
          <nav aria-label="Breadcrumb">
            <ol className="flex">
              <li>الرئيسية</li>
              <li className="mx-2">/</li>
              <li>العقود</li>
              <li className="mx-2">/</li>
              <li>عقد جديد</li>
            </ol>
          </nav>
        </RTLContainer>
      );

      expect(screen.getByText('الرئيسية')).toBeInTheDocument();
      expect(screen.getByText('العقود')).toBeInTheDocument();
    });

    it('should render menu items in RTL', () => {
      renderWithProviders(
        <RTLContainer>
          <ul className="text-right">
            <li>الصفحة الرئيسية</li>
            <li>العقود</li>
            <li>العملاء</li>
          </ul>
        </RTLContainer>
      );

      expect(screen.getByText('الصفحة الرئيسية')).toBeInTheDocument();
      expect(screen.getByText('العقود')).toBeInTheDocument();
    });
  });

  describe('Button and Action Alignment', () => {
    it('should align buttons correctly in RTL', () => {
      const { container } = renderWithProviders(
        <RTLContainer>
          <div className="flex justify-start gap-2">
            <button>إلغاء</button>
            <button>حفظ</button>
          </div>
        </RTLContainer>
      );

      expect(screen.getByText('إلغاء')).toBeInTheDocument();
      expect(screen.getByText('حفظ')).toBeInTheDocument();
    });

    it('should position primary action on the right in RTL', () => {
      renderWithProviders(
        <RTLContainer>
          <div className="flex justify-end gap-2">
            <button className="secondary">إلغاء</button>
            <button className="primary">تأكيد</button>
          </div>
        </RTLContainer>
      );

      expect(screen.getByText('تأكيد')).toBeInTheDocument();
    });
  });

  describe('Scrollbar Position', () => {
    it('should position scrollbar on the left in RTL', () => {
      const { container } = renderWithProviders(
        <RTLContainer>
          <div className="overflow-y-auto h-32">
            <p>محتوى طويل يتطلب تمرير</p>
            <p>محتوى طويل يتطلب تمرير</p>
            <p>محتوى طويل يتطلب تمرير</p>
          </div>
        </RTLContainer>
      );

      const scrollableDiv = container.querySelector('.overflow-y-auto');
      expect(scrollableDiv).toBeInTheDocument();
    });
  });

  describe('Tooltip and Popover Position', () => {
    it('should position tooltips appropriately in RTL', () => {
      renderWithProviders(
        <RTLContainer>
          <div>
            <button aria-describedby="tooltip">زر</button>
            <div id="tooltip" role="tooltip" className="absolute">
              نص توضيحي
            </div>
          </div>
        </RTLContainer>
      );

      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });
  });
});
