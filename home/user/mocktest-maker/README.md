# MockTest Maker

**AI-Powered Mock Test Generator for JEE Main + Advanced**

Complete JEE Syllabus (**92 Chapters**) • Create high-quality, chapter-wise mock tests in seconds.

- **Mathematics**: 30 Chapters (Class 11 + 12)
- **Physics**: 30 Chapters (Class 11 + 12)
- **Chemistry**: 32 Chapters (Class 11 + 12)

Select subjects, pick any specific chapters (or All), choose PYQ style or fresh conceptual questions, and generate 10–50 questions per subject.

✅ Login with Google (Firebase)  
✅ Save unlimited tests to your account  
✅ Take timed quizzes with instant scoring + explanations  
✅ Download beautiful PDF versions  
✅ Fully customizable chapters  
✅ Powered by Google Gemini 1.5 Flash (very fast & cheap)

## Features

- **Complete JEE Syllabus (92 Chapters)**: Full official JEE Main + Advanced syllabus (30 Math + 30 Physics + 32 Chemistry)
- **Flexible Subjects**: Math only, Physics only, Chemistry only, or any combination
- **Chapter-wise Selection**: Pick any chapters (or "All") for hyper-focused practice
- **PYQ Mode**: Questions styled after real Previous Year Questions from JEE Main/Advanced/NEET
- **Quiz Mode**: Full interactive test with answer selection, auto-score, and detailed explanations
- **Save & Reuse**: All tests saved in Firestore, accessible from any device
- **PDF Export**: Clean, printable PDF with correct answers highlighted
- **Regenerate**: Get completely new questions with the same settings (great for multiple attempts)

## Tech Stack

- Next.js 16 (App Router) + TypeScript + Tailwind
- Firebase (Auth + Firestore)
- Google Gemini API
- jsPDF for downloads
- Sonner for beautiful toasts

## Getting Started

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd mocktest-maker
npm install
```

### 2. Firebase Setup (Required for Login + Saving Tests)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Enable **Authentication** → Sign-in method → Enable **Google**
4. Enable **Firestore Database** (start in production mode or test mode)
5. Go to Project Settings → General → Your apps → Add Web app
6. Copy the `firebaseConfig` object

Open `lib/firebase.ts` and replace the placeholder values:

```ts
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  // ... rest of the config
};
```

### 3. Google Gemini API Key (Required for Question Generation)

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key (free tier is generous)
3. In the app, click **Settings** → paste your key → Save

The key is stored only in your browser's `localStorage`.

### 4. Run Locally

```bash
npm run dev
```

Open http://localhost:3000

### 5. Deploy on Vercel (Recommended)

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Vercel will auto-detect Next.js
4. Add these Environment Variables (optional but recommended):

   - You can keep using the in-app Settings for the Gemini key (it's client-side anyway)
   - Firebase config is currently hardcoded in `lib/firebase.ts` (recommended for simplicity)

5. Deploy!

After first deployment, update your Firebase authorized domains to include your Vercel domain.

## Environment Variables (Optional)

Create a `.env.local` file (not committed):

```env
# Optional: If you want to hardcode the Gemini key server-side (advanced)
# GEMINI_API_KEY=AIzaSy...
```

Currently the app uses the key entered in Settings for maximum user control.

## How to Use

1. Login with Google
2. Choose subjects
3. (Optional) Select specific chapters
4. Set number of questions per subject (default 25)
5. Toggle **Include PYQ Style**
6. Click **Generate**
7. Preview questions, then:
   - **Take Test** (full quiz mode)
   - **Download PDF**
   - **Save** (to your account)

You can also load previously saved tests from the **My Saved Tests** tab.

## Project Structure

```
mocktest-maker/
├── app/
│   ├── layout.tsx
│   └── page.tsx           # Main UI
├── lib/
│   ├── firebase.ts        # Firebase config (edit this)
│   └── gemini.ts          # Question generation + chapter data
├── types/
│   └── index.ts
├── README.md
└── package.json
```

## Important Notes

- The Gemini API calls happen directly from the browser (client-side). This keeps things simple and costs nothing to you (user pays for their own usage).
- Questions are cached only in the current session until you save them.
- For production use with many users, you may want to move generation to an API route + server-side key in the future.

## License

MIT — feel free to use and modify.

---

Made for serious JEE/NEET aspirants. Good luck with your preparation! 🚀
