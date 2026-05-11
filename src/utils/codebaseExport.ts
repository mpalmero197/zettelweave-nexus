/**
 * PendragonX Complete Codebase Export
 * --------------------------------------------------------------
 * Produces a single .zip containing EVERY file that makes up
 * PendragonX (frontend, backend, edge functions, migrations,
 * config) plus a live Supabase snapshot — fully ready to be
 * redeployed if either Lovable or Supabase becomes unavailable.
 *
 * Source files are discovered via `import.meta.glob`, which means
 * the export automatically captures any new file added to the
 * project — no manual registry to maintain — and works in both
 * dev and production builds (the previous fetch-based loader
 * silently failed in prod).
 */

import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { supabase } from '@/integrations/supabase/client';

// ---------------------------------------------------------------
// PUBLIC API
// ---------------------------------------------------------------

export interface ExportOptions {
  includeUserData: boolean;
  includeDocker: boolean;
  includeDeployScripts: boolean;
  /** When true (and the caller is admin), dumps EVERY user's data. */
  includeAllUsersData?: boolean;
  onProgress: (stage: string, percent: number) => void;
}

export interface ExportResult {
  filesIncluded: number;
  filesSkipped: string[];
  totalSize: number;
}

// ---------------------------------------------------------------
// SOURCE FILE DISCOVERY (Vite import.meta.glob — bundles at build)
// ---------------------------------------------------------------

// Text/code files — read raw as a string. Vite glues these into the
// bundle, so the export works after deployment, not just in dev.
const TEXT_GLOBS = import.meta.glob(
  [
    '/src/**/*.{ts,tsx,js,jsx,css,json,md,html,svg,txt}',
    '/supabase/functions/**/*.{ts,js,json,md}',
    '/supabase/migrations/*.sql',
    '/supabase/config.toml',
    '/public/**/*.{html,json,txt,xml,svg,webmanifest,ico}',
    '/index.html',
    '/vite.config.ts',
    '/tailwind.config.ts',
    '/postcss.config.js',
    '/eslint.config.js',
    '/components.json',
    '/tsconfig.json',
    '/tsconfig.app.json',
    '/tsconfig.node.json',
    '/package.json',
    '/README.md',
  ],
  { query: '?raw', import: 'default', eager: false },
) as Record<string, () => Promise<string>>;

// Binary assets (images, fonts, audio). Vite returns the bundled URL;
// we then fetch the real bytes and add them to the zip as a Blob.
const BINARY_GLOBS = import.meta.glob(
  ['/src/assets/**/*', '/public/**/*.{png,jpg,jpeg,gif,webp,ico,woff,woff2,ttf,otf,mp3,mp4,wav,avif}'],
  { query: '?url', import: 'default', eager: false },
) as Record<string, () => Promise<string>>;

const stripLeadingSlash = (p: string) => (p.startsWith('/') ? p.slice(1) : p);

const collectTextFiles = async (
  onProgress: (pct: number) => void,
): Promise<{ files: { path: string; content: string }[]; skipped: string[] }> => {
  const entries = Object.entries(TEXT_GLOBS);
  const out: { path: string; content: string }[] = [];
  const skipped: string[] = [];

  const batchSize = 25;
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async ([path, loader]) => {
        try {
          const content = await loader();
          out.push({ path: stripLeadingSlash(path), content });
        } catch (e) {
          skipped.push(`${path} (text: ${(e as Error).message})`);
        }
      }),
    );
    onProgress(Math.round(((i + batch.length) / entries.length) * 45));
  }
  return { files: out, skipped };
};

const collectBinaryFiles = async (
  zip: JSZip,
  onProgress: (pct: number) => void,
): Promise<{ count: number; skipped: string[] }> => {
  const entries = Object.entries(BINARY_GLOBS);
  const skipped: string[] = [];
  let count = 0;

  const batchSize = 10;
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async ([path, loader]) => {
        try {
          const url = await loader();
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const blob = await res.blob();
          zip.file(stripLeadingSlash(path), blob, { binary: true });
          count++;
        } catch (e) {
          skipped.push(`${path} (binary: ${(e as Error).message})`);
        }
      }),
    );
    onProgress(45 + Math.round(((i + batch.length) / Math.max(entries.length, 1)) * 15));
  }
  return { count, skipped };
};

