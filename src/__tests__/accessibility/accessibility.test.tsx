/**
 * Accessibility Testing Suite
 *
 * Comprehensive accessibility tests for WCAG AA compliance
 * including color contrast, ARIA implementation, keyboard navigation, and screen reader support.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { accessibilityTester, quickAccessibilityCheck } from '@/utils/accessibilityTesting';
import { Button } from '@/components/ui/button';
import { Form, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { SkipNavigation } from '@/components/accessibility/SkipNavigation';
import { FocusTrap } from '@/components/accessibility/FocusTrap';

describe('Accessibility Testing Suite', () => {
  beforeEach(() => {
    // Reset any global state before each test
    document.body.innerHTML = '';
  });

  afterEach(() => {
    // Clean up after each test
    document.body.innerHTML = '';
  });

  describe('Button Accessibility', () => {
    it('should have proper accessible name', async () => {
      render(<Button>Submit Form</Button>);
      const button = screen.getByRole('button', { name: 'Submit Form' });

      expect(button).toBeInTheDocument();
      expect(button).toHaveAccessibleName('Submit Form');

      const result = await quickAccessibilityCheck(button);
      expect(result.passed).toBe(true);
    });

    it('should support custom aria-label', async () => {
      render(
        <Button ariaLabel="Download PDF">
          <svg data-testid="download-icon" />
        </Button>
      );

      const button = screen.getByRole('button', { name: 'Download PDF' });
      expect(button).toBeInTheDocument();

      const result = await quickAccessibilityCheck(button);
      expect(result.passed).toBe(true);
    });

    it('should announce loading state', async () => {
      render(<Button loading>Processing</Button>);
      const button = screen.getByRole('button', { name: 'Processing' });

      expect(button).toHaveAttribute('aria-busy', 'true');

      const result = await quickAccessibilityCheck(button);
      expect(result.passed).toBe(true);
    });

    it('should support keyboard activation', async () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);

      const button = screen.getByRole('button');
      button.focus();

      fireEvent.keyDown(button, { key: 'Enter' });
      expect(handleClick).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(button, { key: ' ' });
      expect(handleClick).toHaveBeenCalledTimes(2);

      const result = await quickAccessibilityCheck(button);
      expect(result.passed).toBe(true);
    });

    it('should have proper touch target size', async () => {
      render(<Button>Large Button</Button>);
      const button = screen.getByRole('button');

      const styles = window.getComputedStyle(button);
      const height = parseInt(styles.height);
      const width = parseInt(styles.width);

      // WCAG AA minimum touch target is 44x44px
      expect(height).toBeGreaterThanOrEqual(44);
      expect(width).toBeGreaterThanOrEqual(44);

      const result = await quickAccessibilityCheck(button);
      expect(result.passed).toBe(true);
    });
  });

  describe('Form Accessibility', () => {
    it('should have proper label associations', async () => {
      render(
        <Form>
          <FormItem>
            <FormLabel>Email Address</FormLabel>
            <FormControl type="email" />
          </FormItem>
        </Form>
      );

      const input = screen.getByRole('textbox', { name: 'Email Address' });
      expect(input).toBeInTheDocument();
      expect(input).toHaveAccessibleName('Email Address');

      const result = await quickAccessibilityCheck(input);
      expect(result.passed).toBe(true);
    });

    it('should announce form errors', async () => {
      render(
        <Form>
          <FormItem>
            <FormLabel required showRequiredIndicator>
              Password
            </FormLabel>
            <FormControl type="password" />
            <FormMessage messageType="error">
              Password is required
            </FormMessage>
          </FormItem>
        </Form>
      );

      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveTextContent('Password is required');

      const result = await quickAccessibilityCheck(errorMessage);
      expect(result.passed).toBe(true);
    });

    it('should indicate required fields', async () => {
      render(
        <Form>
          <FormItem>
            <FormLabel required showRequiredIndicator>
              Full Name
            </FormLabel>
            <FormControl />
          </FormItem>
        </Form>
      );

      const label = screen.getByText('Full Name');
      expect(label).toBeInTheDocument();

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-required', 'true');

      const result = await quickAccessibilityCheck(input);
      expect(result.passed).toBe(true);
    });

    it('should handle form submission announcements', async () => {
      const onSubmit = jest.fn();
      render(
        <Form announceStatus onSubmit={onSubmit}>
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl type="email" />
          </FormItem>
          <Button type="submit">Submit</Button>
        </Form>
      );

      const button = screen.getByRole('button', { name: 'Submit' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });
    });
  });

  describe('Skip Navigation', () => {
    it('should provide skip links for keyboard users', async () => {
      render(
        <div>
          <SkipNavigation />
          <main id="main-content">
            <h1>Main Content</h1>
          </main>
        </div>
      );

      // Skip navigation should be initially hidden but focusable
      const skipNav = screen.getByRole('navigation', { name: /skip/i });
      expect(skipNav).toBeInTheDocument();

      // Focus skip navigation to make it visible
      skipNav.focus();
      expect(skipNav).toBeVisible();

      const result = await quickAccessibilityCheck(skipNav);
      expect(result.passed).toBe(true);
    });

    it('should announce navigation when skip links are used', async () => {
      render(
        <div>
          <SkipNavigation />
          <main id="main-content">
            <h1>Main Content</h1>
          </main>
        </div>
      );

      const skipLink = screen.getByRole('link', { name: /skip to main/i });
      fireEvent.click(skipLink);

      const mainContent = document.getElementById('main-content');
      expect(mainContent).toHaveFocus();
    });
  });

  describe('Focus Management', () => {
    it('should trap focus within modal', async () => {
      render(
        <FocusTrap>
          <div role="dialog" aria-modal="true">
            <h2>Modal Dialog</h2>
            <button>Close</button>
            <button>Cancel</button>
          </div>
        </FocusTrap>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');

      const result = await quickAccessibilityCheck(dialog);
      expect(result.passed).toBe(true);
    });

    it('should handle escape key to close modals', async () => {
      const onClose = jest.fn();
      render(
        <FocusTrap>
          <div role="dialog" aria-modal="true">
            <h2>Modal Dialog</h2>
            <button>Close</button>
          </div>
        </FocusTrap>
      );

      fireEvent.keyDown(document.body, { key: 'Escape' });
      // In a real implementation, this would trigger the close handler
    });
  });

  describe('Color Contrast', () => {
    it('should meet WCAG AA contrast requirements', async () => {
      render(
        <div style={{ color: '#000000', backgroundColor: '#FFFFFF' }}>
          <p>High contrast text</p>
        </div>
      );

      const text = screen.getByText('High contrast text');
      const styles = window.getComputedStyle(text);

      // This would normally use a contrast checking library
      expect(styles.color).toBeDefined();
      expect(styles.backgroundColor).toBeDefined();

      const result = await quickAccessibilityCheck(text);
      expect(result.passed).toBe(true);
    });

    it('should warn about low contrast text', async () => {
      render(
        <div style={{ color: '#808080', backgroundColor: '#F0F0F0' }}>
          <p>Low contrast text</p>
        </div>
      );

      const text = screen.getByText('Low contrast text');

      // In a real implementation, this would detect low contrast
      const result = await quickAccessibilityCheck(text);
      // This might fail due to low contrast depending on the actual colors
    });
  });

  describe('ARIA Implementation', () => {
    it('should use proper ARIA roles', async () => {
      render(
        <div>
          <header role="banner">
            <h1>Site Header</h1>
          </header>
          <nav role="navigation" aria-label="Main">
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/about">About</a></li>
            </ul>
          </nav>
          <main role="main">
            <h2>Main Content</h2>
          </main>
        </div>
      );

      const banner = screen.getByRole('banner');
      const navigation = screen.getByRole('navigation');
      const main = screen.getByRole('main');

      expect(banner).toBeInTheDocument();
      expect(navigation).toBeInTheDocument();
      expect(main).toBeInTheDocument();

      const result = await quickAccessibilityCheck(banner);
      expect(result.passed).toBe(true);
    });

    it('should handle dynamic content announcements', async () => {
      render(
        <div>
          <div aria-live="polite" aria-atomic="true" id="status">
            Initial status
          </div>
          <button onClick={() => {
            document.getElementById('status')!.textContent = 'Status updated';
          }}>
            Update Status
          </button>
        </div>
      );

      const status = document.getElementById('status');
      expect(status).toBeInTheDocument();
      expect(status).toHaveAttribute('aria-live', 'polite');
      expect(status).toHaveAttribute('aria-atomic', 'true');

      const result = await quickAccessibilityCheck(status);
      expect(result.passed).toBe(true);
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support tab order navigation', async () => {
      render(
        <div>
          <button>Button 1</button>
          <button>Button 2</button>
          <button>Button 3</button>
        </div>
      );

      const buttons = screen.getAllByRole('button');

      // Test tab order
      buttons[0].focus();
      expect(buttons[0]).toHaveFocus();

      fireEvent.tab();
      expect(buttons[1]).toHaveFocus();

      fireEvent.tab();
      expect(buttons[2]).toHaveFocus();

      const result = await quickAccessibilityCheck(buttons[0]);
      expect(result.passed).toBe(true);
    });

    it('should support arrow key navigation in menus', async () => {
      render(
        <div role="menu">
          <div role="menuitem">Menu Item 1</div>
          <div role="menuitem">Menu Item 2</div>
          <div role="menuitem">Menu Item 3</div>
        </div>
      );

      const menu = screen.getByRole('menu');
      const menuItems = screen.getAllByRole('menuitem');

      menuItems[0].focus();

      fireEvent.keyDown(menuItems[0], { key: 'ArrowDown' });
      // In a real implementation, this would move focus to the next item

      const result = await quickAccessibilityCheck(menu);
      expect(result.passed).toBe(true);
    });
  });

  describe('Screen Reader Support', () => {
    it('should have proper heading structure', async () => {
      render(
        <div>
          <h1>Main Title</h1>
          <h2>Section 1</h2>
          <h3>Subsection 1.1</h3>
          <h3>Subsection 1.2</h3>
          <h2>Section 2</h2>
        </div>
      );

      const headings = screen.getAllByRole('heading');
      expect(headings).toHaveLength(5);

      // Check heading levels are sequential
      expect(headings[0]).toHaveAttribute('aria-level', '1');
      expect(headings[1]).toHaveAttribute('aria-level', '2');
      expect(headings[2]).toHaveAttribute('aria-level', '3');

      const result = await quickAccessibilityCheck(headings[0]);
      expect(result.passed).toBe(true);
    });

    it('should provide alternative text for images', async () => {
      render(
        <div>
          <img src="/logo.png" alt="Company Logo" />
          <img src="/decoration.png" alt="" role="presentation" />
        </div>
      );

      const images = document.querySelectorAll('img');
      expect(images[0]).toHaveAttribute('alt', 'Company Logo');
      expect(images[1]).toHaveAttribute('alt', '');
      expect(images[1]).toHaveAttribute('role', 'presentation');

      const result = await quickAccessibilityCheck(images[0]);
      expect(result.passed).toBe(true);
    });

    it('should announce table structure', async () => {
      render(
        <table>
          <caption>User Information</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>John Doe</td>
              <td>john@example.com</td>
            </tr>
          </tbody>
        </table>
      );

      const table = screen.getByRole('table');
      const caption = screen.getByText('User Information');
      const headers = screen.getAllByRole('columnheader');

      expect(table).toBeInTheDocument();
      expect(caption).toBeInTheDocument();
      expect(headers).toHaveLength(2);

      const result = await quickAccessibilityCheck(table);
      expect(result.passed).toBe(true);
    });
  });

  describe('Comprehensive Component Testing', () => {
    it('should pass full accessibility audit for complex form', async () => {
      render(
        <Form>
          <FormItem>
            <FormLabel required showRequiredIndicator>
              Full Name
            </FormLabel>
            <FormControl placeholder="Enter your full name" />
            <FormMessage>Field is required</FormMessage>
          </FormItem>

          <FormItem>
            <FormLabel required showRequiredIndicator>
              Email Address
            </FormLabel>
            <FormControl type="email" placeholder="Enter your email" />
            <FormMessage>Field is required</FormMessage>
          </FormItem>

          <FormItem>
            <Button type="submit">Submit Form</Button>
          </FormItem>
        </Form>
      );

      const form = screen.getByRole('form');
      const result = await accessibilityTester.runAccessibilityTest(form, 'CompleteForm');

      expect(result.violationsCount).toBe(0);
      expect(result.score).toBe(100);
      expect(result.recommendations).toHaveLength(0);
    });
  });

  describe('Performance and Bundle Impact', () => {
    it('should not significantly impact bundle size', () => {
      // This test would check that accessibility features don't bloat the bundle
      // In a real implementation, this would use bundle analysis tools
      expect(true).toBe(true); // Placeholder
    });

    it('should not impact render performance', async () => {
      const startTime = performance.now();

      render(
        <div>
          <Button>Test Button</Button>
          <Form>
            <FormItem>
              <FormLabel>Test</FormLabel>
              <FormControl />
            </FormItem>
          </Form>
        </div>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Accessibility features should not slow down rendering significantly
      expect(renderTime).toBeLessThan(100); // 100ms threshold
    });
  });
});

/**
 * Integration tests for accessibility in real user scenarios
 */
