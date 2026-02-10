export type AgentType = 
  | 'research'
  | 'habit_reminder'
  | 'smart_linking'
  | 'content_summarizer'
  | 'writing_coach'
  | 'knowledge_gap'
  | 'daily_digest'
  | 'citation'
  | 'task_extraction'
  | 'spaced_repetition'
  | 'custom';

export type AgentStatus = 'pending' | 'running' | 'completed' | 'failed';

export type NotificationType = 'info' | 'success' | 'warning' | 'action_required';

export interface Agent {
  id: string;
  user_id: string;
  agent_type: AgentType;
  name: string;
  description?: string;
  is_enabled: boolean;
  config: AgentConfig;
  last_run_at?: string;
  next_run_at?: string;
  run_frequency_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface AgentConfig {
  // Research agent
  topics?: string[];
  sources?: string[];
  catalyst_document_id?: string;
  
  // Habit reminder agent
  habit_ids?: string[];
  reminder_time?: string;
  
  // Smart linking agent
  similarity_threshold?: number;
  max_suggestions?: number;
  
  // Content summarizer
  auto_summarize_imports?: boolean;
  summary_length?: 'short' | 'medium' | 'long';
  
  // Writing coach
  tone?: 'academic' | 'casual' | 'professional';
  check_grammar?: boolean;
  check_style?: boolean;
  
  // Knowledge gap
  analyze_cards?: boolean;
  analyze_notes?: boolean;
  
  // Daily digest
  digest_time?: string;
  include_recommendations?: boolean;
  
  // Citation agent
  citation_style?: 'apa' | 'mla' | 'chicago' | 'harvard';
  
  // Task extraction
  auto_create_tasks?: boolean;
  
  // Spaced repetition
  cards_per_session?: number;
  difficulty_multiplier?: number;

  // Custom agent
  custom_instructions?: string;
  custom_input_source?: 'all' | 'cards' | 'notes' | 'documents';
  custom_output_format?: 'findings' | 'cards' | 'notes' | 'summary';
}

export interface AgentRun {
  id: string;
  agent_id: string;
  user_id: string;
  status: AgentStatus;
  started_at: string;
  completed_at?: string;
  results?: Record<string, unknown>;
  error_message?: string;
  items_processed: number;
  items_found: number;
}

export interface AgentFinding {
  id: string;
  agent_id: string;
  run_id?: string;
  user_id: string;
  finding_type: string;
  title: string;
  content?: string;
  metadata: Record<string, unknown>;
  is_read: boolean;
  is_dismissed: boolean;
  action_taken: boolean;
  source_id?: string;
  source_type?: string;
  relevance_score?: number;
  created_at: string;
}

export interface AgentNotification {
  id: string;
  user_id: string;
  agent_id?: string;
  finding_id?: string;
  title: string;
  message: string;
  notification_type: NotificationType;
  is_read: boolean;
  action_url?: string;
  created_at: string;
}

export interface AgentDefinition {
  type: AgentType;
  name: string;
  description: string;
  icon: string;
  defaultConfig: Partial<AgentConfig>;
  capabilities: string[];
}

export const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    type: 'research',
    name: 'Research Agent',
    description: 'Gathers research materials based on your Catalyst content and topics of interest',
    icon: 'Search',
    defaultConfig: { topics: [], sources: ['web', 'academic'] },
    capabilities: ['Web search', 'Academic papers', 'Topic extraction', 'Citation generation']
  },
  {
    type: 'habit_reminder',
    name: 'Habit Reminder Agent',
    description: 'Sets smart reminders based on your habit patterns and goals',
    icon: 'Bell',
    defaultConfig: { reminder_time: '09:00' },
    capabilities: ['Pattern analysis', 'Smart scheduling', 'Streak tracking', 'Motivation tips']
  },
  {
    type: 'smart_linking',
    name: 'Smart Linking Agent',
    description: 'Auto-suggests connections between your cards, notes, and documents',
    icon: 'Link',
    defaultConfig: { similarity_threshold: 0.7, max_suggestions: 5 },
    capabilities: ['Semantic similarity', 'Topic clustering', 'Cross-reference detection', 'Link suggestions']
  },
  {
    type: 'content_summarizer',
    name: 'Content Summarizer Agent',
    description: 'Automatically summarizes long notes and imported documents',
    icon: 'FileText',
    defaultConfig: { auto_summarize_imports: true, summary_length: 'medium' },
    capabilities: ['Auto-summarization', 'Key points extraction', 'Import processing', 'TL;DR generation']
  },
  {
    type: 'writing_coach',
    name: 'Writing Coach Agent',
    description: 'Provides feedback on your Catalyst drafts and writing style',
    icon: 'Pencil',
    defaultConfig: { tone: 'professional', check_grammar: true, check_style: true },
    capabilities: ['Grammar checking', 'Style suggestions', 'Tone analysis', 'Readability scoring']
  },
  {
    type: 'knowledge_gap',
    name: 'Knowledge Gap Agent',
    description: 'Identifies topics you reference but haven\'t documented',
    icon: 'HelpCircle',
    defaultConfig: { analyze_cards: true, analyze_notes: true },
    capabilities: ['Gap detection', 'Topic mapping', 'Learning recommendations', 'Coverage analysis']
  },
  {
    type: 'daily_digest',
    name: 'Daily Digest Agent',
    description: 'Curates relevant content based on your activity patterns',
    icon: 'Calendar',
    defaultConfig: { digest_time: '08:00', include_recommendations: true },
    capabilities: ['Activity analysis', 'Content curation', 'Trending topics', 'Personalized insights']
  },
  {
    type: 'citation',
    name: 'Citation Agent',
    description: 'Finds and formats citations for your Catalyst documents',
    icon: 'Quote',
    defaultConfig: { citation_style: 'apa' },
    capabilities: ['Citation lookup', 'Format conversion', 'Bibliography generation', 'Source verification']
  },
  {
    type: 'task_extraction',
    name: 'Task Extraction Agent',
    description: 'Pulls action items from your notes and cards automatically',
    icon: 'CheckSquare',
    defaultConfig: { auto_create_tasks: true },
    capabilities: ['Action detection', 'Priority assignment', 'Deadline extraction', 'Task creation']
  },
  {
    type: 'spaced_repetition',
    name: 'Spaced Repetition Agent',
    description: 'Suggests cards to review based on memory curves',
    icon: 'Brain',
    defaultConfig: { cards_per_session: 10, difficulty_multiplier: 2.5 },
    capabilities: ['SM-2 algorithm', 'Review scheduling', 'Difficulty tracking', 'Memory optimization']
  },
  {
    type: 'custom',
    name: 'Custom Agent',
    description: 'Create a fully custom agent with your own instructions and behavior',
    icon: 'Wand2',
    defaultConfig: { custom_instructions: '', custom_input_source: 'all', custom_output_format: 'findings' },
    capabilities: ['Custom instructions', 'Flexible input', 'Configurable output', 'User-defined behavior']
  }
];
