import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EnhancedLegalAIInterface_v2 } from '../EnhancedLegalAIInterface_v2';

// Mock hooks
vi.mock('@/hooks/useLegalAI', () => ({
  useLegalAI: () => ({
    processQuery: vi.fn().mockResolvedValue({
      id: 'test-id',
      query: 'تحليل مخاطر العميل أحمد',
      response: 'تحليل المخاطر: العميل لديه مخاطر متوسطة',
      risk_score: 45.5
    }),
    generateDocument: vi.fn().mockResolvedValue({
      id: 'doc-id',
      document_type: 'legal_warning_kuwait',
      content: 'نموذج إنذار قانوني'
    }),
    analyzeRisk: vi.fn().mockResolvedValue({
      score: 45.5,
      factors: {
        paymentDelay: 15,
        unpaidAmount: 5000,
        violationCount: 2,
        contractHistory: 5,
        litigationHistory: 0
      },
      recommendations: ['مراقبة دورية', 'متابعة المستحقات']
    }),
    isProcessing: false,
    apiKey: 'sk-test-key',
    setApiKey: vi.fn()
  })
}));

vi.mock('@/hooks/useLegalAIStats', () => ({
  useLegalAIStats: () => ({
    data: {
      total_consultations: 150,
      total_documents_generated: 45,
      avg_risk_score: 42.3,
      total_cost_usd: 12.50,
      avg_response_time_ms: 850
    },
    isLoading: false
  })
}));

