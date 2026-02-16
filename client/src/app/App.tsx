import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { io, Socket } from "socket.io-client";

import { JoinTeamScreen } from "@/app/components/JoinTeamScreen";
import { CollectingNotesScreen } from "@/app/components/CollectingNotesScreen";
import { RetroInProgressScreen } from "@/app/components/RetroInProgressScreen";
import { StartRetroModal } from "./components/StartRetroModal";

import { BackendNote } from "types";
import { getClientId } from "@/clientId";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3000";

const theme = createTheme({
  palette: {
    primary: { main: "#FF6B9D" },
    secondary: { main: "#C060E8" },
  },
});

type Screen = "join" | "collecting" | "retro";
type PullOrder = "random" | "keep-first" | "improve-first";

type RetroStartedEvent = { hostClientId: string };
type CurrentNoteChangedEvent = {
  currentNote: BackendNote;
  retro: { remainingCount: number };
};
type TeamNameUpdatedEvent = { teamCode: string; name: string };

type TeamStateResponse = {
  team: { name: string; teamCode: string };
  notes: { total: number };
};

type RetroStateResponse = { remainingCount: number };

// ✅ תואם לשרת שלך ב-GET /teams/:teamCode/retro/state
type RetroStateApiResponse = {
  team: { name: string; teamCode: string };
  retro: null | {
    id: number;
    status: "collecting" | "in_retro" | "closed" | string;
    hostClientId: string | null;
    retroNumber: number;
  };
  currentNote: BackendNote | null;
  remainingCount: number;
};

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("join");
  const [teamName, setTeamName] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [noteCount, setNoteCount] = useState(0);

  // ✅ Single source of truth: keep the backend note as-is
  const [currentNote, setCurrentNote] = useState<BackendNote | null>(null);

  const [hostClientId, setHostClientId] = useState<string | null>(null);
  const [remainingCount, setRemainingCount] = useState(0);
  const [startRetroOpen, setStartRetroOpen] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const clientId = useMemo(() => getClientId(), []);
  const isHost = clientId === hostClientId;

  // ✅ סנכרון מצב מהשרת (מי שנכנס באמצע רטרו לא מפספס)
  const syncFromServer = useCallback(async (code: string) => {
    const data = await getJson<RetroStateApiResponse>(
      `${API_BASE}/teams/${code}/retro/state`,
    );

    // תמיד נעדכן שם צוות (שיהיה עקבי)
    setTeamName(data.team.name);

    if (data.retro?.status === "in_retro") {
      setHostClientId(data.retro.hostClientId ?? null);
      setCurrentNote(data.currentNote ?? null);
      setRemainingCount(data.remainingCount ?? 0);
      setCurrentScreen("retro");
    } else {
      setCurrentNote(null);
      setHostClientId(null);
      setRemainingCount(0);
      setCurrentScreen("collecting");
    }
  }, []);

  useEffect(() => {
    const socket = io(API_BASE, { transports: ["websocket"] });
    socketRef.current = socket;

    // אל תסתמכי רק על אירועים. ברגע שיש connect — נעשה sync אם כבר בתוך צוות.
    socket.on("connect", () => {
      console.log("🔌 Socket connected");
      if (teamCode) {
        socket.emit("join-team", teamCode);
        syncFromServer(teamCode);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [teamCode, syncFromServer]);

  const fetchTeamState = useCallback(async (code: string) => {
    const data = await getJson<TeamStateResponse>(
      `${API_BASE}/teams/${code}/state`,
    );
    setNoteCount(data.notes.total);
  }, []);

  const fetchRetroState = useCallback(async (code: string) => {
    const data = await getJson<RetroStateResponse>(
      `${API_BASE}/teams/${code}/retro/state`,
    );
    setRemainingCount(data.remainingCount || 0);
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !teamCode) return;

    socket.emit("join-team", teamCode);

    // ✅ מיד אחרי join-team נעשה sync — מכסה refresh/כניסה באמצע
    syncFromServer(teamCode);

    const onNoteAdded = () => fetchTeamState(teamCode);

    const onRetroStarted = (d: RetroStartedEvent) => {
      setHostClientId(d.hostClientId);
      fetchRetroState(teamCode);
      setCurrentScreen("retro");
    };

    const onCurrentNoteChanged = (d: CurrentNoteChangedEvent) => {
      console.log("🎯 CURRENT NOTE RAW:", d.currentNote);
      setCurrentNote(d.currentNote);
      setRemainingCount(d.retro.remainingCount);
    };

    const onRetroClosed = () => {
      setCurrentNote(null);
      setHostClientId(null);
      setRemainingCount(0);
      setCurrentScreen("collecting");
      fetchTeamState(teamCode);
    };

    const onTeamNameUpdated = (d: TeamNameUpdatedEvent) => setTeamName(d.name);

    socket.on("note-added", onNoteAdded);
    socket.on("retro-started", onRetroStarted);
    socket.on("current-note-changed", onCurrentNoteChanged);
    socket.on("retro-closed", onRetroClosed);
    socket.on("team-name-updated", onTeamNameUpdated);

    return () => {
      socket.off("note-added", onNoteAdded);
      socket.off("retro-started", onRetroStarted);
      socket.off("current-note-changed", onCurrentNoteChanged);
      socket.off("retro-closed", onRetroClosed);
      socket.off("team-name-updated", onTeamNameUpdated);
    };
  }, [teamCode, fetchTeamState, fetchRetroState, syncFromServer]);

  const handleJoinTeam = async (code: string) => {
    const data = await getJson<TeamStateResponse>(
      `${API_BASE}/teams/${code.toUpperCase()}/state`,
    );

    setTeamName(data.team.name);
    setTeamCode(data.team.teamCode);
    setNoteCount(data.notes.total);

    // ברירת מחדל, ואז sync יחליט אם צריך retro
    setCurrentScreen("collecting");

    // ✅ אם כבר באמצע רטרו — ניכנס ישר למסך הנכון
    await syncFromServer(data.team.teamCode);
  };

  const handleCreateNewTeam = async () => {
    const team = await getJson<any>(`${API_BASE}/teams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `Team ${Date.now()}` }),
    });

    await getJson(`${API_BASE}/teams/${team.teamCode}/boxes`, {
      method: "POST",
    });

    setTeamName(team.name);
    setTeamCode(team.teamCode);
    setCurrentScreen("collecting");

    // ✅ גם פה — sync כדי להיות עקביים
    await syncFromServer(team.teamCode);
  };

  const handleSubmitNote = async (n: {
    name: string;
    topic: string;
    content: string;
  }) => {
    await getJson(`${API_BASE}/teams/${teamCode}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: n.topic,
        authorName: n.name,
        content: n.content,
        anonymous: !n.name || n.name === "Anonymous",
      }),
    });
  };

  const handleStartRetro = async (pullOrder: PullOrder) => {
    const d = await getJson<{ hostClientId: string }>(
      `${API_BASE}/teams/${teamCode}/active-box/start-retro`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, pullOrder }),
      },
    );

    setHostClientId(d.hostClientId);
    await fetchRetroState(teamCode);
    setCurrentScreen("retro");
  };

  const handleEndRetro = async () => {
    await getJson(`${API_BASE}/teams/${teamCode}/active-box/close`, {
      method: "POST",
    });
    await getJson(`${API_BASE}/teams/${teamCode}/boxes`, { method: "POST" });
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
          onStartRetro={() => setStartRetroOpen(true)}
          onBack={() => setCurrentScreen("join")}
          noteCount={noteCount}
        />
      )}

      {currentScreen === "retro" && (
        <RetroInProgressScreen
          teamName={teamName}
          teamCode={teamCode}
          currentNote={currentNote}
          remainingCount={remainingCount}
          isHost={isHost}
          clientId={clientId}
          onBack={handleEndRetro}
        />
      )}

      <StartRetroModal
        open={startRetroOpen}
        onClose={() => setStartRetroOpen(false)}
        onStartRetro={(p) => {
          setStartRetroOpen(false);
          handleStartRetro(p);
        }}
      />
    </ThemeProvider>
  );
}
