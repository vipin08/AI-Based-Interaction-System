# Installation Guide

## Prerequisites
- Node.js installed
- A valid API key
- Chrome or a Chromium browser for voice input

## Steps

1. Install backend dependencies from the workspace root:

```bash
npm run install:backend
```

2. Open the backend folder and create the environment file if needed:

```bash
cd backend
copy .env.example .env
```

3. Add your API key in `backend/.env`:

```env
GROQ_API_KEY=your_groq_api_key_here
PORT=3000
```

4. Start the server from the workspace root:

```bash
cd ..
npm run dev
```

Or from `backend` directly:

```bash
npm run dev
```

5. Open the app:

```text
http://localhost:3000
```

## Notes
- `frontend` contains the UI files.
- `backend` contains the server and API routes.
- Voice input works best in Chrome with microphone permission enabled.