// ---------------------------------------------------------------
// GENERATED FILES
// ---------------------------------------------------------------

const PROJECT_REF = (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID ?? 'YOUR_PROJECT_REF';

const ENV_TEMPLATE = `# PendragonX environment configuration
# Get credentials from: https://supabase.com/dashboard/project/${PROJECT_REF}/settings/api

VITE_SUPABASE_URL=https://${PROJECT_REF}.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_SUPABASE_PROJECT_ID=${PROJECT_REF}
`;

const GITIGNORE = `node_modules
dist
dist-ssr
.env
.env.local
.env.*.local
.DS_Store
*.log
.vscode/*
!.vscode/extensions.json
.idea
.temp
`;

const buildRestoreGuide = (meta: any, manifest: any): string => `# Restoring PendragonX from this archive

This archive is a complete snapshot of the PendragonX codebase plus
the live Supabase project metadata required to redeploy from scratch.

> Generated: ${new Date().toISOString()}
> Source project ref: \`${meta?.project_ref ?? PROJECT_REF}\`

---

## 1. Prerequisites

- Node.js 20+ and npm/bun
- A new (empty) Supabase project — create at https://supabase.com
- Supabase CLI: \`npm i -g supabase\`

## 2. Install dependencies

\`\`\`bash
npm install
# or
bun install
\`\`\`

## 3. Recreate the database

Run every migration in \`supabase/migrations/\` in chronological order
(filenames are timestamp-prefixed and already sort correctly):

\`\`\`bash
supabase link --project-ref <YOUR_NEW_PROJECT_REF>
supabase db push
\`\`\`

This single command applies all ${manifest.migration_count} migration files
and reconstructs the entire schema, RLS policies, functions, triggers,
and pg_cron jobs.

## 4. Restore data

If you exported user data, apply it after migrations:

\`\`\`bash
psql "$SUPABASE_DB_URL" -f supabase/snapshot/data.sql
\`\`\`

## 5. Recreate storage buckets

The following buckets existed in the source project and must be
recreated. See \`supabase/snapshot/storage_manifest.json\` for the
full per-bucket file listing.

${(meta?.buckets ?? [])
  .map((b: any) => `- \`${b.name}\` (public: ${b.public}, ~${b.object_count} objects)`)
  .join('\n') || '- (no buckets recorded)'}

You will need an out-of-band backup of the actual file contents —
Supabase Storage objects are not exported in this archive because
they may be very large. Use \`supabase storage download\` or the
Dashboard's bulk export to capture them.

## 6. Set edge function secrets

The source project requires the following secrets. Set them in
**Supabase → Edge Functions → Secrets** before deploying functions:

${(meta?.secret_names_required ?? [])
  .map((n: string) => `- \`${n}\``)
  .join('\n') || '- (no custom secrets recorded)'}

