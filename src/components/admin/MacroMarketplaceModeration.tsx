import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Check, X, Eye, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";

interface Sub {
  id: string;
  status: string;
  title: string;
  description: string | null;
  tags: string[];
  start_url: string;
  target_domain: string | null;
  steps_snapshot: any[];
  submitted_at: string;
  rejection_reason: string | null;
  user_id: string;
}

export function MacroMarketplaceModeration() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState("pending");
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<Sub | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = async (status: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("macro_marketplace_submissions")
      .select("*")
      .eq("status", status)
      .order("submitted_at", { ascending: false })
      .limit(200);
    setSubs((data as Sub[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(tab); }, [tab]);

  const approve = async (s: Sub) => {
    const { error } = await supabase
      .from("macro_marketplace_submissions")
      .update({ status: "approved", reviewer_id: user?.id, reviewed_at: new Date().toISOString(), rejection_reason: null })
      .eq("id", s.id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Approved" }); load(tab); setPreview(null); }
  };

  const reject = async (s: Sub) => {
    const reason = rejectReason || prompt("Reason for rejection?") || "";
    if (!reason) return;
    const { error } = await supabase
      .from("macro_marketplace_submissions")
      .update({ status: "rejected", reviewer_id: user?.id, reviewed_at: new Date().toISOString(), rejection_reason: reason })
      .eq("id", s.id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Rejected" }); load(tab); setPreview(null); setRejectReason(""); }
  };

  const remove = async (s: Sub) => {
    if (!confirm("Remove this submission from public view?")) return;
    const { error } = await supabase
      .from("macro_marketplace_submissions")
      .update({ status: "removed", reviewer_id: user?.id, reviewed_at: new Date().toISOString() })
      .eq("id", s.id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Removed" }); load(tab); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Macro Marketplace Moderation</CardTitle>
          <CardDescription>Review user-submitted macros before they appear publicly.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="removed">Removed</TabsTrigger>
            </TabsList>
            <TabsContent value={tab} className="space-y-2 mt-4">
              {loading ? (
                <div className="flex justify-center p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : subs.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 text-center">Nothing here.</p>
              ) : (
                subs.map((s) => (
                  <Card key={s.id}>
                    <CardContent className="p-3 flex items-start gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold">{s.title}</div>
                        <p className="text-xs text-muted-foreground truncate">{s.description || s.start_url}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {s.tags?.map((t) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                          <Badge variant="secondary" className="text-xs">{(s.steps_snapshot || []).length} steps</Badge>
                          {s.target_domain && <Badge variant="secondary" className="text-xs">{s.target_domain}</Badge>}
                        </div>
                        {s.rejection_reason && <p className="text-xs text-destructive mt-1">Rejected: {s.rejection_reason}</p>}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button size="sm" variant="outline" onClick={() => setPreview(s)}><Eye className="h-4 w-4" /></Button>
                        {tab === "pending" && (
                          <>
                            <Button size="sm" variant="default" onClick={() => approve(s)}><Check className="h-4 w-4" /></Button>
                            <Button size="sm" variant="destructive" onClick={() => reject(s)}><X className="h-4 w-4" /></Button>
                          </>
                        )}
                        {tab === "approved" && (
                          <Button size="sm" variant="destructive" onClick={() => remove(s)}><Trash2 className="h-4 w-4" /></Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {preview && (
            <>
              <DialogHeader><DialogTitle>{preview.title}</DialogTitle></DialogHeader>
              <p className="text-sm text-muted-foreground">{preview.description}</p>
              <p className="text-xs text-muted-foreground">Start: <code>{preview.start_url}</code></p>
              <ol className="space-y-1 text-sm border rounded-md p-3 max-h-72 overflow-y-auto">
                {(preview.steps_snapshot as any[]).map((s, i) => (
                  <li key={i}>
                    <Badge variant="outline" className="mr-1 text-xs">{i + 1}. {s.action}</Badge>
                    <span className="text-xs">{s.url || s.selector || s.prompt || s.text || s.note || ""}</span>
                  </li>
                ))}
              </ol>
              {preview.status === "pending" && (
                <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Optional rejection reason…" rows={2} />
              )}
              <DialogFooter>
                {preview.status === "pending" && (
                  <>
                    <Button variant="destructive" onClick={() => reject(preview)}><X className="h-4 w-4 mr-1" />Reject</Button>
                    <Button onClick={() => approve(preview)}><Check className="h-4 w-4 mr-1" />Approve</Button>
                  </>
                )}
                <Button variant="outline" onClick={() => setPreview(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
