import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Upload, FileText, X, Sparkles, Loader2, CheckCircle2, FileDown,
  Briefcase, GraduationCap, Code, Paintbrush, Stethoscope, BarChart3,
  Users, Wrench, Copy, RotateCcw, Eye, Edit3
} from 'lucide-react';
import { importFile } from '@/utils/fileImportUtils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import DOMPurify from 'dompurify';
import { DocumentThemeSelector } from '@/components/DocumentThemeSelector';
import { getThemeClass } from '@/utils/documentThemes';

// ──────────────────────────────────────────────
// Resume Templates
// ──────────────────────────────────────────────
interface ResumeTemplate {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  sections: string[];
  tone: string;
  example: string;
}

const RESUME_TEMPLATES: ResumeTemplate[] = [
  {
    id: 'professional',
    name: 'Professional',
    icon: <Briefcase className="h-4 w-4" />,
    description: 'Classic corporate format for business roles',
    sections: ['Professional Summary', 'Experience', 'Education', 'Skills', 'Certifications'],
    tone: 'formal and professional',
    example: `PROFESSIONAL SUMMARY\nResults-driven professional with X+ years...\n\nEXPERIENCE\nJob Title — Company\nMonth Year – Present\n- Achievement with quantified impact\n- Led cross-functional team of X members\n\nEDUCATION\nDegree — University, Year\n\nSKILLS\nSkill 1 • Skill 2 • Skill 3`,
  },
  {
    id: 'tech',
    name: 'Tech / Engineering',
    icon: <Code className="h-4 w-4" />,
    description: 'Optimized for software, data, and engineering roles',
    sections: ['Summary', 'Technical Skills', 'Experience', 'Projects', 'Education'],
    tone: 'technically precise and impact-focused',
    example: `SUMMARY\nFull-stack engineer with X years building scalable systems...\n\nTECHNICAL SKILLS\nLanguages: Python, TypeScript, Go\nFrameworks: React, Node.js, Django\nCloud: AWS, GCP, Docker, K8s\n\nEXPERIENCE\nSoftware Engineer — Company\n- Reduced API latency by 40% through caching redesign\n- Built CI/CD pipeline serving 2M+ requests/day\n\nPROJECTS\nProject Name — Tech stack\n- Description with measurable outcome`,
  },
  {
    id: 'creative',
    name: 'Creative / Design',
    icon: <Paintbrush className="h-4 w-4" />,
    description: 'For designers, writers, and creative professionals',
    sections: ['Creative Profile', 'Selected Work', 'Experience', 'Tools & Skills', 'Education'],
    tone: 'expressive yet polished, showcasing creative vision',
    example: `CREATIVE PROFILE\nMulti-disciplinary designer blending brand strategy with visual storytelling...\n\nSELECTED WORK\nProject — Client/Brand\n- Brief description of creative direction and impact\n\nEXPERIENCE\nSenior Designer — Studio\n- Directed visual identity rebrand reaching 5M+ users\n\nTOOLS & SKILLS\nFigma • Adobe Creative Suite • Motion Design • Prototyping`,
  },
  {
    id: 'academic',
    name: 'Academic / Research',
    icon: <GraduationCap className="h-4 w-4" />,
    description: 'CV format for academia, research, and fellowships',
    sections: ['Research Interests', 'Education', 'Publications', 'Teaching', 'Grants & Awards', 'Conference Presentations'],
    tone: 'scholarly, detailed, and credential-focused',
    example: `RESEARCH INTERESTS\nMachine learning applications in computational biology...\n\nEDUCATION\nPh.D. in Computer Science — University, Year\nDissertation: "Title"\nAdvisor: Dr. Name\n\nPUBLICATIONS\nAuthor et al. (Year). "Paper Title." Journal Name, Vol(Issue), pp.\n\nTEACHING EXPERIENCE\nTeaching Assistant — Course Name\n\nGRANTS & AWARDS\nFellowship/Grant Name — Amount, Year`,
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    icon: <Stethoscope className="h-4 w-4" />,
    description: 'For medical, nursing, and healthcare professionals',
    sections: ['Professional Summary', 'Licenses & Certifications', 'Clinical Experience', 'Education', 'Skills'],
    tone: 'precise, patient-centered, and credential-focused',
    example: `PROFESSIONAL SUMMARY\nCompassionate registered nurse with X years of experience in acute care...\n\nLICENSES & CERTIFICATIONS\nRN License — State, Exp. Date\nBLS, ACLS, PALS Certified\n\nCLINICAL EXPERIENCE\nStaff Nurse — Hospital Name\n- Managed care for 6-8 patients per shift in ICU\n- Reduced medication errors by 15% through protocol improvements\n\nEDUCATION\nBSN — University, Year`,
  },
  {
    id: 'executive',
    name: 'Executive / Leadership',
    icon: <BarChart3 className="h-4 w-4" />,
    description: 'C-suite and senior leadership positions',
    sections: ['Executive Summary', 'Leadership Experience', 'Key Achievements', 'Board Memberships', 'Education'],
    tone: 'strategic, visionary, and results-oriented at scale',
    example: `EXECUTIVE SUMMARY\nTransformational leader with 15+ years driving organizational growth...\n\nLEADERSHIP EXPERIENCE\nChief Technology Officer — Company ($500M revenue)\n- Scaled engineering team from 20 to 150+ across 4 offices\n- Led digital transformation saving $12M annually\n\nKEY ACHIEVEMENTS\n- Grew market share by 35% in 18 months\n- Secured Series C funding of $80M\n\nBOARD MEMBERSHIPS\nOrganization Name — Role, Year–Present`,
  },
  {
    id: 'career-change',
    name: 'Career Change',
    icon: <RotateCcw className="h-4 w-4" />,
    description: 'Highlights transferable skills for career pivots',
    sections: ['Career Objective', 'Transferable Skills', 'Relevant Experience', 'Additional Experience', 'Education & Training'],
    tone: 'forward-looking, emphasizing transferable skills and growth potential',
    example: `CAREER OBJECTIVE\nSeeking to leverage 8 years of project management expertise to transition into product management...\n\nTRANSFERABLE SKILLS\nStakeholder Management • Data Analysis • Agile Methodologies • Cross-functional Leadership\n\nRELEVANT EXPERIENCE\nProject Manager — Company\n- Managed product roadmaps for 3 concurrent initiatives\n- Conducted user research informing feature prioritization\n\nADDITIONAL EXPERIENCE\nPrevious Role — Company\n\nEDUCATION & TRAINING\nProduct Management Certificate — Institution`,
  },
  {
    id: 'entry-level',
    name: 'Entry Level / New Grad',
    icon: <Users className="h-4 w-4" />,
    description: 'For recent graduates and early-career professionals',
    sections: ['Objective', 'Education', 'Projects', 'Internships', 'Skills', 'Activities & Leadership'],
    tone: 'enthusiastic, potential-focused, and education-forward',
    example: `OBJECTIVE\nRecent Computer Science graduate seeking a software engineering role...\n\nEDUCATION\nB.S. Computer Science — University, Year\nGPA: 3.8 | Dean's List | Relevant Coursework: Data Structures, ML, Distributed Systems\n\nPROJECTS\nProject Name — Tech Stack\n- Built full-stack app with 500+ users\n\nINTERNSHIPS\nSoftware Engineering Intern — Company\n- Contributed to production features used by 100K+ users\n\nSKILLS\nPython • React • SQL • Git`,
  },
];

