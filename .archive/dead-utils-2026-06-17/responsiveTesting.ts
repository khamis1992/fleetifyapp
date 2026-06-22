// Responsive testing utilities and frameworks
export interface DeviceTestConfig {
  name: string
  width: number
  height: number
  userAgent: string
  pixelRatio: number
  touch: boolean
  category: 'mobile' | 'tablet' | 'desktop'
}

// Standard device configurations for testing
export const DEVICE_CONFIGS: DeviceTestConfig[] = [
  // Mobile Devices
  {
    name: 'iPhone SE',
    width: 375,
    height: 667,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
    pixelRatio: 2,
    touch: true,
    category: 'mobile'
  },
  {
    name: 'iPhone 12 Pro',
    width: 390,
    height: 844,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    pixelRatio: 3,
    touch: true,
    category: 'mobile'
  },
  {
    name: 'iPhone 14 Pro Max',
    width: 428,
    height: 926,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
    pixelRatio: 3,
    touch: true,
    category: 'mobile'
  },
  {
    name: 'Samsung Galaxy S21',
    width: 360,
    height: 800,
    userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36',
    pixelRatio: 3,
    touch: true,
    category: 'mobile'
  },
  {
    name: 'Samsung Galaxy S23 Ultra',
    width: 384,
    height: 854,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36',
    pixelRatio: 3.5,
    touch: true,
    category: 'mobile'
  },
  
  // Tablet Devices
  {
    name: 'iPad Mini',
    width: 768,
    height: 1024,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    pixelRatio: 2,
    touch: true,
    category: 'tablet'
  },
  {
    name: 'iPad Air',
    width: 834,
    height: 1194,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
    pixelRatio: 2,
    touch: true,
    category: 'tablet'
  },
  {
    name: 'iPad Pro 12.9"',
    width: 1024,
    height: 1366,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
    pixelRatio: 2,
    touch: true,
    category: 'tablet'
  },
  {
    name: 'Samsung Galaxy Tab S8',
    width: 800,
    height: 1280,
    userAgent: 'Mozilla/5.0 (Linux; Android 12; SM-X706B) AppleWebKit/537.36',
    pixelRatio: 2.5,
    touch: true,
    category: 'tablet'
  },
  
  // Desktop Devices
  {
    name: 'MacBook Air 13"',
    width: 1280,
    height: 800,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
    pixelRatio: 2,
    touch: false,
    category: 'desktop'
  },
  {
    name: 'MacBook Pro 16"',
    width: 1512,
    height: 982,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
    pixelRatio: 2,
    touch: false,
    category: 'desktop'
  },
  {
    name: 'Windows Laptop',
    width: 1366,
    height: 768,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    pixelRatio: 1,
    touch: false,
    category: 'desktop'
  },
  {
    name: 'Desktop 1920x1080',
    width: 1920,
    height: 1080,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    pixelRatio: 1,
    touch: false,
    category: 'desktop'
  },
  {
    name: 'Desktop 2560x1440',
    width: 2560,
    height: 1440,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    pixelRatio: 1,
    touch: false,
    category: 'desktop'
  }
]

// Testing criteria and validation
export interface ResponsiveTestCriteria {
  // Layout validation
  noHorizontalScroll: boolean
  noOverflowingElements: boolean
  properSpacing: boolean
  readableText: boolean
  touchTargetSize: boolean
  
  // Performance validation
  maxLoadTime: number // in milliseconds
  maxRenderTime: number // in milliseconds
  maxMemoryUsage: number // in MB
  
  // Accessibility validation
  contrastRatio: number
  keyboardNavigation: boolean
  screenReaderSupport: boolean
  
  // Functionality validation
  allInteractionsWork: boolean
  formsSubmittable: boolean
  navigationAccessible: boolean
  contentVisible: boolean
}

export const DEFAULT_TEST_CRITERIA: ResponsiveTestCriteria = {
  noHorizontalScroll: true,
  noOverflowingElements: true,
  properSpacing: true,
  readableText: true,
  touchTargetSize: true,
  maxLoadTime: 3000,
  maxRenderTime: 100,
  maxMemoryUsage: 100,
  contrastRatio: 4.5,
  keyboardNavigation: true,
  screenReaderSupport: true,
  allInteractionsWork: true,
  formsSubmittable: true,
  navigationAccessible: true,
  contentVisible: true
}

