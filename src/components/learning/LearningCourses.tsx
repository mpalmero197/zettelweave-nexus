import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search, Loader2, GraduationCap, Clock, BookmarkCheck, ExternalLink, Award,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
      setSavedCourses(data.map((c: any) => ({ ...c, syllabus: Array.isArray(c.syllabus) ? c.syllabus : [] })));
    }
    setLoadingSaved(false);
  };

  const openClassCentral = (searchQuery: string) => {
    window.open(`https://www.classcentral.com/search?q=${encodeURIComponent(searchQuery)}`, "_blank", "noopener,noreferrer");
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("saved_courses").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (!error) { setSavedCourses(prev => prev.map(c => c.id === id ? { ...c, status } : c)); toast.success("Status updated"); }
  };

  const toggleCertificate = async (id: string, current: boolean) => {
    const { error } = await (supabase.from("saved_courses") as any)
      .update({ certificate_earned: !current, updated_at: new Date().toISOString() }).eq("id", id);
    if (!error) { setSavedCourses(prev => prev.map(c => c.id === id ? { ...c, certificate_earned: !current } : c)); toast.success(!current ? "Certificate marked!" : "Certificate removed"); }
  };

  const removeSaved = async (id: string) => {
    await supabase.from("saved_courses").delete().eq("id", id);
    setSavedCourses(prev => prev.filter(c => c.id !== id));
    toast.success("Removed from saved");
  };

  return (
    <div className="space-y-3">
      {/* View toggle — pill-style */}
      <div className="flex items-center gap-1.5 bg-muted rounded-lg p-1 w-fit">
        <button onClick={() => setView("search")}
          className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
            view === "search" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
          <Search className="h-3.5 w-3.5" />Discover
        </button>
        <button onClick={() => { setView("saved"); loadSavedCourses(); }}
          className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
            view === "saved" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
          <BookmarkCheck className="h-3.5 w-3.5" />Saved
          {savedCourses.length > 0 && <span className="text-[10px] opacity-60">({savedCourses.length})</span>}
        </button>
      </div>

      {view === "search" ? (
        <div className="space-y-3">
          <form onSubmit={(e) => { e.preventDefault(); if (query.trim()) openClassCentral(query); }} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search courses on Class Central…" value={query}
                onChange={(e) => setQuery(e.target.value)} className="pl-8 h-9" />
            </div>
            <Button type="submit" disabled={!query.trim()} size="sm" className="h-9">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </form>

          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs text-muted-foreground mr-1 self-center">Try:</span>
            {POPULAR_TOPICS.map(t => (
              <Badge key={t} variant="outline" className="cursor-pointer hover:bg-accent text-xs"
                onClick={() => { setQuery(t); openClassCentral(t); }}>{t}</Badge>
            ))}
          </div>

          <EmptyState icon={GraduationCap} message="Search opens Class Central" sub="Save courses from Search tab to track them here" />
        </div>
      ) : (
        <div className="space-y-3">
          {loadingSaved ? (
            <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
          ) : savedCourses.length === 0 ? (
            <EmptyState icon={GraduationCap} message="No saved courses yet" sub="Search and save courses to track your learning" />
          ) : (
            <div className="space-y-4">
              {["in_progress", "want_to_take", "completed"].map(status => {
                const filtered = savedCourses.filter(c => c.status === status);
                if (filtered.length === 0) return null;
                return (
                  <div key={status}>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                      {statusLabel[status]}
                      <span className="text-[10px] bg-muted rounded-full px-1.5 py-0.5 normal-case tracking-normal">{filtered.length}</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {filtered.map((course) => (
                        <Card key={course.id} className="border-border/40 hover:border-primary/30 transition-colors">
                          <CardContent className="p-3 space-y-2">
                            <h4 className="text-sm font-medium line-clamp-2 leading-snug">{course.title}</h4>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {course.provider && <Badge variant="secondary" className="text-[10px]">{course.provider}</Badge>}
                              {course.difficulty && (
                                <Badge className={`text-[10px] ${difficultyColor[course.difficulty] || ""}`}>{course.difficulty}</Badge>
                              )}
                              {course.is_free && <Badge className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">Free</Badge>}
                            </div>
                            {course.description && <CardDescription className="text-xs line-clamp-2">{course.description}</CardDescription>}
                            {course.duration && (
                              <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Clock className="h-3 w-3" />{course.duration}</span>
                            )}
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <select className="text-xs bg-muted rounded px-2 py-1 border border-border"
                                value={course.status} onChange={(e) => updateStatus(course.id, e.target.value)}>
                                <option value="want_to_take">Want to Take</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                              </select>
                              {course.status === 'completed' && (
                                <Button size="sm" variant={course.certificate_earned ? "default" : "outline"} className="text-xs h-7 gap-1"
                                  onClick={() => toggleCertificate(course.id, course.certificate_earned)}>
                                  <Award className="h-3 w-3" />{course.certificate_earned ? "Certified ✓" : "Add Cert"}
                                </Button>
                              )}
                              <Button size="sm" variant="outline" className="text-xs h-7"
                                onClick={() => window.open(course.url, "_blank", "noopener,noreferrer")}>Open</Button>
                              <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive"
                                onClick={() => removeSaved(course.id)}>Remove</Button>
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

function EmptyState({ icon: Icon, message, sub }: { icon: any; message: string; sub: string }) {
  return (
    <div className="text-center py-10 text-muted-foreground">
      <Icon className="h-10 w-10 mx-auto mb-2 opacity-30" />
      <p className="text-sm font-medium">{message}</p>
      <p className="text-xs mt-0.5">{sub}</p>
    </div>
  );
}
