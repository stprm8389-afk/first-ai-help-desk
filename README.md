# AI Help Desk Assistant

This repository contains a client-only AI Help Desk Assistant and an optional simple Express backend for persistence.

How to use (frontend-only):
- Open index.html in a browser. The app uses localStorage to persist tickets and chat.

How to run the backend (optional):
cd server
npm install
npm start

This starts an Express server on port 3000. Open the app in browser via http://localhost:3000 to use the backend. The frontend will auto-detect and prefer the backend unless set to "Local only".

Tests:
cd server
npm test
