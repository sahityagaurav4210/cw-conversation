import React, { useState, useContext, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Avatar,
  CircularProgress,
  IconButton,
  Tooltip,
  InputAdornment,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import RefreshIcon from "@mui/icons-material/Refresh";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import SecurityIcon from "@mui/icons-material/Security";
import EmailIcon from "@mui/icons-material/Email";
import WcIcon from "@mui/icons-material/Wc";
import { AuthContext } from "../context/AuthContext";
import { useUI } from "../context/UIContext";
import axios from "axios";
import FileUploader from "./FileUploader";

const UserProfile = ({ open, onClose }) => {
  const { user, updateProfile } = useContext(AuthContext);
  const { showAlert } = useUI();
  const [isEditing, setIsEditing] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profilePassword, setProfilePassword] = useState("");
  const [emailUserPart, setEmailUserPart] = useState("");
  const [emailDomain, setEmailDomain] = useState("");
  const [emailClients, setEmailClients] = useState([]);
  const [sex, setSex] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // CAPTCHA State
  const [captchaId, setCaptchaId] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [loadingCaptcha, setLoadingCaptcha] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const isFetchingCaptchaRef = useRef(false);

  const CAPTCHA_BASE_URL =
    import.meta.env.VITE_CAPTCHA_SERVICE_URL || "http://localhost:11905";
  const API_BASE =
    import.meta.env.VITE_API_BASE_URI || "http://localhost:5000";

  const getProfilePhotoUrl = (photoPath) => {
    if (!photoPath) return null;
    if (photoPath.startsWith("http://") || photoPath.startsWith("https://")) {
      return photoPath;
    }
    const cleanPath = photoPath.startsWith("/") ? photoPath : `/${photoPath}`;
    return `${API_BASE}${cleanPath}`;
  };

  const fetchEmailClients = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/auth/email-clients`);
      if (Array.isArray(res.data)) {
        setEmailClients(res.data.map((c) => c.domain));
      }
    } catch (err) {
      console.error("Failed to fetch email clients:", err);
    }
  };

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

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setIsEditing(false);
      setProfileName(user?.name || "");
      setProfilePassword("");
      setCaptchaInput("");
      
      const email = user?.email || "";
      if (email.includes("@")) {
        const parts = email.split("@");
        setEmailUserPart(parts[0] || "");
        setEmailDomain(parts[1] || "");
      } else {
        setEmailUserPart("");
        setEmailDomain("");
      }

      setSex(user?.sex || "");
      setPhotoFile(null);
      setRemovePhoto(false);
      setPhotoPreview(getProfilePhotoUrl(user?.profile_photo));

      fetchEmailClients();
    }
  }, [open, user]);

  useEffect(() => {
    if (isEditing) {
      fetchCaptcha();
    }
  }, [isEditing]);

  const handleProfileUpdate = async () => {
    if (!captchaInput.trim() || !captchaId) {
      showAlert("Please enter the CAPTCHA code.", "error");
      return;
    }
    if (profileName) {
      if (profileName.length > 32) {
        showAlert("Name cannot exceed 32 characters.", "error");
        return;
      }
      if (!/^[a-zA-Z0-9 ]+$/.test(profileName)) {
        showAlert(
          "Name can only contain letters, numbers, and spaces.",
          "error",
        );
        return;
      }
    }

    let fullEmail = "";
    if (emailUserPart.trim() || emailDomain.trim()) {
      if (!emailUserPart.trim() || !emailDomain.trim()) {
        showAlert("Please enter email username and select a domain from the list.", "error");
        return;
      }
      fullEmail = `${emailUserPart.trim()}@${emailDomain.trim()}`;
    }

    if (profilePassword) {
      if (profilePassword.length < 5 || profilePassword.length > 20) {
        showAlert("Password must be between 5 and 20 characters.", "error");
        return;
      }
    }

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", profileName);
      formData.append("password", profilePassword);
      formData.append("email", fullEmail);
      formData.append("sex", sex);
      formData.append("captcha", captchaInput);
      formData.append("captchaId", captchaId);

      if (photoFile) {
        formData.append("profile_photo", photoFile);
      } else if (removePhoto) {
        formData.append("remove_photo", "true");
      }

      await updateProfile(formData);
      showAlert("Profile updated successfully!", "success");
      setIsEditing(false);
      setProfilePassword("");
      setCaptchaInput("");
      setPhotoFile(null);
      setRemovePhoto(false);
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Failed to update profile.";
      showAlert(errorMsg, "error");
      fetchCaptcha();
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setIsEditing(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEditing ? "Edit Profile" : "User Profile"}</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" alignItems="center" my={1}>
          {!isEditing ? (
            <>
              <Avatar
                src={getProfilePhotoUrl(user?.profile_photo)}
                sx={{
                  width: 90,
                  height: 90,
                  bgcolor: "primary.main",
                  fontSize: 36,
                  mb: 1.5,
                  boxShadow: 2,
                }}
              >
                {(user?.name || user?.username || "U").charAt(0).toUpperCase()}
              </Avatar>
              <Typography variant="h5" fontWeight="600" gutterBottom>
                {user?.name || "No Name Provided"}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                @{user?.username}
              </Typography>

              <Box display="flex" gap={1} flexWrap="wrap" justifyContent="center" mt={1.5}>
                {user?.email ? (
                  <Chip
                    icon={<EmailIcon fontSize="small" />}
                    label={user.email}
                    color="primary"
                    variant="outlined"
                  />
                ) : (
                  <Chip
                    icon={<EmailIcon fontSize="small" />}
                    label="No Email Provided"
                    variant="outlined"
                    color="default"
                  />
                )}
                {user?.sex ? (
                  <Chip
                    icon={<WcIcon fontSize="small" />}
                    label={
                      user.sex === "male"
                        ? "Male"
                        : user.sex === "female"
                        ? "Female"
                        : "Transgender (TGP)"
                    }
                    color="secondary"
                    variant="outlined"
                  />
                ) : (
                  <Chip
                    icon={<WcIcon fontSize="small" />}
                    label="Sex: Not Specified"
                    variant="outlined"
                    color="default"
                  />
                )}
              </Box>
            </>
          ) : (
            <Box width="100%">
              {/* Profile Photo Uploader */}
              <Box mb={2}>
                <Typography variant="subtitle2" color="text.secondary" mb={0.5}>
                  Profile Photo (Optional - max 2MB, JPG/PNG only)
                </Typography>
                <FileUploader
                  currentImageUrl={photoPreview || getProfilePhotoUrl(user?.profile_photo)}
                  initialPreview={photoPreview || getProfilePhotoUrl(user?.profile_photo)}
                  onFileSelected={(file, previewUrl) => {
                    setPhotoFile(file);
                    setPhotoPreview(previewUrl);
                    setRemovePhoto(false);
                  }}
                  onFileSelect={(file, previewUrl) => {
                    setPhotoFile(file);
                    setPhotoPreview(previewUrl);
                    setRemovePhoto(false);
                  }}
                  onClear={() => {
                    setPhotoFile(null);
                    setPhotoPreview(null);
                    setRemovePhoto(true);
                  }}
                />
              </Box>

              <TextField
                fullWidth
                size="small"
                margin="normal"
                label="Name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                autoFocus
              />

              {/* Split Email Input */}
              <Box marginY={1.5}>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                  Email Address (Optional)
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Email User"
                    placeholder="e.g. john"
                    value={emailUserPart}
                    onChange={(e) => setEmailUserPart(e.target.value)}
                  />
                  <Typography variant="h6" color="text.secondary">
                    @
                  </Typography>
                  <Autocomplete
                    fullWidth
                    size="small"
                    options={emailClients}
                    value={emailDomain}
                    onChange={(e, newValue) => setEmailDomain(newValue || "")}
                    renderInput={(params) => (
                      <TextField {...params} label="Select Domain" placeholder="gmail.com" />
                    )}
                  />
                </Box>
              </Box>

              {/* Sex Dropdown */}
              <FormControl fullWidth size="small" margin="normal">
                <InputLabel id="sex-label">Sex (Optional)</InputLabel>
                <Select
                  labelId="sex-label"
                  label="Sex (Optional)"
                  value={sex}
                  onChange={(e) => setSex(e.target.value)}
                >
                  <MenuItem value="">
                    <em>Not Specified</em>
                  </MenuItem>
                  <MenuItem value="male">Male</MenuItem>
                  <MenuItem value="female">Female</MenuItem>
                  <MenuItem value="tgp">Transgender Person (TGP)</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                size="small"
                margin="normal"
                label="New Password (optional)"
                type="password"
                value={profilePassword}
                onChange={(e) => setProfilePassword(e.target.value)}
                helperText="Leave blank if you don't want to change your password."
              />

              {/* CAPTCHA Section */}
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

                {/* Textbox for Entering CAPTCHA */}
                <TextField
                  fullWidth
                  size="small"
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
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        {!isEditing ? (
          <>
            <Button onClick={handleClose} color="secondary">
              Close
            </Button>
            <Button
              onClick={() => setIsEditing(true)}
              color="primary"
              variant="contained"
              startIcon={<EditIcon />}
            >
              Edit Profile
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => setIsEditing(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleProfileUpdate}
              color="primary"
              variant="contained"
              disabled={isSaving || loadingCaptcha}
              startIcon={
                isSaving ? <CircularProgress size={16} color="secondary" /> : null
              }
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default UserProfile;
