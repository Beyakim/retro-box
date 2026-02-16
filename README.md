# 🚀 Retro Box

A real-time facilitated retrospective application designed to bring structure, focus, and synchronization to distributed team retrospectives.

Retro Box enforces a **single-facilitator model** where one user controls discussion flow while all participants remain synchronized in real time.

---

## 🌐 Live Demo

Frontend: https://retro-box-five.vercel.app  
Backend: https://retro-box-server.onrender.com

---

# 📌 Problem Statement

Most retrospective tools suffer from one or more of the following issues:

- Multiple users can control the flow simultaneously
- Real-time state desynchronization
- State lost on refresh
- Weak facilitator enforcement

Retro Box solves this by:

1. Assigning a single facilitator per retro session
2. Making the database the authoritative state
3. Broadcasting real-time notifications via Socket.io
4. Refetching state instead of trusting client memory

---

# 🏗 Architecture Overview

Retro Box follows a **database-first, real-time synchronized architecture**.

```
Frontend (React)
      ↓
REST API (Express)
      ↓
PostgreSQL (Source of Truth)
      ↓
Socket.io (Event Notification Layer)
```

### Key Principle

> The database is the single source of truth.  
> Real-time events notify clients to refetch state.

---

# 🛠 Tech Stack

## Frontend

- React 18
- TypeScript
- Vite
- Material UI
- Socket.io client

## Backend

- Node.js
- Express
- PostgreSQL
- pg (node-postgres)
- Socket.io
- Multer (image uploads)

## Infrastructure

- Frontend: Vercel
- Backend: Render
- Database: PostgreSQL (Render managed instance)

---

# ✨ Core Features

## 👥 Team Management

- Immutable 6-character team codes
- Editable display names
- Stable URL structure

Example:

```
/t/3X6MZU
```

Team code never changes.

---

## 📝 Note Collection

- Notes collected before retro starts
- Categories:
  - Keep
  - Improve
  - Idea
  - Shoutout
- Real-time note counter
- Optional image upload per note

---

## 🎯 Facilitated Retro Flow

1. First user to start retro becomes facilitator
2. Only facilitator can pull next note
3. All clients see the same current note
4. Current note stored in database

---

# 🖼 Image Upload Support

Notes support optional images.

### Flow

1. Image uploaded via `multipart/form-data`
2. Stored in `/uploads`
3. Served statically via Express
4. Image URL stored in `notes.image_url`

Static serving:

```js
app.use("/uploads", express.static(uploadsDir));
```

A note may contain:

- Text only
- Image only
- Or both

---

# 👑 Facilitator Model

Facilitator stored in:

```
boxes.host_client_id
```

On pull request:

```js
if (box.hostClientId !== clientId) {
  return res.status(403).json({ error: "not_host" });
}
```

This prevents:

- Race conditions
- Multi-user pulling
- UI desync

---

# 🎲 Pull Strategy

Stored in:

```
boxes.pull_mode
```

Supported values:

| Mode    | Behavior                |
| ------- | ----------------------- |
| ordered | Pull by insertion order |
| random  | Pull randomly           |

---

# 🔒 Race Condition Prevention

Note selection uses:

```sql
FOR UPDATE SKIP LOCKED
```

Ensures:

- Only one transaction opens a note
- No duplicate pulls
- Safe under concurrent requests

---

# 🗄 Data Model

## Teams

| Field      | Type      |
| ---------- | --------- |
| id         | integer   |
| team_code  | string    |
| name       | string    |
| created_at | timestamp |

---

## Boxes (Retro Sessions)

| Field           | Type                           |
| --------------- | ------------------------------ |
| id              | integer                        |
| team_id         | integer                        |
| status          | collecting / in_retro / closed |
| retro_number    | integer                        |
| host_client_id  | string                         |
| current_note_id | integer                        |
| pull_mode       | ordered / random               |
| created_at      | timestamp                      |
| closed_at       | timestamp                      |

---

## Notes

| Field       | Type      |
| ----------- | --------- |
| id          | integer   |
| box_id      | integer   |
| type        | string    |
| author_name | string    |
| content     | text      |
| image_url   | text      |
| anonymous   | boolean   |
| opened      | boolean   |
| created_at  | timestamp |

---

# 🔌 API Endpoints

## Start Retro

```
POST /teams/:teamCode/active-box/start-retro
```

- Assign facilitator
- Set status to `in_retro`
- Store pull mode

---

## Pull Next Note

```
POST /teams/:teamCode/retro/pull-next
```

- Facilitator only
- Atomically selects next note
- Updates `current_note_id`
- Emits real-time event

---

## Get Retro State

```
GET /teams/:teamCode/retro/state
```

Returns:

- Retro status
- Facilitator ID
- Current note
- Remaining note count

---

## Close Retro

```
POST /teams/:teamCode/active-box/close
```

- Marks session closed
- Creates next retro box
- Emits `retro_closed`

---

# 🔄 Real-Time Synchronization

Each team has isolated Socket.io room:

```js
socket.emit("join-team", teamCode);
```

### Events

- `retro_started`
- `current_note_changed`
- `note_added`
- `retro_closed`

Pattern:

1. REST call
2. DB update
3. Emit event
4. Clients refetch state

---

# 💻 Local Development

## Backend

```bash
cd server
npm install
node setup.js
node index.js
```

### .env

```
DATABASE_URL=postgresql://localhost/retrobox
PORT=3000
NODE_ENV=development
```

---

## Frontend

```bash
cd client
npm install
npm run dev
```

### .env

```
VITE_API_BASE=http://localhost:3000
```

---

# 🚀 Production Deployment

Frontend: Vercel  
Backend: Render  
Database: PostgreSQL

Note: On free-tier Render instances, filesystem uploads may not persist across full restarts.

---

# 📈 What This Project Demonstrates

- Full-stack system architecture
- Real-time synchronization
- Concurrency-safe database operations
- Multi-client state consistency
- Backend-authoritative design
- Production debugging & deployment

---

# 🔮 Future Improvements

- Facilitator reassignment
- Retro history viewer
- Voting system
- Action item tracking
- Authentication
- Template support
- Export to PDF
- Discussion timers

---

# 🧠 Final Note

Retro Box demonstrates how strong architectural constraints combined with database-first design can create a robust real-time collaboration system without complex client-side state management.
