import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  FormControlLabel,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Stack,
  Alert,
  Divider,
} from "@mui/material";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3000";
const NOTE_TYPES = ["שיפור", "שימור", "פרגון"];

// UI constants (פחות "מספרים קסומים" מפוזרים)
const CARD_MIN_HEIGHT = { xs: 640, sm: 680 };
const BOX_SIZE = 280;

// ---------------------------- UI Components ----------------------------

function Header({ mode }) {
  return (
    <Box sx={{ textAlign: "center" }}>
      <Typography variant="h3" fontWeight={800}>
        Retro Box
      </Typography>
      <Typography variant="subtitle1" sx={{ opacity: 0.75, mt: 1 }}>
        {mode === "add" ? "הוספת פתק לרטרו" : "פתיחת פתק מהרטרו"}
      </Typography>
    </Box>
  );
}

function ModeSwitch({ mode, onAdd, onOpen }) {
  return (
    <Stack direction="row" spacing={1} justifyContent="center">
      <Button
        variant={mode === "add" ? "contained" : "outlined"}
        onClick={onAdd}
      >
        הוספת פתק
      </Button>
      <Button
        variant={mode === "open" ? "contained" : "outlined"}
        onClick={onOpen}
      >
        פתיחת פתק 🎁
      </Button>
    </Stack>
  );
}

function GiftBox({ phase, stateKey }) {
  const reduceMotion = useReducedMotion();

  const isShaking = phase === "shaking";
  const isOpeningOrOpened = phase === "opening" || phase === "opened";

  const confettiCount = reduceMotion ? 10 : 34;

  const confettiPieces = useMemo(() => {
    const rand = (n) => {
      const x = Math.sin((stateKey + 1) * 997 + n * 31) * 10000;
      return x - Math.floor(x);
    };

    return Array.from({ length: confettiCount }).map((_, i) => ({
      id: i,
      x: Math.round((rand(i) - 0.5) * 260),
      r: Math.round((rand(i + 40) - 0.5) * 320),
      d:
        (reduceMotion ? 0.35 : 0.65) +
        rand(i + 80) * (reduceMotion ? 0.2 : 0.45),
      s: 0.7 + rand(i + 120) * 1.0,
      c:
        i % 4 === 0
          ? "linear-gradient(180deg,#ffd166,#ffb703)"
          : i % 4 === 1
          ? "linear-gradient(180deg,#7bdff2,#4ea8de)"
          : i % 4 === 2
          ? "linear-gradient(180deg,#ff70a6,#ff3d7f)"
          : "linear-gradient(180deg,#c77dff,#9d4edd)",
    }));
  }, [stateKey, confettiCount, reduceMotion]);

  return (
    <Box sx={{ display: "flex", justifyContent: "center" }}>
      {/* גובה קבוע — לא שוברים layout */}
      <Box sx={{ width: BOX_SIZE, height: BOX_SIZE, position: "relative" }}>
        {/* Confetti */}
        <AnimatePresence>
          {isOpeningOrOpened && (
            <Box
              key={`confetti-${stateKey}`}
              sx={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                overflow: "hidden",
                zIndex: 10,
              }}
            >
              {confettiPieces.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 120, x: 0, rotate: 0, scale: 0.7 }}
                  animate={{
                    opacity: [0, 1, 1, 0],
                    y: -80,
                    x: p.x,
                    rotate: p.r,
                    scale: p.s,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: p.d, ease: "easeOut" }}
                  style={{
                    position: "absolute",
                    left: "50%",
                    bottom: 78,
                    width: 10,
                    height: 14,
                    borderRadius: 4,
                    background: p.c,
                    boxShadow: "0 10px 18px rgba(0,0,0,0.14)",
                  }}
                />
              ))}
            </Box>
          )}
        </AnimatePresence>

        {/* Box */}
        <motion.div
          key={`box-${stateKey}`}
          animate={{
            rotate: isShaking && !reduceMotion ? [0, -2, 2, -2, 2, 0] : 0,
          }}
          transition={{ duration: 0.35 }}
          style={{
            position: "absolute",
            left: 24,
            right: 24,
            bottom: 24,
            height: 200,
            zIndex: 2,
          }}
        >
          {/* Body */}
          <Box
            sx={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 150,
              borderRadius: 5,
              background: "linear-gradient(180deg, #ff6aa2, #ff3d7f)",
              boxShadow: "0 18px 40px rgba(0,0,0,0.18)",
              border: "2px solid rgba(255,255,255,0.35)",
            }}
          />

          {/* Ribbon vertical */}
          <Box
            sx={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              bottom: 0,
              width: 22,
              height: 150,
              borderRadius: 4,
              background: "linear-gradient(180deg, #ffd166, #ffb703)",
              boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
            }}
          />

          {/* Ribbon horizontal */}
          <Box
            sx={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 64,
              height: 22,
              borderRadius: 4,
              background: "linear-gradient(180deg, #ffd166, #ffb703)",
              boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
            }}
          />

          {/* Lid */}
          <motion.div
            animate={{
              rotateX: isOpeningOrOpened ? 78 : 0,
              rotateZ: isOpeningOrOpened ? -8 : 0,
              y: isOpeningOrOpened ? -16 : 0,
            }}
            transition={{ type: "spring", stiffness: 230, damping: 18 }}
            style={{
              position: "absolute",
              left: -8,
              right: -8,
              bottom: 138,
              height: 58,
              borderRadius: 22,
              transformOrigin: "center bottom",
              background: "linear-gradient(180deg, #ff8ab5, #ff4d8d)",
              border: "2px solid rgba(255,255,255,0.35)",
              boxShadow: "0 14px 30px rgba(0,0,0,0.16)",
              transformStyle: "preserve-3d",
            }}
          />
        </motion.div>
      </Box>
    </Box>
  );
}

