import React, { useContext } from "react";
import { AuthContext, AuthProvider } from "./context/AuthContext";
import Login from "./components/Login";
import Chat from "./components/Chat";
import { UIProvider } from "./context/UIContext";
import { Box, Typography } from "@mui/material";

import AdminPanel from "./components/AdminPanel";
import ForgotPassword from "./components/ForgotPassword";
import SessionTimeoutModal from "./components/SessionTimeoutModal";

const Footer = () => (
  <Box 
    component="footer" 
    sx={{ 
      p: 2, 
      textAlign: 'center', 
      bgcolor: 'background.paper', 
      borderTop: '1px solid', 
      borderColor: 'divider',
      zIndex: 10
    }}
  >
    <Typography variant="body2" color="text.secondary">
      Copyright &copy; 2026 || All rights are reserved
    </Typography>
    <Typography variant="body2" color="text.secondary">
      Design, developed, and maintained by Gaurav Sahitya
    </Typography>
  </Box>
);

const MainApp = () => {
  const { user } = useContext(AuthContext);
  const [showForgotPassword, setShowForgotPassword] = React.useState(false);

  const renderContent = () => {
    if (user) {
      return user.role === "admin" ? <AdminPanel /> : <Chat />;
    }
    if (showForgotPassword) {
      return <ForgotPassword onBackToLogin={() => setShowForgotPassword(false)} />;
    }
    return <Login onForgotPasswordClick={() => setShowForgotPassword(true)} />;
  };

  const isAdmin = user && user.role === "admin";

  if (isAdmin) {
    return (
      <Box display="flex" flexDirection="column" minHeight="100vh" bgcolor="background.default">
        <Box flex={1} display="flex" flexDirection="column">
          <AdminPanel />
        </Box>
        <Footer />
        <SessionTimeoutModal />
      </Box>
    );
  }

  return (
    <Box display="flex" flexDirection="column" height="100vh" sx={{ overflow: "hidden" }}>
      <Box flex={1} display="flex" flexDirection="column" sx={{ overflow: "hidden" }}>
        {renderContent()}
      </Box>
      <Footer />
      <SessionTimeoutModal />
    </Box>
  );
};

function App() {
  return (
    <UIProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </UIProvider>
  );
}

export default App;
