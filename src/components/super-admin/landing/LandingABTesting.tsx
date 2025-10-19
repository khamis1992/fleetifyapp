import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { TestTube, Play, Pause, Trophy, BarChart3, Plus, Eye, Settings } from 'lucide-react';
import { useLandingABTests } from '@/hooks/useLandingABTests';
import { useCompanies } from '@/hooks/useCompanies';
import { toast } from 'sonner';

interface ABTest {
  id: string;
  test_name: string;
  test_name_ar?: string;
  description?: string;
  variant_a_config: any;
  variant_b_config: any;
  traffic_split: number;
  start_date?: string;
  end_date?: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  winner_variant?: 'a' | 'b';
  conversion_goal: string;
  is_active: boolean;
  company_id: string;
}

export const LandingABTesting: React.FC = () => {
  const { tests, loading, createTest, updateTest, deleteTest } = useLandingABTests();
  const { companies } = useCompanies();
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [editingTest, setEditingTest] = useState<ABTest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleCreateTest = async (data: any) => {
    try {
      await createTest({
        ...data,
        company_id: selectedCompany === 'all' ? '00000000-0000-0000-0000-000000000000' : selectedCompany,
        status: 'draft',
        is_active: true
      });
      toast.success('A/B test created successfully');
      setIsDialogOpen(false);
      setEditingTest(null);
    } catch (error) {
      toast.error('Failed to create A/B test');
    }
  };

  const handleUpdateTest = async (id: string, data: any) => {
    try {
      await updateTest(id, data);
      toast.success('A/B test updated successfully');
      setIsDialogOpen(false);
      setEditingTest(null);
    } catch (error) {
      toast.error('Failed to update A/B test');
    }
  };

  const handleStartTest = async (test: ABTest) => {
    try {
      await updateTest(test.id, {
        ...test,
        status: 'active',
        start_date: new Date().toISOString()
      });
      toast.success('A/B test started successfully');
    } catch (error) {
      toast.error('Failed to start A/B test');
    }
  };

  const handlePauseTest = async (test: ABTest) => {
    try {
      await updateTest(test.id, {
        ...test,
        status: 'paused'
      });
      toast.success('A/B test paused');
    } catch (error) {
      toast.error('Failed to pause A/B test');
    }
  };

  const handleCompleteTest = async (test: ABTest, winner: 'a' | 'b') => {
    try {
      await updateTest(test.id, {
        ...test,
        status: 'completed',
        end_date: new Date().toISOString(),
        winner_variant: winner
      });
      toast.success(`A/B test completed. Variant ${winner.toUpperCase()} declared winner!`);
    } catch (error) {
      toast.error('Failed to complete A/B test');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'paused': return 'secondary';
      case 'completed': return 'outline';
      default: return 'secondary';
    }
  };

  // TODO: Replace with real A/B test performance data from landing_analytics table
  // Currently using placeholder data until backend tracking is implemented
  // Future: Query landing_analytics where event_data contains {ab_test_id, variant}
  const getTestPerformance = (testId: string, test: ABTest) => {
    // Use test ID as seed for deterministic placeholder data (consistent across renders)
    const seed = testId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const baseVisitors = 500 + (seed % 500);

    // If test hasn't started, show zeros
    if (test.status === 'draft') {
      return {
        variant_a: { visitors: 0, conversions: 0, conversion_rate: '0.00' },
        variant_b: { visitors: 0, conversions: 0, conversion_rate: '0.00' }
      };
    }

    // Generate realistic placeholder data based on traffic split
    const visitorsA = Math.floor(baseVisitors * (test.traffic_split / 100));
    const visitorsB = Math.floor(baseVisitors * ((100 - test.traffic_split) / 100));
    const conversionRateA = 3.5 + ((seed % 20) / 10); // 3.5-5.5%
    const conversionRateB = 3.2 + ((seed % 25) / 10); // 3.2-5.7%

    return {
      variant_a: {
        visitors: visitorsA,
        conversions: Math.floor(visitorsA * conversionRateA / 100),
        conversion_rate: conversionRateA.toFixed(2)
      },
      variant_b: {
        visitors: visitorsB,
        conversions: Math.floor(visitorsB * conversionRateB / 100),
        conversion_rate: conversionRateB.toFixed(2)
      }
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies (Global)</SelectItem>
              {companies?.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.company_name || company.company_name_ar || 'Unnamed Company'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingTest(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Create A/B Test
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTest ? 'Edit A/B Test' : 'Create New A/B Test'}
              </DialogTitle>
              <DialogDescription>
                Set up an A/B test to optimize your landing page performance.
              </DialogDescription>
            </DialogHeader>
            <ABTestForm
              test={editingTest}
              onSubmit={editingTest ? 
                (data) => handleUpdateTest(editingTest.id, data) :
                handleCreateTest
              }
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading A/B tests...</p>
          </div>
        ) : tests.length === 0 ? (
          <div className="text-center py-12">
            <TestTube className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No A/B Tests Found</h3>
            <p className="text-muted-foreground mb-4">
              Create your first A/B test to start optimizing your landing pages.
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First A/B Test
            </Button>
          </div>
        ) : (
          tests.map((test) => {
            const performance = getTestPerformance(test.id, test);
            const isWinnerA = parseFloat(performance.variant_a.conversion_rate) > parseFloat(performance.variant_b.conversion_rate);
            
            return (
              <Card key={test.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <TestTube className="h-5 w-5" />
                        {test.test_name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={getStatusColor(test.status)}>
                          {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                        </Badge>
                        <Badge variant="outline">
                          {test.traffic_split}% / {100 - test.traffic_split}%
                        </Badge>
                        {test.winner_variant && (
                          <Badge variant="default" className="bg-green-600">
                            <Trophy className="h-3 w-3 mr-1" />
                            Winner: {test.winner_variant.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {test.status === 'draft' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleStartTest(test)}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Start
                        </Button>
                      )}
                      
                      {test.status === 'active' && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handlePauseTest(test)}
                          >
                            <Pause className="h-4 w-4 mr-1" />
                            Pause
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleCompleteTest(test, isWinnerA ? 'a' : 'b')}
                          >
                            <Trophy className="h-4 w-4 mr-1" />
                            Declare Winner
                          </Button>
                        </>
                      )}
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setEditingTest(test);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {test.description && (
                    <p className="text-muted-foreground">{test.description}</p>
                  )}
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Variant A */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">Variant A (Control)</h4>
                        {test.winner_variant === 'a' && (
                          <Trophy className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      
                      <div className="bg-muted/30 p-4 rounded-lg">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-2xl font-bold">{performance.variant_a.visitors}</p>
                            <p className="text-sm text-muted-foreground">Visitors</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{performance.variant_a.conversions}</p>
                            <p className="text-sm text-muted-foreground">Conversions</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-primary">
                              {performance.variant_a.conversion_rate}%
                            </p>
                            <p className="text-sm text-muted-foreground">Conversion Rate</p>
                          </div>
                        </div>
                      </div>
                      
                      <Progress 
                        value={test.traffic_split} 
                        className="h-2" 
                      />
                      <p className="text-sm text-muted-foreground text-center">
                        {test.traffic_split}% of traffic
                      </p>
                    </div>

                    {/* Variant B */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">Variant B (Test)</h4>
                        {test.winner_variant === 'b' && (
                          <Trophy className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      
                      <div className="bg-muted/30 p-4 rounded-lg">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-2xl font-bold">{performance.variant_b.visitors}</p>
                            <p className="text-sm text-muted-foreground">Visitors</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{performance.variant_b.conversions}</p>
                            <p className="text-sm text-muted-foreground">Conversions</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-primary">
                              {performance.variant_b.conversion_rate}%
                            </p>
                            <p className="text-sm text-muted-foreground">Conversion Rate</p>
                          </div>
                        </div>
                      </div>
                      
                      <Progress 
                        value={100 - test.traffic_split} 
                        className="h-2" 
                      />
                      <p className="text-sm text-muted-foreground text-center">
                        {100 - test.traffic_split}% of traffic
                      </p>
                    </div>
                  </div>
                  
                  {test.status === 'active' && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-blue-600" />
                        <p className="text-sm text-blue-800">
                          Test is currently running. Goal: {test.conversion_goal}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

interface ABTestFormProps {
  test?: ABTest | null;
  onSubmit: (data: any) => void;
}

const ABTestForm: React.FC<ABTestFormProps> = ({ test, onSubmit }) => {
  const [formData, setFormData] = useState({
    test_name: test?.test_name || '',
    test_name_ar: test?.test_name_ar || '',
    description: test?.description || '',
    traffic_split: test?.traffic_split || 50,
    conversion_goal: test?.conversion_goal || '',
    variant_a_config: test?.variant_a_config || {},
    variant_b_config: test?.variant_b_config || {}
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="test_name">Test Name (English)</Label>
          <Input
            id="test_name"
            value={formData.test_name}
            onChange={(e) => setFormData(prev => ({ ...prev, test_name: e.target.value }))}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="test_name_ar">Test Name (Arabic)</Label>
          <Input
            id="test_name_ar"
            value={formData.test_name_ar}
            onChange={(e) => setFormData(prev => ({ ...prev, test_name_ar: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Describe what you're testing and why..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="traffic_split">Traffic Split (% for Variant B)</Label>
          <Input
            id="traffic_split"
            type="number"
            min="10"
            max="90"
            value={formData.traffic_split}
            onChange={(e) => setFormData(prev => ({ ...prev, traffic_split: parseInt(e.target.value) }))}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="conversion_goal">Conversion Goal</Label>
          <Select 
            value={formData.conversion_goal} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, conversion_goal: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select goal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="button_clicks">Button Clicks</SelectItem>
              <SelectItem value="form_submissions">Form Submissions</SelectItem>
              <SelectItem value="page_views">Page Views</SelectItem>
              <SelectItem value="time_on_page">Time on Page</SelectItem>
              <SelectItem value="scroll_depth">Scroll Depth</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DialogFooter>
        <Button type="submit">
          {test ? 'Update A/B Test' : 'Create A/B Test'}
        </Button>
      </DialogFooter>
    </form>
  );
};