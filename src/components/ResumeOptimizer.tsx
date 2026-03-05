import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, X, Download, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { importFile } from '@/utils/fileImportUtils';
import DOMPurify from 'dompurify';

interface ResumeConstraints {
  enforceOnePage: boolean;
  cleanFormatting: boolean;
  extractAtsKeywords: boolean;
}

export function ResumeOptimizer() {
  const { toast } = useToast();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [constraints, setConstraints] = useState<ResumeConstraints>({
    enforceOnePage: true,
    cleanFormatting: true,
    extractAtsKeywords: true,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [highlightedKeywords, setHighlightedKeywords] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const handleFileDrop = useCallback(async (files: FileList | File[]) => {
    const file = Array.from(files)[0];
    if (!file) return;
    const allowed = /\.(pdf|docx?|txt|md)$/i;
    if (!allowed.test(file.name)) {
      toast({ title: 'Unsupported file', description: 'Please upload a PDF, DOCX, TXT, or MD file.', variant: 'destructive' });
      return;
    }
    setResumeFile(file);
    try {
      const imported = await importFile(file);
      // Strip HTML tags for plain text
      const tmp = document.createElement('div');
      tmp.innerHTML = imported.content;
      setResumeText(tmp.textContent || tmp.innerText || '');
    } catch {
      toast({ title: 'Import failed', description: 'Could not read file contents.', variant: 'destructive' });
    }
  }, [toast]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileDrop(e.dataTransfer.files);
  };

  const handleOptimize = async () => {
    if (!resumeText.trim()) {
      toast({ title: 'No resume', description: 'Please upload or paste your resume first.', variant: 'destructive' });
      return;
    }
    setIsProcessing(true);
    setResult(null);
    setHighlightedKeywords([]);

    try {
      const { data, error } = await supabase.functions.invoke('optimize-resume', {
        body: {
          resumeText,
          jobDescription,
          customInstructions,
          constraints,
        },
      });

      if (error) throw error;
      if (data?.error) {
        if (data.error.includes('Rate limit') || data.error.includes('429')) {
          toast({ title: 'Rate limited', description: 'Too many requests. Please wait a moment and try again.', variant: 'destructive' });
        } else if (data.error.includes('402') || data.error.includes('Payment')) {
          toast({ title: 'Credits exhausted', description: 'Please add credits to your Lovable workspace.', variant: 'destructive' });
        } else {
          toast({ title: 'Error', description: data.error, variant: 'destructive' });
        }
        return;
      }

      setResult(data.optimizedResume || '');
      setHighlightedKeywords(data.keywords || []);
      toast({ title: 'Resume optimized!', description: `${data.keywords?.length || 0} ATS keywords injected.` });
    } catch (err: any) {
      toast({ title: 'Optimization failed', description: err.message || 'Something went wrong.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'optimized-resume.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearAll = () => {
    setResumeFile(null);
    setResumeText('');
    setJobDescription('');
    setCustomInstructions('');
    setResult(null);
    setHighlightedKeywords([]);
  };

  return (
    <div className="max-w-5xl mx-auto py-4 px-2 md:px-0 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          Resume Optimizer
        </h1>
        <p className="text-sm text-muted-foreground">
          AI-powered ATS optimization. Upload your resume, paste a job description, and get a tailored result.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column — Inputs */}
        <div className="space-y-5">
          {/* Upload Zone */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Resume</Label>
            {resumeFile ? (
              <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-card">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <span className="text-sm truncate flex-1 text-foreground">{resumeFile.name}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setResumeFile(null); setResumeText(''); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40 hover:bg-accent/30'
                }`}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => document.getElementById('resume-file-input')?.click()}
              >
                <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Drop your resume here or click to browse</p>
                <p className="text-xs text-muted-foreground/70 mt-1">PDF, DOCX, TXT, MD</p>
                <input
                  id="resume-file-input"
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.md"
                  className="hidden"
                  onChange={(e) => e.target.files && handleFileDrop(e.target.files)}
                />
              </div>
            )}
            {/* Fallback paste area */}
            {!resumeFile && (
              <Textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Or paste your resume text here..."
                className="min-h-[120px] text-sm bg-card border-border"
              />
            )}
          </div>

          {/* Job Description */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Job Description</Label>
            <Textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the target job description for ATS keyword extraction..."
              className="min-h-[140px] text-sm bg-card border-border"
            />
          </div>

          {/* Custom Instructions */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Custom Instructions <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="E.g., 'Emphasize leadership experience', 'Add a summary section', 'Rewrite bullet points with quantified impact'..."
              className="min-h-[80px] text-sm bg-card border-border"
            />
          </div>

          {/* Constraints */}
          <div className="space-y-3 p-4 border border-border rounded-lg bg-card">
            <Label className="text-sm font-medium text-foreground">AI Constraints</Label>
            {[
              { key: 'enforceOnePage' as const, label: 'Enforce strict 1-page limit' },
              { key: 'cleanFormatting' as const, label: 'Apply clean document formatting' },
              { key: 'extractAtsKeywords' as const, label: 'Extract & inject ATS keywords into Skills section' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <span className="text-sm text-foreground">{label}</span>
                <Switch
                  checked={constraints[key]}
                  onCheckedChange={(v) => setConstraints(prev => ({ ...prev, [key]: v }))}
                />
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleOptimize}
              disabled={isProcessing || !resumeText.trim()}
              className="flex-1 gap-2"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isProcessing ? 'Optimizing...' : 'Optimize Resume'}
            </Button>
            <Button variant="outline" onClick={clearAll} disabled={isProcessing}>
              Clear
            </Button>
          </div>
        </div>

        {/* Right Column — Results */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-foreground">Optimized Result</Label>

          {isProcessing ? (
            <div className="space-y-3 p-4 border border-border rounded-lg bg-card">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-5 w-1/2 mt-4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : result ? (
            <div className="space-y-3">
              {/* Keywords badge row */}
              {highlightedKeywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {highlightedKeywords.map((kw, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      <CheckCircle2 className="h-3 w-3" />
                      {kw}
                    </span>
                  ))}
                </div>
              )}

              {/* Document preview */}
              <div className="border border-border rounded-lg bg-card p-4 md:p-6 max-h-[60vh] overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-foreground font-sans leading-relaxed">{result}</pre>
              </div>

              <Button onClick={handleDownload} variant="outline" className="w-full gap-2">
                <Download className="h-4 w-4" />
                Export as Text
              </Button>
            </div>
          ) : (
            <div className="border border-border rounded-lg bg-card p-8 md:p-12 flex flex-col items-center justify-center text-center min-h-[300px]">
              <FileText className="h-10 w-10 text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground">Your optimized resume will appear here</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Upload a resume and click "Optimize" to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
