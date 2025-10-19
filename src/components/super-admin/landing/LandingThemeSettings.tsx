import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Palette, Type, Layout, Code, Save, Eye } from 'lucide-react';
import { useLandingThemes } from '@/hooks/useLandingThemes';
import { toast } from 'sonner';

interface Theme {
  id: string;
  theme_name: string;
  theme_name_ar?: string;
  colors: any;
  fonts: any;
  spacing: any;
  custom_css?: string;
  is_default: boolean;
  is_active: boolean;
  company_id: string;
}

export const LandingThemeSettings: React.FC = () => {
  const { themes, loading, createTheme, updateTheme, deleteTheme } = useLandingThemes();
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const defaultColors = {
    primary: "220 90% 56%",
    secondary: "210 40% 98%", 
    accent: "346 77% 49%",
    background: "0 0% 100%",
    foreground: "224 71% 4%",
    muted: "210 40% 96%",
    "muted-foreground": "215 16% 47%",
    border: "214 32% 91%",
    input: "214 32% 91%",
    ring: "220 90% 56%"
  };

  const defaultFonts = {
    heading: "Cairo, sans-serif",
    body: "Inter, sans-serif"
  };

  const defaultSpacing = {
    section: "80px",
    container: "24px", 
    element: "16px"
  };

  const handleCreateTheme = async () => {
    try {
      const newTheme = await createTheme({
        theme_name: 'New Theme',
        theme_name_ar: 'ثيم جديد',
        colors: defaultColors,
        fonts: defaultFonts,
        spacing: defaultSpacing,
        company_id: '00000000-0000-0000-0000-000000000000', // Global theme
        is_default: false,
        is_active: true
      });
      setSelectedTheme(newTheme);
      toast.success('Theme created successfully');
    } catch (error) {
      toast.error('Failed to create theme');
    }
  };

  const handleUpdateTheme = async (updates: any) => {
    if (!selectedTheme) return;
    
    try {
      const updatedTheme = await updateTheme(selectedTheme.id, updates);
      setSelectedTheme(updatedTheme);
      toast.success('Theme updated successfully');
    } catch (error) {
      toast.error('Failed to update theme');
    }
  };

  const handleDuplicateTheme = async () => {
    if (!selectedTheme) return;

    try {
      const duplicatedTheme = await createTheme({
        theme_name: `${selectedTheme.theme_name} (Copy)`,
        theme_name_ar: selectedTheme.theme_name_ar ? `${selectedTheme.theme_name_ar} (نسخة)` : undefined,
        colors: selectedTheme.colors,
        fonts: selectedTheme.fonts,
        spacing: selectedTheme.spacing,
        custom_css: selectedTheme.custom_css,
        company_id: selectedTheme.company_id,
        is_default: false,
        is_active: true
      });
      setSelectedTheme(duplicatedTheme);
      toast.success('Theme duplicated successfully');
    } catch (error) {
      toast.error('Failed to duplicate theme');
    }
  };

  const handleExportTheme = () => {
    if (!selectedTheme) return;

    const themeExport = {
      theme_name: selectedTheme.theme_name,
      theme_name_ar: selectedTheme.theme_name_ar,
      colors: selectedTheme.colors,
      fonts: selectedTheme.fonts,
      spacing: selectedTheme.spacing,
      custom_css: selectedTheme.custom_css,
      exported_at: new Date().toISOString()
    };

    const dataStr = JSON.stringify(themeExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `theme-${selectedTheme.theme_name.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Theme exported successfully');
  };

  const handleDeleteTheme = async (themeId: string) => {
    if (window.confirm('Are you sure you want to delete this theme?')) {
      try {
        await deleteTheme(themeId);
        if (selectedTheme?.id === themeId) {
          setSelectedTheme(null);
        }
        toast.success('Theme deleted successfully');
      } catch (error) {
        toast.error('Failed to delete theme');
      }
    }
  };

  const handleColorChange = (colorKey: string, value: string) => {
    if (!selectedTheme) return;
    
    const updatedColors = {
      ...selectedTheme.colors,
      [colorKey]: value
    };
    
    setSelectedTheme({
      ...selectedTheme,
      colors: updatedColors
    });
  };

  const handleFontChange = (fontKey: string, value: string) => {
    if (!selectedTheme) return;
    
    const updatedFonts = {
      ...selectedTheme.fonts,
      [fontKey]: value
    };
    
    setSelectedTheme({
      ...selectedTheme,
      fonts: updatedFonts
    });
  };

  const handleSpacingChange = (spacingKey: string, value: string) => {
    if (!selectedTheme) return;
    
    const updatedSpacing = {
      ...selectedTheme.spacing,
      [spacingKey]: value
    };
    
    setSelectedTheme({
      ...selectedTheme,
      spacing: updatedSpacing
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Select 
            value={selectedTheme?.id || ''} 
            onValueChange={(value) => {
              const theme = themes.find(t => t.id === value);
              setSelectedTheme(theme || null);
            }}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a theme to edit" />
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
          
          <Button onClick={handleCreateTheme}>
            Create New Theme
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {previewMode ? 'Exit Preview' : 'Preview'}
          </Button>
          
          {selectedTheme && (
            <Button onClick={() => handleUpdateTheme(selectedTheme)}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          )}
        </div>
      </div>

      {selectedTheme ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Tabs defaultValue="colors" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="colors" className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Colors
                </TabsTrigger>
                <TabsTrigger value="fonts" className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Typography
                </TabsTrigger>
                <TabsTrigger value="spacing" className="flex items-center gap-2">
                  <Layout className="h-4 w-4" />
                  Spacing
                </TabsTrigger>
                <TabsTrigger value="custom" className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Custom CSS
                </TabsTrigger>
              </TabsList>

              <TabsContent value="colors" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Color Palette</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(selectedTheme.colors).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-4">
                        <Label className="w-32 capitalize">{key.replace('-', ' ')}</Label>
                        <Input
                          value={value as string}
                          onChange={(e) => handleColorChange(key, e.target.value)}
                          placeholder="e.g., 220 90% 56%"
                          className="flex-1"
                        />
                        <div 
                          className="w-10 h-10 rounded border"
                          style={{ backgroundColor: `hsl(${value})` }}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="fonts" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Typography Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(selectedTheme.fonts).map(([key, value]) => (
                      <div key={key} className="space-y-2">
                        <Label className="capitalize">{key} Font</Label>
                        <Input
                          value={value as string}
                          onChange={(e) => handleFontChange(key, e.target.value)}
                          placeholder="e.g., Cairo, sans-serif"
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="spacing" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Spacing Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(selectedTheme.spacing).map(([key, value]) => (
                      <div key={key} className="space-y-2">
                        <Label className="capitalize">{key} Spacing</Label>
                        <Input
                          value={value as string}
                          onChange={(e) => handleSpacingChange(key, e.target.value)}
                          placeholder="e.g., 80px, 2rem, 1.5em"
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="custom" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Custom CSS</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={selectedTheme.custom_css || ''}
                      onChange={(e) => setSelectedTheme({
                        ...selectedTheme,
                        custom_css: e.target.value
                      })}
                      placeholder="/* Add your custom CSS here */"
                      className="min-h-[300px] font-mono"
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Theme Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Theme Name (English)</Label>
                  <Input
                    value={selectedTheme.theme_name}
                    onChange={(e) => setSelectedTheme({
                      ...selectedTheme,
                      theme_name: e.target.value
                    })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Theme Name (Arabic)</Label>
                  <Input
                    value={selectedTheme.theme_name_ar || ''}
                    onChange={(e) => setSelectedTheme({
                      ...selectedTheme,
                      theme_name_ar: e.target.value
                    })}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={selectedTheme.is_default}
                    onCheckedChange={(checked) => setSelectedTheme({
                      ...selectedTheme,
                      is_default: checked
                    })}
                  />
                  <Label>Default Theme</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={selectedTheme.is_active}
                    onCheckedChange={(checked) => setSelectedTheme({
                      ...selectedTheme,
                      is_active: checked
                    })}
                  />
                  <Label>Active</Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Theme Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleDuplicateTheme}
                >
                  Duplicate Theme
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleExportTheme}
                >
                  Export Theme
                </Button>
                
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={() => handleDeleteTheme(selectedTheme.id)}
                  disabled={selectedTheme.is_default}
                >
                  Delete Theme
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <Palette className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Theme Selected</h3>
          <p className="text-muted-foreground mb-4">
            Select an existing theme to edit or create a new one to get started.
          </p>
          <Button onClick={handleCreateTheme}>
            Create Your First Theme
          </Button>
        </div>
      )}
    </div>
  );
};