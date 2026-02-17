import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminOverview } from '@/components/admin/AdminOverview';
import { UserManagement } from '@/components/admin/UserManagement';
import { SystemSettings } from '@/components/admin/SystemSettings';
import { DocumentationViewer } from '@/components/admin/DocumentationViewer';
import { SecurityMonitor } from '@/components/admin/SecurityMonitor';
import { AdminAuditLog } from '@/components/admin/AdminAuditLog';
import { ContentModeration } from '@/components/admin/ContentModeration';
import { DomainManagement } from '@/components/admin/DomainManagement';
import { FeatureRequestsPanel } from '@/components/admin/FeatureRequestsPanel';
import { ErrorReportsPanel } from '@/components/admin/ErrorReportsPanel';
import { CookieAnalytics } from '@/components/admin/CookieAnalytics';
import { ToolTester } from '@/components/admin/ToolTester';
import { AdminCommandPalette } from '@/components/admin/AdminCommandPalette';
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Shield, AlertTriangle, Download, Cookie, Wrench, Menu, Search, RefreshCw, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { exportCodebase } from '@/utils/codebaseExport';
import { useIsMobile } from '@/hooks/use-mobile';
import { getAllAdminSections } from '@/components/admin/adminNavItems';

export default function Admin() {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [activeSection, setActiveSection] = useState('overview-analytics');
  const [isExporting, setIsExporting] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [badges, setBadges] = useState<Record<string, number>>({});
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Keyboard shortcut for command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Fetch badge counts
  useEffect(() => {
    if (!isAdmin) return;
    const fetchBadges = async () => {
      const [{ count: newErrors }, { count: pendingFeatures }] = await Promise.all([
        supabase.from('error_reports').select('id', { count: 'exact', head: true }).eq('status', 'new'),
        supabase.from('feature_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);
      setBadges({
        'feedback-errors': newErrors || 0,
        'feedback-features': pendingFeatures || 0,
      });
    };
    fetchBadges();
  }, [isAdmin]);

  const handleSectionChange = useCallback((section: string) => {
    setActiveSection(section);
    setMobileNavOpen(false);
  }, []);

  const handleExportCodebase = async () => {
    if (!user?.email) {
      toast({ title: "Error", description: "User email not found", variant: "destructive" });
      return;
    }
    setIsExporting(true);
    try {
      await supabase.rpc('log_security_event', {
        p_user_id: user.id,
        p_event_type: 'codebase_export',
        p_event_details: {
          action: 'admin_codebase_export',
          timestamp: new Date().toISOString(),
          user_email: user.email,
          source: 'admin_panel',
        },
      });
      await exportCodebase(user.email);
      toast({ title: "Success", description: "Site exported successfully! Check your downloads." });
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: "Export Failed", description: "Failed to export codebase.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user) { setCheckingAccess(false); return; }
      try {
        const { data, error } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
        if (error) {
          toast({ title: "Access Denied", description: "Unable to verify admin privileges", variant: "destructive" });
        } else {
          setIsAdmin(data);
        }
      } catch {
        toast({ title: "Access Error", description: "Failed to check admin access", variant: "destructive" });
      } finally {
        setCheckingAccess(false);
      }
    };
    checkAdminAccess();
  }, [user, toast]);

  if (loading || checkingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
            <Shield className="h-16 w-16 mx-auto mb-4 text-primary relative z-10 animate-pulse" />
          </div>
          <p className="text-muted-foreground mt-4">Verifying admin credentials...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-96 border-destructive/20">
          <CardHeader className="text-center">
            <div className="mx-auto p-4 rounded-full bg-destructive/10 w-fit mb-4">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to access the admin panel</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => (window.location.href = '/auth')}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-96 border-destructive/20">
          <CardHeader className="text-center">
            <div className="mx-auto p-4 rounded-full bg-destructive/10 w-fit mb-4">
              <Shield className="h-10 w-10 text-destructive" />
            </div>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You don't have administrator privileges</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => (window.location.href = '/app')}>Return to App</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Breadcrumb
  const currentSection = getAllAdminSections().find((s) => s.id === activeSection);
  const breadcrumbLabel = currentSection?.label || 'Overview';
  const breadcrumbParent = currentSection?.parentLabel;

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
      case 'overview-analytics':
        return <AdminOverview />;
      case 'overview-cookies':
        return (
          <>
            <AdminSectionHeader icon={Cookie} title="Cookie Consent Analytics" description="Track user privacy preferences and consent patterns" />
            <CookieAnalytics />
          </>
        );
      case 'users':
        return <UserManagement />;
      case 'content':
        return <ContentModeration />;
      case 'security-audit':
        return <AdminAuditLog />;
      case 'security-monitor':
        return <SecurityMonitor />;
      case 'security-domains':
        return <DomainManagement />;
      case 'feedback-features':
        return <FeatureRequestsPanel />;
      case 'feedback-errors':
        return <ErrorReportsPanel />;
      case 'system-settings':
        return <SystemSettings />;
      case 'system-export':
        return (
          <div className="space-y-6">
            <AdminSectionHeader
              icon={Download}
              title="Export & Backup"
              description="Download your complete site codebase"
              actions={
                <Button onClick={handleExportCodebase} disabled={isExporting} className="gap-2">
                  <Download className="h-4 w-4" />
                  {isExporting ? 'Exporting...' : 'Export Site'}
                </Button>
              }
            />

            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle>What's Included</CardTitle>
                <CardDescription>Complete source code for deployment anywhere</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {[
                    'Complete source code (all React components, hooks, utilities)',
                    'Configuration files (Vite, Tailwind, TypeScript, etc.)',
                    'Supabase backend functions and database schema',
                    'Package.json with all dependencies',
                    'Deployment instructions and README',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="p-1 rounded-full bg-green-500/10 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                      </div>
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle>Deployment Options</CardTitle>
                <CardDescription>Deploy to any hosting platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { name: 'Netlify/Vercel', desc: 'Connect repo and auto-deploy' },
                    { name: 'AWS S3/CloudFront', desc: 'Static hosting with CDN' },
                    { name: 'Custom VPS', desc: 'Full control with nginx/apache' },
                    { name: 'GitHub Pages', desc: 'Free hosting for public repos' },
                  ].map((option, i) => (
                    <div key={i} className="p-3 rounded-lg border border-border bg-muted/30">
                      <h4 className="font-medium text-sm">{option.name}</h4>
                      <p className="text-xs text-muted-foreground">{option.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="pt-6">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  <strong>Note:</strong> After exporting, you'll need to set up your Supabase credentials in the .env file and configure your database. See the included README for instructions.
                </p>
              </CardContent>
            </Card>
          </div>
        );
      case 'system-tools':
        return <ToolTester />;
      case 'docs':
        return <DocumentationViewer />;
      default:
        return <AdminOverview />;
    }
  };

  return (
    <>
      <div className="flex" style={{ minHeight: 'calc(100vh - 2.75rem)' }}>
        {/* Desktop Sidebar */}
        {!isMobile && (
          <aside className="w-60 border-r border-border bg-card flex-shrink-0 hidden lg:flex flex-col">
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm">Admin Panel</h2>
                  <p className="text-xs text-muted-foreground">Control Center</p>
                </div>
              </div>
            </div>
            <AdminSidebar activeSection={activeSection} onSectionChange={handleSectionChange} badges={badges} />
          </aside>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header Bar */}
          <header className="h-12 border-b border-border bg-card/80 backdrop-blur-sm flex items-center gap-3 px-4 flex-shrink-0">
            {isMobile && (
              <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={() => setMobileNavOpen(true)}>
                <Menu className="h-4 w-4" />
              </Button>
            )}

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm min-w-0">
              <span className="text-muted-foreground hidden sm:inline">Admin</span>
              {breadcrumbParent && (
                <>
                  <ChevronRight className="h-3 w-3 text-muted-foreground hidden sm:block" />
                  <span className="text-muted-foreground hidden sm:inline">{breadcrumbParent}</span>
                </>
              )}
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium truncate">{breadcrumbLabel}</span>
            </div>

            <div className="flex-1" />

            {/* Search trigger */}
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:flex items-center gap-2 text-muted-foreground h-8 px-3"
              onClick={() => setCommandOpen(true)}
            >
              <Search className="h-3.5 w-3.5" />
              <span className="text-xs">Search...</span>
              <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                ⌘K
              </kbd>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:hidden"
              onClick={() => setCommandOpen(true)}
            >
              <Search className="h-4 w-4" />
            </Button>

            <span className="text-[10px] text-muted-foreground hidden md:block whitespace-nowrap">
              {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-auto">
            <div className="p-4 lg:p-6 max-w-7xl mx-auto">{renderContent()}</div>
          </main>
        </div>
      </div>

      {/* Mobile Drawer */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-sm">Admin Panel</h2>
                <p className="text-xs text-muted-foreground">Control Center</p>
              </div>
            </div>
          </div>
          <AdminSidebar activeSection={activeSection} onSectionChange={handleSectionChange} badges={badges} />
        </SheetContent>
      </Sheet>

      {/* Command Palette */}
      <AdminCommandPalette open={commandOpen} onOpenChange={setCommandOpen} onNavigate={handleSectionChange} />
    </>
  );
}
