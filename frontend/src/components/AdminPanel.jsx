import React, { useState, useEffect, useContext, useMemo } from "react";
import { AuthContext } from "../context/AuthContext";
import { useUI } from "../context/UIContext";
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
  useTheme,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import BlockIcon from "@mui/icons-material/Block";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import EditIcon from "@mui/icons-material/Edit";
import TimerIcon from "@mui/icons-material/Timer";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import axios from "axios";
import FeedbackManagement from "./FeedbackManagement";
import SessionTimerTypography from "./SessionTimerTypography";

const AdminPanel = () => {
  const { logout } = useContext(AuthContext);
  const { showAlert, showConfirm } = useUI();
  const [tabIndex, setTabIndex] = useState(0);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Edit Modal State
  const [editUser, setEditUser] = useState(null);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");

  // Suspend Modal State
  const [suspendUser, setSuspendUser] = useState(null);
  const [suspendDurationMinutes, setSuspendDurationMinutes] = useState(60); // Default 60 mins

  const API_BASE = import.meta.env.VITE_API_BASE_URI || "http://localhost:5000";

  const fetchAdminUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/auth/admin/users`);
      setUsers(res.data);
    } catch (err) {
      console.error(err);
      showAlert(err.response?.data?.error || "Failed to fetch users.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminUsers();
  }, []);

  // Handler: Deactivate User
  const handleDeactivate = (user) => {
    showConfirm(
      `Are you sure you want to PERMANENTLY deactivate account '${user.username}'? The user will not be able to log in or recover their account forever.`,
      async () => {
        try {
          const res = await axios.put(
            `${API_BASE}/api/auth/admin/users/${user.id}/deactivate`,
          );
          showAlert(res.data.message, "success");
          fetchAdminUsers();
        } catch (err) {
          showAlert(
            err.response?.data?.error || "Failed to deactivate user.",
            "error",
          );
        }
      },
    );
  };

  // Handler: Unlock / Un-suspend User
  const handleUnlock = (user) => {
    showConfirm(
      `Are you sure you want to unlock/unsuspend account '${user.username}'?`,
      async () => {
        try {
          const res = await axios.put(
            `${API_BASE}/api/auth/admin/users/${user.id}/unlock`,
          );
          showAlert(res.data.message, "success");
          fetchAdminUsers();
        } catch (err) {
          showAlert(
            err.response?.data?.error || "Failed to unlock user.",
            "error",
          );
        }
      },
    );
  };

  // Handler: Submit Edit Profile
  const handleSaveEdit = () => {
    if (!editUser) return;
    showConfirm(
      `Are you sure you want to save profile changes for '${editUser.username}'?`,
      async () => {
        try {
          const payload = {};
          if (editName !== editUser.name) payload.name = editName;
          if (editUsername !== editUser.username)
            payload.username = editUsername;
          if (editPassword) payload.password = editPassword;

          const res = await axios.put(
            `${API_BASE}/api/auth/admin/users/${editUser.id}/edit`,
            payload,
          );
          showAlert(res.data.message, "success");
          setEditUser(null);
          fetchAdminUsers();
        } catch (err) {
          showAlert(
            err.response?.data?.error || "Failed to update profile.",
            "error",
          );
        }
      },
    );
  };

  // Handler: Submit Suspend
  const handleSaveSuspend = () => {
    if (!suspendUser) return;
    showConfirm(
      `Are you sure you want to suspend account '${suspendUser.username}' for ${suspendDurationMinutes} minutes?`,
      async () => {
        try {
          const res = await axios.put(
            `${API_BASE}/api/auth/admin/users/${suspendUser.id}/suspend`,
            { durationMinutes: suspendDurationMinutes },
          );
          showAlert(res.data.message, "success");
          setSuspendUser(null);
          fetchAdminUsers();
        } catch (err) {
          showAlert(
            err.response?.data?.error || "Failed to suspend user.",
            "error",
          );
        }
      },
    );
  };

  const getUserStatusChip = (user) => {
    const now = new Date();
    if (user.is_deactivated) {
      return (
        <Chip label="Deactivated" color="error" size="small" variant="filled" />
      );
    }
    if (user.suspended_until && new Date(user.suspended_until) > now) {
      return (
        <Chip
          label={`Suspended until ${new Date(user.suspended_until).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
          color="warning"
          size="small"
        />
      );
    }
    if (
      user.account_locked_until &&
      new Date(user.account_locked_until) > now
    ) {
      return <Chip label="Password Locked" color="secondary" size="small" />;
    }
    return (
      <Chip label="Active" color="success" size="small" variant="outlined" />
    );
  };

  // Columns for User Management Table
  const userManagementColumns = [
    { accessorKey: "id", header: "ID", size: 60 },
    { accessorKey: "username", header: "Username" },
    {
      accessorKey: "name",
      header: "Name",
      Cell: ({ cell }) => cell.getValue() || "-",
    },
    {
      accessorKey: "status",
      header: "Status",
      Cell: ({ row }) => getUserStatusChip(row.original),
    },
    {
      accessorKey: "created_at",
      header: "Registered At",
      Cell: ({ cell }) =>
        cell.getValue() ? new Date(cell.getValue()).toLocaleString() : "-",
    },
    {
      id: "actions",
      header: "Actions",
      Cell: ({ row }) => {
        const u = row.original;
        const now = new Date();
        const isSuspendedOrLocked =
          (u.suspended_until && new Date(u.suspended_until) > now) ||
          (u.account_locked_until && new Date(u.account_locked_until) > now);

        return (
          <Box display="flex" gap={1}>
            <Tooltip title="Edit Profile">
              <IconButton
                size="small"
                color="primary"
                onClick={() => {
                  setEditUser(u);
                  setEditName(u.name || "");
                  setEditUsername(u.username);
                  setEditPassword("");
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Suspend Account">
              <IconButton
                size="small"
                color="warning"
                disabled={u.is_deactivated}
                onClick={() => {
                  setSuspendUser(u);
                  setSuspendDurationMinutes(60);
                }}
              >
                <TimerIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Unlock / Un-suspend">
              <span>
                <IconButton
                  size="small"
                  color="success"
                  disabled={!isSuspendedOrLocked || u.is_deactivated}
                  onClick={() => handleUnlock(u)}
                >
                  <LockOpenIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Deactivate Permanently">
              <span>
                <IconButton
                  size="small"
                  color="error"
                  disabled={u.is_deactivated}
                  onClick={() => handleDeactivate(u)}
                >
                  <BlockIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        );
      },
    },
  ];

  // Columns for Forgot Password Requests Table
  const forgotPasswordColumns = [
    { accessorKey: "id", header: "ID", size: 60 },
    { accessorKey: "username", header: "Username" },
    {
      accessorKey: "name",
      header: "Name",
      Cell: ({ cell }) => cell.getValue() || "-",
    },
    {
      accessorKey: "reset_code",
      header: "Reset Code",
      Cell: ({ cell }) =>
        cell.getValue() ? (
          <Chip
            label={cell.getValue()}
            color="primary"
            sx={{ fontWeight: "bold" }}
          />
        ) : (
          <Typography color="text.secondary">-</Typography>
        ),
    },
    {
      accessorKey: "reset_code_expires",
      header: "Code Expires At",
      Cell: ({ cell }) =>
        cell.getValue() ? new Date(cell.getValue()).toLocaleString() : "-",
    },
    {
      accessorKey: "created_at",
      header: "Registered At",
      Cell: ({ cell }) =>
        cell.getValue() ? new Date(cell.getValue()).toLocaleString() : "-",
    },
  ];

  const theme = useTheme();

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

  const userTable = useMaterialReactTable({
    columns: userManagementColumns,
    data: users,
    state: { isLoading: loading },
    enableColumnFilters: true,
    enablePagination: true,
    enableSorting: true,
    ...GlobalTableCss,
  });

  const forgotPasswordTable = useMaterialReactTable({
    columns: forgotPasswordColumns,
    data: users,
    state: { isLoading: loading },
    enableColumnFilters: true,
    enablePagination: true,
    enableSorting: true,
    ...GlobalTableCss,
  });

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box
        display="flex"
        flexDirection="column"
        sx={{ minHeight: "100%", bgcolor: "background.default", p: 3, pb: 5, mb: 4 }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 2,
            mb: 3,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h5" color="primary" fontWeight="bold">
            Simple Chat Admin Panel
          </Typography>
          <Box display="flex" alignItems="center" gap={1.5}>
            <SessionTimerTypography sx={{ mr: 1 }} />
            <Button
              startIcon={<RefreshIcon />}
              variant="outlined"
              onClick={fetchAdminUsers}
            >
              Refresh
            </Button>
            <Button
              startIcon={<LogoutIcon />}
              variant="contained"
              color="error"
              onClick={() =>
                showConfirm(
                  "Are you sure you want to logout from Admin panel?",
                  logout,
                )
              }
            >
              Logout
            </Button>
          </Box>
        </Paper>

        <Paper elevation={3} sx={{ p: 2, mb: 4 }}>
          <Tabs
            value={tabIndex}
            onChange={(e, val) => setTabIndex(val)}
            indicatorColor="primary"
            textColor="primary"
            sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
          >
            <Tab label="User Management" />
            <Tab label="Forgot Password Requests" />
            <Tab label="Feedback Management" />
          </Tabs>

          <Box sx={{ width: "100%", mb: 1 }}>
            {tabIndex === 0 && <MaterialReactTable table={userTable} />}

            {tabIndex === 1 && (
              <MaterialReactTable table={forgotPasswordTable} />
            )}

            {tabIndex === 2 && <FeedbackManagement />}
          </Box>
        </Paper>

        {/* Edit Profile Modal */}
        <Dialog open={Boolean(editUser)} onClose={() => setEditUser(null)}>
          <DialogTitle>Edit Profile for @{editUser?.username}</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              margin="normal"
              label="Name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Username"
              value={editUsername}
              onChange={(e) => setEditUsername(e.target.value)}
            />
            <TextField
              fullWidth
              margin="normal"
              label="New Password (leave blank to keep unchanged)"
              type="password"
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditUser(null)}>Cancel</Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSaveEdit}
            >
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>

        {/* Suspend User Modal */}
        <Dialog
          open={Boolean(suspendUser)}
          onClose={() => setSuspendUser(null)}
        >
          <DialogTitle>Suspend Account @{suspendUser?.username}</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Specify the duration in minutes for which the account should be
              suspended.
            </Typography>
            <TextField
              fullWidth
              margin="normal"
              label="Suspension Duration (Minutes)"
              type="number"
              value={suspendDurationMinutes}
              onChange={(e) =>
                setSuspendDurationMinutes(
                  Math.max(1, parseInt(e.target.value) || 1),
                )
              }
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSuspendUser(null)}>Cancel</Button>
            <Button
              variant="contained"
              color="warning"
              onClick={handleSaveSuspend}
            >
              Suspend Account
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default AdminPanel;
