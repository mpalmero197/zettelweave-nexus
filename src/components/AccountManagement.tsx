import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Settings, Lock, Palette, Upload, Save, Check, Download, Bug, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { exportCodebase } from '@/utils/codebaseExport';
import { DebugLogger } from '@/components/DebugLogger';
import { Switch } from '@/components/ui/switch';
import { AvatarEditor } from '@/components/AvatarEditor';
import { ThemePreview } from '@/components/ThemePreview';
import { ThemeVariantSelector } from '@/components/ThemeVariantSelector';
import { ContrastChecker } from '@/components/ContrastChecker';

interface AccountManagementProps {
  onClose: () => void;
}

const themes = [
  { id: 'system', name: 'System', description: 'Follow system preference' },
  { id: 'light', name: 'Light', description: 'Clean and bright' },
  { id: 'dark', name: 'Dark', description: 'Easy on the eyes' },
  { id: 'midnight', name: 'Midnight', description: 'Pure black background' },
  { id: 'ocean', name: 'Ocean', description: 'Deep blue tones' },
  { id: 'forest', name: 'Forest', description: 'Natural green palette' },
  { id: 'sunset', name: 'Sunset', description: 'Warm orange gradient' },
  { id: 'lavender', name: 'Lavender', description: 'Soft purple hues' }
];

