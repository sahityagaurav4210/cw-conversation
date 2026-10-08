import React from "react";
import { Box, Checkbox, Typography, useTheme, alpha } from "@mui/material";

/**
 * Reusable OptionCard component for option selection across forms.
 *
 * @param {boolean} checked - Whether the option card is selected
 * @param {string|React.ReactNode} label - Label to display
 * @param {function} onClick - Click handler callback
 * @param {boolean} [disabled=false] - Disabled state
 * @param {object} [sx={}] - Additional MUI styling overrides
 * @param {React.ReactNode} [children] - Optional nested content
 */
const OptionCard = ({
  checked,
  label,
  onClick,
  disabled = false,
  sx = {},
  children,
}) => {
  const theme = useTheme();

  return (
    <Box
      onClick={() => !disabled && onClick && onClick()}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        px: 2,
        py: 0.85,
        borderRadius: 2,
        border: "1.5px solid",
        borderColor: checked ? theme.palette.primary.main : "divider",
        bgcolor: checked
          ? alpha(theme.palette.primary.main, 0.08)
          : theme.palette.background.paper,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        userSelect: "none",
        boxShadow: checked
          ? `0 2px 8px ${alpha(theme.palette.primary.main, 0.2)}`
          : "none",
        "&:hover": {
          borderColor: disabled ? "divider" : theme.palette.primary.main,
          bgcolor: disabled
            ? theme.palette.background.paper
            : alpha(theme.palette.primary.main, 0.04),
        },
        ...sx,
      }}
    >
      <Checkbox
        size="small"
        checked={Boolean(checked)}
        disabled={disabled}
        sx={{ p: 0, mr: 1 }}
      />
      {typeof label === "string" ? (
        <Typography
          variant="body2"
          sx={{
            fontWeight: checked ? 700 : 500,
            color: checked ? theme.palette.primary.main : "text.primary",
          }}
        >
          {label}
        </Typography>
      ) : (
        label
      )}
      {children}
    </Box>
  );
};

export default React.memo(OptionCard);
