import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GitBranch, Target, BarChart3, Users, Lightbulb, BookOpen, Briefcase, Layers } from 'lucide-react';

const uid = () => crypto.randomUUID();

const BRANCH_COLORS = [
  'hsl(210, 70%, 55%)', 'hsl(150, 60%, 45%)', 'hsl(340, 65%, 55%)',
  'hsl(35, 80%, 50%)', 'hsl(270, 55%, 55%)', 'hsl(180, 55%, 45%)',
  'hsl(15, 70%, 55%)', 'hsl(100, 50%, 45%)',
];

function buildNode(text: string, emoji: string, color: string, parentId: string | null) {
  return {
    id: uid(),
    text,
    children: [] as string[],
    collapsed: false,
    color,
    x: 0,
    y: 0,
    parentId,
    emoji,
    note: '',
    priority: 'none' as const,
  };
}

function buildTemplate(rootText: string, rootEmoji: string, branches: { text: string; emoji: string; children?: { text: string; emoji: string }[] }[]) {
  const nodes: Record<string, any> = {};
  const root = buildNode(rootText, rootEmoji, BRANCH_COLORS[0], null);
  nodes[root.id] = root;

  branches.forEach((branch, i) => {
    const color = BRANCH_COLORS[i % BRANCH_COLORS.length];
    const bNode = buildNode(branch.text, branch.emoji, color, root.id);
    nodes[bNode.id] = bNode;
    root.children.push(bNode.id);

    if (branch.children) {
      branch.children.forEach(child => {
        const cNode = buildNode(child.text, child.emoji, color, bNode.id);
        nodes[cNode.id] = cNode;
        bNode.children.push(cNode.id);
      });
    }
  });

  return { rootId: root.id, nodes };
}

const TEMPLATES = [
  {
    name: 'Brainstorm',
    description: 'Free-form ideation with categories',
    icon: Lightbulb,
    build: () => buildTemplate('Brainstorm Topic', '💡', [
      { text: 'Ideas', emoji: '✨', children: [{ text: 'Idea 1', emoji: '' }, { text: 'Idea 2', emoji: '' }] },
      { text: 'Questions', emoji: '❓', children: [{ text: 'What if...?', emoji: '' }] },
      { text: 'Resources', emoji: '📚', children: [{ text: 'Research', emoji: '' }] },
      { text: 'Next Steps', emoji: '🚀', children: [{ text: 'Action item', emoji: '' }] },
    ]),
  },
  {
    name: 'SWOT Analysis',
    description: 'Strengths, Weaknesses, Opportunities, Threats',
    icon: Target,
    build: () => buildTemplate('SWOT Analysis', '🎯', [
      { text: 'Strengths', emoji: '💪', children: [{ text: 'Strength 1', emoji: '' }, { text: 'Strength 2', emoji: '' }] },
      { text: 'Weaknesses', emoji: '⚠️', children: [{ text: 'Weakness 1', emoji: '' }] },
      { text: 'Opportunities', emoji: '🌟', children: [{ text: 'Opportunity 1', emoji: '' }] },
      { text: 'Threats', emoji: '🔥', children: [{ text: 'Threat 1', emoji: '' }] },
    ]),
  },
  {
    name: 'Project Plan',
    description: 'Plan a project from start to finish',
    icon: Briefcase,
    build: () => buildTemplate('Project Name', '📋', [
      { text: 'Goals', emoji: '🎯', children: [{ text: 'Primary goal', emoji: '' }, { text: 'Secondary goal', emoji: '' }] },
      { text: 'Timeline', emoji: '📅', children: [{ text: 'Phase 1', emoji: '' }, { text: 'Phase 2', emoji: '' }, { text: 'Phase 3', emoji: '' }] },
      { text: 'Team', emoji: '👥', children: [{ text: 'Role 1', emoji: '' }, { text: 'Role 2', emoji: '' }] },
      { text: 'Resources', emoji: '🔧', children: [{ text: 'Budget', emoji: '' }, { text: 'Tools', emoji: '' }] },
      { text: 'Risks', emoji: '⚠️', children: [{ text: 'Risk 1', emoji: '' }] },
    ]),
  },
  {
    name: 'Meeting Notes',
    description: 'Capture meeting discussions and action items',
    icon: Users,
    build: () => buildTemplate('Meeting Title', '📝', [
      { text: 'Agenda', emoji: '📋', children: [{ text: 'Topic 1', emoji: '' }, { text: 'Topic 2', emoji: '' }] },
      { text: 'Decisions', emoji: '✅', children: [{ text: 'Decision 1', emoji: '' }] },
      { text: 'Action Items', emoji: '🚀', children: [{ text: 'Task 1', emoji: '' }, { text: 'Task 2', emoji: '' }] },
      { text: 'Follow-ups', emoji: '📌', children: [{ text: 'Follow-up 1', emoji: '' }] },
    ]),
  },
  {
    name: 'Study Guide',
    description: 'Organize study material by topic',
    icon: BookOpen,
    build: () => buildTemplate('Subject', '📖', [
      { text: 'Key Concepts', emoji: '💡', children: [{ text: 'Concept 1', emoji: '' }, { text: 'Concept 2', emoji: '' }] },
      { text: 'Definitions', emoji: '📝', children: [{ text: 'Term 1', emoji: '' }] },
      { text: 'Examples', emoji: '🔍', children: [{ text: 'Example 1', emoji: '' }] },
      { text: 'Practice', emoji: '✏️', children: [{ text: 'Exercise 1', emoji: '' }] },
      { text: 'References', emoji: '📚', children: [{ text: 'Source 1', emoji: '' }] },
    ]),
  },
  {
    name: 'Pros & Cons',
    description: 'Compare advantages and disadvantages',
    icon: BarChart3,
    build: () => buildTemplate('Decision', '⚖️', [
      { text: 'Pros', emoji: '👍', children: [{ text: 'Pro 1', emoji: '' }, { text: 'Pro 2', emoji: '' }, { text: 'Pro 3', emoji: '' }] },
      { text: 'Cons', emoji: '👎', children: [{ text: 'Con 1', emoji: '' }, { text: 'Con 2', emoji: '' }] },
      { text: 'Neutral', emoji: '🤔', children: [{ text: 'Consideration', emoji: '' }] },
    ]),
  },
  {
    name: 'Feature Map',
    description: 'Plan product features and user stories',
    icon: Layers,
    build: () => buildTemplate('Product Name', '🏗️', [
      { text: 'Core Features', emoji: '⭐', children: [{ text: 'Feature 1', emoji: '' }, { text: 'Feature 2', emoji: '' }] },
      { text: 'Nice to Have', emoji: '✨', children: [{ text: 'Enhancement 1', emoji: '' }] },
      { text: 'Technical Debt', emoji: '🔧', children: [{ text: 'Fix 1', emoji: '' }] },
      { text: 'User Stories', emoji: '👤', children: [{ text: 'As a user...', emoji: '' }] },
    ]),
  },
];

interface MindMapTemplatesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyTemplate: (mapData: any) => void;
}

export function MindMapTemplates({ open, onOpenChange, onApplyTemplate }: MindMapTemplatesProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Mind Map Templates</DialogTitle>
          <DialogDescription>Choose a template to start from</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-2 pr-4">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.name}
                className="w-full text-left p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors group"
                onClick={() => {
                  onApplyTemplate(tpl.build());
                  onOpenChange(false);
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                    <tpl.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{tpl.name}</div>
                    <div className="text-xs text-muted-foreground">{tpl.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
