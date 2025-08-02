import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useContractCreation } from "@/hooks/useContractCreation"
import { EnhancedContractCreationProgress } from "./EnhancedContractCreationProgress"
import { useAuth } from "@/contexts/AuthContext"
import { ContractCreationData } from "@/types/contracts"

export const ContractCreationTest = () => {
  const [isTestRunning, setIsTestRunning] = useState(false)
  const { user } = useAuth()
  const { createContract, creationState, isCreating, retryCreation, resetCreationState } = useContractCreation()

  // Sample test data
  const testContractData: ContractCreationData = {
    customer_id: '00000000-0000-0000-0000-000000000001', // This should be replaced with actual customer ID
    vehicle_id: null,
    contract_type: 'monthly_rental',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    contract_amount: 1000.000,
    monthly_amount: 1000.000,
    description: 'Test contract creation - Monthly rental agreement',
    terms: 'Standard rental terms and conditions',
    cost_center_id: null,
    contract_number: `TEST-CON-${Date.now()}`,
    contract_date: new Date().toISOString().split('T')[0]
  }

  const handleTestCreation = async () => {
    if (!user?.profile?.company_id) {
      console.error('❌ No company ID found for user')
      return
    }

    console.log('🧪 [TEST] Starting contract creation test')
    setIsTestRunning(true)
    resetCreationState()

    const finalData = {
      ...testContractData,
      company_id: user.profile.company_id,
      created_by: user.id
    }

    console.log('🧪 [TEST] Test data:', finalData)
    
    try {
      await createContract(finalData)
    } catch (error) {
      console.error('❌ [TEST] Error in test creation:', error)
    }
  }

  const handleTestComplete = () => {
    setIsTestRunning(false)
    resetCreationState()
    console.log('✅ [TEST] Test completed')
  }

  const handleTestRetry = () => {
    console.log('🔄 [TEST] Retrying test')
    retryCreation()
  }

  const getOverallStatus = () => {
    const { steps } = creationState
    const completedSteps = steps.filter(step => step.status === 'completed').length
    const failedSteps = steps.filter(step => step.status === 'failed').length
    const totalSteps = steps.length

    if (failedSteps > 0) return 'failed'
    if (completedSteps === totalSteps && totalSteps > 0) return 'completed'
    if (isCreating || isTestRunning) return 'processing'
    return 'idle'
  }

  const status = getOverallStatus()

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🧪 Contract Creation Test
          <Badge variant={
            status === 'completed' ? 'default' :
            status === 'failed' ? 'destructive' :
            status === 'processing' ? 'secondary' : 'outline'
          }>
            {status}
          </Badge>
        </CardTitle>
        <CardDescription>
          Test the contract creation functionality with sample data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="font-medium">Test Data:</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>Type: Monthly Rental</div>
            <div>Amount: 1,000.000 KWD</div>
            <div>Duration: 30 days</div>
            <div>Description: Test contract creation</div>
          </div>
        </div>

        {!isTestRunning && !isCreating && creationState.steps.length === 0 && (
          <Button 
            onClick={handleTestCreation}
            className="w-full"
            disabled={!user?.profile?.company_id}
          >
            {!user?.profile?.company_id ? 'No Company ID Found' : 'Start Test'}
          </Button>
        )}

        {(isTestRunning || isCreating || creationState.steps.length > 0) && (
          <EnhancedContractCreationProgress
            creationState={creationState}
            onRetry={handleTestRetry}
            onCancel={handleTestComplete}
            className="mt-4"
          />
        )}

        {status === 'completed' && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <h4 className="font-medium text-green-800">✅ Test Successful!</h4>
            <p className="text-sm text-green-600 mt-1">
              Contract creation process completed successfully.
              {creationState.contractId && (
                <span className="block mt-1">
                  Contract ID: <code className="bg-green-100 px-1 rounded">{creationState.contractId}</code>
                </span>
              )}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestComplete}
              className="mt-2"
            >
              Reset Test
            </Button>
          </div>
        )}

        {status === 'failed' && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <h4 className="font-medium text-red-800">❌ Test Failed</h4>
            <p className="text-sm text-red-600 mt-1">
              Check the steps above for error details.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}