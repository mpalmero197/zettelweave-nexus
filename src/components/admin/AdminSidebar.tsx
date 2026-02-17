import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Lock, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { adminNavItems } from './adminNavItems';

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  badges?: Record<string, number>;
}

export function AdminSidebar({ activeSection, onSectionChange, badges = {} }: AdminSidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['overview', 'security', 'feedback', 'system']);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  const isActive = (id: string) => activeSection === id || activeSection.startsWith(id + '-');

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1 px-2 py-2">
        <nav className="space-y-1">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id}>
                <Button
                  variant={isActive(item.id) ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start gap-3 h-10',
                    isActive(item.id) && 'bg-primary/10 text-primary hover:bg-primary/15'
                  )}
                  onClick={() => {
                    if (item.subItems) {
                      toggleGroup(item.id);
                    } else {
                      onSectionChange(item.id);
                    }
                  }}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-left text-sm">{item.label}</span>
                  {item.subItems && (
                    <ChevronRight
                      className={cn(
                        'h-4 w-4 transition-transform',
                        expandedGroups.includes(item.id) && 'rotate-90'
                      )}
                    />
                  )}
                </Button>

                {item.subItems && expandedGroups.includes(item.id) && (
                  <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-border pl-3">
                    {item.subItems.map((sub) => {
                      const sectionId = `${item.id}-${sub.id}`;
                      const badgeCount = badges[sectionId];
                      return (
                        <Button
                          key={sub.id}
                          variant={activeSection === sectionId ? 'secondary' : 'ghost'}
                          size="sm"
                          className={cn(
                            'w-full justify-start text-sm h-8',
                            activeSection === sectionId && 'bg-primary/10 text-primary'
                          )}
                          onClick={() => onSectionChange(sectionId)}
                        >
                          <span className="flex-1 text-left">{sub.label}</span>
                          {badgeCount != null && badgeCount > 0 && (
                            <Badge variant="secondary" className="ml-auto h-5 min-w-5 text-[10px] px-1.5">
                              {badgeCount}
                            </Badge>
                          )}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Privacy Notice */}
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
    </div>
  );
}
