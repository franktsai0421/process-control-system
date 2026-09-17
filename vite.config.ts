import { sites } from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';
import hostingConfig from './.openai/hosting.json';
import { localBackupPlugin } from './lib/local-backup-vite.mjs';
import { assertLocalMode, localPaths, readLocalSession, configureOfflineLocal } from './lib/local-runtime.mjs';

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  '00000000-0000-4000-8000-000000000000';

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

const localBindingConfig = {
  main: 'vinext/server/fetch-handler',
  compatibility_flags: ['nodejs_compat'],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: 'site-creator-d1',
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: 'site-creator-r2',
        },
      ]
    : [],
};

export default defineConfig(async ({ command }) => {
  const local = command === 'serve';
  if (local) { assertLocalMode([], process.env); configureOfflineLocal(process.cwd()); }
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= 'false';
  process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';
  process.env.WRANGLER_REGISTRY_PATH ??= '.wrangler/registry';

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import('@cloudflare/vite-plugin');

  return {
    css: { postcss: { plugins: [tailwindcss()] } },
    server: { host: '127.0.0.1', strictPort: true, hmr: false, headers: {'Content-Security-Policy': "connect-src 'self'; font-src 'self' data:; img-src 'self' data: blob:; media-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; frame-src 'self'"}, watch: { ignored: ['**/.wrangler/**','**/local-backup.*.json','**/AI_CONTEXT/**'], ...(isCodexSeatbeltSandbox ? {useFsEvents:false,usePolling:true} : {}) } },
    plugins: [
      localBackupPlugin(process.cwd()),
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
        ...(local ? {
          configPath: localPaths(process.cwd()).config,
          persistState: { path: localPaths(process.cwd()).state },
          remoteBindings: false,
          inspectorPort: false,
          tunnel: false,
          config: {
            main: 'vinext/server/fetch-handler',
            vars: {
              PROCESS_SESSION_SECRET: readLocalSession(process.cwd()),
              PROCESS_LOCAL_IMAGES: 'true',
              DEMO_LOGIN_ENABLED: process.env.DEMO_LOGIN_ENABLED ?? 'true',
            },
          },
        } : { config: localBindingConfig }),
      }),
    ],
  };
});
