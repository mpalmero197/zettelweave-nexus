import { useState } from 'react';
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
import { User, Settings, Lock, Palette, Upload, Save, Check, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { exportCodebase } from '@/utils/codebaseExport';

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
  
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'appearance' | 'backup'>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  
  // Profile states
  const [displayName, setDisplayName] = useState('');
  const [aboutMe, setAboutMe] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  
  // Security states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Appearance states
  const [selectedTheme, setSelectedTheme] = useState('system');

  const handleProfileUpdate = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          display_name: displayName,
          about_me: aboutMe,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error: any) {
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

    setIsLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setAvatarUrl(publicUrl);
      
      toast({
        title: "Avatar uploaded",
        description: "Don't forget to save your profile changes.",
      });
    } catch (error: any) {
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
    ...(user?.email === 'mpalmero197@gmail.com' ? [{ id: 'backup', label: 'Backup', icon: Download }] : []),
  ];

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden bg-card/95 backdrop-blur-md border border-border/50 shadow-2xl">
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
                  
                  <div className="grid gap-4">
                    {themes.map((theme) => (
                      <Card
                        key={theme.id}
                        className={`p-4 cursor-pointer transition-all duration-200 ${
                          selectedTheme === theme.id
                            ? 'ring-2 ring-primary bg-primary/5'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => handleThemeChange(theme.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{theme.name}</h4>
                              {selectedTheme === theme.id && (
                                <Badge variant="default" className="text-xs">
                                  <Check className="h-3 w-3 mr-1" />
                                  Active
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {theme.description}
                            </p>
                          </div>
                          
                          <div className="flex gap-1">
                            {theme.id === 'light' && (
                              <div className="w-6 h-6 rounded-full bg-white border-2 border-gray-300"></div>
                            )}
                            {theme.id === 'dark' && (
                              <div className="w-6 h-6 rounded-full bg-gray-900 border-2 border-gray-600"></div>
                            )}
                            {theme.id === 'midnight' && (
                              <div className="w-6 h-6 rounded-full bg-black border-2 border-gray-800"></div>
                            )}
                            {theme.id === 'ocean' && (
                              <div className="w-6 h-6 rounded-full bg-blue-600 border-2 border-blue-400"></div>
                            )}
                            {theme.id === 'forest' && (
                              <div className="w-6 h-6 rounded-full bg-green-600 border-2 border-green-400"></div>
                            )}
                            {theme.id === 'sunset' && (
                              <div className="w-6 h-6 rounded-full bg-orange-500 border-2 border-orange-300"></div>
                            )}
                            {theme.id === 'lavender' && (
                              <div className="w-6 h-6 rounded-full bg-purple-500 border-2 border-purple-300"></div>
                            )}
                            {theme.id === 'system' && (
                              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-white to-gray-900 border-2 border-gray-400"></div>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'backup' && user?.email === 'mpalmero197@gmail.com' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Codebase Backup</h3>
                  
                  <Card className="p-6 mb-6">
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <Download className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-lg mb-2">Export Complete Codebase</h4>
                          <p className="text-muted-foreground mb-4">
                            Download a complete backup of your application including all source code, 
                            configuration files, and setup instructions. This backup can be deployed 
                            independently of Lovable.
                          </p>
                          
                          <div className="bg-muted/30 rounded-lg p-4 mb-4">
                            <h5 className="font-medium mb-2">What's included:</h5>
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
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}