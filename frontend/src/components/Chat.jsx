import React, { useState, useEffect, useContext, useRef } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  Paper,
  IconButton,
  TextField,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  Chip,
  Avatar,
  Tooltip,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SearchIcon from "@mui/icons-material/Search";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import LogoutIcon from "@mui/icons-material/Logout";
import DoneIcon from "@mui/icons-material/Done";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import axios from "axios";
import { io } from "socket.io-client";
import { AuthContext } from "../context/AuthContext";
import { useUI } from "../context/UIContext";
import ChatInput from "./ChatInput";
import UserProfile from "./UserProfile";
import FeedbackDialog from "./FeedbackDialog";
import SessionTimerTypography from "./SessionTimerTypography";
import NavbarLogo from "./NavbarLogo";
import SearchBar from "./SearchBar";
import socketService from "../services/socketService";
import FormattedMessage from "./FormattedMessage";

const Chat = () => {
  const { user, token, logout } = useContext(AuthContext);
  const { showAlert, showConfirm } = useUI();
  const [users, setUsers] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [socket, setSocket] = useState(null);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [downloadingFileId, setDownloadingFileId] = useState(null);
  const [downloadedFileIds, setDownloadedFileIds] = useState(() => {
    try {
      const saved = localStorage.getItem("downloaded_file_ids");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (e) {
      return new Set();
    }
  });
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [fileCaption, setFileCaption] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const messagesEndRef = useRef(null);
  const activeConversationIdRef = useRef(null);
  const messagesRef = useRef([]);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Request notification permission
  useEffect(() => {
    if (
      "Notification" in window &&
      Notification.permission !== "granted" &&
      Notification.permission !== "denied"
    ) {
      Notification.requestPermission();
    }
  }, []);

  const API_BASE = import.meta.env.VITE_API_BASE_URI || "http://localhost:5000";

  // Initialize Singleton Socket
  useEffect(() => {
    if (!token) return;
    const newSocket = socketService.connect(token);
    if (!newSocket) return;

    newSocket.on("connect", () => console.log("Connected to chat server"));

    newSocket.on("online_users", (usersArray) => {
      setOnlineUsers(new Set(usersArray));
    });

    newSocket.on("user_online", ({ userId }) => {
      setOnlineUsers((prev) => {
        const updated = new Set(prev);
        updated.add(userId);
        return updated;
      });
    });

    newSocket.on("user_offline", ({ userId }) => {
      setOnlineUsers((prev) => {
        const updated = new Set(prev);
        updated.delete(userId);
        return updated;
      });
    });

    newSocket.on("typing", ({ userId }) => {
      setTypingUsers((prev) => {
        const updated = new Set(prev);
        updated.add(userId);
        return updated;
      });
    });

    newSocket.on("stop_typing", ({ userId }) => {
      setTypingUsers((prev) => {
        const updated = new Set(prev);
        updated.delete(userId);
        return updated;
      });
    });

    newSocket.on("conversation_joined", ({ conversationId }) => {
      setActiveConversationId(conversationId);
      fetchMessages(conversationId);
    });

    newSocket.on("messages_read", ({ conversationId, messageIds, fileIds }) => {
      if (activeConversationIdRef.current === conversationId) {
        setMessages((prev) =>
          prev.map((m) => {
            if (
              (m.type === "text" && messageIds.includes(m.id)) ||
              (m.type === "file" && fileIds.includes(m.id))
            ) {
              return { ...m, is_read: true };
            }
            return m;
          }),
        );
      }
    });

    newSocket.on("new_message", (msg) => {
      // Only append if this message belongs to the currently open conversation
      if (
        activeConversationIdRef.current &&
        String(msg.conversation_id) !== String(activeConversationIdRef.current)
      ) {
        return;
      }
      setMessages((prev) => {
        // Check for duplicates
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    newSocket.on("incoming_message", (msg) => {
      // Notification logic
      const isCurrentlyChatting =
        activeConversationIdRef.current === msg.conversation_id;
      const isFocused = document.hasFocus();

      if (!(isCurrentlyChatting && isFocused)) {
        const senderDisplay =
          msg.sender_name || msg.sender_username || "Someone";
        const displayContent = msg.content || "Sent an attachment";

        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(`New message from ${senderDisplay}`, {
            body: displayContent,
          });
        } else {
          showAlert(`New message from ${senderDisplay}`, "info");
        }
      }

      // Check if sender is in our users list by triggering a state update
      setUsers((prevUsers) => {
        const userExists = prevUsers.some((u) => u.id === msg.sender_id);
        if (!userExists) {
          // Refetch users if we get a message from someone not in our list
          fetchUsers();
        }
        return prevUsers;
      });
    });

    setSocket(newSocket);
    return () => socketService.disconnect();
  }, [token]);

  // Fetch users for sidebar
  const fetchUsers = async (search = "") => {
    try {
      const API_BASE =
        import.meta.env.VITE_API_BASE_URI || "http://localhost:5000";
      const res = await axios.get(
        `${API_BASE}/api/auth/users?search=${encodeURIComponent(search)}`,
      );
      setUsers(res.data.filter((u) => u.id !== user.id));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [user.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ESC key to close chat
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setActiveUser(null);
        setActiveConversationId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelectUser = (targetUser) => {
    setActiveUser(targetUser);
    setMessages([]); // Clear until fetched
    socket.emit("join_conversation", targetUser.id);
  };

  const fetchMessages = async (convId) => {
    try {
      const res = await axios.get(`${API_BASE}/api/chat/messages/${convId}`);
      setMessages(res.data);
    } catch (err) {
      console.error("Failed to fetch messages", err);
    }
  };

  const markAsRead = (messagesList, convId) => {
    if (!socket || !convId) return;

    const unreadMessages = messagesList.filter(
      (m) => m.sender_id !== user.id && !m.is_read,
    );
    if (unreadMessages.length === 0) return;

    const messageIds = unreadMessages
      .filter((m) => m.type === "text")
      .map((m) => m.id);
    const fileIds = unreadMessages
      .filter((m) => m.type === "file")
      .map((m) => m.id);

    socket.emit("mark_read", { conversationId: convId, messageIds, fileIds });

    setMessages((prev) =>
      prev.map((m) => {
        if (m.sender_id !== user.id && !m.is_read) {
          return { ...m, is_read: true };
        }
        return m;
      }),
    );
  };

  useEffect(() => {
    if (document.hasFocus()) {
      markAsRead(messages, activeConversationId);
    }
  }, [messages, activeConversationId, socket]);

  useEffect(() => {
    const handleFocus = () => {
      if (activeConversationIdRef.current) {
        markAsRead(messagesRef.current, activeConversationIdRef.current);
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [socket]);

  const handleSendMessage = (text) => {
    if (!socket || !activeConversationId || !text.trim()) return;

    if (text.length > 50000) {
      showAlert("Message cannot exceed 50,000 characters.", "error");
      return;
    }

    const isCodeBlock = text.trim().startsWith("```");
    const messageRegex = /^[a-zA-Z0-9 \t\r\n.(),_:\/\-#$/&%@*+'?!;=~\[\]{}<>"`|\\]+$/;

    if (!isCodeBlock && !messageRegex.test(text.trim())) {
      showAlert("Message contains invalid characters.", "error");
      return;
    }

    socket.emit("send_message", {
      conversationId: activeConversationId,
      content: text,
    });
  };

  const handleTypingStatus = (isTyping) => {
    if (!socket || !activeConversationId) return;
    if (isTyping) {
      socket.emit("typing", { conversationId: activeConversationId });
    } else {
      socket.emit("stop_typing", { conversationId: activeConversationId });
    }
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const handleFileDownload = (fileId, fileName) => {
    setDownloadingFileId(fileId);
    // Download via browser fetch to pass Auth header (or simple anchor if token in URL)
    axios
      .get(`${API_BASE}/api/chat/files/download/${fileId}`, {
        responseType: "blob",
      })
      .then((response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();

        setDownloadedFileIds((prev) => {
          const updated = new Set(prev);
          updated.add(fileId);
          try {
            localStorage.setItem(
              "downloaded_file_ids",
              JSON.stringify(Array.from(updated)),
            );
          } catch (e) {}
          return updated;
        });
      })
      .catch((err) => {
        console.error("Download failed", err);
        showAlert("Failed to decrypt and download file.", "error");
      })
      .finally(() => {
        setDownloadingFileId(null);
      });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    const maxUploadSizeMB = import.meta.env.VITE_MAX_UPLOAD_SIZE_MB || 5;
    const maxUploadSizeBytes = maxUploadSizeMB * 1024 * 1024;
    if (file.size > maxUploadSizeBytes) {
      showAlert(`File size exceeds limit of ${maxUploadSizeMB} MB`, "error");
      return;
    }
    setPreviewFile(file);
    setFileCaption("");
  };

  const handleSendFile = async () => {
    if (!previewFile || !activeConversationId) return;

    if (fileCaption.trim()) {
      if (fileCaption.length > 2048) {
        showAlert("Caption cannot exceed 2048 characters.", "error");
        return;
      }
      const messageRegex = /^[a-zA-Z0-9 .(),_\-#$/&%@*+']+$/;
      if (!messageRegex.test(fileCaption)) {
        showAlert("Caption contains invalid characters.", "error");
        return;
      }
    }

    setIsUploadingFile(true);
    const formData = new FormData();
    formData.append("file", previewFile);
    if (fileCaption.trim()) {
      formData.append("caption", fileCaption.trim());
    }

    try {
      const res = await axios.post(
        `${API_BASE}/api/chat/files/${activeConversationId}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      // Don't manually append here — backend emits new_message socket event
      // which will deliver the file to both sender and receiver in real time
      setPreviewFile(null);
      setFileCaption("");
    } catch (err) {
      console.error("File upload failed", err);
      showAlert("Failed to upload file safely.", "error");
    } finally {
      setIsUploadingFile(false);
    }
  };

  return (
    <Box display="flex" height="100%" width="100%" sx={{ overflow: "hidden" }}>
      {/* Sidebar */}
      <Box
        width={isSidebarCollapsed ? 64 : 300}
        bgcolor="background.default"
        borderRight="1px solid"
        borderColor="divider"
        display="flex"
        flexDirection="column"
        height="100%"
        sx={{
          width: isSidebarCollapsed ? 64 : 300,
          transition: "width 0.2s ease-in-out",
          overflow: "hidden",
        }}
      >
        {isSidebarCollapsed ? (
          <Box
            p={1.5}
            bgcolor="background.paper"
            display="flex"
            justifyContent="center"
            alignItems="center"
          >
            <Tooltip title="Expand Sidebar">
              <IconButton
                onClick={() => setIsSidebarCollapsed(false)}
                sx={{ p: 0.5 }}
              >
                <NavbarLogo src="/logo.png" height={75} />
              </IconButton>
            </Tooltip>
          </Box>
        ) : (
          <Box
            p={2}
            bgcolor="background.paper"
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box display="flex" alignItems="center" gap={1}>
              <IconButton
                size="small"
                onClick={() => setIsSidebarCollapsed(true)}
                title="Collapse Sidebar"
                color="primary"
              >
                <MenuOpenIcon fontSize="small" />
              </IconButton>
              <Typography variant="h6" color="text.primary">
                Chats
              </Typography>
            </Box>
          </Box>
        )}

        {!isSidebarCollapsed && (
          <>
            <SearchBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSearch={fetchUsers}
            />
            <Divider />
            <Box px={2} pt={2} pb={0}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                fontWeight="bold"
                textTransform="uppercase"
                letterSpacing={1}
              >
                Users
              </Typography>
            </Box>
          </>
        )}

        <List
          sx={{ overflowY: "auto", flex: 1, px: isSidebarCollapsed ? 0.5 : 0 }}
        >
          {users.map((u) => {
            const displayName = u.name
              ? `${u.name} (@${u.username})`
              : u.username;
            const initial = (u.name || u.username || "U")
              .charAt(0)
              .toUpperCase();

            if (isSidebarCollapsed) {
              return (
                <Tooltip key={u.id} title={displayName} placement="right">
                  <ListItem
                    button
                    onClick={() => handleSelectUser(u)}
                    sx={{
                      justifyContent: "center",
                      px: 1,
                      py: 1.5,
                      bgcolor:
                        activeUser?.id === u.id
                          ? "action.selected"
                          : "transparent",
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <Box position="relative" display="inline-flex">
                      <Avatar
                        sx={{
                          width: 36,
                          height: 36,
                          bgcolor:
                            activeUser?.id === u.id
                              ? "primary.main"
                              : "secondary.main",
                          fontSize: 16,
                        }}
                      >
                        {initial}
                      </Avatar>
                      {onlineUsers.has(u.id) && (
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            bgcolor: "success.main",
                            border: "2px solid",
                            borderColor: "background.paper",
                            position: "absolute",
                            bottom: 0,
                            right: 0,
                          }}
                        />
                      )}
                    </Box>
                  </ListItem>
                </Tooltip>
              );
            }

            return (
              <ListItem
                button
                key={u.id}
                onClick={() => handleSelectUser(u)}
                sx={{
                  bgcolor:
                    activeUser?.id === u.id ? "action.selected" : "transparent",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <ListItemText
                  primary={displayName}
                  primaryTypographyProps={{ color: "text.primary" }}
                />
                {onlineUsers.has(u.id) && (
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      bgcolor: "success.main",
                      ml: 1,
                    }}
                    title="Online"
                  />
                )}
              </ListItem>
            );
          })}
        </List>
      </Box>

      {/* Chat Area */}
      <Box
        flex={1}
        display="flex"
        flexDirection="column"
        height="100%"
        bgcolor="background.default"
        onDragOver={activeUser ? handleDragOver : undefined}
        onDragLeave={activeUser ? handleDragLeave : undefined}
        onDrop={activeUser ? handleDrop : undefined}
        position="relative"
        sx={{ overflow: "hidden" }}
      >
        <Box
          p={2}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          sx={{
            background: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(18, 18, 18, 0.75)"
                : "rgba(255, 255, 255, 0.75)",
            backdropFilter: "blur(12px) saturate(180%)",
            WebkitBackdropFilter: "blur(12px) saturate(180%)",
            borderBottom: "1px solid",
            borderColor: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(255, 255, 255, 0.12)"
                : "rgba(0, 0, 0, 0.08)",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.06)",
            zIndex: 5,
          }}
        >
          <Box>
            <Typography variant="h6" color="text.primary">
              {activeUser
                ? activeUser.name
                  ? `${activeUser.name} (@${activeUser.username})`
                  : activeUser.username
                : "Conversation"}
            </Typography>
            {activeUser && (
              <Typography
                variant="caption"
                sx={{
                  color: typingUsers.has(activeUser.id)
                    ? "success.main"
                    : onlineUsers.has(activeUser.id)
                      ? "success.main"
                      : "text.secondary",
                }}
              >
                {typingUsers.has(activeUser.id)
                  ? "Typing..."
                  : onlineUsers.has(activeUser.id)
                    ? "Online"
                    : "Offline"}
              </Typography>
            )}
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <SessionTimerTypography sx={{ mr: 1 }} />
            <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)}>
              <MoreVertIcon />
            </IconButton>
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={() => setMenuAnchor(null)}
            >
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null);
                  setIsProfileOpen(true);
                }}
              >
                View Profile
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null);
                  setIsFeedbackOpen(true);
                }}
              >
                Feedback
              </MenuItem>
            </Menu>
            <IconButton
              onClick={() =>
                showConfirm("Are you sure that you want to logout?", logout)
              }
              color="primary"
              title="Logout"
            >
              <LogoutIcon />
            </IconButton>
          </Box>
        </Box>

        {isDragging && activeUser && (
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            bgcolor="rgba(0,0,0,0.5)"
            display="flex"
            justifyContent="center"
            alignItems="center"
            zIndex={10}
          >
            <Typography variant="h4" color="white">
              Drop file to send
            </Typography>
          </Box>
        )}
        {activeUser ? (
          <>
            <Box flex={1} p={3} sx={{ overflowY: "auto" }}>
              {messages.map((msg, index) => {
                const isMe = msg.sender_id === user.id;
                return (
                  <Box
                    key={index}
                    display="flex"
                    justifyContent={isMe ? "flex-end" : "flex-start"}
                    mb={2}
                  >
                    <Paper
                      sx={{
                        p: 1.5,
                        maxWidth: "70%",
                        bgcolor: isMe ? "#dcf8c6" : "background.paper",
                        color: "text.primary",
                        borderRadius: "8px",
                      }}
                    >
                      {msg.type === "file" ? (
                        <Box
                          display="flex"
                          flexDirection="column"
                          gap={1}
                          minWidth={260}
                        >
                          <Box
                            display="flex"
                            justifyContent="space-between"
                            alignItems="flex-start"
                            gap={2}
                          >
                            <Box
                              display="flex"
                              flexDirection="column"
                              gap={0.5}
                            >
                              <Typography
                                variant="body2"
                                sx={{ wordBreak: "break-all" }}
                              >
                                <strong>file name:</strong> {msg.original_name}
                              </Typography>
                              <Typography variant="body2">
                                <strong>file type:</strong>{" "}
                                {msg.mime_type || "Unknown"}
                              </Typography>
                              <Typography variant="body2">
                                <strong>file size:</strong>{" "}
                                {msg.size ? formatBytes(msg.size) : "0 Bytes"}
                              </Typography>
                            </Box>
                            <Box
                              display="flex"
                              flexDirection="column"
                              alignItems="flex-end"
                              justifyContent="space-between"
                              gap={1}
                              sx={{ minWidth: "fit-content" }}
                            >
                              <Box
                                height={24}
                                display="flex"
                                alignItems="center"
                              >
                                {downloadedFileIds.has(msg.id) && (
                                  <Chip
                                    icon={
                                      <CheckCircleIcon
                                        style={{ fontSize: 14 }}
                                      />
                                    }
                                    label="Downloaded"
                                    size="small"
                                    color="success"
                                    variant="outlined"
                                    sx={{ height: 22, fontSize: "0.7rem" }}
                                  />
                                )}
                              </Box>
                              {downloadingFileId === msg.id ? (
                                <Box
                                  display="flex"
                                  alignItems="center"
                                  justifyContent="center"
                                  p={0.5}
                                >
                                  <CircularProgress size={20} color="primary" />
                                </Box>
                              ) : (
                                <IconButton
                                  size="small"
                                  color="primary"
                                  title="Download attachment"
                                  onClick={() =>
                                    handleFileDownload(
                                      msg.id,
                                      msg.original_name,
                                    )
                                  }
                                  sx={{
                                    bgcolor: "action.hover",
                                    "&:hover": { bgcolor: "action.selected" },
                                  }}
                                >
                                  <DownloadIcon fontSize="small" />
                                </IconButton>
                              )}
                            </Box>
                          </Box>
                          {msg.caption && (
                            <Box
                              mt={0.5}
                              pt={1}
                              borderTop="1px solid"
                              borderColor="divider"
                            >
                              <FormattedMessage content={msg.caption} />
                            </Box>
                          )}
                        </Box>
                      ) : (
                        <FormattedMessage content={msg.content} />
                      )}
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="flex"
                        alignItems="center"
                        justifyContent="flex-end"
                        gap={0.5}
                        mt={0.5}
                        sx={{ opacity: 0.8 }}
                      >
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {isMe &&
                          (msg.is_read ? (
                            <DoneAllIcon
                              sx={{ fontSize: 16, color: "#2196f3" }}
                            />
                          ) : (
                            <DoneIcon sx={{ fontSize: 16 }} />
                          ))}
                      </Typography>
                    </Paper>
                  </Box>
                );
              })}
              <div ref={messagesEndRef} />
            </Box>

            <ChatInput
              activeConversationId={activeConversationId}
              onSendMessage={handleSendMessage}
              onFileSelect={handleFileSelect}
              isUploading={isUploadingFile}
              onTyping={handleTypingStatus}
              onSync={() =>
                activeConversationId && fetchMessages(activeConversationId)
              }
            />
          </>
        ) : (
          <Box
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            flex={1}
            bgcolor="background.paper"
          >
            <NavbarLogo
              src="/logo.png"
              height={256}
              onClick={() => (globalThis.location.href = "/")}
            />

            <Typography variant="h5" color="text.primary">
              Welcome to Conversation
            </Typography>
            <Typography color="text.secondary" mt={1}>
              Select a user from the sidebar to start chatting
            </Typography>
          </Box>
        )}
      </Box>

      <Dialog open={Boolean(previewFile)} onClose={() => setPreviewFile(null)}>
        <DialogTitle>Send Attachment</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>File: {previewFile?.name}</Typography>
          <TextField
            fullWidth
            margin="normal"
            label="Add a caption... (optional)"
            value={fileCaption}
            onChange={(e) => setFileCaption(e.target.value)}
            autoFocus
            onKeyPress={(e) => e.key === "Enter" && handleSendFile()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewFile(null)}>Cancel</Button>
          <Button
            onClick={handleSendFile}
            color="primary"
            disabled={isUploadingFile}
          >
            {isUploadingFile ? <CircularProgress size={24} /> : "Send"}
          </Button>
        </DialogActions>
      </Dialog>

      <UserProfile
        open={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      <FeedbackDialog
        open={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
      />
    </Box>
  );
};

export default Chat;
