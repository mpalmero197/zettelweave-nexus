import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Upload, X, Image, Video } from 'lucide-react';

interface MediaUploadProps {
  onImageUpload?: (url: string) => void;
  onVideoUpload?: (url: string) => void;
  existingImageUrl?: string;
  existingVideoUrl?: string;
}

export function MediaUpload({ 
  onImageUpload, 
  onVideoUpload, 
  existingImageUrl, 
  existingVideoUrl 
}: MediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const uploadFile = async (file: File, type: 'image' | 'video') => {
    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in to upload files', variant: 'destructive' });
      return;
    }

    setUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('card-media')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('card-media')
        .getPublicUrl(fileName);

      if (type === 'image') {
        onImageUpload?.(publicUrl);
      } else {
        onVideoUpload?.(publicUrl);
      }

      toast({ title: 'Success', description: `${type} uploaded successfully!` });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (type === 'image' && !file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'Please select an image file', variant: 'destructive' });
      return;
    }
    
    if (type === 'video' && !file.type.startsWith('video/')) {
      toast({ title: 'Error', description: 'Please select a video file', variant: 'destructive' });
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'Error', description: 'File size must be less than 10MB', variant: 'destructive' });
      return;
    }

    uploadFile(file, type);
  };

  const removeMedia = (type: 'image' | 'video') => {
    if (type === 'image') {
      onImageUpload?.('');
    } else {
      onVideoUpload?.('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Image Upload */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Image className="h-4 w-4" />
          Image
        </Label>
        
        {existingImageUrl ? (
          <div className="relative">
            <img 
              src={existingImageUrl} 
              alt="Card image" 
              className="w-full h-32 object-cover rounded-md border"
            />
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => removeMedia('image')}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="relative">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'image')}
              disabled={uploading}
              className="hidden"
              id="image-upload"
            />
            <Label
              htmlFor="image-upload"
              className="flex items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-md cursor-pointer hover:bg-accent/50 transition-colors"
            >
              <div className="text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {uploading ? 'Uploading...' : 'Click to upload image'}
                </p>
              </div>
            </Label>
          </div>
        )}
      </div>

      {/* Video Upload */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Video className="h-4 w-4" />
          Video
        </Label>
        
        {existingVideoUrl ? (
          <div className="relative">
            <video 
              src={existingVideoUrl} 
              controls 
              className="w-full h-32 object-cover rounded-md border"
            />
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => removeMedia('video')}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="relative">
            <Input
              type="file"
              accept="video/*"
              onChange={(e) => handleFileChange(e, 'video')}
              disabled={uploading}
              className="hidden"
              id="video-upload"
            />
            <Label
              htmlFor="video-upload"
              className="flex items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-md cursor-pointer hover:bg-accent/50 transition-colors"
            >
              <div className="text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {uploading ? 'Uploading...' : 'Click to upload video'}
                </p>
              </div>
            </Label>
          </div>
        )}
      </div>
    </div>
  );
}