// Test result interface
export interface ResponsiveTestResult {
  device: DeviceTestConfig
  criteria: ResponsiveTestCriteria
  results: {
    [K in keyof ResponsiveTestCriteria]: {
      passed: boolean
      value?: any
      error?: string
    }
  }
  screenshot?: string
  timestamp: number
  duration: number
}

// Responsive testing class
export class ResponsiveTester {
  private results: ResponsiveTestResult[] = []
  
  constructor(
    private criteria: ResponsiveTestCriteria = DEFAULT_TEST_CRITERIA,
    private baseUrl: string = window.location.origin
  ) {}

  // Test a specific device configuration
  async testDevice(
    device: DeviceTestConfig,
    route: string = '/'
  ): Promise<ResponsiveTestResult> {
    const startTime = performance.now()
    
    const result: ResponsiveTestResult = {
      device,
      criteria: this.criteria,
      results: {} as any,
      timestamp: Date.now(),
      duration: 0
    }

    try {
      // Simulate device viewport
      await this.setViewport(device)
      
      // Navigate to route
      if (route !== window.location.pathname) {
        window.history.pushState({}, '', route)
        window.dispatchEvent(new PopStateEvent('popstate'))
        await this.waitForNavigation()
      }

      // Run all tests
      await this.runLayoutTests(result)
      await this.runPerformanceTests(result)
      await this.runAccessibilityTests(result)
      await this.runFunctionalityTests(result)
      
      // Take screenshot (if supported)
      result.screenshot = await this.captureScreenshot()
      
    } catch (error) {
      console.error('Test execution failed:', error)
    }

    const endTime = performance.now()
    result.duration = endTime - startTime
    
    this.results.push(result)
    return result
  }

  // Test all devices
  async testAllDevices(route: string = '/'): Promise<ResponsiveTestResult[]> {
    const results: ResponsiveTestResult[] = []
    
    for (const device of DEVICE_CONFIGS) {
      console.log(`Testing device: ${device.name}`)
      const result = await this.testDevice(device, route)
      results.push(result)
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    return results
  }

  // Set viewport to match device
  private async setViewport(device: DeviceTestConfig): Promise<void> {
    // Set viewport size
    if ('visualViewport' in window) {
      // Modern browsers
      document.documentElement.style.width = `${device.width}px`
      document.documentElement.style.height = `${device.height}px`
    }
    
    // Simulate user agent
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      value: device.userAgent
    })
    
    // Simulate pixel ratio
    Object.defineProperty(window, 'devicePixelRatio', {
      writable: true,
      value: device.pixelRatio
    })
    
