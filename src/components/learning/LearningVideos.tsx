import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Video, ExternalLink, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VideoResult {
  title: string;
  url: string;
  thumbnail: string;
  provider: string;
  channel: string;
  description: string;
}

const POPULAR_TOPICS = [
  "Machine Learning", "JavaScript Tutorial", "Linear Algebra",
  "Psychology", "History Documentary", "Physics",
  "Web Development", "Philosophy", "Data Structures",
];

const providerColor: Record<string, string> = {
  YouTube: "bg-red-500/10 text-red-600 border-red-500/20",
  "Khan Academy": "bg-green-500/10 text-green-600 border-green-500/20",
  TED: "bg-red-600/10 text-red-700 border-red-600/20",
  Odysee: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  Vimeo: "bg-sky-500/10 text-sky-600 border-sky-500/20",
};

export function LearningVideos() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VideoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const searchVideos = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-videos", {
        body: { query: searchQuery },
      });
      if (error) throw error;
      if (data?.success) {
        setResults(data.data || []);
        if ((data.data || []).length === 0) toast.info("No videos found");
      } else {
        toast.error(data?.error || "Search failed");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to search videos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search form */}
      <form onSubmit={(e) => { e.preventDefault(); searchVideos(query); }} className="flex gap-2">
        <Input placeholder="Search educational videos…" value={query}
          onChange={(e) => setQuery(e.target.value)} className="flex-1" />
        <Button type="submit" disabled={loading || !query.trim()} size="sm">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </form>

      {/* Popular topics */}
      {!searched && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Popular topics</p>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_TOPICS.map(t => (
              <Badge key={t} variant="outline" className="cursor-pointer hover:bg-primary/10 text-xs"
                onClick={() => { setQuery(t); searchVideos(t); }}>{t}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
      ) : results.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{results.length} videos found</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {results.map((video, i) => (
              <Card key={i} className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer overflow-hidden group"
                onClick={() => window.open(video.url, "_blank", "noopener,noreferrer")}>
                <CardContent className="p-0">
                  {video.thumbnail ? (
                    <div className="relative">
                      <img src={video.thumbnail} alt={video.title}
                        className="w-full h-36 object-cover bg-muted" loading="lazy" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <Play className="h-10 w-10 text-white opacity-0 group-hover:opacity-80 transition-opacity drop-shadow-lg" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-36 bg-muted flex items-center justify-center">
                      <Video className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="p-3 space-y-1.5">
                    <h4 className="text-xs font-medium line-clamp-2 leading-snug">{video.title}</h4>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge className={`text-[9px] px-1.5 py-0 ${providerColor[video.provider] || "bg-muted text-muted-foreground"}`}>
                        {video.provider}
                      </Badge>
                      {video.channel && video.channel !== video.provider && (
                        <span className="text-[10px] text-muted-foreground truncate">{video.channel}</span>
                      )}
                    </div>
                    {video.description && (
                      <p className="text-[10px] text-muted-foreground line-clamp-2">{video.description}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : searched ? (
        <div className="text-center py-12 text-muted-foreground">
          <Video className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No videos found. Try a different search.</p>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Video className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Search for educational videos</p>
          <p className="text-xs mt-1">Searches YouTube, Khan Academy, TED, Odysee & more</p>
        </div>
      )}
    </div>
  );
}
