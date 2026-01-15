import { useState } from 'react';
import { TextField, Button, Box, Typography, Container } from '@mui/material';
import { GiftBox } from '@/app/components/GiftBox';
import { motion } from 'motion/react';

interface JoinTeamScreenProps {
  onJoin: (code: string) => void;
  onCreateNew: () => void;
}

export function JoinTeamScreen({ onJoin, onCreateNew }: JoinTeamScreenProps) {
  const [teamCode, setTeamCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (teamCode.trim()) {
      onJoin(teamCode);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #FFF5F8 0%, #FFF9FB 50%, #F8F9FF 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 3,
      }}
    >
      <Container maxWidth="md">
        <Box
          sx={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          {/* Hero animated gift box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <GiftBox animate={true} />
          </motion.div>

          {/* Brand and tagline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Typography
              variant="h2"
              sx={{
                fontWeight: 700,
                fontSize: { xs: '2.5rem', sm: '3rem', md: '3.5rem' },
                background: 'linear-gradient(135deg, #FF6B9D 0%, #C060E8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 2,
                letterSpacing: '-0.02em',
              }}
            >
              Retro Box
            </Typography>
            <Typography
              variant="h5"
              sx={{
                color: '#475569',
                fontWeight: 500,
                fontSize: { xs: '1.25rem', sm: '1.5rem' },
                mb: 1,
                lineHeight: 1.4,
              }}
            >
              Put it in the box. Open it together.
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: '#64748B',
                fontSize: { xs: '1rem', sm: '1.125rem' },
                maxWidth: '500px',
                margin: '0 auto',
                lineHeight: 1.7,
              }}
            >
              Run honest, fun retrospectives with your team.
              <br />
              No fuss, no complexity — just better conversations.
            </Typography>
          </motion.div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            style={{ width: '100%', maxWidth: '440px', marginTop: '32px' }}
          >
            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Enter your team code"
                value={teamCode}
                onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '16px',
                    backgroundColor: 'white',
                    fontSize: '1.125rem',
                    padding: '4px',
                    fontWeight: 500,
                    textAlign: 'center',
                    letterSpacing: '0.1em',
                    '& input': {
                      textAlign: 'center',
                      textTransform: 'uppercase',
                    },
                    '& fieldset': {
                      borderColor: '#E2E8F0',
                      borderWidth: '2px',
                    },
                    '&:hover fieldset': {
                      borderColor: '#FF6B9D',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#FF6B9D',
                      borderWidth: '2px',
                    },
                  },
                }}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                sx={{
                  borderRadius: '16px',
                  textTransform: 'none',
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  padding: '16px',
                  background: 'linear-gradient(135deg, #FF6B9D 0%, #FE8DB5 100%)',
                  boxShadow: '0 4px 14px rgba(255, 107, 157, 0.35)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #FF5A8C 0%, #FD7CA4 100%)',
                    boxShadow: '0 6px 20px rgba(255, 107, 157, 0.45)',
                    transform: 'translateY(-1px)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                Join the team
              </Button>

              <Box sx={{ position: 'relative', my: 2 }}>
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: 0,
                    right: 0,
                    height: '1px',
                    backgroundColor: '#E2E8F0',
                  }}
                />
                <Typography
                  sx={{
                    position: 'relative',
                    display: 'inline-block',
                    backgroundColor: 'transparent',
                    padding: '0 16px',
                    color: '#94A3B8',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                >
                  or
                </Typography>
              </Box>

              <Button
                variant="outlined"
                size="large"
                fullWidth
                onClick={onCreateNew}
                sx={{
                  borderRadius: '16px',
                  textTransform: 'none',
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  padding: '16px',
                  borderWidth: '2px',
                  borderColor: '#E2E8F0',
                  color: '#475569',
                  '&:hover': {
                    borderWidth: '2px',
                    borderColor: '#FF6B9D',
                    backgroundColor: 'rgba(255, 107, 157, 0.04)',
                    color: '#FF6B9D',
                    transform: 'translateY(-1px)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                Start a new box
              </Button>
            </Box>
          </motion.div>
        </Box>
      </Container>
    </Box>
  );
}