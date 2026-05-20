# ހިލޭ+ · Free Maldives TV

A beautiful live TV web app for Hilay TV — streams every channel directly in the browser via a self-hosted proxy server.

---

## How it works

```
Browser  →  Your proxy server (on Render)  →  hilay.tv streams  →  back to browser
```

The proxy server fetches the M3U playlist and all video segments server-side, so CORS restrictions are bypassed completely. Users just open your URL and click any channel — it plays instantly.

---

## Deploy in 5 minutes (free, no credit card)

### Step 1 — Put the code on GitHub

1. Go to **https://github.com/new** and create a new repository (e.g. `hilaytv`)
2. Upload these files keeping the same folder structure:
   ```
   server.js
   package.json
   render.yaml
   public/
     index.html
   ```
   - Click **"uploading an existing file"** on the new repo page
   - Drag and drop all files, then click **Commit changes**

### Step 2 — Deploy on Render (free)

1. Go to **https://render.com** and sign up (free, no card needed)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account and select your `hilaytv` repo
4. Render will auto-detect the settings from `render.yaml`. Just confirm:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
5. Click **"Create Web Service"**
6. Wait ~2 minutes for it to build and deploy

### Step 3 — Open your app

Render gives you a free URL like:
```
https://hilaytv-proxy.onrender.com
```

Open it in any browser — select a channel — it plays. Done. ✓

Share this URL with anyone. It works on phone, tablet, and desktop.

---

## File structure

```
hilaytv/
├── server.js          ← Node.js proxy server (no npm dependencies needed)
├── package.json       ← App config
├── render.yaml        ← Render auto-deploy config
└── public/
    └── index.html     ← The full TV app frontend
```

---

## Notes

- **Free tier on Render** spins down after 15 minutes of inactivity — first load after idle takes ~30 seconds to wake up. Paid plan ($7/mo) keeps it always on.
- The proxy rewrites all m3u8 playlist segment URLs so every video chunk also flows through your server.
- Channels that Hilay TV has online will play. If Hilay TV itself is down for a channel, it won't play here either.
- Favourites are saved per-browser in localStorage.
