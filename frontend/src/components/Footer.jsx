import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import NavbarLogo from "./NavbarLogo";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        py: 1,
        textAlign: "center",
        bgcolor: "background.paper",
        borderTop: "1px solid",
        borderColor: "divider",
        zIndex: 10,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 1,
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 700 }}
      >
        &copy; {currentYear} Gaurav Sahitya || All rights reserved ||
      </Typography>

      <Stack direction="row" spacing={0.5} alignItems="center">
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 700 }}
        >
          Made with ❤️ in
        </Typography>

        <NavbarLogo src="/ind.svg" height={16} hidePadding hideTooltip />
      </Stack>
    </Box>
  );
};

export default React.memo(Footer);
