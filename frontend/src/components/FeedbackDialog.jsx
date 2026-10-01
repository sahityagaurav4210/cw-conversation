import React, { useState, useEffect, useContext, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Tabs,
  Tab,
  Chip,
  Typography,
  CircularProgress,
  useTheme
} from '@mui/material';
import { MaterialReactTable, useMaterialReactTable } from 'material-react-table';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useUI } from '../context/UIContext';

const FeedbackDialog = ({ open, onClose }) => {
  const { user } = useContext(AuthContext);
  const { showAlert } = useUI();
  const theme = useTheme();
  const [tabIndex, setTabIndex] = useState(0);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [sectionName, setSectionName] = useState('chats');
  const [suggestion, setSuggestion] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // User Feedbacks Table State
  const [myFeedbacks, setMyFeedbacks] = useState([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE_URI || 'http://localhost:5000';

  // RFC 5322 Email Validation Regex
  const rfcEmailRegex = /^(?:[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?|\[(?:(?:(2(5[0-5]|Wait|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|Wait|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-zA-Z0-9-]*[a-zA-Z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/;
  const nameRegex = /^[a-zA-Z ]{1,32}$/;
  const messageRegex = /^[a-zA-Z0-9 .(),_\-#$/&%@*+'\r\n]+$/;

  useEffect(() => {
    if (open) {
      if (user) {
        setName(user.name || '');
        setEmail(user.email || '');
      }
      fetchMyFeedbacks();
    }
  }, [open, user]);

  const fetchMyFeedbacks = async () => {
    setLoadingFeedbacks(true);
    try {
      const res = await axios.get(`${API_BASE}/api/feedback/my`);
      setMyFeedbacks(res.data);
    } catch (err) {
      console.error('Error fetching my feedbacks:', err);
    } finally {
      setLoadingFeedbacks(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validations
    if (!name || !nameRegex.test(name.trim())) {
      showAlert('Name must contain only letters and spaces (up to 32 characters).', 'error');
      return;
    }

    if (!email || !rfcEmailRegex.test(email.trim())) {
      showAlert('Please enter a valid RFC-compliant email address.', 'error');
      return;
    }

    if (!sectionName) {
      showAlert('Please select a section.', 'error');
      return;
    }

    if (!suggestion || suggestion.trim().length === 0 || suggestion.length > 2048) {
      showAlert('Suggestion is required and cannot exceed 2048 characters.', 'error');
      return;
    }

    if (!messageRegex.test(suggestion)) {
      showAlert('Suggestion contains invalid characters.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/api/feedback`, {
        name: name.trim(),
        email: email.trim(),
        section_name: sectionName,
        suggestion: suggestion.trim()
      });
      showAlert('Feedback submitted successfully!', 'success');
      setSuggestion('');
      fetchMyFeedbacks();
      setTabIndex(1); // Switch to "My Feedbacks" tab
    } catch (err) {
      console.error(err);
      showAlert(err.response?.data?.error || 'Failed to submit feedback.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusChip = (status) => {
    switch (status) {
      case 'accepted':
        return <Chip label="Accepted" color="success" size="small" />;
      case 'rejected':
        return <Chip label="Rejected" color="error" size="small" />;
      default:
        return <Chip label="Pending" color="warning" size="small" />;
    }
  };

  const columns = [
    { accessorKey: 'id', header: 'ID', size: 50 },
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'email', header: 'Email' },
    { 
      accessorKey: 'section_name', 
      header: 'Section',
      Cell: ({ cell }) => <Typography textTransform="capitalize">{cell.getValue()}</Typography>
    },
    { accessorKey: 'suggestion', header: 'Suggestion' },
    {
      accessorKey: 'status',
      header: 'Status',
      Cell: ({ cell }) => getStatusChip(cell.getValue())
    },
    {
      accessorKey: 'reason',
      header: 'Admin Reason',
      Cell: ({ cell }) => cell.getValue() || <Typography color="text.secondary" variant="body2">N/A</Typography>
    },
    {
      accessorKey: 'created_at',
      header: 'Submitted At',
      Cell: ({ cell }) => cell.getValue() ? new Date(cell.getValue()).toLocaleString() : '-'
    }
  ];

  const GlobalTableCss = useMemo(
    () => ({
      muiTablePaperProps: {
        elevation: 3,
        sx: {
          borderRadius: "8px",
          overflow: "hidden",
          border: `1px solid ${theme.palette.secondary?.A100 || theme.palette.divider}`,
        },
      },
      muiTableContainerProps: {
        sx: { minHeight: "150px" },
      },
      muiTableHeadCellProps: {
        sx: {
          fontWeight: "bold",
          color: theme.palette.primary.main,
          whiteSpace: "normal",
          wordBreak: "break-word",
          textAlign: "center",
          borderRight: `1px solid ${theme.palette.secondary?.A100 || theme.palette.divider}`,
          borderBottom: `1px solid ${theme.palette.secondary?.A100 || theme.palette.divider}`,
          borderTop: `1px solid ${theme.palette.secondary?.A100 || theme.palette.divider}`,
        },
      },
      muiTableBodyCellProps: { sx: { color: "gray", fontWeight: 700 } },
      muiPaginationProps: {
        rowsPerPageOptions: [10, 20, 30, 40, 50, 100],
      },
      enableStickyHeader: true,
    }),
    [theme],
  );

  const table = useMaterialReactTable({
    columns,
    data: myFeedbacks,
    state: { isLoading: loadingFeedbacks },
    enableColumnFilters: true,
    enablePagination: true,
    enableSorting: true,
    ...GlobalTableCss,
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        Feedback Form & History
      </DialogTitle>
      <DialogContent dividers>
        <Tabs
          value={tabIndex}
          onChange={(e, val) => setTabIndex(val)}
          indicatorColor="primary"
          textColor="primary"
          sx={{ mb: 2, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Tab label="Submit Feedback" />
          <Tab label="My Feedbacks" />
        </Tabs>

        {tabIndex === 0 && (
          <Box component="form" onSubmit={handleSubmit} display="flex" flexDirection="column" gap={2} pt={1}>
            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              inputProps={{ maxLength: 32 }}
              helperText="Only letters and spaces allowed (max 32 chars)"
              required
              fullWidth
            />
            <TextField
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              helperText="Must be a valid RFC email address"
              required
              fullWidth
            />
            <FormControl fullWidth required>
              <InputLabel id="section-select-label">Section Name</InputLabel>
              <Select
                labelId="section-select-label"
                value={sectionName}
                label="Section Name"
                onChange={(e) => setSectionName(e.target.value)}
              >
                <MenuItem value="accounts">Accounts</MenuItem>
                <MenuItem value="login">Login</MenuItem>
                <MenuItem value="chats">Chats</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Suggestion"
              multiline
              rows={4}
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              inputProps={{ maxLength: 2048 }}
              helperText={`${suggestion.length}/2048 characters`}
              required
              fullWidth
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={submitting}
              sx={{ alignSelf: 'flex-end', minWidth: 120 }}
            >
              {submitting ? <CircularProgress size={24} color="inherit" /> : 'Submit'}
            </Button>
          </Box>
        )}

        {tabIndex === 1 && (
          <Box pt={1}>
            <MaterialReactTable table={table} />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default FeedbackDialog;
