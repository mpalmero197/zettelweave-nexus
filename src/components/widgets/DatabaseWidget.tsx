import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Database, Plus, Trash2, X, Check, Maximize2, Minimize2, Star, StarOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DatabaseRow {
  id: string;
  name: string;
  status: "todo" | "in-progress" | "done";
  priority: "low" | "medium" | "high";
  dueDate: string;
  isFavorite: boolean;
}

export function DatabaseWidget() {
  const { user } = useAuth();
  const [rows, setRows] = useState<DatabaseRow[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newRowName, setNewRowName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCompact, setIsCompact] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user]);

  const loadTasks = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('project_tasks')
        .select('*')
        .order('is_favorite', { ascending: false })
        .order('due_date', { ascending: true });

      if (error) throw error;

      if (data) {
        setRows(data.map(task => ({
          id: task.id,
          name: task.name,
          status: task.status as DatabaseRow["status"],
          priority: task.priority as DatabaseRow["priority"],
          dueDate: task.due_date,
          isFavorite: task.is_favorite || false
        })));
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast.error("Failed to load tasks");
    } finally {
      setIsLoading(false);
    }
  };

  const statusColors = {
    "todo": "bg-gray-500",
    "in-progress": "bg-blue-500",
    "done": "bg-green-500"
  };

  const priorityColors = {
    "low": "bg-gray-400",
    "medium": "bg-orange-400",
    "high": "bg-red-500"
  };

  const addRow = async () => {
    if (!newRowName.trim() || !user) return;
    
    const dueDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    
    try {
      const { error } = await supabase
        .from('project_tasks')
        .insert([{
          user_id: user.id,
          name: newRowName,
          status: "todo",
          priority: "medium",
          due_date: dueDate
        }]);

      if (error) throw error;

      setNewRowName("");
      setIsAdding(false);
      toast.success("Task added");
      await loadTasks();
    } catch (error) {
      console.error('Error adding task:', error);
      toast.error("Failed to add task");
    }
  };

  const deleteRow = async (id: string) => {
    try {
      const { error } = await supabase
        .from('project_tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Task deleted");
      await loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error("Failed to delete task");
    }
  };

  const toggleFavorite = async (id: string, currentFavorite: boolean) => {
    try {
      const { error } = await supabase
        .from('project_tasks')
        .update({ is_favorite: !currentFavorite })
        .eq('id', id);

      if (error) throw error;

      await loadTasks();
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error("Failed to update favorite");
    }
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === rows.length && rows.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map(row => row.id)));
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    try {
      const { error } = await supabase
        .from('project_tasks')
        .delete()
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      toast.success(`Deleted ${selectedIds.size} task(s)`);
      setSelectedIds(new Set());
      await loadTasks();
    } catch (error) {
      console.error('Error bulk deleting:', error);
      toast.error("Failed to delete tasks");
    }
  };

  const bulkToggleFavorite = async (markAsFavorite: boolean) => {
    if (selectedIds.size === 0) return;
    
    try {
      const { error } = await supabase
        .from('project_tasks')
        .update({ is_favorite: markAsFavorite })
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      toast.success(`Updated ${selectedIds.size} task(s)`);
      setSelectedIds(new Set());
      await loadTasks();
    } catch (error) {
      console.error('Error bulk updating favorites:', error);
      toast.error("Failed to update favorites");
    }
  };

  const updateStatus = async (id: string, status: DatabaseRow["status"]) => {
    try {
      const { error } = await supabase
        .from('project_tasks')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      await loadTasks();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error("Failed to update status");
    }
  };

  return (
    <Card className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Project Database</h3>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsCompact(!isCompact)}
            aria-label={isCompact ? "Expand view" : "Compact view"}
          >
            {isCompact ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsAdding(true)}
            aria-label="Add task"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="mb-3 flex items-center gap-2 p-2 bg-accent/50 rounded-lg">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="flex gap-1 ml-auto">
            <Button size="sm" variant="ghost" onClick={() => bulkToggleFavorite(true)} aria-label="Mark as favorite">
              <Star className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => bulkToggleFavorite(false)} aria-label="Remove from favorites">
              <StarOff className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={bulkDelete} className="text-destructive" aria-label="Delete selected">
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} aria-label="Clear selection">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <table className={`w-full ${isCompact ? 'text-xs' : 'text-sm'}`}>
          <thead className="border-b">
            <tr className="text-left">
              <th className={`${isCompact ? 'pb-1' : 'pb-2'} w-10`}>
                <Checkbox
                  checked={selectedIds.size === rows.length && rows.length > 0}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </th>
              <th className={`${isCompact ? 'pb-1' : 'pb-2'} w-8`}></th>
              <th className={`${isCompact ? 'pb-1' : 'pb-2'} font-medium`}>Name</th>
              <th className={`${isCompact ? 'pb-1' : 'pb-2'} font-medium`}>Status</th>
              <th className={`${isCompact ? 'pb-1' : 'pb-2'} font-medium`}>Priority</th>
              <th className={`${isCompact ? 'pb-1' : 'pb-2'} font-medium`}>Due Date</th>
              <th className={`${isCompact ? 'pb-1' : 'pb-2'} w-10`}></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-4 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 && !isAdding ? (
              <tr>
                <td colSpan={5} className="py-4 text-center text-muted-foreground">
                  No tasks yet
                </td>
              </tr>
            ) : null}
            {isAdding && (
              <tr className="border-b">
                <td className="py-2" colSpan={4}>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Task name..."
                      value={newRowName}
                      onChange={(e) => setNewRowName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addRow()}
                      className="h-8 flex-1"
                      autoFocus
                    />
                    <Button size="sm" onClick={addRow} className="h-8 w-8 p-0" aria-label="Add task">
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)} className="h-8 w-8 p-0" aria-label="Cancel">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className={`border-b hover:bg-accent/50 group ${isCompact ? 'text-xs' : ''}`}>
                <td className={isCompact ? 'py-1' : 'py-2'}>
                  <Checkbox
                    checked={selectedIds.has(row.id)}
                    onCheckedChange={() => toggleSelection(row.id)}
                    aria-label={`Select ${row.name}`}
                  />
                </td>
                <td className={isCompact ? 'py-1' : 'py-2'}>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`${isCompact ? 'h-5 w-5' : 'h-6 w-6'} p-0 ${row.isFavorite ? '' : 'opacity-0 group-hover:opacity-100'}`}
                    onClick={() => toggleFavorite(row.id, row.isFavorite)}
                    aria-label={row.isFavorite ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Star className={`${isCompact ? 'w-3 h-3' : 'w-3.5 h-3.5'} ${row.isFavorite ? 'fill-primary text-primary' : ''}`} />
                  </Button>
                </td>
                <td className={`${isCompact ? 'py-1' : 'py-2'} font-medium`}>{row.name}</td>
                <td className={isCompact ? 'py-1' : 'py-2'}>
                  <Select
                    value={row.status}
                    onValueChange={(value) => updateStatus(row.id, value as DatabaseRow["status"])}
                  >
                    <SelectTrigger className={`${isCompact ? 'h-6 w-28 text-xs' : 'h-7 w-32'}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className={isCompact ? 'py-1' : 'py-2'}>
                  <Badge className={`${priorityColors[row.priority]} ${isCompact ? 'text-xs px-1.5 py-0' : ''}`}>
                    {row.priority}
                  </Badge>
                </td>
                <td className={`${isCompact ? 'py-1' : 'py-2'} text-muted-foreground`}>
                  {new Date(row.dueDate).toLocaleDateString()}
                </td>
                <td className={isCompact ? 'py-1' : 'py-2'}>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`${isCompact ? 'h-5 w-5' : 'h-7 w-7'} p-0 opacity-0 group-hover:opacity-100 text-destructive`}
                    onClick={() => deleteRow(row.id)}
                    aria-label="Delete task"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}