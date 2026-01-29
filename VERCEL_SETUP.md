# Fix Vercel 404 – checklist

If your Vercel URL shows **404 Not Found** after setting Root Directory, check these in the Vercel dashboard.

## 1. Root Directory

- **Settings** → **General** → **Build & Development Settings**
- **Root Directory**: must be **`my-app`** (this repo’s app lives in that folder).
- Leave **Include source files outside of the Root Directory** unchecked unless you need it.

## 2. Framework Preset

- Same **Build & Development Settings** section.
- **Framework Preset**: must be **Next.js**.
- If it’s “Other” or something else, change it to **Next.js** and save.

## 3. Output Directory

- In **Build & Development Settings**, find **Output Directory**.
- For Next.js it must be **empty** (Vercel uses the framework’s output).
- If it’s set to e.g. `out` or `.next`, **clear it** and save.

## 4. Build command

- **Build Command**: leave default, or set to **`pnpm build`** (or `npm run build` / `yarn build` if you use those).
- **Install Command**: **`pnpm install`** (or npm/yarn equivalent).

## 5. Redeploy

- Go to **Deployments**.
- Open the **⋯** menu on the latest deployment → **Redeploy**.
- Wait for the build to finish and open the deployment URL again.

## 6. If it still 404s

- Open the latest deployment and check **Build Logs**. If the build failed, fix the error and redeploy.
- Check **Runtime Logs** for errors when you open the URL.
- Try creating a **new project** and importing the same repo, then set **Root Directory** to `my-app` and **Framework Preset** to **Next.js** before the first deploy.
