# Search + AI Answers Demo — AddSearch

A complete demo of **AddSearch AI Answers** and **AI Conversations** built with Next.js (App Router). Search any query, get an AI-generated answer powered by AddSearch's indexed content, and explore further with the "Dive Deeper" follow-up feature.

**Live demo siteKey:** `1bed1ffde465fddba2a53ad3ce69e6c2`

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 14 (App Router) | Vercel-native, zero config deploy |
| Search & AI | AddSearch JS Client + Search UI | CDN-loaded, no build step needed |
| Styling | Plain CSS (`globals.css`) | No Tailwind / no frameworks |
| Hosting | Vercel (free tier) | One-click deploy from GitHub |

---

## File Tree

```
addsearch-ai-answers-demo/
├── package.json
├── next.config.js
├── .gitignore
├── README.md
├── public/
│   └── sample-data/
│       └── recipes.json              # Tiny fallback sample data
└── app/
    ├── globals.css                    # All styles (plain CSS)
    ├── layout.js                      # Root layout, fonts, CDN scripts
    ├── page.js                        # Home: Search + AI Answers + Results
    ├── dive/
    │   └── page.js                    # Dive Deeper: follow-up Q&A
    ├── components/
    │   ├── SearchBox.js               # Search input with rate limit
    │   ├── AiAnswersBox.js            # AI answer card + Dive Deeper btn
    │   └── ResultsList.js             # Keyword search results list
    └── api/
        └── proxy/
            ├── aiAnswers/
            │   └── route.js           # Optional server proxy (placeholder)
            └── aiConversations/
                └── route.js           # Optional server proxy (placeholder)
```

---

## How to Deploy (No Terminal Required)

### Step 1: Create a GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. **Repository name:** `addsearch-ai-demo` (or any name you like)
3. Set to **Public** or **Private** (either works with Vercel)
4. **Do NOT** check "Add a README file" (we provide our own)
5. Click **Create repository**

### Step 2: Upload All Project Files

1. On your new repo page, click **"uploading an existing file"** (or go to `https://github.com/YOUR_USERNAME/addsearch-ai-demo/upload/main`)
2. Drag-and-drop **all files and folders** from this project into the upload area:
   - `package.json`
   - `next.config.js`
   - `.gitignore`
   - `README.md`
   - The entire `app/` folder
   - The entire `public/` folder
3. **Important:** GitHub's web uploader handles files well. If it doesn't accept folders, create each folder by clicking **"Create new file"** and typing the path (e.g., `app/page.js`) then pasting the file contents.
4. Click **"Commit changes"**

> **Tip:** You may need to do multiple uploads. Upload `package.json`, `next.config.js`, `.gitignore`, and `README.md` first. Then create/upload each file inside `app/` and `public/` one at a time using the "Create new file" button.

### Step 3: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with your GitHub account
2. Click **"Add New…"** → **"Project"**
3. Find and select your `addsearch-ai-demo` repository → click **Import**
4. **Framework Preset:** Vercel auto-detects **Next.js** — leave it as-is
5. **Root Directory:** Leave blank (default)
6. Expand **"Environment Variables"** and add:
   - **Name:** `NEXT_PUBLIC_ADDSEARCH_SITEKEY`
   - **Value:** `1bed1ffde465fddba2a53ad3ce69e6c2`
   - Click **"Add"**
7. Click **"Deploy"**
8. Wait 1–2 minutes. Vercel will show you a live URL like `https://addsearch-ai-demo.vercel.app`

### Step 4: Verify

Open the Vercel URL and run through the testing checklist below.

---

## Environment Variables

| Variable | Where | Required | Purpose |
|----------|-------|----------|---------|
| `NEXT_PUBLIC_ADDSEARCH_SITEKEY` | Vercel dashboard → Settings → Environment Variables | Recommended | Your AddSearch public siteKey. Falls back to the demo key in code. |
| `ADDSEARCH_SECRET_KEY` | Vercel dashboard (if using server proxy) | Optional | Only needed if you activate the server-side proxy routes. |

**To update env vars after initial deploy:**
1. Go to your project on [vercel.com](https://vercel.com)
2. Click **Settings** → **Environment Variables**
3. Add or edit the variable
4. Go to **Deployments** tab → click the **⋮** menu on the latest deployment → **Redeploy**

---

## Testing Checklist

- [ ] **Home page loads.** You see the hero, search bar, and CTA section.
- [ ] **Search for "chocolate cake"** → AI Answers box appears with a summary, highlights, and sources. Keyword results appear below.
- [ ] **Citations** in the AI Answers box open the referenced URL **in the same tab**.
- [ ] Click **"Dive Deeper"** → navigates to `/dive` and shows the initial answer at the top.
- [ ] On `/dive`, enter a follow-up question (input labelled **"Dive Deeper"**) → receive a grounded response.
- [ ] **Rate limit works:** Clicking Search twice rapidly shows "Please wait a moment" message.
- [ ] **Character limit works:** Cannot type more than ~200 characters; error shows if exceeded.
- [ ] **CTAs work:** "Start Free Trial" opens AddSearch signup. "Personalized Demo" opens HubSpot booking.

---

## Where to Edit CTA Copy

| What | File | Look for |
|------|------|----------|
| Hero title & subtitle | `app/page.js` | `hero-title`, `hero-subtitle` |
| CTA headline | `app/page.js` and `app/dive/page.js` | `cta-headline`, `cta-subheadline` |
| CTA button text & URLs | `app/page.js` and `app/dive/page.js` | `cta-btn-primary`, `cta-btn-secondary` |
| Search placeholder | `app/components/SearchBox.js` | `placeholder=` |
| AI answer labels | `app/components/AiAnswersBox.js` | `AI-Generated Answer`, `Based on these sources` |
| Follow-up placeholder | `app/dive/page.js` | `placeholder=` |
| Button labels | Search in all files for `Search`, `Dive Deeper` |

---

## File Purposes

| File | Purpose |
|------|---------|
| `package.json` | Dependencies: Next.js 14 + React 18 only |
| `next.config.js` | Empty config — Vercel handles everything |
| `app/layout.js` | Loads Google Fonts, AddSearch CDN scripts |
| `app/globals.css` | All styling — plain CSS with custom properties |
| `app/page.js` | Home page: orchestrates search, AI answers, results |
| `app/dive/page.js` | Follow-up page: multi-turn Q&A seeded with initial answer |
| `app/components/SearchBox.js` | Input with 200-char limit, 2s rate limiting |
| `app/components/AiAnswersBox.js` | Renders AI answer card with Dive Deeper button |
| `app/components/ResultsList.js` | Renders keyword search result cards |
| `app/api/proxy/aiAnswers/route.js` | Placeholder server proxy for AI Answers |
| `app/api/proxy/aiConversations/route.js` | Placeholder server proxy for AI Conversations |
| `public/sample-data/recipes.json` | Tiny sample data for fallback/demo purposes |

---

## References

- [AddSearch Documentation](https://www.addsearch.com/docs/)
- [Implementing AI Answers](https://www.addsearch.com/docs/implementing-ai-answers/)
- [Installing AI Conversations](https://www.addsearch.com/docs/installing-ai-conversations/)
- [AddSearch JS Client (GitHub)](https://github.com/AddSearch/js-client-library)
- [AddSearch Search UI (GitHub)](https://github.com/AddSearch/search-ui)
- [AddSearch API Reference](https://www.addsearch.com/docs/api/)
