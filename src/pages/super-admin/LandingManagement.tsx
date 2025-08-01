import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LandingContentManager } from '@/components/super-admin/landing/LandingContentManager';
import { LandingMediaLibrary } from '@/components/super-admin/landing/LandingMediaLibrary';
import { LandingThemeSettings } from '@/components/super-admin/landing/LandingThemeSettings';
import { LandingAnalytics } from '@/components/super-admin/landing/LandingAnalytics';
import { LandingPreview } from '@/components/super-admin/landing/LandingPreview';
import { LandingABTesting } from '@/components/super-admin/landing/LandingABTesting';
import { Monitor, Image, Palette, BarChart3, Eye, TestTube } from 'lucide-react';

const LandingManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('content');

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Landing Page Management
          </h1>
          <p className="text-muted-foreground">
            Manage and customize landing pages for all companies
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="content" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Content
            </TabsTrigger>
            <TabsTrigger value="media" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Media
            </TabsTrigger>
            <TabsTrigger value="themes" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Themes
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="ab-testing" className="flex items-center gap-2">
              <TestTube className="h-4 w-4" />
              A/B Testing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Content Management</CardTitle>
                <CardDescription>
                  Manage sections and content for landing pages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LandingContentManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="media" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Media Library</CardTitle>
                <CardDescription>
                  Upload and manage images, videos, and other media assets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LandingMediaLibrary />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="themes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Theme Settings</CardTitle>
                <CardDescription>
                  Customize colors, fonts, and visual styling
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LandingThemeSettings />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Landing Page Analytics</CardTitle>
                <CardDescription>
                  View performance metrics and user engagement data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LandingAnalytics />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Live Preview</CardTitle>
                <CardDescription>
                  Preview how landing pages will appear to visitors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LandingPreview />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ab-testing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>A/B Testing</CardTitle>
                <CardDescription>
                  Create and manage A/B tests for landing page optimization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LandingABTesting />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default LandingManagement;