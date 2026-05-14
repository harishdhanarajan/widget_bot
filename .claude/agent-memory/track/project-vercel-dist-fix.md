---
name: project-vercel-dist-fix
description: Why dist lives in two places and how the copy script bridges them for Vercel deployment
metadata:
  type: project
---

The build outputs to `packages/loader/dist/` (Vite's `outDir` inside the workspace package), but Vercel requires a `dist/` at the project root. The script `scripts/copy-loader-dist.mjs` copies `packages/loader/dist` to `./dist` after every build. This is what the commits "fix: output dist to project root for vercel" and "fixes dist" addressed.

**Why:** Changing Vite's `outDir` to point directly at the project root caused path resolution issues inside the workspace. The copy script is the stable solution.

**How to apply:** Do not suggest changing `outDir` in `vite.config.ts` to the project root — it was tried and broke things. The two-step build (vite build + copy script) is intentional. `vercel.json` `outputDirectory` must remain `"dist"` (project root).
