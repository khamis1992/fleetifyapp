import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { MapPin, Save, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface FormData {
  office_latitude: string;
  office_longitude: string;
  allowed_radius: number;
  work_start_time: string;
  work_end_time: string;
  auto_checkout_enabled: boolean;
}

export default function LocationSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Get user's company
  const { data: company, isLoading } = useQuery({
    queryKey: ['company-location', user?.id],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user?.id)
        .single();

      if (!profile?.company_id) throw new Error('No company found');

      const { data, error } = await supabase
        .from('companies')
        .select(`
          id, name, 
          office_latitude, office_longitude, allowed_radius,
          work_start_time, work_end_time, auto_checkout_enabled
        `)
        .eq('id', profile.company_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const [formData, setFormData] = useState<FormData>({
    office_latitude: '',
    office_longitude: '',
    allowed_radius: 100,
    work_start_time: '08:00',
    work_end_time: '17:00',
    auto_checkout_enabled: true,
  });

  // Update form data when company data loads
  useEffect(() => {
    if (company) {
      setFormData({
        office_latitude: company.office_latitude?.toString() || '',
        office_longitude: company.office_longitude?.toString() || '',
        allowed_radius: company.allowed_radius || 100,
        work_start_time: company.work_start_time || '08:00',
        work_end_time: company.work_end_time || '17:00',
        auto_checkout_enabled: company.auto_checkout_enabled ?? true,
      });
    }
  }, [company]);

  const updateLocationSettings = useMutation({
    mutationFn: async (data: {
      office_latitude: number;
      office_longitude: number;
      allowed_radius: number;
      work_start_time: string;
      work_end_time: string;
      auto_checkout_enabled: boolean;
    }) => {
      const { error } = await supabase
        .from('companies')
        .update(data)
        .eq('id', company?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Location settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['company-location'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update settings');
    },
  });

  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser');
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        });
      });

      setFormData(prev => ({
        ...prev,
        office_latitude: position.coords.latitude.toString(),
        office_longitude: position.coords.longitude.toString(),
      }));

      toast.success('Current location captured successfully');
    } catch (error: any) {
      toast.error(`Failed to get location: ${error.message}`);
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.office_latitude || !formData.office_longitude) {
      toast.error('Please set office coordinates');
      return;
    }

    updateLocationSettings.mutate({
      office_latitude: parseFloat(formData.office_latitude),
      office_longitude: parseFloat(formData.office_longitude),
      allowed_radius: formData.allowed_radius,
      work_start_time: formData.work_start_time,
      work_end_time: formData.work_end_time,
      auto_checkout_enabled: formData.auto_checkout_enabled,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Location Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure office location and attendance settings for {company?.name}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Office Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Office Location
              </CardTitle>
              <CardDescription>
                Set the GPS coordinates for your office location. Employees will need to be within the specified radius to clock in/out.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    placeholder="29.3759"
                    value={formData.office_latitude}
                    onChange={(e) => setFormData(prev => ({ ...prev, office_latitude: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    placeholder="47.9774"
                    value={formData.office_longitude}
                    onChange={(e) => setFormData(prev => ({ ...prev, office_longitude: e.target.value }))}
                  />
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={getCurrentLocation}
                disabled={isGettingLocation}
                className="w-full"
              >
                {isGettingLocation ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Getting Current Location...
                  </>
                ) : (
                  <>
                    <MapPin className="mr-2 h-4 w-4" />
                    Use Current Location
                  </>
                )}
              </Button>

              <div className="space-y-2">
                <Label htmlFor="radius">Allowed Radius (meters)</Label>
                <Input
                  id="radius"
                  type="number"
                  min="10"
                  max="1000"
                  value={formData.allowed_radius}
                  onChange={(e) => setFormData(prev => ({ ...prev, allowed_radius: parseInt(e.target.value) }))}
                />
                <p className="text-sm text-muted-foreground">
                  Employees must be within this distance from the office to clock in/out
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Work Hours */}
          <Card>
            <CardHeader>
              <CardTitle>Work Hours & Auto Checkout</CardTitle>
              <CardDescription>
                Configure standard work hours and automatic checkout settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-time">Work Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={formData.work_start_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, work_start_time: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time">Work End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={formData.work_end_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, work_end_time: e.target.value }))}
                  />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-checkout">Auto Checkout</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically clock out employees who forget to clock out after work hours
                  </p>
                </div>
                <Switch
                  id="auto-checkout"
                  checked={formData.auto_checkout_enabled}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_checkout_enabled: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={updateLocationSettings.isPending}
              className="w-full sm:w-auto"
            >
              {updateLocationSettings.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}