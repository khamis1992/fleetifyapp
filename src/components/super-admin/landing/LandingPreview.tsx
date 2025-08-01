import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Monitor, Smartphone, Tablet, Eye, RefreshCw, ExternalLink } from 'lucide-react';
import { useLandingSections } from '@/hooks/useLandingSections';
import { useLandingThemes } from '@/hooks/useLandingThemes';

export const LandingPreview: React.FC = () => {
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedTheme, setSelectedTheme] = useState<string>('');
  const [deviceView, setDeviceView] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [showRulers, setShowRulers] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { sections, loading: sectionsLoading } = useLandingSections();
  const { themes, loading: themesLoading } = useLandingThemes();

  const deviceDimensions = {
    desktop: { width: '100%', height: '600px' },
    tablet: { width: '768px', height: '1024px' },
    mobile: { width: '375px', height: '667px' }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate refresh
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleOpenInNewTab = () => {
    // TODO: Open preview in new tab/window
    window.open('/preview', '_blank');
  };

  const activeSections = sections.filter(section => section.is_active);
  const selectedThemeData = themes.find(theme => theme.id === selectedTheme);

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
              {/* TODO: Add company options */}
            </SelectContent>
          </Select>
          
          <Select value={selectedTheme} onValueChange={setSelectedTheme}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Theme" />
            </SelectTrigger>
            <SelectContent>
              {themes.map(theme => (
                <SelectItem key={theme.id} value={theme.id}>
                  <div className="flex items-center gap-2">
                    {theme.theme_name}
                    {theme.is_default && <Badge variant="outline">Default</Badge>}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button variant="outline" onClick={handleOpenInNewTab}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </Button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Preview Controls */}
        <Card className="w-64 flex-shrink-0">
          <CardHeader>
            <CardTitle>Preview Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Device View</Label>
              <div className="flex gap-1">
                <Button
                  variant={deviceView === 'desktop' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDeviceView('desktop')}
                >
                  <Monitor className="h-4 w-4" />
                </Button>
                <Button
                  variant={deviceView === 'tablet' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDeviceView('tablet')}
                >
                  <Tablet className="h-4 w-4" />
                </Button>
                <Button
                  variant={deviceView === 'mobile' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDeviceView('mobile')}
                >
                  <Smartphone className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="rulers"
                checked={showRulers}
                onCheckedChange={setShowRulers}
              />
              <Label htmlFor="rulers">Show Rulers</Label>
            </div>
            
            <div className="space-y-2">
              <Label>Active Sections ({activeSections.length})</Label>
              <div className="space-y-1">
                {activeSections.map((section, index) => (
                  <div key={section.id} className="flex items-center justify-between text-sm">
                    <span>{index + 1}. {section.section_name}</span>
                    <Badge variant="outline" className="text-xs">
                      {section.section_type}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
            
            {selectedThemeData && (
              <div className="space-y-2">
                <Label>Theme Info</Label>
                <div className="text-sm space-y-1">
                  <p><strong>Name:</strong> {selectedThemeData.theme_name}</p>
                  <p><strong>Colors:</strong> {Object.keys(selectedThemeData.colors).length} defined</p>
                  <p><strong>Fonts:</strong> {Object.keys(selectedThemeData.fonts).length} configured</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview Area */}
        <div className="flex-1">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Live Preview - {deviceView.charAt(0).toUpperCase() + deviceView.slice(1)}
                </CardTitle>
                <Badge variant="outline">
                  {deviceDimensions[deviceView].width} × {deviceDimensions[deviceView].height}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {showRulers && (
                  <>
                    {/* Horizontal Ruler */}
                    <div className="absolute -top-6 left-0 right-0 h-6 bg-muted flex items-end text-xs">
                      {Array.from({ length: 20 }, (_, i) => (
                        <div key={i} className="flex-1 border-r border-border text-center">
                          {i * 50}
                        </div>
                      ))}
                    </div>
                    
                    {/* Vertical Ruler */}
                    <div className="absolute -left-6 top-0 bottom-0 w-6 bg-muted flex flex-col text-xs">
                      {Array.from({ length: 12 }, (_, i) => (
                        <div key={i} className="flex-1 border-b border-border flex items-center justify-center">
                          {i * 50}
                        </div>
                      ))}
                    </div>
                  </>
                )}
                
                <div 
                  className="mx-auto border rounded-lg overflow-hidden bg-background transition-all duration-300"
                  style={{
                    width: deviceView === 'desktop' ? '100%' : deviceDimensions[deviceView].width,
                    height: deviceDimensions[deviceView].height,
                    maxWidth: deviceView === 'desktop' ? 'none' : deviceDimensions[deviceView].width
                  }}
                >
                  {sectionsLoading || themesLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">Loading preview...</p>
                      </div>
                    </div>
                  ) : activeSections.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <Eye className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">No active sections to preview</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Add sections in the Content tab to see them here
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full overflow-y-auto">
                      {/* Preview Content */}
                      <div 
                        className="min-h-full"
                        style={{
                          fontFamily: selectedThemeData?.fonts?.body || 'Inter, sans-serif',
                          backgroundColor: selectedThemeData?.colors?.background ? `hsl(${selectedThemeData.colors.background})` : '#ffffff',
                          color: selectedThemeData?.colors?.foreground ? `hsl(${selectedThemeData.colors.foreground})` : '#000000'
                        }}
                      >
                        {activeSections.map((section, index) => (
                          <div key={section.id} className="relative group">
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <Badge variant="secondary" className="text-xs">
                                {section.section_type}
                              </Badge>
                            </div>
                            
                            <PreviewSection 
                              section={section} 
                              theme={selectedThemeData}
                              deviceView={deviceView}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

interface PreviewSectionProps {
  section: any;
  theme: any;
  deviceView: 'desktop' | 'tablet' | 'mobile';
}

const PreviewSection: React.FC<PreviewSectionProps> = ({ section, theme, deviceView }) => {
  const baseStyles = {
    padding: deviceView === 'mobile' ? '2rem 1rem' : '4rem 2rem',
    backgroundColor: theme?.colors?.background ? `hsl(${theme.colors.background})` : '#ffffff'
  };

  switch (section.section_type) {
    case 'hero':
      return (
        <div style={baseStyles} className="text-center">
          <h1 
            className="text-4xl font-bold mb-4"
            style={{ 
              fontFamily: theme?.fonts?.heading || 'Cairo, sans-serif',
              color: theme?.colors?.foreground ? `hsl(${theme.colors.foreground})` : '#000000'
            }}
          >
            Welcome to Our Platform
          </h1>
          <p className="text-xl mb-8 text-muted-foreground">
            Experience the future of business management
          </p>
          <button 
            className="px-8 py-3 rounded-lg font-semibold"
            style={{
              backgroundColor: theme?.colors?.primary ? `hsl(${theme.colors.primary})` : '#3b82f6',
              color: 'white'
            }}
          >
            Get Started Today
          </button>
        </div>
      );
      
    case 'features':
      return (
        <div style={baseStyles}>
          <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
          <div className={`grid gap-8 ${deviceView === 'mobile' ? 'grid-cols-1' : 'grid-cols-3'}`}>
            {[1, 2, 3].map(i => (
              <div key={i} className="text-center">
                <div 
                  className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                  style={{ backgroundColor: theme?.colors?.primary ? `hsl(${theme.colors.primary})` : '#3b82f6' }}
                >
                  <Eye className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Feature {i}</h3>
                <p className="text-muted-foreground">Description of this amazing feature that will help your business grow.</p>
              </div>
            ))}
          </div>
        </div>
      );
      
    case 'testimonials':
      return (
        <div style={baseStyles} className="bg-muted/30">
          <h2 className="text-3xl font-bold text-center mb-12">What Our Customers Say</h2>
          <div className={`grid gap-8 ${deviceView === 'mobile' ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {[1, 2].map(i => (
              <div key={i} className="bg-background p-6 rounded-lg shadow-sm">
                <p className="text-muted-foreground mb-4">
                  "This platform has transformed how we manage our business. Highly recommended!"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20"></div>
                  <div>
                    <p className="font-semibold">Customer {i}</p>
                    <p className="text-sm text-muted-foreground">CEO, Company {i}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
      
    case 'cta':
      return (
        <div style={baseStyles} className="text-center bg-primary/5">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8 text-muted-foreground">
            Join thousands of satisfied customers today
          </p>
          <div className="flex gap-4 justify-center">
            <button 
              className="px-8 py-3 rounded-lg font-semibold"
              style={{
                backgroundColor: theme?.colors?.primary ? `hsl(${theme.colors.primary})` : '#3b82f6',
                color: 'white'
              }}
            >
              Start Free Trial
            </button>
            <button className="px-8 py-3 rounded-lg font-semibold border border-primary text-primary">
              Learn More
            </button>
          </div>
        </div>
      );
      
    default:
      return (
        <div style={baseStyles}>
          <h2 className="text-2xl font-bold mb-4">{section.section_name}</h2>
          <p className="text-muted-foreground">
            This is a preview of the {section.section_type} section.
          </p>
        </div>
      );
  }
};