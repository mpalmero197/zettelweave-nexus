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
  
  // Profile states
  const [displayName, setDisplayName] = useState('');
  const [aboutMe, setAboutMe] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Load profile data on mount
  useEffect(() => {
    if (user) {
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
          }
        });
    }
  }, [user]);
  
  // Security states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
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
        root.style.setProperty('--background', '0 0% 0%');
        root.style.setProperty('--card', '0 0% 5%');
        root.style.setProperty('--foreground', '0 0% 98%');
        root.style.setProperty('--muted', '0 0% 10%');
        root.style.setProperty('--border', '0 0% 15%');
        break;
      case 'ocean':
        root.classList.add('dark');
        root.style.setProperty('--primary', '200 100% 50%');
        root.style.setProperty('--accent', '190 100% 60%');
        break;
      case 'forest':
        root.classList.add('dark');
        root.style.setProperty('--primary', '120 60% 50%');
        root.style.setProperty('--accent', '140 70% 60%');
        break;
      case 'sunset':
        root.classList.add('dark');
        root.style.setProperty('--primary', '20 100% 60%');
        root.style.setProperty('--accent', '40 100% 70%');
        break;
      case 'lavender':
        root.classList.add('dark');
        root.style.setProperty('--primary', '270 70% 60%');
        root.style.setProperty('--accent', '290 80% 70%');
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

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    setIsLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { 
          upsert: true,
          contentType: file.type
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update local state
      setAvatarUrl(publicUrl);

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
    }
  };

  const handleExportBackup = async () => {
    if (!user?.email) return;
    
    setIsLoading(true);
    try {
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
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-4xl my-8 overflow-hidden bg-card/95 backdrop-blur-md border border-border/50 shadow-2xl">
        <CardHeader className="pb-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Account Settings
              </CardTitle>
              <CardDescription>
                Manage your profile, security, and preferences
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>
        </CardHeader>

        <div className="flex h-[600px]">
          {/* Sidebar */}
          <div className="w-48 border-r border-border/50 p-4">
            <div className="space-y-1">
              {tabs.map(({ id, label, icon: Icon }) => (
                <Button
                  key={id}
                  variant={activeTab === id ? "default" : "ghost"}
                  size="sm"
                  className="w-full justify-start gap-2 text-left"
                  onClick={() => setActiveTab(id as typeof activeTab)}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
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
                    
                    <div>
                      <Label htmlFor="avatar-upload" className="cursor-pointer">
                        <Button variant="outline" size="sm" className="gap-2" asChild>
                          <span>
                            <Upload className="h-4 w-4" />
                            Upload Avatar
                          </span>
                        </Button>
                      </Label>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        JPG, PNG up to 2MB
                      </p>
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
                  
                  <div className="grid gap-3 max-w-md">
                    {themes.map((theme) => (
                      <Card 
                        key={theme.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedTheme === theme.id ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => handleThemeChange(theme.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{theme.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {theme.description}
                              </p>
                            </div>
                            {selectedTheme === theme.id && (
                              <Check className="h-5 w-5 text-primary" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
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
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
      
      {showDebugLogger && (
        <DebugLogger onClose={() => setShowDebugLogger(false)} />
      )}
    </div>
  );
}