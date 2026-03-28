import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  FolderKanban, Plus, Search, Star, Archive, Trash2, Pencil,
  Clock, Users, DollarSign, Target, ChevronLeft, ChevronRight,
  MoreHorizontal, CheckCircle2, Circle, AlertCircle,
  BarChart3, ListTodo, Columns3, CalendarRange,
  Flag, UserPlus, Crown, Loader2, Shield, Settings2, X
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format, parseISO, differenceInDays, isBefore, addDays, startOfWeek, endOfWeek, addWeeks, eachDayOfInterval, eachWeekOfInterval, isWithinInterval, startOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// --- Types ---
interface ProjectCollaborator {
  id: string;
  project_id: string;
  owner_id: string;
  collaborator_id: string;
  role: string;
  status: string;
  title: string | null;
  can_assign_tasks: boolean;
  hierarchy_level: number;
  profile?: { display_name: string | null; avatar_url: string | null };
}

interface FriendProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  color: string;
  icon: string;
  start_date: string | null;
  due_date: string | null;
  budget: number | null;
  budget_spent: number | null;
  client_name: string | null;
  client_email: string | null;
  tags: string[];
  is_favorite: boolean;
  is_archived: boolean;
  title_mode: string;
  custom_titles: string[];
  industry: string | null;
  created_at: string;
  updated_at: string;
}

interface Milestone {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  sort_order: number;
  created_at: string;
}

interface Task {
  id: string;
  name: string;
  status: string;
  priority: string;
  due_date: string;
  notes: string | null;
  project_id: string | null;
  parent_task_id: string | null;
  user_id: string;
  assigned_to: string | null;
  created_at: string;
}

// --- Industry presets ---
const INDUSTRY_PRESETS: Record<string, string[]> = {
  'Software / Tech': ['CTO', 'Tech Lead', 'Senior Developer', 'Developer', 'Junior Developer', 'QA Engineer', 'DevOps Engineer', 'UI/UX Designer', 'Product Manager', 'Scrum Master', 'Business Analyst'],
  'Construction': ['Project Manager', 'Site Supervisor', 'Architect', 'Structural Engineer', 'Surveyor', 'Foreman', 'Safety Officer', 'Estimator', 'Drafter', 'Inspector'],
  'Film / Media': ['Director', 'Producer', 'Executive Producer', 'Cinematographer', 'Editor', 'Sound Designer', 'Art Director', 'Gaffer', 'Script Supervisor', 'Production Assistant'],
  'Marketing / Agency': ['Creative Director', 'Art Director', 'Copywriter', 'Account Manager', 'SEO Specialist', 'Social Media Manager', 'Graphic Designer', 'Brand Strategist', 'Content Writer', 'Media Buyer'],
  'Architecture / Design': ['Principal Architect', 'Lead Designer', 'Project Architect', 'Lead Modeler', 'Interior Designer', 'Landscape Architect', 'Drafter', 'BIM Manager', 'Sustainability Consultant', 'Surveyor'],
  'Healthcare': ['Chief Medical Officer', 'Department Head', 'Project Coordinator', 'Clinical Lead', 'Nurse Manager', 'Research Analyst', 'Data Manager', 'Quality Assurance', 'Compliance Officer'],
  'Education': ['Department Chair', 'Lead Instructor', 'Curriculum Designer', 'Teaching Assistant', 'Research Associate', 'Program Coordinator', 'Assessment Specialist'],
  'Finance': ['CFO', 'Finance Director', 'Senior Analyst', 'Financial Analyst', 'Accountant', 'Auditor', 'Risk Manager', 'Compliance Officer', 'Portfolio Manager'],
  'Engineering': ['Chief Engineer', 'Lead Engineer', 'Senior Engineer', 'Engineer', 'Junior Engineer', 'Technician', 'Quality Control', 'Safety Manager', 'CAD Designer'],
  'General': ['Director', 'Manager', 'Team Lead', 'Senior Associate', 'Associate', 'Coordinator', 'Specialist', 'Analyst', 'Assistant'],
};

// --- Config ---
const STATUS_CONFIG: Record<string, { label: string; dotClass: string }> = {
  active: { label: 'Active', dotClass: 'bg-emerald-500' },
  planning: { label: 'Planning', dotClass: 'bg-blue-500' },
  on_hold: { label: 'On Hold', dotClass: 'bg-amber-500' },
  completed: { label: 'Completed', dotClass: 'bg-sky-400' },
  cancelled: { label: 'Cancelled', dotClass: 'bg-red-500' },
};

const PRIORITY_CONFIG: Record<string, { label: string; dotClass: string }> = {
  low: { label: 'Low', dotClass: 'bg-muted-foreground' },
  medium: { label: 'Medium', dotClass: 'bg-amber-500' },
  high: { label: 'High', dotClass: 'bg-orange-500' },
  urgent: { label: 'Urgent', dotClass: 'bg-red-500' },
};

const TASK_COLORS = [
  'bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-red-500',
  'bg-slate-500', 'bg-sky-500', 'bg-pink-500', 'bg-teal-500',
];

const PROJECT_ICONS = ['📁', '🚀', '💼', '🎯', '📊', '🏗️', '💡', '🎨', '📱', '🌐', '🔧', '📝'];

