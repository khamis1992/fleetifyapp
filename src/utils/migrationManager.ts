import { useFeatureFlags } from '@/contexts/FeatureFlagsContext'
import { useEnhancedResponsive } from '@/hooks/useEnhancedResponsive'

// Migration phases configuration
export interface MigrationPhase {
  id: string
  name: string
  description: string
  features: string[]
  rolloutPercentage: number
  targetUsers?: 'all' | 'internal' | 'beta' | 'specific'
  specificUsers?: string[]
  deviceTypes?: Array<'mobile' | 'tablet' | 'desktop'>
  minVersion?: string
  dependencies?: string[]
  estimatedDuration: number // in days
  rollbackStrategy: 'immediate' | 'gradual' | 'manual'
  successCriteria: {
    metric: string
    threshold: number
    comparison: 'greater' | 'less' | 'equal'
  }[]
}

// Predefined migration phases for responsive design rollout
export const RESPONSIVE_MIGRATION_PHASES: MigrationPhase[] = [
  {
    id: 'phase-0-infrastructure',
    name: 'البنية التحتية',
    description: 'تفعيل الأدوات والسياقات الأساسية للتصميم التكيفي',
    features: [
      'responsiveDesign',
      'touchOptimizations'
    ],
    rolloutPercentage: 100,
    targetUsers: 'internal',
    deviceTypes: ['mobile', 'tablet', 'desktop'],
    dependencies: [],
    estimatedDuration: 3,
    rollbackStrategy: 'immediate',
    successCriteria: [
      { metric: 'errorRate', threshold: 1, comparison: 'less' },
      { metric: 'loadTime', threshold: 3000, comparison: 'less' }
    ]
  },
  {
    id: 'phase-1-navigation',
    name: 'نظام التنقل التكيفي',
    description: 'تفعيل التنقل المتكيف للهواتف الذكية والأجهزة اللوحية',
    features: [
      'responsiveNavigation',
      'mobileOptimizations'
    ],
    rolloutPercentage: 25,
    targetUsers: 'beta',
    deviceTypes: ['mobile', 'tablet'],
    dependencies: ['phase-0-infrastructure'],
    estimatedDuration: 7,
    rollbackStrategy: 'gradual',
    successCriteria: [
      { metric: 'navigationUsability', threshold: 90, comparison: 'greater' },
      { metric: 'mobileEngagement', threshold: 80, comparison: 'greater' }
    ]
  },
  {
    id: 'phase-2-components',
    name: 'المكونات التكيفية',
    description: 'تفعيل المكونات والنماذج التكيفية',
    features: [
      'responsiveForms',
      'responsiveTables',
      'adaptiveImageLoading'
    ],
    rolloutPercentage: 50,
    targetUsers: 'beta',
    deviceTypes: ['mobile', 'tablet', 'desktop'],
    dependencies: ['phase-1-navigation'],
    estimatedDuration: 10,
    rollbackStrategy: 'gradual',
    successCriteria: [
      { metric: 'formCompletionRate', threshold: 85, comparison: 'greater' },
      { metric: 'dataTableUsability', threshold: 80, comparison: 'greater' }
    ]
  },
  {
    id: 'phase-3-modules',
    name: 'وحدات الأعمال',
    description: 'تفعيل التصميم التكيفي لوحدات إدارة الأسطول والعمليات المالية',
    features: [
      'responsiveDashboard',
      'tabletLayoutEnhancements'
    ],
    rolloutPercentage: 75,
    targetUsers: 'all',
    deviceTypes: ['mobile', 'tablet', 'desktop'],
    dependencies: ['phase-2-components'],
    estimatedDuration: 14,
    rollbackStrategy: 'manual',
    successCriteria: [
      { metric: 'userSatisfaction', threshold: 4.0, comparison: 'greater' },
      { metric: 'taskCompletionRate', threshold: 90, comparison: 'greater' }
    ]
  },
  {
    id: 'phase-4-optimization',
    name: 'التحسينات المتقدمة',
    description: 'تفعيل ميزات الأداء والتحسينات المتقدمة',
    features: [
      'performanceMode',
      'desktopAdvancedFeatures'
    ],
    rolloutPercentage: 100,
    targetUsers: 'all',
    deviceTypes: ['mobile', 'tablet', 'desktop'],
    dependencies: ['phase-3-modules'],
    estimatedDuration: 7,
    rollbackStrategy: 'gradual',
    successCriteria: [
      { metric: 'performanceScore', threshold: 90, comparison: 'greater' },
      { metric: 'loadTime', threshold: 2000, comparison: 'less' }
    ]
  }
]

