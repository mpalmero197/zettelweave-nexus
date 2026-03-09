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
    example: `ALEXANDER WRIGHT
San Francisco, CA | (555) 123-4567 | alexander.wright@email.com | linkedin.com/in/alexwright

PROFESSIONAL SUMMARY
Results-driven Operations Manager with 8+ years of experience optimizing supply chain workflows and reducing operational costs. Proven track record of leading cross-functional teams of 20+ members to streamline processes, improving overall efficiency by 25%. Adept at strategic planning, vendor negotiation, and implementing data-driven solutions to achieve business objectives.

EXPERIENCE
Operations Manager — Nexus Logistics, San Francisco, CA
March 2019 – Present
- Spearheaded the redesign of the inventory management system, reducing stock discrepancies by 40% and saving $1.2M annually.
- Led a team of 25 logistics specialists, achieving a 98% on-time delivery rate over 4 consecutive quarters.
- Negotiated new vendor contracts that decreased procurement costs by 15% without compromising quality.

Operations Coordinator — Horizon Supply Co., Seattle, WA
June 2015 – February 2019
- Managed daily warehouse operations and coordinated shipments for over 500 orders per week.
- Implemented a new QA process that reduced return rates by 12% in the first year.
- Trained and onboarded 15 new employees on safety protocols and inventory software.

EDUCATION
Bachelor of Science in Business Administration — University of Washington, Seattle, WA (2015)

SKILLS
Strategic Planning • Process Optimization • Vendor Management • Team Leadership • Data Analysis • ERP Software (SAP, Oracle)

CERTIFICATIONS
Lean Six Sigma Green Belt (2020)
Certified Supply Chain Professional (CSCP) (2018)`,
  },
  {
    id: 'tech',
    name: 'Tech / Engineering',
    icon: <Code className="h-4 w-4" />,
    description: 'Optimized for software, data, and engineering roles',
    sections: ['Summary', 'Technical Skills', 'Experience', 'Projects', 'Education'],
    tone: 'technically precise and impact-focused',
    example: `SARAH CHEN
Software Engineer
New York, NY | (555) 987-6543 | sarah.chen@email.com | github.com/schen-dev

SUMMARY
Full-stack engineer with 5 years of experience building scalable, high-availability web applications. Expert in React, Node.js, and cloud infrastructure, with a strong focus on performance optimization and writing clean, maintainable code. Successfully led migration projects and mentored junior developers.

TECHNICAL SKILLS
Languages: JavaScript, TypeScript, Python, SQL, HTML/CSS
Frameworks: React.js, Node.js, Express, Next.js, Django
Cloud & DevOps: AWS (EC2, S3, Lambda), Docker, Kubernetes, CI/CD, Git
Databases: PostgreSQL, MongoDB, Redis, Elasticsearch

EXPERIENCE
Senior Software Engineer — TechFlow Solutions
August 2021 – Present
- Architected and deployed a microservices-based backend using Node.js and Docker, reducing API latency by 40% and supporting a 3x increase in user traffic.
- Built a real-time analytics dashboard in React, adopted by 50+ enterprise clients for tracking usage metrics.
- Mentored 3 junior developers through weekly pair programming and code reviews, accelerating their onboarding by 30%.

Software Engineer — DataSphere Inc.
June 2018 – July 2021
- Developed RESTful APIs for the core product suite, handling over 2M requests per day with 99.99% uptime.
- Optimized database queries in PostgreSQL, reducing average load times for the reporting module from 5s to 1.2s.

PROJECTS
E-Commerce Platform (Personal Project) — React, Node.js, Stripe API
- Built a fully functional e-commerce site supporting user authentication, shopping cart, and secure payment processing.

EDUCATION
B.S. in Computer Science — New York University (2018)`,
  },
  {
    id: 'creative',
    name: 'Creative / Design',
    icon: <Paintbrush className="h-4 w-4" />,
    description: 'For designers, writers, and creative professionals',
    sections: ['Creative Profile', 'Selected Work', 'Experience', 'Tools & Skills', 'Education'],
    tone: 'expressive yet polished, showcasing creative vision',
    example: `MIA KHALIL
Senior UX/UI Designer
Los Angeles, CA | (555) 234-5678 | mia.khalil@email.com | portfolio.com/miakhalil

CREATIVE PROFILE
Multi-disciplinary designer blending brand strategy with intuitive user experiences. Passionate about creating visually striking, accessible, and user-centric digital products. 6+ years of experience leading design initiatives from concept to handoff for B2B and B2C platforms.

SELECTED WORK
"Aura" Wellness App Redesign — Mobile App
- Led the end-to-end redesign of a meditation app, resulting in a 45% increase in daily active users and a 4.8-star App Store rating.
- Developed a comprehensive design system to ensure consistency across iOS and Android platforms.

EXPERIENCE
Senior UX/UI Designer — CreativePulse Agency
January 2020 – Present
- Directed visual identity and product design for 12+ client projects, ranging from e-commerce to SaaS dashboards.
- Facilitated user research sessions and usability testing, translating insights into high-fidelity prototypes.
- Collaborated closely with engineering teams to ensure pixel-perfect implementation and smooth handoffs.

Graphic Designer — Studio Nova
May 2017 – December 2019
- Created marketing collateral, social media assets, and branding materials that boosted client engagement by 30%.

TOOLS & SKILLS
Design: Figma, Sketch, Adobe Creative Suite (Illustrator, Photoshop, InDesign)
Prototyping: InVision, Principle, Framer
Skills: User Research, Wireframing, Interaction Design, Typography, Color Theory

EDUCATION
B.F.A. in Graphic Design — Rhode Island School of Design (2017)`,
  },
  {
    id: 'academic',
    name: 'Academic / Research',
    icon: <GraduationCap className="h-4 w-4" />,
    description: 'CV format for academia, research, and fellowships',
    sections: ['Research Interests', 'Education', 'Publications', 'Teaching', 'Grants & Awards', 'Conference Presentations'],
    tone: 'scholarly, detailed, and credential-focused',
    example: `DR. JAMES ROBERTSON
Cambridge, MA | (555) 345-6789 | j.robertson@university.edu

RESEARCH INTERESTS
Machine learning applications in computational biology, genomic data analysis, and predictive modeling for protein structures.

EDUCATION
Ph.D. in Computer Science (Computational Biology) — MIT, Cambridge, MA (2023)
Dissertation: "Deep Learning Approaches to Protein Folding Prediction"
Advisor: Dr. Elena Rostova

M.S. in Computer Science — Stanford University (2019)
B.S. in Bioinformatics — University of Michigan (2017)

PUBLICATIONS
Robertson, J., & Rostova, E. (2022). "A Novel Neural Network Architecture for Rapid Genomic Sequencing." Journal of Computational Biology, 45(3), 112-128.
Robertson, J. et al. (2021). "Predictive Modeling of Enzyme Kinetics using Deep Learning." Bioinformatics Review, 12(4), 45-60.

TEACHING EXPERIENCE
Teaching Assistant — "Introduction to Machine Learning" (CS 401)
MIT, Fall 2021 & Spring 2022
- Led weekly recitation sessions for 40+ undergraduate students.
- Designed and graded programming assignments and exams.

GRANTS & AWARDS
National Science Foundation (NSF) Graduate Research Fellowship — $138,000 (2020-2023)
Best Student Paper Award, International Conference on Bioinformatics (2022)

CONFERENCE PRESENTATIONS
"Scaling ML Models for Genomic Data," Annual AI in Healthcare Symposium, Boston, MA (Nov 2022)`,
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    icon: <Stethoscope className="h-4 w-4" />,
    description: 'For medical, nursing, and healthcare professionals',
    sections: ['Professional Summary', 'Licenses & Certifications', 'Clinical Experience', 'Education', 'Skills'],
    tone: 'precise, patient-centered, and credential-focused',
    example: `EMILY DAVIS, BSN, RN
Chicago, NY | (555) 456-7890 | e.davis.rn@email.com

PROFESSIONAL SUMMARY
Compassionate and detail-oriented Registered Nurse with 5 years of experience in high-acuity medical-surgical and intensive care units. Proven ability to remain calm under pressure, manage complex patient caseloads, and collaborate effectively with interdisciplinary healthcare teams to deliver optimal patient outcomes.

LICENSES & CERTIFICATIONS
Registered Nurse (RN) License — State of Illinois (Exp. 2025)
Basic Life Support (BLS) & Advanced Cardiovascular Life Support (ACLS) — American Heart Association
Pediatric Advanced Life Support (PALS) Certified

CLINICAL EXPERIENCE
Staff Nurse, ICU — Mercy General Hospital, Chicago, IL
September 2020 – Present
- Provide direct, continuous care for 2-3 critically ill patients per shift, administering titrating vasopressors and managing mechanical ventilation.
- Spearheaded a unit-wide initiative on central line care that reduced CLABSI rates by 15% over 12 months.
- Act as a preceptor for new graduate nurses, guiding their transition into the ICU environment.

Registered Nurse, Med-Surg — St. Luke's Medical Center, Chicago, IL
July 2018 – August 2020
- Managed comprehensive care for 5-6 patients per shift, including post-operative monitoring, wound care, and medication administration.
- Educated patients and families on discharge protocols, improving patient compliance and reducing readmission rates by 10%.

EDUCATION
Bachelor of Science in Nursing (BSN) — Loyola University Chicago (2018)

SKILLS
Patient Assessment • Critical Care Monitoring • IV Therapy & Phlebotomy • EMR Systems (Epic, Cerner) • Patient & Family Education`,
  },
  {
    id: 'executive',
    name: 'Executive / Leadership',
    icon: <BarChart3 className="h-4 w-4" />,
    description: 'C-suite and senior leadership positions',
    sections: ['Executive Summary', 'Leadership Experience', 'Key Achievements', 'Board Memberships', 'Education'],
    tone: 'strategic, visionary, and results-oriented at scale',
    example: `MICHAEL STERLING
Chief Revenue Officer
Austin, TX | (555) 567-8901 | m.sterling@email.com | linkedin.com/in/michaelsterling

EXECUTIVE SUMMARY
Transformational executive leader with 15+ years of experience driving aggressive revenue growth, penetrating new markets, and scaling global sales organizations. Expert in aligning go-to-market strategies with overarching corporate vision to consistently exceed ARR targets. Recognized for building high-performing, resilient teams and orchestrating successful M&A integrations.

LEADERSHIP EXPERIENCE
Chief Revenue Officer — Apex Technologies ($150M ARR SaaS)
March 2019 – Present
- Scaled global sales and customer success teams from 50 to 200+ employees across North America and EMEA.
- Orchestrated a shift upmarket to enterprise sales, increasing average deal size by 120% and driving a 45% YoY revenue growth.
- Restructured compensation plans and sales methodologies, reducing rep attrition by 25%.

VP of Global Sales — Quantum Solutions
January 2014 – February 2019
- Grew annual recurring revenue from $20M to $85M within 5 years.
- Successfully expanded operations into the APAC region, opening offices in London and Sydney which generated $15M in net-new revenue in year one.

KEY ACHIEVEMENTS
- Led the commercial integration of two strategic acquisitions totaling $50M in value.
- Secured and negotiated multi-year contracts with Fortune 500 clients, including Microsoft and AT&T.

BOARD MEMBERSHIPS
Advisory Board Member — SaaS Growth Initiative (2021–Present)

EDUCATION
Master of Business Administration (MBA) — Harvard Business School
B.S. in Economics — University of Texas at Austin`,
  },
  {
    id: 'career-change',
    name: 'Career Change',
    icon: <RotateCcw className="h-4 w-4" />,
    description: 'Highlights transferable skills for career pivots',
    sections: ['Career Objective', 'Transferable Skills', 'Relevant Experience', 'Additional Experience', 'Education & Training'],
    tone: 'forward-looking, emphasizing transferable skills and growth potential',
    example: `DAVID THOMPSON
Denver, TX | (555) 678-9012 | david.thompson@email.com

CAREER OBJECTIVE
Detail-oriented professional with 7 years of experience in educational leadership and curriculum development seeking to transition into Corporate Instructional Design. Eager to leverage strong background in learning methodologies, content creation, and stakeholder management to design impactful training programs for enterprise teams.

TRANSFERABLE SKILLS
Instructional Design • Curriculum Development • Project Management • Needs Assessment • Public Speaking & Facilitation • Data-Driven Evaluation • E-Learning Platforms

RELEVANT EXPERIENCE
Lead Educator & Department Head — Lincoln High School
August 2018 – Present
- Designed and implemented a standardized, district-wide curriculum adopted by 15 schools, improving student assessment scores by 18%.
- Managed cross-functional projects by leading a team of 10 educators to integrate new educational technologies (Canvas, Blackboard) into daily instruction.
- Conducted regular needs assessments and performance evaluations, utilizing data to adapt training methods.

ADDITIONAL EXPERIENCE
Teacher — Washington Middle School
August 2015 – June 2018
- Developed engaging lesson plans and interactive materials tailored to diverse learning styles.

EDUCATION & TRAINING
Certificate in Instructional Design — Association for Talent Development (ATD) (2023)
Master of Education — Colorado State University (2017)
B.A. in English — Colorado State University (2015)`,
  },
  {
    id: 'entry-level',
    name: 'Entry Level / New Grad',
    icon: <Users className="h-4 w-4" />,
    description: 'For recent graduates and early-career professionals',
    sections: ['Objective', 'Education', 'Projects', 'Internships', 'Skills', 'Activities & Leadership'],
    tone: 'enthusiastic, potential-focused, and education-forward',
    example: `JESSICA NGUYEN
Boston, MA | (555) 789-0123 | jessica.nguyen@email.com | linkedin.com/in/jessicanguyen

OBJECTIVE
Highly motivated Marketing graduate with internship experience in digital campaign management and content creation. Seeking an entry-level Digital Marketing Coordinator role to leverage my analytical skills, creativity, and passion for brand storytelling to drive engagement and ROI.

EDUCATION
Bachelor of Science in Marketing — Boston University, Boston, MA (May 2023)
GPA: 3.8/4.0 | Dean's List (All Semesters)
Relevant Coursework: Digital Marketing Strategy, Consumer Behavior, Marketing Analytics, Brand Management

INTERNSHIPS
Marketing Intern — BrightIdeas Agency, Boston, MA
May 2022 – August 2022
- Assisted in executing multi-channel social media campaigns, contributing to a 20% increase in follower growth across Instagram and LinkedIn.
- Analyzed campaign performance using Google Analytics and drafted weekly reports for the management team.
- Wrote and edited copy for 15+ blog posts and email newsletters.

PROJECTS
Market Research Capstone Project
- Conducted primary and secondary research on Gen-Z consumer trends in the sustainable fashion sector.
- Presented a comprehensive go-to-market strategy to a panel of industry professionals.

SKILLS
Digital Marketing: Social Media Management, SEO/SEM basics, Email Marketing
Tools: Google Analytics, Hootsuite, Mailchimp, Canva, Microsoft Excel
Soft Skills: Team Collaboration, Copywriting, Problem Solving

ACTIVITIES & LEADERSHIP
VP of Communications — BU Marketing Club (2021 - 2023)
- Managed promotional strategy for club events, increasing average attendance by 30%.`,
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
  const [resumeText, setResumeText] = useState(RESUME_TEMPLATES[0].example);
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
    if (tmpl) {
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
                  <div className="flex items-center gap-4">
                    {resultView === 'preview' && (
                      <DocumentThemeSelector value={documentTheme} onChange={setDocumentTheme} />
                    )}
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
                </div>

                <div className="border border-border rounded-lg bg-card max-h-[70vh] overflow-y-auto overscroll-contain">
                  {resultView === 'preview' ? (
                    <div className={`p-5 md:p-8 space-y-1 resume-preview-content ${getThemeClass(documentTheme)}`}>
                      {result.split('\n').map((line, i) => {
                        const trimmed = line.trim();
                        if (!trimmed) return <div key={i} className="h-3" />;
                        const isHeader = /^[A-Z\s&]{3,}$/.test(trimmed) && trimmed.length > 2;
                        const isBullet = /^[-•]/.test(trimmed);

                        if (isHeader) {
                          return (
                            <h3 key={i} className="text-sm font-bold tracking-wide uppercase border-b pb-1 pt-3 first:pt-0" style={{ borderColor: 'var(--doc-border)', color: 'var(--doc-heading)' }}>
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
