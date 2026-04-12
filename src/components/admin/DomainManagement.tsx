import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Shield, Ban, CheckCircle, Trash2, Plus, AlertTriangle, Download, RefreshCw, Bot, User, Clock, Search } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface DomainRestriction {
  id: string;
  domain: string;
  restriction_type: 'banned' | 'allowed';
  reason: string | null;
  created_at: string;
  updated_at: string;
}

export function DomainManagement() {
  const [domains, setDomains] = useState<DomainRestriction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [restrictionType, setRestrictionType] = useState<'banned' | 'allowed'>('banned');
  const [reason, setReason] = useState('');
  const [runningScan, setRunningScan] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('domain_restrictions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDomains((data || []).map(d => ({
        ...d,
        restriction_type: d.restriction_type as 'banned' | 'allowed'
      })));
    } catch (error: any) {
      console.error('Error fetching domains:', error);
      toast({ title: "Error", description: "Failed to fetch domain restrictions", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddDomain = async () => {
    if (!newDomain.trim()) {
      toast({ title: "Error", description: "Please enter a domain", variant: "destructive" });
      return;
    }
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(newDomain.trim())) {
      toast({ title: "Error", description: "Please enter a valid domain (e.g., example.com)", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase
        .from('domain_restrictions')
        .insert({
          domain: newDomain.trim().toLowerCase(),
          restriction_type: restrictionType,
          reason: reason.trim() || null,
        });
      if (error) {
        if (error.code === '23505') {
          toast({ title: "Error", description: "This domain already exists in restrictions", variant: "destructive" });
        } else {
          throw error;
        }
        return;
      }
      toast({ title: "Success", description: `Domain ${restrictionType === 'banned' ? 'banned' : 'added to allowlist'}` });
      fetchDomains();
      setIsAddDialogOpen(false);
      setNewDomain('');
      setReason('');
      setRestrictionType('banned');
    } catch (error: any) {
      console.error('Error adding domain:', error);
      toast({ title: "Error", description: "Failed to add domain restriction", variant: "destructive" });
    }
  };

  const handleDeleteDomain = async (id: string, domain: string) => {
    if (!confirm(`Remove restriction for ${domain}?`)) return;
    try {
      const { error } = await supabase.from('domain_restrictions').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Success", description: "Domain restriction removed" });
      fetchDomains();
    } catch (error: any) {
      console.error('Error deleting domain:', error);
      toast({ title: "Error", description: "Failed to remove domain restriction", variant: "destructive" });
    }
  };

  const handleRunScanNow = async () => {
    setRunningScan(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-blocklist`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      const result = await resp.json();
      toast({
        title: "Scan Complete",
        description: `Added ${result.new_domains} new domains, ${result.skipped} already existed`,
      });
      fetchDomains();
    } catch (error: any) {
      console.error('Error running scan:', error);
      toast({ title: "Error", description: error.message || "Failed to run blocklist scan", variant: "destructive" });
    } finally {
      setRunningScan(false);
    }
  };

  const bannedDomains = domains.filter(d => d.restriction_type === 'banned');
  const allowedDomains = domains.filter(d => d.restriction_type === 'allowed');
  const autoAddedDomains = domains.filter(d => d.reason?.startsWith('Auto-scan:'));
  const manualDomains = domains.filter(d => !d.reason?.startsWith('Auto-scan:'));
  const lastAutoScan = autoAddedDomains.length > 0
    ? autoAddedDomains.reduce((latest, d) => new Date(d.created_at) > new Date(latest.created_at) ? d : latest)
    : null;

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Banned Domains</CardTitle>
            <Ban className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{bannedDomains.length}</div>
            <p className="text-xs text-muted-foreground">Blocked from registration</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Allowed Domains</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{allowedDomains.length}</div>
            <p className="text-xs text-muted-foreground">Explicitly permitted</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto-Added</CardTitle>
            <Bot className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{autoAddedDomains.length}</div>
            <p className="text-xs text-muted-foreground">From threat intelligence feeds</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Auto-Scan</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {lastAutoScan
                ? formatDistanceToNow(new Date(lastAutoScan.created_at), { addSuffix: true })
                : 'Never'}
            </div>
            <p className="text-xs text-muted-foreground">
              {lastAutoScan ? format(new Date(lastAutoScan.created_at), 'MMM dd, yyyy HH:mm') : 'Run your first scan'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main table card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Domain Restrictions
              </CardTitle>
              <CardDescription>
                Manage banned and allowed email domains for user registration
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleRunScanNow}
                disabled={runningScan}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${runningScan ? 'animate-spin' : ''}`} />
                {runningScan ? 'Scanning...' : 'Run Scan Now'}
              </Button>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Domain
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Domain Restriction</DialogTitle>
                    <DialogDescription>
                      Add a new domain to the banned or allowed list
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="domain">Domain</Label>
                      <Input
                        id="domain"
                        placeholder="example.com"
                        value={newDomain}
                        onChange={(e) => setNewDomain(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter domain without @ symbol (e.g., tooolz.com)
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="type">Restriction Type</Label>
                      <Select value={restrictionType} onValueChange={(v) => setRestrictionType(v as 'banned' | 'allowed')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="banned">
                            <span className="flex items-center gap-2">
                              <Ban className="h-3 w-3" />
                              Banned - Block this domain
                            </span>
                          </SelectItem>
                          <SelectItem value="allowed">
                            <span className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3" />
                              Allowed - Explicitly permit
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="reason">Reason (optional)</Label>
                      <Textarea
                        id="reason"
                        placeholder="Why is this domain being restricted?"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddDomain}>Add Domain</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {domains.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No domain restrictions configured</p>
              <p className="text-sm mt-1">Add domains to ban known spam or scam sources, or run an auto-scan</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {domains.map((domain) => {
                    const isAutoAdded = domain.reason?.startsWith('Auto-scan:');
                    return (
                      <TableRow key={domain.id}>
                        <TableCell className="font-medium">{domain.domain}</TableCell>
                        <TableCell>
                          {domain.restriction_type === 'banned' ? (
                            <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                              <Ban className="h-3 w-3" />
                              Banned
                            </Badge>
                          ) : (
                            <Badge variant="default" className="flex items-center gap-1 w-fit bg-green-600">
                              <CheckCircle className="h-3 w-3" />
                              Allowed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {isAutoAdded ? (
                            <Badge variant="outline" className="flex items-center gap-1 w-fit text-[10px]">
                              <Bot className="h-3 w-3" />
                              Auto
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="flex items-center gap-1 w-fit text-[10px]">
                              <User className="h-3 w-3" />
                              Manual
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {domain.reason || '-'}
                        </TableCell>
                        <TableCell>
                          {format(new Date(domain.created_at), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteDomain(domain.id, domain.domain)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
