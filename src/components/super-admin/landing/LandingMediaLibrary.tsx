import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Search, Filter, Image, Video, File, Trash2, Edit, Eye } from 'lucide-react';
import { useLandingMedia } from '@/hooks/useLandingMedia';
import { toast } from 'sonner';

interface MediaFile {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  mime_type: string;
  alt_text?: string;
  alt_text_ar?: string;
  tags: string[];
  is_active: boolean;
  created_at: string;
}

export const LandingMediaLibrary: React.FC = () => {
  const { media, loading, uploadMedia, updateMedia, deleteMedia } = useLandingMedia();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const fileTypes = [
    { value: 'all', label: 'All Files' },
    { value: 'image', label: 'Images' },
    { value: 'video', label: 'Videos' },
    { value: 'document', label: 'Documents' },
  ];

  const filteredMedia = media.filter(file => {
    const matchesSearch = file.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.alt_text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'all' || file.file_type === filterType;
    return matchesSearch && matchesType;
  });

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        await uploadMedia(file);
        toast.success(`${file.name} uploaded successfully`);
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    setIsUploadOpen(false);
  };

  const handleUpdateMedia = async (id: string, data: any) => {
    try {
      await updateMedia(id, data);
      toast.success('Media updated successfully');
      setIsEditOpen(false);
      setSelectedFile(null);
    } catch (error) {
      toast.error('Failed to update media');
    }
  };

  const handleDeleteMedia = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      try {
        await deleteMedia(id);
        toast.success('Media deleted successfully');
      } catch (error) {
        toast.error('Failed to delete media');
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search media files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-input bg-background rounded-md text-sm"
          >
            {fileTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Media
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Media Files</DialogTitle>
              <DialogDescription>
                Select files to upload to the media library.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*,.pdf,.doc,.docx"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to select files or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Supports images, videos, and documents
                  </p>
                </label>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-8">
            <p className="text-muted-foreground">Loading media files...</p>
          </div>
        ) : filteredMedia.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <p className="text-muted-foreground">
              {searchTerm || filterType !== 'all' 
                ? 'No files match your search criteria.' 
                : 'No media files found. Upload your first file to get started.'
              }
            </p>
          </div>
        ) : (
          filteredMedia.map((file) => (
            <Card key={file.id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getFileIcon(file.file_type)}
                    <Badge variant="secondary" className="text-xs">
                      {file.file_type}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(file.file_path, '_blank')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedFile(file);
                        setIsEditOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteMedia(file.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-2">
                <div className="aspect-video bg-muted rounded-md flex items-center justify-center overflow-hidden">
                  {file.file_type === 'image' ? (
                    <img
                      src={file.file_path}
                      alt={file.alt_text || file.file_name}
                      className="w-full h-full object-cover"
                    />
                  ) : file.file_type === 'video' ? (
                    <video
                      src={file.file_path}
                      className="w-full h-full object-cover"
                      controls={false}
                    />
                  ) : (
                    <File className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                
                <div>
                  <p className="font-medium text-sm truncate" title={file.file_name}>
                    {file.file_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.file_size)}
                  </p>
                </div>
                
                {file.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {file.tags.slice(0, 2).map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {file.tags.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{file.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Media File</DialogTitle>
            <DialogDescription>
              Update the metadata for this media file.
            </DialogDescription>
          </DialogHeader>
          {selectedFile && (
            <MediaEditForm
              file={selectedFile}
              onSubmit={(data) => handleUpdateMedia(selectedFile.id, data)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface MediaEditFormProps {
  file: MediaFile;
  onSubmit: (data: any) => void;
}

const MediaEditForm: React.FC<MediaEditFormProps> = ({ file, onSubmit }) => {
  const [formData, setFormData] = useState({
    alt_text: file.alt_text || '',
    alt_text_ar: file.alt_text_ar || '',
    tags: file.tags.join(', '),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="alt_text">Alt Text (English)</Label>
        <Input
          id="alt_text"
          value={formData.alt_text}
          onChange={(e) => setFormData(prev => ({ ...prev, alt_text: e.target.value }))}
          placeholder="Describe the image for accessibility"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="alt_text_ar">Alt Text (Arabic)</Label>
        <Input
          id="alt_text_ar"
          value={formData.alt_text_ar}
          onChange={(e) => setFormData(prev => ({ ...prev, alt_text_ar: e.target.value }))}
          placeholder="وصف الصورة للوصول"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">Tags</Label>
        <Input
          id="tags"
          value={formData.tags}
          onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
          placeholder="hero, banner, product (comma separated)"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit">Update Media</Button>
      </div>
    </form>
  );
};