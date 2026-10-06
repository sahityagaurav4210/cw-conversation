import React, { useState, useContext, useEffect, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import { useUI } from "../context/UIContext";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  InputAdornment,
  IconButton,
  Divider,
  Stack,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import RefreshIcon from "@mui/icons-material/Refresh";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import SecurityIcon from "@mui/icons-material/Security";
import AlternateEmailIcon from "@mui/icons-material/AlternateEmail";
import PasswordIcon from "@mui/icons-material/Password";
import BadgeIcon from "@mui/icons-material/Badge";
import NavbarLogo from "./NavbarLogo";
import axios from "axios";
import LoginIcon from "@mui/icons-material/Login";

const Login = ({ onForgotPasswordClick }) => {
  const { login, register } = useContext(AuthContext);
  const { showAlert } = useUI();
  const [isLogin, setIsLogin] = useState(true);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // CAPTCHA State
  const [captchaId, setCaptchaId] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [loadingCaptcha, setLoadingCaptcha] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const isFetchingCaptchaRef = useRef(false);

  const CAPTCHA_BASE_URL =
    import.meta.env.VITE_CAPTCHA_SERVICE_URL || "http://localhost:11905";
  const API_BASE = import.meta.env.VITE_API_BASE_URI || "http://localhost:5000";

  const fetchCaptcha = async () => {
    if (isFetchingCaptchaRef.current) return;
    isFetchingCaptchaRef.current = true;
    setLoadingCaptcha(true);
    setCaptchaInput("");
    try {
      let res;
      try {
        res = await axios.get(`${CAPTCHA_BASE_URL}/api/v1/captcha/generate`);
      } catch (directErr) {
        res = await axios.get(`${API_BASE}/api/auth/captcha/generate`);
      }

      const id =
        res.data?.details?.details?.captchaId ||
        res.data?.details?.captchaId ||
        res.data?.captchaId;

      if (id) {
        setCaptchaId(String(id));
      } else {
        console.warn("Captcha ID missing in response:", res.data);
      }
    } catch (err) {
      console.warn(
        "Could not reach CAPTCHA service. Ensure CAPTCHA service is running.",
      );
    } finally {
      setLoadingCaptcha(false);
      isFetchingCaptchaRef.current = false;
    }
  };

  const handlePlayAudioCaptcha = async () => {
    if (!captchaId || isPlayingAudio) return;
    setIsPlayingAudio(true);
    try {
      const audioUrl = `${API_BASE}/api/auth/captcha/audio/${captchaId}`;
      const res = await axios.get(audioUrl, { responseType: "blob" });
      const blobUrl = URL.createObjectURL(res.data);
      const audio = new Audio(blobUrl);
      audio.onended = () => setIsPlayingAudio(false);
      audio.onerror = () => setIsPlayingAudio(false);
      await audio.play();
    } catch (err) {
      try {
        const audio = new Audio(
          `${CAPTCHA_BASE_URL}/api/v1/captcha/audio/${captchaId}`,
        );
        audio.onended = () => setIsPlayingAudio(false);
        audio.onerror = () => setIsPlayingAudio(false);
        await audio.play();
      } catch (fallbackErr) {
        setIsPlayingAudio(false);
      }
    }
  };

  useEffect(() => {
    fetchCaptcha();
  }, [isLogin, isAdminMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!captchaInput.trim() || !captchaId) {
      const msg = "Please enter the CAPTCHA code.";
      setError(msg);
      showAlert(msg, "error");
      return;
    }

    if (isAdminMode && (!username || !password)) {
      const msg = "Please enter username and password for admin login.";
      setError(msg);
      showAlert(msg, "error");
      return;
    }

    if (!isAdminMode && !isLogin) {
      if (username.length > 32) {
        const errorMsg = "Username cannot exceed 32 characters.";
        setError(errorMsg);
        showAlert(errorMsg, "error");
        return;
      }
      const usernameRegex = /^[a-zA-Z0-9_]+$/;
      if (!usernameRegex.test(username)) {
        const errorMsg =
          "Username can only contain letters, numbers, and underscores.";
        setError(errorMsg);
        showAlert(errorMsg, "error");
        return;
      }

      if (name) {
        if (name.length > 32) {
          setError("Name cannot exceed 32 characters.");
          showAlert("Name cannot exceed 32 characters.", "error");
          return;
        }
        if (!/^[a-zA-Z0-9 ]+$/.test(name)) {
          setError("Name can only contain letters, numbers, and spaces.");
          showAlert(
            "Name can only contain letters, numbers, and spaces.",
            "error",
          );
          return;
        }
      }

      if (password.length < 5 || password.length > 20) {
        setError("Password must be between 5 and 20 characters.");
        showAlert("Password must be between 5 and 20 characters.", "error");
        return;
      }
    }

    setLoading(true);
    try {
      if (isAdminMode) {
        await login(username, password, true, captchaInput, captchaId);
        showAlert("Admin login successful!", "success");
      } else if (isLogin) {
        await login(username, password, false, captchaInput, captchaId);
        showAlert("Login successful!", "success");
      } else {
        await register(username, password, name, captchaInput, captchaId);
        setIsLogin(true);
        showAlert("Registration successful. Please login.", "success");
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || "An error occurred";
      setError(errorMsg);
      showAlert(errorMsg, "error");
      fetchCaptcha();
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
      <Paper
        elevation={3}
        sx={{
          padding: 4,
          width: 600,
          textAlign: "center",
          border: `1px solid gainsboro`,
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <NavbarLogo src="/logo.png" height={96} />
          <Typography
            variant="h5"
            color="primary"
            sx={{
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            Conversation
          </Typography>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <Typography variant="h5" gutterBottom color="primary">
          {isAdminMode
            ? "Admin Login"
            : isLogin
              ? "Single Sign On"
              : "Register for Conversation"}
        </Typography>

        {error && <Typography color="error">{error}</Typography>}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            margin="normal"
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            helperText={
              !isAdminMode && !isLogin
                ? "Max 32 chars, letters, numbers, and underscores only."
                : ""
            }
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <AlternateEmailIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          {!isAdminMode && !isLogin && (
            <TextField
              fullWidth
              margin="normal"
              label="Name (Optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              helperText="Max 32 chars, letters, numbers, and spaces only."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <BadgeIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          )}

          <TextField
            fullWidth
            margin="normal"
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            helperText={
              !isAdminMode && !isLogin
                ? "Must be between 5 and 20 characters."
                : ""
            }
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PasswordIcon fontSize="small" />
                </InputAdornment>
              ),
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

          {/* CAPTCHA Section: Image & Controls Adjacent to Textbox */}
          <Box
            display="flex"
            alignItems="center"
            gap={1.5}
            my={2}
            sx={{
              p: 1.5,
              bgcolor: "background.default",
              borderRadius: "8px",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            {/* Image & Refresh/Audio Buttons */}
            <Box display="flex" alignItems="center" gap={0.5}>
              {loadingCaptcha ? (
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  sx={{
                    width: 180,
                    height: 60,
                    bgcolor: "action.hover",
                    borderRadius: "8px",
                  }}
                >
                  <CircularProgress size={24} />
                </Box>
              ) : captchaId ? (
                <Box
                  component="img"
                  src={`${CAPTCHA_BASE_URL}/api/v1/captcha/image/${captchaId}`}
                  onError={(e) => {
                    const API_BASE =
                      import.meta.env.VITE_API_BASE_URI ||
                      "http://localhost:5000";
                    e.target.onerror = null;
                    e.target.src = `${API_BASE}/api/auth/captcha/image/${captchaId}`;
                  }}
                  alt="CAPTCHA"
                  onClick={fetchCaptcha}
                  sx={{
                    height: 60,
                    width: 180,
                    objectFit: "contain",
                    borderRadius: "8px",
                    cursor: "pointer",
                    bgcolor: "#fff",
                    border: "1px solid gainsboro",
                    p: 0.5,
                  }}
                  title="Click to refresh CAPTCHA"
                />
              ) : (
                <Typography variant="caption" color="error">
                  No CAPTCHA
                </Typography>
              )}

              <Tooltip title="Refresh CAPTCHA">
                <IconButton
                  size="small"
                  onClick={fetchCaptcha}
                  disabled={loadingCaptcha}
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              {captchaId && (
                <Tooltip title="Play Audio CAPTCHA">
                  <IconButton
                    size="small"
                    onClick={handlePlayAudioCaptcha}
                    disabled={isPlayingAudio}
                    color={isPlayingAudio ? "primary" : "default"}
                  >
                    {isPlayingAudio ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <VolumeUpIcon fontSize="small" />
                    )}
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            {/* Adjacent Textbox for Entering CAPTCHA */}
            <TextField
              fullWidth
              margin="none"
              label="Enter CAPTCHA"
              value={captchaInput}
              onChange={(e) => setCaptchaInput(e.target.value)}
              required
              placeholder="CAPTCHA"
              inputProps={{ maxLength: 8 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SecurityIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Box display="flex" justifyContent="flex-start" my={1}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading || loadingCaptcha}
              startIcon={
                loading ? (
                  <CircularProgress size={16} color="secondary" />
                ) : (
                  <LoginIcon fontSize="small" />
                )
              }
              sx={{ width: "max-content", p: 2, justifyContent: "flex-start" }}
            >
              {loading
                ? isAdminMode
                  ? "Logging in..."
                  : isLogin
                    ? "Logging in..."
                    : "Registering..."
                : isAdminMode
                  ? "Login as Admin"
                  : isLogin
                    ? "Login"
                    : "Register"}
            </Button>
          </Box>

          {!isAdminMode && isLogin && (
            <Box display="flex" justifyContent="flex-end" mb={1}>
              <Button
                size="small"
                color="primary"
                onClick={onForgotPasswordClick}
                sx={{
                  textTransform: "none",
                  fontSize: "0.85rem",
                  fontWeight: "bold",
                }}
              >
                Forgot Password?
              </Button>
            </Box>
          )}
        </form>

        {isAdminMode ? (
          <Box display="flex" justifyContent="flex-start" mt={2}>
            <Button
              color="secondary"
              onClick={() => {
                setIsAdminMode(false);
                setError("");
              }}
              fullWidth
              sx={{ p: 2 }}
            >
              Back to User Login
            </Button>
          </Box>
        ) : (
          <>
            <Divider sx={{ my: 1 }}>
              <Typography variant="h6" color="secondary">
                OR
              </Typography>
            </Divider>

            <Box display="flex" justifyContent="center">
              <Button
                color="secondary"
                onClick={() => setIsLogin(!isLogin)}
                sx={{
                  p: 2,
                }}
                fullWidth
              >
                {isLogin
                  ? "Need an account? Register"
                  : "Already have an account? Login"}
              </Button>
            </Box>

            {isLogin && (
              <>
                <Divider sx={{ my: 1 }}>
                  <Typography variant="h6" color="secondary">
                    OR
                  </Typography>
                </Divider>

                <Box display="flex" justifyContent="flex-start">
                  <Button
                    color="primary"
                    variant="contained"
                    onClick={() => {
                      setIsAdminMode(true);
                      setError("");
                    }}
                    sx={{
                      p: 2,
                    }}
                    fullWidth
                  >
                    Login as Admin
                  </Button>
                </Box>
              </>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
};

export default Login;
