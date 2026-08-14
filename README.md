# Website - Store Website project

Travel Portal: split expenses with friends (multi-currency, per-event hatian), travel guides with food recommendations and an itinerary generator with AI enhancement.

## Run locally

```
npm install
npm start
```

Open http://localhost:8080 - on first visit choose Offline mode (data stays in the browser) or Sync with Turso.

## Test

```
npm test
```

## Structure

- Site files live at the repo root (so GitHub Pages serves them with folder `/(root)`):
  - `static/api.js` - browser API shim (Turso HTTP API or localStorage engine)
  - `static/localdb.js` - offline database engine (localStorage)
  - `static/guides.js` - travel guides + itinerary generator + AI (Google Gemini free tier)
  - `static/split.js` - expense splitter
- `scripts/` - local server + test suite
- `netlify/` - optional legacy Netlify function (not needed for GitHub Pages)