// --- Component ---
export function ProjectManager() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'board' | 'timeline'>('grid');
  const [showArchived, setShowArchived] = useState(false);

  // Timeline
  const [timelineMode, setTimelineMode] = useState<'days' | 'weeks'>('weeks');
  const [timelineStart, setTimelineStart] = useState(() => startOfWeek(new Date()));

  // Create/Edit
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectForm, setProjectForm] = useState({
    name: '', description: '', status: 'active', priority: 'medium',
    color: '#3b82f6', icon: '📁', start_date: '', due_date: '',
    budget: '', client_name: '', client_email: '', tags: '',
    title_mode: 'free_text', custom_titles: '' as string, industry: '',
  });

  // Detail sheet
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [detailTab, setDetailTab] = useState('overview');
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({ title: '', description: '', due_date: '' });
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ name: '', priority: 'medium', due_date: '', assigned_to: '' });

  // Collaborators
  const [collaborators, setCollaborators] = useState<ProjectCollaborator[]>([]);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [loadingCollabs, setLoadingCollabs] = useState(false);
  const [addingCollab, setAddingCollab] = useState(false);

  // Role editing
  const [editingCollabId, setEditingCollabId] = useState<string | null>(null);
  const [editCollabForm, setEditCollabForm] = useState({ title: '', role: 'member', can_assign_tasks: false, hierarchy_level: 0 });
  const [showRoleSettings, setShowRoleSettings] = useState(false);
  const [newCustomTitle, setNewCustomTitle] = useState('');

  // --- Data fetching ---
  const fetchData = useCallback(async () => {
    if (!user) return;
    const [projectsRes, milestonesRes, tasksRes] = await Promise.all([
      supabase.from('projects').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
      supabase.from('project_milestones').select('*').eq('user_id', user.id).order('sort_order'),
      supabase.from('project_tasks').select('*').eq('user_id', user.id).not('project_id', 'is', null).order('created_at'),
    ]);
    if (!projectsRes.error) setProjects((projectsRes.data || []).map((p: any) => ({ ...p, custom_titles: Array.isArray(p.custom_titles) ? p.custom_titles : [] })) as Project[]);
    if (!milestonesRes.error) setMilestones(milestonesRes.data as Milestone[] || []);
    if (!tasksRes.error) setTasks(tasksRes.data as Task[] || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchCollaborators = useCallback(async (projectId: string) => {
    if (!user) return;
    setLoadingCollabs(true);
    try {
      const { data: collabs } = await supabase.from('project_collaborators').select('*').eq('project_id', projectId);
      const collabIds = (collabs || []).map(c => c.collaborator_id);
      let profiles: any[] = [];
      if (collabIds.length > 0) {
        const { data: p } = await supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', collabIds);
        profiles = p || [];
      }
      setCollaborators((collabs || []).map(c => ({ ...c, profile: profiles.find(p => p.user_id === c.collaborator_id) || null })) as ProjectCollaborator[]);

      const { data: friendships } = await supabase.from('friendships').select('*').or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);
      const friendIds = (friendships || []).map(f => f.user_id_1 === user.id ? f.user_id_2 : f.user_id_1).filter(id => !collabIds.includes(id));
      if (friendIds.length > 0) {
        const { data: fp } = await supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', friendIds);
        setFriends((fp || []) as FriendProfile[]);
      } else { setFriends([]); }
    } catch (e) { console.error('Failed to fetch collaborators', e); }
    finally { setLoadingCollabs(false); }
  }, [user]);

  // --- Actions ---
  const addCollaborator = async (friendId: string) => {
    if (!user || !selectedProject) return;
    setAddingCollab(true);
    try {
      const { error } = await supabase.from('project_collaborators').insert({ project_id: selectedProject.id, owner_id: user.id, collaborator_id: friendId, role: 'member', status: 'accepted' });
      if (error) throw error;
      toast.success('Collaborator added');
      fetchCollaborators(selectedProject.id);
    } catch (e: any) { toast.error(e.message || 'Failed to add'); }
    finally { setAddingCollab(false); }
  };

  const removeCollaborator = async (id: string) => {
    if (!selectedProject) return;
    const { error } = await supabase.from('project_collaborators').delete().eq('id', id);
    if (error) { toast.error('Failed to remove'); return; }
    toast.success('Collaborator removed');
    fetchCollaborators(selectedProject.id);
  };

  const updateCollaborator = async (id: string, updates: { title?: string | null; role?: string; can_assign_tasks?: boolean; hierarchy_level?: number }) => {
    const { error } = await supabase.from('project_collaborators').update(updates).eq('id', id);
    if (error) { toast.error('Failed to update'); return; }
    toast.success('Collaborator updated');
    if (selectedProject) fetchCollaborators(selectedProject.id);
    setEditingCollabId(null);
  };

  const updateProjectTitleSettings = async (updates: { title_mode?: string; custom_titles?: string[]; industry?: string | null }) => {
    if (!selectedProject) return;
    const { error } = await supabase.from('projects').update(updates).eq('id', selectedProject.id);
    if (error) { toast.error('Failed to update'); return; }
    setSelectedProject(prev => prev ? { ...prev, ...updates } as Project : null);
    fetchData();
    toast.success('Title settings updated');
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const filteredProjects = useMemo(() => {
    let result = projects.filter(p => showArchived ? p.is_archived : !p.is_archived);
    if (filterStatus !== 'all') result = result.filter(p => p.status === filterStatus);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q) ||
        p.client_name?.toLowerCase().includes(q) || p.tags?.some(t => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [projects, showArchived, filterStatus, searchQuery]);

  const getProjectTasks = (projectId: string) => tasks.filter(t => t.project_id === projectId);
  const getProjectMilestones = (projectId: string) => milestones.filter(m => m.project_id === projectId);
  const getProjectProgress = (projectId: string) => {
    const pts = getProjectTasks(projectId);
    if (pts.length === 0) return 0;
    return Math.round((pts.filter(t => t.status === 'done').length / pts.length) * 100);
  };

  const resetProjectForm = () => {
    setProjectForm({ name: '', description: '', status: 'active', priority: 'medium', color: '#3b82f6', icon: '📁', start_date: '', due_date: '', budget: '', client_name: '', client_email: '', tags: '', title_mode: 'free_text', custom_titles: '', industry: '' });
    setEditingProject(null);
  };

  const openCreate = () => { resetProjectForm(); setShowCreateDialog(true); };
  const openEdit = (project: Project) => {
    setEditingProject(project);
    setProjectForm({ name: project.name, description: project.description || '', status: project.status, priority: project.priority, color: project.color || '#3b82f6', icon: project.icon || '📁', start_date: project.start_date || '', due_date: project.due_date || '', budget: project.budget?.toString() || '', client_name: project.client_name || '', client_email: project.client_email || '', tags: project.tags?.join(', ') || '', title_mode: project.title_mode || 'free_text', custom_titles: Array.isArray(project.custom_titles) ? project.custom_titles.join(', ') : '', industry: project.industry || '' });
    setShowCreateDialog(true);
  };

  const saveProject = async () => {
    if (!user || !projectForm.name.trim()) return;
    const customTitlesArray = projectForm.custom_titles ? projectForm.custom_titles.split(',').map(t => t.trim()).filter(Boolean) : [];
    const data = { user_id: user.id, name: projectForm.name.trim(), description: projectForm.description || null, status: projectForm.status, priority: projectForm.priority, color: projectForm.color, icon: projectForm.icon, start_date: projectForm.start_date || null, due_date: projectForm.due_date || null, budget: projectForm.budget ? parseFloat(projectForm.budget) : null, client_name: projectForm.client_name || null, client_email: projectForm.client_email || null, tags: projectForm.tags ? projectForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [], title_mode: projectForm.title_mode, custom_titles: customTitlesArray, industry: projectForm.industry || null };
    if (editingProject) {
      const { error } = await supabase.from('projects').update(data).eq('id', editingProject.id);
      if (error) { toast.error('Failed to update'); return; }
      toast.success('Project updated');
    } else {
      const { error } = await supabase.from('projects').insert(data);
      if (error) { toast.error('Failed to create'); return; }
      toast.success('Project created');
    }
    setShowCreateDialog(false);
    resetProjectForm();
    fetchData();
  };

  const deleteProject = async (id: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Project deleted');
    if (selectedProject?.id === id) setSelectedProject(null);
    fetchData();
  };

  const toggleFavorite = async (project: Project) => {
    await supabase.from('projects').update({ is_favorite: !project.is_favorite }).eq('id', project.id);
    fetchData();
  };

  const toggleArchive = async (project: Project) => {
    await supabase.from('projects').update({ is_archived: !project.is_archived }).eq('id', project.id);
    toast.success(project.is_archived ? 'Unarchived' : 'Archived');
    if (selectedProject?.id === project.id) setSelectedProject(null);
    fetchData();
  };

  const addMilestone = async () => {
    if (!user || !selectedProject || !milestoneForm.title.trim()) return;
    const { error } = await supabase.from('project_milestones').insert({ project_id: selectedProject.id, user_id: user.id, title: milestoneForm.title.trim(), description: milestoneForm.description || null, due_date: milestoneForm.due_date || null, sort_order: getProjectMilestones(selectedProject.id).length });
    if (error) { toast.error('Failed to add'); return; }
    setMilestoneForm({ title: '', description: '', due_date: '' });
    setShowMilestoneForm(false);
    toast.success('Milestone added');
    fetchData();
  };

  const toggleMilestone = async (ms: Milestone) => {
    await supabase.from('project_milestones').update({ status: ms.status === 'completed' ? 'pending' : 'completed' }).eq('id', ms.id);
    fetchData();
  };

  const deleteMilestone = async (id: string) => { await supabase.from('project_milestones').delete().eq('id', id); fetchData(); };

  const addProjectTask = async () => {
    if (!user || !selectedProject || !taskForm.name.trim()) return;
    const { error } = await supabase.from('project_tasks').insert({
      user_id: user.id, name: taskForm.name.trim(), priority: taskForm.priority, status: 'todo',
      due_date: taskForm.due_date || format(new Date(), 'yyyy-MM-dd'), project_id: selectedProject.id,
      assigned_to: taskForm.assigned_to || null,
    });
    if (error) { toast.error('Failed to add'); return; }
    setTaskForm({ name: '', priority: 'medium', due_date: '', assigned_to: '' });
    setShowTaskForm(false);
    toast.success('Task added');
    fetchData();
  };

  const assignTask = async (taskId: string, assigneeId: string | null) => {
    const { error } = await supabase.from('project_tasks').update({ assigned_to: assigneeId }).eq('id', taskId);
    if (error) { toast.error('Failed to assign'); return; }
    toast.success(assigneeId ? 'Task assigned' : 'Task unassigned');
    fetchData();
  };

  const toggleProjectTask = async (task: Task) => {
    await supabase.from('project_tasks').update({ status: task.status === 'done' ? 'todo' : 'done' }).eq('id', task.id);
    fetchData();
  };

  const deleteProjectTask = async (id: string) => { await supabase.from('project_tasks').delete().eq('id', id); fetchData(); };

  const stats = useMemo(() => {
    const active = projects.filter(p => !p.is_archived);
    return {
      total: active.length,
      active: active.filter(p => p.status === 'active').length,
      completed: active.filter(p => p.status === 'completed').length,
      overdue: active.filter(p => p.due_date && isBefore(parseISO(p.due_date), new Date()) && p.status !== 'completed').length,
    };
  }, [projects]);

  const getDaysRemaining = (dueDate: string | null) => {
    if (!dueDate) return null;
    return differenceInDays(parseISO(dueDate), new Date());
  };

  // Get available titles for a project
  const getAvailableTitles = (project: Project): string[] => {
    if (project.title_mode === 'custom_list') {
      return Array.isArray(project.custom_titles) ? project.custom_titles : [];
    }
    if (project.title_mode === 'industry_presets') {
      return INDUSTRY_PRESETS[project.industry || 'General'] || INDUSTRY_PRESETS['General'];
    }
    return []; // free_text mode - no preset list
  };

  // Find assignee name
  const getAssigneeName = (assignedTo: string | null): string | null => {
    if (!assignedTo) return null;
    if (assignedTo === user?.id) return 'You';
    const collab = collaborators.find(c => c.collaborator_id === assignedTo);
    return collab?.profile?.display_name || 'Unknown';
  };

  // ===== TIMELINE VIEW =====
  const timelineSpan = timelineMode === 'days' ? 28 : 8;
  const timelineEnd = timelineMode === 'days'
    ? addDays(timelineStart, timelineSpan - 1)
    : addWeeks(timelineStart, timelineSpan);

  const timelineColumns = timelineMode === 'days'
    ? eachDayOfInterval({ start: timelineStart, end: timelineEnd })
    : eachWeekOfInterval({ start: timelineStart, end: timelineEnd });

  const navigateTimeline = (dir: number) => {
    if (timelineMode === 'days') {
      setTimelineStart(prev => addDays(prev, dir * 14));
    } else {
      setTimelineStart(prev => addWeeks(prev, dir * 4));
    }
  };

  const getBarPosition = (startDate: string | null, endDate: string | null) => {
    if (!startDate) return null;
    const start = parseISO(startDate);
    const end = endDate ? parseISO(endDate) : addDays(start, 7);
    const totalMs = timelineEnd.getTime() - timelineStart.getTime();
    if (totalMs <= 0) return null;
    const startOffset = Math.max(0, (start.getTime() - timelineStart.getTime()) / totalMs);
    const endOffset = Math.min(1, (end.getTime() - timelineStart.getTime()) / totalMs);
    if (endOffset <= 0 || startOffset >= 1) return null;
    return { left: `${startOffset * 100}%`, width: `${Math.max(2, (endOffset - startOffset) * 100)}%` };
  };

  const todayPosition = (() => {
    const totalMs = timelineEnd.getTime() - timelineStart.getTime();
    if (totalMs <= 0) return null;
    const offset = (Date.now() - timelineStart.getTime()) / totalMs;
    if (offset < 0 || offset > 1) return null;
    return `${offset * 100}%`;
  })();

  const renderTimeline = () => {
    const projectsWithDates = filteredProjects.filter(p => p.start_date || p.due_date);
    const projectsWithoutDates = filteredProjects.filter(p => !p.start_date && !p.due_date);

    return (
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">{format(timelineStart, 'MMMM yyyy')}</h3>
          <div className="flex items-center gap-2">
            <div className="flex border border-border rounded-lg overflow-hidden">
              <button onClick={() => setTimelineMode('days')} className={`px-3 py-1 text-xs font-medium transition-colors ${timelineMode === 'days' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Days</button>
              <button onClick={() => setTimelineMode('weeks')} className={`px-3 py-1 text-xs font-medium transition-colors ${timelineMode === 'weeks' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Weeks</button>
            </div>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => navigateTimeline(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => navigateTimeline(1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="flex border-b border-border">
              <div className="w-48 shrink-0 px-4 py-2 text-xs font-medium text-muted-foreground border-r border-border">Project</div>
              <div className="flex-1 flex relative">
                {timelineColumns.map((col, i) => {
                  const isToday = format(col, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                  return (
                    <div key={i} className={`flex-1 text-center py-2 text-[10px] font-medium border-r border-border/30 last:border-r-0 ${isToday ? 'text-foreground bg-accent/30' : 'text-muted-foreground'}`}>
                      {timelineMode === 'days' ? format(col, 'dd') : format(col, 'dd MMM')}
                    </div>
                  );
                })}
              </div>
            </div>

            {projectsWithDates.length === 0 && projectsWithoutDates.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">No projects to display. Create a project with start/due dates.</div>
            ) : (
              <>
                {projectsWithDates.map((project, idx) => {
                  const bar = getBarPosition(project.start_date, project.due_date);
                  const progress = getProjectProgress(project.id);
                  const pts = getProjectTasks(project.id);
                  const colorIdx = idx % TASK_COLORS.length;
                  return (
                    <div key={project.id} className="flex border-b border-border/30 hover:bg-accent/10 transition-colors cursor-pointer group" onClick={() => { setSelectedProject(project); setDetailTab('overview'); fetchCollaborators(project.id); }}>
                      <div className="w-48 shrink-0 px-4 py-3 border-r border-border flex items-center gap-2 min-h-[56px]">
                        <span className="text-sm">{project.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground truncate">{project.name}</p>
                          <p className="text-[10px] text-muted-foreground">{pts.filter(t => t.status === 'done').length}/{pts.length} tasks</p>
                        </div>
                      </div>
                      <div className="flex-1 relative min-h-[56px]">
                        <div className="absolute inset-0 flex">{timelineColumns.map((_, i) => (<div key={i} className="flex-1 border-r border-border/10 last:border-r-0" />))}</div>
                        {todayPosition && <div className="absolute top-0 bottom-0 w-px bg-red-500/60 z-10" style={{ left: todayPosition }} />}
                        {bar && (
                          <div className="absolute top-3 bottom-3 flex items-center" style={{ left: bar.left, width: bar.width }}>
                            <div className={`h-7 w-full rounded-md ${TASK_COLORS[colorIdx]} opacity-80 flex items-center px-2 overflow-hidden`} title={`${project.name} — ${progress}%`}>
                              <div className="absolute inset-y-0 left-0 rounded-l-md bg-white/20" style={{ width: `${progress}%` }} />
                              <span className="text-[10px] font-medium text-white relative z-10 truncate">{project.name}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {projectsWithoutDates.map(project => (
                  <div key={project.id} className="flex border-b border-border/30 hover:bg-accent/10 transition-colors cursor-pointer opacity-50" onClick={() => { setSelectedProject(project); setDetailTab('overview'); fetchCollaborators(project.id); }}>
                    <div className="w-48 shrink-0 px-4 py-3 border-r border-border flex items-center gap-2 min-h-[56px]">
                      <span className="text-sm">{project.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground truncate">{project.name}</p>
                        <p className="text-[10px] text-muted-foreground italic">No dates set</p>
                      </div>
                    </div>
                    <div className="flex-1 relative min-h-[56px]">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] text-muted-foreground">Set start & due dates to see timeline</span>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-8 h-1.5 rounded-full bg-emerald-500 opacity-80" /> Active</span>
          <span className="flex items-center gap-1.5"><span className="w-8 h-1.5 rounded-full bg-blue-500 opacity-80" /> Planning</span>
          <span className="flex items-center gap-1.5"><span className="w-8 h-1.5 rounded-full bg-amber-500 opacity-80" /> On Hold</span>
          <span className="flex items-center gap-1.5"><span className="w-px h-4 bg-red-500/60" /> Today</span>
        </div>
      </div>
    );
  };

  // ===== PROJECT CARD =====
  const renderProjectCard = (project: Project) => {
    const progress = getProjectProgress(project.id);
    const pts = getProjectTasks(project.id);
    const ms = getProjectMilestones(project.id);
    const daysLeft = getDaysRemaining(project.due_date);
    const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.active;
    const priorityCfg = PRIORITY_CONFIG[project.priority] || PRIORITY_CONFIG.medium;

    return (
      <div key={project.id} className="group relative bg-card border border-border rounded-xl p-4 hover:border-foreground/20 hover:shadow-hover transition-all cursor-pointer overflow-hidden" onClick={() => { setSelectedProject(project); setDetailTab('overview'); fetchCollaborators(project.id); }}>
        <div className="absolute top-0 left-0 w-full h-0.5" style={{ backgroundColor: project.color }} />
        <div className="flex items-start justify-between mb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-lg shrink-0">{project.icon}</div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold truncate text-foreground">{project.name}</h3>
              {project.client_name && (<p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5"><Users className="h-2.5 w-2.5" />{project.client_name}</p>)}
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={(e) => { e.stopPropagation(); toggleFavorite(project); }} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-accent">
              <Star className={`h-3.5 w-3.5 ${project.is_favorite ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(project); }}><Pencil className="h-3.5 w-3.5 mr-2" />Edit</DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toggleArchive(project); }}><Archive className="h-3.5 w-3.5 mr-2" />{project.is_archived ? 'Unarchive' : 'Archive'}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); deleteProject(project.id); }} className="text-destructive"><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {project.description && <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3">{project.description}</p>}

        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-medium text-muted-foreground">{progress}%</span>
            <span className="text-[10px] text-muted-foreground">{pts.filter(t => t.status === 'done').length}/{pts.length}</span>
          </div>
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: project.color }} />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dotClass}`} />
            <span className="text-[10px] text-muted-foreground">{statusCfg.label}</span>
            <span className="text-muted-foreground/30 mx-0.5">·</span>
            <span className={`h-1.5 w-1.5 rounded-full ${priorityCfg.dotClass}`} />
            <span className="text-[10px] text-muted-foreground">{priorityCfg.label}</span>
          </div>
          {daysLeft !== null && (
            <span className={`text-[10px] font-medium ${daysLeft < 0 ? 'text-red-500' : daysLeft <= 7 ? 'text-amber-500' : 'text-muted-foreground'}`}>
              {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Due today' : `${daysLeft}d`}
            </span>
          )}
        </div>
      </div>
    );
  };

  // ===== BOARD VIEW =====
  const renderBoardView = () => {
    const statuses = ['planning', 'active', 'on_hold', 'completed'];
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {statuses.map(status => {
          const statusProjects = filteredProjects.filter(p => p.status === status);
          const cfg = STATUS_CONFIG[status];
          return (
            <div key={status} className="bg-muted/20 border border-border/50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${cfg.dotClass}`} />
                  <span className="text-xs font-semibold text-foreground">{cfg.label}</span>
                </div>
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{statusProjects.length}</span>
              </div>
              <div className="space-y-2">{statusProjects.map(p => renderProjectCard(p))}</div>
            </div>
          );
        })}
      </div>
    );
  };

  // ===== ROLE SETTINGS DIALOG =====
  const renderRoleSettings = () => {
    if (!selectedProject) return null;
    const project = selectedProject;
    const availableTitles = getAvailableTitles(project);

    return (
      <Dialog open={showRoleSettings} onOpenChange={setShowRoleSettings}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto bg-card">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2"><Settings2 className="h-4 w-4" />Title & Role Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Title Mode */}
            <div>
              <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">How collaborators set their title</label>
              <Select value={project.title_mode} onValueChange={v => updateProjectTitleSettings({ title_mode: v })}>
                <SelectTrigger className="mt-1 h-9 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free_text">Free text — they type anything</SelectItem>
                  <SelectItem value="custom_list">Pick from your custom list</SelectItem>
                  <SelectItem value="industry_presets">Pick from industry standards</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Industry selector */}
            {project.title_mode === 'industry_presets' && (
              <div>
                <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Industry</label>
                <Select value={project.industry || 'General'} onValueChange={v => updateProjectTitleSettings({ industry: v })}>
                  <SelectTrigger className="mt-1 h-9 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(INDUSTRY_PRESETS).map(ind => <SelectItem key={ind} value={ind}>{ind}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(INDUSTRY_PRESETS[project.industry || 'General'] || []).map(t => (
                    <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Custom title list */}
            {project.title_mode === 'custom_list' && (
              <div>
                <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Custom titles</label>
                <div className="flex gap-2 mt-1">
                  <Input value={newCustomTitle} onChange={e => setNewCustomTitle(e.target.value)} placeholder="Add a title..." className="text-xs h-8 rounded-lg flex-1" onKeyDown={e => {
                    if (e.key === 'Enter' && newCustomTitle.trim()) {
                      const updated = [...(Array.isArray(project.custom_titles) ? project.custom_titles : []), newCustomTitle.trim()];
                      updateProjectTitleSettings({ custom_titles: updated });
                      setNewCustomTitle('');
                    }
                  }} />
                  <Button size="sm" className="h-8 text-xs" onClick={() => {
                    if (!newCustomTitle.trim()) return;
                    const updated = [...(Array.isArray(project.custom_titles) ? project.custom_titles : []), newCustomTitle.trim()];
                    updateProjectTitleSettings({ custom_titles: updated });
                    setNewCustomTitle('');
                  }}>Add</Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(Array.isArray(project.custom_titles) ? project.custom_titles : []).map((t, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] gap-1">
                      {t}
                      <button onClick={() => {
                        const updated = (project.custom_titles || []).filter((_, j) => j !== i);
                        updateProjectTitleSettings({ custom_titles: updated });
                      }} className="hover:text-destructive"><X className="h-2.5 w-2.5" /></button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleSettings(false)} className="rounded-lg">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // ===== DETAIL SHEET =====
  const renderProjectDetail = () => {
    if (!selectedProject) return null;
    const project = selectedProject;
    const pts = getProjectTasks(project.id);
    const ms = getProjectMilestones(project.id);
    const progress = getProjectProgress(project.id);
    const doneTasks = pts.filter(t => t.status === 'done').length;
    const doneMs = ms.filter(m => m.status === 'completed').length;
    const isOwner = project.user_id === user?.id;
    const availableTitles = getAvailableTitles(project);
    const allAssignees = [
      { id: user?.id || '', name: 'You (Owner)' },
      ...collaborators.map(c => ({ id: c.collaborator_id, name: c.profile?.display_name || 'Unknown' }))
    ];

    return (
      <Sheet open={!!selectedProject} onOpenChange={(open) => !open && setSelectedProject(null)}>
        <SheetContent className="w-full sm:w-[540px] sm:max-w-[540px] overflow-y-auto bg-card">
          <SheetHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-xl">{project.icon}</div>
              <div>
                <SheetTitle className="text-base">{project.name}</SheetTitle>
                {project.client_name && (<p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Users className="h-3 w-3" />{project.client_name}</p>)}
              </div>
            </div>
          </SheetHeader>

          <Tabs value={detailTab} onValueChange={setDetailTab} className="mt-4">
            <TabsList className="w-full bg-muted/50">
              <TabsTrigger value="overview" className="flex-1 text-xs">Overview</TabsTrigger>
              <TabsTrigger value="tasks" className="flex-1 text-xs">Tasks ({pts.length})</TabsTrigger>
              <TabsTrigger value="milestones" className="flex-1 text-xs">Milestones ({ms.length})</TabsTrigger>
              <TabsTrigger value="team" className="flex-1 text-xs">Team ({collaborators.length})</TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="space-y-4 mt-4">
              <div className="bg-muted/20 border border-border rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="font-medium">Progress</span>
                  <span className="text-muted-foreground font-mono">{progress}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: project.color }} />
                </div>
                <div className="grid grid-cols-3 gap-3 pt-1">
                  {[{ val: pts.length, label: 'Tasks' }, { val: doneTasks, label: 'Done' }, { val: `${doneMs}/${ms.length}`, label: 'Milestones' }].map(s => (
                    <div key={s.label} className="text-center">
                      <p className="text-lg font-bold text-foreground">{s.val}</p>
                      <p className="text-[10px] text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {project.description && (<div><label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Description</label><p className="text-sm mt-1 text-foreground">{project.description}</p></div>)}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/20 rounded-lg p-2.5">
                    <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Status</label>
                    <div className="flex items-center gap-1.5 mt-1"><span className={`h-2 w-2 rounded-full ${STATUS_CONFIG[project.status]?.dotClass}`} /><span className="text-xs font-medium">{STATUS_CONFIG[project.status]?.label}</span></div>
                  </div>
                  <div className="bg-muted/20 rounded-lg p-2.5">
                    <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Priority</label>
                    <div className="flex items-center gap-1.5 mt-1"><span className={`h-2 w-2 rounded-full ${PRIORITY_CONFIG[project.priority]?.dotClass}`} /><span className="text-xs font-medium">{PRIORITY_CONFIG[project.priority]?.label}</span></div>
                  </div>
                  {project.start_date && (<div className="bg-muted/20 rounded-lg p-2.5"><label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Start</label><p className="text-xs font-medium mt-1">{format(parseISO(project.start_date), 'MMM d, yyyy')}</p></div>)}
                  {project.due_date && (<div className="bg-muted/20 rounded-lg p-2.5"><label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Deadline</label><p className="text-xs font-medium mt-1">{format(parseISO(project.due_date), 'MMM d, yyyy')}</p></div>)}
                  {project.budget != null && (<div className="bg-muted/20 rounded-lg p-2.5"><label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Budget</label><p className="text-xs font-medium mt-1 flex items-center gap-1"><DollarSign className="h-3 w-3" />{project.budget.toLocaleString()}</p></div>)}
                </div>
                {project.tags?.length > 0 && (<div className="flex flex-wrap gap-1.5">{project.tags.map(tag => (<span key={tag} className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{tag}</span>))}</div>)}
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => openEdit(project)}><Pencil className="h-3.5 w-3.5 mr-1.5" />Edit</Button>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => toggleArchive(project)}><Archive className="h-3.5 w-3.5" /></Button>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => toggleFavorite(project)}><Star className={`h-3.5 w-3.5 ${project.is_favorite ? 'fill-amber-400 text-amber-400' : ''}`} /></Button>
              </div>
            </TabsContent>

            {/* Tasks */}
            <TabsContent value="tasks" className="mt-4 space-y-3">
              <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => { setShowTaskForm(true); setTaskForm({ name: '', priority: 'medium', due_date: '', assigned_to: '' }); }}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />Add Task
              </Button>
              {showTaskForm && (
                <div className="border border-border rounded-xl p-3 space-y-2 bg-muted/20">
                  <Input value={taskForm.name} onChange={e => setTaskForm(f => ({ ...f, name: e.target.value }))} placeholder="Task name..." className="text-sm h-8" autoFocus />
                  <div className="flex gap-2">
                    <Select value={taskForm.priority} onValueChange={v => setTaskForm(f => ({ ...f, priority: v }))}>
                      <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(PRIORITY_CONFIG).map(([k, c]) => <SelectItem key={k} value={k}>{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input type="date" value={taskForm.due_date} onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))} className="text-xs h-8 flex-1" />
                  </div>
                  {/* Assign to */}
                  {allAssignees.length > 1 && (
                    <div>
                      <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Assign to</label>
                      <Select value={taskForm.assigned_to || 'unassigned'} onValueChange={v => setTaskForm(f => ({ ...f, assigned_to: v === 'unassigned' ? '' : v }))}>
                        <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {allAssignees.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs" onClick={addProjectTask} disabled={!taskForm.name.trim()}>Add</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowTaskForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}
              <div className="space-y-1">
                {pts.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No tasks yet</p>
                ) : pts.map(task => (
                  <div key={task.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 group transition-colors">
                    <Checkbox checked={task.status === 'done'} onCheckedChange={() => toggleProjectTask(task)} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs truncate ${task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_CONFIG[task.priority]?.dotClass}`} />
                        <span className="text-[9px] text-muted-foreground">{format(parseISO(task.due_date), 'MMM d')}</span>
                        {task.assigned_to && (
                          <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                            <Users className="h-2 w-2" />{getAssigneeName(task.assigned_to)}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Quick assign dropdown */}
                    {isOwner && allAssignees.length > 1 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100">
                            <UserPlus className="h-2.5 w-2.5 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => assignTask(task.id, null)} className="text-xs">Unassign</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {allAssignees.map(a => (
                            <DropdownMenuItem key={a.id} onClick={() => assignTask(task.id, a.id)} className="text-xs">
                              {a.name} {task.assigned_to === a.id && <CheckCircle2 className="h-3 w-3 ml-auto text-emerald-500" />}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100" onClick={() => deleteProjectTask(task.id)}>
                      <Trash2 className="h-2.5 w-2.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Milestones */}
            <TabsContent value="milestones" className="mt-4 space-y-3">
              <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => { setShowMilestoneForm(true); setMilestoneForm({ title: '', description: '', due_date: '' }); }}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />Add Milestone
              </Button>
              {showMilestoneForm && (
                <div className="border border-border rounded-xl p-3 space-y-2 bg-muted/20">
                  <Input value={milestoneForm.title} onChange={e => setMilestoneForm(f => ({ ...f, title: e.target.value }))} placeholder="Milestone title..." className="text-sm h-8" autoFocus />
                  <Textarea value={milestoneForm.description} onChange={e => setMilestoneForm(f => ({ ...f, description: e.target.value }))} placeholder="Description (optional)" className="text-xs min-h-[60px]" />
                  <Input type="date" value={milestoneForm.due_date} onChange={e => setMilestoneForm(f => ({ ...f, due_date: e.target.value }))} className="text-xs h-8" />
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs" onClick={addMilestone} disabled={!milestoneForm.title.trim()}>Add</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowMilestoneForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {ms.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No milestones yet</p>
                ) : ms.map(milestone => (
                  <div key={milestone.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/20 border border-border/40 hover:border-border transition-colors group">
                    <button onClick={() => toggleMilestone(milestone)} className="shrink-0">
                      {milestone.status === 'completed' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Target className="h-4 w-4 text-muted-foreground" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${milestone.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{milestone.title}</p>
                      {milestone.description && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{milestone.description}</p>}
                      {milestone.due_date && <span className="text-[9px] text-muted-foreground">{format(parseISO(milestone.due_date), 'MMM d, yyyy')}</span>}
                    </div>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100" onClick={() => deleteMilestone(milestone.id)}>
                      <Trash2 className="h-2.5 w-2.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Team */}
            <TabsContent value="team" className="mt-4 space-y-4">
              {/* Role Settings button (owner only) */}
              {isOwner && (
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setShowRoleSettings(true)}>
                  <Settings2 className="h-3.5 w-3.5 mr-1.5" />Title & Role Settings
                </Button>
              )}

              {/* Owner card */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/40">
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-8 w-8"><AvatarFallback className="text-xs bg-primary/20 text-primary"><Crown className="h-3.5 w-3.5" /></AvatarFallback></Avatar>
                  <div>
                    <p className="text-sm font-medium">You (Owner)</p>
                    <p className="text-[10px] text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Owner</Badge>
              </div>

              {loadingCollabs ? (
                <div className="flex items-center justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
              ) : (
                <>
                  {/* Collaborators list */}
                  {collaborators.length > 0 && (
                    <div className="space-y-1">
                      <h4 className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">Collaborators</h4>
                      {collaborators.sort((a, b) => (b.hierarchy_level || 0) - (a.hierarchy_level || 0)).map(c => (
                        <div key={c.id} className="rounded-xl bg-muted/10 border border-border/30 hover:border-border transition-colors">
                          <div className="flex items-center justify-between p-2.5">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{getInitials(c.profile?.display_name)}</AvatarFallback></Avatar>
                              <div>
                                <p className="text-sm font-medium">{c.profile?.display_name || 'Unknown'}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {c.title && <Badge variant="secondary" className="text-[9px] h-4">{c.title}</Badge>}
                                  <span className="text-[10px] text-muted-foreground capitalize">{c.role}</span>
                                  {c.can_assign_tasks && (
                                    <Badge variant="outline" className="text-[9px] h-4 gap-0.5"><Shield className="h-2 w-2" />Can assign</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            {isOwner && (
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => {
                                  setEditingCollabId(c.id);
                                  setEditCollabForm({ title: c.title || '', role: c.role, can_assign_tasks: c.can_assign_tasks, hierarchy_level: c.hierarchy_level || 0 });
                                }}>
                                  <Pencil className="h-3 w-3 text-muted-foreground" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => removeCollaborator(c.id)}>
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Inline edit form */}
                          {editingCollabId === c.id && (
                            <div className="border-t border-border/30 p-3 space-y-3">
                              {/* Title */}
                              <div>
                                <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Title / Position</label>
                                {project.title_mode === 'free_text' ? (
                                  <Input value={editCollabForm.title} onChange={e => setEditCollabForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Lead Designer" className="text-xs h-8 mt-1" />
                                ) : (
                                  <Select value={editCollabForm.title || ''} onValueChange={v => setEditCollabForm(f => ({ ...f, title: v }))}>
                                    <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Select title..." /></SelectTrigger>
                                    <SelectContent>
                                      {availableTitles.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>

                              {/* Role */}
                              <div>
                                <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Role</label>
                                <Select value={editCollabForm.role} onValueChange={v => setEditCollabForm(f => ({ ...f, role: v }))}>
                                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="viewer">Viewer — read only</SelectItem>
                                    <SelectItem value="member">Member — can work on tasks</SelectItem>
                                    <SelectItem value="editor">Editor — can edit project</SelectItem>
                                    <SelectItem value="admin">Admin — full access</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Permissions */}
                              <div className="flex items-center justify-between">
                                <div>
                                  <Label className="text-xs">Can assign tasks</Label>
                                  <p className="text-[10px] text-muted-foreground">Allow this person to assign tasks to others</p>
                                </div>
                                <Switch checked={editCollabForm.can_assign_tasks} onCheckedChange={v => setEditCollabForm(f => ({ ...f, can_assign_tasks: v }))} />
                              </div>

                              {/* Hierarchy level */}
                              <div>
                                <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Hierarchy Level</label>
                                <p className="text-[10px] text-muted-foreground mb-1">Higher number = higher authority (0 = base level)</p>
                                <Input type="number" min={0} max={10} value={editCollabForm.hierarchy_level} onChange={e => setEditCollabForm(f => ({ ...f, hierarchy_level: parseInt(e.target.value) || 0 }))} className="text-xs h-8 w-20" />
                              </div>

                              {/* Save/Cancel */}
                              <div className="flex gap-2">
                                <Button size="sm" className="h-7 text-xs" onClick={() => updateCollaborator(c.id, { title: editCollabForm.title || null, role: editCollabForm.role, can_assign_tasks: editCollabForm.can_assign_tasks, hierarchy_level: editCollabForm.hierarchy_level })}>Save</Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingCollabId(null)}>Cancel</Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add from friends */}
                  {friends.length > 0 && (
                    <div>
                      <h4 className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">Add from friends</h4>
                      <ScrollArea className="max-h-40">
                        {friends.map(f => (
                          <div key={f.user_id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/20 transition-colors">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{getInitials(f.display_name)}</AvatarFallback></Avatar>
                              <p className="text-sm font-medium">{f.display_name || 'Unknown'}</p>
                            </div>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => addCollaborator(f.user_id)} disabled={addingCollab}>
                              {addingCollab ? <Loader2 className="h-3 w-3 animate-spin" /> : <><UserPlus className="h-3 w-3 mr-1" />Add</>}
                            </Button>
                          </div>
                        ))}
                      </ScrollArea>
                    </div>
                  )}

                  {collaborators.length === 0 && friends.length === 0 && (
                    <div className="text-center py-8">
                      <Users className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Add friends first to invite collaborators</p>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    );
  };

  // ===== LOADING =====
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ===== MAIN RENDER =====
  return (
    <>
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FolderKanban className="h-5 w-5" />
              Projects
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {stats.total} project{stats.total !== 1 ? 's' : ''} · {stats.active} active
              {stats.overdue > 0 && <span className="text-red-500 ml-1">· {stats.overdue} overdue</span>}
            </p>
          </div>
          <Button size="sm" onClick={openCreate} className="rounded-lg">
            <Plus className="h-3.5 w-3.5 mr-1.5" />New Project
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Total', value: stats.total, dotClass: 'bg-foreground' },
            { label: 'Active', value: stats.active, dotClass: 'bg-emerald-500' },
            { label: 'Completed', value: stats.completed, dotClass: 'bg-sky-400' },
            { label: 'Overdue', value: stats.overdue, dotClass: 'bg-red-500' },
          ].map(stat => (
            <div key={stat.label} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
              <span className={`h-2.5 w-2.5 rounded-full ${stat.dotClass}`} />
              <div>
                <p className="text-lg font-bold text-foreground leading-none">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search projects..." className="pl-8 h-8 text-xs rounded-lg" />
          </div>
          <div className="flex gap-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 text-xs w-32 rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([k, c]) => <SelectItem key={k} value={k}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex border border-border rounded-lg overflow-hidden">
              {([
                { mode: 'grid' as const, icon: BarChart3, label: 'Grid' },
                { mode: 'list' as const, icon: ListTodo, label: 'List' },
                { mode: 'board' as const, icon: Columns3, label: 'Board' },
                { mode: 'timeline' as const, icon: CalendarRange, label: 'Timeline' },
              ]).map(({ mode, icon: Icon }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`h-8 w-8 flex items-center justify-center transition-colors ${viewMode === mode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg" onClick={() => setShowArchived(v => !v)}>
              <Archive className="h-3.5 w-3.5 mr-1" />{showArchived ? 'Active' : 'Archived'}
            </Button>
          </div>
        </div>

        {/* Content */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-16">
            <FolderKanban className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {showArchived ? 'No archived projects' : searchQuery ? 'No matching projects' : 'No projects yet'}
            </p>
            {!showArchived && !searchQuery && (
              <Button variant="outline" size="sm" className="mt-3 rounded-lg" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />Create your first project
              </Button>
            )}
          </div>
        ) : viewMode === 'timeline' ? (
          renderTimeline()
        ) : viewMode === 'board' ? (
          renderBoardView()
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3' : 'space-y-2'}>
            {filteredProjects.map(renderProjectCard)}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-card">
          <DialogHeader>
            <DialogTitle className="text-base">{editingProject ? 'Edit Project' : 'New Project'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="shrink-0">
                <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Icon</label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-10 w-10 text-lg mt-1 rounded-lg">{projectForm.icon}</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="grid grid-cols-6 gap-1 p-2 w-auto">
                    {PROJECT_ICONS.map(icon => (
                      <button key={icon} onClick={() => setProjectForm(f => ({ ...f, icon }))} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-accent text-lg">{icon}</button>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex-1">
                <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Name *</label>
                <Input value={projectForm.name} onChange={e => setProjectForm(f => ({ ...f, name: e.target.value }))} className="mt-1 rounded-lg" placeholder="My Project" />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Description</label>
              <Textarea value={projectForm.description} onChange={e => setProjectForm(f => ({ ...f, description: e.target.value }))} className="mt-1 min-h-[60px] text-sm rounded-lg" placeholder="What is this project about?" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Status</label>
                <Select value={projectForm.status} onValueChange={v => setProjectForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="mt-1 h-9 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(STATUS_CONFIG).map(([k, c]) => <SelectItem key={k} value={k}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Priority</label>
                <Select value={projectForm.priority} onValueChange={v => setProjectForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger className="mt-1 h-9 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(PRIORITY_CONFIG).map(([k, c]) => <SelectItem key={k} value={k}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Start Date</label>
                <Input type="date" value={projectForm.start_date} onChange={e => setProjectForm(f => ({ ...f, start_date: e.target.value }))} className="mt-1 text-xs rounded-lg" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Due Date</label>
                <Input type="date" value={projectForm.due_date} onChange={e => setProjectForm(f => ({ ...f, due_date: e.target.value }))} className="mt-1 text-xs rounded-lg" />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Color</label>
              <div className="flex gap-2 mt-1.5">
                {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#64748b', '#ec4899', '#06b6d4', '#f97316'].map(c => (
                  <button key={c} onClick={() => setProjectForm(f => ({ ...f, color: c }))} className={`h-6 w-6 rounded-full border-2 transition-all ${projectForm.color === c ? 'border-foreground scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Client</label>
                <Input value={projectForm.client_name} onChange={e => setProjectForm(f => ({ ...f, client_name: e.target.value }))} className="mt-1 text-xs rounded-lg" placeholder="Client name" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Email</label>
                <Input value={projectForm.client_email} onChange={e => setProjectForm(f => ({ ...f, client_email: e.target.value }))} className="mt-1 text-xs rounded-lg" placeholder="client@email.com" />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Budget</label>
              <Input type="number" value={projectForm.budget} onChange={e => setProjectForm(f => ({ ...f, budget: e.target.value }))} className="mt-1 text-xs rounded-lg" placeholder="0.00" />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Tags (comma separated)</label>
              <Input value={projectForm.tags} onChange={e => setProjectForm(f => ({ ...f, tags: e.target.value }))} className="mt-1 text-xs rounded-lg" placeholder="design, web, client-work" />
            </div>

            {/* Title mode settings */}
            <div className="border-t border-border pt-4">
              <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />Team Title Settings</h4>
              <div>
                <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Title mode</label>
                <Select value={projectForm.title_mode} onValueChange={v => setProjectForm(f => ({ ...f, title_mode: v }))}>
                  <SelectTrigger className="mt-1 h-9 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free_text">Free text</SelectItem>
                    <SelectItem value="custom_list">Custom list</SelectItem>
                    <SelectItem value="industry_presets">Industry presets</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {projectForm.title_mode === 'custom_list' && (
                <div className="mt-2">
                  <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Titles (comma separated)</label>
                  <Input value={projectForm.custom_titles} onChange={e => setProjectForm(f => ({ ...f, custom_titles: e.target.value }))} className="mt-1 text-xs rounded-lg" placeholder="Director, Lead Designer, Developer" />
                </div>
              )}
              {projectForm.title_mode === 'industry_presets' && (
                <div className="mt-2">
                  <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Industry</label>
                  <Select value={projectForm.industry || 'General'} onValueChange={v => setProjectForm(f => ({ ...f, industry: v }))}>
                    <SelectTrigger className="mt-1 h-9 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(INDUSTRY_PRESETS).map(ind => <SelectItem key={ind} value={ind}>{ind}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="rounded-lg">Cancel</Button>
            <Button onClick={saveProject} disabled={!projectForm.name.trim()} className="rounded-lg">{editingProject ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {renderProjectDetail()}
      {renderRoleSettings()}
    </>
  );
}
