import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter
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
  CalendarIcon, Clock, Users, DollarSign, Target, ChevronRight,
  ChevronDown, MoreHorizontal, CheckCircle2, Circle, AlertCircle,
  BarChart3, ListTodo, Columns3, GripVertical, Flag, MapPin,
  Mail, Tag, UserPlus, Crown, Loader2
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format, parseISO, differenceInDays, isAfter, isBefore, isToday } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProjectCollaborator {
  id: string;
  project_id: string;
  owner_id: string;
  collaborator_id: string;
  role: string;
  status: string;
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
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Circle }> = {
  active: { label: 'Active', color: 'text-emerald-500', icon: Circle },
  planning: { label: 'Planning', color: 'text-blue-500', icon: Circle },
  on_hold: { label: 'On Hold', color: 'text-amber-500', icon: AlertCircle },
  completed: { label: 'Completed', color: 'text-primary', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'text-destructive', icon: AlertCircle },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: 'text-muted-foreground' },
  medium: { label: 'Medium', color: 'text-amber-500' },
  high: { label: 'High', color: 'text-orange-500' },
  urgent: { label: 'Urgent', color: 'text-destructive' },
};

const PROJECT_ICONS = ['📁', '🚀', '💼', '🎯', '📊', '🏗️', '💡', '🎨', '📱', '🌐', '🔧', '📝'];

