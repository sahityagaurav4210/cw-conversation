import React, { useState, useContext } from "react";
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
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (isAdminMode) {
      if (!username || !password) {
        const msg = "Please enter username and password for admin login.";
        setError(msg);
        showAlert(msg, "error");
        return;
      }
      try {
        await login(username, password, true);
        showAlert("Admin login successful!", "success");
      } catch (err) {
        const errorMsg = err.response?.data?.error || "Admin login failed";
        setError(errorMsg);
        showAlert(errorMsg, "error");
      }
      return;
    }

    if (!isLogin) {
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

    try {
      if (isLogin) {
        await login(username, password, false);
        showAlert("Login successful!", "success");
      } else {
        await register(username, password, name);
        setIsLogin(true);
        showAlert("Registration successful. Please login.", "success");
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || "An error occurred";
      setError(errorMsg);
      showAlert(errorMsg, "error");
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
      <Paper elevation={3} sx={{ padding: 4, width: 400, textAlign: "center" }}>
        <Typography variant="h5" gutterBottom color="primary">
          {isAdminMode
            ? "Admin Login"
            : isLogin
            ? "Simple Chat Login"
            : "Register for Simple Chat"}
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
          />

          {!isAdminMode && !isLogin && (
            <TextField
              fullWidth
              margin="normal"
              label="Name (Optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              helperText="Max 32 chars, letters, numbers, and spaces only."
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
            sx={{ mt: 2, mb: 1 }}
          >
            {isAdminMode
              ? "Login as Admin"
              : isLogin
              ? "Login"
              : "Register"}
          </Button>

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
          <Box mt={2}>
            <Button
              color="secondary"
              onClick={() => {
                setIsAdminMode(false);
                setError("");
              }}
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

            <Button color="secondary" onClick={() => setIsLogin(!isLogin)}>
              {isLogin
                ? "Need an account? Register"
                : "Already have an account? Login"}
            </Button>

            {isLogin && (
              <>
                <Divider sx={{ my: 1 }}>
                  <Typography variant="h6" color="secondary">
                    OR
                  </Typography>
                </Divider>

                <Button
                  color="primary"
                  variant="contained"
                  onClick={() => {
                    setIsAdminMode(true);
                    setError("");
                  }}
                >
                  Login as Admin
                </Button>
              </>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
};

export default Login;
