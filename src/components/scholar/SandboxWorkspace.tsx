import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, FlaskConical, BookOpen, StickyNote, Layers } from "lucide-react";
import { toast } from "sonner";

type Tab = "notebooks" | "notes" | "cards";

interface Props {
  /** Restrict to a single surface for embedded lesson try-its */
  only?: Tab;
  className?: string;
  /** Compact = no header, smaller padding */
  compact?: boolean;
}

export function SandboxWorkspace({ only, className, compact = false }: Props) {
  const [tab, setTab] = useState<Tab>(only ?? "notes");
  const [notebooks, setNotebooks] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [nb, n, c] = await Promise.all([
      (supabase as any).from("sandbox_notebooks").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("sandbox_notes").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("sandbox_zettel_cards").select("*").order("created_at", { ascending: false }),
    ]);
    setNotebooks(nb.data ?? []);
    setNotes(n.data ?? []);
    setCards(c.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // --- mutations ---
  const createNotebook = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await (supabase as any).from("sandbox_notebooks").insert({
      user_id: u.user.id, name: "Untitled notebook",
    });
    if (error) toast.error(error.message); else { toast.success("Notebook created"); load(); }
  };
  const renameNotebook = async (id: string, name: string) => {
    await (supabase as any).from("sandbox_notebooks").update({ name }).eq("id", id);
  };
  const deleteNotebook = async (id: string) => {
    await (supabase as any).from("sandbox_notebooks").delete().eq("id", id);
    load();
  };

  const createNote = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await (supabase as any).from("sandbox_notes").insert({
      user_id: u.user.id, title: "Untitled note", content: "",
    });
    if (error) toast.error(error.message); else { toast.success("Note created"); load(); }
  };
  const saveNote = async (id: string, patch: any) => {
    await (supabase as any).from("sandbox_notes").update(patch).eq("id", id);
  };
  const deleteNote = async (id: string) => {
    await (supabase as any).from("sandbox_notes").delete().eq("id", id);
    load();
  };

  const createCard = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await (supabase as any).from("sandbox_zettel_cards").insert({
      user_id: u.user.id, title: "Untitled card", content: "", category: "concept",
    });
    if (error) toast.error(error.message); else { toast.success("Card created"); load(); }
  };
  const saveCard = async (id: string, patch: any) => {
    await (supabase as any).from("sandbox_zettel_cards").update(patch).eq("id", id);
  };
  const deleteCard = async (id: string) => {
    await (supabase as any).from("sandbox_zettel_cards").delete().eq("id", id);
    load();
  };

  const onlyMode = !!only;

  return (
    <div className={className}>
      {!compact && (
        <div className="flex items-center gap-2 mb-3 text-xs text-primary">
          <FlaskConical className="h-3.5 w-3.5" />
          Sandbox — changes here never touch your real workspace.
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        {!onlyMode && (
          <TabsList className="mb-3">
            <TabsTrigger value="notebooks"><Layers className="mr-1.5 h-3.5 w-3.5" />Notebooks</TabsTrigger>
            <TabsTrigger value="notes"><StickyNote className="mr-1.5 h-3.5 w-3.5" />Notes</TabsTrigger>
            <TabsTrigger value="cards"><BookOpen className="mr-1.5 h-3.5 w-3.5" />Cards</TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="notebooks" className="space-y-2">
          <Button size="sm" onClick={createNotebook}><Plus className="mr-1 h-3.5 w-3.5" />New notebook</Button>
          {loading ? <p className="text-xs text-muted-foreground">Loading…</p> :
            notebooks.length === 0 ? <p className="text-xs text-muted-foreground">No notebooks yet. Click "New notebook".</p> :
            notebooks.map((nb) => (
              <Card key={nb.id} className="p-3 flex items-center gap-2">
                <Input
                  defaultValue={nb.name}
                  onBlur={(e) => renameNotebook(nb.id, e.target.value)}
                  className="h-8"
                />
                <Button size="icon" variant="ghost" onClick={() => deleteNotebook(nb.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </Card>
            ))
          }
        </TabsContent>

        <TabsContent value="notes" className="space-y-2">
          <Button size="sm" onClick={createNote}><Plus className="mr-1 h-3.5 w-3.5" />New note</Button>
          {loading ? <p className="text-xs text-muted-foreground">Loading…</p> :
            notes.length === 0 ? <p className="text-xs text-muted-foreground">No notes yet. Try creating one — wikilinks like <code>[[idea]]</code> work in the real app too.</p> :
            notes.map((n) => <NoteEditor key={n.id} note={n} onSave={(p) => saveNote(n.id, p)} onDelete={() => deleteNote(n.id)} />)
          }
        </TabsContent>

        <TabsContent value="cards" className="space-y-2">
          <Button size="sm" onClick={createCard}><Plus className="mr-1 h-3.5 w-3.5" />New Zettel card</Button>
          {loading ? <p className="text-xs text-muted-foreground">Loading…</p> :
            cards.length === 0 ? <p className="text-xs text-muted-foreground">No cards yet. Cards are atomic ideas you connect over time.</p> :
            cards.map((c) => <CardEditor key={c.id} card={c} onSave={(p) => saveCard(c.id, p)} onDelete={() => deleteCard(c.id)} />)
          }
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NoteEditor({ note, onSave, onDelete }: { note: any; onSave: (p: any) => void; onDelete: () => void }) {
  const [title, setTitle] = useState(note.title || "");
  const [content, setContent] = useState(note.content || "");
  const [dirty, setDirty] = useState(false);
  return (
    <Card className="p-3 space-y-2">
      <div className="flex gap-2">
        <Input value={title} onChange={(e) => { setTitle(e.target.value); setDirty(true); }} className="h-8 font-medium" />
        <Button size="icon" variant="ghost" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
      <Textarea value={content} onChange={(e) => { setContent(e.target.value); setDirty(true); }} rows={3} className="text-sm" placeholder="Write your note…" />
      {dirty && (
        <Button size="sm" variant="secondary" onClick={() => { onSave({ title, content }); setDirty(false); }}>
          <Save className="mr-1 h-3.5 w-3.5" />Save
        </Button>
      )}
    </Card>
  );
}

function CardEditor({ card, onSave, onDelete }: { card: any; onSave: (p: any) => void; onDelete: () => void }) {
  const [title, setTitle] = useState(card.title || "");
  const [content, setContent] = useState(card.content || "");
  const [category, setCategory] = useState(card.category || "concept");
  const [dirty, setDirty] = useState(false);
  return (
    <Card className="p-3 space-y-2">
      <div className="flex gap-2 items-center">
        <Input value={title} onChange={(e) => { setTitle(e.target.value); setDirty(true); }} className="h-8 font-medium" />
        <Badge variant="outline">{category}</Badge>
        <Button size="icon" variant="ghost" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
      <Textarea value={content} onChange={(e) => { setContent(e.target.value); setDirty(true); }} rows={3} className="text-sm" placeholder="The idea on this card…" />
      <div className="flex gap-2">
        <Input value={category} onChange={(e) => { setCategory(e.target.value); setDirty(true); }} className="h-7 text-xs max-w-[140px]" placeholder="category" />
        {dirty && (
          <Button size="sm" variant="secondary" onClick={() => { onSave({ title, content, category }); setDirty(false); }}>
            <Save className="mr-1 h-3.5 w-3.5" />Save
          </Button>
        )}
      </div>
    </Card>
  );
}
