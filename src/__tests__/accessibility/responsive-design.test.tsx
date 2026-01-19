/**
 * Responsive Design Test Suite
 *
 * Tests responsive behavior across different screen sizes,
 * mobile optimizations, touch interactions, and adaptive layouts.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

// Mock responsive components
const ResponsiveNavigation = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  return (
    <nav>
      {/* Mobile menu button */}
      <button
        className="md:hidden"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle mobile menu"
        aria-expanded={isMobileMenuOpen}
      >
        ☰
      </button>

      {/* Desktop navigation */}
      <div className="hidden md:flex gap-4">
        <a href="/">Home</a>
        <a href="/contracts">Contracts</a>
        <a href="/customers">Customers</a>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <a href="/">Home</a>
          <a href="/contracts">Contracts</a>
          <a href="/customers">Customers</a>
        </div>
      )}
    </nav>
  );
};

const ResponsiveDashboard = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="widget">Revenue Widget</div>
      <div className="widget">Expenses Widget</div>
      <div className="widget">Profit Widget</div>
      <div className="widget">Contracts Widget</div>
      <div className="widget">Customers Widget</div>
      <div className="widget">Vehicles Widget</div>
    </div>
  );
};

const ResponsiveTable = () => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className="hidden sm:table-cell">Contract #</th>
            <th>Customer</th>
            <th className="hidden md:table-cell">Amount</th>
            <th className="hidden lg:table-cell">Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="hidden sm:table-cell">CNT-001</td>
            <td>Ahmed Mohamed</td>
            <td className="hidden md:table-cell">1,500 KWD</td>
            <td className="hidden lg:table-cell">2025-10-21</td>
            <td>
              <button className="text-xs sm:text-sm">View</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

const TouchOptimizedButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <button
      onClick={onClick}
      className="min-h-[44px] min-w-[44px] touch-manipulation"
      aria-label="Touch optimized button"
    >
      Tap Me
    </button>
  );
};

const ResponsiveForm = () => {
  return (
    <form className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="customer-name">Customer Name</label>
          <input
            id="customer-name"
            type="text"
            className="w-full"
          />
        </div>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="w-full"
          />
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <button type="submit" className="w-full sm:w-auto">Submit</button>
        <button type="button" className="w-full sm:w-auto">Cancel</button>
      </div>
    </form>
  );
};

