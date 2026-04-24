# Installation Guide

## Prerequisites
- Node.js installed
- A valid API key in `backend/.env`
- Chrome or a Chromium browser for voice input

## Steps

1. Open the backend folder:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Create the environment file if needed:

```bash
copy .env.example .env
```

4. Add your API key in `backend/.env`:

```env
OPENAI_API_KEY=your_api_key_here
PORT=3000
MAX_CONTEXT_MESSAGES=12
```

5. Start the server:

```bash
npm run dev
```

6. Open the app:

```text
http://localhost:3000
```

## Notes
- `frontend` contains the UI files.
- `backend` contains the server and API routes.
- Voice input works best in Chrome with microphone permission enabled.
