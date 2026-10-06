import React, { useState, useRef } from "react";
import {
  Box,
  TextField,
  IconButton,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import SyncIcon from "@mui/icons-material/Sync";
import CodeIcon from "@mui/icons-material/Code";
import LinkIcon from "@mui/icons-material/Link";
import CodeSnippetModal from "./CodeSnippetModal";
import UrlShareModal from "./UrlShareModal";

const ChatInput = ({
  activeConversationId,
  onSendMessage,
  onFileSelect,
  isUploading,
  onTyping,
  onSync,
}) => {
  const [message, setMessage] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const handleSend = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage("");
      if (onTyping) {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        onTyping(false);
      }
    }
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    if (onTyping) {
      onTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    }
  };

  const handleFileUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    onFileSelect(file);
    e.target.value = null;
  };

  const handleSync = async () => {
    if (!onSync || isSyncing) return;
    setIsSyncing(true);
    try {
      await onSync();
    } finally {
      // Keep spin visible for at least 600ms for clear visual feedback
      setTimeout(() => setIsSyncing(false), 600);
    }
  };

  return (
    <>
      <Box
        component="form"
        onSubmit={handleSend}
        sx={{
          display: "flex",
          alignItems: "center",
          padding: 2,
          backgroundColor: "background.paper",
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <input
          type="file"
          style={{ display: "none" }}
          ref={fileInputRef}
          onChange={handleFileChange}
        />

        {/* Attach file button */}
        {isUploading ? (
          <Box display="flex" alignItems="center" p={1} sx={{ mr: 0.5 }}>
            <CircularProgress size={16} color="secondary" />
          </Box>
        ) : (
          <Tooltip title="Attach file">
            <IconButton
              color="primary"
              onClick={handleFileUploadClick}
              sx={{ mr: 0.5 }}
            >
              <AttachFileIcon />
            </IconButton>
          </Tooltip>
        )}

        {/* Sync / refresh messages button */}
        <Tooltip title="Sync messages">
          <span>
            <IconButton
              color="primary"
              onClick={handleSync}
              disabled={isSyncing || !activeConversationId}
              sx={{
                mr: 0.5,
                "@keyframes spin": {
                  from: { transform: "rotate(0deg)" },
                  to: { transform: "rotate(360deg)" },
                },
                "& svg": {
                  animation: isSyncing ? "spin 0.6s linear infinite" : "none",
                },
              }}
            >
              <SyncIcon />
            </IconButton>
          </span>
        </Tooltip>

        {/* Code Snippet button adjacent to sync button */}
        <Tooltip title="Share code snippet">
          <span>
            <IconButton
              color="primary"
              onClick={() => setIsCodeModalOpen(true)}
              disabled={!activeConversationId}
              sx={{ mr: 0.5 }}
            >
              <CodeIcon />
            </IconButton>
          </span>
        </Tooltip>

        {/* URL Sharing button adjacent to code snippet button */}
        <Tooltip title="Share web link / URL">
          <span>
            <IconButton
              color="primary"
              onClick={() => setIsUrlModalOpen(true)}
              disabled={!activeConversationId}
              sx={{ mr: 1 }}
            >
              <LinkIcon />
            </IconButton>
          </span>
        </Tooltip>

        <TextField
          fullWidth
          variant="outlined"
          placeholder="Type a message"
          value={message}
          onChange={handleTyping}
          sx={{
            backgroundColor: "background.default",
            borderRadius: "8px",
            "& .MuiOutlinedInput-root": {
              "& fieldset": { border: "none" },
            },
          }}
        />

        <IconButton
          color="primary"
          type="submit"
          disabled={!message.trim()}
          sx={{ ml: 1 }}
        >
          <SendIcon />
        </IconButton>
      </Box>

      {/* Code Snippet Sharing Modal */}
      <CodeSnippetModal
        open={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        onSendCode={onSendMessage}
      />

      {/* URL Sharing Modal */}
      <UrlShareModal
        open={isUrlModalOpen}
        onClose={() => setIsUrlModalOpen(false)}
        onSendUrl={onSendMessage}
      />
    </>
  );
};

export default ChatInput;
