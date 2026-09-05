import { copyFileSync } from 'node:fs';
for (const name of ['maplibre-gl-worker.mjs','maplibre-gl-shared.mjs']) copyFileSync(new URL('../node_modules/maplibre-gl/dist/'+name,import.meta.url),new URL('../public/'+name,import.meta.url));
