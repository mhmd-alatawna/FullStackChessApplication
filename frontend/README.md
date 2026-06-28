# Chess Grove frontend

React client for the Chess Grove REST and Socket.IO backend.

## Install and run

Start the backend first, then:

```powershell
npm install
npm start
```

Open `http://localhost:5173`. The committed `.env.development` uses:

```dotenv
PORT=5173
REACT_APP_API_BASE_URL=http://localhost:3000
```

Copy `.env.example` to `.env` only when overriding those values.

## Main screens

- Login and signup
- Dashboard and player statistics
- Profile and settings
- Human matchmaking and AI opponent selection
- Live timed chess board and game result
- Game history
- Manager/admin user and game management

REST calls are centralized in `src/services/api.js`; authenticated Socket.IO behavior is centralized
in `src/services/live.js` and `src/context/LiveContext.jsx`. See [the project README](../README.md)
for installation, database, API, WebSocket, AI, and limitation details.
