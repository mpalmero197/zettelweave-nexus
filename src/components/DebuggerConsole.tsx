import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  TrendingUp,
  Users,
  ChevronDown,
  ChevronUp,
  Search,
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
  user_id: string | null;
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
  const [myRequests, setMyRequests] = useState<FeatureRequest[]>([]);
  const [communityRequests, setCommunityRequests] = useState<FeatureRequest[]>([]);
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [bugOpen, setBugOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bugTitle, setBugTitle] = useState("");
  const [bugDescription, setBugDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("community");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"votes" | "newest" | "status">("votes");
  const [searchQuery, setSearchQuery] = useState("");
  const [votingId, setVotingId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch all feature requests, user's own requests, and user's votes in parallel
      const [allRes, votesRes] = await Promise.all([
        supabase
          .from("feature_requests")
          .select("*")
          .order("votes", { ascending: false }),
        supabase
          .from("feature_request_votes")
          .select("feature_request_id")
          .eq("user_id", user.id),
      ]);

      if (allRes.error) throw allRes.error;

      const all = allRes.data || [];
      setMyRequests(all.filter(r => r.user_id === user.id));
      setCommunityRequests(all);

      const votedIds = new Set((votesRes.data || []).map(v => v.feature_request_id));
      setMyVotes(votedIds);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleVote = async (featureId: string) => {
    if (!user || votingId) return;
    setVotingId(featureId);
    try {
      const { data, error } = await supabase.rpc("toggle_feature_vote", {
        _feature_id: featureId,
      });
      if (error) throw error;

      const nowVoted = data as boolean;
      setMyVotes(prev => {
        const next = new Set(prev);
        if (nowVoted) next.add(featureId);
        else next.delete(featureId);
        return next;
      });

      // Update vote count locally
      const updateList = (list: FeatureRequest[]) =>
        list.map(r =>
          r.id === featureId
            ? { ...r, votes: r.votes + (nowVoted ? 1 : -1) }
            : r
        );
      setCommunityRequests(updateList);
      setMyRequests(prev => updateList(prev));

      toast.success(nowVoted ? "Vote added!" : "Vote removed");
    } catch (error) {
      console.error(error);
      toast.error("Failed to vote");
    } finally {
      setVotingId(null);
    }
  };

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
      fetchAll();
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
      const signature = `user-report:${bugTitle.trim().toLowerCase().replace(/\s+/g, "-")}`;
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

  const getStatus = (status: string) => statusConfig[status] || statusConfig.pending;

  const sortAndFilter = (items: FeatureRequest[]) => {
    let filtered = items;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = items.filter(
        r => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
      );
    }
    return [...filtered].sort((a, b) => {
      if (sortBy === "votes") return b.votes - a.votes;
      if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      // status: active first
      const order = ["in_progress", "planned", "under_review", "pending", "completed", "declined"];
      return order.indexOf(a.status) - order.indexOf(b.status);
    });
  };

  const communityActive = communityRequests.filter(r =>
    ["pending", "under_review", "planned", "in_progress"].includes(r.status)
  );
  const communityCompleted = communityRequests.filter(r => r.status === "completed");
  const myActive = myRequests.filter(r =>
    ["pending", "under_review", "planned", "in_progress"].includes(r.status)
  );

  const renderRequestCard = (req: FeatureRequest, showVote: boolean) => {
    const status = getStatus(req.status);
    const StatusIcon = status.icon;
    const isExpanded = expandedId === req.id;
    const hasVoted = myVotes.has(req.id);
    const isMine = req.user_id === user?.id;

    return (
      <Card
        key={req.id}
        className="border-border/40 hover:border-border/60 transition-colors"
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Vote button */}
            {showVote && (
              <button
                onClick={() => handleVote(req.id)}
                disabled={votingId === req.id}
                className={`flex flex-col items-center gap-0.5 pt-0.5 min-w-[40px] rounded-md p-1.5 transition-colors ${
                  hasVoted
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                aria-label={hasVoted ? "Remove vote" : "Upvote"}
              >
                <ThumbsUp className={`h-4 w-4 ${hasVoted ? "fill-current" : ""}`} />
                <span className="text-xs font-semibold">{req.votes}</span>
              </button>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3
                  className="font-medium text-sm text-foreground cursor-pointer hover:text-primary transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : req.id)}
                >
                  {req.title}
                </h3>
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${status.color}`}>
                  <StatusIcon className="h-2.5 w-2.5 mr-1" />
                  {status.label}
                </Badge>
                {isMine && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    Yours
                  </Badge>
                )}
              </div>

              <p className={`text-xs text-muted-foreground mb-2 ${isExpanded ? "" : "line-clamp-2"}`}>
                {req.description}
              </p>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-border/30 space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <span className="text-muted-foreground">Submitted</span>
                      <p className="text-foreground font-medium">
                        {format(new Date(req.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                    {req.updated_at !== req.created_at && (
                      <div>
                        <span className="text-muted-foreground">Last Updated</span>
                        <p className="text-foreground font-medium">
                          {format(new Date(req.updated_at), "MMM d, yyyy")}
                        </p>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Votes</span>
                      <p className="text-foreground font-medium">{req.votes}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span>{format(new Date(req.created_at), "MMM d, yyyy")}</span>
                {!showVote && (
                  <span className="flex items-center gap-0.5">
                    <ThumbsUp className="h-2.5 w-2.5" />
                    {req.votes}
                  </span>
                )}
                <button
                  className="flex items-center gap-0.5 hover:text-foreground transition-colors ml-auto"
                  onClick={() => setExpandedId(isExpanded ? null : req.id)}
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-3 w-3" /> Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3" /> More
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderList = (items: FeatureRequest[], showVote: boolean, emptyMsg: string) => {
    const sorted = sortAndFilter(items);
    if (loading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-muted/30 rounded-lg animate-pulse" />
          ))}
        </div>
      );
    }
    if (sorted.length === 0) {
      return (
        <Card className="border-dashed border-border/50">
          <CardContent className="py-10 text-center">
            <Lightbulb className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">{emptyMsg}</p>
          </CardContent>
        </Card>
      );
    }
    return (
      <ScrollArea className="max-h-[55vh]">
        <div className="space-y-2">{sorted.map(req => renderRequestCard(req, showVote))}</div>
      </ScrollArea>
    );
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
            Report bugs, request features, and vote on community ideas
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
                    onChange={e => setBugTitle(e.target.value)}
                    required
                    maxLength={200}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bug-desc">Steps to Reproduce</Label>
                  <Textarea
                    id="bug-desc"
                    placeholder={"1. Go to...\n2. Click on...\n3. Observe..."}
                    value={bugDescription}
                    onChange={e => setBugDescription(e.target.value)}
                    required
                    rows={6}
                    maxLength={2000}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setBugOpen(false)}>
                    Cancel
                  </Button>
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
                    onChange={e => setTitle(e.target.value)}
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
                    onChange={e => setDescription(e.target.value)}
                    required
                    rows={6}
                    maxLength={2000}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setSubmitOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Submitting..." : "Submit Request"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Button variant="ghost" size="sm" onClick={fetchAll} className="h-8 w-8 p-0">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{communityRequests.length}</p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Users className="h-3 w-3" /> Total Ideas
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-amber-400">{communityActive.length}</p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <TrendingUp className="h-3 w-3" /> Active
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-emerald-400">{communityCompleted.length}</p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Shipped
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">{myVotes.size}</p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <ThumbsUp className="h-3 w-3" /> Your Votes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search + Sort */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search requests..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
        <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="votes">Most Voted</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="status">By Status</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="community" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Community ({communityActive.length})
          </TabsTrigger>
          <TabsTrigger value="mine" className="gap-1.5">
            <Lightbulb className="h-3.5 w-3.5" />
            My Requests ({myRequests.length})
          </TabsTrigger>
          <TabsTrigger value="shipped" className="gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Shipped ({communityCompleted.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="community" className="mt-3">
          {renderList(
            communityActive,
            true,
            "No active feature requests yet. Be the first to submit one!"
          )}
        </TabsContent>

        <TabsContent value="mine" className="mt-3">
          {renderList(
            myRequests,
            false,
            "You haven't submitted any requests yet. Click 'New Request' to get started!"
          )}
        </TabsContent>

        <TabsContent value="shipped" className="mt-3">
          {renderList(
            communityCompleted,
            true,
            "No features shipped yet — stay tuned!"
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
