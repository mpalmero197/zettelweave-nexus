import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Video, ExternalLink, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface VideoResult {
  title: string;
  url: string;
  thumbnail: string;
  provider: string;
  channel: string;
  description: string;
}

const POPULAR_TOPICS = [
  "Machine Learning", "Web Development", "Data Science",
  "Psychology", "Creative Writing", "Mathematics",
  "Computer Science", "Philosophy", "Cybersecurity",
];

const providerColor: Record<string, string> = {
  YouTube: "bg-red-500/90 text-white border-transparent",
  Odysee: "bg-purple-500/90 text-white border-transparent",
  "Khan Academy": "bg-green-600/90 text-white border-transparent",
  TED: "bg-red-600/90 text-white border-transparent",
  PeerTube: "bg-orange-500/90 text-white border-transparent",
  Vimeo: "bg-sky-500/90 text-white border-transparent",
  Web: "bg-muted text-muted-foreground",
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
    setResults([]);

    try {
      const { data, error } = await supabase.functions.invoke("search-videos", {
        body: { query: searchQuery.trim() },
      });

      if (error) throw error;
      if (data?.success && data.data) {
        setResults(data.data);
        if (data.data.length === 0) {
          toast.info("No videos found. Try a different search term.");
        }
      } else {
        throw new Error(data?.error || "Search failed");
      }
    } catch (err: any) {
      console.error("Video search error:", err);
      toast.error("Failed to search videos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={(e) => { e.preventDefault(); searchVideos(query); }} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search educational videos…"
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-1.5" />}
          Search
        </Button>
      </form>

      {!searched && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground font-medium">Popular topics</p>
          <div className="flex flex-wrap gap-2">
            {POPULAR_TOPICS.map((topic) => (
              <Badge
                key={topic}
                variant="outline"
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => { setQuery(topic); searchVideos(topic); }}
              >
                {topic}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Video className="h-3 w-3" />
            Searches YouTube, Odysee, Khan Academy, TED & more
          </p>
        </div>
      )}

      {loading && (
        <div className="text-center py-12">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Searching videos…</p>
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-12 space-y-3">
          <Video className="h-10 w-10 mx-auto opacity-40 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No results found</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="sm" variant="outline" onClick={() =>
              window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, "_blank", "noopener,noreferrer")
            }>
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />Search YouTube
            </Button>
            <Button size="sm" variant="outline" onClick={() =>
              window.open(`https://odysee.com/$/search?q=${encodeURIComponent(query)}`, "_blank", "noopener,noreferrer")
            }>
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />Search Odysee
            </Button>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {results.map((video, i) => (
            <Card key={i} className="overflow-hidden border-border/50 hover:border-primary/30 transition-colors group">
              {/* Thumbnail */}
              <div className="relative">
                <AspectRatio ratio={16 / 9}>
                  {video.thumbnail ? (
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover bg-muted"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Video className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                  )}
                </AspectRatio>
                {/* Provider badge */}
                <Badge className={`absolute top-2 left-2 text-[10px] ${providerColor[video.provider] || providerColor.Web}`}>
                  {video.provider}
                </Badge>
                {/* Play overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                  <div className="rounded-full bg-background/90 p-2">
                    <Play className="h-5 w-5 text-foreground fill-foreground" />
                  </div>
                </div>
              </div>

              <CardContent className="p-3 space-y-1.5">
                <h3 className="text-sm font-medium leading-snug line-clamp-2 text-foreground">{video.title}</h3>
                <p className="text-[11px] text-muted-foreground">{video.channel}</p>
                {video.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{video.description}</p>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs h-7 mt-1"
                  onClick={() => window.open(video.url, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="h-3 w-3 mr-1.5" />Watch
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