> Reserved secrets (\`SUPABASE_URL\`, \`SUPABASE_ANON_KEY\`,
> \`SUPABASE_SERVICE_ROLE_KEY\`, etc.) are auto-provisioned by Supabase.
> Connector-managed secrets (e.g. \`FIRECRAWL_API_KEY\`) must be
> reconnected through the Lovable Cloud Connectors UI or set manually.

## 7. Deploy edge functions

Every edge function lives under \`supabase/functions/\`. Deploy them all:

\`\`\`bash
supabase functions deploy --project-ref <YOUR_NEW_PROJECT_REF>
\`\`\`

There are ${manifest.edge_function_count} edge functions in this archive.

## 8. Update environment and run

\`\`\`bash
cp .env.template .env
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev
\`\`\`

## 9. Deploy the frontend

The frontend is a standard Vite + React app. Build and deploy to any
static host (Vercel, Netlify, Cloudflare Pages, S3+CloudFront, your
own nginx — see \`docker/\`):

\`\`\`bash
npm run build
# dist/ is your deployable artifact
\`\`\`

---

## What's in this archive

- \`src/\` — full React/TypeScript frontend
- \`supabase/migrations/\` — full schema history (${manifest.migration_count} files)
- \`supabase/functions/\` — every edge function source
- \`supabase/config.toml\` — function JWT settings
- \`supabase/snapshot/\` — live data + metadata snapshot
- \`public/\` — static assets
- Root config: \`vite.config.ts\`, \`tailwind.config.ts\`, \`tsconfig*.json\`, etc.
- \`package.json\` — exact dependency versions
- \`docker/\` (if included) — production container setup
- \`deploy.sh\` / \`deploy.bat\` (if included) — one-shot setup scripts

Total source files: ${manifest.text_file_count + manifest.binary_file_count}
`;

const DOCKERFILE = `FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`;

const NGINX = `server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;
  location / { try_files $uri /index.html; }
  location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
`;

const DOCKER_COMPOSE = `version: "3.9"
services:
  pendragonx:
    build: .
    ports: ["8080:80"]
    restart: unless-stopped
`;

const DEPLOY_BASH = `#!/usr/bin/env bash
set -euo pipefail
echo "Installing dependencies..."
npm ci
echo "Copy .env.template to .env and fill in your Supabase credentials, then:"
echo "  supabase link --project-ref <YOUR_NEW_PROJECT_REF>"
echo "  supabase db push"
echo "  supabase functions deploy"
echo "  npm run build"
`;

const DEPLOY_BAT = `@echo off
echo Installing dependencies...
call npm ci
echo Copy .env.template to .env, then run:
echo   supabase link --project-ref YOUR_NEW_PROJECT_REF
echo   supabase db push
echo   supabase functions deploy
echo   npm run build
pause
`;

// ---------------------------------------------------------------
// SUPABASE SNAPSHOT
// ---------------------------------------------------------------

const fetchSupabaseMeta = async (): Promise<any> => {
  try {
    const { data, error } = await supabase.functions.invoke('export-supabase-meta');
    if (error) return { error: error.message };
    return data;
  } catch (e: any) {
    return { error: e?.message ?? 'unknown' };
  }
};

const fetchUserData = async (allUsers: boolean): Promise<{ sql: string; data: any; meta: any }> => {
  try {
    const { data, error } = await supabase.functions.invoke('export-user-data', {
      body: { mode: allUsers ? 'admin-all' : 'single-user' },
    });
    if (error) {
      return {
        sql: `-- User data export skipped: ${error.message}\n`,
        data: {},
        meta: { error: error.message },
      };
    }
    return {
      sql: data?.sql ?? '-- (no data)\n',
      data: data?.data ?? {},
      meta: { mode: data?.mode, table_counts: data?.table_counts, skipped: data?.skipped },
    };
  } catch (e: any) {
    return { sql: `-- export failed: ${e?.message}\n`, data: {}, meta: { error: e?.message } };
  }
};

// ---------------------------------------------------------------
// MAIN ENTRY POINT
// ---------------------------------------------------------------

export const exportCodebase = async (
  userEmail: string,
  options?: Partial<ExportOptions>,
): Promise<ExportResult> => {
  if (userEmail !== 'mpalmero197@gmail.com') {
    throw new Error('Export functionality is restricted to authorized users only.');
  }

  const opts: ExportOptions = {
    includeUserData: options?.includeUserData ?? true,
    includeDocker: options?.includeDocker ?? true,
    includeDeployScripts: options?.includeDeployScripts ?? true,
    includeAllUsersData: options?.includeAllUsersData ?? true,
    onProgress: options?.onProgress ?? (() => {}),
  };

  const zip = new JSZip();
  const skipped: string[] = [];

  try {
    opts.onProgress('Discovering source files...', 2);

    // 1. Text files (0–45%)
    const { files: textFiles, skipped: textSkipped } = await collectTextFiles((p) =>
      opts.onProgress('Collecting source code...', p),
    );
    skipped.push(...textSkipped);
    for (const f of textFiles) zip.file(f.path, f.content);

    // 2. Binary assets (45–60%)
    const { count: binaryCount, skipped: binarySkipped } = await collectBinaryFiles(
      zip,
      (p) => opts.onProgress('Collecting binary assets...', p),
    );
    skipped.push(...binarySkipped);

    // 3. Always-included generated files
    opts.onProgress('Generating env + gitignore templates...', 62);
    zip.file('.env.template', ENV_TEMPLATE);
    zip.file('.gitignore', GITIGNORE);

    // 4. Live Supabase snapshot (62–85%)
    opts.onProgress('Snapshotting Supabase metadata...', 65);
    const meta = await fetchSupabaseMeta();
    zip.file('supabase/snapshot/metadata.json', JSON.stringify(meta, null, 2));

    if (meta && !meta.error) {
      const secretsTxt =
        '# Required secrets (set via Supabase Dashboard → Edge Functions → Secrets)\n' +
        '# Values are intentionally NOT exported. Recover values from your password manager,\n' +
        '# original integration provider dashboards, or Lovable Cloud connector reconnect flow.\n\n' +
        (meta.secret_names_required ?? []).join('\n') + '\n';
      zip.file('supabase/snapshot/secrets_required.txt', secretsTxt);
      zip.file(
        'supabase/snapshot/storage_manifest.json',
        JSON.stringify(meta.buckets ?? [], null, 2),
      );
    }

    if (opts.includeUserData) {
      opts.onProgress('Exporting user data...', 75);
      const { sql, data, meta: dataMeta } = await fetchUserData(!!opts.includeAllUsersData);
      zip.file('supabase/snapshot/data.sql', sql);
      zip.file('supabase/snapshot/data.json', JSON.stringify(data, null, 2));
      zip.file('supabase/snapshot/data_meta.json', JSON.stringify(dataMeta, null, 2));
    }

    // 5. Docker (85–88%)
    if (opts.includeDocker) {
      opts.onProgress('Adding Docker setup...', 86);
      zip.file('Dockerfile', DOCKERFILE);
      zip.file('docker/nginx.conf', NGINX);
      zip.file('docker-compose.yml', DOCKER_COMPOSE);
    }

    // 6. Deploy scripts (88–90%)
    if (opts.includeDeployScripts) {
      opts.onProgress('Adding deployment scripts...', 89);
      zip.file('deploy.sh', DEPLOY_BASH);
      zip.file('deploy.bat', DEPLOY_BAT);
    }

    // 7. Manifest + RESTORE.md (90–93%)
    opts.onProgress('Writing restore guide...', 91);
    const migrationCount = textFiles.filter((f) => f.path.startsWith('supabase/migrations/')).length;
    const edgeFnCount = new Set(
      textFiles
        .filter((f) => f.path.startsWith('supabase/functions/') && f.path.endsWith('/index.ts'))
        .map((f) => f.path),
    ).size;
    const manifest = {
      exported_at: new Date().toISOString(),
      project_ref: meta?.project_ref ?? PROJECT_REF,
      text_file_count: textFiles.length,
      binary_file_count: binaryCount,
      migration_count: migrationCount,
      edge_function_count: edgeFnCount,
      bucket_count: meta?.buckets?.length ?? 0,
      secret_count: meta?.secret_names_required?.length ?? 0,
      skipped,
      options: opts,
    };
    zip.file('EXPORT_MANIFEST.json', JSON.stringify(manifest, null, 2));
    zip.file('RESTORE.md', buildRestoreGuide(meta, manifest));

    // 8. Package the archive (93–100%)
    opts.onProgress('Compressing archive...', 95);
    const blob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const stamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    saveAs(blob, `pendragonx-complete-${stamp}.zip`);

    opts.onProgress('Export complete!', 100);

    return {
      filesIncluded: textFiles.length + binaryCount,
      filesSkipped: skipped,
      totalSize: blob.size,
    };
  } catch (err) {
    console.error('Codebase export failed:', err);
    throw new Error(`Failed to export codebase: ${(err as Error).message}`);
  }
};
