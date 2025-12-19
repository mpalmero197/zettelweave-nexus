import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BarChart3, 
  Users, 
  Shield, 
  Settings, 
  BookOpen, 
  Lightbulb, 
  Bug, 
  Cookie,
  Activity,
  Globe,
  FileText,
  Download,
  ChevronLeft,
  ChevronRight,
  Lock,
  Home
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  subItems?: { id: string; label: string }[];
}

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const navItems: NavItem[] = [
  { 
    id: 'overview', 
    label: 'Overview', 
    icon: <BarChart3 className="h-5 w-5" />,
    subItems: [
      { id: 'analytics', label: 'Platform Analytics' },
      { id: 'cookies', label: 'Cookie Analytics' }
    ]
  },
  { 
    id: 'users', 
    label: 'User Management', 
    icon: <Users className="h-5 w-5" /> 
  },
  { 
    id: 'content', 
    label: 'Content Stats', 
    icon: <FileText className="h-5 w-5" /> 
  },
  { 
    id: 'security', 
    label: 'Security', 
    icon: <Shield className="h-5 w-5" />,
    subItems: [
      { id: 'audit', label: 'Audit Log' },
      { id: 'monitor', label: 'Security Monitor' },
      { id: 'domains', label: 'Domain Management' }
    ]
  },
  { 
    id: 'feedback', 
    label: 'Feedback', 
    icon: <Lightbulb className="h-5 w-5" />,
    subItems: [
      { id: 'features', label: 'Feature Requests' },
      { id: 'errors', label: 'Error Reports' }
    ]
  },
  { 
    id: 'system', 
    label: 'System', 
    icon: <Settings className="h-5 w-5" />,
    subItems: [
      { id: 'settings', label: 'System Settings' },
      { id: 'export', label: 'Export & Backup' }
    ]
  },
  { 
    id: 'docs', 
    label: 'Documentation', 
    icon: <BookOpen className="h-5 w-5" /> 
  },
];

export function AdminSidebar({ activeSection, onSectionChange }: AdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['overview', 'security', 'feedback', 'system']);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const isActive = (id: string) => activeSection === id || activeSection.startsWith(id + '-');

  return (
    <div 
      className={cn(
        "h-full bg-card border-r border-border flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">Admin Panel</h2>
              <p className="text-xs text-muted-foreground">Control Center</p>
            </div>
          </div>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 p-2">
        <nav className="space-y-1">
          {navItems.map((item) => (
            <div key={item.id}>
              <Button
                variant={isActive(item.id) ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-10",
                  collapsed && "justify-center px-2",
                  isActive(item.id) && "bg-primary/10 text-primary hover:bg-primary/15"
                )}
                onClick={() => {
                  if (item.subItems) {
                    toggleGroup(item.id);
                  } else {
                    onSectionChange(item.id);
                  }
                }}
              >
                {item.icon}
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left text-sm">{item.label}</span>
                    {item.subItems && (
                      <ChevronRight className={cn(
                        "h-4 w-4 transition-transform",
                        expandedGroups.includes(item.id) && "rotate-90"
                      )} />
                    )}
                  </>
                )}
              </Button>
              
              {/* Sub-items */}
              {!collapsed && item.subItems && expandedGroups.includes(item.id) && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-3">
                  {item.subItems.map((subItem) => (
                    <Button
                      key={subItem.id}
                      variant={activeSection === `${item.id}-${subItem.id}` ? "secondary" : "ghost"}
                      size="sm"
                      className={cn(
                        "w-full justify-start text-sm h-8",
                        activeSection === `${item.id}-${subItem.id}` && "bg-primary/10 text-primary"
                      )}
                      onClick={() => onSectionChange(`${item.id}-${subItem.id}`)}
                    >
                      {subItem.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Privacy Notice */}
      {!collapsed && (
        <div className="p-3 border-t border-border">
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-2 text-xs text-primary">
              <Lock className="h-3 w-3" />
              <span className="font-medium">Privacy Protected</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              User card contents are never visible to admins
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-2 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          className={cn("w-full gap-2", collapsed && "px-2")}
          onClick={() => window.location.href = '/app'}
        >
          <Home className="h-4 w-4" />
          {!collapsed && <span>Back to App</span>}
        </Button>
      </div>
    </div>
  );
}
