import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, ExternalLink, Loader2, Map, ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TopicNode {
  name: string;
  url?: string;
  description?: string;
  children?: TopicNode[];
}

const EXPLORE_TOPICS = [
  { name: "Programming", query: "programming learning roadmap", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  { name: "Mathematics", query: "mathematics learning path", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  { name: "Physics", query: "physics topics learning map", color: "bg-green-500/10 text-green-600 border-green-500/20" },
  { name: "Philosophy", query: "philosophy branches roadmap", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  { name: "Design", query: "design skills learning path", color: "bg-pink-500/10 text-pink-600 border-pink-500/20" },
  { name: "AI & ML", query: "artificial intelligence learning roadmap", color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20" },
  { name: "Biology", query: "biology topics learning guide", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  { name: "Economics", query: "economics concepts roadmap", color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
];

interface TopicResource {
  title: string;
  url: string;
  type: string;
}

export function LearningTopicMaps() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [topicTitle, setTopicTitle] = useState("");
  const [resources, setResources] = useState<TopicResource[]>([]);
  const [subtopics, setSubtopics] = useState<string[]>([]);
  const [summary, setSummary] = useState("");

  const exploreTopics = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSearched(true);
    setTopicTitle(searchQuery);

    try {
      const { data, error } = await supabase.functions.invoke("web-search", {
        body: {
          query: `${searchQuery} learning roadmap resources guide site:learn-anything.xyz OR site:roadmap.sh OR site:github.com`,
          includeContext: true,
        },
      });
      if (error) throw error;

      const citations: string[] = data?.citations || [];
      const relatedQuestions: string[] = data?.relatedQuestions || [];
      const contextual = data?.contextualData;

      // Build resources from citations
      const parsedResources: TopicResource[] = citations.slice(0, 10).map((url) => {
        const domain = new URL(url).hostname.replace("www.", "");
        const path = new URL(url).pathname.split("/").filter(Boolean);
        const title = path.pop()?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || domain;
        const type = domain.includes("github") ? "Repository" :
          domain.includes("roadmap") ? "Roadmap" :
          domain.includes("learn-anything") ? "Topic Map" : "Resource";
        return { title, url, type };
      });

      // Extract subtopics from related questions or context
      const parsedSubtopics = relatedQuestions?.length > 0
        ? relatedQuestions.slice(0, 6)
        : contextual?.relatedConcepts?.slice(0, 6) || [];

      const parsedSummary = contextual?.definitions?.[0] || data?.result?.slice(0, 300) || "";

      setResources(parsedResources);
      setSubtopics(parsedSubtopics);
      setSummary(parsedSummary);

      if (parsedResources.length === 0) toast.info("No topic maps found — try broader keywords");
    } catch (err: any) {
      console.error(err);
      toast.error("Search failed", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => { e.preventDefault(); exploreTopics(query); }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Explore any topic (e.g. quantum computing…)"
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Explore"}
        </Button>
      </form>

      {!searched && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground font-medium">Explore a subject</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {EXPLORE_TOPICS.map((topic) => (
              <button
                key={topic.name}
                onClick={() => { setQuery(topic.name); exploreTopics(topic.query); }}
                className={`rounded-xl p-3 text-left transition-all hover:scale-[1.02] active:scale-95 border ${topic.color}`}
              >
                <span className="text-sm font-medium">{topic.name}</span>
              </button>
            ))}
          </div>

          <a href="https://learn-anything.xyz" target="_blank" rel="noopener noreferrer">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer mt-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Map className="h-4 w-4 text-primary" />
                  Learn Anything
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Interactive topic maps and curated learning resources for any subject.
                </p>
              </CardContent>
            </Card>
          </a>
        </div>
      )}

      {searched && !loading && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {topicTitle}
            </h2>
            {summary && (
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{summary}</p>
            )}
          </div>

          {subtopics.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Related topics</p>
              <div className="flex flex-wrap gap-2">
                {subtopics.map((st, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => { setQuery(st); exploreTopics(st); }}
                  >
                    <ArrowRight className="h-3 w-3 mr-1" />
                    {st}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {resources.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Resources</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {resources.map((res, i) => (
                  <a key={i} href={res.url} target="_blank" rel="noopener noreferrer">
                    <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                      <CardContent className="pt-3 pb-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-1">{res.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                            {new URL(res.url).hostname}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant="secondary" className="text-[9px]">{res.type}</Badge>
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                ))}
              </div>
            </div>
          )}

          {resources.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <Map className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No resources found. Try different keywords.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
