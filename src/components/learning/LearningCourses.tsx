import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search, Loader2, GraduationCap, Clock, BookmarkCheck, ExternalLink, Award,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

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
  certificate_earned: boolean;
  certificate_url: string | null;
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

const statusLabel: Record<string, string> = {
  want_to_take: "Want to Take",
  in_progress: "In Progress",
  completed: "Completed",
};

export function LearningCourses() {
  const { user } = useAuth();
  const [view, setView] = useState<"search" | "saved">("search");
  const [query, setQuery] = useState("");
  const [savedCourses, setSavedCourses] = useState<SavedCourse[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

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
    }
    setLoadingSaved(false);
  };

  const openClassCentral = (searchQuery: string) => {
    const url = `https://www.classcentral.com/search?q=${encodeURIComponent(searchQuery)}`;
    window.open(url, "_blank", "noopener,noreferrer");
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

  const removeSaved = async (id: string) => {
    await supabase.from("saved_courses").delete().eq("id", id);
    setSavedCourses(prev => prev.filter(c => c.id !== id));
    toast.success("Removed from saved");
  };

  return (
    <div className="space-y-4">
      {/* Search / Saved toggle */}
      <div className="flex items-center gap-2">
        <Button size="sm" variant={view === "search" ? "default" : "outline"} onClick={() => setView("search")}>
          <Search className="h-3.5 w-3.5 mr-1.5" />Discover
        </Button>
        <Button size="sm" variant={view === "saved" ? "default" : "outline"} onClick={() => { setView("saved"); loadSavedCourses(); }}>
          <BookmarkCheck className="h-3.5 w-3.5 mr-1.5" />Saved{savedCourses.length > 0 ? ` (${savedCourses.length})` : ""}
        </Button>
      </div>

      {view === "search" ? (
        <div className="space-y-4">
          {/* Search form */}
          <form onSubmit={(e) => { e.preventDefault(); if (query.trim()) openClassCentral(query); }} className="flex gap-2">
            <Input placeholder="Search courses on Class Central…" value={query}
              onChange={(e) => setQuery(e.target.value)} className="flex-1" />
            <Button type="submit" disabled={!query.trim()} size="sm">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </form>

          {/* Popular topics */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Popular topics</p>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_TOPICS.map(t => (
                <Badge key={t} variant="outline" className="cursor-pointer hover:bg-primary/10 text-xs"
                  onClick={() => { setQuery(t); openClassCentral(t); }}>{t}</Badge>
              ))}
            </div>
          </div>

          <div className="text-center py-8 text-muted-foreground">
            <GraduationCap className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Search opens Class Central in a new tab</p>
            <p className="text-xs mt-1">Save courses from the main Search tab to track them here</p>
          </div>
        </div>
      ) : (
        /* Saved courses */
        <div className="space-y-4">
          {loadingSaved ? (
            <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
          ) : savedCourses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <GraduationCap className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No saved courses yet.</p>
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
                      {filtered.map((course) => (
                        <Card key={course.id} className="border-border/50 hover:border-primary/30 transition-colors">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm leading-snug line-clamp-2">{course.title}</CardTitle>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              {course.provider && <Badge variant="secondary" className="text-[10px]">{course.provider}</Badge>}
                              {course.difficulty && (
                                <Badge className={`text-[10px] ${difficultyColor[course.difficulty] || ""}`}>
                                  {course.difficulty}
                                </Badge>
                              )}
                              {course.is_free && (
                                <Badge className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">Free</Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {course.description && (
                              <CardDescription className="text-xs line-clamp-2">{course.description}</CardDescription>
                            )}
                            {course.duration && (
                              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Clock className="h-3 w-3" />{course.duration}
                              </span>
                            )}
                            <div className="flex items-center gap-2 pt-1">
                              <select
                                className="text-xs bg-muted rounded px-2 py-1 border border-border"
                                value={course.status}
                                onChange={(e) => updateStatus(course.id, e.target.value)}
                              >
                                <option value="want_to_take">Want to Take</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                              </select>
                              <Button size="sm" variant="outline" className="text-xs h-7"
                                onClick={() => window.open(course.url, "_blank", "noopener,noreferrer")}>
                                Open
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs h-7 text-destructive"
                                onClick={() => removeSaved(course.id)}
                              >
                                Remove
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
