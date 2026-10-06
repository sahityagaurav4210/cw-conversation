import React from "react";
import { Box, IconButton, Tooltip } from "@mui/material";

const NavbarLogo = ({
  src,
  alt = "App Logo",
  height = 40, // 40px is the sweet spot for MUI Navbars
  onClick,
  hidePadding = false,
  hideTooltip = false,
}) => {
  if (hideTooltip)
    return (
      <IconButton
        onClick={onClick}
        disableRipple
        sx={{
          padding: hidePadding ? "0px" : "8px",
          "&:hover": {
            backgroundColor: "transparent", // Prevents gray hover background
            opacity: 0.8, // Subtle hover effect instead
          },
        }}
      >
        <Box
          component="img"
          src={src}
          alt={alt}
          sx={{
            height: height,
            width: height, // Fixed to equal height because source is 512x512 (Square)
            objectFit: "contain", // Ensures the image never stretches
            imageRendering: "-webkit-optimize-contrast",
            borderRadius: "10px", // Optional: Slightly rounded corners for aesthetics
          }}
        />
      </IconButton>
    );

  return (
    <Tooltip title="Home">
      <IconButton
        onClick={onClick}
        disableRipple
        sx={{
          padding: hidePadding ? "0px" : "8px",
          "&:hover": {
            backgroundColor: "transparent", // Prevents gray hover background
            opacity: 0.8, // Subtle hover effect instead
          },
        }}
      >
        <Box
          component="img"
          src={src}
          alt={alt}
          sx={{
            height: height,
            width: height, // Fixed to equal height because source is 512x512 (Square)
            objectFit: "contain", // Ensures the image never stretches
            imageRendering: "-webkit-optimize-contrast",
            borderRadius: "10px", // Optional: Slightly rounded corners for aesthetics
          }}
        />
      </IconButton>
    </Tooltip>
  );
};

export default React.memo(NavbarLogo);
