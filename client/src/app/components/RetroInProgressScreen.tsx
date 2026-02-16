import React from "react";

import {
  Button,
  Box,
  Typography,
  Container,
  Card,
  CardContent,
  Chip,
} from "@mui/material";

import { GiftBox } from "@/app/components/GiftBox";
import { motion, AnimatePresence } from "motion/react";
import { TrendingUp, Heart, Lightbulb, Sparkles } from "lucide-react";

import type { BackendNote, Topic } from "types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3000";

interface RetroInProgressScreenProps {
  teamName: string;
  teamCode: string;
  currentNote: BackendNote | null; // ✅ תואם למה שמגיע מהשרת
  remainingCount: number;
  isHost: boolean;
  clientId: string;
  onBack: () => void;
}

export function RetroInProgressScreen({
  teamName,
  teamCode,
  currentNote,
  remainingCount,
  isHost,
  clientId,
  onBack,
}: RetroInProgressScreenProps) {
  const topicConfig: Record<
    Topic,
    { label: string; icon: React.ReactElement; bg: string; text: string }
  > = {
    improve: {
      label: "Improve",
      icon: <TrendingUp size={16} />,
      bg: "#FEF3C7",
      text: "#92400E",
    },
    keep: {
      label: "Keep",
      icon: <Heart size={16} />,
      bg: "#FCE7F3",
      text: "#9F1239",
    },
    idea: {
      label: "Idea",
      icon: <Lightbulb size={16} />,
      bg: "#CFFAFE",
      text: "#164E63",
    },
    shoutout: {
      label: "Shoutout",
      icon: <Sparkles size={16} />,
      bg: "#E0E7FF",
      text: "#3730A3",
    },
  };

  const allNotesRevealed = remainingCount === 0;

  const handlePullNote = async () => {
    if (!isHost) return;

    try {
      const res = await fetch(`${API_BASE}/teams/${teamCode}/retro/pull-next`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-id": clientId,
        },
        body: JSON.stringify({ clientId }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        console.error("Failed to pull note:", error);
        return;
      }

      console.log("Note pulled, waiting for socket update...");
    } catch (error) {
      console.error("Failed to pull note:", error);
    }
  };

  // ---------- Derived UI fields ----------
  const imageUrl = (currentNote?.imageUrl ?? "").trim();
  const text = (currentNote?.content ?? "").trim();

  const hasImage =
    imageUrl.startsWith("/uploads/") ||
    imageUrl.startsWith("http://") ||
    imageUrl.startsWith("https://");

  const hasText = text.length > 0;

  const imageSrc = hasImage
    ? imageUrl.startsWith("/uploads/")
      ? `${API_BASE}${imageUrl}`
      : imageUrl
    : "";

  const authorLabel =
    (currentNote?.authorName && currentNote.authorName.trim()) || "Anonymous";

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #FFF5F8 0%, #FFF9FB 50%, #F8F9FF 100%)",
        padding: 3,
        paddingBottom: 8,
      }}
    >
      <Container maxWidth="md">
        <Box sx={{ mb: 4, textAlign: "center" }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              fontSize: { xs: "1.75rem", sm: "2.25rem" },
              background: "linear-gradient(135deg, #FF6B9D 0%, #C060E8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              mb: 2,
            }}
          >
            {teamName}
          </Typography>

          <Chip
            label={
              allNotesRevealed
                ? "All notes revealed"
                : `${remainingCount} ${
                    remainingCount === 1 ? "note" : "notes"
                  } remaining`
            }
            sx={{
              backgroundColor: allNotesRevealed ? "#D1FAE5" : "#C060E8",
              color: allNotesRevealed ? "#065F46" : "white",
              fontWeight: 600,
              fontSize: "0.875rem",
              borderRadius: "10px",
              padding: "4px 8px",
              height: "auto",
            }}
          />

          {isHost && (
            <Typography
              variant="caption"
              sx={{ display: "block", mt: 1, color: "#64748B" }}
            >
              You are the facilitator
            </Typography>
          )}
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            mb: 4,
            minHeight: "500px",
            position: "relative",
          }}
        >
          <Box
            sx={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              width: "100%",
            }}
          >
            <AnimatePresence mode="wait">
              {currentNote && (
                <motion.div
                  key={currentNote.id}
                  initial={{ opacity: 0, y: 80, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -30, scale: 0.95 }}
                  transition={{
                    duration: 0.6,
                    ease: [0.25, 0.1, 0.25, 1],
                    opacity: { duration: 0.4 },
                  }}
                  style={{
                    width: "100%",
                    maxWidth: "600px",
                    zIndex: 2,
                  }}
                >
                  <Card
                    sx={{
                      borderRadius: "24px",
                      boxShadow: "0 12px 48px rgba(0, 0, 0, 0.12)",
                      border: "2px solid rgba(255, 107, 157, 0.2)",
                      mb: 3,
                    }}
                  >
                    <CardContent sx={{ padding: { xs: 3, sm: 5 } }}>
                      {/* Topic chip */}
                      <Box sx={{ mb: 3 }}>
                        <Chip
                          icon={topicConfig[currentNote.type].icon}
                          label={topicConfig[currentNote.type].label}
                          sx={{
                            backgroundColor: topicConfig[currentNote.type].bg,
                            color: topicConfig[currentNote.type].text,
                            fontWeight: 600,
                            fontSize: "0.875rem",
                            borderRadius: "10px",
                            padding: "6px 4px",
                            height: "auto",
                            "& .MuiChip-icon": {
                              color: topicConfig[currentNote.type].text,
                              marginLeft: "8px",
                            },
                          }}
                        />
                      </Box>

                      {/* Text (if exists) */}
                      {hasText && (
                        <Typography
                          sx={{
                            color: "#1E293B",
                            fontWeight: 400,
                            lineHeight: 1.7,
                            fontSize: { xs: "1.125rem", sm: "1.25rem" },
                            mb: hasImage ? 2 : 4,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {text}
                        </Typography>
                      )}

                      {/* Image (if exists) */}
                      {hasImage && (
                        <Box
                          component="img"
                          src={imageSrc}
                          alt="note image"
                          onError={() => {
                            console.error("IMAGE FAILED TO LOAD:", imageSrc);
                          }}
                          sx={{
                            width: "100%",
                            maxHeight: "420px",
                            objectFit: "contain",
                            borderRadius: "18px",
                            mb: 4,
                            border: "1px solid rgba(148, 163, 184, 0.35)",
                            boxShadow: "0 10px 28px rgba(0,0,0,0.10)",
                            backgroundColor: "rgba(255,255,255,0.6)",
                          }}
                        />
                      )}

                      {/* Author */}
                      <Typography
                        variant="body2"
                        sx={{
                          color: "#64748B",
                          fontSize: "0.9375rem",
                          fontStyle:
                            authorLabel === "Anonymous" ? "italic" : "normal",
                          fontWeight: 500,
                        }}
                      >
                        — {authorLabel}
                      </Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            <Box sx={{ mb: 3 }}>
              <GiftBox isOpen={false} animate={!currentNote} />
            </Box>

            {!currentNote && !allNotesRevealed && isHost && (
              <Button
                variant="contained"
                size="large"
                onClick={handlePullNote}
                sx={{
                  borderRadius: "16px",
                  textTransform: "none",
                  fontSize: "1.125rem",
                  fontWeight: 600,
                  padding: "16px 48px",
                  background:
                    "linear-gradient(135deg, #FF6B9D 0%, #FE8DB5 100%)",
                  boxShadow: "0 4px 14px rgba(255, 107, 157, 0.35)",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #FF5A8C 0%, #FD7CA4 100%)",
                    boxShadow: "0 6px 20px rgba(255, 107, 157, 0.45)",
                    transform: "translateY(-2px)",
                  },
                  transition: "all 0.2s ease",
                }}
              >
                Open a note
              </Button>
            )}

            {!currentNote && !allNotesRevealed && !isHost && (
              <Typography
                sx={{
                  color: "#64748B",
                  fontSize: "1rem",
                  fontStyle: "italic",
                }}
              >
                Waiting for facilitator to open a note...
              </Typography>
            )}

            {currentNote && !allNotesRevealed && isHost && (
              <Button
                variant="contained"
                size="large"
                onClick={handlePullNote}
                sx={{
                  borderRadius: "16px",
                  textTransform: "none",
                  fontSize: "1.0625rem",
                  fontWeight: 600,
                  padding: "14px 40px",
                  background:
                    "linear-gradient(135deg, #C060E8 0%, #A855F7 100%)",
                  boxShadow: "0 4px 14px rgba(192, 96, 232, 0.35)",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #B050D8 0%, #9845E7 100%)",
                    boxShadow: "0 6px 20px rgba(192, 96, 232, 0.45)",
                    transform: "translateY(-2px)",
                  },
                  transition: "all 0.2s ease",
                }}
              >
                Next note
              </Button>
            )}

            {allNotesRevealed && (
              <Box sx={{ textAlign: "center", mt: 4 }}>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    background:
                      "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    mb: 1,
                  }}
                >
                  🎉 All notes revealed!
                </Typography>
                <Typography sx={{ color: "#64748B", fontSize: "0.9375rem" }}>
                  Great work, team! End the retro when ready.
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
        <Box sx={{ textAlign: "center", mt: 6 }}>
          <Button
            variant="text"
            onClick={() => {
              // 🔒 לא מאפשרים לסיים אם נשארו פתקים
              if (!allNotesRevealed) return;
              onBack();
            }}
            disabled={!allNotesRevealed}
            sx={{
              textTransform: "none",
              fontSize: "0.9375rem",
              color: allNotesRevealed ? "#64748B" : "#94A3B8",
              "&:hover": allNotesRevealed
                ? {
                    backgroundColor: "rgba(255, 107, 157, 0.08)",
                    color: "#FF6B9D",
                  }
                : undefined,
            }}
          >
            {allNotesRevealed
              ? "← End retro"
              : `← End retro (open ${remainingCount} more)`}
          </Button>

          {!allNotesRevealed && (
            <Typography sx={{ mt: 1, color: "#94A3B8", fontSize: "0.85rem" }}>
              You can end the retro only after all notes are revealed.
            </Typography>
          )}
        </Box>
      </Container>
    </Box>
  );
}
