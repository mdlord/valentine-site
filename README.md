# Valentine site (React + Vite)

## Run
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Discord visit notifications (Netlify)
This project sends a Discord message every time the site is opened.
The app calls `/api/notify-site-open`.
- In local Vite dev, this is handled by a Vite middleware endpoint.
- In Netlify deploys, `/api/notify-site-open` is redirected to `/.netlify/functions/notify-site-open`.

Set these Netlify environment variables:
- `DISCORD_WEBHOOK_URL`
- `DISCORD_USERNAME` (optional)

For local dev, set the same variables in your shell or `.env.local`.
