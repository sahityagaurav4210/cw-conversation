import React from "react";
import {
  Box,
  TextField,
  IconButton,
  InputAdornment,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";

const SearchBar = ({ searchQuery, setSearchQuery, onSearch }) => {
  const handleReset = () => {
    setSearchQuery("");
    onSearch("");
  };

  return (
    <Box
      bgcolor="background.default"
      sx={{
        m: 1,
      }}
    >
      <TextField
        fullWidth
        size="small"
        placeholder="Search users..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyPress={(e) => e.key === "Enter" && onSearch(searchQuery)}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end" sx={{ gap: 0.25 }}>
              {searchQuery && (
                <Tooltip title="Reset search">
                  <IconButton
                    onClick={handleReset}
                    size="small"
                    edge="end"
                    color="secondary"
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Search">
                <IconButton
                  onClick={() => onSearch(searchQuery)}
                  edge="end"
                  size="small"
                  color="primary"
                >
                  <SearchIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ),
        }}
        sx={{
          backgroundColor: "background.paper",
          borderRadius: "6px",
          "& .MuiOutlinedInput-root": {
            "& fieldset": {
              border: "1px solid",
              borderColor: "divider",
            },
            "&:hover fieldset": {
              borderColor: "primary.main",
            },
          },
        }}
      />
    </Box>
  );
};

export default SearchBar;
