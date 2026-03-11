import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, Loader2, GraduationCap, Clock, Users, ChevronDown, ChevronRight, BookmarkPlus, BookmarkCheck, Star, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface CourseResult {
  title: string;
  provider: string;
  university?: string;
  url: string;
  description: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  duration: string;
  is_free: boolean;
  rating?: number;
  syllabus: string[];
  learner_count?: string;
}

interface SavedCourse {
  id: string;
  title: string;
  provider: string;
  url: string;
  description: string;
  difficulty: string;
  duration: string;
  is_free: boolean;
  syllabus: string[];
  status: string;
  notes: string | null;
}

const POPULAR_TOPICS = [
  "Machine Learning", "Web Development", "Data Science",
  "Psychology", "Creative Writing", "Mathematics",
  "Computer Science", "Philosophy", "Cybersecurity",
];

const difficultyColor: Record<string, string> = {
  Beginner: "bg-green-500/10 text-green-600 border-green-500/20",
  Intermediate: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  Advanced: "bg-red-500/10 text-red-600 border-red-500/20",
};

export function LearningCourses() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CourseResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [view, setView] = useState<"search" | "saved">("search");
  const [savedCourses, setSavedCourses] = useState<SavedCourse[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [expandedSyllabus, setExpandedSyllabus] = useState<Set<number>>(new Set());
  const [savedUrls, setSavedUrls] = useState<Set<string>>(new Set());
  

  useEffect(() => {
    if (user) loadSavedCourses();
  }, [user]);

  const loadSavedCourses = async () => {
    if (!user) return;
    setLoadingSaved(true);
    const { data, error } = await supabase
      .from("saved_courses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) {
      setSavedCourses(data.map((c: any) => ({
        ...c,
        syllabus: Array.isArray(c.syllabus) ? c.syllabus : [],
      })));
      setSavedUrls(new Set(data.map((c: any) => c.url)));
    }
    setLoadingSaved(false);
  };

  const searchCourses = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-courses", {
        body: { query: searchQuery },
      });
      if (error) throw error;
      setResults(data?.courses || []);
      if (!data?.courses?.length) toast.info("No courses found — try different keywords");
    } catch (err: any) {
      console.error(err);
      toast.error("Search failed", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const saveCourse = async (course: CourseResult) => {
    if (!user) { toast.error("Sign in to save courses"); return; }
    const { error } = await supabase.from("saved_courses").insert({
      user_id: user.id,
      title: course.title,
      provider: course.provider,
      url: course.url,
      description: course.description,
      difficulty: course.difficulty,
      duration: course.duration,
      is_free: course.is_free,
      syllabus: course.syllabus,
      status: "want_to_take",
    });
    if (error) { toast.error("Failed to save"); return; }
    toast.success("Course saved!");
    setSavedUrls(prev => new Set(prev).add(course.url));
    loadSavedCourses();
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("saved_courses")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (!error) {
      setSavedCourses(prev => prev.map(c => c.id === id ? { ...c, status } : c));
      toast.success("Status updated");
    }
  };

  const removeSaved = async (id: string, url: string) => {
    await supabase.from("saved_courses").delete().eq("id", id);
    setSavedCourses(prev => prev.filter(c => c.id !== id));
    setSavedUrls(prev => { const n = new Set(prev); n.delete(url); return n; });
    toast.success("Removed from saved");
  };

  const toggleSyllabus = (i: number) => {
    setExpandedSyllabus(prev => {
      const n = new Set(prev);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });
  };

  const statusLabel: Record<string, string> = {
    want_to_take: "Want to Take",
    in_progress: "In Progress",
    completed: "Completed",
  };

  const renderCourseCard = (course: CourseResult | SavedCourse, index: number, isSaved = false) => {
    const isAlreadySaved = savedUrls.has(course.url);
    return (
      <Card key={index} className="border-border/50 hover:border-primary/30 transition-colors">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-sm leading-snug line-clamp-2">{course.title}</CardTitle>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <Badge variant="secondary" className="text-[10px]">{course.provider}</Badge>
                {'university' in course && course.university && (
                  <Badge variant="outline" className="text-[10px]">{course.university}</Badge>
                )}
                <Badge className={`text-[10px] ${difficultyColor[course.difficulty] || ""}`}>
                  {course.difficulty}
                </Badge>
                {course.is_free && (
                  <Badge className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">Free</Badge>
                )}
              </div>
            </div>
            {!isSaved && (
              <Button
                size="icon"
                variant="ghost"
                className="shrink-0 h-8 w-8"
                onClick={() => isAlreadySaved ? null : saveCourse(course as CourseResult)}
                disabled={isAlreadySaved}
              >
                {isAlreadySaved ? (
                  <BookmarkCheck className="h-4 w-4 text-primary" />
                ) : (
                  <BookmarkPlus className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <CardDescription className="text-xs line-clamp-2">{course.description}</CardDescription>

          <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{course.duration}</span>
            {'rating' in course && course.rating && (
              <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-500" />{course.rating}</span>
            )}
            {'learner_count' in course && course.learner_count && (
              <span className="flex items-center gap-1"><Users className="h-3 w-3" />{course.learner_count}</span>
            )}
          </div>

          {course.syllabus?.length > 0 && (
            <Collapsible open={expandedSyllabus.has(index)} onOpenChange={() => toggleSyllabus(index)}>
              <CollapsibleTrigger className="flex items-center gap-1 text-[11px] text-primary hover:underline cursor-pointer">
                {expandedSyllabus.has(index) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                Syllabus ({course.syllabus.length} topics)
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1.5">
                <ul className="space-y-0.5 text-[11px] text-muted-foreground pl-4">
                  {course.syllabus.map((topic, j) => (
                    <li key={j} className="list-disc">{topic}</li>
                  ))}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          )}

          {isSaved && (
            <div className="flex items-center gap-2 pt-1">
              <select
                className="text-xs bg-muted rounded px-2 py-1 border border-border"
                value={(course as SavedCourse).status}
                onChange={(e) => updateStatus((course as SavedCourse).id, e.target.value)}
              >
                <option value="want_to_take">Want to Take</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
              <Button size="sm" variant="outline" className="text-xs h-7"
                onClick={() => window.open(course.url, '_blank', 'noopener,noreferrer')}>
                Open Course
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-7 text-destructive"
                onClick={() => removeSaved((course as SavedCourse).id, course.url)}
              >
                Remove
              </Button>
            </div>
          )}

          {!isSaved && (
            <Button size="sm" variant="outline" className="text-xs h-7 w-full mt-1"
              onClick={() => window.open(course.url, '_blank', 'noopener,noreferrer')}>
              View Course →
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  // Embedded course viewer
  if (viewingCourse) {
    return (
      <div className="flex flex-col h-[calc(100vh-12rem)]">
        <div className="flex items-center gap-3 pb-3 border-b border-border mb-3">
          <Button size="sm" variant="ghost" onClick={() => setViewingCourse(null)}>
            <ChevronRight className="h-4 w-4 mr-1.5 rotate-180" />Back
          </Button>
          <h2 className="text-sm font-medium truncate flex-1">{viewingCourse.title}</h2>
        </div>
        <div className="flex-1 rounded-lg overflow-hidden border border-border bg-muted">
          <iframe
            src={viewingCourse.url}
            className="w-full h-full border-0"
            allow="fullscreen"
            title={`Course: ${viewingCourse.title}`}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={view === "search" ? "default" : "outline"}
          onClick={() => setView("search")}
        >
          <Search className="h-3.5 w-3.5 mr-1.5" />Discover
        </Button>
        <Button
          size="sm"
          variant={view === "saved" ? "default" : "outline"}
          onClick={() => { setView("saved"); loadSavedCourses(); }}
        >
          <BookmarkCheck className="h-3.5 w-3.5 mr-1.5" />
          My Courses {savedCourses.length > 0 && `(${savedCourses.length})`}
        </Button>
      </div>

      {view === "search" && (
        <>
          <form onSubmit={(e) => { e.preventDefault(); searchCourses(query); }} className="flex gap-2">
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
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
              <p className="text-sm text-muted-foreground">Discovering courses with AI…</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {results.map((course, i) => renderCourseCard(course, i))}
            </div>
          )}

          {searched && !loading && results.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <GraduationCap className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No courses found. Try different keywords.</p>
            </div>
          )}
        </>
      )}

      {view === "saved" && (
        <>
          {loadingSaved ? (
            <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
          ) : savedCourses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <GraduationCap className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No saved courses yet. Search and save courses to track your learning.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {["in_progress", "want_to_take", "completed"].map(status => {
                const filtered = savedCourses.filter(c => c.status === status);
                if (filtered.length === 0) return null;
                return (
                  <div key={status}>
                    <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                      {statusLabel[status]}
                      <Badge variant="secondary" className="text-[10px]">{filtered.length}</Badge>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filtered.map((c, i) => renderCourseCard(c, i + 1000, true))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