// Migration state interface
export interface MigrationState {
  currentPhase: string | null
  completedPhases: string[]
  activeFeatures: string[]
  rolloutPercentage: number
  userGroup: string
  lastUpdated: number
  errors: string[]
  metrics: Record<string, number>
}

// Migration manager class
export class MigrationManager {
  private state: MigrationState
  private phases: MigrationPhase[]
  private userId: string
  private userGroup: string

  constructor(
    phases: MigrationPhase[] = RESPONSIVE_MIGRATION_PHASES,
    userId?: string,
    userGroup: string = 'all'
  ) {
    this.phases = phases
    this.userId = userId || this.generateUserId()
    this.userGroup = userGroup
    this.state = this.loadState()
  }

  // Generate a consistent user ID for rollout calculations
  private generateUserId(): string {
    // Use a combination of browser fingerprinting
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.textBaseline = 'top'
      ctx.font = '14px Arial'
      ctx.fillText('Browser fingerprint', 2, 2)
    }
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|')

    // Simple hash function
    let hash = 0
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36)
  }

  // Load migration state from localStorage
  private loadState(): MigrationState {
    try {
      const stored = localStorage.getItem('fleetify_migration_state')
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.warn('Failed to load migration state:', error)
    }

    return {
      currentPhase: null,
      completedPhases: [],
      activeFeatures: [],
      rolloutPercentage: 0,
      userGroup: this.userGroup,
      lastUpdated: Date.now(),
      errors: [],
      metrics: {}
    }
  }

  // Save migration state to localStorage
  private saveState(): void {
    try {
      localStorage.setItem('fleetify_migration_state', JSON.stringify(this.state))
    } catch (error) {
      console.warn('Failed to save migration state:', error)
    }
  }

  // Check if user should be included in rollout
  private shouldIncludeUser(phase: MigrationPhase): boolean {
    // Check target user group
    if (phase.targetUsers === 'internal' && this.userGroup !== 'internal') {
      return false
    }
    
    if (phase.targetUsers === 'beta' && !['internal', 'beta'].includes(this.userGroup)) {
      return false
    }

    if (phase.targetUsers === 'specific' && phase.specificUsers) {
      return phase.specificUsers.includes(this.userId)
    }

    // Check rollout percentage
    const hash = this.hashString(this.userId + phase.id)
    const userPercentile = (hash % 100) + 1
    
    return userPercentile <= phase.rolloutPercentage
  }

  // Simple hash function for consistent user assignment
  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash)
  }

  // Check if phase dependencies are met
  private areDependenciesMet(phase: MigrationPhase): boolean {
    if (!phase.dependencies || phase.dependencies.length === 0) {
      return true
    }

    return phase.dependencies.every(depId => 
      this.state.completedPhases.includes(depId)
    )
  }

  // Get current eligible phase
  public getCurrentPhase(): MigrationPhase | null {
    for (const phase of this.phases) {
      // Skip if already completed
      if (this.state.completedPhases.includes(phase.id)) {
        continue
      }

      // Check if dependencies are met
      if (!this.areDependenciesMet(phase)) {
        continue
      }

      // Check if user should be included
      if (!this.shouldIncludeUser(phase)) {
        continue
      }

      return phase
    }

    return null
  }

  // Start migration phase
  public async startPhase(phaseId: string): Promise<boolean> {
    const phase = this.phases.find(p => p.id === phaseId)
    if (!phase) {
      this.addError(`Phase ${phaseId} not found`)
      return false
    }

    if (!this.areDependenciesMet(phase)) {
      this.addError(`Dependencies not met for phase ${phaseId}`)
      return false
    }

    if (!this.shouldIncludeUser(phase)) {
      this.addError(`User not eligible for phase ${phaseId}`)
      return false
    }

    try {
      this.state.currentPhase = phaseId
      this.state.activeFeatures = [...this.state.activeFeatures, ...phase.features]
      this.state.rolloutPercentage = phase.rolloutPercentage
      this.state.lastUpdated = Date.now()
      
      this.saveState()
      
      console.log(`Migration phase started: ${phase.name}`)
      return true
      
    } catch (error) {
      this.addError(`Failed to start phase ${phaseId}: ${error}`)
      return false
    }
  }

  // Complete migration phase
  public async completePhase(phaseId: string): Promise<boolean> {
    const phase = this.phases.find(p => p.id === phaseId)
    if (!phase) {
      this.addError(`Phase ${phaseId} not found`)
      return false
    }

    // Check success criteria
    const criteriaMet = this.checkSuccessCriteria(phase)
    if (!criteriaMet) {
      this.addError(`Success criteria not met for phase ${phaseId}`)
      return false
    }

    try {
      this.state.completedPhases.push(phaseId)
      this.state.currentPhase = null
      this.state.lastUpdated = Date.now()
      
      this.saveState()
      
      console.log(`Migration phase completed: ${phase.name}`)
      return true
      
    } catch (error) {
      this.addError(`Failed to complete phase ${phaseId}: ${error}`)
      return false
    }
  }

  // Check if success criteria are met
  private checkSuccessCriteria(phase: MigrationPhase): boolean {
    return phase.successCriteria.every(criterion => {
      const value = this.state.metrics[criterion.metric]
      if (value === undefined) {
        return false // Metric not available yet
      }

      switch (criterion.comparison) {
        case 'greater':
          return value > criterion.threshold
        case 'less':
          return value < criterion.threshold
        case 'equal':
          return value === criterion.threshold
        default:
          return false
      }
    })
  }

  // Rollback current phase
  public async rollbackPhase(phaseId?: string): Promise<boolean> {
    const targetPhaseId = phaseId || this.state.currentPhase
    if (!targetPhaseId) {
      this.addError('No phase to rollback')
      return false
    }

    const phase = this.phases.find(p => p.id === targetPhaseId)
    if (!phase) {
      this.addError(`Phase ${targetPhaseId} not found`)
      return false
    }

    try {
      // Remove features from active list
      this.state.activeFeatures = this.state.activeFeatures.filter(
        feature => !phase.features.includes(feature)
      )
      
      // Remove from completed phases if it was completed
      this.state.completedPhases = this.state.completedPhases.filter(
        id => id !== targetPhaseId
      )
      
      this.state.currentPhase = null
      this.state.lastUpdated = Date.now()
      
      this.saveState()
      
      console.log(`Migration phase rolled back: ${phase.name}`)
      return true
      
    } catch (error) {
      this.addError(`Failed to rollback phase ${targetPhaseId}: ${error}`)
      return false
    }
  }

  // Update metrics
  public updateMetric(name: string, value: number): void {
    this.state.metrics[name] = value
    this.state.lastUpdated = Date.now()
    this.saveState()
  }

  // Add error
  private addError(error: string): void {
    this.state.errors.push(`${new Date().toISOString()}: ${error}`)
    // Keep only last 10 errors
    if (this.state.errors.length > 10) {
      this.state.errors = this.state.errors.slice(-10)
    }
    this.saveState()
  }

  // Get migration status
  public getStatus(): {
    phase: MigrationPhase | null
    progress: number
    isEligible: boolean
    nextPhase: MigrationPhase | null
    errors: string[]
  } {
    const currentPhase = this.getCurrentPhase()
    const totalPhases = this.phases.length
    const completedCount = this.state.completedPhases.length
    const progress = (completedCount / totalPhases) * 100

    const nextPhase = this.phases.find(phase => 
      !this.state.completedPhases.includes(phase.id) &&
      this.areDependenciesMet(phase)
    )

    return {
      phase: currentPhase,
      progress,
      isEligible: currentPhase !== null,
      nextPhase,
      errors: this.state.errors
    }
  }

  // Get active features
  public getActiveFeatures(): string[] {
    return this.state.activeFeatures
  }

  // Check if feature is active
  public isFeatureActive(featureName: string): boolean {
    return this.state.activeFeatures.includes(featureName)
  }

  // Force enable feature (for testing)
  public forceEnableFeature(featureName: string): void {
    if (!this.state.activeFeatures.includes(featureName)) {
      this.state.activeFeatures.push(featureName)
      this.saveState()
    }
  }

  // Force disable feature (for emergencies)
  public forceDisableFeature(featureName: string): void {
    this.state.activeFeatures = this.state.activeFeatures.filter(
      feature => feature !== featureName
    )
    this.saveState()
  }

  // Reset migration state
  public reset(): void {
    this.state = {
      currentPhase: null,
      completedPhases: [],
      activeFeatures: [],
      rolloutPercentage: 0,
      userGroup: this.userGroup,
      lastUpdated: Date.now(),
      errors: [],
      metrics: {}
    }
    this.saveState()
  }

  // Export state for debugging
  public exportState(): MigrationState {
    return { ...this.state }
  }

  // Import state (for testing or recovery)
  public importState(state: MigrationState): void {
    this.state = state
    this.saveState()
  }
}

