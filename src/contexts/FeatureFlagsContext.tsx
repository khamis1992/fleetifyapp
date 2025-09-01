import React, { createContext, useContext, useState, useEffect } from 'react'

// Feature flags configuration
interface FeatureFlags {
  responsiveDesign: boolean
  responsiveNavigation: boolean
  responsiveDashboard: boolean
  responsiveForms: boolean
  responsiveTables: boolean
  responsiveContracts: boolean
  responsiveHR: boolean
  mobileOptimizations: boolean
  tabletLayoutEnhancements: boolean
  desktopAdvancedFeatures: boolean
  adaptiveImageLoading: boolean
  touchOptimizations: boolean
  performanceMode: boolean
}

// Default feature flags (start with everything disabled for safety)
const defaultFeatureFlags: FeatureFlags = {
  responsiveDesign: false,
  responsiveNavigation: false,
  responsiveDashboard: false,
  responsiveForms: false,
  responsiveTables: false,
  responsiveContracts: false,
  responsiveHR: false,
  mobileOptimizations: false,
  tabletLayoutEnhancements: false,
  desktopAdvancedFeatures: false,
  adaptiveImageLoading: false,
  touchOptimizations: false,
  performanceMode: false
}

// Environment-based overrides
const getEnvironmentFlags = (): Partial<FeatureFlags> => {
  if (typeof window === 'undefined') return {}
  
  const urlParams = new URLSearchParams(window.location.search)
  const envFlags: Partial<FeatureFlags> = {}

  // Check URL parameters for feature flags
  Object.keys(defaultFeatureFlags).forEach(flag => {
    const paramValue = urlParams.get(`ff_${flag}`)
    if (paramValue !== null) {
      envFlags[flag as keyof FeatureFlags] = paramValue === 'true'
    }
  })

  // Check localStorage for persistent flags
  try {
    const storedFlags = localStorage.getItem('fleetify_feature_flags')
    if (storedFlags) {
      const parsed = JSON.parse(storedFlags)
      Object.assign(envFlags, parsed)
    }
  } catch (error) {
    console.warn('Failed to parse stored feature flags:', error)
  }

  // Development environment - enable more features
  if (process.env.NODE_ENV === 'development') {
    return {
      ...envFlags,
      responsiveDesign: true,
      responsiveNavigation: true,
      touchOptimizations: true,
      // Keep others disabled by default in development
    }
  }

  return envFlags
}

// Feature flags context
interface FeatureFlagsContextType {
  flags: FeatureFlags
  isEnabled: (flag: keyof FeatureFlags) => boolean
  enableFlag: (flag: keyof FeatureFlags) => void
  disableFlag: (flag: keyof FeatureFlags) => void
  toggleFlag: (flag: keyof FeatureFlags) => void
  resetFlags: () => void
  exportFlags: () => string
  importFlags: (flagsJson: string) => void
}

const FeatureFlagsContext = createContext<FeatureFlagsContextType | undefined>(undefined)

// Feature flags provider
interface FeatureFlagsProviderProps {
  children: React.ReactNode
  initialFlags?: Partial<FeatureFlags>
}

export function FeatureFlagsProvider({ 
  children, 
  initialFlags = {} 
}: FeatureFlagsProviderProps) {
  const [flags, setFlags] = useState<FeatureFlags>(() => ({
    ...defaultFeatureFlags,
    ...getEnvironmentFlags(),
    ...initialFlags
  }))

  // Persist flags to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('fleetify_feature_flags', JSON.stringify(flags))
    } catch (error) {
      console.warn('Failed to persist feature flags:', error)
    }
  }, [flags])

  const isEnabled = (flag: keyof FeatureFlags): boolean => {
    return flags[flag]
  }

  const enableFlag = (flag: keyof FeatureFlags) => {
    setFlags(prev => ({ ...prev, [flag]: true }))
  }

  const disableFlag = (flag: keyof FeatureFlags) => {
    setFlags(prev => ({ ...prev, [flag]: false }))
  }

  const toggleFlag = (flag: keyof FeatureFlags) => {
    setFlags(prev => ({ ...prev, [flag]: !prev[flag] }))
  }

  const resetFlags = () => {
    setFlags(defaultFeatureFlags)
    localStorage.removeItem('fleetify_feature_flags')
  }

  const exportFlags = (): string => {
    return JSON.stringify(flags, null, 2)
  }

  const importFlags = (flagsJson: string) => {
    try {
      const importedFlags = JSON.parse(flagsJson)
      setFlags(prev => ({ ...prev, ...importedFlags }))
    } catch (error) {
      console.error('Failed to import feature flags:', error)
    }
  }

  return (
    <FeatureFlagsContext.Provider value={{
      flags,
      isEnabled,
      enableFlag,
      disableFlag,
      toggleFlag,
      resetFlags,
      exportFlags,
      importFlags
    }}>
      {children}
    </FeatureFlagsContext.Provider>
  )
}

