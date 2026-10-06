import React, { useState } from "react";
import { Box, Button, Typography, Avatar, IconButton } from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import DeleteIcon from "@mui/icons-material/Delete";
import { useUI } from "../context/UIContext";

const FileUploader = ({
  onFileSelected,
  onFileSelect,
  currentImageUrl,
  initialPreview,
  onClear,
  maxSizeMB = 2,
}) => {
  const { showAlert } = useUI();
  const [preview, setPreview] = useState(null);

  const validateMagicBytes = (arrayBuffer) => {
    const uint8 = new Uint8Array(arrayBuffer);
    if (uint8.length < 4) return false;

    // JPEG: FF D8 FF
    const isJpeg = uint8[0] === 0xff && uint8[1] === 0xd8 && uint8[2] === 0xff;
    // PNG: 89 50 4E 47
    const isPng =
      uint8[0] === 0x89 &&
      uint8[1] === 0x50 &&
      uint8[2] === 0x4e &&
      uint8[3] === 0x47;

    return isJpeg || isPng;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 1. Extension check
    const validExtensions = ["jpg", "jpeg", "png"];
    const ext = file.name.split(".").pop().toLowerCase();
    if (!validExtensions.includes(ext)) {
      showAlert("Invalid extension. Only *.jpg, *.jpeg, and *.png files are allowed.", "error");
      e.target.value = "";
      return;
    }

    // 2. Size check (2MB)
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      showAlert(`File size exceeds limit of ${maxSizeMB} MB.`, "error");
      e.target.value = "";
      return;
    }

    // 3. Magic Bytes check
    const reader = new FileReader();
    reader.onloadend = (event) => {
      const buffer = event.target.result;
      if (!validateMagicBytes(buffer)) {
        showAlert(
          "Security Validation Failed: File header magic bytes do not match JPEG or PNG format. Fake extension modification detected.",
          "error",
        );
        e.target.value = "";
        return;
      }

      // Validated successfully
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      if (onFileSelected) onFileSelected(file, objectUrl);
      if (onFileSelect) onFileSelect(file, objectUrl);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleRemove = () => {
    setPreview(null);
    if (onClear) onClear();
  };

  const displayImage = preview || currentImageUrl || initialPreview;

  return (
    <Box display="flex" flexDirection="column" alignItems="center" gap={1} my={1}>
      <Box position="relative">
        <Avatar
          src={displayImage || undefined}
          sx={{
            width: 90,
            height: 90,
            bgcolor: "primary.main",
            fontSize: 32,
            border: "2px solid gainsboro",
          }}
        >
          {!displayImage && <PhotoCameraIcon fontSize="large" />}
        </Avatar>
        {displayImage && (
          <IconButton
            size="small"
            color="error"
            onClick={handleRemove}
            sx={{
              position: "absolute",
              top: -4,
              right: -4,
              bgcolor: "background.paper",
              boxShadow: 2,
              "&:hover": { bgcolor: "error.light", color: "#fff" },
            }}
            title="Remove Profile Photo"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      <Button
        variant="outlined"
        component="label"
        size="small"
        startIcon={<PhotoCameraIcon />}
        sx={{ textTransform: "none" }}
      >
        Upload Photo
        <input
          type="file"
          hidden
          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
          onChange={handleFileChange}
        />
      </Button>
      <Typography variant="caption" color="text.secondary">
        Max file size: 2MB (*.jpg, *.jpeg, *.png)
      </Typography>
    </Box>
  );
};

export default FileUploader;
