import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";
import { ABILITIES } from "@/lib/macros/abilities";

export interface MacroEditable {
  id: string;
  name: string;
  description: string | null;
  start_url: string;
  target_domain: string | null;
  tags: string[] | null;
  steps: any[];
}

interface Props {
  macro: MacroEditable | null;
  onClose: () => void;
  onSaved: () => void;
}

const ACTION_OPTIONS = [
  "navigate",
  "click",
  "fill",
  "hover",
  "select_option",
  "wait",
  "wait_for",
  "press_key",
  "scroll",
  "scroll_window",
  "ask",
  "pause",
  "set_var",
  "extract_text",
  "copy_to_clipboard",
  "notify",
  "navigate_back",
  "reload",
  "login_vault",
  "extract_to_card",
  "summarize_page",
  "alice_chat",
  "alice_plan",
  "run_macro",
  "custom",
];

function emptyStep() {
  return { action: "click", selector: "" } as any;
}

export default function MacroEditor({ macro, onClose, onSaved }: Props) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startUrl, setStartUrl] = useState("");
  const [targetDomain, setTargetDomain] = useState("");
  const [tags, setTags] = useState("");
  const [steps, setSteps] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!macro) return;
    setName(macro.name || "");
    setDescription(macro.description || "");
    setStartUrl(macro.start_url || "");
    setTargetDomain(macro.target_domain || "");
    setTags((macro.tags || []).join(", "));
    setSteps(Array.isArray(macro.steps) ? JSON.parse(JSON.stringify(macro.steps)) : []);
  }, [macro?.id]);

  if (!macro) return null;

  const move = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= steps.length) return;
    const next = [...steps];
    [next[i], next[j]] = [next[j], next[i]];
    setSteps(next);
  };

  const updateStep = (i: number, patch: any) => {
    const next = [...steps];
    next[i] = { ...next[i], ...patch };
    setSteps(next);
  };

  const removeStep = (i: number) => setSteps(steps.filter((_, k) => k !== i));
  const addStep = () => setSteps([...steps, emptyStep()]);

  const save = async () => {
    setSaving(true);
    try {
      const cleaned = steps.map((s) => {
        if (s.action === "custom" && typeof s.json === "string") {
          try { return JSON.parse(s.json); } catch { return s; }
        }
        return s;
      });
      const payload = {
        name: name.trim() || "Untitled",
        description: description.trim() || null,
        start_url: startUrl.trim() || null,
        target_domain: targetDomain.trim() || null,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        steps: cleaned,
        last_error: null,
        last_error_step: null,
      } as any;

      const isNew = !macro.id || macro.id === "__new__";
      if (isNew) {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) throw new Error("Sign in required");
        const { error } = await supabase
          .from("alice_macros")
          .insert({ ...payload, user_id: u.user.id, source: "builder" } as any);
        if (error) throw error;
        toast({ title: "Macro created" });
      } else {
        const { error } = await supabase
          .from("alice_macros")
          .update(payload)
          .eq("id", macro.id);
        if (error) throw error;
        toast({ title: "Macro saved" });
      }
      onSaved();
      onClose();
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const isNew = !macro.id || macro.id === "__new__";
  return (
    <Dialog open={!!macro} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? "Build a new macro" : "Edit macro"}</DialogTitle>
          <DialogDescription>
            Tweak the metadata, reorder steps, or update selectors and values. Use{" "}
            <code>{`{{vault.username}}`}</code>, <code>{`{{vault.password}}`}</code> or{" "}
            <code>{`{{var.name}}`}</code> for dynamic values.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Target domain</label>
              <Input
                value={targetDomain}
                onChange={(e) => setTargetDomain(e.target.value)}
                placeholder="example.com"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Start URL</label>
              <Input value={startUrl} onChange={(e) => setStartUrl(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Tags</label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="banking, signup"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2 mt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Steps ({steps.length})</h4>
            <Button size="sm" variant="outline" onClick={addStep}>
              <Plus className="h-4 w-4 mr-1" /> Add step
            </Button>
          </div>

          {steps.length === 0 && (
            <p className="text-xs text-muted-foreground">No steps yet. Add one to begin.</p>
          )}

          <ol className="space-y-2">
            {steps.map((s, i) => (
              <li
                key={i}
                className="border rounded-md p-3 space-y-2 bg-card/40"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="tabular-nums">
                    {i + 1}
                  </Badge>
                  <Select
                    value={s.action || "click"}
                    onValueChange={(v) => updateStep(i, { action: v })}
                  >
                    <SelectTrigger className="h-8 w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTION_OPTIONS.map((a) => (
                        <SelectItem key={a} value={a}>
                          {ABILITIES.find((ab) => ab.toStep({}).action === a)?.icon || "•"} {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="ml-auto flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => move(i, -1)}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => move(i, 1)}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => removeStep(i)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <StepFields step={s} onChange={(patch) => updateStep(i, patch)} />
              </li>
            ))}
          </ol>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepFields({
  step,
  onChange,
}: {
  step: any;
  onChange: (patch: any) => void;
}) {
  const action = step.action || "click";

  // Fields per action
  switch (action) {
    case "navigate":
      return <FieldRow label="URL" value={step.url || ""} onChange={(v) => onChange({ url: v })} placeholder="https://…" />;
    case "click":
    case "wait_for":
      return <FieldRow label="Selector" value={step.selector || ""} onChange={(v) => onChange({ selector: v })} placeholder="button[type='submit']" />;
    case "fill":
      return (
        <>
          <FieldRow label="Selector" value={step.selector || ""} onChange={(v) => onChange({ selector: v })} />
          <FieldRow label="Value" value={String(step.value ?? "")} onChange={(v) => onChange({ value: v })} placeholder="{{vault.username}} or text" />
        </>
      );
    case "login_vault":
      return (
        <>
          <FieldRow label="Username selector" value={step.user_selector || ""} onChange={(v) => onChange({ user_selector: v })} />
          <FieldRow label="Password selector" value={step.pass_selector || ""} onChange={(v) => onChange({ pass_selector: v })} />
          <FieldRow label="Vault item (optional)" value={step.item || ""} onChange={(v) => onChange({ item: v })} placeholder="Leave blank to auto-match host" />
        </>
      );
    case "wait":
      return <FieldRow label="Milliseconds" value={String(step.ms ?? 1000)} onChange={(v) => onChange({ ms: Number(v) || 0 })} placeholder="1500" />;
    case "press_key":
      return <FieldRow label="Key" value={step.key || ""} onChange={(v) => onChange({ key: v })} placeholder="Enter" />;
    case "scroll":
      return <FieldRow label="Selector or 'bottom'" value={step.selector || step.target || ""} onChange={(v) => onChange({ selector: v })} placeholder="bottom" />;
    case "ask":
      return (
        <>
          <FieldRow label="Prompt" value={step.prompt || ""} onChange={(v) => onChange({ prompt: v })} />
          <FieldRow label="Options (comma-separated)" value={(step.options || []).join(", ")} onChange={(v) => onChange({ options: v.split(",").map((s) => s.trim()).filter(Boolean) })} />
          <FieldRow label="Variable name" value={step.var || ""} onChange={(v) => onChange({ var: v })} placeholder="answer" />
        </>
      );
    case "pause":
      return (
        <>
          <FieldRow label="Instruction" value={step.prompt || ""} onChange={(v) => onChange({ prompt: v })} placeholder="Solve the CAPTCHA, then continue." />
          <FieldRow label="Highlight selector (optional)" value={step.selector || ""} onChange={(v) => onChange({ selector: v })} />
        </>
      );
    case "extract_to_card":
      return (
        <>
          <FieldRow label="Selector to extract" value={step.selector || ""} onChange={(v) => onChange({ selector: v })} />
          <FieldRow label="Card title" value={step.title || ""} onChange={(v) => onChange({ title: v })} />
        </>
      );
    case "summarize_page":
      return <FieldRow label="Notebook (optional)" value={step.notebook || ""} onChange={(v) => onChange({ notebook: v })} />;
    case "alice_chat":
      return <FieldArea label="Prompt" value={step.prompt || ""} onChange={(v) => onChange({ prompt: v })} />;
    case "alice_plan":
      return <FieldArea label="Goal" value={step.goal || ""} onChange={(v) => onChange({ goal: v })} />;
    case "run_macro":
      return <FieldRow label="Macro ID" value={step.macro_id || ""} onChange={(v) => onChange({ macro_id: v })} />;
    case "hover":
      return <FieldRow label="Selector" value={step.selector || ""} onChange={(v) => onChange({ selector: v })} />;
    case "select_option":
      return (
        <>
          <FieldRow label="Select element" value={step.selector || ""} onChange={(v) => onChange({ selector: v })} placeholder="select[name='country']" />
          <FieldRow label="Option value" value={String(step.value ?? "")} onChange={(v) => onChange({ value: v })} />
        </>
      );
    case "set_var":
      return (
        <>
          <FieldRow label="Variable" value={step.var || ""} onChange={(v) => onChange({ var: v })} placeholder="topic" />
          <FieldRow label="Value" value={String(step.value ?? "")} onChange={(v) => onChange({ value: v })} />
        </>
      );
    case "extract_text":
      return (
        <>
          <FieldRow label="Selector" value={step.selector || ""} onChange={(v) => onChange({ selector: v })} />
          <FieldRow label="Variable" value={step.var || ""} onChange={(v) => onChange({ var: v })} placeholder="value" />
        </>
      );
    case "copy_to_clipboard":
      return (
        <>
          <FieldRow label="Selector (optional)" value={step.selector || ""} onChange={(v) => onChange({ selector: v })} />
          <FieldRow label="Literal text (if no selector)" value={String(step.value ?? "")} onChange={(v) => onChange({ value: v })} />
        </>
      );
    case "notify":
      return (
        <>
          <FieldRow label="Title" value={step.title || ""} onChange={(v) => onChange({ title: v })} placeholder="Done!" />
          <FieldRow label="Message" value={step.message || ""} onChange={(v) => onChange({ message: v })} />
        </>
      );
    case "scroll_window":
      return <FieldRow label="top or bottom" value={step.target || "bottom"} onChange={(v) => onChange({ target: v })} />;
    case "navigate_back":
    case "reload":
      return <p className="text-xs text-muted-foreground">No parameters.</p>;
    default:
      return (
        <FieldArea
          label="Step JSON"
          value={JSON.stringify(step, null, 2)}
          onChange={(v) => {
            try {
              const parsed = JSON.parse(v);
              onChange(parsed);
            } catch {
              onChange({ _raw: v });
            }
          }}
          mono
        />
      );
  }
}

function FieldRow({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-8" />
    </div>
  );
}

function FieldArea({
  label,
  value,
  onChange,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className={mono ? "font-mono text-xs" : ""}
      />
    </div>
  );
}
