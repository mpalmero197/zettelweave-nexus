import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, ExternalLink, Loader2, GraduationCap, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CourseResult {
  title: string;
  provider: string;
  url: string;
  description: string;
  rating?: string;
  isFree?: boolean;
}

const POPULAR_TOPICS = [
  "Machine Learning", "Web Development", "Data Science",
  "Psychology", "Business", "Creative Writing",
  "Mathematics", "Computer Science", "Philosophy",
];

export function LearningCourses() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CourseResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const searchCourses = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const { data, error } = await supabase.functions.invoke("web-search", {
        body: { query: `free online courses ${searchQuery} site:edx.org OR site:classcentral.com OR site:coursera.org` },
      });
      if (error) throw error;

      const citations: string[] = data?.citations || [];
      const resultText: string = data?.result || "";

      // Parse the web search result into structured course cards
      const parsed: CourseResult[] = citations.slice(0, 8).map((url, i) => {
        const isEdx = url.includes("edx.org");
        const isClassCentral = url.includes("classcentral.com");
        const provider = isEdx ? "edX" : isClassCentral ? "Class Central" : "Coursera";
        // Extract title from URL path
        const path = new URL(url).pathname.split("/").filter(Boolean).pop() || "";
        const title = path.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        return {
          title: title || `${searchQuery} Course ${i + 1}`,
          provider,
          url,
          description: `Found on ${provider} — click to view full course details and enroll.`,
          isFree: resultText.toLowerCase().includes("free") || isClassCentral,
        };
      });

      setResults(parsed.length > 0 ? parsed : []);
      if (parsed.length === 0) toast.info("No courses found — try different keywords");
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
        onSubmit={(e) => { e.preventDefault(); searchCourses(query); }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses (e.g. machine learning, history…)"
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
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
                onClick={() => { setQuery(topic); searchCourses(topic); }}
              >
                {topic}
              </Badge>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            {[
              { name: "edX", url: "https://edx.org", desc: "University-level courses & certificates" },
              { name: "Class Central", url: "https://classcentral.com", desc: "Find free courses from top providers" },
              { name: "Coursera", url: "https://coursera.org", desc: "Degrees & professional certificates" },
            ].map((p) => (
              <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer">
                <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-1.5">
                      <GraduationCap className="h-4 w-4 text-primary" />
                      {p.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">{p.desc}</p>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {results.map((course, i) => (
            <a key={i} href={course.url} target="_blank" rel="noopener noreferrer">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm leading-snug line-clamp-2">{course.title}</CardTitle>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  </div>
                  <div className="flex gap-1.5 mt-1">
                    <Badge variant="secondary" className="text-[10px]">{course.provider}</Badge>
                    {course.isFree && <Badge className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">Free</Badge>}
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-xs line-clamp-2">{course.description}</CardDescription>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      )}

      {searched && !loading && results.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <GraduationCap className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No courses found. Try different keywords.</p>
        </div>
      )}
    </div>
  );
}
