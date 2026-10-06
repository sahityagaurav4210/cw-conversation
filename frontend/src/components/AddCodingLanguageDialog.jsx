import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
} from "@mui/material";
import CodeIcon from "@mui/icons-material/Code";
import axios from "axios";
import { useUI } from "../context/UIContext";

const AddCodingLanguageDialog = ({ open, onClose, onSuccess }) => {
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const { showAlert } = useUI();

  const API_BASE =
    import.meta.env.VITE_API_BASE_URI || "http://localhost:5000";

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!name.trim()) {
      showAlert("Language Name is required.", "error");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE}/api/auth/admin/coding-languages`, {
        name: name.trim(),
        value: value.trim(),
      });
      showAlert("Coding language added successfully!", "success");
      setName("");
      setValue("");
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      const errorMsg =
        err.response?.data?.error || "Failed to add coding language.";
      showAlert(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName("");
    setValue("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <CodeIcon color="primary" />
        Add Supported Coding Language
      </DialogTitle>
      <DialogContent>
        <Box
          component="form"
          onSubmit={handleSubmit}
          display="flex"
          flexDirection="column"
          gap={2}
          pt={1}
        >
          <Typography variant="body2" color="text.secondary">
            Enter the display name and language identifier (value) for the code syntax highlighter.
          </Typography>

          <TextField
            label="Language Name (Display)"
            placeholder="e.g. JavaScript or Spring Boot (Java)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
            autoFocus
          />

          <TextField
            label="Language Value / Identifier"
            placeholder="e.g. javascript or springboot (optional - auto-generated if blank)"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            fullWidth
            helperText="Internal syntax identifier (used for markdown code blocks ```language)"
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={loading || !name.trim()}
        >
          {loading ? "Adding..." : "Add Language"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddCodingLanguageDialog;
