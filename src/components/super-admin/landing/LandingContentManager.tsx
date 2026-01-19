import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, GripVertical, Eye, EyeOff, Globe, Languages, FileText, Image, Video, Link2, Copy } from 'lucide-react';
import { useLandingSections } from '@/hooks/useLandingSections';
import { useLandingContent } from '@/hooks/useLandingContent';
import { useCompanies } from '@/hooks/useCompanies';
import { toast } from 'sonner';

interface Section {
  id: string;
  section_type: string;
  section_name: string;
  section_name_ar?: string;
  sort_order: number;
  is_active: boolean;
  settings: any;
  company_id: string;
}

export const LandingContentManager: React.FC = () => {
  const { sections, loading: sectionsLoading, createSection, updateSection, deleteSection } = useLandingSections();
  const { content, loading: contentLoading, createContent, updateContent, deleteContent } = useLandingContent();
  const { data: companies, isLoading: companiesLoading } = useCompanies();
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('sections');

  const sectionTypes = [
    { value: 'hero', label: 'Hero Section', label_ar: 'قسم البطل' },
    { value: 'features', label: 'Features', label_ar: 'الميزات' },
    { value: 'testimonials', label: 'Testimonials', label_ar: 'الشهادات' },
    { value: 'cta', label: 'Call to Action', label_ar: 'دعوة للعمل' },
    { value: 'about', label: 'About Us', label_ar: 'عنا' },
    { value: 'contact', label: 'Contact', label_ar: 'اتصل بنا' },
  ];

  const handleCreateSection = async (data: any) => {
    try {
      await createSection({
        ...data,
        company_id: selectedCompany === 'all' ? '00000000-0000-0000-0000-000000000000' : selectedCompany,
        sort_order: sections.length + 1,
        settings: {}
      });
      toast.success('Section created successfully');
      setIsDialogOpen(false);
      setEditingSection(null);
    } catch (error) {
      toast.error('Failed to create section');
    }
  };

  const handleUpdateSection = async (id: string, data: any) => {
    try {
      await updateSection(id, data);
      toast.success('Section updated successfully');
      setIsDialogOpen(false);
      setEditingSection(null);
    } catch (error) {
      toast.error('Failed to update section');
    }
  };

  const handleDeleteSection = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this section?')) {
      try {
        await deleteSection(id);
        toast.success('Section deleted successfully');
      } catch (error) {
        toast.error('Failed to delete section');
      }
    }
  };

  const toggleSectionVisibility = async (section: Section) => {
    await handleUpdateSection(section.id, {
      ...section,
      is_active: !section.is_active
    });
  };

  const handleDuplicateSection = async (section: Section) => {
    try {
      await createSection({
        section_type: section.section_type,
        section_name: `${section.section_name} (Copy)`,
        section_name_ar: section.section_name_ar ? `${section.section_name_ar} (نسخة)` : '',
        is_active: false, // Start duplicates as inactive
        sort_order: sections.length + 1,
        settings: section.settings || {},
        company_id: section.company_id,
      });
      toast.success('Section duplicated successfully');
    } catch (error) {
      toast.error('Failed to duplicate section');
    }
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
              {companiesLoading ? (
                <SelectItem value="" disabled>Loading companies...</SelectItem>
              ) : (
                companies?.map(company => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name_ar || company.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingSection(null)}>
              <Plus className="h-4 w-4 mr-2" />
              إضافة قسم
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingSection ? 'Edit Section' : 'Create New Section'}
              </DialogTitle>
              <DialogDescription>
                Configure the section properties and content.
              </DialogDescription>
            </DialogHeader>
            <SectionForm
              section={editingSection}
              onSubmit={editingSection ? 
                (data) => handleUpdateSection(editingSection.id, data) :
                handleCreateSection
              }
              sectionTypes={sectionTypes}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {sectionsLoading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading sections...</p>
          </div>
        ) : sections.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No sections found. Create your first section to get started.</p>
          </div>
        ) : (
          sections.map((section) => (
            <Card key={section.id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    <div>
                      <CardTitle className="text-lg">{section.section_name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">{section.section_type}</Badge>
                        <Badge variant={section.is_active ? 'default' : 'outline'}>
                          {section.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSectionVisibility(section)}
                      title={section.is_active ? "Hide section" : "Show section"}
                    >
                      {section.is_active ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicateSection(section)}
                      title="Duplicate section"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingSection(section);
                        setIsDialogOpen(true);
                      }}
                      title="Edit section"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSection(section.id)}
                      title="Delete section"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Sort Order: {section.sort_order} • Company: {section.company_id === '00000000-0000-0000-0000-000000000000' ? 'Global' : 'Company Specific'}
                </div>
                {section.section_name_ar && (
                  <div className="text-sm text-muted-foreground mt-1">
                    Arabic: {section.section_name_ar}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

interface SectionFormProps {
  section?: Section | null;
  onSubmit: (data: any) => void;
  sectionTypes: Array<{ value: string; label: string; label_ar: string }>;
}

const SectionForm: React.FC<SectionFormProps> = ({ section, onSubmit, sectionTypes }) => {
  const [formData, setFormData] = useState({
    section_type: section?.section_type || '',
    section_name: section?.section_name || '',
    section_name_ar: section?.section_name_ar || '',
    is_active: section?.is_active ?? true,
    sort_order: section?.sort_order || 1,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="section_type">Section Type</Label>
        <Select value={formData.section_type} onValueChange={(value) => 
          setFormData(prev => ({ ...prev, section_type: value }))
        }>
          <SelectTrigger>
            <SelectValue placeholder="Select section type" />
          </SelectTrigger>
          <SelectContent>
            {sectionTypes.map(type => (
              <SelectItem key={type.value} value={type.value}>
                {type.label} ({type.label_ar})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="section_name">Section Name (English)</Label>
        <Input
          id="section_name"
          value={formData.section_name}
          onChange={(e) => setFormData(prev => ({ ...prev, section_name: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="section_name_ar">Section Name (Arabic)</Label>
        <Input
          id="section_name_ar"
          value={formData.section_name_ar}
          onChange={(e) => setFormData(prev => ({ ...prev, section_name_ar: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="sort_order">Sort Order</Label>
        <Input
          id="sort_order"
          type="number"
          value={formData.sort_order}
          onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) }))}
          required
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
        />
        <Label htmlFor="is_active">Active</Label>
      </div>

      <DialogFooter>
        <Button type="submit">
          {section ? 'Update Section' : 'Create Section'}
        </Button>
      </DialogFooter>
    </form>
  );
};