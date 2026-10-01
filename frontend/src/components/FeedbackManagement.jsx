import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
  useTheme
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RefreshIcon from '@mui/icons-material/Refresh';
import { MaterialReactTable, useMaterialReactTable } from 'material-react-table';
import axios from 'axios';
import { useUI } from '../context/UIContext';

const FeedbackManagement = () => {
  const { showAlert } = useUI();
  const theme = useTheme();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(false);

  // Admin Action Modal State
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [actionStatus, setActionStatus] = useState(null); // 'accepted' | 'rejected'
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE_URI || 'http://localhost:5000';
  const messageRegex = /^[a-zA-Z0-9 .(),_\-#$/&%@*+'\r\n]+$/;

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/feedback/admin`);
      setFeedbacks(res.data);
    } catch (err) {
      console.error(err);
      showAlert(err.response?.data?.error || 'Failed to fetch feedbacks.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const handleOpenActionDialog = (feedback, status) => {
    setSelectedFeedback(feedback);
    setActionStatus(status);
    setReason(feedback.reason || '');
  };

  const handleCloseDialog = () => {
    setSelectedFeedback(null);
    setActionStatus(null);
    setReason('');
  };

  const handleSaveAction = async () => {
    if (!reason || reason.trim().length === 0) {
      showAlert('Reason is mandatory.', 'error');
      return;
    }

    if (reason.length > 512) {
      showAlert('Reason cannot exceed 512 characters.', 'error');
      return;
    }

    if (!messageRegex.test(reason)) {
      showAlert('Reason contains invalid characters.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.put(
        `${API_BASE}/api/feedback/admin/${selectedFeedback.id}/action`,
        { status: actionStatus, reason: reason.trim() }
      );
      showAlert(res.data.message, 'success');
      handleCloseDialog();
      fetchFeedbacks();
    } catch (err) {
      console.error(err);
      showAlert(err.response?.data?.error || 'Failed to update feedback.', 'error');
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
      accessorKey: 'User.username',
      header: 'Submitted By (User)',
      Cell: ({ row }) => row.original.User?.username || '-'
    },
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
    },
    {
      id: 'actions',
      header: 'Actions',
      Cell: ({ row }) => {
        const item = row.original;
        if (item.status !== 'pending') {
          return (
            <Typography variant="body2" color="text.secondary">
              -
            </Typography>
          );
        }
        return (
          <Box display="flex" gap={1}>
            <Tooltip title="Accept Feedback">
              <IconButton
                size="small"
                color="success"
                onClick={() => handleOpenActionDialog(item, 'accepted')}
              >
                <CheckCircleIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Reject Feedback">
              <IconButton
                size="small"
                color="error"
                onClick={() => handleOpenActionDialog(item, 'rejected')}
              >
                <CancelIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        );
      }
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
    data: feedbacks,
    state: { isLoading: loading },
    enableColumnFilters: true,
    enablePagination: true,
    enableSorting: true,
    ...GlobalTableCss,
  });

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6" fontWeight="bold">
          Feedback Management
        </Typography>
        <Button startIcon={<RefreshIcon />} variant="outlined" onClick={fetchFeedbacks}>
          Refresh Feedbacks
        </Button>
      </Box>

      <MaterialReactTable table={table} />

      {/* Action Dialog */}
      <Dialog open={Boolean(selectedFeedback)} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {actionStatus === 'accepted' ? 'Accept Feedback' : 'Reject Feedback'}
        </DialogTitle>
        <DialogContent dividers>
          <Typography gutterBottom variant="body2">
            Feedback ID: #{selectedFeedback?.id} by {selectedFeedback?.name} ({selectedFeedback?.email})
          </Typography>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Suggestion: {selectedFeedback?.suggestion}
          </Typography>
          <TextField
            margin="normal"
            label="Reason (Mandatory)"
            multiline
            rows={3}
            fullWidth
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            inputProps={{ maxLength: 512 }}
            helperText={`${reason.length}/512 characters. Must describe why it was ${actionStatus}.`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">Cancel</Button>
          <Button
            onClick={handleSaveAction}
            color={actionStatus === 'accepted' ? 'success' : 'error'}
            variant="contained"
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={24} color="inherit" /> : `Confirm ${actionStatus === 'accepted' ? 'Acceptance' : 'Rejection'}`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FeedbackManagement;
