// Simple test to verify app loads
import { ThemeProvider, createTheme, CssBaseline, Box, Typography } from '@mui/material';

const theme = createTheme({
  palette: {
    primary: {
      main: '#FF6B9D',
    },
  },
});

export default function AppTest() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #FFF5F8 0%, #FFF9FB 50%, #F8F9FF 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="h3" sx={{ color: '#FF6B9D' }}>
          Retro Box - Loading...
        </Typography>
      </Box>
    </ThemeProvider>
  );
}
