import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Export all user data from all tables
    const tables = [
      'zettel_cards',
      'notes', 
      'notebooks',
      'calendar_events',
      'attachments',
      'files',
      'recordings',
      'catalyst_documents',
      'catalyst_chapters',
      'catalyst_citations',
      'catalyst_writing_goals',
      'dashboard_layouts',
      'user_preferences',
      'profiles'
    ];

    const exportData: Record<string, any[]> = {};

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*');
      
      if (!error && data) {
        exportData[table] = data;
      }
    }

    // Generate SQL INSERT statements
    let sqlStatements = `-- User Data Export\n-- Generated: ${new Date().toISOString()}\n\n`;
    
    for (const [table, rows] of Object.entries(exportData)) {
      if (rows.length === 0) continue;
      
      sqlStatements += `-- ${table} (${rows.length} rows)\n`;
      
      for (const row of rows) {
        const columns = Object.keys(row).filter(k => row[k] !== null);
        const values = columns.map(col => {
          const val = row[col];
          if (val === null) return 'NULL';
          if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
          if (typeof val === 'boolean') return val ? 'true' : 'false';
          if (Array.isArray(val)) return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
          if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
          return val;
        });
        
        sqlStatements += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT (id) DO NOTHING;\n`;
      }
      
      sqlStatements += '\n';
    }

    return new Response(JSON.stringify({ 
      sql: sqlStatements,
      data: exportData,
      timestamp: new Date().toISOString()
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Error exporting data:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
});
