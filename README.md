# Chess Hub — Full Stack Chess Application

A full-stack chess platform built with Node.js/Express (backend) and React (frontend).

## Prerequisites

- Node.js v18+
- npm

## Setup & Run

### 1. Backend

```bash
cd backend
npm install
node server.js
```

The backend runs on **http://localhost:3000/api**

### 2. Frontend

```bash
cd frontend
npm install
npm start
```

The frontend runs on **http://localhost:5173**

## Login

Use a numeric User ID that exists in the system and select the matching role.  
Default users: ID `1` (admin), ID `2` (manager), ID `3` (user)

## Backend Changes (Assignment 3)

All new backend code is marked with `// ⚠️ ADDED FOR ASSIGNMENT 3`:

- `backend/Routes/Auth.js` — new file: `POST /auth/login`, `POST /auth/logout`
- `backend/Routes/Settings.js` — new file: `GET /settings`, `PUT /settings`
- `backend/Routes/Users.js` — added `GET /users/me`
- `backend/server.js` — registered `/auth` and `/settings` routers
