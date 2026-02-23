import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Bug,
  Lightbulb,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  RefreshCw,
  MessageSquare,
  ThumbsUp,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  votes: number;
  created_at: string;
  updated_at: string;
}

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: "Pending Review", icon: Clock, color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  under_review: { label: "Under Review", icon: AlertCircle, color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  planned: { label: "Planned", icon: MessageSquare, color: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  in_progress: { label: "In Progress", icon: RefreshCw, color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" },
  completed: { label: "Completed", icon: CheckCircle2, color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  declined: { label: "Declined", icon: XCircle, color: "bg-red-500/15 text-red-400 border-red-500/30" },
};

export function DebuggerConsole() {
  const { user } = useAuth();
  const [featureRequests, setFeatureRequests] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [bugOpen, setBugOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bugTitle, setBugTitle] = useState("");
  const [bugDescription, setBugDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("requests");

  const fetchRequests = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("feature_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFeatureRequests(data || []);
    } catch (error) {
      console.error("Error fetching feature requests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const handleSubmitFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("feature_requests").insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim(),
      });
      if (error) throw error;
      toast.success("Feature request submitted!");
      setTitle("");
      setDescription("");
      setSubmitOpen(false);
      fetchRequests();
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitBug = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      const signature = `user-report:${bugTitle.trim().toLowerCase().replace(/\s+/g, '-')}`;
      const { error } = await supabase.rpc("report_error", {
        p_error_signature: signature,
        p_error_type: "user_report",
        p_error_message: bugTitle.trim(),
        p_stack_trace: bugDescription.trim(),
        p_severity: "warning",
        p_url: window.location.href,
        p_user_agent: navigator.userAgent,
      });
      if (error) throw error;
      toast.success("Bug report submitted! Thank you for helping improve PendragonX.");
      setBugTitle("");
      setBugDescription("");
      setBugOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit bug report");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatus = (status: string) => {
    return statusConfig[status] || statusConfig.pending;
  };

  const groupedRequests = {
    active: featureRequests.filter(r => ["pending", "under_review", "planned", "in_progress"].includes(r.status)),
    completed: featureRequests.filter(r => r.status === "completed"),
    declined: featureRequests.filter(r => r.status === "declined"),
  };

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Bug className="h-5 w-5 text-primary" />
            Debugger Console
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Report bugs and track your feature requests
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={bugOpen} onOpenChange={setBugOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Bug className="h-3.5 w-3.5" />
                Report Bug
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Report a Bug</DialogTitle>
                <DialogDescription>
                  Describe the issue you encountered. Our team will investigate.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitBug} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bug-title">Bug Summary</Label>
                  <Input
                    id="bug-title"
                    placeholder="Brief description of the issue"
                    value={bugTitle}
                    onChange={(e) => setBugTitle(e.target.value)}
                    required
                    maxLength={200}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bug-desc">Steps to Reproduce</Label>
                  <Textarea
                    id="bug-desc"
                    placeholder="1. Go to...&#10;2. Click on...&#10;3. Observe..."
                    value={bugDescription}
                    onChange={(e) => setBugDescription(e.target.value)}
                    required
                    rows={6}
                    maxLength={2000}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setBugOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Submitting..." : "Submit Report"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Request a Feature</DialogTitle>
                <DialogDescription>
                  Have an idea to improve PendragonX? Share it with us!
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitFeature} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="feat-title">Feature Title</Label>
                  <Input
                    id="feat-title"
                    placeholder="Brief title for your feature request"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    maxLength={200}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="feat-desc">Description</Label>
                  <Textarea
                    id="feat-desc"
                    placeholder="Describe the feature you'd like to see..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={6}
                    maxLength={2000}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setSubmitOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Submitting..." : "Submit Request"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Button variant="ghost" size="sm" onClick={fetchRequests} className="h-8 w-8 p-0">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{featureRequests.length}</p>
            <p className="text-xs text-muted-foreground">Total Requests</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-amber-400">{groupedRequests.active.length}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-emerald-400">{groupedRequests.completed.length}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-red-400">{groupedRequests.declined.length}</p>
            <p className="text-xs text-muted-foreground">Declined</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="requests" className="gap-1.5">
            <Lightbulb className="h-3.5 w-3.5" />
            Active ({groupedRequests.active.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Done ({groupedRequests.completed.length})
          </TabsTrigger>
          <TabsTrigger value="declined" className="gap-1.5">
            <XCircle className="h-3.5 w-3.5" />
            Declined ({groupedRequests.declined.length})
          </TabsTrigger>
        </TabsList>

        {["requests", "completed", "declined"].map((tabKey) => {
          const items = tabKey === "requests" ? groupedRequests.active
            : tabKey === "completed" ? groupedRequests.completed
            : groupedRequests.declined;

          return (
            <TabsContent key={tabKey} value={tabKey} className="mt-3">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-muted/30 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <Card className="border-dashed border-border/50">
                  <CardContent className="py-10 text-center">
                    <Lightbulb className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      {tabKey === "requests"
                        ? "No active feature requests. Submit one to get started!"
                        : tabKey === "completed"
                        ? "No completed requests yet."
                        : "No declined requests."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <ScrollArea className="max-h-[60vh]">
                  <div className="space-y-2">
                    {items.map((req) => {
                      const status = getStatus(req.status);
                      const StatusIcon = status.icon;
                      return (
                        <Card key={req.id} className="border-border/40 hover:border-border/60 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <h3 className="font-medium text-sm text-foreground truncate">
                                    {req.title}
                                  </h3>
                                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${status.color}`}>
                                    <StatusIcon className="h-2.5 w-2.5 mr-1" />
                                    {status.label}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                  {req.description}
                                </p>
                                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                  <span>Submitted {format(new Date(req.created_at), "MMM d, yyyy")}</span>
                                  {req.updated_at !== req.created_at && (
                                    <span>Updated {format(new Date(req.updated_at), "MMM d, yyyy")}</span>
                                  )}
                                  <span className="flex items-center gap-0.5">
                                    <ThumbsUp className="h-2.5 w-2.5" />
                                    {req.votes}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
