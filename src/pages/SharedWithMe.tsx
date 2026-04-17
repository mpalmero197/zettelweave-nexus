import { useNavigate } from "react-router-dom";
import { useSharedWithMe, type ShareableItemType } from "@/hooks/useItemSharing";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Inbox, FileText, StickyNote, File as FileIcon, Network, BookOpen, Layers, Pencil, Eye, Copy, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";

const TYPE_META: Record<ShareableItemType, { label: string; icon: any; route: (id: string) => string }> = {
  zettel_card: { label: "Zettel Card", icon: Layers, route: (id) => `/app?tab=cards&id=${id}` },
  note: { label: "Note", icon: FileText, route: (id) => `/app?tab=notes&id=${id}` },
  file: { label: "File", icon: FileIcon, route: (id) => `/app?tab=files&id=${id}` },
  mind_map: { label: "Mind Map", icon: Network, route: (id) => `/app?tab=canvas&id=${id}` },
  catalyst_document: { label: "Catalyst Doc", icon: BookOpen, route: (id) => `/app?tab=catalyst&id=${id}` },
  sticky_note: { label: "Sticky Note", icon: StickyNote, route: (id) => `/app?tab=sticky` },
  scratchpad: { label: "Scratchpad", icon: Pencil, route: () => `/app?tab=scratch` },
};

export default function SharedWithMe() {
  const navigate = useNavigate();
  const { items, loading } = useSharedWithMe();
  const [filter, setFilter] = useState<"all" | "collaborate" | "copy">("all");

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter(i => i.share_mode === filter);
  }, [items, filter]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/app")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Shared with Me</h1>
            <Badge variant="secondary">{items.length}</Badge>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="collaborate"><Sparkles className="h-3 w-3 mr-1" /> Collaborations</TabsTrigger>
            <TabsTrigger value="copy"><Copy className="h-3 w-3 mr-1" /> Copies</TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="mt-4 space-y-2">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Inbox className="h-12 w-12 mx-auto opacity-30 mb-3" />
                <p>Nothing here yet. When friends share items with you, they'll appear here.</p>
              </div>
            ) : (
              filtered.map((item) => {
                const meta = TYPE_META[item.item_type];
                const Icon = meta.icon;
                const targetId = item.share_mode === "copy" ? (item.cloned_item_id || item.item_id) : item.item_id;
                return (
                  <Card key={item.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(meta.route(targetId))}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{meta.label}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {item.share_mode === "copy" ? <><Copy className="h-2.5 w-2.5 mr-1" /> Copy</> : item.permission === "edit" ? <><Pencil className="h-2.5 w-2.5 mr-1" /> Edit</> : <><Eye className="h-2.5 w-2.5 mr-1" /> View</>}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
                        </div>
                        {item.message && <p className="text-xs text-muted-foreground mt-1 truncate">"{item.message}"</p>}
                      </div>
                      <Button size="sm" variant="ghost">Open</Button>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
