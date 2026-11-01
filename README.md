# EyeClinic

Online eye care and appointment management app built with React, TypeScript, and Vite.

## Run locally

Install [Bun](https://bun.sh), then run:

```sh
bun install --frozen-lockfile
bun run dev
```

## Deploy with GitHub Pages

1. Put the contents of this project at the root of a GitHub repository.
2. In **Settings → Pages**, set the source to **GitHub Actions**.
3. Push to `main` or `master`, or run **Deploy to GitHub Pages** from the Actions tab.

The workflow installs dependencies from `bun.lock`, builds the Vite app, and deploys the generated `dist` folder. No `package-lock.json` is required. The Vite production base is relative, so it works for both user sites and repository project pages.

Do not commit real API keys or credentials. GitHub Pages serves static frontend files; secrets embedded in a frontend build are visible to site visitors.