export function ProjectManager() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'board'>('grid');
  const [showArchived, setShowArchived] = useState(false);

  // Create/Edit project
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectForm, setProjectForm] = useState({
    name: '', description: '', status: 'active', priority: 'medium',
    color: '#3b82f6', icon: '📁', start_date: '', due_date: '',
    budget: '', client_name: '', client_email: '', tags: '',
  });

  // Project detail sheet
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [detailTab, setDetailTab] = useState('overview');

  // Milestone form
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({ title: '', description: '', due_date: '' });

  // Task form for project
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ name: '', priority: 'medium', due_date: '' });

  // Collaborators
  const [collaborators, setCollaborators] = useState<ProjectCollaborator[]>([]);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [loadingCollabs, setLoadingCollabs] = useState(false);
  const [addingCollab, setAddingCollab] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const [projectsRes, milestonesRes, tasksRes] = await Promise.all([
      supabase.from('projects').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
      supabase.from('project_milestones').select('*').eq('user_id', user.id).order('sort_order'),
      supabase.from('project_tasks').select('*').eq('user_id', user.id).not('project_id', 'is', null).order('created_at'),
    ]);
    if (!projectsRes.error) setProjects(projectsRes.data as Project[] || []);
    if (!milestonesRes.error) setMilestones(milestonesRes.data as Milestone[] || []);
    if (!tasksRes.error) setTasks(tasksRes.data as Task[] || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchCollaborators = useCallback(async (projectId: string) => {
    if (!user) return;
    setLoadingCollabs(true);
    try {
      const { data: collabs } = await supabase
        .from('project_collaborators')
        .select('*')
        .eq('project_id', projectId);

      const collabIds = (collabs || []).map(c => c.collaborator_id);
      let profiles: any[] = [];
      if (collabIds.length > 0) {
        const { data: p } = await supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', collabIds);
        profiles = p || [];
      }

      setCollaborators((collabs || []).map(c => ({
        ...c,
        profile: profiles.find(p => p.user_id === c.collaborator_id) || null,
      })) as ProjectCollaborator[]);

      // Fetch friends list
      const { data: friendships } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

      const friendIds = (friendships || []).map(f => f.user_id_1 === user.id ? f.user_id_2 : f.user_id_1)
        .filter(id => !collabIds.includes(id));

      if (friendIds.length > 0) {
        const { data: friendProfiles } = await supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', friendIds);
        setFriends((friendProfiles || []) as FriendProfile[]);
      } else {
        setFriends([]);
      }
    } catch (e) {
      console.error('Failed to fetch collaborators', e);
    } finally {
      setLoadingCollabs(false);
    }
  }, [user]);

  const addCollaborator = async (friendId: string) => {
    if (!user || !selectedProject) return;
    setAddingCollab(true);
    try {
      const { error } = await supabase.from('project_collaborators').insert({
        project_id: selectedProject.id,
        owner_id: user.id,
        collaborator_id: friendId,
        role: 'member',
        status: 'accepted',
      });
      if (error) throw error;
      toast.success('Collaborator added');
      fetchCollaborators(selectedProject.id);
    } catch (e: any) {
      toast.error(e.message || 'Failed to add collaborator');
    } finally {
      setAddingCollab(false);
    }
  };

  const removeCollaborator = async (id: string) => {
    if (!selectedProject) return;
    const { error } = await supabase.from('project_collaborators').delete().eq('id', id);
    if (error) { toast.error('Failed to remove'); return; }
    toast.success('Collaborator removed');
    fetchCollaborators(selectedProject.id);
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
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.client_name?.toLowerCase().includes(q) ||
        p.tags?.some(t => t.toLowerCase().includes(q))
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
    setProjectForm({
      name: '', description: '', status: 'active', priority: 'medium',
      color: '#3b82f6', icon: '📁', start_date: '', due_date: '',
      budget: '', client_name: '', client_email: '', tags: '',
    });
    setEditingProject(null);
  };

  const openCreate = () => { resetProjectForm(); setShowCreateDialog(true); };

  const openEdit = (project: Project) => {
    setEditingProject(project);
    setProjectForm({
      name: project.name,
      description: project.description || '',
      status: project.status,
      priority: project.priority,
      color: project.color || '#3b82f6',
      icon: project.icon || '📁',
      start_date: project.start_date || '',
      due_date: project.due_date || '',
      budget: project.budget?.toString() || '',
      client_name: project.client_name || '',
      client_email: project.client_email || '',
      tags: project.tags?.join(', ') || '',
    });
    setShowCreateDialog(true);
  };

  const saveProject = async () => {
    if (!user || !projectForm.name.trim()) return;
    const data = {
      user_id: user.id,
      name: projectForm.name.trim(),
      description: projectForm.description || null,
      status: projectForm.status,
      priority: projectForm.priority,
      color: projectForm.color,
      icon: projectForm.icon,
      start_date: projectForm.start_date || null,
      due_date: projectForm.due_date || null,
      budget: projectForm.budget ? parseFloat(projectForm.budget) : null,
      client_name: projectForm.client_name || null,
      client_email: projectForm.client_email || null,
      tags: projectForm.tags ? projectForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    };

    if (editingProject) {
      const { error } = await supabase.from('projects').update(data).eq('id', editingProject.id);
      if (error) { toast.error('Failed to update project'); return; }
      toast.success('Project updated');
    } else {
      const { error } = await supabase.from('projects').insert(data);
      if (error) { toast.error('Failed to create project'); return; }
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
    const { error } = await supabase.from('project_milestones').insert({
      project_id: selectedProject.id,
      user_id: user.id,
      title: milestoneForm.title.trim(),
      description: milestoneForm.description || null,
      due_date: milestoneForm.due_date || null,
      sort_order: getProjectMilestones(selectedProject.id).length,
    });
    if (error) { toast.error('Failed to add milestone'); return; }
    setMilestoneForm({ title: '', description: '', due_date: '' });
    setShowMilestoneForm(false);
    toast.success('Milestone added');
    fetchData();
  };

  const toggleMilestone = async (milestone: Milestone) => {
    const newStatus = milestone.status === 'completed' ? 'pending' : 'completed';
    await supabase.from('project_milestones').update({ status: newStatus }).eq('id', milestone.id);
    fetchData();
  };

  const deleteMilestone = async (id: string) => {
    await supabase.from('project_milestones').delete().eq('id', id);
    fetchData();
  };

  const addProjectTask = async () => {
    if (!user || !selectedProject || !taskForm.name.trim()) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const { error } = await supabase.from('project_tasks').insert({
      user_id: user.id,
      name: taskForm.name.trim(),
      priority: taskForm.priority,
      status: 'todo',
      due_date: taskForm.due_date || today,
      project_id: selectedProject.id,
    });
    if (error) { toast.error('Failed to add task'); return; }
    setTaskForm({ name: '', priority: 'medium', due_date: '' });
    setShowTaskForm(false);
    toast.success('Task added');
    fetchData();
  };

  const toggleProjectTask = async (task: Task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    await supabase.from('project_tasks').update({ status: newStatus }).eq('id', task.id);
    fetchData();
  };

  const deleteProjectTask = async (id: string) => {
    await supabase.from('project_tasks').delete().eq('id', id);
    fetchData();
  };

  // Stats
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
    const days = differenceInDays(parseISO(dueDate), new Date());
    return days;
  };

  const renderProjectCard = (project: Project) => {
    const progress = getProjectProgress(project.id);
    const pts = getProjectTasks(project.id);
    const ms = getProjectMilestones(project.id);
    const daysLeft = getDaysRemaining(project.due_date);
    const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.active;
    const priorityCfg = PRIORITY_CONFIG[project.priority] || PRIORITY_CONFIG.medium;

    return (
      <div
        key={project.id}
        className="group relative bg-card border border-border/60 rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer"
        onClick={() => { setSelectedProject(project); setDetailTab('overview'); fetchCollaborators(project.id); }}
      >
        {/* Top row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg shrink-0">{project.icon}</span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold truncate text-foreground">{project.name}</h3>
              {project.client_name && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Users className="h-2.5 w-2.5" />{project.client_name}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={(e) => { e.stopPropagation(); toggleFavorite(project); }} className="opacity-0 group-hover:opacity-100 transition-opacity">
              <Star className={`h-3.5 w-3.5 ${project.is_favorite ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(project); }}>
                  <Pencil className="h-3.5 w-3.5 mr-2" />Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toggleArchive(project); }}>
                  <Archive className="h-3.5 w-3.5 mr-2" />{project.is_archived ? 'Unarchive' : 'Archive'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); deleteProject(project.id); }} className="text-destructive">
                  <Trash2 className="h-3.5 w-3.5 mr-2" />Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Description */}
        {project.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{project.description}</p>
        )}

        {/* Progress */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground">{progress}% complete</span>
            <span className="text-[10px] text-muted-foreground">{pts.filter(t => t.status === 'done').length}/{pts.length} tasks</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* Bottom row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${statusCfg.color}`}>
              {statusCfg.label}
            </Badge>
            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${priorityCfg.color}`}>
              {priorityCfg.label}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {ms.length > 0 && (
              <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                <Target className="h-2.5 w-2.5" />{ms.filter(m => m.status === 'completed').length}/{ms.length}
              </span>
            )}
            {daysLeft !== null && (
              <span className={`text-[9px] flex items-center gap-0.5 ${daysLeft < 0 ? 'text-destructive' : daysLeft <= 7 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                <Clock className="h-2.5 w-2.5" />
                {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
              </span>
            )}
          </div>
        </div>

        {/* Tags */}
        {project.tags && project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {project.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[9px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">{tag}</span>
            ))}
            {project.tags.length > 3 && <span className="text-[9px] text-muted-foreground">+{project.tags.length - 3}</span>}
          </div>
        )}

        {/* Color strip */}
        <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl" style={{ backgroundColor: project.color }} />
      </div>
    );
  };

  const renderBoardView = () => {
    const statuses = ['planning', 'active', 'on_hold', 'completed'];
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statuses.map(status => {
          const statusProjects = filteredProjects.filter(p => p.status === status);
          const cfg = STATUS_CONFIG[status];
          return (
            <div key={status} className="bg-muted/30 rounded-xl p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${cfg.color.replace('text-', 'bg-')}`} />
                  <span className="text-xs font-semibold">{cfg.label}</span>
                </div>
                <Badge variant="secondary" className="text-[10px] h-5">{statusProjects.length}</Badge>
              </div>
              <div className="space-y-2">
                {statusProjects.map(p => renderProjectCard(p))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderProjectDetail = () => {
    if (!selectedProject) return null;
    const project = selectedProject;
    const pts = getProjectTasks(project.id);
    const ms = getProjectMilestones(project.id);
    const progress = getProjectProgress(project.id);
    const doneTasks = pts.filter(t => t.status === 'done').length;
    const doneMs = ms.filter(m => m.status === 'completed').length;

    return (
      <Sheet open={!!selectedProject} onOpenChange={(open) => !open && setSelectedProject(null)}>
        <SheetContent className="w-full sm:w-[540px] sm:max-w-[540px] overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{project.icon}</span>
              <div>
                <SheetTitle className="text-base">{project.name}</SheetTitle>
                {project.client_name && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Users className="h-3 w-3" />{project.client_name}
                    {project.client_email && <span className="text-muted-foreground/60">· {project.client_email}</span>}
                  </p>
                )}
              </div>
            </div>
          </SheetHeader>

          <Tabs value={detailTab} onValueChange={setDetailTab} className="mt-4">
            <TabsList className="w-full">
              <TabsTrigger value="overview" className="flex-1 text-xs">Overview</TabsTrigger>
              <TabsTrigger value="tasks" className="flex-1 text-xs">Tasks ({pts.length})</TabsTrigger>
              <TabsTrigger value="milestones" className="flex-1 text-xs">Milestones ({ms.length})</TabsTrigger>
              <TabsTrigger value="team" className="flex-1 text-xs">Team ({collaborators.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              {/* Progress */}
              <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-medium">Progress</span>
                  <span className="text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-foreground">{pts.length}</p>
                    <p className="text-[10px] text-muted-foreground">Tasks</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">{doneTasks}</p>
                    <p className="text-[10px] text-muted-foreground">Completed</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">{doneMs}/{ms.length}</p>
                    <p className="text-[10px] text-muted-foreground">Milestones</p>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3">
                {project.description && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Description</label>
                    <p className="text-sm mt-1">{project.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Status</label>
                    <p className={`text-sm mt-0.5 ${STATUS_CONFIG[project.status]?.color}`}>
                      {STATUS_CONFIG[project.status]?.label}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Priority</label>
                    <p className={`text-sm mt-0.5 ${PRIORITY_CONFIG[project.priority]?.color}`}>
                      {PRIORITY_CONFIG[project.priority]?.label}
                    </p>
                  </div>
                  {project.start_date && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Start Date</label>
                      <p className="text-sm mt-0.5">{format(parseISO(project.start_date), 'MMM d, yyyy')}</p>
                    </div>
                  )}
                  {project.due_date && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Due Date</label>
                      <p className="text-sm mt-0.5">{format(parseISO(project.due_date), 'MMM d, yyyy')}</p>
                    </div>
                  )}
                  {project.budget != null && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Budget</label>
                      <p className="text-sm mt-0.5 flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />{project.budget.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                {project.tags && project.tags.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Tags</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {project.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(project)}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => toggleArchive(project)}>
                  <Archive className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => toggleFavorite(project)}>
                  <Star className={`h-3.5 w-3.5 ${project.is_favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="tasks" className="mt-4 space-y-3">
              <Button variant="outline" size="sm" className="w-full" onClick={() => { setShowTaskForm(true); setTaskForm({ name: '', priority: 'medium', due_date: '' }); }}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />Add Task
              </Button>

              {showTaskForm && (
                <div className="border border-border rounded-lg p-3 space-y-2">
                  <Input value={taskForm.name} onChange={e => setTaskForm(f => ({ ...f, name: e.target.value }))} placeholder="Task name..." className="text-sm h-8" autoFocus />
                  <div className="flex gap-2">
                    <Select value={taskForm.priority} onValueChange={v => setTaskForm(f => ({ ...f, priority: v }))}>
                      <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="date" value={taskForm.due_date} onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))} className="text-xs h-8 flex-1" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs" onClick={addProjectTask} disabled={!taskForm.name.trim()}>Add</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowTaskForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                {pts.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No tasks yet</p>
                ) : pts.map(task => (
                  <div key={task.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 group">
                    <Checkbox checked={task.status === 'done'} onCheckedChange={() => toggleProjectTask(task)} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs truncate ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>{task.name}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] capitalize ${PRIORITY_CONFIG[task.priority]?.color}`}>{task.priority}</span>
                        <span className="text-[9px] text-muted-foreground">{format(parseISO(task.due_date), 'MMM d')}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100" onClick={() => deleteProjectTask(task.id)}>
                      <Trash2 className="h-2.5 w-2.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="milestones" className="mt-4 space-y-3">
              <Button variant="outline" size="sm" className="w-full" onClick={() => { setShowMilestoneForm(true); setMilestoneForm({ title: '', description: '', due_date: '' }); }}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />Add Milestone
              </Button>

              {showMilestoneForm && (
                <div className="border border-border rounded-lg p-3 space-y-2">
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
                  <p className="text-xs text-muted-foreground text-center py-4">No milestones yet</p>
                ) : ms.map(milestone => (
                  <div key={milestone.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 border border-border/40 group">
                    <button onClick={() => toggleMilestone(milestone)} className="shrink-0">
                      {milestone.status === 'completed'
                        ? <CheckCircle2 className="h-4 w-4 text-primary" />
                        : <Target className="h-4 w-4 text-muted-foreground" />
                      }
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${milestone.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{milestone.title}</p>
                      {milestone.description && <p className="text-[10px] text-muted-foreground truncate">{milestone.description}</p>}
                      {milestone.due_date && (
                        <span className="text-[9px] text-muted-foreground">{format(parseISO(milestone.due_date), 'MMM d, yyyy')}</span>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100" onClick={() => deleteMilestone(milestone.id)}>
                      <Trash2 className="h-2.5 w-2.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="team" className="mt-4 space-y-4">
              {/* Owner */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-primary/20 text-primary">
                      <Crown className="h-3.5 w-3.5" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">You (Owner)</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                <Badge className="bg-primary/10 text-primary border-primary/20">Owner</Badge>
              </div>

              {/* Current collaborators */}
              {loadingCollabs ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {collaborators.length > 0 && (
                    <div className="space-y-1">
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">Collaborators</h4>
                      {collaborators.map(collab => (
                        <div key={collab.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors group">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">{getInitials(collab.profile?.display_name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{collab.profile?.display_name || 'Unknown'}</p>
                              <Badge variant="outline" className="text-[9px] capitalize">{collab.role}</Badge>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
                            onClick={() => removeCollaborator(collab.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Friends to add */}
                  {friends.length > 0 && (
                    <div className="space-y-1">
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">Add from Friends</h4>
                      <ScrollArea className="max-h-[200px]">
                        {friends.map(friend => (
                          <div key={friend.user_id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">{getInitials(friend.display_name)}</AvatarFallback>
                              </Avatar>
                              <p className="text-sm font-medium">{friend.display_name || 'Unknown'}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => addCollaborator(friend.user_id)}
                              disabled={addingCollab}
                            >
                              {addingCollab ? <Loader2 className="h-3 w-3 animate-spin" /> : <><UserPlus className="h-3 w-3 mr-1" />Add</>}
                            </Button>
                          </div>
                        ))}
                      </ScrollArea>
                    </div>
                  )}

                  {collaborators.length === 0 && friends.length === 0 && (
                    <div className="text-center py-6">
                      <Users className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Add friends first to invite them as collaborators</p>
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

  if (loading) {
    return <div className="flex items-center justify-center py-12"><p className="text-sm text-muted-foreground">Loading projects…</p></div>;
  }

  return (
    <>
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-primary" />
              Project Management
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {stats.total} project{stats.total !== 1 ? 's' : ''} · {stats.active} active · {stats.overdue > 0 && <span className="text-destructive">{stats.overdue} overdue</span>}
            </p>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />New Project
          </Button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: stats.total, icon: FolderKanban, color: 'text-primary' },
            { label: 'Active', value: stats.active, icon: Circle, color: 'text-emerald-500' },
            { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'text-blue-500' },
            { label: 'Overdue', value: stats.overdue, icon: AlertCircle, color: 'text-destructive' },
          ].map(stat => (
            <div key={stat.label} className="bg-card border border-border/60 rounded-lg p-3 flex items-center gap-3">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <div>
                <p className="text-lg font-bold text-foreground">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="pl-8 h-8 text-xs"
            />
          </div>
          <div className="flex gap-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex border border-border rounded-md overflow-hidden">
              {([
                { mode: 'grid' as const, icon: BarChart3 },
                { mode: 'list' as const, icon: ListTodo },
                { mode: 'board' as const, icon: Columns3 },
              ]).map(({ mode, icon: Icon }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`h-8 w-8 flex items-center justify-center transition-colors ${viewMode === mode ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowArchived(v => !v)}>
              <Archive className="h-3.5 w-3.5 mr-1" />{showArchived ? 'Active' : 'Archived'}
            </Button>
          </div>
        </div>

        {/* Projects */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <FolderKanban className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {showArchived ? 'No archived projects' : searchQuery ? 'No projects match your search' : 'No projects yet'}
            </p>
            {!showArchived && !searchQuery && (
              <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />Create your first project
              </Button>
            )}
          </div>
        ) : viewMode === 'board' ? renderBoardView() : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-2'}>
            {filteredProjects.map(renderProjectCard)}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{editingProject ? 'Edit Project' : 'New Project'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="shrink-0">
                <label className="text-xs font-medium text-muted-foreground">Icon</label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-10 w-10 text-lg mt-1">{projectForm.icon}</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="grid grid-cols-6 gap-1 p-2 w-auto">
                    {PROJECT_ICONS.map(icon => (
                      <button key={icon} onClick={() => setProjectForm(f => ({ ...f, icon }))} className="h-8 w-8 flex items-center justify-center rounded hover:bg-accent text-lg">{icon}</button>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground">Project Name *</label>
                <Input value={projectForm.name} onChange={e => setProjectForm(f => ({ ...f, name: e.target.value }))} className="mt-1" placeholder="My Project" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <Textarea value={projectForm.description} onChange={e => setProjectForm(f => ({ ...f, description: e.target.value }))} className="mt-1 min-h-[60px] text-sm" placeholder="What is this project about?" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select value={projectForm.status} onValueChange={v => setProjectForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Priority</label>
                <Select value={projectForm.priority} onValueChange={v => setProjectForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Start Date</label>
                <Input type="date" value={projectForm.start_date} onChange={e => setProjectForm(f => ({ ...f, start_date: e.target.value }))} className="mt-1 text-xs" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Due Date</label>
                <Input type="date" value={projectForm.due_date} onChange={e => setProjectForm(f => ({ ...f, due_date: e.target.value }))} className="mt-1 text-xs" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Color</label>
              <div className="flex gap-2 mt-1">
                {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'].map(c => (
                  <button
                    key={c}
                    onClick={() => setProjectForm(f => ({ ...f, color: c }))}
                    className={`h-6 w-6 rounded-full border-2 transition-all ${projectForm.color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Client Name</label>
                <Input value={projectForm.client_name} onChange={e => setProjectForm(f => ({ ...f, client_name: e.target.value }))} className="mt-1 text-xs" placeholder="Client name" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Client Email</label>
                <Input value={projectForm.client_email} onChange={e => setProjectForm(f => ({ ...f, client_email: e.target.value }))} className="mt-1 text-xs" placeholder="client@email.com" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Budget</label>
              <Input type="number" value={projectForm.budget} onChange={e => setProjectForm(f => ({ ...f, budget: e.target.value }))} className="mt-1 text-xs" placeholder="0.00" />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Tags (comma separated)</label>
              <Input value={projectForm.tags} onChange={e => setProjectForm(f => ({ ...f, tags: e.target.value }))} className="mt-1 text-xs" placeholder="design, web, client-work" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={saveProject} disabled={!projectForm.name.trim()}>
              {editingProject ? 'Save Changes' : 'Create Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Detail Sheet */}
      {renderProjectDetail()}
    </>
  );
}
