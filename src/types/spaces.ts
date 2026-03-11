export interface Space {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string | null;
  description: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ObjectType {
  id: string;
  space_id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string | null;
  is_builtin: boolean;
  created_at: string;
  updated_at: string;
}

export type RelationType = 'text' | 'number' | 'date' | 'select' | 'multi_select' | 'checkbox' | 'url' | 'email' | 'phone' | 'object';

export interface RelationDefinition {
  id: string;
  space_id: string;
  user_id: string;
  name: string;
  relation_type: RelationType;
  options: string[];
  is_builtin: boolean;
  created_at: string;
}

export interface TypeRelation {
  id: string;
  object_type_id: string;
  relation_id: string;
  is_required: boolean;
  order_index: number;
  relation?: RelationDefinition;
}

export interface SpaceObject {
  id: string;
  space_id: string;
  object_type_id: string;
  user_id: string;
  name: string;
  icon: string | null;
  content: string;
  is_favorite: boolean;
  is_archived: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  object_type?: ObjectType;
  relation_values?: ObjectRelationValue[];
}

export interface ObjectRelationValue {
  id: string;
  object_id: string;
  relation_id: string;
  value_text: string | null;
  value_number: number | null;
  value_date: string | null;
  value_boolean: boolean | null;
  value_json: any;
  relation?: RelationDefinition;
}

export interface ObjectSet {
  id: string;
  space_id: string;
  user_id: string;
  name: string;
  icon: string;
  object_type_id: string | null;
  filters: any[];
  sorts: any[];
  view_type: 'grid' | 'list' | 'kanban' | 'gallery';
  visible_relations: string[];
  group_by_relation_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SpaceWidget {
  id: string;
  space_id: string;
  user_id: string;
  widget_type: 'favorites' | 'recent' | 'sets' | 'tree' | 'type_list';
  config: Record<string, any>;
  order_index: number;
  created_at: string;
}

// Default built-in types for new spaces
export const DEFAULT_OBJECT_TYPES = [
  { name: 'Page', icon: '📄', color: null },
  { name: 'Task', icon: '✅', color: null },
  { name: 'Bookmark', icon: '🔖', color: null },
  { name: 'Note', icon: '📝', color: null },
  { name: 'Contact', icon: '👤', color: null },
  { name: 'Project', icon: '📁', color: null },
];

export const DEFAULT_RELATIONS = [
  { name: 'Status', relation_type: 'select' as RelationType, options: ['Not Started', 'In Progress', 'Done'] },
  { name: 'Priority', relation_type: 'select' as RelationType, options: ['Low', 'Medium', 'High', 'Urgent'] },
  { name: 'Due Date', relation_type: 'date' as RelationType, options: [] },
  { name: 'URL', relation_type: 'url' as RelationType, options: [] },
  { name: 'Tags', relation_type: 'multi_select' as RelationType, options: [] },
  { name: 'Description', relation_type: 'text' as RelationType, options: [] },
  { name: 'Completed', relation_type: 'checkbox' as RelationType, options: [] },
];

export const RELATION_TYPE_LABELS: Record<RelationType, string> = {
  text: 'Text',
  number: 'Number',
  date: 'Date',
  select: 'Select',
  multi_select: 'Multi-select',
  checkbox: 'Checkbox',
  url: 'URL',
  email: 'Email',
  phone: 'Phone',
  object: 'Object',
};