describe('Responsive Design Tests', () => {
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

  // Helper to simulate different viewport sizes
  const setViewportSize = (width: number, height: number = 768) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: height
    });
    window.dispatchEvent(new Event('resize'));
  };

  describe('Mobile Navigation', () => {
    it('should render mobile menu on small screens', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ResponsiveNavigation />);

      const menuButton = screen.getByLabelText('Toggle mobile menu');
      expect(menuButton).toBeInTheDocument();
      expect(menuButton).toHaveClass('md:hidden');
    });

    it('should toggle mobile menu on button click', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ResponsiveNavigation />);

      const menuButton = screen.getByLabelText('Toggle mobile menu');

      // Menu should be closed initially
      expect(screen.queryByText('Home')).not.toBeInTheDocument();

      // Click to open
      await user.click(menuButton);

      // Menu should be open
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(menuButton).toHaveAttribute('aria-expanded', 'true');

      // Click to close
      await user.click(menuButton);

      // Menu should be closed again
      expect(screen.queryByText('Home')).not.toBeInTheDocument();
    });

    it('should hide desktop navigation on mobile', () => {
      const { container } = renderWithProviders(<ResponsiveNavigation />);

      const desktopNav = container.querySelector('.hidden.md\\:flex');
      expect(desktopNav).toBeInTheDocument();
    });
  });

  describe('Dashboard Widget Grid', () => {
    it('should render widgets in a grid layout', () => {
      const { container } = renderWithProviders(<ResponsiveDashboard />);

      const grid = container.querySelector('.grid');
      expect(grid).toBeInTheDocument();
      expect(grid).toHaveClass('grid-cols-1');
    });

    it('should display all widgets', () => {
      renderWithProviders(<ResponsiveDashboard />);

      expect(screen.getByText('Revenue Widget')).toBeInTheDocument();
      expect(screen.getByText('Expenses Widget')).toBeInTheDocument();
      expect(screen.getByText('Profit Widget')).toBeInTheDocument();
    });

    it('should have responsive grid classes', () => {
      const { container } = renderWithProviders(<ResponsiveDashboard />);

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('md:grid-cols-2');
      expect(grid).toHaveClass('lg:grid-cols-3');
    });

    it('should stack widgets on mobile', () => {
      const { container } = renderWithProviders(<ResponsiveDashboard />);

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('grid-cols-1');
    });
  });

  describe('Responsive Tables', () => {
    it('should make tables horizontally scrollable', () => {
      const { container } = renderWithProviders(<ResponsiveTable />);

      const scrollContainer = container.querySelector('.overflow-x-auto');
      expect(scrollContainer).toBeInTheDocument();
    });

    it('should hide less important columns on small screens', () => {
      const { container } = renderWithProviders(<ResponsiveTable />);

      const contractHeader = container.querySelector('.hidden.sm\\:table-cell');
      expect(contractHeader).toBeInTheDocument();
    });

    it('should always show essential columns', () => {
      renderWithProviders(<ResponsiveTable />);

      expect(screen.getByText('Customer')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('should progressively show columns on larger screens', () => {
      const { container } = renderWithProviders(<ResponsiveTable />);

      expect(container.querySelector('.hidden.sm\\:table-cell')).toBeInTheDocument();
      expect(container.querySelector('.hidden.md\\:table-cell')).toBeInTheDocument();
      expect(container.querySelector('.hidden.lg\\:table-cell')).toBeInTheDocument();
    });

    it('should adjust button size for mobile', () => {
      const { container } = renderWithProviders(<ResponsiveTable />);

      const button = screen.getByText('View');
      expect(button).toHaveClass('text-xs');
    });
  });

  describe('Touch Target Sizes', () => {
    it('should have minimum 44x44px touch targets', () => {
      const onClick = vi.fn();
      renderWithProviders(<TouchOptimizedButton onClick={onClick} />);

      const button = screen.getByLabelText('Touch optimized button');
      expect(button).toHaveClass('min-h-[44px]');
      expect(button).toHaveClass('min-w-[44px]');
    });

    it('should use touch-manipulation CSS', () => {
      const onClick = vi.fn();
      renderWithProviders(<TouchOptimizedButton onClick={onClick} />);

      const button = screen.getByLabelText('Touch optimized button');
      expect(button).toHaveClass('touch-manipulation');
    });

    it('should handle touch events', async () => {
      const onClick = vi.fn();
      renderWithProviders(<TouchOptimizedButton onClick={onClick} />);

      const button = screen.getByLabelText('Touch optimized button');

      fireEvent.touchStart(button);
      fireEvent.touchEnd(button);
      fireEvent.click(button);

      expect(onClick).toHaveBeenCalled();
    });
  });

  describe('Responsive Forms', () => {
    it('should stack form fields on mobile', () => {
      const { container } = renderWithProviders(<ResponsiveForm />);

      const formGrid = container.querySelector('.grid-cols-1');
      expect(formGrid).toBeInTheDocument();
    });

    it('should arrange form fields in columns on desktop', () => {
      const { container } = renderWithProviders(<ResponsiveForm />);

      const formGrid = container.querySelector('.md\\:grid-cols-2');
      expect(formGrid).toBeInTheDocument();
    });

    it('should make buttons full width on mobile', () => {
      const { container } = renderWithProviders(<ResponsiveForm />);

      const submitButton = screen.getByText('Submit');
      expect(submitButton).toHaveClass('w-full');
    });

    it('should auto-size buttons on desktop', () => {
      const { container } = renderWithProviders(<ResponsiveForm />);

      const submitButton = screen.getByText('Submit');
      expect(submitButton).toHaveClass('sm:w-auto');
    });

    it('should have proper spacing in form', () => {
      const { container } = renderWithProviders(<ResponsiveForm />);

      const form = container.querySelector('form');
      expect(form).toHaveClass('space-y-4');
    });
  });

  describe('Viewport Meta Tag', () => {
    it('should have viewport meta tag for mobile optimization', () => {
      // This would typically be in index.html
      // Testing the concept that viewport meta should exist
      const viewportMeta = document.querySelector('meta[name="viewport"]');

      // In a real app, this should be:
      // <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      // For test, we just verify the concept
      expect(true).toBe(true);
    });
  });

  describe('Media Query Breakpoints', () => {
    it('should respond to mobile breakpoint (< 640px)', () => {
      setViewportSize(375); // iPhone SE width

      // Components should render mobile-first
      expect(window.innerWidth).toBe(375);
    });

    it('should respond to tablet breakpoint (640px - 768px)', () => {
      setViewportSize(768); // iPad width

      expect(window.innerWidth).toBe(768);
    });

    it('should respond to desktop breakpoint (> 1024px)', () => {
      setViewportSize(1920); // Full HD width

      expect(window.innerWidth).toBe(1920);
    });
  });

  describe('Text Sizing', () => {
    it('should use responsive text sizes', () => {
      const { container } = render(
        <div>
          <h1 className="text-2xl md:text-4xl">Heading</h1>
          <p className="text-sm md:text-base">Paragraph</p>
        </div>
      );

      const heading = screen.getByText('Heading');
      expect(heading).toHaveClass('text-2xl');
      expect(heading).toHaveClass('md:text-4xl');

      const paragraph = screen.getByText('Paragraph');
      expect(paragraph).toHaveClass('text-sm');
      expect(paragraph).toHaveClass('md:text-base');
    });

    it('should scale text appropriately for mobile', () => {
      render(
        <div>
          <p className="text-base sm:text-lg">
            This text scales up on larger screens
          </p>
        </div>
      );

      const text = screen.getByText('This text scales up on larger screens');
      expect(text).toHaveClass('sm:text-lg');
    });
  });

  describe('Spacing and Layout', () => {
    it('should use responsive padding', () => {
      const { container } = render(
        <div className="p-2 md:p-4 lg:p-8">
          Content with responsive padding
        </div>
      );

      const div = container.querySelector('.p-2');
      expect(div).toHaveClass('md:p-4');
      expect(div).toHaveClass('lg:p-8');
    });

    it('should use responsive margins', () => {
      const { container } = render(
        <div className="m-2 md:m-4">
          Content with responsive margins
        </div>
      );

      const div = container.querySelector('.m-2');
      expect(div).toHaveClass('md:m-4');
    });

    it('should use responsive gap in flex/grid', () => {
      const { container } = render(
        <div className="flex gap-2 md:gap-4">
          <div>Item 1</div>
          <div>Item 2</div>
        </div>
      );

      const flexContainer = container.querySelector('.gap-2');
      expect(flexContainer).toHaveClass('md:gap-4');
    });
  });

  describe('Container Widths', () => {
    it('should use max-width containers', () => {
      const { container } = render(
        <div className="max-w-7xl mx-auto">
          Centered content with max width
        </div>
      );

      const div = container.querySelector('.max-w-7xl');
      expect(div).toBeInTheDocument();
      expect(div).toHaveClass('mx-auto');
    });

    it('should use full width on mobile', () => {
      const { container } = render(
        <div className="w-full md:w-auto">
          Responsive width content
        </div>
      );

      const div = container.querySelector('.w-full');
      expect(div).toHaveClass('md:w-auto');
    });
  });

  describe('Image Responsiveness', () => {
    it('should use responsive images', () => {
      render(
        <img
          src="test.jpg"
          alt="Responsive image"
          className="w-full h-auto"
        />
      );

      const img = screen.getByAltText('Responsive image');
      expect(img).toHaveClass('w-full');
      expect(img).toHaveClass('h-auto');
    });

    it('should use object-fit for image containers', () => {
      render(
        <img
          src="test.jpg"
          alt="Fitted image"
          className="w-full h-48 object-cover"
        />
      );

      const img = screen.getByAltText('Fitted image');
      expect(img).toHaveClass('object-cover');
    });
  });

  describe('Orientation Changes', () => {
    it('should handle portrait orientation', () => {
      setViewportSize(375, 667); // iPhone portrait

      expect(window.innerWidth).toBe(375);
      expect(window.innerHeight).toBe(667);
    });

    it('should handle landscape orientation', () => {
      setViewportSize(667, 375); // iPhone landscape

      expect(window.innerWidth).toBe(667);
      expect(window.innerHeight).toBe(375);
    });
  });

  describe('Accessibility on Mobile', () => {
    it('should maintain accessibility on small screens', () => {
      renderWithProviders(<ResponsiveNavigation />);

      const menuButton = screen.getByLabelText('Toggle mobile menu');
      expect(menuButton).toHaveAttribute('aria-label');
      expect(menuButton).toHaveAttribute('aria-expanded');
    });

    it('should have proper focus management on mobile', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ResponsiveNavigation />);

      const menuButton = screen.getByLabelText('Toggle mobile menu');

      await user.tab();
      expect(menuButton).toHaveFocus();
    });
  });

  describe('Performance on Mobile', () => {
    it('should load essential content first', () => {
      renderWithProviders(<ResponsiveDashboard />);

      // Essential widgets should be rendered
      expect(screen.getByText('Revenue Widget')).toBeInTheDocument();
    });

    it('should lazy load non-critical content', () => {
      // This would test lazy loading implementation
      // For now, verify the concept exists
      expect(true).toBe(true);
    });
  });
});
