import React, { useState, useEffect, useRef, useContext } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
} from "@mui/material";
import TimerIcon from "@mui/icons-material/Timer";
import LogoutIcon from "@mui/icons-material/Logout";
import RefreshIcon from "@mui/icons-material/Refresh";
import { AuthContext } from "../context/AuthContext";
import { useUI } from "../context/UIContext";

const SessionTimeoutModal = () => {
  const { user, token, refreshToken, logout } = useContext(AuthContext);
  const { showAlert } = useUI();
  const [open, setOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [loading, setLoading] = useState(false);

  const lastActivityRef = useRef(Date.now());
  const hasActivityInCurrentTokenRef = useRef(false);
  const isRefreshingRef = useRef(false);

  const INACTIVITY_LIMIT_MS = 14 * 60 * 1000; // 14 minutes of inactivity

  // Reset activity flag when a new token is set
  useEffect(() => {
    hasActivityInCurrentTokenRef.current = false;
  }, [token]);

  // Track user activity (mousemove, keydown, click, scroll, touchstart)
  useEffect(() => {
    const handleActivity = () => {
      // Only update activity timestamp if warning modal is not currently showing
      if (!open) {
        lastActivityRef.current = Date.now();
        hasActivityInCurrentTokenRef.current = true;
      }
    };

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("click", handleActivity);
    window.addEventListener("scroll", handleActivity);
    window.addEventListener("touchstart", handleActivity);

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
    };
  }, [open]);

  // Main Session Monitor: Check inactivity & automatic token refresh at 00:00
  useEffect(() => {
    if (!token || !user) {
      setOpen(false);
      return;
    }

    const checkInterval = setInterval(async () => {
      if (isRefreshingRef.current) return;

      const now = Date.now();
      const inactiveDuration = now - lastActivityRef.current;

      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (!payload || !payload.exp) return;

        const expMs = payload.exp * 1000;
        const timeRemainingMs = expMs - now;

        // CASE 1: 14 Minutes of Inactivity reached -> Show Warning Modal (if not open)
        if (inactiveDuration >= INACTIVITY_LIMIT_MS && !open && timeRemainingMs > 1000) {
          setSecondsLeft(Math.max(1, Math.min(60, Math.floor(timeRemainingMs / 1000))));
          setOpen(true);
          return;
        }

        // CASE 2: Token timer hits 00:00 (<= 1 sec remaining) & Modal is NOT open
        if (timeRemainingMs <= 1000 && !open) {
          if (hasActivityInCurrentTokenRef.current) {
            // User had activity during this session -> Auto-call Refresh Token API
            isRefreshingRef.current = true;
            try {
              await refreshToken();
              hasActivityInCurrentTokenRef.current = false;
              lastActivityRef.current = Date.now();
            } catch (err) {
              console.error("Automatic session refresh failed at 00:00:", err);
              logout();
            } finally {
              isRefreshingRef.current = false;
            }
          } else {
            // User had 0 activity during the session -> Auto-logout
            logout();
          }
        }
      } catch (err) {
        console.error("Error monitoring session token:", err);
      }
    }, 1000); // Check every second

    return () => clearInterval(checkInterval);
  }, [token, user, open, refreshToken, logout]);

  // Live 60-second countdown once modal opens
  useEffect(() => {
    if (!open) return;

    const countdownInterval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setOpen(false);
          showAlert("Session expired due to inactivity. Logging out...", "warning");
          logout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [open, logout, showAlert]);

  const handleStayLoggedIn = async () => {
    setLoading(true);
    try {
      await refreshToken();
      hasActivityInCurrentTokenRef.current = false;
      lastActivityRef.current = Date.now();
      showAlert("Session extended successfully!", "success");
      setOpen(false);
    } catch (err) {
      console.error("Failed to refresh token:", err);
      showAlert("Failed to extend session. Please log in again.", "error");
      setOpen(false);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutClick = () => {
    setOpen(false);
    logout();
  };

  return (
    <Dialog open={open} onClose={() => {}} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <TimerIcon color="warning" />
        Session Expiration Warning
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body1" gutterBottom>
          You have been inactive for <strong>14 minutes</strong>.
        </Typography>
        <Typography variant="body1" color="error.main" fontWeight="bold" gutterBottom>
          Your session will automatically expire in {secondsLeft} second{secondsLeft !== 1 ? "s" : ""}.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Click "Stay Logged In" to extend your session or "Logout" to sign out.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
        <Button
          variant="outlined"
          color="error"
          onClick={handleLogoutClick}
          startIcon={<LogoutIcon />}
          disabled={loading}
        >
          Logout
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleStayLoggedIn}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
          disabled={loading}
        >
          Stay Logged In
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SessionTimeoutModal;
