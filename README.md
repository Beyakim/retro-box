# Retro Box

A real-time facilitated retrospective application built to solve the coordination challenges of distributed team retrospectives. Retro Box enforces a single-facilitator model where one user controls the discussion flow, ensuring focus and preventing the chaos of multiple team members trying to drive the conversation simultaneously.

## Table of Contents

- [Problem Statement](#problem-statement)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Core Features](#core-features)
- [Design Decisions](#design-decisions)
- [Data Model](#data-model)
- [API Design](#api-design)
- [Real-Time Synchronization](#real-time-synchronization)
- [Local Development](#local-development)
- [Future Improvements](#future-improvements)

## Problem Statement

Traditional retrospective tools either lack real-time collaboration or fail to enforce facilitation structure. When multiple team members can simultaneously control what's being discussed, retrospectives become disorganized and lose effectiveness. Retro Box addresses this by implementing a strict facilitator model where:

1. Only the facilitator can advance to the next discussion topic
2. All participants view the same content simultaneously
3. State is authoritative and synchronized across all clients

## Architecture Overview

Retro Box follows a client-server architecture with real-time synchronization:

- **Frontend**: React SPA with TypeScript for type safety
- **Backend**: Node.js REST API with PostgreSQL for persistent state
- **Real-time layer**: Socket.io with team-scoped rooms for event broadcasting
- **State authority**: Database-first design where all state changes originate from the backend

The system is designed around the principle that the database is the single source of truth. Real-time events serve as notifications to clients that they should refetch authoritative state, rather than carrying the state itself.

## Tech Stack

### Frontend

- React 18 with Vite for fast development and builds
- TypeScript for type safety and better developer experience
- Material UI for component library and consistent design
- Socket.io client for real-time updates

### Backend

- Node.js with Express for REST API
- PostgreSQL for relational data storage
- Socket.io for WebSocket communication
- node-postgres (pg) for database access

### Infrastructure

- Team-scoped Socket.io rooms for isolated real-time channels
- LocalStorage for client identity persistence across sessions

## Core Features

### Team Management

- Teams identified by immutable 6-character codes (e.g., `ABC123`)
- Editable team display names while maintaining stable team identity
- Simple join flow using team codes

### Note Collection

- Asynchronous note submission before retro starts
- Four note categories: Keep, Improve, Idea, Shoutout
- Real-time note count updates across all connected clients

### Facilitated Retrospective Flow

1. **Facilitator Assignment**: First user to start the retro becomes the facilitator
2. **Controlled Progression**: Only facilitator can pull the next note for discussion
3. **Synchronized Viewing**: All participants see the same note simultaneously
4. **State Consistency**: Current note tracked in database, ensuring consistency after page refreshes

### Multi-Client Synchronization

- All state changes broadcast to team-scoped Socket.io rooms
- Clients refetch authoritative state on receiving events
- No optimistic updates to prevent state divergence

## Design Decisions

### Immutable Team Codes

Team codes serve as the stable identifier for teams and are used in URLs (`/t/:teamCode`). Making them immutable prevents breaking links and simplifies the data model. The team display name can be edited freely without affecting team identity.

**Rationale**: URLs should be stable. If team codes changed, existing links would break and client routing would require additional complexity to handle redirects.

### Facilitator Model

The facilitator role is assigned to the client who starts the retro session. This role grants exclusive access to the "pull next note" action. Non-facilitators see a disabled button with "Waiting for facilitator..." text.

**Rationale**:

- Prevents race conditions where multiple users try to pull notes simultaneously
- Enforces focus by ensuring only one person controls discussion flow
- Mirrors real-world retrospective facilitation patterns

**Backend Enforcement**: The server validates facilitator identity on every note-pull request:

```javascript
if (box.hostClientId !== clientId) {
  return res.status(403).json({ error: "not_host" });
}
```

### Shared Current Note

Each retro session maintains a `current_note_id` field in the database. When the facilitator pulls a note, this field is updated atomically, and all clients receive a `current-note-changed` event.

**Rationale**: Storing the current note in the database ensures:

- State persists across page refreshes
- New clients joining mid-retro see the correct note
- No client-side assumptions about which note should be displayed

### Race Condition Prevention

Note selection uses PostgreSQL's `FOR UPDATE SKIP LOCKED` to handle concurrent requests:

```sql
SELECT id FROM notes
WHERE box_id = $1 AND opened = false
ORDER BY id ASC
FOR UPDATE SKIP LOCKED
LIMIT 1
```

**Rationale**: Even with facilitator-only access, network delays could result in duplicate requests. `SKIP LOCKED` ensures that only one transaction can mark a note as opened.

### Database as Single Source of Truth

All state changes flow through the database first. Real-time events notify clients to refetch, rather than carrying state payloads.

**Rationale**:

- Eliminates state synchronization bugs
- Provides audit trail of all changes
- Simplifies reasoning about system behavior
- Handles edge cases like network partitions naturally

## Data Model

### Teams Table

```
id: integer (primary key)
code: string (unique, immutable)
name: string (editable display name)
created_at: timestamp
```

### Boxes Table (Retro Sessions)

```
id: integer (primary key)
team_id: integer (foreign key)
status: enum ('collecting', 'in_retro', 'closed')
host_client_id: string (facilitator identifier)
current_note_id: integer (nullable, current discussion note)
created_at: timestamp
closed_at: timestamp (nullable)
```

**Key Fields**:

- `status`: Determines available actions (can't add notes during retro)
- `host_client_id`: Identifies facilitator for authorization checks
- `current_note_id`: Shared state ensuring all clients see the same note

### Notes Table

```
id: integer (primary key)
box_id: integer (foreign key)
type: string ('keep', 'improve', 'idea', 'shoutout')
author_name: string (nullable for anonymous)
content: text
opened: boolean (false until discussed)
created_at: timestamp
```

## API Design

### Core Endpoints

**POST /teams/:teamCode/active-box/start-retro**

- Initiates retro session
- Assigns `host_client_id` from request
- Transitions box status to `in_retro`
- Idempotent: Returns existing host if already started

**POST /teams/:teamCode/retro/pull-next**

- Facilitator-only endpoint
- Atomically selects next unopened note
- Updates `current_note_id` in database
- Returns note and remaining count
- Emits `current-note-changed` event to all clients

**GET /teams/:teamCode/retro/state**

- Returns current retro state:
  - Retro status and facilitator ID
  - Current note being discussed
  - Remaining unopened note count
- Used for initial page load and reconnection scenarios

**PATCH /teams/:teamCode**

- Updates team display name
- Emits `team_name_updated` event
- Team code remains unchanged

All endpoints follow a pattern of:

1. Validate request and authorization
2. Update database atomically
3. Emit real-time event to relevant clients
4. Return updated state

## Real-Time Synchronization

### Socket.io Room Architecture

Each team has an isolated Socket.io room identified by `team:{teamCode}`. Clients join their team's room on connection:

```javascript
socket.emit("join-team", teamCode);
```

Events are broadcast only to clients in the relevant team room, preventing cross-team information leakage.

### Event Flow

**retro_started**

- Emitted when facilitator starts retro
- Payload: `{ boxId, hostClientId }`
- Client action: Fetch notes and transition to retro screen

**current_note_changed**

- Emitted when facilitator pulls next note
- Payload: `{ currentNote, retro: { remainingCount } }`
- Client action: Update displayed note and count

**retro_closed**

- Emitted when retro session ends
- Payload: `{ boxId }`
- Client action: Reset state and return to note collection

**note_added**

- Emitted when any user adds a note during collection phase
- Payload: `{ noteId, boxId }`
- Client action: Refetch note count

### Synchronization Pattern

1. User initiates action (e.g., "Pull next note")
2. Backend validates, updates database, emits event
3. All clients (including initiator) receive event
4. Clients refetch authoritative state from REST API
5. UI updates based on fresh data

This pattern ensures consistency even in edge cases like network delays or concurrent actions.

## Local Development

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Setup

**1. Clone repository**

```bash
git clone <repository-url>
cd retro-box
```

**2. Database setup**

```bash
# Create PostgreSQL database
createdb retrobox

# Run migrations (if migration files exist)
psql retrobox < server/migrations/schema.sql
```

**3. Backend setup**

```bash
cd server
npm install

# Create .env file
cat > .env << EOF
DATABASE_URL=postgresql://localhost/retrobox
PORT=3000
NODE_ENV=development
ALLOW_DEV_ADMIN=true
EOF

# Start server
node index.js
```

Expected output:

```
✅ Connected to PostgreSQL database
🚀 Server running on 3000 with Socket.io (Facilitated Retro)
```

**4. Frontend setup**

```bash
cd client
npm install

# Create .env file
cat > .env << EOF
VITE_API_BASE=http://localhost:3000
EOF

# Start development server
npm run dev
```

Application will be available at `http://localhost:5173`

### Testing Multi-Client Behavior

1. Open `http://localhost:5173` in Chrome
2. Open `http://localhost:5173` in Firefox or Chrome Incognito
3. Create team in Browser 1, join same team in Browser 2
4. Add notes, start retro in Browser 1
5. Verify Browser 2 shows "Waiting for facilitator..."
6. Pull note in Browser 1, verify both browsers show same note

### Environment Variables

**Backend**

- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `ALLOW_DEV_ADMIN`: Enable admin endpoints for development

**Frontend**

- `VITE_API_BASE`: Backend API URL

## Future Improvements

### Facilitator Reassignment

Currently, if the facilitator disconnects, the retro session becomes stuck. Implement automatic facilitator transfer to the next connected client, or add a "claim facilitator" button for other participants.

### Retro History

Store historical retro sessions per team, allowing teams to review past retrospectives and track improvement over time.

### Note Voting

Add upvoting/downvoting on notes during collection phase. Sort notes by vote count when pulling, ensuring high-priority topics are discussed first.

### Action Items

Allow facilitator to create action items during discussion. Track action item completion across retro cycles.

### Authentication

Add user accounts and authentication. This would enable:

- Persistent user identity across sessions
- Note authorship attribution
- Access control and private teams
- User profiles and retro statistics

### Retro Templates

Support different retrospective formats beyond the current four-category model (e.g., Start/Stop/Continue, Glad/Sad/Mad, 4Ls).

### Discussion Timer

Add optional timers for each note discussion to keep retrospectives time-boxed and prevent over-discussion of individual topics.

### Export and Reporting

Generate PDF summaries of completed retrospectives, including all discussed notes and created action items.

## What This Project Demonstrates

### Technical Capabilities

**Full-Stack Development**: Demonstrates proficiency across the entire stack, from database schema design to real-time WebSocket communication to React component architecture.

**Concurrency Handling**: Shows understanding of race conditions, atomic operations, and distributed state management through careful use of database transactions and locking.

**Real-Time Systems**: Implements a production-grade real-time synchronization system using Socket.io with proper room isolation and event-driven architecture.

**Type Safety**: Leverages TypeScript throughout the frontend for improved code quality and developer experience.

**State Management**: Solves the challenging problem of multi-client state consistency without relying on complex state management libraries, using a database-first approach instead.

### Product and Design Thinking

**User-Centered Design**: Addresses a real problem in distributed retrospectives through a clear facilitator model that mirrors in-person retrospective best practices.

**Architectural Constraints**: Makes deliberate tradeoffs (immutable team codes, database-authoritative state) that simplify the system while solving core user needs.

**Scalability Considerations**: Room-based architecture and database-driven state lay groundwork for horizontal scaling, though current implementation targets small to medium teams.

**Edge Case Handling**: Considers and handles scenarios like page refreshes mid-retro, late-joining participants, and concurrent actions.

---

Retro Box was built to explore the intersection of real-time collaboration and facilitated workflows, demonstrating that strong technical implementation and clear product constraints can create simple, effective solutions to complex coordination problems.
