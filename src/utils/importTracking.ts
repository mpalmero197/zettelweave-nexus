import { supabase } from "@/integrations/supabase/client";

// Generate a simple hash from file content
export async function generateFileHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export interface ImportHistoryRecord {
  id: string;
  user_id: string;
  source_type: 'obsidian' | 'notion';
  file_path: string;
  file_name: string;
  file_hash: string;
  imported_at: string;
  card_id?: string;
  metadata: Record<string, any>;
}

export async function getImportHistory(sourceType: 'obsidian' | 'notion'): Promise<ImportHistoryRecord[]> {
  const { data, error } = await supabase
    .from('import_history')
    .select('*')
    .eq('source_type', sourceType)
    .order('imported_at', { ascending: false });

  if (error) {
    console.error('Error fetching import history:', error);
    return [];
  }

  return (data || []) as ImportHistoryRecord[];
}

export async function isFileImported(
  filePath: string,
  sourceType: 'obsidian' | 'notion'
): Promise<boolean> {
  const { data, error } = await supabase
    .from('import_history')
    .select('*')
    .eq('source_type', sourceType)
    .eq('file_path', filePath)
    .maybeSingle();

  if (error) {
    console.error('Error checking import status:', error);
    return false;
  }

  return !!data;
}

export async function trackImport(
  filePath: string,
  fileName: string,
  sourceType: 'obsidian' | 'notion',
  metadata?: Record<string, any>
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Generate file hash from path (simple approach)
  const fileHash = await generateFileHash(filePath + fileName);

  const { error } = await supabase
    .from('import_history')
    .upsert({
      user_id: user.id,
      source_type: sourceType,
      file_path: filePath,
      file_name: fileName,
      file_hash: fileHash,
      metadata: metadata || {},
      imported_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,source_type,file_path'
    });

  if (error) {
    console.error('Error tracking import:', error);
    throw error;
  }
}

export async function clearImportHistory(sourceType?: 'obsidian' | 'notion'): Promise<void> {
  let query = supabase.from('import_history').delete();
  
  if (sourceType) {
    query = query.eq('source_type', sourceType);
  }

  const { error } = await query.neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (error) {
    console.error('Error clearing import history:', error);
    throw error;
  }
}
