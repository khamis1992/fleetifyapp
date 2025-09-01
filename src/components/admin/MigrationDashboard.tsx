import React, { useState, useEffect } from 'react'
import { useMigrationManager } from '@/utils/migrationManager'
import { useFeatureFlags } from '@/contexts/FeatureFlagsContext'
import { ResponsiveCard, ResponsiveButton } from '@/components/responsive/ResponsiveComponents'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import {
  Play,
  Square,
  CheckCircle,
  XCircle,
  RotateCcw,
  AlertTriangle,
  TrendingUp,
  Settings,
  Download,
  Upload,
  RefreshCw,
  Users,
  Smartphone,
  Monitor,
  Clock,
  BarChart3
} from 'lucide-react'

interface MigrationDashboardProps {
  userGroup?: string
  showAdvancedControls?: boolean
}

export function MigrationDashboard({ 
  userGroup = 'all',
  showAdvancedControls = false 
}: MigrationDashboardProps) {
  const {
    manager,
    status,
    activeFeatures,
    startNextPhase,
    completeCurrentPhase,
    rollbackCurrentPhase,
    updateMetric,
    isFeatureActive
  } = useMigrationManager(userGroup)

  const { flags, toggleFlag, exportFlags, importFlags } = useFeatureFlags()
  const [isLoading, setIsLoading] = useState(false)
  const [lastAction, setLastAction] = useState<string>('')

  // Mock metrics for demonstration
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate metric updates
      updateMetric('loadTime', Math.random() * 3000 + 1000)
      updateMetric('errorRate', Math.random() * 2)
      updateMetric('userSatisfaction', Math.random() * 1 + 4)
      updateMetric('taskCompletionRate', Math.random() * 20 + 80)
      updateMetric('performanceScore', Math.random() * 20 + 80)
    }, 5000)

    return () => clearInterval(interval)
  }, [updateMetric])

  const handleStartPhase = async () => {
    if (!status.nextPhase) return
    
    setIsLoading(true)
    try {
      const success = await startNextPhase()
      setLastAction(success ? `Started phase: ${status.nextPhase.name}` : 'Failed to start phase')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCompletePhase = async () => {
    if (!status.phase) return
    
    setIsLoading(true)
    try {
      const success = await completeCurrentPhase()
      setLastAction(success ? `Completed phase: ${status.phase.name}` : 'Failed to complete phase')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRollback = async () => {
    if (!status.phase) return
    
    setIsLoading(true)
    try {
      const success = await rollbackCurrentPhase()
      setLastAction(success ? `Rolled back phase: ${status.phase.name}` : 'Failed to rollback phase')
    } finally {
      setIsLoading(false)
    }
  }

  const exportMigrationState = () => {
    const state = manager.exportState()
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `migration-state-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importMigrationState = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const state = JSON.parse(e.target?.result as string)
            manager.importState(state)
            setLastAction('Migration state imported successfully')
          } catch (error) {
            setLastAction('Failed to import migration state')
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  const getPhaseStatusIcon = (phaseId: string) => {
    if (manager.getStatus().phase?.id === phaseId) {
      return <Clock className="text-orange-500" size={20} />
    }
    if (manager.exportState().completedPhases.includes(phaseId)) {
      return <CheckCircle className="text-green-500" size={20} />
    }
    return <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
  }

  const getFeatureStatusColor = (featureName: string) => {
    return isFeatureActive(featureName) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
  }

  // Only show to authorized users
  if (userGroup !== 'internal' && !showAdvancedControls) {
    return null
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Migration Dashboard</h1>
          <p className="text-muted-foreground">إدارة عملية التحول إلى التصميم التكيفي</p>
        </div>
        
        <div className="flex gap-2">
          {showAdvancedControls && (
            <>
              <ResponsiveButton variant="outline" onClick={exportMigrationState}>
                <Download size={16} className="mr-2" />
                Export State
              </ResponsiveButton>
              <ResponsiveButton variant="outline" onClick={importMigrationState}>
                <Upload size={16} className="mr-2" />
                Import State
              </ResponsiveButton>
              <ResponsiveButton variant="outline" onClick={() => window.location.reload()}>
                <RefreshCw size={16} className="mr-2" />
                Refresh
              </ResponsiveButton>
            </>
          )}
        </div>
      </div>

      {/* Last Action Alert */}
      {lastAction && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{lastAction}</AlertDescription>
        </Alert>
      )}

      {/* Overall Progress */}
      <ResponsiveCard title="Overall Migration Progress" className="border-2">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="font-medium">Progress</span>
            <span className="text-2xl font-bold">{Math.round(status.progress)}%</span>
          </div>
          
          <Progress value={status.progress} className="h-3" />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {manager.exportState().completedPhases.length}
              </div>
              <div className="text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {status.phase ? 1 : 0}
              </div>
              <div className="text-muted-foreground">In Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {activeFeatures.length}
              </div>
              <div className="text-muted-foreground">Active Features</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {status.errors.length}
              </div>
              <div className="text-muted-foreground">Errors</div>
            </div>
          </div>
        </div>
      </ResponsiveCard>

      {/* Current Phase */}
      {status.phase && (
        <ResponsiveCard title="Current Phase" className="border-2 border-orange-200">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Clock className="text-orange-500" size={24} />
              <div>
                <h3 className="font-semibold text-lg">{status.phase.name}</h3>
                <p className="text-muted-foreground">{status.phase.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Rollout Percentage</span>
                <div className="text-lg font-bold">{status.phase.rolloutPercentage}%</div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Target Users</span>
                <div className="text-lg font-bold capitalize">{status.phase.targetUsers}</div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Estimated Duration</span>
                <div className="text-lg font-bold">{status.phase.estimatedDuration} days</div>
              </div>
            </div>

            <div>
              <span className="text-sm text-muted-foreground mb-2 block">Active Features</span>
              <div className="flex flex-wrap gap-2">
                {status.phase.features.map(feature => (
                  <Badge key={feature} className={getFeatureStatusColor(feature)}>
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <ResponsiveButton
                onClick={handleCompletePhase}
                disabled={isLoading}
                className="flex-1"
              >
                <CheckCircle size={16} className="mr-2" />
                Complete Phase
              </ResponsiveButton>
              
              <ResponsiveButton
                variant="destructive"
                onClick={handleRollback}
                disabled={isLoading}
              >
                <RotateCcw size={16} className="mr-2" />
                Rollback
              </ResponsiveButton>
            </div>
          </div>
        </ResponsiveCard>
      )}

      {/* Next Phase */}
      {status.nextPhase && !status.phase && (
        <ResponsiveCard title="Next Phase" className="border-2 border-blue-200">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Play className="text-blue-500" size={24} />
              <div>
                <h3 className="font-semibold text-lg">{status.nextPhase.name}</h3>
                <p className="text-muted-foreground">{status.nextPhase.description}</p>
              </div>
            </div>

            <ResponsiveButton
              onClick={handleStartPhase}
              disabled={isLoading || !status.isEligible}
              className="w-full"
            >
              <Play size={16} className="mr-2" />
              Start Phase
            </ResponsiveButton>
          </div>
        </ResponsiveCard>
      )}

      {/* All Phases Timeline */}
      <ResponsiveCard title="Migration Timeline">
        <div className="space-y-4">
          {manager.exportState().completedPhases.map((phaseId, index) => {
            const phase = manager['phases'].find(p => p.id === phaseId)
            if (!phase) return null

            return (
              <div key={phaseId} className="flex items-center gap-4 p-3 bg-green-50 rounded-lg">
                {getPhaseStatusIcon(phaseId)}
                <div className="flex-1">
                  <h4 className="font-medium">{phase.name}</h4>
                  <p className="text-sm text-muted-foreground">{phase.description}</p>
                </div>
                <Badge className="bg-green-100 text-green-800">Completed</Badge>
              </div>
            )
          })}

          {status.phase && (
            <div className="flex items-center gap-4 p-3 bg-orange-50 rounded-lg">
              {getPhaseStatusIcon(status.phase.id)}
              <div className="flex-1">
                <h4 className="font-medium">{status.phase.name}</h4>
                <p className="text-sm text-muted-foreground">{status.phase.description}</p>
              </div>
              <Badge className="bg-orange-100 text-orange-800">In Progress</Badge>
            </div>
          )}

          {manager['phases']
            .filter(phase => 
              !manager.exportState().completedPhases.includes(phase.id) &&
              phase.id !== status.phase?.id
            )
            .map(phase => (
              <div key={phase.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                {getPhaseStatusIcon(phase.id)}
                <div className="flex-1">
                  <h4 className="font-medium text-muted-foreground">{phase.name}</h4>
                  <p className="text-sm text-muted-foreground">{phase.description}</p>
                </div>
                <Badge variant="outline">Pending</Badge>
              </div>
            ))}
        </div>
      </ResponsiveCard>

      {/* Feature Flags Status */}
      <ResponsiveCard title="Feature Flags Status">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(flags).map(([flag, enabled]) => (
            <div
              key={flag}
              className={cn(
                "p-3 rounded-lg border flex items-center justify-between",
                enabled ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
              )}
            >
              <span className="text-sm font-medium">{flag}</span>
              <div className="flex items-center gap-2">
                {showAdvancedControls && (
                  <button
                    onClick={() => toggleFlag(flag as any)}
                    className={cn(
                      "w-6 h-6 rounded text-xs font-bold",
                      enabled ? "bg-green-500 text-white" : "bg-gray-300 text-gray-600"
                    )}
                  >
                    {enabled ? '✓' : '✗'}
                  </button>
                )}
                <Badge className={getFeatureStatusColor(flag)}>
                  {enabled ? 'ON' : 'OFF'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </ResponsiveCard>

      {/* Metrics Dashboard */}
      <ResponsiveCard title="Performance Metrics">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(manager.exportState().metrics).map(([metric, value]) => (
            <div key={metric} className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={16} className="text-blue-500" />
                <span className="text-sm font-medium capitalize">
                  {metric.replace(/([A-Z])/g, ' $1').trim()}
                </span>
              </div>
              <div className="text-2xl font-bold">
                {typeof value === 'number' ? 
                  (value < 10 ? value.toFixed(2) : Math.round(value)) : 
                  value
                }
                {metric.includes('Time') && 'ms'}
                {metric.includes('Rate') && '%'}
                {metric.includes('Score') && '%'}
              </div>
            </div>
          ))}
        </div>
      </ResponsiveCard>

      {/* Errors */}
      {status.errors.length > 0 && (
        <ResponsiveCard title="Recent Errors" className="border-2 border-red-200">
          <div className="space-y-2">
            {status.errors.slice(-5).map((error, index) => (
              <div key={index} className="p-2 bg-red-50 rounded text-sm text-red-700">
                {error}
              </div>
            ))}
          </div>
        </ResponsiveCard>
      )}
    </div>
  )
}