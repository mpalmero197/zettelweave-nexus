import { useNavigate } from "react-router-dom";
import { useScholarModules, useScholarLessons, useScholarProgress, useScholarPoints, scholarRank } from "@/hooks/useScholar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, Sparkles, FlaskConical, Trophy, ArrowRight, BookOpen } from "lucide-react";

export default function ScholarHome() {
  const navigate = useNavigate();
  const { data: modules = [] } = useScholarModules();
  const { data: lessons = [] } = useScholarLessons();
  const { data: progress = [] } = useScholarProgress();
  const { data: points } = useScholarPoints();

  const total = points?.total ?? 0;
  const rank = scholarRank(total);
  const completedSlugs = new Set(progress.filter(p => p.status === "completed").map(p => p.lesson_slug));
  const lessonsByModule = new Map<string, typeof lessons>();
  for (const l of lessons) {
    const arr = lessonsByModule.get(l.module_slug) ?? [];
    arr.push(l);
    lessonsByModule.set(l.module_slug, arr);
  }

  const totalLessons = lessons.length;
  const completedCount = completedSlugs.size;
  const overallPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const nextLesson = lessons.find(l => !completedSlugs.has(l.slug));

  return (
    <div className="container max-w-6xl py-8 space-y-8">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-semibold tracking-tight">PendragonX Scholar</h1>
        </div>
        <p className="text-muted-foreground">Learn every part of PendragonX in a safe sandbox. Earn badges. Become a Grand Pendragon.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Your rank</span>
            <Trophy className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-semibold">{rank}</div>
          <div className="text-sm text-muted-foreground">{total} points</div>
        </Card>
        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Progress</span>
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-semibold">{completedCount} / {totalLessons}</div>
          <Progress value={overallPct} className="h-2" />
        </Card>
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Try without risk</span>
            <FlaskConical className="h-4 w-4 text-primary" />
          </div>
          <p className="text-sm">Open the isolated sandbox to practice freely.</p>
          <Button size="sm" variant="secondary" onClick={() => navigate("/scholar/sandbox")} className="w-full">
            Enter Sandbox <ArrowRight className="ml-2 h-3 w-3" />
          </Button>
        </Card>
      </div>

      {nextLesson && (
        <Card className="p-6 bg-gradient-to-br from-primary/10 to-accent/5 border-primary/20">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-wider text-primary">Continue learning</div>
              <h2 className="text-xl font-semibold">{nextLesson.title}</h2>
              <p className="text-sm text-muted-foreground">{nextLesson.summary}</p>
            </div>
            <Button onClick={() => navigate(`/scholar/lesson/${nextLesson.slug}`)}>
              Start <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Curriculum</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate("/scholar/alice")}>
            <Sparkles className="mr-2 h-4 w-4" /> ALICE Deep Dive
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {modules.map(mod => {
            const modLessons = lessonsByModule.get(mod.slug) ?? [];
            const modCompleted = modLessons.filter(l => completedSlugs.has(l.slug)).length;
            return (
              <Card key={mod.slug} className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{mod.title}</h3>
                    <p className="text-xs text-muted-foreground">{mod.description}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0">{modCompleted}/{modLessons.length}</Badge>
                </div>
                <ul className="space-y-1">
                  {modLessons.length === 0 && (
                    <li className="text-xs text-muted-foreground italic">Lessons generating…</li>
                  )}
                  {modLessons.map(l => (
                    <li key={l.slug}>
                      <button
                        onClick={() => navigate(`/scholar/lesson/${l.slug}`)}
                        className="w-full text-left text-sm flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
                      >
                        <span className={completedSlugs.has(l.slug) ? "text-muted-foreground line-through" : ""}>{l.title}</span>
                        <ArrowRight className="h-3 w-3 opacity-50" />
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
