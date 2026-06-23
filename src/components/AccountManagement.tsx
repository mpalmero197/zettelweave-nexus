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
import { User, Settings, Lock, Palette, Upload, Save, Check, Download, Bug, BookOpen, Brain, Bell, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AliceMemoryPanel } from '@/components/alice/AliceMemoryPanel';
import { AliceWakeWordSettings } from '@/components/alice/AliceWakeWordSettings';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { exportCodebase } from '@/utils/codebaseExport';
import { DebugLogger } from '@/components/DebugLogger';
import { Switch } from '@/components/ui/switch';
import { AvatarEditor } from '@/components/AvatarEditor';
import { ThemePreview } from '@/components/ThemePreview';
import { ThemeVariantSelector } from '@/components/ThemeVariantSelector';
import { ContrastChecker } from '@/components/ContrastChecker';
import { CustomThemeBuilder } from '@/components/CustomThemeBuilder';
import { useAnimationPreference } from '@/hooks/useAnimationPreference';
import { SecurityActivityLog } from '@/components/SecurityActivityLog';

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
  const { animationsEnabled, setAnimationsEnabled, respectOSPreference, setRespectOSPreference, osReducedMotion, effectiveAnimationsEnabled, reducedBlur, setReducedBlur, simplifiedTransitions, setSimplifiedTransitions, lowPowerMode, setLowPowerMode } = useAnimationPreference();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'activity' | 'appearance' | 'ai' | 'memory' | 'debug'>('profile');
  const [autoMasterDocs, setAutoMasterDocs] = useState(false);
  const [engagementNudges, setEngagementNudges] = useState(true);
  const [habitRecovery, setHabitRecovery] = useState(true);
  const [searchEngine, setSearchEngine] = useState<'google' | 'duckduckgo'>('google');
  const [aliceProactive, setAliceProactive] = useState(true);
  const [aliceProactiveLevel, setAliceProactiveLevel] = useState(3);
  const [autoLinkMode, setAutoLinkMode] = useState<'auto' | 'suggest' | 'manual'>('auto');
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
        .select('display_name, about_me, avatar_url, auto_master_docs, preferred_search_engine, alice_proactive_enabled, alice_proactive_level, auto_link_mode')
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
            setAutoMasterDocs(data.auto_master_docs || false);
            setEngagementNudges((data as any).engagement_nudges_enabled !== false);
            setHabitRecovery((data as any).habit_recovery_enabled !== false);
            setSearchEngine(((data as any).preferred_search_engine as any) || 'google');
            setAliceProactive((data as any).alice_proactive_enabled !== false);
            setAliceProactiveLevel((data as any).alice_proactive_level ?? 3);
            setAutoLinkMode(((data as any).auto_link_mode as any) || 'auto');
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
    { id: 'activity', label: 'Activity Log', icon: BookOpen },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'ai', label: 'AI & Automation', icon: Brain },
    { id: 'memory', label: 'ALICE Memory', icon: Brain },
    { id: 'debug', label: 'Debug Logs', icon: Bug },
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

            {activeTab === 'activity' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-1">Security Activity Log</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Review your recent login history and account security events.
                  </p>
                  <SecurityActivityLog />
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
                    Choose from beautiful color palettes or create your own
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <ThemeVariantSelector />
                    </div>
                    <CustomThemeBuilder />
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-medium mb-4">Accessibility</h3>
                  <ContrastChecker />
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-medium mb-4">Performance</h3>
                  
                  <div className="space-y-3">
                    <Card className="p-4 border-primary/20 bg-primary/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Settings className="h-5 w-5 text-primary" />
                          <div>
                            <h4 className="font-medium">Low Power Mode</h4>
                            <p className="text-sm text-muted-foreground">
                              Enable all performance optimizations at once
                            </p>
                            {lowPowerMode && (
                              <span className="text-xs text-primary mt-1 block">
                                All optimizations active
                              </span>
                            )}
                          </div>
                        </div>
                        <Switch
                          checked={lowPowerMode}
                          onCheckedChange={setLowPowerMode}
                        />
                      </div>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Palette className="h-5 w-5 text-primary" />
                          <div>
                            <h4 className="font-medium">Background Animations</h4>
                            <p className="text-sm text-muted-foreground">
                              Falling leaves, petals, and other theme effects
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={animationsEnabled}
                          onCheckedChange={setAnimationsEnabled}
                        />
                      </div>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Settings className="h-5 w-5 text-primary" />
                          <div>
                            <h4 className="font-medium">Respect OS Preference</h4>
                            <p className="text-sm text-muted-foreground">
                              Auto-disable animations when OS prefers reduced motion
                              {osReducedMotion && (
                                <span className="block text-xs text-amber-500 mt-1">
                                  Your OS currently prefers reduced motion
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={respectOSPreference}
                          onCheckedChange={setRespectOSPreference}
                        />
                      </div>
                    </Card>

                    {!effectiveAnimationsEnabled && animationsEnabled && respectOSPreference && osReducedMotion && (
                      <p className="text-xs text-muted-foreground px-1">
                        Animations disabled due to OS preference. Turn off "Respect OS Preference" to override.
                      </p>
                    )}

                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Settings className="h-5 w-5 text-primary" />
                          <div>
                            <h4 className="font-medium">Reduced Blur Effects</h4>
                            <p className="text-sm text-muted-foreground">
                              Disable blur effects for better performance on low-end devices
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={reducedBlur}
                          onCheckedChange={setReducedBlur}
                        />
                      </div>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Settings className="h-5 w-5 text-primary" />
                          <div>
                            <h4 className="font-medium">Simplified Transitions</h4>
                            <p className="text-sm text-muted-foreground">
                              Use instant transitions instead of smooth animations
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={simplifiedTransitions}
                          onCheckedChange={setSimplifiedTransitions}
                        />
                      </div>
                    </Card>
                  </div>
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

            {activeTab === 'memory' && <AliceMemoryPanel />}

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

            {activeTab === 'ai' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Living Second Brain</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Enable AI-powered features that automatically organize and synthesize your knowledge.
                  </p>

                  <Card className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1 flex-1 mr-4">
                        <div className="flex items-center gap-2">
                          <Brain className="h-5 w-5 text-primary" />
                          <h4 className="font-medium">Auto Master Documents</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          When enabled, ALICE will automatically detect subject clusters across your cards, notes, and documents, then create and maintain comprehensive "Master Documents" in Catalyst for each subject. Documents are updated whenever you add new related content.
                        </p>
                      </div>
                      <Switch
                        checked={autoMasterDocs}
                        onCheckedChange={async (checked) => {
                          if (!user) return;
                          setAutoMasterDocs(checked);
                          const { error } = await supabase
                            .from('profiles')
                            .update({ auto_master_docs: checked })
                            .eq('user_id', user.id);
                          if (error) {
                            toast({ title: 'Error', description: 'Failed to update setting', variant: 'destructive' });
                            setAutoMasterDocs(!checked);
                          } else {
                            toast({ title: checked ? 'Enabled' : 'Disabled', description: checked ? 'Auto Master Documents is now active. New content will trigger synthesis.' : 'Auto Master Documents has been disabled.' });
                            // If just enabled, trigger an initial synthesis
                            if (checked) {
                              supabase.functions.invoke('synthesize-master-document', {
                                body: { user_id: user.id }
                              }).then(({ error }) => {
                                if (error) console.error('Initial synthesis error:', error);
                              });
                            }
                          }
                        }}
                      />
                    </div>
                  </Card>

                  <Card className="p-6 mt-4">
                    <h4 className="font-medium mb-2">How it works</h4>
                    <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                      <li>ALICE scans your cards, notes, and documents for related topics</li>
                      <li>When 3+ items share a subject, a Master Document is created in Catalyst</li>
                      <li>Each time you add or edit content, the Master Document is updated</li>
                      <li>Master Documents are marked with a badge in your Catalyst library</li>
                      <li>You can edit Master Documents like any other Catalyst document</li>
                    </ul>
                   </Card>

                  <Card className="p-6 mt-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <LinkIcon className="h-5 w-5 text-primary" />
                        <h4 className="font-medium">Card Auto-Linking</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        ALICE connects cards by content similarity and matching Dewey numbers. Pick how aggressively links are applied. Manual edits always win — user-made links override AI links.
                      </p>
                      <div className="grid gap-2 pt-2">
                        {([
                          { v: 'auto', t: 'Auto-link', d: 'Apply links automatically (locked once you edit)' },
                          { v: 'suggest', t: 'Auto-suggest', d: 'Show dotted lines on the graph for suggested links only' },
                          { v: 'manual', t: 'Manual only', d: 'Never auto-link; you control every connection' },
                        ] as const).map(opt => (
                          <label key={opt.v} className={cn(
                            "flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors",
                            autoLinkMode === opt.v ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                          )}>
                            <input
                              type="radio"
                              name="auto_link_mode"
                              className="mt-1 accent-primary"
                              checked={autoLinkMode === opt.v}
                              onChange={async () => {
                                if (!user) return;
                                const prev = autoLinkMode;
                                setAutoLinkMode(opt.v);
                                const { error } = await supabase
                                  .from('profiles')
                                  .update({ auto_link_mode: opt.v } as any)
                                  .eq('user_id', user.id);
                                if (error) {
                                  setAutoLinkMode(prev);
                                  toast({ title: 'Error', description: 'Failed to update setting', variant: 'destructive' });
                                } else {
                                  toast({ title: 'Updated', description: `Auto-linking set to ${opt.t}.` });
                                  if (opt.v !== 'manual') {
                                    supabase.functions.invoke('alice-auto-link', { body: { user_id: user.id } }).catch(() => {});
                                  }
                                }
                              }}
                            />
                            <div>
                              <div className="text-sm font-medium">{opt.t}</div>
                              <div className="text-xs text-muted-foreground">{opt.d}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </Card>

                  <Separator className="my-6" />


                  <h3 className="text-lg font-medium mb-4">Notifications</h3>

                  <Card className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1 flex-1 mr-4">
                        <div className="flex items-center gap-2">
                          <Bell className="h-5 w-5 text-primary" />
                          <h4 className="font-medium">Engagement Nudges</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Receive periodic push notifications (every 4-6 hours) with updates about your longest note, most recent work, or inspirational messages to keep your habit going.
                        </p>
                      </div>
                      <Switch
                        checked={engagementNudges}
                        onCheckedChange={async (checked) => {
                          if (!user) return;
                          setEngagementNudges(checked);
                          const { error } = await supabase
                            .from('profiles')
                            .update({ engagement_nudges_enabled: checked })
                            .eq('user_id', user.id);
                          if (error) {
                            toast({ title: 'Error', description: 'Failed to update setting', variant: 'destructive' });
                            setEngagementNudges(!checked);
                          } else {
                            toast({ title: checked ? 'Enabled' : 'Disabled', description: checked ? 'You\'ll receive periodic engagement nudges.' : 'Engagement nudges have been turned off.' });
                          }
                        }}
                      />
                    </div>
                  </Card>

                  <Card className="p-6 mt-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1 flex-1 mr-4">
                        <div className="flex items-center gap-2">
                          <Bell className="h-5 w-5 text-primary" />
                          <h4 className="font-medium">Habit Recovery Tasks</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          When you miss a habit, automatically create a "Catch up on habit: [name]" task for the next day so you can get back on track.
                        </p>
                      </div>
                      <Switch
                        checked={habitRecovery}
                        onCheckedChange={async (checked) => {
                          if (!user) return;
                          setHabitRecovery(checked);
                          const { error } = await supabase
                            .from('profiles')
                            .update({ habit_recovery_enabled: checked } as any)
                            .eq('user_id', user.id);
                          if (error) {
                            toast({ title: 'Error', description: 'Failed to update setting', variant: 'destructive' });
                            setHabitRecovery(!checked);
                          } else {
                            toast({ title: checked ? 'Enabled' : 'Disabled', description: checked ? 'Missed habits will create recovery tasks.' : 'Recovery tasks disabled.' });
                          }
                        }}
                      />
                    </div>
                  </Card>

                  <Separator className="my-6" />



                  <h3 className="text-lg font-medium mb-4">ALICE Preferences</h3>

                  <Card className="p-6">
                    <div className="space-y-2">
                      <h4 className="font-medium">Preferred Search Engine</h4>
                      <p className="text-sm text-muted-foreground mb-3">Which engine ALICE uses for web_search calls.</p>
                      <select
                        value={searchEngine}
                        onChange={async (e) => {
                          if (!user) return;
                          const v = e.target.value as 'google' | 'duckduckgo';
                          setSearchEngine(v);
                          await supabase.from('profiles').update({ preferred_search_engine: v } as any).eq('user_id', user.id);
                          toast({ title: 'Saved', description: `ALICE will use ${v === 'google' ? 'Google' : 'DuckDuckGo'}.` });
                        }}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                      >
                        <option value="google">Google (default)</option>
                        <option value="duckduckgo">DuckDuckGo (privacy-first)</option>
                      </select>
                    </div>
                  </Card>

                  <Card className="p-6 mt-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1 flex-1 mr-4">
                        <h4 className="font-medium">Proactive ALICE</h4>
                        <p className="text-sm text-muted-foreground">
                          ALICE wakes up on her own to surface useful nudges based on your calendar, tasks, and recent work.
                        </p>
                      </div>
                      <Switch
                        checked={aliceProactive}
                        onCheckedChange={async (checked) => {
                          if (!user) return;
                          setAliceProactive(checked);
                          await supabase.from('profiles').update({ alice_proactive_enabled: checked } as any).eq('user_id', user.id);
                          toast({ title: checked ? 'Enabled' : 'Disabled', description: checked ? 'ALICE will check in periodically.' : 'Proactive nudges turned off.' });
                        }}
                      />
                    </div>
                    {aliceProactive && (
                      <div className="mt-4 space-y-2">
                        <label className="text-sm font-medium">Frequency (1 = quiet, 5 = always on): {aliceProactiveLevel}</label>
                        <input
                          type="range" min={1} max={5} step={1} value={aliceProactiveLevel}
                          onChange={async (e) => {
                            if (!user) return;
                            const v = parseInt(e.target.value, 10);
                            setAliceProactiveLevel(v);
                            await supabase.from('profiles').update({ alice_proactive_level: v } as any).eq('user_id', user.id);
                          }}
                          className="w-full"
                        />
                      </div>
                    )}
                  </Card>
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