// React hook for migration management
export function useMigrationManager(userGroup?: string) {
  const { enableFlag, disableFlag } = useFeatureFlags()
  const { deviceType } = useEnhancedResponsive()
  
  const [manager] = React.useState(() => 
    new MigrationManager(RESPONSIVE_MIGRATION_PHASES, undefined, userGroup)
  )

  // Auto-sync feature flags with migration state
  React.useEffect(() => {
    const activeFeatures = manager.getActiveFeatures()
    
    // Enable active features
    activeFeatures.forEach(feature => {
      enableFlag(feature as any)
    })

    // Disable inactive features (optional - be careful)
    // This could be configurable based on rollback strategy
    
  }, [manager, enableFlag, disableFlag])

  // Auto-start eligible phases
  React.useEffect(() => {
    const status = manager.getStatus()
    
    if (status.phase && !status.phase.id.includes(status.phase.id)) {
      manager.startPhase(status.phase.id)
    }
  }, [manager])

  const startNextPhase = React.useCallback(async () => {
    const status = manager.getStatus()
    if (status.nextPhase) {
      return await manager.startPhase(status.nextPhase.id)
    }
    return false
  }, [manager])

  const completeCurrentPhase = React.useCallback(async () => {
    const status = manager.getStatus()
    if (status.phase) {
      return await manager.completePhase(status.phase.id)
    }
    return false
  }, [manager])

  const rollbackCurrentPhase = React.useCallback(async () => {
    const status = manager.getStatus()
    if (status.phase) {
      return await manager.rollbackPhase(status.phase.id)
    }
    return false
  }, [manager])

  return {
    manager,
    status: manager.getStatus(),
    activeFeatures: manager.getActiveFeatures(),
    startNextPhase,
    completeCurrentPhase,
    rollbackCurrentPhase,
    updateMetric: manager.updateMetric.bind(manager),
    isFeatureActive: manager.isFeatureActive.bind(manager)
  }
}

export default MigrationManager