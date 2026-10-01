import React, { useState } from "react";
import { useUI } from "../context/UIContext";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  InputAdornment,
  IconButton,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import axios from "axios";

const ForgotPassword = ({ onBackToLogin }) => {
  const { showAlert } = useUI();
  const [step, setStep] = useState(1); // 1: Request Code, 2: Reset Password
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const API_BASE = import.meta.env.VITE_API_BASE_URI || "http://localhost:5000";

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError("");
    if (!username.trim()) {
      setError("Username is required.");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/auth/forgot-password/request`, {
        username: username.trim(),
      });
      showAlert(res.data.message, "success");
      setStep(2);
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to request reset code.";
      setError(msg);
      showAlert(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyReset = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !code.trim() || !newPassword) {
      setError("All fields are required.");
      return;
    }

    if (newPassword.length < 5 || newPassword.length > 20) {
      setError("Password must be between 5 and 20 characters.");
      showAlert("Password must be between 5 and 20 characters.", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/auth/forgot-password/verify`, {
        username: username.trim(),
        code: code.trim(),
        newPassword,
      });
      showAlert(res.data.message, "success");
      onBackToLogin();
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to reset password.";
      setError(msg);
      showAlert(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      flex={1}
      minHeight="100%"
      bgcolor="background.default"
      py={4}
    >
      <Paper elevation={3} sx={{ padding: 4, width: 420, textAlign: "center" }}>
        <Typography variant="h5" gutterBottom color="primary">
          Forgot Password
        </Typography>

        {error && (
          <Typography color="error" sx={{ mb: 1 }}>
            {error}
          </Typography>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestCode}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enter your username to generate a password reset code. You will need to get this code from your Administrator.
            </Typography>
            <TextField
              fullWidth
              margin="normal"
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <Button
              fullWidth
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
              sx={{ mt: 2, mb: 1 }}
            >
              Request Reset Code
            </Button>
            <Button
              size="small"
              color="secondary"
              onClick={() => setStep(2)}
              sx={{ mb: 1 }}
            >
              Already have a code? Set new password
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyReset}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enter your username, 6-digit reset code from your Admin, and your new password.
            </Typography>
            <TextField
              fullWidth
              margin="normal"
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <TextField
              fullWidth
              margin="normal"
              label="6-Digit Reset Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <TextField
              fullWidth
              margin="normal"
              label="New Password"
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              helperText="Must be between 5 and 20 characters."
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              fullWidth
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
              sx={{ mt: 2, mb: 1 }}
            >
              Reset Password
            </Button>
            <Button
              size="small"
              color="secondary"
              onClick={() => setStep(1)}
              sx={{ mb: 1 }}
            >
              Back to Request Code
            </Button>
          </form>
        )}

        <Box mt={2}>
          <Button color="inherit" onClick={onBackToLogin}>
            Back to Login
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default ForgotPassword;
