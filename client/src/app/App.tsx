import { useEffect, useState, useRef } from "react";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { io, Socket } from "socket.io-client";
import { JoinTeamScreen } from "@/app/components/JoinTeamScreen";
import { CollectingNotesScreen } from "@/app/components/CollectingNotesScreen";
import { RetroInProgressScreen } from "@/app/components/RetroInProgressScreen";
import { BackendNote } from "types";
import { getClientId } from "@/clientId";

const theme = createTheme({
  palette: {
    primary: { main: "#FF6B9D" },
    secondary: { main: "#C060E8" },
  },
  typography: {
    fontFamily:
      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  shape: { borderRadius: 12 },
});

type Screen = "join" | "collecting" | "retro";

interface Note {
  id: string;
  name: string;
  topic: string;
  content: string;
}

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3000";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("join");
  const [teamName, setTeamName] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [noteCount, setNoteCount] = useState(0);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [hostClientId, setHostClientId] = useState<string | null>(null);
  const [remainingCount, setRemainingCount] = useState(0);

  const socketRef = useRef<Socket | null>(null);
  const clientId = getClientId();

  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then((r) => r.json())
      .then((data) => console.log("✅ API /health:", data))
      .catch((e) => console.error("❌ API /health failed:", e));
  }, []);

  const fetchTeamState = async (code: string) => {
    try {
      const res = await fetch(`${API_BASE}/teams/${code}/state`);
      if (!res.ok) return;

      const data = await res.json();
      setNoteCount(data.notes.total);
      console.log("📄 Synced state:", data.notes.total, "notes");
    } catch (e) {
      console.error("Failed to fetch team state:", e);
    }
  };

  useEffect(() => {
    if (!teamCode) return;

    if (!socketRef.current) {
      socketRef.current = io(API_BASE, {
        transports: ["websocket"],
        reconnection: true,
      });
      console.log("🔌 Socket connected");
    }

    const socket = socketRef.current;

    socket.emit("join-team", teamCode);
    console.log("👥 Joined team room:", teamCode);

    const handleNoteAdded = () => {
      console.log("📝 Real-time: Note added");
      fetchTeamState(teamCode);
    };

    const handleRetroStarted = async (data: { hostClientId: string }) => {
      console.log("🎁 Real-time: Retro started by host:", data.hostClientId);
      setHostClientId(data.hostClientId);

      // Fetch retro state to get remaining count
      try {
        const res = await fetch(`${API_BASE}/teams/${teamCode}/retro/state`);
        if (res.ok) {
          const retroData = await res.json();
          setRemainingCount(retroData.remainingCount || 0);
        }
      } catch (e) {
        console.error("Failed to fetch retro state:", e);
      }

      setCurrentScreen("retro");
    };

    const handleCurrentNoteChanged = (data: {
      currentNote: BackendNote;
      retro: { remainingCount: number };
    }) => {
      console.log(
        "🎯 Real-time: Current note changed to note #",
        data.currentNote.id
      );

      setCurrentNote({
        id: String(data.currentNote.id),
        name: data.currentNote.authorName || "Anonymous",
        topic: data.currentNote.type,
        content: data.currentNote.content,
      });

      setRemainingCount(data.retro.remainingCount);
    };

    const handleRetroClosed = async () => {
      console.log("✅ Real-time: Retro closed");
      setNoteCount(0);
      setCurrentNote(null);
      setHostClientId(null);
      setRemainingCount(0);
      setCurrentScreen("collecting");
      await fetchTeamState(teamCode);
    };

    const handleTeamNameUpdated = (data: {
      teamCode: string;
      name: string;
    }) => {
      console.log("✏️ Real-time: Team name updated to:", data.name);
      setTeamName(data.name);
    };

    socket.on("note-added", handleNoteAdded);
    socket.on("retro-started", handleRetroStarted);
    socket.on("current-note-changed", handleCurrentNoteChanged);
    socket.on("retro-closed", handleRetroClosed);
    socket.on("team-name-updated", handleTeamNameUpdated);

    return () => {
      socket.off("note-added", handleNoteAdded);
      socket.off("retro-started", handleRetroStarted);
      socket.off("current-note-changed", handleCurrentNoteChanged);
      socket.off("retro-closed", handleRetroClosed);
      socket.off("team-name-updated", handleTeamNameUpdated);
      console.log("🧹 Cleaned up event handlers");
    };
  }, [teamCode]);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        console.log("🔌 Socket disconnected");
      }
    };
  }, []);

  const handleJoinTeam = async (code: string) => {
    try {
      const res = await fetch(`${API_BASE}/teams/${code.toUpperCase()}/state`);
      if (!res.ok) {
        alert("Team not found");
        return;
      }
      const data = await res.json();
      setTeamName(data.team.name);
      setTeamCode(data.team.teamCode);
      setNoteCount(data.notes.total);
      setCurrentScreen("collecting");
    } catch (e) {
      console.error(e);
      alert("Failed to join team");
    }
  };

  const handleCreateNewTeam = async () => {
    try {
      const teamRes = await fetch(`${API_BASE}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `Team ${Date.now()}` }),
      });
      if (!teamRes.ok) throw new Error("Failed to create team");
      const teamData = await teamRes.json();

      const boxRes = await fetch(
        `${API_BASE}/teams/${teamData.teamCode}/boxes`,
        {
          method: "POST",
        }
      );
      if (!boxRes.ok) throw new Error("Failed to create box");

      setTeamName(teamData.name);
      setTeamCode(teamData.teamCode);
      setNoteCount(0);
      setCurrentScreen("collecting");
    } catch (e) {
      console.error(e);
      alert("Failed to create team");
    }
  };

  const handleSubmitNote = async (note: {
    name: string;
    topic: string;
    content: string;
  }) => {
    try {
      const res = await fetch(`${API_BASE}/teams/${teamCode}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: note.topic,
          authorName: note.name,
          content: note.content,
          anonymous: note.name === "Anonymous" || !note.name,
        }),
      });

      if (res.ok) {
        setNoteCount((prev: number) => prev + 1);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleBackToJoin = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setCurrentScreen("join");
    setTeamName("");
    setTeamCode("");
    setNoteCount(0);
    setCurrentNote(null);
    setHostClientId(null);
    setRemainingCount(0);
  };

  const handleStartRetro = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/teams/${teamCode}/active-box/start-retro`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId }),
        }
      );

      if (!res.ok) {
        const error = await res.json();
        console.error("Failed to start retro:", error);
        alert("Failed to start retro");
        return;
      }

      const data = await res.json();
      console.log("🎁 Started retro, I am host:", data.hostClientId);
      setHostClientId(data.hostClientId);

      // Fetch retro state to get remaining count
      const resRetro = await fetch(`${API_BASE}/teams/${teamCode}/retro/state`);
      if (resRetro.ok) {
        const retroData = await resRetro.json();
        setRemainingCount(retroData.remainingCount || 0);
        console.log("📊 Remaining notes:", retroData.remainingCount);
      }

      setCurrentScreen("retro");
    } catch (e) {
      console.error(e);
      alert("Failed to start retro");
    }
  };

  const handleEndRetro = async () => {
    try {
      await fetch(`${API_BASE}/teams/${teamCode}/active-box/close`, {
        method: "POST",
      });

      await fetch(`${API_BASE}/teams/${teamCode}/boxes`, {
        method: "POST",
      });

      console.log("Retro close requested - waiting for server event");
    } catch (e) {
      console.error(e);
      alert("Failed to close retro");
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {currentScreen === "join" && (
        <JoinTeamScreen
          onJoin={handleJoinTeam}
          onCreateNew={handleCreateNewTeam}
        />
      )}
      {currentScreen === "collecting" && (
        <CollectingNotesScreen
          teamName={teamName}
          teamCode={teamCode}
          onSubmitNote={handleSubmitNote}
          onStartRetro={handleStartRetro}
          onBack={handleBackToJoin}
          noteCount={noteCount}
        />
      )}
      {currentScreen === "retro" && (
        <RetroInProgressScreen
          teamName={teamName}
          teamCode={teamCode}
          currentNote={currentNote}
          remainingCount={remainingCount}
          isHost={clientId === hostClientId}
          clientId={clientId}
          onBack={handleEndRetro}
        />
      )}
    </ThemeProvider>
  );
}
