import { useParams, useNavigate } from "react-router-dom";
import { useScholarLesson, useMarkFormatComplete } from "@/hooks/useScholar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, BookOpen, Video, Sparkles, Footprints, CheckCircle2, FlaskConical } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useEffect, useMemo } from "react";
import { SandboxWorkspace } from "@/components/scholar/SandboxWorkspace";
import { SandboxProvider } from "@/contexts/SandboxContext";

export default function ScholarLesson() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: lesson, isLoading } = useScholarLesson(slug);
  const markComplete = useMarkFormatComplete();

  useEffect(() => {
    document.title = lesson ? `${lesson.title} · Scholar · PendragonX` : "Scholar · PendragonX";
  }, [lesson]);

  const sandboxSurface = useMemo<"notebooks" | "notes" | "cards" | undefined>(() => {
    if (!lesson) return undefined;
    const s = (lesson.slug || "").toLowerCase();
    if (s.includes("notebook")) return "notebooks";
    if (s.includes("zettel") || s.includes("card")) return "cards";
    if (s.includes("note")) return "notes";
    return undefined;
  }, [lesson]);

  if (isLoading) return <div className="container py-8 text-sm text-muted-foreground">Loading lesson…</div>;
  if (!lesson) {
    return (
      <div className="container max-w-4xl py-8 space-y-4">
        <Button variant="ghost" onClick={() => navigate("/scholar")}><ArrowLeft className="mr-2 h-4 w-4" />Back to Scholar</Button>
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-2">Lesson not yet generated</h2>
          <p className="text-sm text-muted-foreground">
            The curriculum sync engine will publish this lesson on its next run.
          </p>
        </Card>
      </div>
    );
  }

  const handleComplete = (format: string) => markComplete.mutate({ lessonSlug: lesson.slug, format });

  const videoEmbed = lesson.video_url ? toEmbed(lesson.video_url) : null;
  const walkthroughSteps: Array<{ target?: string; content: string; action?: string }> =
    Array.isArray(lesson.walkthrough_json) ? lesson.walkthrough_json as any : [];

  const askAlice = (autoSend: boolean) => {
    const text = `I'm in PendragonX Scholar learning "${lesson.title}". ${lesson.summary ? `Context: ${lesson.summary}` : ""} Walk me through this feature step by step, and demo it for me in my sandbox where possible. Use plain language and stop after each step so I can try it myself.`;
    try {
      sessionStorage.setItem("alice:auto-prompt", JSON.stringify({ text, autoSend }));
    } catch { /* ignore */ }
    navigate("/alice");
  };

  return (
    <SandboxProvider initialSource="sandbox">
      <div className="container max-w-6xl py-6 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/scholar")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Scholar
        </Button>

        {/* Header */}
        <header className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px]">Lesson</Badge>
            {sandboxSurface && (
              <Badge variant="secondary" className="text-[10px] gap-1">
                <FlaskConical className="h-3 w-3" />Interactive
              </Badge>
            )}
            {(lesson as any).estimated_minutes && (
              <span className="text-xs text-muted-foreground">~{(lesson as any).estimated_minutes} min</span>
            )}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">{lesson.title}</h1>
          {lesson.summary && <p className="text-muted-foreground max-w-3xl">{lesson.summary}</p>}
        </header>

        {/* Two-column when an interactive surface exists */}
        <div className={sandboxSurface ? "grid gap-6 lg:grid-cols-[1fr_minmax(0,420px)]" : ""}>
          {/* LEFT: lesson tabs */}
          <Tabs defaultValue="read" className="space-y-4">
            <TabsList className="flex flex-wrap h-auto">
              <TabsTrigger value="read"><BookOpen className="mr-1.5 h-3.5 w-3.5" />Read</TabsTrigger>
              <TabsTrigger value="watch" disabled={!videoEmbed}><Video className="mr-1.5 h-3.5 w-3.5" />Watch</TabsTrigger>
              <TabsTrigger value="walk" disabled={walkthroughSteps.length === 0}><Footprints className="mr-1.5 h-3.5 w-3.5" />Walkthrough</TabsTrigger>
              <TabsTrigger value="alice"><Sparkles className="mr-1.5 h-3.5 w-3.5" />Ask ALICE</TabsTrigger>
            </TabsList>

            <TabsContent value="read">
              <Card className="p-6 space-y-4">
                <article className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{lesson.written_md || "_Written lesson is being generated by the curriculum sync engine._"}</ReactMarkdown>
                </article>
                <div className="flex justify-end pt-2 border-t">
                  <Button onClick={() => handleComplete("read")} variant="secondary" size="sm">
                    <CheckCircle2 className="mr-2 h-4 w-4" />Mark read
                  </Button>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="watch">
              {videoEmbed && (
                <Card className="overflow-hidden">
                  <div className="aspect-video w-full bg-black">
                    <iframe
                      src={videoEmbed}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={lesson.title}
                    />
                  </div>
                  <div className="p-3 flex justify-end border-t">
                    <Button onClick={() => handleComplete("watch")} variant="secondary" size="sm">
                      <CheckCircle2 className="mr-2 h-4 w-4" />Mark watched
                    </Button>
                  </div>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="walk">
              <Card className="p-6 space-y-4">
                <h3 className="font-semibold">Try it step by step</h3>
                <p className="text-xs text-muted-foreground">
                  The sandbox on the right is a live copy of PendragonX. Follow each step there — your real workspace is untouched.
                </p>
                <ol className="space-y-3 text-sm">
                  {walkthroughSteps.map((s, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-semibold flex items-center justify-center">{i + 1}</span>
                      <div className="flex-1">
                        <div>{s.content}</div>
                        {s.action && <div className="text-xs text-muted-foreground mt-0.5">→ {s.action}</div>}
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="flex gap-2 pt-2 border-t">
                  <Button size="sm" variant="outline" onClick={() => navigate("/scholar/sandbox")}>
                    Open full sandbox
                  </Button>
                  <Button onClick={() => handleComplete("walk")} variant="secondary" size="sm">
                    <CheckCircle2 className="mr-2 h-4 w-4" />Mark complete
                  </Button>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="alice">
              <Card className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent flex-shrink-0" aria-hidden />
                  <div className="flex-1 space-y-1">
                    <h3 className="font-semibold">Have ALICE teach you live</h3>
                    <p className="text-sm text-muted-foreground">
                      ALICE will open with a question already written for you. She'll walk you through "{lesson.title}",
                      demo it in your sandbox, and pause between steps.
                    </p>
                  </div>
                </div>

                <Card className="p-3 bg-muted/40 text-sm italic">
                  "I'm learning <strong>{lesson.title}</strong> in Scholar. Walk me through it step by step and demo it in my sandbox."
                </Card>

                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Button onClick={() => askAlice(true)} className="gap-2">
                    <Sparkles className="h-4 w-4" />Ask ALICE now
                  </Button>
                  <Button onClick={() => askAlice(false)} variant="outline" size="sm">
                    Edit the question first
                  </Button>
                  <Button onClick={() => handleComplete("alice")} variant="secondary" size="sm" className="ml-auto">
                    <CheckCircle2 className="mr-2 h-4 w-4" />Mark complete
                  </Button>
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          {/* RIGHT: live embedded sandbox surface */}
          {sandboxSurface && (
            <aside className="space-y-2">
              <Card className="p-4 border-primary/40 bg-primary/5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FlaskConical className="h-4 w-4 text-primary" />
                  Try it here — live sandbox
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  This panel is a working copy of the real feature. Nothing here affects your knowledge base.
                </p>
              </Card>
              <Card className="p-4">
                <SandboxWorkspace only={sandboxSurface} compact />
              </Card>
            </aside>
          )}
        </div>
      </div>
    </SandboxProvider>
  );
}

function toEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname === "youtu.be") {
      const id = u.hostname === "youtu.be" ? u.pathname.slice(1) : u.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    return url;
  } catch { return null; }
}