function AddScreen({
  anonymous,
  authorName,
  type,
  content,
  setAnonymous,
  setAuthorName,
  setType,
  setContent,
  canSubmit,
  onSubmit,
  addStatus,
}) {
  return (
    <Box component="form" onSubmit={onSubmit}>
      <Stack spacing={2.2}>
        <TextField
          label="שם"
          placeholder="שם (אם לא אנונימי)"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          disabled={anonymous}
          fullWidth
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
            />
          }
          label="אנונימי"
        />

        <FormControl fullWidth>
          <InputLabel id="type-label">נושא</InputLabel>
          <Select
            labelId="type-label"
            label="נושא"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {NOTE_TYPES.map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="תוכן"
          placeholder="כתבי כאן את הפתק…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          fullWidth
          multiline
          minRows={5}
        />

        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          disabled={!canSubmit}
        >
          הכנס לקופסה
        </Button>

        {addStatus && (
          <Alert severity={addStatus.severity}>{addStatus.text}</Alert>
        )}
      </Stack>
    </Box>
  );
}

function OpenScreen({
  phase,
  boxKey,
  isOpening,
  openedNote,
  openStatus,
  onNext,
}) {
  return (
    <Stack spacing={2.2}>
      <GiftBox phase={phase} stateKey={boxKey} />

      <Button
        variant="contained"
        size="large"
        fullWidth
        onClick={onNext}
        disabled={isOpening}
        aria-busy={isOpening ? "true" : "false"}
      >
        {isOpening ? "פותחת..." : "שלוף פתק 🎁"}
      </Button>

      {openStatus && (
        <Alert severity={openStatus.severity}>{openStatus.text}</Alert>
      )}

      {openedNote && (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
          <Stack spacing={1.2}>
            <Typography fontWeight={800}>{openedNote.type || "—"}</Typography>

            <Typography sx={{ opacity: 0.85 }}>
              מאת:{" "}
              {openedNote.anonymous ? "אנונימי" : openedNote.authorName || "—"}
            </Typography>

            <Divider />

            <Typography sx={{ whiteSpace: "pre-wrap" }}>
              {openedNote.content}
            </Typography>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}

// ---------------------------- App ----------------------------

export default function App() {
  const reduceMotion = useReducedMotion();

  const [mode, setMode] = useState("add"); // add | open

  // add form
  const [anonymous, setAnonymous] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [type, setType] = useState(NOTE_TYPES[0]);
  const [content, setContent] = useState("");

  // status
  const [addStatus, setAddStatus] = useState(null);
  const [openStatus, setOpenStatus] = useState(null);

  // open
  const [openedNote, setOpenedNote] = useState(null);
  const [isOpening, setIsOpening] = useState(false);
  const [boxPhase, setBoxPhase] = useState("idle"); // idle | shaking | opening | opened
  const [boxKey, setBoxKey] = useState(0);

  const timersRef = useRef([]);
  const abortRef = useRef(null);

  const canSubmit = useMemo(() => {
    const hasContent = content.trim().length > 0;
    if (anonymous) return hasContent;
    return authorName.trim().length > 0 && hasContent;
  }, [anonymous, authorName, content]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const abortInFlight = () => {
    abortRef.current?.abort?.();
    abortRef.current = null;
  };

  useEffect(() => {
    return () => {
      clearTimers();
      abortInFlight();
    };
  }, []);

  const resetAddForm = () => {
    setAnonymous(false);
    setAuthorName("");
    setType(NOTE_TYPES[0]);
    setContent("");
  };

  const apiFetch = async (path, options = {}) => {
    const res = await fetch(`${API_BASE}${path}`, options);
    return res;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAddStatus(null);

    if (!canSubmit) {
      setAddStatus({
        severity: "info",
        text: "אנא מלאי שם (או בחרי אנונימי) ותוכן.",
      });
      return;
    }

    const payload = {
      type,
      content: content.trim(),
      anonymous,
      authorName: anonymous ? null : authorName.trim(),
    };

    try {
      const res = await apiFetch("/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        setAddStatus({
          severity: "error",
          text: `שגיאה בשליחת הפתק (קוד ${res.status}) ❌`,
        });
        return;
      }

      setAddStatus({ severity: "success", text: "הפתק נכנס לקופסה ✅" });
      resetAddForm();
    } catch (err) {
      console.error(err);
      setAddStatus({ severity: "error", text: "שגיאה בשליחת הפתק ❌" });
    }
  };

  const handleNextNote = async () => {
    if (isOpening) return;

    clearTimers();
    abortInFlight();

    setOpenStatus(null);
    setOpenedNote(null);
    setIsOpening(true);
    setBoxKey((k) => k + 1);

    if (reduceMotion) {
      setBoxPhase("opening");
    } else {
      setBoxPhase("shaking");
      timersRef.current.push(setTimeout(() => setBoxPhase("opening"), 350));
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await apiFetch("/notes/next", { signal: controller.signal });

      if (res.status === 404) {
        setOpenStatus({
          severity: "info",
          text: "אין פתקים לא פתוחים בקופסה 🙂",
        });
        timersRef.current.push(setTimeout(() => setBoxPhase("idle"), 650));
        return;
      }

      if (!res.ok) {
        setOpenStatus({
          severity: "error",
          text: `שגיאה בשליפת פתק (קוד ${res.status}) ❌`,
        });
        timersRef.current.push(setTimeout(() => setBoxPhase("idle"), 650));
        return;
      }

      const note = await res.json();
      setOpenedNote(note);
      timersRef.current.push(setTimeout(() => setBoxPhase("opened"), 140));
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error(err);
        setOpenStatus({ severity: "error", text: "שגיאה בשליפת פתק ❌" });
      }
      timersRef.current.push(setTimeout(() => setBoxPhase("idle"), 650));
    } finally {
      setIsOpening(false);
      abortRef.current = null;
    }
  };

  const switchToAdd = () => {
    clearTimers();
    abortInFlight();
    setMode("add");
    setOpenStatus(null);
    setOpenedNote(null);
    setBoxPhase("idle");
  };

  const switchToOpen = () => {
    clearTimers();
    abortInFlight();
    setMode("open");
    setAddStatus(null);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        background: "linear-gradient(180deg, #f6f9ff, #eef3ff)",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 720,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          py: 4,
        }}
      >
        {/* Toggle מחוץ לכרטיס */}
        <Box sx={{ mb: 2, display: "flex", justifyContent: "center" }}>
          <ModeSwitch mode={mode} onAdd={switchToAdd} onOpen={switchToOpen} />
        </Box>

        {/* Card */}
        <Paper
          elevation={8}
          sx={{
            width: "100%",
            p: { xs: 3, sm: 5 },
            borderRadius: 5,
            backgroundColor: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(8px)",
            minHeight: CARD_MIN_HEIGHT,
          }}
        >
          <Stack spacing={3}>
            <Header mode={mode} />

            {mode === "add" ? (
              <AddScreen
                anonymous={anonymous}
                authorName={authorName}
                type={type}
                content={content}
                setAnonymous={setAnonymous}
                setAuthorName={setAuthorName}
                setType={setType}
                setContent={setContent}
                canSubmit={canSubmit}
                onSubmit={handleSubmit}
                addStatus={addStatus}
              />
            ) : (
              <OpenScreen
                phase={boxPhase}
                boxKey={boxKey}
                isOpening={isOpening}
                openedNote={openedNote}
                openStatus={openStatus}
                onNext={handleNextNote}
              />
            )}
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
