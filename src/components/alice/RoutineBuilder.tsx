import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Sparkles, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ABILITIES, ABILITY_BY_ID, type Ability } from "@/lib/macros/abilities";
import { TRIGGERS, TRIGGER_BY_ID, NOTIFICATION_OPTIONS, RUN_MODES } from "@/lib/macros/triggers";

interface StepDraft {
  abilityId: string;
  values: Record<string, string>;
}

const REMINDER_PRESETS = [
  { label: "15 min before", minutes: 15 },
  { label: "1 hour before", minutes: 60 },
  { label: "1 day before", minutes: 1440 },
  { label: "1 week before", minutes: 10080 },
];

/**
 * RoutineBuilder — Google-Routines-style guided macro builder.
 * Opens on `window` event `alice:open-routine-builder` or `?routine=builder` URL param.
 */
export function RoutineBuilder() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startUrl, setStartUrl] = useState("");
  const [triggerId, setTriggerId] = useState("manual");
  const [triggerValues, setTriggerValues] = useState<Record<string, string>>({});
  const [steps, setSteps] = useState<StepDraft[]>([]);
  const [notifyType, setNotifyType] = useState("none");
  const [notifyMessage, setNotifyMessage] = useState("");
  const [reminderOffsets, setReminderOffsets] = useState<number[]>([]);
  const [runMode, setRunMode] = useState("foreground");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("alice:open-routine-builder", handler);
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("routine") === "builder") {
      setOpen(true);
    }
    return () => window.removeEventListener("alice:open-routine-builder", handler);
  }, []);

  const reset = () => {
    setName(""); setDescription(""); setStartUrl("");
    setTriggerId("manual"); setTriggerValues({});
    setSteps([]); setNotifyType("none"); setNotifyMessage("");
    setReminderOffsets([]); setRunMode("foreground");
  };

  const addStep = (abilityId: string) => setSteps((s) => [...s, { abilityId, values: {} }]);
  const removeStep = (i: number) => setSteps((s) => s.filter((_, idx) => idx !== i));
  const updateStepValue = (i: number, name: string, val: string) =>
    setSteps((s) => s.map((st, idx) => (idx === i ? { ...st, values: { ...st.values, [name]: val } } : st)));
  const moveStep = (i: number, dir: -1 | 1) => {
    setSteps((s) => {
      const next = [...s];
      const j = i + dir;
      if (j < 0 || j >= next.length) return s;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const toggleReminder = (m: number) =>
    setReminderOffsets((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m].sort((a, b) => a - b));

  const save = async () => {
    if (!name.trim()) { toast({ title: "Name your routine first." }); return; }
    if (!steps.length) { toast({ title: "Add at least one action." }); return; }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in first");

      const trigger = TRIGGER_BY_ID[triggerId]?.toTrigger(triggerValues) || { type: "manual" };
      const normalizedSteps = steps.map((s) => ABILITY_BY_ID[s.abilityId].toStep(s.values));
      const notification = notifyType === "none" ? { type: "none" } : { type: notifyType, message: notifyMessage || undefined };

      const inferredHost = (trigger as { host?: string }).host
        || (() => { try { return new URL(startUrl).hostname; } catch { return null; } })();

      const { data, error } = await supabase
        .from("alice_macros")
        .insert({
          user_id: user.id,
          name: name.trim(),
          description: description.trim() || null,
          start_url: startUrl.trim() || (trigger as { host?: string }).host ? `https://${(trigger as { host?: string }).host}` : startUrl.trim(),
          target_domain: inferredHost,
          steps: normalizedSteps,
          trigger,
          notification,
          reminder_offsets: reminderOffsets,
          run_mode: runMode,
          source: "routine_builder",
          tags: ["routine"],
        })
        .select("id")
        .single();

      if (error) throw error;

      // Insert reminders if scheduled trigger has a next time and user picked offsets.
      // For non-scheduled triggers, reminders are skipped (no fixed event time).
      toast({ title: `Routine "${name}" saved` });
      reset();
      setOpen(false);
      window.dispatchEvent(new CustomEvent("alice:macros-changed", { detail: { id: data?.id } }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: "Save failed", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const currentTrigger = TRIGGER_BY_ID[triggerId];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            Build a Routine
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* 1. Name */}
          <section className="space-y-2">
            <Label>Name the routine</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Morning email triage" />
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this routine do? (optional)" rows={2} />
          </section>

          {/* 2. Trigger */}
          <section className="space-y-2">
            <Label>What starts it?</Label>
            <Select value={triggerId} onValueChange={(v) => { setTriggerId(v); setTriggerValues({}); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TRIGGERS.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.icon} {t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currentTrigger?.description && (
              <p className="text-xs text-muted-foreground">{currentTrigger.description}</p>
            )}
            {currentTrigger?.fields.map((f) => (
              <div key={f.name} className="space-y-1">
                <Label className="text-xs">{f.label}</Label>
                {f.type === "textarea" ? (
                  <Textarea
                    value={triggerValues[f.name] || ""}
                    onChange={(e) => setTriggerValues({ ...triggerValues, [f.name]: e.target.value })}
                    placeholder={f.placeholder}
                    rows={3}
                  />
                ) : (
                  <Input
                    value={triggerValues[f.name] || ""}
                    onChange={(e) => setTriggerValues({ ...triggerValues, [f.name]: e.target.value })}
                    placeholder={f.placeholder}
                  />
                )}
                {f.help && <p className="text-[10px] text-muted-foreground">{f.help}</p>}
              </div>
            ))}
          </section>

          {/* Optional start URL */}
          <section className="space-y-2">
            <Label>Starting URL (optional)</Label>
            <Input value={startUrl} onChange={(e) => setStartUrl(e.target.value)} placeholder="https://…" />
          </section>

          {/* 3. Actions */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>What are the actions?</Label>
              <Badge variant="secondary" className="text-[10px]">{steps.length} step{steps.length === 1 ? "" : "s"}</Badge>
            </div>
            <div className="space-y-2">
              {steps.map((s, i) => (
                <StepRow
                  key={i}
                  index={i}
                  ability={ABILITY_BY_ID[s.abilityId]}
                  values={s.values}
                  onChange={(name, val) => updateStepValue(i, name, val)}
                  onRemove={() => removeStep(i)}
                  onMoveUp={() => moveStep(i, -1)}
                  onMoveDown={() => moveStep(i, 1)}
                />
              ))}
            </div>
            <AddStepDropdown onPick={addStep} />
          </section>

          {/* 4. Notification */}
          <section className="space-y-2">
            <Label>Notification?</Label>
            <Select value={notifyType} onValueChange={setNotifyType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {NOTIFICATION_OPTIONS.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {notifyType !== "none" && (
              <Input value={notifyMessage} onChange={(e) => setNotifyMessage(e.target.value)} placeholder="Custom message (optional)" />
            )}
          </section>

          {/* 5. Reminder */}
          <section className="space-y-2">
            <Label>Reminder?</Label>
            <div className="flex flex-wrap gap-1.5">
              {REMINDER_PRESETS.map((p) => (
                <Button
                  key={p.minutes}
                  type="button"
                  variant={reminderOffsets.includes(p.minutes) ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => toggleReminder(p.minutes)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">Reminders fire relative to the next scheduled run.</p>
          </section>

          {/* 6. Run mode */}
          <section className="space-y-2">
            <Label>Run mode</Label>
            <Select value={runMode} onValueChange={setRunMode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RUN_MODES.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); setOpen(false); }}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save routine"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepRow({
  index, ability, values, onChange, onRemove, onMoveUp, onMoveDown,
}: {
  index: number;
  ability: Ability;
  values: Record<string, string>;
  onChange: (name: string, val: string) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  if (!ability) return null;
  return (
    <div className="border border-border/60 rounded-lg p-3 bg-card/40 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <button type="button" onClick={onMoveUp} className="text-[9px] text-muted-foreground hover:text-foreground leading-none">▲</button>
          <button type="button" onClick={onMoveDown} className="text-[9px] text-muted-foreground hover:text-foreground leading-none">▼</button>
        </div>
        <GripVertical className="w-3 h-3 text-muted-foreground" />
        <div className="flex-1 text-sm font-medium">
          {index + 1}. {ability.icon} {ability.label}
        </div>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onRemove}>
          <X className="w-3 h-3" />
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">{ability.description}</p>
      {ability.fields.map((f) => (
        <div key={f.name} className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">{f.label}</Label>
          {f.type === "textarea" || f.type === "json" ? (
            <Textarea
              value={values[f.name] || ""}
              onChange={(e) => onChange(f.name, e.target.value)}
              placeholder={f.placeholder}
              rows={f.type === "json" ? 4 : 2}
              className={f.type === "json" ? "font-mono text-xs" : ""}
            />
          ) : (
            <Input
              type={f.type === "number" ? "number" : "text"}
              value={values[f.name] || ""}
              onChange={(e) => onChange(f.name, e.target.value)}
              placeholder={f.placeholder}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function AddStepDropdown({ onPick }: { onPick: (id: string) => void }) {
  const [val, setVal] = useState<string>("");
  return (
    <Select
      value={val}
      onValueChange={(v) => { onPick(v); setVal(""); }}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={<span className="flex items-center gap-2 text-muted-foreground"><Plus className="w-3 h-3" /> Add an action…</span> as unknown as string} />
      </SelectTrigger>
      <SelectContent>
        {ABILITIES.map((a) => (
          <SelectItem key={a.id} value={a.id}>{a.icon} {a.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