describe('EnhancedLegalAIInterface_v2', () => {
  let queryClient: QueryClient;
  const mockCompanyId = 'test-company-id';

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
        {component}
      </QueryClientProvider>
    );
  };

  describe('Component Rendering', () => {
    it('should render all tabs', () => {
      renderWithProviders(<EnhancedLegalAIInterface_v2 companyId={mockCompanyId} />);
      
      expect(screen.getByText('استشارة قانونية')).toBeInTheDocument();
      expect(screen.getByText('الوثائق')).toBeInTheDocument();
      expect(screen.getByText('تحليل المخاطر')).toBeInTheDocument();
      expect(screen.getByText('الإعدادات')).toBeInTheDocument();
    });

    it('should display statistics cards', async () => {
      renderWithProviders(<EnhancedLegalAIInterface_v2 companyId={mockCompanyId} />);
      
      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument(); // Total consultations
        expect(screen.getByText('45')).toBeInTheDocument(); // Total documents
      });
    });

    it('should show query input field', () => {
      renderWithProviders(<EnhancedLegalAIInterface_v2 companyId={mockCompanyId} />);
      
      const queryInput = screen.getByPlaceholderText(/اكتب استشارتك القانونية/i);
      expect(queryInput).toBeInTheDocument();
    });
  });

  describe('Query Processing', () => {
    it('should accept user query input', () => {
      renderWithProviders(<EnhancedLegalAIInterface_v2 companyId={mockCompanyId} />);
      
      const queryInput = screen.getByPlaceholderText(/اكتب استشارتك القانونية/i);
      fireEvent.change(queryInput, { target: { value: 'تحليل مخاطر العميل أحمد' } });
      
      expect(queryInput).toHaveValue('تحليل مخاطر العميل أحمد');
    });

    it('should process query when submit button clicked', async () => {
      const { useLegalAI } = await import('@/hooks/useLegalAI');
      const mockProcessQuery = vi.fn();
      
      vi.mocked(useLegalAI).mockReturnValue({
        processQuery: mockProcessQuery,
        generateDocument: vi.fn(),
        analyzeRisk: vi.fn(),
        isProcessing: false,
        apiKey: 'sk-test',
        setApiKey: vi.fn()
      } as any);

      renderWithProviders(<EnhancedLegalAIInterface_v2 companyId={mockCompanyId} />);
      
      const queryInput = screen.getByPlaceholderText(/اكتب استشارتك القانونية/i);
      fireEvent.change(queryInput, { target: { value: 'استعلام قانوني' } });
      
      const submitButton = screen.getByText(/إرسال/i);
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockProcessQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            query: 'استعلام قانوني'
          })
        );
      });
    });

    it('should display processing indicator', async () => {
      vi.mock('@/hooks/useLegalAI', () => ({
        useLegalAI: () => ({
          processQuery: vi.fn(),
          generateDocument: vi.fn(),
          analyzeRisk: vi.fn(),
          isProcessing: true,
          apiKey: 'sk-test',
          setApiKey: vi.fn()
        })
      }));

      renderWithProviders(<EnhancedLegalAIInterface_v2 companyId={mockCompanyId} />);
      
      const submitButton = screen.getByText(/إرسال/i);
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Country Selection', () => {
    it('should allow country selection', () => {
      renderWithProviders(<EnhancedLegalAIInterface_v2 companyId={mockCompanyId} />);
      
      const countrySelect = screen.getByRole('combobox');
      expect(countrySelect).toBeInTheDocument();
    });

    it('should have Kuwait as default country', () => {
      renderWithProviders(<EnhancedLegalAIInterface_v2 companyId={mockCompanyId} />);
      
      const countrySelect = screen.getByRole('combobox');
      expect(countrySelect).toHaveValue('kuwait');
    });

    it('should support Saudi Arabia and Qatar', () => {
      renderWithProviders(<EnhancedLegalAIInterface_v2 companyId={mockCompanyId} />);
      
      const countrySelect = screen.getByRole('combobox');
      fireEvent.click(countrySelect);
      
      expect(screen.getByText('الكويت')).toBeInTheDocument();
      expect(screen.getByText('السعودية')).toBeInTheDocument();
      expect(screen.getByText('قطر')).toBeInTheDocument();
    });
  });

  describe('Document Generation', () => {
    it('should switch to documents tab', () => {
      renderWithProviders(<EnhancedLegalAIInterface_v2 companyId={mockCompanyId} />);
      
      const documentsTab = screen.getByText('الوثائق');
      fireEvent.click(documentsTab);
      
      expect(screen.getByText(/توليد الوثائق القانونية/i)).toBeInTheDocument();
    });

    it('should display document type options', async () => {
      renderWithProviders(<EnhancedLegalAIInterface_v2 companyId={mockCompanyId} />);
      
      const documentsTab = screen.getByText('الوثائق');
      fireEvent.click(documentsTab);
      
      await waitFor(() => {
        expect(screen.getByText(/نوع الوثيقة/i)).toBeInTheDocument();
      });
    });

    it('should generate document when requested', async () => {
      const mockGenerateDocument = vi.fn();
      
      vi.mock('@/hooks/useLegalAI', () => ({
        useLegalAI: () => ({
          processQuery: vi.fn(),
          generateDocument: mockGenerateDocument,
          analyzeRisk: vi.fn(),
          isProcessing: false,
          apiKey: 'sk-test',
          setApiKey: vi.fn()
        })
      }));

      renderWithProviders(<EnhancedLegalAIInterface_v2 companyId={mockCompanyId} />);
      
      const documentsTab = screen.getByText('الوثائق');
      fireEvent.click(documentsTab);
      
      const generateButton = screen.getByText(/توليد الوثيقة/i);
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(mockGenerateDocument).toHaveBeenCalled();
      });
    });
  });

  describe('Risk Analysis', () => {
    it('should switch to risk analysis tab', () => {
      renderWithProviders(<EnhancedLegalAIInterface_v2 companyId={mockCompanyId} />);
      
      const riskTab = screen.getByText('تحليل المخاطر');
      fireEvent.click(riskTab);
      
      expect(screen.getByText(/تحليل المخاطر/i)).toBeInTheDocument();
    });

    it('should display risk factors', async () => {
      renderWithProviders(<EnhancedLegalAIInterface_v2 companyId={mockCompanyId} />);
      
      const riskTab = screen.getByText('تحليل المخاطر');
      fireEvent.click(riskTab);
      
      await waitFor(() => {
        expect(screen.getByText(/تأخير الدفع/i)).toBeInTheDocument();
        expect(screen.getByText(/المبالغ غير المدفوعة/i)).toBeInTheDocument();
        expect(screen.getByText(/المخالفات المرورية/i)).toBeInTheDocument();
      });
    });

    it('should calculate and display risk score', async () => {
      renderWithProviders(<EnhancedLegalAIInterface_v2 companyId={mockCompanyId} />);
      
      const riskTab = screen.getByText('تحليل المخاطر');
      fireEvent.click(riskTab);
      
      await waitFor(() => {
        const riskScore = screen.getByText(/45.5/);
        expect(riskScore).toBeInTheDocument();
      });
    });

    it('should show risk recommendations', async () => {
      renderWithProviders(<EnhancedLegalAIInterface_v2 companyId={mockCompanyId} />);
      
      const riskTab = screen.getByText('تحليل المخاطر');
      fireEvent.click(riskTab);
      
      await waitFor(() => {
        expect(screen.getByText(/التوصيات/i)).toBeInTheDocument();
      });
    });
  });

  describe('API Settings', () => {
    it('should switch to settings tab', () => {
      renderWithProviders(<EnhancedLegalAIInterface_v2 companyId={mockCompanyId} />);
      
      const settingsTab = screen.getByText('الإعدادات');
      fireEvent.click(settingsTab);
      
      expect(screen.getByText(/إعدادات API/i)).toBeInTheDocument();
    });

    it('should allow API key input', async () => {
      renderWithProviders(<EnhancedLegalAIInterface_v2 companyId={mockCompanyId} />);
      
      const settingsTab = screen.getByText('الإعدادات');
      fireEvent.click(settingsTab);
      
      const apiKeyInput = screen.getByPlaceholderText(/sk-/i);
      expect(apiKeyInput).toBeInTheDocument();
    });

    it('should mask API key input', async () => {
      renderWithProviders(<EnhancedLegalAIInterface_v2 companyId={mockCompanyId} />);
      
      const settingsTab = screen.getByText('الإعدادات');
      fireEvent.click(settingsTab);
      
      const apiKeyInput = screen.getByPlaceholderText(/sk-/i);
      expect(apiKeyInput).toHaveAttribute('type', 'password');
    });
  });

  describe('Callback Functions', () => {
    it('should call onDocumentGenerated callback', async () => {
      const onDocumentGenerated = vi.fn();
      
      renderWithProviders(
        <EnhancedLegalAIInterface_v2 
          companyId={mockCompanyId} 
          onDocumentGenerated={onDocumentGenerated}
        />
      );
      
      // Trigger document generation
      const documentsTab = screen.getByText('الوثائق');
      fireEvent.click(documentsTab);
      
      // Mock successful document generation
      await waitFor(() => {
        expect(onDocumentGenerated).toHaveBeenCalled();
      });
    });

    it('should call onRiskAnalysis callback', async () => {
      const onRiskAnalysis = vi.fn();
      
      renderWithProviders(
        <EnhancedLegalAIInterface_v2 
          companyId={mockCompanyId} 
          onRiskAnalysis={onRiskAnalysis}
        />
      );
      
      // Trigger risk analysis
      const riskTab = screen.getByText('تحليل المخاطر');
      fireEvent.click(riskTab);
      
      await waitFor(() => {
        expect(onRiskAnalysis).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message on query failure', async () => {
      vi.mock('@/hooks/useLegalAI', () => ({
        useLegalAI: () => ({
          processQuery: vi.fn().mockRejectedValue(new Error('API Error')),
          generateDocument: vi.fn(),
          analyzeRisk: vi.fn(),
          isProcessing: false,
          apiKey: 'sk-test',
          setApiKey: vi.fn()
        })
      }));

      renderWithProviders(<EnhancedLegalAIInterface_v2 companyId={mockCompanyId} />);
      
      const queryInput = screen.getByPlaceholderText(/اكتب استشارتك القانونية/i);
      fireEvent.change(queryInput, { target: { value: 'test query' } });
      
      const submitButton = screen.getByText(/إرسال/i);
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/خطأ/i)).toBeInTheDocument();
      });
    });

    it('should handle missing API key gracefully', () => {
      vi.mock('@/hooks/useLegalAI', () => ({
        useLegalAI: () => ({
          processQuery: vi.fn(),
          generateDocument: vi.fn(),
          analyzeRisk: vi.fn(),
          isProcessing: false,
          apiKey: '',
          setApiKey: vi.fn()
        })
      }));

      renderWithProviders(<EnhancedLegalAIInterface_v2 companyId={mockCompanyId} />);
      
      const submitButton = screen.getByText(/إرسال/i);
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithProviders(<EnhancedLegalAIInterface_v2 companyId={mockCompanyId} />);
      
      const tabs = screen.getByRole('tablist');
      expect(tabs).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      renderWithProviders(<EnhancedLegalAIInterface_v2 companyId={mockCompanyId} />);
      
      const firstTab = screen.getByText('استشارة قانونية');
      firstTab.focus();
      expect(document.activeElement).toBe(firstTab);
    });
  });
});
