import React, { useState, useEffect, useMemo } from "react";
import { Box, Button, Chip, Switch, Typography, useTheme } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import axios from "axios";
import { useUI } from "../context/UIContext";
import AddCodingLanguageDialog from "./AddCodingLanguageDialog";

const CodingLanguageMaster = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { showAlert } = useUI();
  const theme = useTheme();

  const API_BASE =
    import.meta.env.VITE_API_BASE_URI || "http://localhost:5000";

  const fetchCodingLanguages = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${API_BASE}/api/auth/admin/coding-languages`,
      );
      setData(res.data);
    } catch (err) {
      console.error(err);
      showAlert("Failed to fetch coding languages.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCodingLanguages();
  }, []);

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await axios.put(
        `${API_BASE}/api/auth/admin/coding-languages/${id}/status`,
      );
      showAlert(
        `Coding language status ${currentStatus ? "deactivated" : "activated"} successfully.`,
        "success",
      );
      fetchCodingLanguages();
    } catch (err) {
      console.error(err);
      showAlert("Failed to update status.", "error");
    }
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        size: 70,
      },
      {
        accessorKey: "name",
        header: "Language Name",
        Cell: ({ cell }) => (
          <Typography fontWeight="bold" color="primary">
            {cell.getValue()}
          </Typography>
        ),
      },
      {
        accessorKey: "value",
        header: "Value / Identifier",
        Cell: ({ cell }) => (
          <Chip
            label={cell.getValue()}
            size="small"
            variant="outlined"
            color="secondary"
          />
        ),
      },
      {
        accessorKey: "is_active",
        header: "Status",
        Cell: ({ cell }) => {
          const isActive = cell.getValue();
          return (
            <Chip
              label={isActive ? "Active" : "Inactive"}
              color={isActive ? "success" : "default"}
              size="small"
            />
          );
        },
      },
      {
        accessorKey: "created_at",
        header: "Created Date",
        Cell: ({ cell }) =>
          cell.getValue()
            ? new Date(cell.getValue()).toLocaleDateString()
            : "-",
      },
      {
        id: "actions",
        header: "Toggle Status",
        Cell: ({ row }) => (
          <Switch
            checked={row.original.is_active}
            onChange={() =>
              handleToggleStatus(row.original.id, row.original.is_active)
            }
            color="primary"
          />
        ),
      },
    ],
    [],
  );

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
    data,
    state: { isLoading: loading },
    ...GlobalTableCss,
  });

  return (
    <Box p={2}>
      {/* Separate Header Entity Above Table */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={2}
        flexWrap="wrap"
        gap={1}
      >
        <Typography variant="h5" color="primary" fontWeight="bold">
          Supported Coding Languages Master
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={fetchCodingLanguages}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setIsAddDialogOpen(true)}
            sx={{ textTransform: "none" }}
          >
            Add Coding Language
          </Button>
        </Box>
      </Box>

      {/* Material React Table */}
      <MaterialReactTable table={table} />

      <AddCodingLanguageDialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSuccess={fetchCodingLanguages}
      />
    </Box>
  );
};

export default CodingLanguageMaster;
