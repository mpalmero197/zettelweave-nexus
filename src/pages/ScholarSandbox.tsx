import { useSandbox, SandboxProvider } from "@/contexts/SandboxContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FlaskConical, RotateCcw, ArrowLeft, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SandboxWorkspace } from "@/components/scholar/SandboxWorkspace";

function SandboxInner() {
  const { reseed, reseeding } = useSandbox();
  const navigate = useNavigate();

  const askAlice = () => {
    try {
      sessionStorage.setItem("alice:auto-prompt", JSON.stringify({
        text: "I'm in the Baku Scribe Scholar sandbox. Give me a quick tour of what I can do here and suggest a fun thing to try.",
        autoSend: true,
      }));
    } catch { /* ignore */ }
    navigate("/alice");
  };

  return (
    <div className="container max-w-6xl py-6 space-y-5">
      <Button variant="ghost" size="sm" onClick={() => navigate("/scholar")}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Scholar
      </Button>

      <Card className="p-4 border-primary/40 bg-primary/5 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <FlaskConical className="h-5 w-5 text-primary" />
          <div>
            <div className="font-medium">Baku Scribe Sandbox</div>
            <div className="text-xs text-muted-foreground">A live copy of the real app. Nothing here affects your knowledge base.</div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={askAlice}>
            <Sparkles className="mr-2 h-3.5 w-3.5" />Ask ALICE
          </Button>
          <Button size="sm" variant="outline" disabled={reseeding} onClick={() => reseed()}>
            <RotateCcw className="mr-2 h-3.5 w-3.5" /> {reseeding ? "Resetting…" : "Reset sandbox"}
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <SandboxWorkspace />
      </Card>
    </div>
  );
}

export default function ScholarSandbox() {
  return (
    <SandboxProvider initialSource="sandbox">
      <SandboxInner />
    </SandboxProvider>
  );
}
