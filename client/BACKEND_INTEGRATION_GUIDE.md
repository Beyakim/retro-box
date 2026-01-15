# Retro Box - Backend Integration Guide

## 🎯 Overview
This guide shows you how to transform your Retro Box app from a frontend prototype into a full-stack application with real-time collaboration.

## 📋 What You Currently Have
- **Frontend**: React + TypeScript + Material UI
- **State Management**: Local state in App.tsx
- **Data**: Stored in browser memory (lost on refresh)

## 🔄 What You Need
- **Database**: Persistent storage for teams and notes
- **Real-time Updates**: So team members see notes as they're added
- **API Layer**: To connect frontend to database

---

## 🚀 Option A: Supabase (Recommended)

### Why Supabase?
- ✅ Built-in real-time subscriptions
- ✅ Authentication ready
- ✅ PostgreSQL database
- ✅ Free tier available
- ✅ No backend coding required

### Setup Steps

#### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Save your project URL and anon key

#### 2. Install Supabase Client
```bash
npm install @supabase/supabase-js
```

#### 3. Create Database Tables

Run this SQL in Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'collecting',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notes table
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT DEFAULT 'Anonymous',
  topic TEXT,
  content TEXT NOT NULL,
  revealed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_notes_team_id ON notes(team_id);
```

#### 4. Set Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read teams
CREATE POLICY "Teams are viewable by everyone"
  ON teams FOR SELECT
  USING (true);

-- Allow anyone to create teams
CREATE POLICY "Anyone can create teams"
  ON teams FOR INSERT
  WITH CHECK (true);

-- Allow anyone to update teams
CREATE POLICY "Anyone can update teams"
  ON teams FOR UPDATE
  USING (true);

-- Allow anyone to read notes
CREATE POLICY "Notes are viewable by everyone"
  ON notes FOR SELECT
  USING (true);

-- Allow anyone to create notes
CREATE POLICY "Anyone can create notes"
  ON notes FOR INSERT
  WITH CHECK (true);

-- Allow anyone to update notes
CREATE POLICY "Anyone can update notes"
  ON notes FOR UPDATE
  USING (true);
```

#### 5. Create Supabase Config File

**Create `/src/lib/supabase.ts`:**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// TypeScript types for your database
export type Team = {
  id: string
  name: string
  code: string
  status: 'collecting' | 'in-progress'
  created_at: string
}

export type Note = {
  id: string
  team_id: string
  name: string
  topic: string
  content: string
  revealed: boolean
  created_at: string
}
```

#### 6. Create Environment Variables

**Create `.env.local` in your project root:**

```env
VITE_SUPABASE_URL=your-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Add to `.gitignore`:**
```
.env.local
```

#### 7. Create API Service Layer

**Create `/src/services/api.ts`:**

```typescript
import { supabase, type Team, type Note } from '@/lib/supabase'

// Generate random team code
function generateTeamCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Team operations
export const teamAPI = {
  // Create a new team
  async createTeam(teamName: string): Promise<Team> {
    const code = generateTeamCode()
    
    const { data, error } = await supabase
      .from('teams')
      .insert({
        name: teamName,
        code: code,
        status: 'collecting'
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Join existing team by code
  async joinTeam(code: string): Promise<Team> {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('code', code.toUpperCase())
      .single()
    
    if (error) throw error
    if (!data) throw new Error('Team not found')
    return data
  },

  // Start the retrospective
  async startRetro(teamId: string): Promise<void> {
    const { error } = await supabase
      .from('teams')
      .update({ status: 'in-progress' })
      .eq('id', teamId)
    
    if (error) throw error
  },

  // Subscribe to team changes
  subscribeToTeam(teamId: string, callback: (team: Team) => void) {
    const subscription = supabase
      .channel(`team-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'teams',
          filter: `id=eq.${teamId}`
        },
        (payload) => callback(payload.new as Team)
      )
      .subscribe()
    
    return () => subscription.unsubscribe()
  }
}

