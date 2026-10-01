import { createTheme } from "@mui/material";

const AppTheme = (fontSize) =>
  createTheme({
    typography: {
      fontFamily: "Inter, sans-serif",
      fontSize: fontSize,
    },
    palette: {
      primary: { main: "#000080", A700: "#2563eb", hover: "#000066" },
      secondary: {
        main: "#737373",
        A100: "#cbd5e1",
        A200: "#e2e8f0",
        A50: "#f1f5f9",
        A700: "#e0e0e0",
      },
      success: { main: "#228B22", hover: "#1e7b1e", A400: "#34d399" },
      error: { main: "#b91c1c", hover: "#dc2626" },
      info: { main: "#2196f3", 700: "#67e8f9", 100: "#cffafe" },
      warning: { main: "#ff9933", hover: "#e68a00", A100: "#f7e8ec" },
      chip: { main: "#e3f2fd" },
      viewDetail: {
        main: "#3b82f6",
        hover: "#1d4ed8",
        hoverBackground: "#eff6ff",
      },
      edit: {
        main: "#eab308",
        hover: "#a16207",
        hoverBackground: "#fffbeb",
      },
      addRevoke: {
        main: "#ef4444",
        hover: "#dc2626",
        hoverBackground: "#fef2f2",
      },
      markAttendance: {
        main: "#9C27B0",
        hover: "#7B1FA2",
        hoverBackground: "#F3E5F5",
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: "8px",
            fontFamily: "Inter, sans-serif",
            fontWeight: "bold",
            padding: "0.50rem 1.5rem",
            transition: "all 0.35s ease-in-out",
            "&:active": {
              transform: "scale(1.02)",
              cursor: "pointer",
            },
            "&:hover": {
              cursor: "pointer",
            },
          },
        },
      },
      MuiPaper: { styleOverrides: { root: { borderRadius: 12 } } },
      MuiChip: { styleOverrides: { root: { borderRadius: 16 } } },
      MuiTextField: {
        defaultProps: {
          variant: "outlined",
          size: "small",
        },
      },
      MuiSelect: {
        defaultProps: {
          variant: "outlined",
          size: "small",
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            backgroundColor: "#e0e0e0",
            fontWeight: "bold",
            color: "#333",
            whiteSpace: "nowrap",
          },
          body: {
            padding: "8px 16px",
            whiteSpace: "nowrap",
          },
        },
      },
      muiTableHeadCellProps: {
        sx: {
          fontWeight: "bold",
          color: "#000080",
        },
      },
      MuiCssBaseline: {
        styleOverrides: {
          "*": {
            "::-webkit-scrollbar": {
              width: "8px",
              height: "8px",
            },
            "::-webkit-scrollbar-thumb": {
              backgroundColor: "#cbd5e1",
              borderRadius: "8px",
            },
          },
        },
      },
    },
  });

export default AppTheme;
