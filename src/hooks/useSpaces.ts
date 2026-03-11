import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type {
  Space, ObjectType, RelationDefinition, SpaceObject,
  ObjectRelationValue, ObjectSet, SpaceWidget,
  DEFAULT_OBJECT_TYPES, DEFAULT_RELATIONS,
} from '@/types/spaces';

export function useSpaces() {
  const { user } = useAuth();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSpaces = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('spaces')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (!error && data) setSpaces(data as unknown as Space[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadSpaces(); }, [loadSpaces]);

  const createSpace = async (name: string, icon = '🏠', description = '') => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('spaces')
      .insert({ user_id: user.id, name, icon, description, is_default: spaces.length === 0 })
      .select()
      .single();
    if (error) { toast.error('Failed to create space'); return null; }
    const space = data as unknown as Space;

    // Create default types
    const { DEFAULT_OBJECT_TYPES, DEFAULT_RELATIONS } = await import('@/types/spaces');
    const typeInserts = DEFAULT_OBJECT_TYPES.map(t => ({
      space_id: space.id, user_id: user.id, name: t.name, icon: t.icon, is_builtin: true,
    }));
    await supabase.from('object_types').insert(typeInserts);

    // Create default relations
    const relInserts = DEFAULT_RELATIONS.map(r => ({
      space_id: space.id, user_id: user.id, name: r.name,
      relation_type: r.relation_type, options: r.options, is_builtin: true,
    }));
    await supabase.from('relation_definitions').insert(relInserts);

    // Create default widgets
    const widgets = [
      { space_id: space.id, user_id: user.id, widget_type: 'favorites', order_index: 0 },
      { space_id: space.id, user_id: user.id, widget_type: 'recent', order_index: 1 },
      { space_id: space.id, user_id: user.id, widget_type: 'sets', order_index: 2 },
    ];
    await supabase.from('space_widgets').insert(widgets);

    await loadSpaces();
    toast.success(`Space "${name}" created`);
    return space;
  };

  const deleteSpace = async (id: string) => {
    const { error } = await supabase.from('spaces').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    setSpaces(prev => prev.filter(s => s.id !== id));
    toast.success('Space deleted');
  };

  const updateSpace = async (id: string, updates: Partial<Pick<Space, 'name' | 'icon' | 'description' | 'color'>>) => {
    const { error } = await supabase.from('spaces').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('Failed to update'); return; }
    setSpaces(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  return { spaces, loading, createSpace, deleteSpace, updateSpace, reload: loadSpaces };
}

export function useSpaceData(spaceId: string | null) {
  const { user } = useAuth();
  const [objectTypes, setObjectTypes] = useState<ObjectType[]>([]);
  const [relations, setRelations] = useState<RelationDefinition[]>([]);
  const [objects, setObjects] = useState<SpaceObject[]>([]);
  const [sets, setSets] = useState<ObjectSet[]>([]);
  const [widgets, setWidgets] = useState<SpaceWidget[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    if (!user || !spaceId) return;
    setLoading(true);
    const [typesRes, relsRes, objsRes, setsRes, widgetsRes] = await Promise.all([
      supabase.from('object_types').select('*').eq('space_id', spaceId).order('created_at'),
      supabase.from('relation_definitions').select('*').eq('space_id', spaceId).order('created_at'),
      supabase.from('space_objects').select('*').eq('space_id', spaceId).is('deleted_at', null).order('updated_at', { ascending: false }),
      supabase.from('object_sets').select('*').eq('space_id', spaceId).order('created_at'),
      supabase.from('space_widgets').select('*').eq('space_id', spaceId).order('order_index'),
    ]);
    if (typesRes.data) setObjectTypes(typesRes.data as unknown as ObjectType[]);
    if (relsRes.data) setRelations(relsRes.data as unknown as RelationDefinition[]);
    if (objsRes.data) setObjects(objsRes.data as unknown as SpaceObject[]);
    if (setsRes.data) setSets(setsRes.data as unknown as ObjectSet[]);
    if (widgetsRes.data) setWidgets(widgetsRes.data as unknown as SpaceWidget[]);
    setLoading(false);
  }, [user, spaceId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Object CRUD
  const createObject = async (objectTypeId: string, name: string, icon?: string) => {
    if (!user || !spaceId) return null;
    const { data, error } = await supabase
      .from('space_objects')
      .insert({ space_id: spaceId, object_type_id: objectTypeId, user_id: user.id, name, icon })
      .select()
      .single();
    if (error) { toast.error('Failed to create object'); return null; }
    const obj = data as unknown as SpaceObject;
    setObjects(prev => [obj, ...prev]);
    return obj;
  };

  const updateObject = async (id: string, updates: Partial<Pick<SpaceObject, 'name' | 'icon' | 'content' | 'is_favorite' | 'is_archived'>>) => {
    const { error } = await supabase.from('space_objects')
      .update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('Failed to update'); return; }
    setObjects(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
  };

  const deleteObject = async (id: string) => {
    const { error } = await supabase.from('space_objects')
      .update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    setObjects(prev => prev.filter(o => o.id !== id));
  };

  // Relation values
  const setRelationValue = async (objectId: string, relationId: string, value: Partial<Pick<ObjectRelationValue, 'value_text' | 'value_number' | 'value_date' | 'value_boolean' | 'value_json'>>) => {
    const { error } = await supabase
      .from('object_relation_values')
      .upsert({ object_id: objectId, relation_id: relationId, ...value }, { onConflict: 'object_id,relation_id' });
    if (error) toast.error('Failed to update value');
  };

  // Type CRUD
  const createObjectType = async (name: string, icon = '📄') => {
    if (!user || !spaceId) return null;
    const { data, error } = await supabase
      .from('object_types')
      .insert({ space_id: spaceId, user_id: user.id, name, icon })
      .select()
      .single();
    if (error) { toast.error('Failed to create type'); return null; }
    const type = data as unknown as ObjectType;
    setObjectTypes(prev => [...prev, type]);
    return type;
  };

  const deleteObjectType = async (id: string) => {
    const { error } = await supabase.from('object_types').delete().eq('id', id);
    if (error) { toast.error('Cannot delete type (may have objects)'); return; }
    setObjectTypes(prev => prev.filter(t => t.id !== id));
  };

  // Set CRUD
  const createSet = async (name: string, objectTypeId?: string, viewType: 'grid' | 'list' | 'kanban' | 'gallery' = 'grid') => {
    if (!user || !spaceId) return null;
    const { data, error } = await supabase
      .from('object_sets')
      .insert({ space_id: spaceId, user_id: user.id, name, object_type_id: objectTypeId || null, view_type: viewType })
      .select()
      .single();
    if (error) { toast.error('Failed to create set'); return null; }
    const set = data as unknown as ObjectSet;
    setSets(prev => [...prev, set]);
    return set;
  };

  const deleteSet = async (id: string) => {
    const { error } = await supabase.from('object_sets').delete().eq('id', id);
    if (error) { toast.error('Failed to delete set'); return; }
    setSets(prev => prev.filter(s => s.id !== id));
  };

  return {
    objectTypes, relations, objects, sets, widgets, loading,
    createObject, updateObject, deleteObject,
    setRelationValue,
    createObjectType, deleteObjectType,
    createSet, deleteSet,
    reload: loadAll,
  };
}
