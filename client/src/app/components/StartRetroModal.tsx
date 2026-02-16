import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
} from "@mui/material";
import { Shuffle, CheckCircle, TrendingUp } from "lucide-react";

interface StartRetroModalProps {
  open: boolean;
  onClose: () => void;
  onStartRetro: (pullOrder: "random" | "keep-first" | "improve-first") => void;
}

export function StartRetroModal({
  open,
  onClose,
  onStartRetro,
}: StartRetroModalProps) {
  const [selectedOrder, setSelectedOrder] = useState<
    "random" | "keep-first" | "improve-first"
  >("random");

  const handleStart = () => {
    onStartRetro(selectedOrder);
  };

  const options = [
    {
      value: "random",
      icon: <Shuffle size={24} />,
      title: "Random",
      description: "Notes will be pulled in random order",
    },
    {
      value: "keep-first",
      icon: <CheckCircle size={24} />,
      title: "Start with Keep",
      description: "Positive notes first, then improvements",
    },
    {
      value: "improve-first",
      icon: <TrendingUp size={24} />,
      title: "Start with Improve",
      description: "Improvement notes first, then positives",
    },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          borderRadius: "16px",
          width: "500px",
          maxWidth: "90vw",
        },
      }}
    >
      <DialogTitle
        sx={{
          padding: "32px 32px 16px 32px",
        }}
      >
        <Typography
          sx={{
            fontSize: "1.5rem",
            fontWeight: 600,
            color: "#1E293B",
            mb: 1,
          }}
        >
          Retro Settings
        </Typography>
        <Typography
          sx={{
            fontSize: "0.875rem",
            fontWeight: 400,
            color: "#64748B",
          }}
        >
          Choose how notes will be pulled during the retro
        </Typography>
      </DialogTitle>

      <DialogContent
        sx={{
          padding: "24px 32px",
        }}
      >
        <RadioGroup
          value={selectedOrder}
          onChange={(e) =>
            setSelectedOrder(
              e.target.value as "random" | "keep-first" | "improve-first",
            )
          }
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {options.map((option) => (
              <Box
                key={option.value}
                onClick={() =>
                  setSelectedOrder(
                    option.value as "random" | "keep-first" | "improve-first",
                  )
                }
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  padding: "16px",
                  borderRadius: "12px",
                  border: "2px solid",
                  borderColor:
                    selectedOrder === option.value ? "#FF6B9D" : "#E2E8F0",
                  backgroundColor:
                    selectedOrder === option.value ? "#FFF5F8" : "white",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    borderColor:
                      selectedOrder === option.value ? "#FF6B9D" : "#CBD5E1",
                    backgroundColor:
                      selectedOrder === option.value ? "#FFF5F8" : "#F8FAFC",
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "48px",
                    height: "48px",
                    borderRadius: "10px",
                    backgroundColor:
                      selectedOrder === option.value ? "white" : "#F8FAFC",
                    color:
                      selectedOrder === option.value ? "#FF6B9D" : "#64748B",
                    flexShrink: 0,
                    transition: "all 0.2s ease",
                  }}
                >
                  {option.icon}
                </Box>

                <Box sx={{ flex: 1 }}>
                  <Typography
                    sx={{
                      fontSize: "1rem",
                      fontWeight: 600,
                      color: "#1E293B",
                      mb: 0.5,
                    }}
                  >
                    {option.title}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.875rem",
                      color: "#64748B",
                      lineHeight: 1.4,
                    }}
                  >
                    {option.description}
                  </Typography>
                </Box>

                <FormControlLabel
                  value={option.value}
                  control={
                    <Radio
                      sx={{
                        color: "#CBD5E1",
                        "&.Mui-checked": {
                          color: "#FF6B9D",
                        },
                      }}
                    />
                  }
                  label=""
                  sx={{ margin: 0 }}
                />
              </Box>
            ))}
          </Box>
        </RadioGroup>
      </DialogContent>

      <DialogActions
        sx={{
          padding: "16px 32px 32px 32px",
          gap: 1.5,
        }}
      >
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            textTransform: "none",
            fontSize: "1rem",
            fontWeight: 500,
            padding: "10px 24px",
            borderRadius: "10px",
            borderColor: "#E2E8F0",
            color: "#64748B",
            "&:hover": {
              borderColor: "#CBD5E1",
              backgroundColor: "#F8FAFC",
            },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleStart}
          variant="contained"
          sx={{
            textTransform: "none",
            fontSize: "1rem",
            fontWeight: 600,
            padding: "10px 24px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #FF6B9D 0%, #FE8DB5 100%)",
            boxShadow: "0 4px 14px rgba(255, 107, 157, 0.25)",
            "&:hover": {
              background: "linear-gradient(135deg, #FF5A8C 0%, #FD7CA4 100%)",
              boxShadow: "0 6px 20px rgba(255, 107, 157, 0.35)",
            },
          }}
        >
          Start Retro
        </Button>
      </DialogActions>
    </Dialog>
  );
}
