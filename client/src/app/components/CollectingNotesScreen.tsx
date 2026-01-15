import { useState } from "react";
import {
  TextField,
  Button,
  Box,
  Typography,
  Container,
  Card,
  CardContent,
  Chip,
  IconButton,
  Snackbar,
  Dialog,
  DialogContent,
  DialogTitle,
} from "@mui/material";

import {
  TrendingUp,
  Heart,
  Lightbulb,
  Sparkles,
  Edit2,
  Check,
  X,
  Copy,
  HelpCircle,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3000";

interface CollectingNotesScreenProps {
  teamName: string;
  teamCode: string;
  onSubmitNote: (note: {
    name: string;
    topic: string;
    content: string;
  }) => void;
  onStartRetro: () => void;
  onBack: () => void;
  noteCount: number;
}

export function CollectingNotesScreen({
  teamName,
  teamCode,
  onSubmitNote,
  onStartRetro,
  onBack,
  noteCount,
}: CollectingNotesScreenProps) {
  // Note form state
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [content, setContent] = useState("");
  const [copied, setCopied] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [openHelp, setOpenHelp] = useState(false);

  // Team name editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(teamName);
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState("");

  const displayName = teamName || `Team ${teamCode}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onSubmitNote({
        name: name.trim() || "Anonymous",
        topic,
        content,
      });
      setContent("");
      setTopic("");
      setShowSuccess(true);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(teamCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleStartEdit = () => {
    setEditedName(teamName);
    setNameError("");
    setIsEditingName(true);
  };

  const handleCancelEdit = () => {
    setEditedName(teamName);
    setNameError("");
    setIsEditingName(false);
  };

  const handleSaveName = async () => {
    const trimmed = editedName.trim();

    if (!trimmed) {
      setNameError("Name cannot be empty");
      return;
    }

    if (trimmed.length < 2) {
      setNameError("Name must be at least 2 characters");
      return;
    }

    if (trimmed.length > 50) {
      setNameError("Name must be 50 characters or less");
      return;
    }

    setIsSavingName(true);
    setNameError("");

    try {
      const res = await fetch(`${API_BASE}/teams/${teamCode}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      if (!res.ok) {
        const error = await res.json();
        setNameError(error.error || "Failed to update name");
        setIsSavingName(false);
        return;
      }

      setIsEditingName(false);
      setIsSavingName(false);
    } catch (error) {
      console.error("Failed to update team name:", error);
      setNameError("Network error");
      setIsSavingName(false);
    }
  };

  const topicOptions = [
    {
      value: "improve",
      label: "Improve",
      icon: <TrendingUp size={20} />,
      color: "#FFC857",
    },
    {
      value: "keep",
      label: "Keep",
      icon: <Heart size={20} />,
      color: "#FF6B9D",
    },
    {
      value: "idea",
      label: "Idea",
      icon: <Lightbulb size={20} />,
      color: "#60D0E8",
    },
    {
      value: "shoutout",
      label: "Shoutout",
      icon: <Sparkles size={20} />,
      color: "#C060E8",
    },
  ];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #FFF5F8 0%, #FFF9FB 50%, #F8F9FF 100%)",
        padding: 3,
      }}
    >
      <Container maxWidth="md">
        {/* Header with editable team name */}
        <Box sx={{ mb: 4, textAlign: "center" }}>
          {!isEditingName ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
              }}
            >
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: "1.75rem", sm: "2.25rem" },
                  background:
                    "linear-gradient(135deg, #FF6B9D 0%, #C060E8 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {displayName}
              </Typography>
              <IconButton
                size="small"
                onClick={handleStartEdit}
                sx={{
                  color: "#64748B",
                  "&:hover": {
                    color: "#FF6B9D",
                    backgroundColor: "rgba(255, 107, 157, 0.08)",
                  },
                }}
              >
                <Edit2 size={18} />
              </IconButton>
            </Box>
          ) : (
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                gap: 1,
                flexWrap: "wrap",
              }}
            >
              <TextField
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName();
                  if (e.key === "Escape") handleCancelEdit();
                }}
                autoFocus
                disabled={isSavingName}
                error={!!nameError}
                helperText={nameError}
                size="small"
                sx={{
                  minWidth: "250px",
                  "& .MuiInputBase-root": {
                    fontSize: { xs: "1.5rem", sm: "1.75rem" },
                    fontWeight: 700,
                  },
                }}
              />
              <Box sx={{ display: "flex", gap: 0.5 }}>
                <IconButton
                  size="small"
                  onClick={handleSaveName}
                  disabled={isSavingName}
                  sx={{
                    color: "#10B981",
                    "&:hover": { backgroundColor: "rgba(16, 185, 129, 0.08)" },
                  }}
                >
                  <Check size={20} />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={handleCancelEdit}
                  disabled={isSavingName}
                  sx={{
                    color: "#EF4444",
                    "&:hover": { backgroundColor: "rgba(239, 68, 68, 0.08)" },
                  }}
                >
                  <X size={20} />
                </IconButton>
              </Box>
            </Box>
          )}

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              mt: 2,
            }}
          >
            <Chip
              label={`Team Code: ${teamCode}`}
              sx={{
                backgroundColor: "#E0E7FF",
                color: "#3730A3",
                fontWeight: 600,
                fontSize: "0.875rem",
              }}
            />
            <IconButton
              size="small"
              onClick={handleCopyCode}
              sx={{ color: "#64748B" }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </IconButton>
          </Box>

          <Typography
            variant="body2"
            sx={{ mt: 2, color: "#64748B", fontSize: "0.9375rem" }}
          >
            {noteCount} {noteCount === 1 ? "note" : "notes"} collected
          </Typography>

          {/* RESTORED: How it works button */}
          <Box sx={{ textAlign: "center", mt: 2 }}>
            <Button
              variant="text"
              size="small"
              startIcon={<HelpCircle size={16} />}
              onClick={() => setOpenHelp(true)}
              sx={{
                textTransform: "none",
                color: "#64748B",
                fontSize: "0.875rem",
                "&:hover": {
                  backgroundColor: "rgba(192, 96, 232, 0.08)",
                  color: "#C060E8",
                },
              }}
            >
              How it works
            </Button>
          </Box>
        </Box>

        {/* Note Input Form */}
        <Card
          sx={{
            mb: 4,
            borderRadius: "16px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
          }}
        >
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <form onSubmit={handleSubmit}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <TextField
                  label="Your Name (optional)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Anonymous"
                  fullWidth
                />

                {/* RESTORED: Chip-based topic selector */}
                <Box>
                  <Typography
                    sx={{
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "#475569",
                      mb: 1.5,
                    }}
                  >
                    Topic
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                    {topicOptions.map((option) => (
                      <Button
                        key={option.value}
                        variant={
                          topic === option.value ? "contained" : "outlined"
                        }
                        onClick={() => setTopic(option.value)}
                        startIcon={option.icon}
                        sx={{
                          flex: { xs: "1 1 calc(50% - 6px)", sm: "1" },
                          borderRadius: "14px",
                          textTransform: "none",
                          fontSize: "0.9375rem",
                          fontWeight: 600,
                          padding: "12px 20px",
                          borderWidth: "2px",
                          borderColor:
                            topic === option.value ? option.color : "#E2E8F0",
                          backgroundColor:
                            topic === option.value
                              ? option.color
                              : "transparent",
                          color: topic === option.value ? "white" : "#64748B",
                          "&:hover": {
                            borderWidth: "2px",
                            borderColor: option.color,
                            backgroundColor:
                              topic === option.value
                                ? option.color
                                : `${option.color}15`,
                          },
                          "& .MuiButton-startIcon": {
                            marginRight: "8px",
                          },
                        }}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </Box>
                </Box>

                <TextField
                  label="Your Note"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What's on your mind?"
                  multiline
                  rows={4}
                  required
                  fullWidth
                />

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={!content.trim() || !topic}
                  sx={{
                    borderRadius: "12px",
                    textTransform: "none",
                    fontSize: "1rem",
                    fontWeight: 600,
                    background:
                      "linear-gradient(135deg, #C060E8 0%, #A855F7 100%)",
                    "&:hover": {
                      background:
                        "linear-gradient(135deg, #B050D8 0%, #9845E7 100%)",
                    },
                    "&:disabled": { background: "#E2E8F0", color: "#94A3B8" },
                  }}
                >
                  Add Note
                </Button>
              </Box>
            </form>
          </CardContent>
        </Card>

        {/* Actions */}
        <Box
          sx={{
            display: "flex",
            gap: 2,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Button
            variant="contained"
            size="large"
            onClick={onStartRetro}
            disabled={noteCount === 0}
            sx={{
              borderRadius: "16px",
              textTransform: "none",
              fontSize: "1.0625rem",
              fontWeight: 600,
              padding: "14px 40px",
              background: "linear-gradient(135deg, #FF6B9D 0%, #FE8DB5 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #FF5A8C 0%, #FD7CA4 100%)",
              },
              "&:disabled": { background: "#E2E8F0", color: "#94A3B8" },
            }}
          >
            Start Retro
          </Button>

          <Button
            variant="text"
            onClick={onBack}
            sx={{
              textTransform: "none",
              color: "#64748B",
              "&:hover": {
                backgroundColor: "rgba(255, 107, 157, 0.08)",
                color: "#FF6B9D",
              },
            }}
          >
            ← Back
          </Button>
        </Box>

        <Snackbar
          open={showSuccess}
          autoHideDuration={2000}
          onClose={() => setShowSuccess(false)}
          message="Note added!"
        />

        {/* RESTORED: How it works dialog */}
        <Dialog
          open={openHelp}
          onClose={() => setOpenHelp(false)}
          fullWidth
          maxWidth="sm"
          PaperProps={{
            sx: {
              borderRadius: "24px",
            },
          }}
        >
          <DialogTitle
            sx={{
              fontWeight: 600,
              fontSize: "1.25rem",
              color: "#1E293B",
              pb: 2,
            }}
          >
            How it works
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <Box sx={{ display: "flex", gap: 2 }}>
                <Box
                  sx={{
                    minWidth: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background:
                      "linear-gradient(135deg, #FF6B9D 0%, #FE8DB5 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: 700,
                    fontSize: "0.875rem",
                    flexShrink: 0,
                  }}
                >
                  1
                </Box>
                <Box>
                  <Typography
                    sx={{ fontWeight: 600, color: "#1E293B", mb: 0.5 }}
                  >
                    Share the team code
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.9375rem",
                      color: "#64748B",
                      lineHeight: 1.5,
                    }}
                  >
                    Invite your team to join using the code above
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: "flex", gap: 2 }}>
                <Box
                  sx={{
                    minWidth: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background:
                      "linear-gradient(135deg, #FFC857 0%, #FFD666 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#664D03",
                    fontWeight: 700,
                    fontSize: "0.875rem",
                    flexShrink: 0,
                  }}
                >
                  2
                </Box>
                <Box>
                  <Typography
                    sx={{ fontWeight: 600, color: "#1E293B", mb: 0.5 }}
                  >
                    Collect honest thoughts
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.9375rem",
                      color: "#64748B",
                      lineHeight: 1.5,
                    }}
                  >
                    Everyone adds their notes anonymously or with their name
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: "flex", gap: 2 }}>
                <Box
                  sx={{
                    minWidth: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background:
                      "linear-gradient(135deg, #C060E8 0%, #A855F7 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: 700,
                    fontSize: "0.875rem",
                    flexShrink: 0,
                  }}
                >
                  3
                </Box>
                <Box>
                  <Typography
                    sx={{ fontWeight: 600, color: "#1E293B", mb: 0.5 }}
                  >
                    Open the box together
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.9375rem",
                      color: "#64748B",
                      lineHeight: 1.5,
                    }}
                  >
                    Review notes one by one and have meaningful discussions
                  </Typography>
                </Box>
              </Box>
            </Box>
          </DialogContent>
        </Dialog>
      </Container>
    </Box>
  );
}