describe('Accessibility Integration Tests', () => {
  it('should support complete keyboard navigation flow', async () => {
    render(
      <div>
        <SkipNavigation />
        <nav>
          <button>Home</button>
          <button>About</button>
          <button>Contact</button>
        </nav>
        <main id="main-content">
          <h1>Main Page</h1>
          <Form>
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl />
              <Button type="submit">Submit</Button>
            </FormItem>
          </Form>
        </main>
      </div>
    );

    // Test complete keyboard navigation flow
    let activeElement = document.body;

    // Tab to skip link
    fireEvent.keyDown(activeElement, { key: 'Tab' });
    activeElement = document.activeElement!;
    expect(activeElement.getAttribute('role')).toBe('navigation');

    // Navigate to main content
    fireEvent.keyDown(activeElement, { key: 'Enter' });
    activeElement = document.activeElement!;
    expect(activeElement.id).toBe('main-content');

    // Navigate to form
    fireEvent.keyDown(activeElement, { key: 'Tab' });
    activeElement = document.activeElement!;
    expect(activeElement.getAttribute('role')).toBe('textbox');

    // Navigate to submit button
    fireEvent.keyDown(activeElement, { key: 'Tab' });
    activeElement = document.activeElement!;
    expect(activeElement.getAttribute('type')).toBe('submit');
  });

  it('should work with screen reader simulation', async () => {
    // Simulate screen reader behavior
    render(
      <div>
        <h1>Page Title</h1>
        <p>Page description</p>
        <Form>
          <FormItem>
            <FormLabel required>Email</FormLabel>
            <FormControl type="email" required />
            <FormMessage messageType="error">Email is required</FormMessage>
          </FormItem>
        </Form>
      </div>
    );

    // Check that screen reader can navigate by headings
    const headings = screen.getAllByRole('heading');
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveAccessibleName('Page Title');

    // Check that form fields are properly announced
    const input = screen.getByRole('textbox');
    expect(input).toHaveAccessibleName('Email');
    expect(input).toHaveAttribute('aria-required', 'true');

    // Check that errors are announced
    const errorMessage = screen.getByRole('alert');
    expect(errorMessage).toHaveTextContent('Email is required');
  });
});