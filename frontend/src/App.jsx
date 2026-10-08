import React, { useContext } from "react";
import { AuthContext, AuthProvider } from "./context/AuthContext";
import Login from "./components/Login";
import Chat from "./components/Chat";
import { UIProvider } from "./context/UIContext";
import { Box } from "@mui/material";

import AdminPanel from "./components/AdminPanel";
import ForgotPassword from "./components/ForgotPassword";
import SessionTimeoutModal from "./components/SessionTimeoutModal";
import Footer from "./components/Footer";
import TermsAndConditions from "./components/TermsAndConditions";
import PrivacyPolicy from "./components/PrivacyPolicy";

const MainApp = () => {
  const { user } = useContext(AuthContext);
  const [showForgotPassword, setShowForgotPassword] = React.useState(false);
  const [currentView, setCurrentView] = React.useState('main');

  const renderContent = () => {
    if (currentView === 'terms') {
      return <TermsAndConditions onBack={() => setCurrentView('main')} />;
    }
    if (currentView === 'privacy') {
      return <PrivacyPolicy onBack={() => setCurrentView('main')} />;
    }
    if (user) {
      return user.role === "admin" ? <AdminPanel /> : <Chat />;
    }
    if (showForgotPassword) {
      return <ForgotPassword onBackToLogin={() => setShowForgotPassword(false)} />;
    }
    return <Login onForgotPasswordClick={() => setShowForgotPassword(true)} />;
  };

  const isAdmin = user && user.role === "admin" && currentView === "main";

  if (isAdmin) {
    return (
      <Box display="flex" flexDirection="column" minHeight="100vh" bgcolor="background.default">
        <Box flex={1} display="flex" flexDirection="column">
          <AdminPanel />
        </Box>
        <Footer onNavigate={(view) => setCurrentView(view)} />
        <SessionTimeoutModal />
      </Box>
    );
  }

  return (
    <Box display="flex" flexDirection="column" height="100vh" sx={{ overflow: currentView !== "main" ? "auto" : "hidden" }}>
      <Box flex={1} display="flex" flexDirection="column" sx={{ overflow: currentView !== "main" ? "auto" : "hidden" }}>
        {renderContent()}
      </Box>
      <Footer onNavigate={(view) => setCurrentView(view)} />
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
