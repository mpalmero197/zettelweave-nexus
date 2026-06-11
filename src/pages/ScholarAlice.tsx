import { ALICE_DEEP_DIVE } from "@/lib/scholar/registry";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ScholarAlice() {
  const navigate = useNavigate();
  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/scholar")}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Scholar
      </Button>

      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <Sparkles className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-semibold tracking-tight">ALICE Deep Dive</h1>
        </div>
        <p className="text-muted-foreground">Every capability ALICE brings to your knowledge work. Tap any card to try it live in the sandbox.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ALICE_DEEP_DIVE.map(cap => (
          <Card key={cap.slug} className="p-5 space-y-3 hover:border-primary/50 transition-colors">
            <h3 className="font-semibold">{cap.title}</h3>
            <p className="text-sm text-muted-foreground">{cap.benefit}</p>
            <Button size="sm" variant="secondary" onClick={() => navigate(`/alice?deepdive=${cap.slug}`)}>
              <Sparkles className="mr-2 h-3 w-3" /> Try it
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
