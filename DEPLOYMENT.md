# ModelMind Production Deployment Guide

ModelMind uses a split architecture in production:
- **Frontend**: React + TypeScript + Vite SPA deployed on **Vercel** (browser IndexedDB history works client-side out of the box).
- **Backend**: Docker container deployed on **Render** running **Node.js + Express**, **Python 3** (`pymupdf` & `python-pptx`), and the **Linux-compiled C++14 DSA engine** (`cxx/bin/modelmind_engine`).

---

## 1. Local Docker Verification (Backend)

Build and run the exact production backend container locally:

```bash
# Build the Linux Docker image (compiles C++14 engine and installs Python + Node deps)
docker build -t modelmind-backend .

# Run the backend container
docker run --rm -p 10000:10000 \
  -e PORT=10000 \
  -e CORS_ORIGIN="http://localhost:5173,https://your-app.vercel.app" \
  modelmind-backend
```

Verify the container health endpoint:
```bash
curl http://localhost:10000/api/health
```

---

## 2. Deploying the Backend on Render

1. Push this repository to GitHub/GitLab.
2. In the **Render Dashboard**, click **New +** -> **Web Service** (or **Blueprint** to auto-import `render.yaml`).
3. Configure the service:
   - **Environment / Runtime**: `Docker`
   - **Dockerfile Path**: `./Dockerfile`
   - **Health Check Path**: `/api/health`
4. Set Render **Environment Variables**:
   - `NODE_ENV` = `production`
   - `CORS_ORIGIN` = `https://your-vercel-app.vercel.app` (you can include comma-separated origins, e.g. `https://your-vercel-app.vercel.app,https://*.vercel.app`)
5. Deploy and copy your live Render service URL (e.g., `https://modelmind-backend.onrender.com`).
6. Confirm `https://modelmind-backend.onrender.com/api/health` returns `"status": "ok"`, `"cppEngineReady": true`, and `"pythonScriptsReady": true`.

---

## 3. Deploying the Frontend on Vercel

1. In the **Vercel Dashboard**, import the same repository.
2. Configure **Project Settings**:
   - **Root Directory**: `.` (repository root)
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Set Vercel **Environment Variables**:
   - `VITE_API_BASE_URL` = `https://modelmind-backend.onrender.com` *(no trailing slash)*
   - Optional (only if using remote anonymous history): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
4. Deploy on Vercel, then update `CORS_ORIGIN` on Render with your exact Vercel production domain (`https://your-project.vercel.app`) and redeploy/restart Render if needed.

---

## 4. Operational Notes & Limitations

- **Render Free Tier Cold Starts**: Free Render instances spin down after 15 minutes of inactivity; the first request after idle may take 30–50 seconds.
- **Ephemeral Uploads**: Uploaded PDFs and `.pptx` files are stored temporarily in `uploads/` and deleted immediately after text extraction.
- **Legacy `.ppt` Binary Format**: `.pptx` (Open XML) works natively via `python-pptx` in the container. Legacy `.ppt` conversion requires LibreOffice (`soffice`), which is omitted from the lean Dockerfile to minimize image size; users uploading `.ppt` receive an explicit prompt to save as `.pptx`.
- **Browser Search History**: Saved analyses, favorites, and search history persist locally in the user's browser via IndexedDB (`modelmind_history_db`) with no backend login or database required.
