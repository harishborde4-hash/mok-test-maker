# MockTest Maker

**AI-Powered Mock Test Generator for JEE Main + Advanced**

Complete JEE Syllabus (**92 Chapters**) • Create high-quality, chapter-wise mock tests in seconds.

- **Mathematics**: 30 Chapters (Class 11 + 12)
- **Physics**: 30 Chapters (Class 11 + 12)
- **Chemistry**: 32 Chapters (Class 11 + 12)

## Features

- **Pure PYQ (Exact)** mode – tries to match real past year questions
- **JEE Advanced** mode – harder, multi-concept questions
- **Timed Tests** with automatic submission (cannot be extended)
- 30+ useful features (flags, bookmarks, practice modes, analytics, CSV export, diagrams, etc.)
- Login with Google + Save tests to cloud
- Download PDF + Export CSV

## Getting Started (Ready for GitHub)

This project is **safe to upload to GitHub** as-is.

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd mocktest-maker
npm install
```

### 2. Add Your Keys (Important)

#### Option A: Local Development (Recommended)

1. Copy the example file:
   ```bash
   cp .env.example .env.local
   ```

2. Open `.env.local` and fill in your **real Firebase config**:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   # ... etc
   ```

3. Run the app:
   ```bash
   npm run dev
   ```

4. Open the app → Click **Settings** (top right) → Paste your **Gemini API key** and save.

#### Option B: Vercel Deployment (Best for Production)

1. Push the code to GitHub **without** real keys (the repo is already clean).
2. Go to [Vercel](https://vercel.com) → New Project → Import your repo.
3. In Vercel Project Settings → **Environment Variables**, add:

   ```
   NEXT_PUBLIC_FIREBASE_API_KEY
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
   NEXT_PUBLIC_FIREBASE_PROJECT_ID
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
   NEXT_PUBLIC_FIREBASE_APP_ID
   ```

4. Redeploy.
5. After deployment, open the live site → **Settings** → paste your Gemini API key.

### 3. Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable **Authentication → Sign-in method → Google**
3. Enable **Firestore Database**
4. Add your domain (e.g. `your-project.vercel.app`) in Authentication → Authorized domains
5. Copy the Web app config and use it in `.env.local` or Vercel env vars.

### 4. Gemini API Key

Get a free key from: https://aistudio.google.com/app/apikey

**Important**: Enter this key **inside the app** after opening the site (Settings button). It is stored only in your browser.

## Safe to Push to GitHub?

**Yes.** The project is configured to be GitHub-friendly:

- Real keys are loaded from environment variables (`.env.local` or Vercel).
- `lib/firebase.ts` falls back to placeholders if no env vars are set.
- `.gitignore` properly ignores `.env*` files.

## Project Structure

```
mocktest-maker/
├── app/
│   └── page.tsx
├── lib/
│   ├── firebase.ts          # Firebase config (uses env vars)
│   └── gemini.ts            # Question generation + 92 chapters
├── .env.example             # Template for your keys
├── .gitignore               # Safe for GitHub
└── README.md
```

## License

MIT

Made for JEE aspirants. Good luck with your preparation! 🚀
