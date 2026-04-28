import {
  BarChart3,
  Users,
  Shield,
  Settings,
  BookOpen,
  Lightbulb,
  Bug,
  Cookie,
  Globe,
  FileText,
  Download,
  Wrench,
  Activity,
  Lock,
  FileSearch,
  Bot,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface AdminNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  subItems?: { id: string; label: string; icon?: LucideIcon }[];
}

export const adminNavItems: AdminNavItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: BarChart3,
    subItems: [
      { id: 'analytics', label: 'Platform Analytics', icon: Activity },
      { id: 'cookies', label: 'Cookie Analytics', icon: Cookie },
    ],
  },
  {
    id: 'users',
    label: 'User Management',
    icon: Users,
  },
  {
    id: 'content',
    label: 'Content Stats',
    icon: FileText,
  },
  {
    id: 'security',
    label: 'Security',
    icon: Shield,
    subItems: [
      { id: 'audit', label: 'Audit Log', icon: Lock },
      { id: 'monitor', label: 'Security Monitor', icon: Shield },
      { id: 'domains', label: 'Domain Management', icon: Globe },
    ],
  },
  {
    id: 'feedback',
    label: 'Feedback',
    icon: Lightbulb,
    subItems: [
      { id: 'features', label: 'Feature Requests', icon: Lightbulb },
      { id: 'errors', label: 'Error Reports', icon: Bug },
    ],
  },
  {
    id: 'system',
    label: 'System',
    icon: Settings,
    subItems: [
      { id: 'settings', label: 'System Settings', icon: Settings },
      { id: 'export', label: 'Export & Backup', icon: Download },
      { id: 'tools', label: 'Test Tools', icon: Wrench },
      { id: 'report', label: 'Platform Report', icon: FileSearch },
      { id: 'ai-assistant', label: 'AI Assistant', icon: Bot },
      { id: 'ai-fixer', label: 'AI Frontend Fixer', icon: Wrench },
      { id: 'seo-engine', label: 'SEO/AEO Engine', icon: Sparkles },
    ],
  },
  {
    id: 'docs',
    label: 'Documentation',
    icon: BookOpen,
  },
];

// Flatten all navigable sections for command palette
export function getAllAdminSections(): { id: string; label: string; icon: LucideIcon; parentLabel?: string }[] {
  const sections: { id: string; label: string; icon: LucideIcon; parentLabel?: string }[] = [];
  for (const item of adminNavItems) {
    if (item.subItems) {
      for (const sub of item.subItems) {
        sections.push({
          id: `${item.id}-${sub.id}`,
          label: sub.label,
          icon: sub.icon || item.icon,
          parentLabel: item.label,
        });
      }
    } else {
      sections.push({ id: item.id, label: item.label, icon: item.icon });
    }
  }
  return sections;
}
