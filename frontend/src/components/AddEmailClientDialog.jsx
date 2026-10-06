import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
} from "@mui/material";
import axios from "axios";
import { useUI } from "../context/UIContext";

const AddEmailClientDialog = ({ open, onClose, onSuccess }) => {
  const [domain, setDomain] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { showAlert } = useUI();

  const API_BASE =
    import.meta.env.VITE_API_BASE_URI || "http://localhost:5000";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!domain.trim()) {
      showAlert("Please enter an email client domain.", "error");
      return;
    }

    let cleanDomain = domain.trim().toLowerCase();
    if (cleanDomain.startsWith("@")) {
      cleanDomain = cleanDomain.substring(1);
    }

    const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(cleanDomain)) {
      showAlert(
        "Invalid email client domain format. Example: gmail.com or company.com",
        "error",
      );
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/api/auth/admin/email-clients`, {
        domain: cleanDomain,
      });
      showAlert(`Email client domain @${cleanDomain} added successfully!`, "success");
      setDomain("");
      onSuccess();
      onClose();
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || "Failed to add email client domain.";
      showAlert(errorMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add Email Client Domain</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <TextField
            fullWidth
            autoFocus
            margin="dense"
            label="Domain Name (e.g. company.com)"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            required
            placeholder="gmail.com"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={submitting}
            startIcon={
              submitting ? <CircularProgress size={16} color="secondary" /> : null
            }
          >
            {submitting ? "Submitting..." : "Submit"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AddEmailClientDialog;
