import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, Loader2, Map, ChevronDown, ChevronRight, ExternalLink, Clock, BookOpen, Video, Wrench, Code, PenTool, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Resource {
  title: string;
  url: string;
  type: "course" | "article" | "video" | "book" | "tool" | "practice";
  is_free: boolean;
}

interface TopicNode {
  id: string;
  title: string;
  description: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  estimated_time?: string;
  prerequisites?: string[];
  resources: Resource[];
  children: TopicNode[];
}

interface TopicMap {
  title: string;
  description: string;
  estimated_total_time: string;
  nodes: TopicNode[];
}

const POPULAR_TOPICS = [
  "Machine Learning", "Web Development", "Blockchain",
  "Psychology", "Data Engineering", "Game Development",
  "Artificial Intelligence", "Quantum Computing", "UX Design",
];

const difficultyColor: Record<string, string> = {
  Beginner: "bg-green-500/10 text-green-600 border-green-500/20",
  Intermediate: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  Advanced: "bg-red-500/10 text-red-600 border-red-500/20",
};

const resourceIcon: Record<string, any> = {
  course: BookOpen,
  article: PenTool,
  video: Video,
  book: BookOpen,
  tool: Wrench,
  practice: Code,
};

export function LearningTopicMaps() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [topicMap, setTopicMap] = useState<TopicMap | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [savingMindMap, setSavingMindMap] = useState(false);

  const generateTopicMap = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSearched(true);
    setTopicMap(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-topic-map", {
        body: { topic: searchQuery },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setTopicMap(data);
      if (data?.nodes) {
        setExpandedNodes(new Set(data.nodes.map((n: TopicNode) => n.id)));
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to generate topic map", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const drillDown = (title: string) => {
    setQuery(title);
    generateTopicMap(title);
  };

  const saveAsMindMap = async () => {
    if (!user || !topicMap) { toast.error("Sign in to save mind maps"); return; }
    setSavingMindMap(true);
    try {
      const flatNodes: Record<string, any> = {};
      const edges: any[] = [];
      flatNodes["root"] = { id: "root", text: topicMap.title, x: 0, y: 0, notes: topicMap.description, parentId: null };
      const flattenNode = (node: TopicNode, parentId: string, x: number, y: number) => {
        flatNodes[node.id] = { id: node.id, text: node.title, x, y, notes: node.description, parentId };
        edges.push({ source: parentId, target: node.id });
        node.children?.forEach((child, i) => { flattenNode(child, node.id, x + 250, y + i * 120); });
      };
      topicMap.nodes.forEach((node, i) => { flattenNode(node, "root", 300, i * 150); });
      const { error } = await supabase.from("mind_maps").insert({
        user_id: user.id, title: `📚 ${topicMap.title}`, description: topicMap.description, map_data: { nodes: flatNodes, edges },
      });
      if (error) throw error;
      toast.success("Saved as Mind Map!", { description: "Check your Mind Map library" });
    } catch (err: any) { toast.error("Failed to save", { description: err.message }); }
    finally { setSavingMindMap(false); }
  };

  const renderNode = (node: TopicNode, depth: number) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const Icon = hasChildren ? (isExpanded ? ChevronDown : ChevronRight) : () => <div className="w-4" />;

    return (
      <div key={node.id} className={`${depth > 0 ? "ml-4 border-l border-border/50 pl-3" : ""}`}>
        <Collapsible open={isExpanded} onOpenChange={() => toggleNode(node.id)}>
          <div className="group flex items-start gap-2 py-2 hover:bg-accent/50 rounded-md px-2 -mx-2 transition-colors">
            <CollapsibleTrigger className="mt-0.5 shrink-0">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CollapsibleTrigger>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-medium">{node.title}</span>
                <Badge className={`text-[9px] px-1 py-0 ${difficultyColor[node.difficulty] || ""}`}>{node.difficulty}</Badge>
                {node.estimated_time && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />{node.estimated_time}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{node.description}</p>
              {node.resources && node.resources.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {node.resources.map((r, i) => {
                    const RIcon = resourceIcon[r.type] || ExternalLink;
                    return (
                      <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-border/50 hover:border-primary/50 hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                        <RIcon className="h-2.5 w-2.5" />
                        <span className="max-w-[120px] truncate">{r.title}</span>
                        {r.is_free && <span className="text-green-600 text-[8px]">FREE</span>}
                      </a>
                    );
                  })}
                </div>
              )}
              {hasChildren && (
                <button className="text-[10px] text-primary hover:underline mt-1 inline-block"
                  onClick={(e) => { e.stopPropagation(); drillDown(node.title); }}>
                  Explore "{node.title}" in depth →
                </button>
              )}
            </div>
          </div>
          <CollapsibleContent>
            {node.children?.map(child => renderNode(child, depth + 1))}
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <form onSubmit={(e) => { e.preventDefault(); generateTopicMap(query); }} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter a topic to generate a learning path…" className="pl-8 h-9" />
        </div>
        <Button type="submit" disabled={loading} size="sm" className="h-9">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}
        </Button>
      </form>

      {!searched && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-muted-foreground mr-1 self-center">Try:</span>
          {POPULAR_TOPICS.map((topic) => (
            <Badge key={topic} variant="outline" className="cursor-pointer hover:bg-accent text-xs transition-colors"
              onClick={() => { setQuery(topic); generateTopicMap(topic); }}>{topic}</Badge>
          ))}
        </div>
      )}

      {loading && (
        <div className="text-center py-10">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
          <p className="text-sm text-muted-foreground">Generating learning path…</p>
        </div>
      )}

      {topicMap && !loading && (
        <div className="space-y-3">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">{topicMap.title}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{topicMap.description}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{topicMap.estimated_total_time}</span>
                    <span>{topicMap.nodes?.length || 0} topics</span>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={saveAsMindMap} disabled={savingMindMap} className="shrink-0">
                  {savingMindMap ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                  Mind Map
                </Button>
              </div>
            </CardContent>
          </Card>
          <div className="space-y-1">
            {topicMap.nodes?.map(node => renderNode(node, 0))}
          </div>
        </div>
      )}

      {searched && !loading && !topicMap && (
        <EmptyState icon={Map} message="Failed to generate topic map" sub="Try again with a different topic" />
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, message, sub }: { icon: any; message: string; sub: string }) {
  return (
    <div className="text-center py-10 text-muted-foreground">
      <Icon className="h-10 w-10 mx-auto mb-2 opacity-30" />
      <p className="text-sm font-medium">{message}</p>
      <p className="text-xs mt-0.5">{sub}</p>
    </div>
  );
}