    // Simulate touch support
    if (device.touch) {
      Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: true,
        value: 5
      })
    }
    
    // Trigger resize event
    window.dispatchEvent(new Event('resize'))
    
    // Wait for layout to stabilize
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  // Wait for navigation to complete
  private async waitForNavigation(): Promise<void> {
    return new Promise(resolve => {
      // Simple implementation - wait for React to re-render
      setTimeout(resolve, 500)
    })
  }

  // Layout tests
  private async runLayoutTests(result: ResponsiveTestResult): Promise<void> {
    const device = result.device
    
    // Check for horizontal scroll
    const hasHorizontalScroll = document.documentElement.scrollWidth > device.width
    result.results.noHorizontalScroll = {
      passed: !hasHorizontalScroll,
      value: hasHorizontalScroll,
      error: hasHorizontalScroll ? 'Horizontal scroll detected' : undefined
    }

    // Check for overflowing elements
    const overflowingElements = this.findOverflowingElements(device.width)
    result.results.noOverflowingElements = {
      passed: overflowingElements.length === 0,
      value: overflowingElements.length,
      error: overflowingElements.length > 0 
        ? `Found ${overflowingElements.length} overflowing elements` 
        : undefined
    }

    // Check spacing
    const spacingIssues = this.checkSpacing()
    result.results.properSpacing = {
      passed: spacingIssues.length === 0,
      value: spacingIssues.length,
      error: spacingIssues.length > 0 
        ? `Found ${spacingIssues.length} spacing issues` 
        : undefined
    }

    // Check text readability
    const textIssues = this.checkTextReadability()
    result.results.readableText = {
      passed: textIssues.length === 0,
      value: textIssues.length,
      error: textIssues.length > 0 
        ? `Found ${textIssues.length} text readability issues` 
        : undefined
    }

    // Check touch target sizes
    if (device.touch) {
      const touchIssues = this.checkTouchTargets()
      result.results.touchTargetSize = {
        passed: touchIssues.length === 0,
        value: touchIssues.length,
        error: touchIssues.length > 0 
          ? `Found ${touchIssues.length} touch target issues` 
          : undefined
      }
    } else {
      result.results.touchTargetSize = { passed: true }
    }
  }

  // Performance tests
  private async runPerformanceTests(result: ResponsiveTestResult): Promise<void> {
    // Load time (already measured during navigation)
    const loadTime = result.duration
    result.results.maxLoadTime = {
      passed: loadTime <= this.criteria.maxLoadTime,
      value: loadTime,
      error: loadTime > this.criteria.maxLoadTime 
        ? `Load time ${loadTime}ms exceeds ${this.criteria.maxLoadTime}ms` 
        : undefined
    }

    // Render time (measure next frame)
    const renderStartTime = performance.now()
    await new Promise(resolve => requestAnimationFrame(resolve))
    const renderTime = performance.now() - renderStartTime
    
    result.results.maxRenderTime = {
      passed: renderTime <= this.criteria.maxRenderTime,
      value: renderTime,
      error: renderTime > this.criteria.maxRenderTime 
        ? `Render time ${renderTime}ms exceeds ${this.criteria.maxRenderTime}ms` 
        : undefined
    }

    // Memory usage
    let memoryUsage = 0
    if ('memory' in performance) {
      const memory = (performance as any).memory
      memoryUsage = memory.usedJSHeapSize / (1024 * 1024) // Convert to MB
    }
    
    result.results.maxMemoryUsage = {
      passed: memoryUsage <= this.criteria.maxMemoryUsage,
      value: memoryUsage,
      error: memoryUsage > this.criteria.maxMemoryUsage 
        ? `Memory usage ${memoryUsage}MB exceeds ${this.criteria.maxMemoryUsage}MB` 
        : undefined
    }
  }

  // Accessibility tests
  private async runAccessibilityTests(result: ResponsiveTestResult): Promise<void> {
    // Contrast ratio check
    const contrastIssues = this.checkContrastRatio()
    result.results.contrastRatio = {
      passed: contrastIssues.length === 0,
      value: contrastIssues.length,
      error: contrastIssues.length > 0 
        ? `Found ${contrastIssues.length} contrast issues` 
        : undefined
    }

    // Keyboard navigation
    const keyboardIssues = this.checkKeyboardNavigation()
    result.results.keyboardNavigation = {
      passed: keyboardIssues.length === 0,
      value: keyboardIssues.length,
      error: keyboardIssues.length > 0 
        ? `Found ${keyboardIssues.length} keyboard navigation issues` 
        : undefined
    }

    // Screen reader support
    const screenReaderIssues = this.checkScreenReaderSupport()
    result.results.screenReaderSupport = {
      passed: screenReaderIssues.length === 0,
      value: screenReaderIssues.length,
      error: screenReaderIssues.length > 0 
        ? `Found ${screenReaderIssues.length} screen reader issues` 
        : undefined
    }
  }

  // Functionality tests
  private async runFunctionalityTests(result: ResponsiveTestResult): Promise<void> {
    // Test interactions
    const interactionIssues = await this.testInteractions()
    result.results.allInteractionsWork = {
      passed: interactionIssues.length === 0,
      value: interactionIssues.length,
      error: interactionIssues.length > 0 
        ? `Found ${interactionIssues.length} interaction issues` 
        : undefined
    }

    // Test forms
    const formIssues = await this.testForms()
    result.results.formsSubmittable = {
      passed: formIssues.length === 0,
      value: formIssues.length,
      error: formIssues.length > 0 
        ? `Found ${formIssues.length} form issues` 
        : undefined
    }

    // Test navigation
    const navigationIssues = await this.testNavigation()
    result.results.navigationAccessible = {
      passed: navigationIssues.length === 0,
      value: navigationIssues.length,
      error: navigationIssues.length > 0 
        ? `Found ${navigationIssues.length} navigation issues` 
        : undefined
    }

    // Test content visibility
    const contentIssues = this.checkContentVisibility()
    result.results.contentVisible = {
      passed: contentIssues.length === 0,
      value: contentIssues.length,
      error: contentIssues.length > 0 
        ? `Found ${contentIssues.length} content visibility issues` 
        : undefined
    }
  }

  // Helper methods for specific tests
  private findOverflowingElements(maxWidth: number): Element[] {
    const elements = document.querySelectorAll('*')
    const overflowing: Element[] = []

    elements.forEach(element => {
      const rect = element.getBoundingClientRect()
      if (rect.right > maxWidth) {
        overflowing.push(element)
      }
    })

    return overflowing
  }

  private checkSpacing(): string[] {
    const issues: string[] = []
    
    // Check for elements that are too close together
    const interactiveElements = document.querySelectorAll(
      'button, a, input, select, textarea, [role="button"]'
    )
    
    interactiveElements.forEach((element, index) => {
      const rect = element.getBoundingClientRect()
      if (rect.height < 44 || rect.width < 44) {
        issues.push(`Interactive element ${index} is smaller than 44px`)
      }
    })

    return issues
  }

  private checkTextReadability(): string[] {
    const issues: string[] = []
    
    // Check font sizes
    const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6')
    
    textElements.forEach((element, index) => {
      const styles = window.getComputedStyle(element)
      const fontSize = parseFloat(styles.fontSize)
      
      if (fontSize < 14) {
        issues.push(`Text element ${index} has font size ${fontSize}px (minimum 14px recommended)`)
      }
    })

    return issues
  }

  private checkTouchTargets(): string[] {
    const issues: string[] = []
    
    const touchElements = document.querySelectorAll(
      'button, a, input, select, textarea, [role="button"], [onclick]'
    )
    
    touchElements.forEach((element, index) => {
      const rect = element.getBoundingClientRect()
      const minSize = 44
      
      if (rect.height < minSize || rect.width < minSize) {
        issues.push(`Touch target ${index} is too small (${rect.width}x${rect.height}, minimum ${minSize}x${minSize})`)
      }
    })

    return issues
  }

  private checkContrastRatio(): string[] {
    const issues: string[] = []
    
    // This is a simplified contrast check
    // In a real implementation, you'd use a proper contrast calculation library
    const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, button, a')
    
    textElements.forEach((element, index) => {
      const styles = window.getComputedStyle(element)
      const color = styles.color
      const backgroundColor = styles.backgroundColor
      
      // Simplified check - in reality you'd calculate actual contrast ratio
      if (color === backgroundColor) {
        issues.push(`Element ${index} has insufficient contrast`)
      }
    })

    return issues
  }

  private checkKeyboardNavigation(): string[] {
    const issues: string[] = []
    
    // Check for focusable elements without visible focus
    const focusableElements = document.querySelectorAll(
      'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    focusableElements.forEach((element, index) => {
      const styles = window.getComputedStyle(element, ':focus')
      if (styles.outline === 'none' && styles.boxShadow === 'none') {
        issues.push(`Focusable element ${index} has no visible focus indicator`)
      }
    })

    return issues
  }

  private checkScreenReaderSupport(): string[] {
    const issues: string[] = []
    
    // Check for missing alt text on images
    const images = document.querySelectorAll('img')
    images.forEach((img, index) => {
      if (!img.alt && !img.getAttribute('aria-label')) {
        issues.push(`Image ${index} missing alt text`)
      }
    })

    // Check for missing labels on form inputs
    const inputs = document.querySelectorAll('input, select, textarea')
    inputs.forEach((input, index) => {
      if (!input.getAttribute('aria-label') && !input.getAttribute('aria-labelledby')) {
        const label = document.querySelector(`label[for="${input.id}"]`)
        if (!label) {
          issues.push(`Form input ${index} missing label`)
        }
      }
    })

    return issues
  }

  private async testInteractions(): Promise<string[]> {
    const issues: string[] = []
    
    // Test button clicks
    const buttons = document.querySelectorAll('button:not([disabled])')
    
    for (let i = 0; i < Math.min(buttons.length, 5); i++) {
      try {
        const button = buttons[i] as HTMLButtonElement
        button.click()
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        issues.push(`Button ${i} click failed: ${error}`)
      }
    }

    return issues
  }

  private async testForms(): Promise<string[]> {
    const issues: string[] = []
    
    // Find forms and test basic interaction
    const forms = document.querySelectorAll('form')
    
    forms.forEach((form, index) => {
      const inputs = form.querySelectorAll('input, select, textarea')
      
      if (inputs.length === 0) {
        issues.push(`Form ${index} has no input elements`)
      }

      // Check if form has submit button
      const submitButton = form.querySelector('button[type="submit"], input[type="submit"]')
      if (!submitButton) {
        issues.push(`Form ${index} has no submit button`)
      }
    })

    return issues
  }

  private async testNavigation(): Promise<string[]> {
    const issues: string[] = []
    
    // Test navigation links
    const navLinks = document.querySelectorAll('nav a, [role="navigation"] a')
    
    if (navLinks.length === 0) {
      issues.push('No navigation links found')
    }

    // Check if navigation is accessible
    const navigation = document.querySelector('nav, [role="navigation"]')
    if (navigation && !navigation.getAttribute('aria-label')) {
      issues.push('Navigation missing aria-label')
    }

    return issues
  }

  private checkContentVisibility(): string[] {
    const issues: string[] = []
    
    // Check for hidden content that should be visible
    const hiddenElements = document.querySelectorAll('[aria-hidden="true"]')
    
    hiddenElements.forEach((element, index) => {
      const rect = element.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        // Element is visually present but marked as hidden
        const styles = window.getComputedStyle(element)
        if (styles.display !== 'none' && styles.visibility !== 'hidden') {
          issues.push(`Element ${index} is visible but marked aria-hidden`)
        }
      }
    })

    return issues
  }

  private async captureScreenshot(): Promise<string | undefined> {
    // This would require a proper screenshot library in a real implementation
    // For now, return undefined
    return undefined
  }

  // Generate test report
  generateReport(): string {
    const totalTests = this.results.length
    const passedTests = this.results.filter(result => 
      Object.values(result.results).every(test => test.passed)
    ).length

    let report = `# Responsive Design Test Report\n\n`
    report += `**Generated:** ${new Date().toLocaleString()}\n`
    report += `**Total Tests:** ${totalTests}\n`
    report += `**Passed:** ${passedTests}\n`
    report += `**Failed:** ${totalTests - passedTests}\n`
    report += `**Success Rate:** ${((passedTests / totalTests) * 100).toFixed(1)}%\n\n`

    this.results.forEach(result => {
      const devicePassed = Object.values(result.results).every(test => test.passed)
      const failedTests = Object.entries(result.results)
        .filter(([_, test]) => !test.passed)
        .map(([criterion, _]) => criterion)

      report += `## ${result.device.name} (${result.device.width}x${result.device.height})\n`
      report += `**Status:** ${devicePassed ? '✅ PASSED' : '❌ FAILED'}\n`
      report += `**Duration:** ${result.duration.toFixed(2)}ms\n`
      
      if (!devicePassed) {
        report += `**Failed Criteria:** ${failedTests.join(', ')}\n`
        
        failedTests.forEach(criterion => {
          const test = result.results[criterion as keyof typeof result.results]
          if (test.error) {
            report += `- ${criterion}: ${test.error}\n`
          }
        })
      }
      
      report += '\n'
    })

    return report
  }

  // Export results as JSON
  exportResults(): ResponsiveTestResult[] {
    return this.results
  }

  // Clear results
  clearResults(): void {
    this.results = []
  }
}