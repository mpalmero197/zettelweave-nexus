import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const authHeader = req.headers.get('Authorization')!;
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return j({ error: 'Unauthorized' }, 401);

    let body: any = {};
    try { body = await req.json(); } catch { /* GET-style call */ }
    const wantAdminFull = body?.mode === 'admin-all';

    const { data: isAdmin } = await userClient.rpc('is_admin', { _user_id: user.id });
    const adminMode = wantAdminFull && !!isAdmin;

    const client = adminMode
      ? createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
      : userClient;

    // Comprehensive table list — covers every user-facing table in the project.
    const tables = [
      'profiles', 'user_roles', 'user_preferences',
      'zettel_cards', 'notes', 'notebooks',
      'calendar_events', 'tasks', 'attachments', 'files', 'recordings',
      'catalyst_documents', 'catalyst_chapters', 'catalyst_citations', 'catalyst_writing_goals',
      'dashboard_layouts', 'spaces', 'space_collaborators', 'space_objects',
      'shared_items', 'friend_requests', 'friendships',
      'chat_messages', 'sticky_notes', 'scratchpad', 'scratchpad_notes',
      'workflows', 'synthesis_queue', 'agents', 'agent_runs',
      'feature_requests', 'feature_request_votes', 'bug_reports',
      'subscriptions', 'admin_licenses',
      'alice_memories', 'alice_actions', 'alice_briefings',
      'projects', 'project_milestones', 'project_tasks',
      'documents', 'document_themes', 'mind_maps', 'study_guides',
      'integrations_connections', 'integrations_health',
      'whiteboards', 'canvases', 'pomodoro_sessions',
      'security_audit_log', 'error_reports', 'domain_restrictions',
      'engagement_nudges_log',
    ];

    const exportData: Record<string, any[]> = {};
    const skipped: string[] = [];

    for (const table of tables) {
      let q = client.from(table).select('*');
      if (!adminMode) q = q.eq('user_id', user.id);
      const { data, error } = await q;
      if (error) { skipped.push(`${table}: ${error.message}`); continue; }
      if (data) exportData[table] = data;
    }

    // Build SQL INSERTs (safe value escaping)
    const esc = (val: any): string => {
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'boolean') return val ? 'true' : 'false';
      if (typeof val === 'number') return String(val);
      if (val instanceof Date) return `'${val.toISOString()}'`;
      if (Array.isArray(val) || typeof val === 'object') {
        return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
      }
      return `'${String(val).replace(/'/g, "''")}'`;
    };

    let sql = `-- PendragonX data export\n-- Generated: ${new Date().toISOString()}\n-- Mode: ${adminMode ? 'admin-all-rows' : 'single-user'}\n\n`;
    sql += `BEGIN;\n\n`;
    for (const [table, rows] of Object.entries(exportData)) {
      if (!rows.length) continue;
      sql += `-- ${table} (${rows.length} rows)\n`;
      for (const row of rows) {
        const cols = Object.keys(row);
        const vals = cols.map((c) => esc(row[c]));
        sql += `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${vals.join(', ')}) ON CONFLICT DO NOTHING;\n`;
      }
      sql += '\n';
    }
    sql += `COMMIT;\n`;

    return j({
      sql,
      data: exportData,
      skipped,
      mode: adminMode ? 'admin-all' : 'single-user',
      table_counts: Object.fromEntries(Object.entries(exportData).map(([k, v]) => [k, v.length])),
      timestamp: new Date().toISOString(),
    }, 200);
  } catch (err: any) {
    console.error('export-user-data error:', err);
    return j({ error: err?.message ?? 'unknown' }, 500);
  }
});

function j(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}