// Hook to use feature flags
export function useFeatureFlags() {
  const context = useContext(FeatureFlagsContext)
  if (context === undefined) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagsProvider')
  }
  return context
}

// Individual feature flag hooks
export function useResponsiveDesign() {
  const { isEnabled } = useFeatureFlags()
  return isEnabled('responsiveDesign')
}

export function useResponsiveNavigation() {
  const { isEnabled } = useFeatureFlags()
  return isEnabled('responsiveNavigation')
}

export function useMobileOptimizations() {
  const { isEnabled } = useFeatureFlags()
  return isEnabled('mobileOptimizations')
}

export function usePerformanceMode() {
  const { isEnabled } = useFeatureFlags()
  return isEnabled('performanceMode')
}

// Component wrapper for feature flags
interface FeatureGateProps {
  flag: keyof FeatureFlags
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function FeatureGate({ flag, children, fallback = null }: FeatureGateProps) {
  const { isEnabled } = useFeatureFlags()
  return isEnabled(flag) ? <>{children}</> : <>{fallback}</>
}

// Progressive rollout component
interface ProgressiveRolloutProps {
  feature: keyof FeatureFlags
  percentage: number // 0-100
  children: React.ReactNode
  fallback?: React.ReactNode
  userId?: string
}

export function ProgressiveRollout({ 
  feature, 
  percentage, 
  children, 
  fallback = null,
  userId 
}: ProgressiveRolloutProps) {
  const { isEnabled } = useFeatureFlags()
  const [shouldShow, setShouldShow] = useState(false)

  useEffect(() => {
    // If feature is globally disabled, don't show
    if (!isEnabled(feature)) {
      setShouldShow(false)
      return
    }

    // Simple hash-based rollout
    const hash = userId 
      ? simpleHash(userId + feature)
      : Math.random() * 100

    setShouldShow(hash < percentage)
  }, [feature, percentage, userId, isEnabled])

  return shouldShow ? <>{children}</> : <>{fallback}</>
}

// Simple hash function for consistent user experience
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash) % 100
}

// A/B Testing component
interface ABTestProps {
  testName: string
  variants: Record<string, React.ReactNode>
  userId?: string
}

export function ABTest({ testName, variants, userId }: ABTestProps) {
  const variantKeys = Object.keys(variants)
  const [selectedVariant, setSelectedVariant] = useState<string>('')

  useEffect(() => {
    const hash = userId 
      ? simpleHash(userId + testName)
      : Math.random() * 100

    const variantIndex = Math.floor(hash / (100 / variantKeys.length))
    setSelectedVariant(variantKeys[variantIndex] || variantKeys[0])
  }, [testName, userId, variantKeys])

  return selectedVariant ? <>{variants[selectedVariant]}</> : null
}

// Development tools component
export function FeatureFlagsDeveloperTools() {
  const { 
    flags, 
    toggleFlag, 
    resetFlags, 
    exportFlags, 
    importFlags 
  } = useFeatureFlags()
  const [isOpen, setIsOpen] = useState(false)

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium"
      >
        🚩 Feature Flags
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-80 bg-background border rounded-lg shadow-lg p-4 max-h-96 overflow-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Feature Flags</h3>
            <div className="flex gap-2">
              <button
                onClick={resetFlags}
                className="text-xs px-2 py-1 bg-destructive text-destructive-foreground rounded"
              >
                Reset
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-xs px-2 py-1 bg-muted rounded"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {Object.entries(flags).map(([flag, enabled]) => (
              <div key={flag} className="flex justify-between items-center">
                <span className="text-sm">{flag}</span>
                <button
                  onClick={() => toggleFlag(flag as keyof FeatureFlags)}
                  className={`text-xs px-2 py-1 rounded ${
                    enabled 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-300 text-gray-700'
                  }`}
                >
                  {enabled ? 'ON' : 'OFF'}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t space-y-2">
            <button
              onClick={() => {
                const exported = exportFlags()
                navigator.clipboard.writeText(exported)
                alert('Flags copied to clipboard!')
              }}
              className="w-full text-xs px-2 py-1 bg-blue-500 text-white rounded"
            >
              Export to Clipboard
            </button>
            
            <button
              onClick={() => {
                const flagsJson = prompt('Paste flags JSON:')
                if (flagsJson) {
                  importFlags(flagsJson)
                }
              }}
              className="w-full text-xs px-2 py-1 bg-blue-500 text-white rounded"
            >
              Import from JSON
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// URL parameter helper for easy testing
export function getFeatureFlagFromURL(flag: keyof FeatureFlags): boolean | null {
  if (typeof window === 'undefined') return null
  
  const urlParams = new URLSearchParams(window.location.search)
  const value = urlParams.get(`ff_${flag}`)
  
  if (value === 'true') return true
  if (value === 'false') return false
  return null
}