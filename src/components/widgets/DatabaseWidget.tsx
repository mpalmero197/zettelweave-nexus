import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Database, Plus, Trash2 } from "lucide-react";
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
}

export function DatabaseWidget() {
  const { user } = useAuth();
  const [rows, setRows] = useState<DatabaseRow[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newRowName, setNewRowName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

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
        .order('due_date', { ascending: true });

      if (error) throw error;

      if (data) {
        setRows(data.map(task => ({
          id: task.id,
          name: task.name,
          status: task.status as DatabaseRow["status"],
          priority: task.priority as DatabaseRow["priority"],
          dueDate: task.due_date
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
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr className="text-left">
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Priority</th>
              <th className="pb-2 font-medium">Due Date</th>
              <th className="pb-2 w-10"></th>
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
                <td className="py-2">
                  <Input
                    placeholder="Row name..."
                    value={newRowName}
                    onChange={(e) => setNewRowName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addRow()}
                    className="h-8"
                    autoFocus
                  />
                </td>
                <td className="py-2" colSpan={3}>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={addRow}>Add</Button>
                    <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
                      Cancel
                    </Button>
                  </div>
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-b hover:bg-accent/50 group">
                <td className="py-2 font-medium">{row.name}</td>
                <td className="py-2">
                  <Select
                    value={row.status}
                    onValueChange={(value) => updateStatus(row.id, value as DatabaseRow["status"])}
                  >
                    <SelectTrigger className="h-7 w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="py-2">
                  <Badge className={priorityColors[row.priority]}>
                    {row.priority}
                  </Badge>
                </td>
                <td className="py-2 text-muted-foreground">
                  {new Date(row.dueDate).toLocaleDateString()}
                </td>
                <td className="py-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
                    onClick={() => deleteRow(row.id)}
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