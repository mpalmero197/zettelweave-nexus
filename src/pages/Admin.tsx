import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserManagement } from '@/components/admin/UserManagement';
import { SystemSettings } from '@/components/admin/SystemSettings';
import { DocumentationViewer } from '@/components/admin/DocumentationViewer';
import { AnalyticsDashboard } from '@/components/admin/AnalyticsDashboard';
import { SecurityMonitor } from '@/components/admin/SecurityMonitor';
import { AdminAuditLog } from '@/components/admin/AdminAuditLog';
import { ContentModeration } from '@/components/admin/ContentModeration';
import { DomainManagement } from '@/components/admin/DomainManagement';
import { FeatureRequestsPanel } from '@/components/admin/FeatureRequestsPanel';
import { ErrorReportsPanel } from '@/components/admin/ErrorReportsPanel';
import { CookieAnalytics } from '@/components/admin/CookieAnalytics';
import { Shield, Users, Settings, AlertTriangle, BookOpen, Activity, BarChart, Eye, ShieldAlert, Download, Lightbulb, Bug, Cookie } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { exportCodebase } from '@/utils/codebaseExport';

export default function Admin() {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExportCodebase = async () => {
    if (!user?.email) {
      toast({
        title: "Error",
        description: "User email not found",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      // Log the codebase export action
      await supabase.rpc('log_security_event', {
        p_user_id: user.id,
        p_event_type: 'codebase_export',
        p_event_details: {
          action: 'admin_codebase_export',
          timestamp: new Date().toISOString(),
          user_email: user.email,
          source: 'admin_panel'
        }
      });

      await exportCodebase(user.email);
      toast({
        title: "Success",
        description: "Site exported successfully! Check your downloads.",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export codebase. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user) {
        setCheckingAccess(false);
        return;
      }

      try {
        // Check if user has admin role
        const { data, error } = await supabase
          .rpc('has_role', { _user_id: user.id, _role: 'admin' });
        
        if (error) {
          toast({
            title: "Access Denied",
            description: "Unable to verify admin privileges",
            variant: "destructive",
          });
        } else {
          setIsAdmin(data);
        }
      } catch (error) {
        toast({
          title: "Access Error",
          description: "Failed to check admin access",
          variant: "destructive",
        });
      } finally {
        setCheckingAccess(false);
      }
    };

    checkAdminAccess();
  }, [user, toast]);

  if (loading || checkingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 animate-pulse text-primary" />
          <p className="text-muted-foreground">Checking admin access...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Please log in to access the admin panel</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have admin privileges to access this section
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-3 md:p-6">
      <div className="container mx-auto">
        <div className="mb-4 md:mb-8">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl md:text-3xl font-bold flex items-center gap-2">
                <Shield className="h-6 w-6 md:h-8 md:w-8 text-primary shrink-0" />
                <span className="truncate">Admin Panel</span>
              </h1>
              <p className="text-muted-foreground mt-1 md:mt-2 text-sm md:text-base hidden sm:block">
                Complete control hub for PendragonX platform management
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/'}
              className="shrink-0"
            >
              <span className="hidden sm:inline">Back to App</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-7 gap-1 md:gap-2">
            <TabsTrigger value="overview" className="flex items-center justify-center gap-2 px-2 md:px-4">
              <BarChart className="h-4 w-4" />
              <span className="hidden md:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center justify-center gap-2 px-2 md:px-4">
              <Users className="h-4 w-4" />
              <span className="hidden md:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center justify-center gap-2 px-2 md:px-4">
              <Eye className="h-4 w-4" />
              <span className="hidden md:inline">Content</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center justify-center gap-2 px-2 md:px-4">
              <ShieldAlert className="h-4 w-4" />
              <span className="hidden md:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="feedback" className="flex items-center justify-center gap-2 px-2 md:px-4">
              <Lightbulb className="h-4 w-4" />
              <span className="hidden md:inline">Feedback</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center justify-center gap-2 px-2 md:px-4">
              <Settings className="h-4 w-4" />
              <span className="hidden md:inline">System</span>
            </TabsTrigger>
            <TabsTrigger value="docs" className="flex items-center justify-center gap-2 px-2 md:px-4">
              <BookOpen className="h-4 w-4" />
              <span className="hidden md:inline">Docs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Tabs defaultValue="analytics" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="analytics">Platform Analytics</TabsTrigger>
                <TabsTrigger value="cookies">Cookie Analytics</TabsTrigger>
              </TabsList>
              
              <TabsContent value="analytics">
                <Card>
                  <CardHeader>
                    <CardTitle>Analytics Dashboard</CardTitle>
                    <CardDescription>Platform-wide statistics and growth metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AnalyticsDashboard />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="cookies">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Cookie className="h-5 w-5" />
                      Cookie Consent Analytics
                    </CardTitle>
                    <CardDescription>
                      Track user privacy preferences and consent patterns to optimize your cookie strategy
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CookieAnalytics />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="content">
            <ContentModeration />
          </TabsContent>

          <TabsContent value="security">
            <Tabs defaultValue="audit" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="audit">Audit Log</TabsTrigger>
                <TabsTrigger value="monitor">Security Monitor</TabsTrigger>
                <TabsTrigger value="domains">Domain Management</TabsTrigger>
              </TabsList>
              
              <TabsContent value="audit">
                <AdminAuditLog />
              </TabsContent>
              
              <TabsContent value="monitor">
                <SecurityMonitor />
              </TabsContent>
              
              <TabsContent value="domains">
                <DomainManagement />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="feedback">
            <Tabs defaultValue="features" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="features">Feature Requests</TabsTrigger>
                <TabsTrigger value="errors">Error Reports</TabsTrigger>
              </TabsList>
              
              <TabsContent value="features">
                <FeatureRequestsPanel />
              </TabsContent>
              
              <TabsContent value="errors">
                <ErrorReportsPanel />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="system">
            <Tabs defaultValue="settings" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="settings">System Settings</TabsTrigger>
                <TabsTrigger value="export">Export & Backup</TabsTrigger>
              </TabsList>
              
              <TabsContent value="settings">
                <SystemSettings />
              </TabsContent>
              
              <TabsContent value="export">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Site Export & Backup
                </CardTitle>
                <CardDescription>
                  Download your complete site codebase for hosting on any platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-6 border rounded-lg bg-muted/50">
                  <h3 className="text-lg font-semibold mb-3">What's Included</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">✓</span>
                      <span>Complete source code (all React components, hooks, utilities)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">✓</span>
                      <span>Configuration files (Vite, Tailwind, TypeScript, etc.)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">✓</span>
                      <span>Supabase backend functions and database schema</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">✓</span>
                      <span>Package.json with all dependencies</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">✓</span>
                      <span>Deployment instructions and README</span>
                    </li>
                  </ul>
                </div>

                <div className="p-6 border rounded-lg bg-primary/5">
                  <h3 className="text-lg font-semibold mb-3">Deployment Options</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Once downloaded, you can deploy your site to any hosting platform:
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary"></span>
                      <span><strong>Netlify/Vercel:</strong> Connect repo and auto-deploy</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary"></span>
                      <span><strong>AWS S3/CloudFront:</strong> Static hosting with CDN</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary"></span>
                      <span><strong>Custom VPS:</strong> Full control with nginx/apache</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary"></span>
                      <span><strong>GitHub Pages:</strong> Free hosting for public repos</span>
                    </li>
                  </ul>
                </div>

                <div className="flex items-center justify-between p-6 border rounded-lg">
                  <div>
                    <h3 className="font-semibold mb-1">Export Complete Site</h3>
                    <p className="text-sm text-muted-foreground">
                      Download a ZIP file containing your entire codebase
                    </p>
                  </div>
                  <Button 
                    onClick={handleExportCodebase}
                    disabled={isExporting}
                    size="lg"
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    {isExporting ? 'Exporting...' : 'Export Site'}
                  </Button>
                </div>

                <div className="p-4 border border-yellow-500/50 rounded-lg bg-yellow-500/10">
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    <strong>Note:</strong> After exporting, you'll need to set up your Supabase credentials 
                    in the .env file and configure your database. See the included README for instructions.
                  </p>
                </div>
              </CardContent>
            </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="docs">
            <DocumentationViewer />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}