// ──────────────────────────────────────────────
// Constraints & Types
// ──────────────────────────────────────────────
interface ResumeConstraints {
  enforceOnePage: boolean;
  cleanFormatting: boolean;
  extractAtsKeywords: boolean;
  quantifyAchievements: boolean;
  removePronouns: boolean;
  useActionVerbs: boolean;
}

type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'executive';

export function ResumeOptimizer() {
  const { toast } = useToast();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('professional');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('mid');
  const [constraints, setConstraints] = useState<ResumeConstraints>({
    enforceOnePage: true,
    cleanFormatting: true,
    extractAtsKeywords: true,
    quantifyAchievements: true,
    removePronouns: true,
    useActionVerbs: true,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [highlightedKeywords, setHighlightedKeywords] = useState<string[]>([]);
  const [atsScore, setAtsScore] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState('input');
  const [resultView, setResultView] = useState<'preview' | 'raw'>('preview');
  const [documentTheme, setDocumentTheme] = useState('default');

  const currentTemplate = RESUME_TEMPLATES.find(t => t.id === selectedTemplate) || RESUME_TEMPLATES[0];

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

  const applyTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    const tmpl = RESUME_TEMPLATES.find(t => t.id === templateId);
    if (tmpl && !resumeText.trim()) {
      setResumeText(tmpl.example);
    }
  };

  const handleOptimize = async () => {
    if (!resumeText.trim()) {
      toast({ title: 'No resume', description: 'Please upload or paste your resume first.', variant: 'destructive' });
      return;
    }
    setIsProcessing(true);
    setResult(null);
    setHighlightedKeywords([]);
    setAtsScore(null);
    setSuggestions([]);

    try {
      const { data, error } = await supabase.functions.invoke('optimize-resume', {
        body: {
          resumeText,
          jobDescription,
          customInstructions,
          constraints,
          templateId: selectedTemplate,
          templateSections: currentTemplate.sections,
          templateTone: currentTemplate.tone,
          experienceLevel,
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
      setAtsScore(data.atsScore ?? null);
      setSuggestions(data.suggestions || []);
      setActiveTab('result');
      toast({ title: 'Resume optimized!', description: `ATS score: ${data.atsScore ?? '—'}/100 • ${data.keywords?.length || 0} keywords injected.` });
    } catch (err: any) {
      toast({ title: 'Optimization failed', description: err.message || 'Something went wrong.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyResult = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    toast({ title: 'Copied to clipboard' });
  };

  const handleDownloadTxt = () => {
    if (!result) return;
    const blob = new Blob([result], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'optimized-resume.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = async () => {
    if (!result) return;
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const margin = 15;
    const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
    const pageHeight = doc.internal.pageSize.getHeight();

    const lines = result.split('\n');
    let y = 20;
    for (const line of lines) {
      const trimmed = line.trim();
      const isHeader = /^[A-Z\s&]{3,}$/.test(trimmed) && trimmed.length > 2;

      if (isHeader) {
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setFontSize(10.5);
        doc.setFont('helvetica', 'normal');
      }

      const wrapped = doc.splitTextToSize(trimmed || ' ', maxWidth);
      for (const wl of wrapped) {
        if (y + 6 > pageHeight - margin) { doc.addPage(); y = 20; }
        doc.text(wl, margin, y);
        y += isHeader ? 6.5 : 5.5;
      }
      if (isHeader) { y += 1; }
    }

    if (highlightedKeywords.length > 0) {
      doc.setFontSize(1);
      doc.setTextColor(255, 255, 255);
      doc.text(`Keywords: ${highlightedKeywords.join(', ')}`, margin, pageHeight - 2);
    }

    doc.save('optimized-resume.pdf');
  };

  const handleDownloadDocx = async () => {
    if (!result) return;
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');

    const lines = result.split('\n');
    const children: any[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      const isHeader = /^[A-Z\s&]{3,}$/.test(trimmed) && trimmed.length > 2;

      if (!trimmed) {
        children.push(new Paragraph({ text: '' }));
        continue;
      }

      if (isHeader) {
        children.push(new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: trimmed, bold: true, size: 26, font: 'Calibri' })],
          spacing: { before: 200, after: 80 },
        }));
      } else {
        const isBullet = /^[-•]/.test(trimmed);
        children.push(new Paragraph({
          children: [new TextRun({ text: isBullet ? trimmed.replace(/^[-•]\s*/, '') : trimmed, size: 22, font: 'Calibri' })],
          bullet: isBullet ? { level: 0 } : undefined,
          spacing: { after: 40 },
        }));
      }
    }

    if (highlightedKeywords.length > 0) {
      children.push(new Paragraph({ text: '' }));
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: 'CORE COMPETENCIES', bold: true, size: 26, font: 'Calibri' })],
        spacing: { before: 200, after: 80 },
      }));
      children.push(new Paragraph({
        children: [new TextRun({ text: highlightedKeywords.join(' • '), size: 22, font: 'Calibri' })],
      }));
    }

    const docFile = new Document({
      sections: [{ properties: {}, children }],
    });

    const blob = await Packer.toBlob(docFile);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'optimized-resume.docx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearAll = () => {
    setResumeFile(null);
    setResumeText('');
    setJobDescription('');
    setCustomInstructions('');
    setResult(null);
    setHighlightedKeywords([]);
    setAtsScore(null);
    setSuggestions([]);
  };

  // ATS score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="max-w-6xl mx-auto py-4 px-2 md:px-0 space-y-4">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          Resume AI Studio
        </h1>
        <p className="text-sm text-muted-foreground">
          Comprehensive ATS optimization with industry templates, scoring, and multi-format export.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-10">
          <TabsTrigger value="template" className="text-xs sm:text-sm">Template</TabsTrigger>
          <TabsTrigger value="input" className="text-xs sm:text-sm">Input & Settings</TabsTrigger>
          <TabsTrigger value="result" className="text-xs sm:text-sm" disabled={!result && !isProcessing}>
            Result {atsScore !== null && <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0">{atsScore}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* ════════════════ TEMPLATE TAB ════════════════ */}
        <TabsContent value="template" className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Choose a Resume Template</Label>
            <p className="text-xs text-muted-foreground">Select an industry-specific structure. The AI will follow this template's sections and tone.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {RESUME_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => applyTemplate(tmpl.id)}
                className={`relative text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                  selectedTemplate === tmpl.id
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-muted-foreground/40 hover:bg-accent/30 bg-card'
                }`}
              >
                {selectedTemplate === tmpl.id && (
                  <CheckCircle2 className="absolute top-3 right-3 h-4 w-4 text-primary" />
                )}
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-md ${selectedTemplate === tmpl.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {tmpl.icon}
                  </div>
                  <span className="text-sm font-semibold text-foreground">{tmpl.name}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{tmpl.description}</p>
                <div className="flex flex-wrap gap-1 mt-3">
                  {tmpl.sections.slice(0, 3).map((s, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">{s}</Badge>
                  ))}
                  {tmpl.sections.length > 3 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{tmpl.sections.length - 3}</Badge>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Template Preview */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Template Preview — {currentTemplate.name}</Label>
            <div className="border border-border rounded-lg bg-card p-4 max-h-[40vh] overflow-y-auto">
              <div className="space-y-1 mb-3">
                <div className="flex flex-wrap gap-1.5">
                  {currentTemplate.sections.map((s, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Tone: <span className="italic">{currentTemplate.tone}</span></p>
              </div>
              <pre className="whitespace-pre-wrap text-xs text-muted-foreground font-sans leading-relaxed border-t border-border/50 pt-3">
                {currentTemplate.example}
              </pre>
            </div>
          </div>

          <Button onClick={() => setActiveTab('input')} className="w-full sm:w-auto gap-2">
            Continue to Input <span aria-hidden>→</span>
          </Button>
        </TabsContent>

        {/* ════════════════ INPUT TAB ════════════════ */}
        <TabsContent value="input" className="mt-4 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-5">
              {/* Selected template indicator */}
              <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card">
                <div className="p-1.5 rounded-md bg-primary/10 text-primary">{currentTemplate.icon}</div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground">{currentTemplate.name} Template</span>
                  <p className="text-xs text-muted-foreground truncate">{currentTemplate.sections.join(' → ')}</p>
                </div>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setActiveTab('template')}>Change</Button>
              </div>

              {/* Experience Level */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Experience Level</Label>
                <Select value={experienceLevel} onValueChange={(v: ExperienceLevel) => setExperienceLevel(v)}>
                  <SelectTrigger className="bg-card border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entry">Entry Level / New Graduate (0-2 years)</SelectItem>
                    <SelectItem value="mid">Mid-Level Professional (3-7 years)</SelectItem>
                    <SelectItem value="senior">Senior / Staff Level (8-15 years)</SelectItem>
                    <SelectItem value="executive">Executive / C-Suite (15+ years)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40 hover:bg-accent/30'
                    }`}
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onClick={() => document.getElementById('resume-file-input')?.click()}
                  >
                    <Upload className="h-7 w-7 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Drop your resume or click to browse</p>
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
                {!resumeFile && (
                  <Textarea
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    placeholder="Or paste your resume text here..."
                    className="min-h-[100px] text-sm bg-card border-border"
                  />
                )}
              </div>

              {/* Job Description */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Target Job Description</Label>
                <Textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the job posting for ATS keyword extraction and tailoring..."
                  className="min-h-[120px] text-sm bg-card border-border"
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-5">
              {/* Custom Instructions */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Custom Instructions <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="E.g., 'Emphasize leadership', 'Add a summary section', 'Quantify all bullet points'..."
                  className="min-h-[80px] text-sm bg-card border-border"
                />
              </div>

              {/* Constraints */}
              <div className="space-y-3 p-4 border border-border rounded-lg bg-card">
                <Label className="text-sm font-medium text-foreground">AI Optimization Rules</Label>
                {[
                  { key: 'enforceOnePage' as const, label: 'Enforce strict 1-page limit', desc: 'Forces concise output' },
                  { key: 'cleanFormatting' as const, label: 'Clean ATS-safe formatting', desc: 'Headers, bullets, consistent spacing' },
                  { key: 'extractAtsKeywords' as const, label: 'Extract & inject ATS keywords', desc: 'From job description into resume' },
                  { key: 'quantifyAchievements' as const, label: 'Quantify all achievements', desc: 'Add numbers, %, $ where possible' },
                  { key: 'removePronouns' as const, label: 'Remove personal pronouns', desc: 'No I, my, me — standard resume style' },
                  { key: 'useActionVerbs' as const, label: 'Start bullets with action verbs', desc: 'Led, Built, Increased, Designed...' },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-sm text-foreground block">{label}</span>
                      <span className="text-[11px] text-muted-foreground">{desc}</span>
                    </div>
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
                  size="lg"
                >
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {isProcessing ? 'Optimizing...' : 'Optimize Resume'}
                </Button>
                <Button variant="outline" size="lg" onClick={clearAll} disabled={isProcessing}>
                  Clear
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ════════════════ RESULT TAB ════════════════ */}
        <TabsContent value="result" className="mt-4 space-y-4">
          {isProcessing ? (
            <div className="space-y-3 p-6 border border-border rounded-lg bg-card">
              <div className="flex items-center gap-3 mb-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm font-medium text-foreground">Analyzing resume and optimizing...</span>
              </div>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-5 w-1/2 mt-4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ) : result ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Sidebar — Score & Analysis */}
              <div className="space-y-4 lg:col-span-1 order-2 lg:order-1">
                {/* ATS Score */}
                {atsScore !== null && (
                  <div className="border border-border rounded-lg bg-card p-5 text-center space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">ATS Compatibility Score</Label>
                    <div className={`text-5xl font-bold tabular-nums ${getScoreColor(atsScore)}`}>
                      {atsScore}
                    </div>
                    <p className="text-xs text-muted-foreground">out of 100</p>
                    <div className="w-full bg-muted rounded-full h-2 mt-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-700 ${
                          atsScore >= 80 ? 'bg-green-500' : atsScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${atsScore}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Keywords */}
                {highlightedKeywords.length > 0 && (
                  <div className="border border-border rounded-lg bg-card p-4 space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Injected ATS Keywords ({highlightedKeywords.length})</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {highlightedKeywords.map((kw, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          <CheckCircle2 className="h-3 w-3" />
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {suggestions.length > 0 && (
                  <div className="border border-border rounded-lg bg-card p-4 space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Improvement Suggestions</Label>
                    <ul className="space-y-2">
                      {suggestions.map((s, i) => (
                        <li key={i} className="flex gap-2 text-xs text-foreground">
                          <Wrench className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Export */}
                <div className="space-y-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="default" className="w-full gap-2">
                        <FileDown className="h-4 w-4" />
                        Export Resume
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={handleDownloadDocx}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Word (.docx) — Recommended
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleDownloadPdf}>
                        <FileDown className="mr-2 h-4 w-4" />
                        PDF (.pdf)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleDownloadTxt}>
                        <FileText className="mr-2 h-4 w-4" />
                        Plain Text (.txt)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button variant="outline" className="w-full gap-2" onClick={handleCopyResult}>
                    <Copy className="h-4 w-4" />
                    Copy to Clipboard
                  </Button>

                  <Button variant="ghost" className="w-full gap-2 text-muted-foreground" onClick={() => setActiveTab('input')}>
                    <Edit3 className="h-4 w-4" />
                    Edit & Re-optimize
                  </Button>
                </div>
              </div>

              {/* Main — Document Preview */}
              <div className="lg:col-span-2 space-y-2 order-1 lg:order-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-foreground">Optimized Resume</Label>
                  <div className="flex items-center gap-1 border border-border rounded-md p-0.5">
                    <button
                      onClick={() => setResultView('preview')}
                      className={`px-2.5 py-1 rounded text-xs transition-colors ${
                        resultView === 'preview' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Eye className="h-3.5 w-3.5 inline mr-1" />Preview
                    </button>
                    <button
                      onClick={() => setResultView('raw')}
                      className={`px-2.5 py-1 rounded text-xs transition-colors ${
                        resultView === 'raw' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5 inline mr-1" />Raw
                    </button>
                  </div>
                </div>

                <div className="border border-border rounded-lg bg-card max-h-[70vh] overflow-y-auto overscroll-contain">
                  {resultView === 'preview' ? (
                    <div className="p-5 md:p-8 space-y-1">
                      {result.split('\n').map((line, i) => {
                        const trimmed = line.trim();
                        if (!trimmed) return <div key={i} className="h-3" />;
                        const isHeader = /^[A-Z\s&]{3,}$/.test(trimmed) && trimmed.length > 2;
                        const isBullet = /^[-•]/.test(trimmed);

                        if (isHeader) {
                          return (
                            <h3 key={i} className="text-sm font-bold text-foreground tracking-wide uppercase border-b border-border/40 pb-1 pt-3 first:pt-0">
                              {trimmed}
                            </h3>
                          );
                        }
                        if (isBullet) {
                          return (
                            <div key={i} className="flex gap-2 text-sm text-foreground leading-relaxed pl-2">
                              <span className="text-muted-foreground flex-shrink-0">•</span>
                              <span>{trimmed.replace(/^[-•]\s*/, '')}</span>
                            </div>
                          );
                        }
                        return (
                          <p key={i} className="text-sm text-foreground leading-relaxed">{trimmed}</p>
                        );
                      })}
                    </div>
                  ) : (
                    <pre className="p-5 md:p-8 whitespace-pre-wrap text-sm text-foreground font-mono leading-relaxed">{result}</pre>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-border rounded-lg bg-card p-8 md:p-12 flex flex-col items-center justify-center text-center min-h-[300px]">
              <FileText className="h-10 w-10 text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground">Your optimized resume will appear here</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Select a template, upload a resume, and click "Optimize"</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
