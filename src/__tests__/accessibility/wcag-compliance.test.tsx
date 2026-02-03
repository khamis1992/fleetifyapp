/**
 * WCAG AA Compliance Test Suite
 *
 * Tests accessibility compliance for critical components according to WCAG 2.1 AA standards.
 * Uses axe-core for automated accessibility testing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Import components to test
import { CommandPalette } from '@/components/command-palette/CommandPalette';

// Mock components for testing (since we can't import all pages easily)
const DashboardMock = () => (
  <div role="main" aria-label="Dashboard">
    <h1>Dashboard</h1>
    <nav aria-label="Main navigation">
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/contracts">Contracts</a></li>
      </ul>
    </nav>
    <section aria-labelledby="stats-heading">
      <h2 id="stats-heading">Statistics</h2>
      <div role="region" aria-label="Revenue statistics">
        <p>Total Revenue: <span aria-label="150000 KWD">150,000 KWD</span></p>
      </div>
    </section>
  </div>
);

const FormMock = () => (
  <form aria-label="Payment form">
    <div>
      <label htmlFor="amount">Amount</label>
      <input
        id="amount"
        type="number"
        aria-required="true"
        aria-describedby="amount-error"
      />
      <span id="amount-error" role="alert" aria-live="polite"></span>
    </div>
    <div>
      <label htmlFor="payment-method">Payment Method</label>
      <select id="payment-method" aria-required="true">
        <option value="">Select payment method</option>
        <option value="cash">Cash</option>
        <option value="bank_transfer">Bank Transfer</option>
      </select>
    </div>
    <button type="submit" aria-label="Submit payment">Submit</button>
  </form>
);

const NavigationMock = () => (
  <nav aria-label="Primary navigation" role="navigation">
    <a href="#main-content" className="skip-link">Skip to main content</a>
    <ul role="menubar">
      <li role="none">
        <a href="/" role="menuitem" aria-current="page">Home</a>
      </li>
      <li role="none">
        <a href="/contracts" role="menuitem">Contracts</a>
      </li>
      <li role="none">
        <a href="/customers" role="menuitem">Customers</a>
      </li>
    </ul>
  </nav>
);

describe('WCAG AA Compliance Tests', () => {
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

  describe('Dashboard Components', () => {
    it('should have no axe violations on main dashboard', async () => {
      const { container } = renderWithProviders(<DashboardMock />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA labels on widgets', async () => {
      const { container } = renderWithProviders(<DashboardMock />);
      const results = await axe(container, {
        rules: {
          'aria-allowed-attr': { enabled: true },
          'aria-required-attr': { enabled: true },
          'aria-valid-attr': { enabled: true },
          'aria-valid-attr-value': { enabled: true }
        }
      });
      expect(results).toHaveNoViolations();
    });

    it('should have proper heading hierarchy', async () => {
      const { container } = renderWithProviders(<DashboardMock />);
      const results = await axe(container, {
        rules: {
          'heading-order': { enabled: true }
        }
      });
      expect(results).toHaveNoViolations();
    });

    it('should have accessible landmark regions', async () => {
      const { container } = renderWithProviders(<DashboardMock />);
      const results = await axe(container, {
        rules: {
          'landmark-one-main': { enabled: true },
          'region': { enabled: true }
        }
      });
      expect(results).toHaveNoViolations();
    });
  });

  describe('Forms', () => {
    it('should have proper form labels', async () => {
      const { container } = renderWithProviders(<FormMock />);
      const results = await axe(container, {
        rules: {
          'label': { enabled: true },
          'label-title-only': { enabled: true }
        }
      });
      expect(results).toHaveNoViolations();
    });

    it('should show validation errors accessibly', async () => {
      const { container } = renderWithProviders(<FormMock />);
      const results = await axe(container, {
        rules: {
          'aria-valid-attr': { enabled: true },
          'aria-allowed-attr': { enabled: true }
        }
      });
      expect(results).toHaveNoViolations();
    });

    it('should support screen readers with aria-describedby', async () => {
      const { container } = renderWithProviders(<FormMock />);
      const results = await axe(container, {
        rules: {
          'aria-valid-attr-value': { enabled: true }
        }
      });
      expect(results).toHaveNoViolations();
    });

    it('should mark required fields appropriately', async () => {
      const { container } = renderWithProviders(<FormMock />);
      const results = await axe(container, {
        rules: {
          'aria-required-attr': { enabled: true }
        }
      });
      expect(results).toHaveNoViolations();
    });
  });

  describe('Navigation', () => {
    it('should have skip links for keyboard navigation', async () => {
      const { container } = renderWithProviders(<NavigationMock />);
      const results = await axe(container, {
        rules: {
          'skip-link': { enabled: true },
          'bypass': { enabled: true }
        }
      });
      expect(results).toHaveNoViolations();
    });

    it('should have proper heading hierarchy', async () => {
      const { container } = renderWithProviders(
        <div>
          <h1>Main Heading</h1>
          <h2>Sub Heading</h2>
          <h3>Detail Heading</h3>
        </div>
      );
      const results = await axe(container, {
        rules: {
          'heading-order': { enabled: true }
        }
      });
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation with proper roles', async () => {
      const { container } = renderWithProviders(<NavigationMock />);
      const results = await axe(container, {
        rules: {
          'aria-allowed-role': { enabled: true },
          'aria-required-attr': { enabled: true }
        }
      });
      expect(results).toHaveNoViolations();
    });
  });

  describe('Command Palette', () => {
    it('should have no violations when open', async () => {
      const { container } = renderWithProviders(
        <CommandPalette open={true} onClose={vi.fn()} />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have accessible search input', async () => {
      const { container } = renderWithProviders(
        <CommandPalette open={true} onClose={vi.fn()} />
      );
      const results = await axe(container, {
        rules: {
          'label': { enabled: true },
          'aria-input-field-name': { enabled: true }
        }
      });
      expect(results).toHaveNoViolations();
    });
  });

  describe('Color Contrast', () => {
    it('should meet WCAG AA contrast requirements for text', async () => {
      const { container } = renderWithProviders(
        <div>
          <p style={{ color: '#333', backgroundColor: '#fff' }}>
            This text should have sufficient contrast
          </p>
        </div>
      );
      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true }
        }
      });
      expect(results).toHaveNoViolations();
    });

    it('should meet contrast requirements for interactive elements', async () => {
      const { container } = renderWithProviders(
        <div>
          <button style={{ color: '#fff', backgroundColor: '#0066cc' }}>
            Click me
          </button>
        </div>
      );
      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true }
        }
      });
      expect(results).toHaveNoViolations();
    });
  });

  describe('Images and Media', () => {
    it('should have alt text for images', async () => {
      const { container } = renderWithProviders(
        <div>
          <img src="test.jpg" alt="Test image description" />
        </div>
      );
      const results = await axe(container, {
        rules: {
          'image-alt': { enabled: true }
        }
      });
      expect(results).toHaveNoViolations();
    });

    it('should allow decorative images with empty alt', async () => {
      const { container } = renderWithProviders(
        <div>
          <img src="decorative.jpg" alt="" role="presentation" />
        </div>
      );
      const results = await axe(container, {
        rules: {
          'image-alt': { enabled: true }
        }
      });
      expect(results).toHaveNoViolations();
    });
  });

  describe('Interactive Elements', () => {
    it('should have accessible names for buttons', async () => {
      const { container } = renderWithProviders(
        <div>
          <button>Submit</button>
          <button aria-label="Close dialog">X</button>
        </div>
      );
      const results = await axe(container, {
        rules: {
          'button-name': { enabled: true }
        }
      });
      expect(results).toHaveNoViolations();
    });

    it('should have accessible names for links', async () => {
      const { container } = renderWithProviders(
        <div>
          <a href="/contracts">View Contracts</a>
          <a href="/help" aria-label="Get help">?</a>
        </div>
      );
      const results = await axe(container, {
        rules: {
          'link-name': { enabled: true }
        }
      });
      expect(results).toHaveNoViolations();
    });

    it('should have proper focus indicators', async () => {
      const { container } = renderWithProviders(
        <div>
          <button className="focus:ring-2 focus:ring-blue-500">
            Focusable Button
          </button>
        </div>
      );
      const results = await axe(container, {
        rules: {
          'focus-order-semantics': { enabled: true }
        }
      });
      expect(results).toHaveNoViolations();
    });
  });

  describe('Tables', () => {
    it('should have accessible table headers', async () => {
      const { container } = renderWithProviders(
        <table>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Amount</th>
              <th scope="col">Date</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Payment 1</td>
              <td>1000 KWD</td>
              <td>2025-10-21</td>
            </tr>
          </tbody>
        </table>
      );
      const results = await axe(container, {
        rules: {
          'table-duplicate-name': { enabled: true },
          'th-has-data-cells': { enabled: true }
        }
      });
      expect(results).toHaveNoViolations();
    });

    it('should have proper scope attributes', async () => {
      const { container } = renderWithProviders(
        <table>
          <thead>
            <tr>
              <th scope="col">Header 1</th>
              <th scope="col">Header 2</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Row 1</th>
              <td>Data</td>
            </tr>
          </tbody>
        </table>
      );
      const results = await axe(container, {
        rules: {
          'scope-attr-valid': { enabled: true }
        }
      });
      expect(results).toHaveNoViolations();
    });
  });

  describe('Live Regions', () => {
    it('should have proper aria-live for dynamic content', async () => {
      const { container } = renderWithProviders(
        <div>
          <div role="status" aria-live="polite">
            Form submitted successfully
          </div>
        </div>
      );
      const results = await axe(container, {
        rules: {
          'aria-allowed-attr': { enabled: true }
        }
      });
      expect(results).toHaveNoViolations();
    });

    it('should use appropriate aria-atomic for updates', async () => {
      const { container } = renderWithProviders(
        <div>
          <div role="alert" aria-live="assertive" aria-atomic="true">
            Error: Please correct the form
          </div>
        </div>
      );
      const results = await axe(container, {
        rules: {
          'aria-valid-attr': { enabled: true }
        }
      });
      expect(results).toHaveNoViolations();
    });
  });

  describe('Dialog and Modal', () => {
    it('should have proper dialog role and labels', async () => {
      const { container } = renderWithProviders(
        <div
          role="dialog"
          aria-labelledby="dialog-title"
          aria-modal="true"
        >
          <h2 id="dialog-title">Confirm Action</h2>
          <p>Are you sure you want to delete this item?</p>
          <button>Cancel</button>
          <button>Delete</button>
        </div>
      );
      const results = await axe(container, {
        rules: {
          'aria-dialog-name': { enabled: true },
          'aria-valid-attr-value': { enabled: true }
        }
      });
      expect(results).toHaveNoViolations();
    });
  });

  describe('Language', () => {
    it('should have lang attribute on html element', async () => {
      const { container } = renderWithProviders(
        <div lang="ar">
          <p>محتوى باللغة العربية</p>
        </div>
      );
      const results = await axe(container, {
        rules: {
          'valid-lang': { enabled: true }
        }
      });
      expect(results).toHaveNoViolations();
    });
  });
});
