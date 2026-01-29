/**
 * DocumentItem Component Tests
 * اختبارات مكون عنصر المستند
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DocumentItem } from '../../components/DocumentList/DocumentItem';
import type { DocumentState } from '../../store';

// Mock the loading spinner component
vi.mock('@/components/ui/loading-spinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
}));

describe('DocumentItem', () => {
  const baseDocument: DocumentState = {
    id: 'memo',
    name: 'المذكرة الشارحة',
    description: 'مذكرة شارحة للدعوى',
    status: 'pending',
    type: 'mandatory',
    category: 'generated',
    url: null,
    htmlContent: null,
    error: null,
    generatedAt: null,
  };
  
  it('renders pending state correctly', () => {
    render(
      <DocumentItem
        document={baseDocument}
        onGenerate={vi.fn()}
        index={0}
      />
    );
    
    expect(screen.getByText('المذكرة الشارحة')).toBeInTheDocument();
    expect(screen.getByText('مذكرة شارحة للدعوى')).toBeInTheDocument();
    expect(screen.getByText('توليد')).toBeInTheDocument();
  });
  
  it('renders ready state correctly', () => {
    const readyDocument: DocumentState = {
      ...baseDocument,
      status: 'ready',
      url: 'blob:test',
    };
    
    render(
      <DocumentItem
        document={readyDocument}
        index={0}
      />
    );
    
    expect(screen.getByText('المذكرة الشارحة')).toBeInTheDocument();
    expect(screen.getByTitle('معاينة')).toBeInTheDocument();
  });
  
  it('renders generating state correctly', () => {
    const generatingDocument: DocumentState = {
      ...baseDocument,
      status: 'generating',
    };
    
    render(
      <DocumentItem
        document={generatingDocument}
        index={0}
      />
    );
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
  
  it('calls onGenerate when generate button is clicked', () => {
    const onGenerate = vi.fn();
    
    render(
      <DocumentItem
        document={baseDocument}
        onGenerate={onGenerate}
        index={0}
      />
    );
    
    fireEvent.click(screen.getByText('توليد'));
    expect(onGenerate).toHaveBeenCalledTimes(1);
  });
  
  it('renders PDF and Word buttons for memo document', () => {
    const readyMemo: DocumentState = {
      ...baseDocument,
      status: 'ready',
      url: 'blob:test',
    };
    
    const onDownloadPdf = vi.fn();
    const onDownloadDocx = vi.fn();
    
    render(
      <DocumentItem
        document={readyMemo}
        onDownloadPdf={onDownloadPdf}
        onDownloadDocx={onDownloadDocx}
        index={0}
      />
    );
    
    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByText('Word')).toBeInTheDocument();
  });
});