// Note operations
export const noteAPI = {
  // Add a note
  async addNote(teamId: string, note: { name: string; topic: string; content: string }): Promise<Note> {
    const { data, error } = await supabase
      .from('notes')
      .insert({
        team_id: teamId,
        name: note.name,
        topic: note.topic,
        content: note.content,
        revealed: false
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Get all notes for a team
  async getNotes(teamId: string): Promise<Note[]> {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  // Mark note as revealed
  async revealNote(noteId: string): Promise<void> {
    const { error } = await supabase
      .from('notes')
      .update({ revealed: true })
      .eq('id', noteId)
    
    if (error) throw error
  },

  // Subscribe to new notes
  subscribeToNotes(teamId: string, callback: (note: Note) => void) {
    const subscription = supabase
      .channel(`notes-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notes',
          filter: `team_id=eq.${teamId}`
        },
        (payload) => callback(payload.new as Note)
      )
      .subscribe()
    
    return () => subscription.unsubscribe()
  }
}
```

#### 8. Update App.tsx to Use Backend

**Replace `/src/app/App.tsx` with:**

```typescript
import { useState, useEffect } from 'react'
import { JoinTeamScreen } from './components/JoinTeamScreen'
import { CollectingNotesScreen } from './components/CollectingNotesScreen'
import { RetroInProgressScreen } from './components/RetroInProgressScreen'
import { teamAPI, noteAPI, type Team, type Note } from '@/services/api'

type Screen = 'join' | 'collecting' | 'retro'

function App() {
  const [screen, setScreen] = useState<Screen>('join')
  const [team, setTeam] = useState<Team | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Subscribe to team updates
  useEffect(() => {
    if (!team) return

    const unsubscribe = teamAPI.subscribeToTeam(team.id, (updatedTeam) => {
      setTeam(updatedTeam)
      if (updatedTeam.status === 'in-progress') {
        setScreen('retro')
      }
    })

    return unsubscribe
  }, [team])

  // Subscribe to new notes
  useEffect(() => {
    if (!team) return

    const unsubscribe = noteAPI.subscribeToNotes(team.id, (newNote) => {
      setNotes(prev => [...prev, newNote])
    })

    return unsubscribe
  }, [team])

  // Load notes when team is set
  useEffect(() => {
    if (!team) return

    const loadNotes = async () => {
      try {
        const data = await noteAPI.getNotes(team.id)
        setNotes(data)
      } catch (err) {
        console.error('Error loading notes:', err)
      }
    }

    loadNotes()
  }, [team])

  const handleCreateTeam = async (teamName: string) => {
    setLoading(true)
    setError(null)
    try {
      const newTeam = await teamAPI.createTeam(teamName)
      setTeam(newTeam)
      setScreen('collecting')
    } catch (err) {
      setError('Failed to create team. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinTeam = async (code: string) => {
    setLoading(true)
    setError(null)
    try {
      const existingTeam = await teamAPI.joinTeam(code)
      setTeam(existingTeam)
      setScreen(existingTeam.status === 'collecting' ? 'collecting' : 'retro')
    } catch (err) {
      setError('Team not found. Please check the code.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitNote = async (note: { name: string; topic: string; content: string }) => {
    if (!team) return
    
    try {
      await noteAPI.addNote(team.id, note)
      // Note will be added via real-time subscription
    } catch (err) {
      console.error('Error submitting note:', err)
      setError('Failed to add note. Please try again.')
    }
  }

  const handleStartRetro = async () => {
    if (!team) return
    
    try {
      await teamAPI.startRetro(team.id)
      setScreen('retro')
    } catch (err) {
      console.error('Error starting retro:', err)
      setError('Failed to start retro. Please try again.')
    }
  }

  const handleRevealNote = async (noteId: string) => {
    try {
      await noteAPI.revealNote(noteId)
      // Update local state
      setNotes(prev => 
        prev.map(note => 
          note.id === noteId ? { ...note, revealed: true } : note
        )
      )
    } catch (err) {
      console.error('Error revealing note:', err)
    }
  }

  const handleBack = () => {
    setTeam(null)
    setNotes([])
    setScreen('join')
    setError(null)
  }

  return (
    <>
      {screen === 'join' && (
        <JoinTeamScreen
          onCreateTeam={handleCreateTeam}
          onJoinTeam={handleJoinTeam}
          loading={loading}
          error={error}
        />
      )}
      {screen === 'collecting' && team && (
        <CollectingNotesScreen
          teamName={team.name}
          teamCode={team.code}
          onSubmitNote={handleSubmitNote}
          onStartRetro={handleStartRetro}
          onBack={handleBack}
          noteCount={notes.length}
        />
      )}
      {screen === 'retro' && team && (
        <RetroInProgressScreen
          teamName={team.name}
          notes={notes}
          onRevealNote={handleRevealNote}
          onBack={handleBack}
        />
      )}
    </>
  )
}

export default App
```

#### 9. Update JoinTeamScreen Props

Add loading and error props to handle API states:

```typescript
interface JoinTeamScreenProps {
  onCreateTeam: (teamName: string) => void
  onJoinTeam: (code: string) => void
  loading?: boolean
  error?: string | null
}
```

Then add loading indicators and error messages to the UI.

---

## 🚀 Option B: Node.js + Express Backend

If you prefer full control with your own backend:

### Backend Setup

```bash
mkdir retro-box-backend
cd retro-box-backend
npm init -y
npm install express cors dotenv pg socket.io
npm install -D typescript @types/express @types/node @types/cors
```

**Create basic Express server with PostgreSQL and WebSockets for real-time updates.**

---

## 🚀 Option C: Firebase

```bash
npm install firebase
```

Use Firestore for database and Firebase Realtime Database for live updates.

---

## ✅ Testing Your Backend Integration

1. **Create a team** - Should save to database
2. **Copy team code** - Share with another browser/device
3. **Join team** - Should load same team
4. **Add notes** - Should appear for all team members in real-time
5. **Start retro** - All team members should see the transition
6. **Refresh page** - Data should persist

---

## 🔒 Security Considerations

1. **Don't expose database credentials** - Use environment variables
2. **Add rate limiting** - Prevent spam
3. **Validate inputs** - Sanitize all user input
4. **Set up RLS** (Row Level Security) in Supabase
5. **Consider authentication** - If you want private teams

---

## 📱 Deployment

### Frontend (Vercel - Recommended)
```bash
npm install -g vercel
vercel
```

Add environment variables in Vercel dashboard.

### Backend (if using Node.js)
- Render.com
- Railway.app
- Heroku

---

## 🎯 Next Steps

1. Choose your backend option (Supabase recommended)
2. Set up database
3. Implement API layer
4. Update components to use API
5. Test real-time features
6. Deploy!

---

## 💡 Pro Tips

- **Start with Supabase** - Easiest path to production
- **Use environment variables** - Never commit credentials
- **Test with multiple browsers** - Verify real-time sync
- **Add error boundaries** - Handle API failures gracefully
- **Monitor usage** - Stay within free tier limits

Need help with any specific step? Let me know! 🚀
