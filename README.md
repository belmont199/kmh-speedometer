# kmh-speedometer

GPS speedometer in km/h for a car that only shows mph. Next.js + TypeScript, exported as static files to GitHub Pages.

Live: https://belmont199.github.io/kmh-speedometer/

## Develop

```bash
cd web
npm install
npm run dev        # http://localhost:3000/kmh-speedometer/
npm test           # speed and trip math
npm run typecheck
```

## Publish

GitHub Pages serves the repo root of `main`. Build and copy the export there:

```bash
cd web && npm run build && cd .. && cp -r web/out/. . && touch .nojekyll
git add -A && git commit -m "Publish" && git push
```

`.nojekyll` must stay, or GitHub Pages hides the `_next/` folder.