export function AccountManagement({ onClose }: AccountManagementProps) {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'appearance' | 'backup' | 'debug'>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [showDebugLogger, setShowDebugLogger] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Profile states
  const [displayName, setDisplayName] = useState('');
  const [aboutMe, setAboutMe] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  
  // Track original values for change detection
  const [originalDisplayName, setOriginalDisplayName] = useState('');
  const [originalAboutMe, setOriginalAboutMe] = useState('');
  const [originalAvatarUrl, setOriginalAvatarUrl] = useState('');

  // Load profile data and check admin status on mount
  useEffect(() => {
    if (user) {
      // Load profile data
      supabase
        .from('profiles')
        .select('display_name, about_me, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) {
            console.error('Error loading profile:', error);
            return;
          }
          if (data) {
            setDisplayName(data.display_name || '');
            setAboutMe(data.about_me || '');
            setAvatarUrl(data.avatar_url || '');
            setOriginalDisplayName(data.display_name || '');
            setOriginalAboutMe(data.about_me || '');
            setOriginalAvatarUrl(data.avatar_url || '');
          }
        });
      
      // Check if user is admin
      supabase
        .rpc('has_role', { _user_id: user.id, _role: 'admin' })
        .then(({ data, error }) => {
          if (error) {
            console.error('Error checking admin status:', error);
            return;
          }
          setIsAdmin(data || false);
        });
    }
  }, [user]);
  
  // Security states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Check for unsaved changes
  const hasUnsavedChanges = () => {
    return displayName !== originalDisplayName || 
           aboutMe !== originalAboutMe || 
           avatarUrl !== originalAvatarUrl ||
           currentPassword || newPassword || confirmPassword;
  };
  
  // Handle close with unsaved changes check
  const handleClose = () => {
    if (hasUnsavedChanges()) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };
  
  // Escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [displayName, aboutMe, avatarUrl, currentPassword, newPassword, confirmPassword]);
  
  // Appearance states
  const [selectedTheme, setSelectedTheme] = useState('system');
  const [globalDictionaryEnabled, setGlobalDictionaryEnabled] = useState(() => {
    const stored = localStorage.getItem('globalDictionaryEnabled');
    return stored !== null ? stored === 'true' : true;
  });

  const handleProfileUpdate = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // First check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from('profiles')
          .update({
            display_name: displayName,
            about_me: aboutMe,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Insert new profile
        const { error } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            display_name: displayName,
            about_me: aboutMe,
            avatar_url: avatarUrl
          });

        if (error) throw error;
      }

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
      
      // Update original values after successful save
      setOriginalDisplayName(displayName);
      setOriginalAboutMe(aboutMe);
      setOriginalAvatarUrl(avatarUrl);
    } catch (error: any) {
      console.error('Profile update error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords don't match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // First verify current password by attempting to sign in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      });

      if (verifyError) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Password updated",
        description: "Your password has been successfully changed.",
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordConfirm(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleThemeChange = (theme: string) => {
    setSelectedTheme(theme);
    
    // Apply theme immediately
    const root = document.documentElement;
    
    // First reset all custom properties to prevent overrides
    root.style.removeProperty('--background');
    root.style.removeProperty('--card');
    root.style.removeProperty('--primary');
    root.style.removeProperty('--accent');
    root.style.removeProperty('--foreground');
    root.style.removeProperty('--muted');
    root.style.removeProperty('--border');
    
    switch (theme) {
      case 'light':
        root.classList.remove('dark');
        break;
      case 'dark':
        root.classList.add('dark');
        break;
      case 'midnight':
        root.classList.add('dark');
        // Pure midnight black with subtle purple accents
        root.style.setProperty('--background', '0 0% 0%');
        root.style.setProperty('--foreground', '0 0% 98%');
        root.style.setProperty('--card', '240 10% 4%');
        root.style.setProperty('--card-foreground', '0 0% 98%');
        root.style.setProperty('--primary', '271 85% 65%');
        root.style.setProperty('--primary-foreground', '0 0% 0%');
        root.style.setProperty('--primary-hover', '271 85% 75%');
        root.style.setProperty('--secondary', '280 60% 55%');
        root.style.setProperty('--secondary-foreground', '0 0% 0%');
        root.style.setProperty('--accent', '260 40% 20%');
        root.style.setProperty('--accent-foreground', '0 0% 95%');
        root.style.setProperty('--muted', '240 10% 8%');
        root.style.setProperty('--muted-foreground', '0 0% 60%');
        root.style.setProperty('--border', '240 10% 12%');
        root.style.setProperty('--input', '240 10% 10%');
        break;
      case 'ocean':
        root.classList.add('dark');
        // Deep ocean blues with bioluminescent accents
        root.style.setProperty('--background', '210 45% 8%');
        root.style.setProperty('--foreground', '180 20% 95%');
        root.style.setProperty('--card', '210 40% 12%');
        root.style.setProperty('--card-foreground', '180 20% 95%');
        root.style.setProperty('--primary', '195 100% 50%');
        root.style.setProperty('--primary-foreground', '210 45% 8%');
        root.style.setProperty('--primary-hover', '195 100% 60%');
        root.style.setProperty('--secondary', '180 70% 45%');
        root.style.setProperty('--secondary-foreground', '210 45% 8%');
        root.style.setProperty('--accent', '190 85% 35%');
        root.style.setProperty('--accent-foreground', '180 20% 95%');
        root.style.setProperty('--muted', '210 30% 15%');
        root.style.setProperty('--muted-foreground', '180 15% 60%');
        root.style.setProperty('--border', '210 35% 25%');
        root.style.setProperty('--input', '210 35% 18%');
        break;
      case 'forest':
        root.classList.add('dark');
        // Deep forest greens with earthy moss tones
        root.style.setProperty('--background', '140 30% 8%');
        root.style.setProperty('--foreground', '120 15% 92%');
        root.style.setProperty('--card', '140 25% 12%');
        root.style.setProperty('--card-foreground', '120 15% 92%');
        root.style.setProperty('--primary', '145 70% 45%');
        root.style.setProperty('--primary-foreground', '140 30% 8%');
        root.style.setProperty('--primary-hover', '145 70% 55%');
        root.style.setProperty('--secondary', '85 50% 40%');
        root.style.setProperty('--secondary-foreground', '140 30% 8%');
        root.style.setProperty('--accent', '160 60% 30%');
        root.style.setProperty('--accent-foreground', '120 15% 92%');
        root.style.setProperty('--muted', '140 20% 15%');
        root.style.setProperty('--muted-foreground', '120 10% 60%');
        root.style.setProperty('--border', '140 25% 22%');
        root.style.setProperty('--input', '140 25% 16%');
        break;
      case 'sunset':
        root.classList.add('dark');
        // Warm sunset with golden hour vibes
        root.style.setProperty('--background', '25 30% 10%');
        root.style.setProperty('--foreground', '35 20% 95%');
        root.style.setProperty('--card', '25 35% 14%');
        root.style.setProperty('--card-foreground', '35 20% 95%');
        root.style.setProperty('--primary', '20 100% 60%');
        root.style.setProperty('--primary-foreground', '25 30% 10%');
        root.style.setProperty('--primary-hover', '20 100% 70%');
        root.style.setProperty('--secondary', '40 100% 65%');
        root.style.setProperty('--secondary-foreground', '25 30% 10%');
        root.style.setProperty('--accent', '30 80% 45%');
        root.style.setProperty('--accent-foreground', '35 20% 95%');
        root.style.setProperty('--muted', '25 25% 18%');
        root.style.setProperty('--muted-foreground', '35 15% 60%');
        root.style.setProperty('--border', '25 30% 28%');
        root.style.setProperty('--input', '25 30% 20%');
        break;
      case 'lavender':
        root.classList.add('dark');
        // Soft lavender with dreamy purple hues
        root.style.setProperty('--background', '265 25% 10%');
        root.style.setProperty('--foreground', '270 15% 95%');
        root.style.setProperty('--card', '265 30% 14%');
        root.style.setProperty('--card-foreground', '270 15% 95%');
        root.style.setProperty('--primary', '270 70% 60%');
        root.style.setProperty('--primary-foreground', '265 25% 10%');
        root.style.setProperty('--primary-hover', '270 70% 70%');
        root.style.setProperty('--secondary', '290 80% 65%');
        root.style.setProperty('--secondary-foreground', '265 25% 10%');
        root.style.setProperty('--accent', '280 60% 40%');
        root.style.setProperty('--accent-foreground', '270 15% 95%');
        root.style.setProperty('--muted', '265 20% 18%');
        root.style.setProperty('--muted-foreground', '270 12% 60%');
        root.style.setProperty('--border', '265 25% 26%');
        root.style.setProperty('--input', '265 25% 20%');
        break;
      default:
        // System preference
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
        break;
    }

    localStorage.setItem('theme', theme);
    
    toast({
      title: "Theme applied",
      description: `Switched to ${themes.find(t => t.id === theme)?.name} theme.`,
    });
  };

  const handleAvatarFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 2MB",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "File must be an image",
        variant: "destructive",
      });
      return;
    }

    // Open editor
    setSelectedImageFile(file);
    setShowAvatarEditor(true);
  };

  const handleAvatarUpload = async (croppedBlob: Blob) => {
    if (!user) return;

    setIsLoading(true);
    setUploadProgress(0);
    setShowAvatarEditor(false);
    
    try {
      const fileName = `${user.id}-${Date.now()}.png`;
      const filePath = fileName;
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, croppedBlob, { 
          upsert: true,
          contentType: 'image/png'
        });

      clearInterval(progressInterval);
      setUploadProgress(95);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update local state
      setAvatarUrl(publicUrl);

      // Save to files table for tracking
      const { error: fileError } = await supabase
        .from('files')
        .insert({
          user_id: user.id,
          file_name: 'avatar.png',
          file_type: 'image',
          mime_type: 'image/png',
          file_size: croppedBlob.size,
          storage_path: `avatars/${filePath}`,
          metadata: {
            original_name: selectedImageFile?.name || 'avatar.png',
            usage: 'avatar',
            uploaded_from: 'account_settings'
          }
        });

      if (fileError) {
        console.error('File tracking error:', fileError);
        // Don't fail the upload if file tracking fails
      }

      // Auto-save to profile
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingProfile) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            avatar_url: publicUrl
          });

        if (insertError) throw insertError;
      }

      setUploadProgress(100);
      
      toast({
        title: "Avatar uploaded",
        description: "Your profile picture has been updated.",
      });
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload avatar",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Update profile to remove avatar URL
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingProfile) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: null })
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      }

      // Update local state
      setAvatarUrl('');
      
      toast({
        title: "Avatar removed",
        description: "Your profile picture has been reset to default.",
      });
    } catch (error: any) {
      console.error('Avatar removal error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove avatar",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportBackup = async () => {
    if (!user?.email) return;
    
    setIsLoading(true);
    try {
      // Log the codebase export action
      await supabase.rpc('log_security_event', {
        p_user_id: user.id,
        p_event_type: 'codebase_export',
        p_event_details: {
          action: 'full_codebase_export',
          timestamp: new Date().toISOString(),
          user_email: user.email
        }
      });

      await exportCodebase(user.email);
      toast({
        title: "Backup exported successfully",
        description: "Your complete codebase has been downloaded as a ZIP file.",
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message || "Failed to export backup",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'debug', label: 'Debug Logs', icon: Bug },
    ...(user?.email === 'mpalmero197@gmail.com' ? [{ id: 'backup', label: 'Backup', icon: Download }] : []),
  ];

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-start justify-center md:pt-[150px] overflow-y-auto">
      <Card className="w-full md:max-w-4xl h-full md:h-auto md:max-h-[calc(100vh-200px)] overflow-hidden bg-card/95 backdrop-blur-md md:border border-border/50 md:shadow-2xl flex flex-col md:mb-8">
        <CardHeader className="pb-4 border-b border-border/50 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Account Settings
              </CardTitle>
              <CardDescription className="hidden md:block">
                Manage your profile, security, and preferences
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              ×
            </Button>
          </div>
        </CardHeader>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <div className="w-16 md:w-48 border-r border-border/50 p-2 md:p-4 shrink-0">
            <div className="space-y-1">
              {tabs.map(({ id, label, icon: Icon }) => (
                <Button
                  key={id}
                  variant={activeTab === id ? "default" : "ghost"}
                  size="sm"
                  className="w-full justify-start gap-2 text-left"
                  onClick={() => setActiveTab(id as typeof activeTab)}
                >
                  <Icon className="h-4 w-4 md:h-4 md:w-4" />
                  <span className="hidden md:inline">{label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-4 md:p-6 overflow-y-auto min-h-0">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Profile Information</h3>
                  
                  <div className="flex items-center gap-6 mb-6">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={avatarUrl} />
                      <AvatarFallback className="text-lg">
                        {user?.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex gap-2 mb-2">
                        <Label htmlFor="avatar-upload" className="cursor-pointer">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2" 
                            asChild
                            disabled={isLoading}
                          >
                            <span>
                              <Upload className="h-4 w-4" />
                              Upload Avatar
                            </span>
                          </Button>
                        </Label>
                        {avatarUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRemoveAvatar}
                            disabled={isLoading}
                            className="gap-2"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarFileSelect}
                        className="hidden"
                        disabled={isLoading}
                      />
                      <p className="text-xs text-muted-foreground">
                        JPG, PNG up to 2MB
                      </p>
                      {uploadProgress > 0 && uploadProgress < 100 && (
                        <div className="mt-2">
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Uploading... {uploadProgress}%
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Email cannot be changed
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="display-name">Display Name</Label>
                      <Input
                        id="display-name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="How others will see you"
                      />
                    </div>

                    <div>
                      <Label htmlFor="about-me">About Me</Label>
                      <Textarea
                        id="about-me"
                        value={aboutMe}
                        onChange={(e) => setAboutMe(e.target.value)}
                        placeholder="Tell collaborators about yourself..."
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        This will be visible to people you collaborate with
                      </p>
                    </div>

                    <Button
                      onClick={handleProfileUpdate}
                      disabled={isLoading}
                      className="w-fit gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Security Settings</h3>
                  
                  <Card className="p-4 mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Password</h4>
                        <p className="text-sm text-muted-foreground">
                          Last updated: Never
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setShowPasswordConfirm(true)}
                      >
                        Change Password
                      </Button>
                    </div>
                  </Card>

                  <ConfirmDialog
                    isOpen={showPasswordConfirm}
                    onClose={() => setShowPasswordConfirm(false)}
                    onConfirm={() => {}}
                    title="Change Password"
                    description="Please enter your current password and new password below."
                    confirmText="Update Password"
                    customContent={
                      <div className="space-y-4 pt-4">
                        <div>
                          <Label htmlFor="current-password">Current Password</Label>
                          <Input
                            id="current-password"
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="new-password">New Password</Label>
                          <Input
                            id="new-password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="confirm-password">Confirm New Password</Label>
                          <Input
                            id="confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                          />
                        </div>

                        <Button
                          onClick={handlePasswordChange}
                          disabled={isLoading}
                          className="w-full gap-2"
                        >
                          <Lock className="h-4 w-4" />
                          {isLoading ? 'Updating...' : 'Update Password'}
                        </Button>
                      </div>
                    }
                  />
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Appearance & Themes</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {themes.map((theme) => (
                      <ThemePreview
                        key={theme.id}
                        theme={theme}
                        isSelected={selectedTheme === theme.id}
                        onSelect={() => handleThemeChange(theme.id)}
                      />
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-medium mb-4">Theme Variants</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Choose from beautiful color palettes while maintaining accessibility
                  </p>
                  <div className="flex items-center gap-3">
                    <ThemeVariantSelector />
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-medium mb-4">Accessibility</h3>
                  <ContrastChecker />
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-medium mb-4">Dictionary Features</h3>
                  
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <BookOpen className="h-5 w-5 text-primary" />
                        <div>
                          <h4 className="font-medium">Global Dictionary Hover</h4>
                          <p className="text-sm text-muted-foreground">
                            Enable word definitions on hover for all cards
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={globalDictionaryEnabled}
                        onCheckedChange={(checked) => {
                          setGlobalDictionaryEnabled(checked);
                          localStorage.setItem('globalDictionaryEnabled', String(checked));
                          toast({
                            title: checked ? "Dictionary enabled" : "Dictionary disabled",
                            description: checked 
                              ? "Hover over words in cards to see definitions" 
                              : "Word hover definitions are now disabled",
                          });
                        }}
                      />
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === 'debug' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Debug & Error Logs</h3>
                  
                  <Card className="p-4">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Error Logging System</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          This system automatically captures all JavaScript errors, console logs, and unhandled exceptions. 
                          Use this to debug issues or share error information with support.
                        </p>
                      </div>
                      
                      <Button
                        onClick={() => setShowDebugLogger(true)}
                        className="gap-2"
                      >
                        <Bug className="h-4 w-4" />
                        Open Debug Logger
                      </Button>
                      
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>• All console errors and warnings are automatically captured</p>
                        <p>• Unhandled JavaScript exceptions are logged with stack traces</p>
                        <p>• Export logs as JSON or copy to clipboard for support</p>
                        <p>• Logs include timestamps, user agent, and current URL context</p>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === 'backup' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Data Backup & Export</h3>
                  
                  {!isAdmin ? (
                    <Card className="p-6">
                      <div className="text-center py-8 space-y-4">
                        <Lock className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                        <div>
                          <h4 className="font-medium text-lg mb-2">Admin Access Required</h4>
                          <p className="text-sm text-muted-foreground">
                            The codebase export feature is restricted to administrators only for security purposes.
                          </p>
                        </div>
                      </div>
                    </Card>
                  ) : (
                    <Card className="p-6 space-y-4">
                      <div>
                        <h4 className="font-medium text-lg mb-2">Complete Codebase Export</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Export your entire ZettelWeave application as a downloadable ZIP file. 
                          This includes all source code, configurations, and setup instructions.
                        </p>
                        
                        <div className="bg-muted p-4 rounded-lg mb-4">
                          <h5 className="font-medium mb-2">Export includes:</h5>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• Complete React TypeScript application</li>
                            <li>• All components and utilities</li>
                            <li>• Configuration files (package.json, etc.)</li>
                            <li>• Setup and deployment instructions</li>
                            <li>• Environment variable templates</li>
                          </ul>
                        </div>

                        <Button
                          onClick={handleExportBackup}
                          disabled={isLoading}
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          {isLoading ? 'Generating Backup...' : 'Export Codebase'}
                        </Button>
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      <AvatarEditor
        imageFile={selectedImageFile}
        isOpen={showAvatarEditor}
        onClose={() => {
          setShowAvatarEditor(false);
          setSelectedImageFile(null);
        }}
        onSave={handleAvatarUpload}
      />

      {showDebugLogger && (
        <DebugLogger onClose={() => setShowDebugLogger(false)} />
      )}
      
      <ConfirmDialog
        isOpen={showCloseConfirm}
        onClose={() => setShowCloseConfirm(false)}
        onConfirm={() => {
          setShowCloseConfirm(false);
          onClose();
        }}
        title="Unsaved Changes"
        description="You have unsaved changes. Are you sure you want to close without saving?"
        confirmText="Close Without Saving"
        cancelText="Keep Editing"
        variant="destructive"
      />
    </div>
  );
}