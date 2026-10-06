import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  InputAdornment,
} from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import SendIcon from "@mui/icons-material/Send";
import LanguageIcon from "@mui/icons-material/Language";
import { useUI } from "../context/UIContext";

const UrlShareModal = ({ open, onClose, onSendUrl }) => {
  const { showAlert } = useUI();
  const [urlInput, setUrlInput] = useState("");
  const [urlTitle, setUrlTitle] = useState("");

  const handleClose = () => {
    setUrlInput("");
    setUrlTitle("");
    onClose();
  };

  const handleSend = (e) => {
    e?.preventDefault();
    const trimmedUrl = urlInput.trim();
    if (!trimmedUrl) {
      showAlert("Please enter a URL to share.", "error");
      return;
    }

    // Format URL to ensure valid http/https protocol prefix
    let finalUrl = trimmedUrl;
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = `https://${finalUrl}`;
    }

    // Basic URL structure validation
    const urlPattern =
      /^(https?:\/\/)?([\w.-]+)+[\w\-_~:/?#[\]@!$&'()*+,;=.]+/i;
    if (!urlPattern.test(finalUrl)) {
      showAlert("Please enter a valid web URL.", "error");
      return;
    }

    // Formatted message string
    const formattedMessage = urlTitle.trim()
      ? `${finalUrl}\n\n**Title / Description:** ${urlTitle.trim()}`
      : finalUrl;

    onSendUrl(formattedMessage);
    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <LinkIcon color="primary" />
        Share Web URL / Link
      </DialogTitle>
      <DialogContent dividers>
        <Box display="flex" flexDirection="column" gap={2} pt={1}>
          <Typography variant="body2" color="text.secondary">
            Enter a web link to share with your conversation partner. It will be
            sent as a formatted clickable link.
          </Typography>

          {/* 1. URL TextField */}
          <TextField
            label="Web URL / Address"
            placeholder="e.g. https://example.com or github.com/user/repo"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            fullWidth
            required
            autoFocus
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LanguageIcon color="primary" />
                </InputAdornment>
              ),
            }}
          />

          {/* 2. Optional Title / Description TextField */}
          <TextField
            label="Link Title / Description (Optional)"
            placeholder="Add an optional title or description for this URL..."
            value={urlTitle}
            onChange={(e) => setUrlTitle(e.target.value)}
            fullWidth
            multiline
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSend}
          variant="contained"
          color="primary"
          startIcon={<SendIcon />}
          disabled={!urlInput.trim()}
        >
          Send Link
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default React.memo(UrlShareModal);
