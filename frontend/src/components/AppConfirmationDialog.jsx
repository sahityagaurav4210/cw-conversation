import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

const AppConfirmationDialog = ({
  open,
  title = "Confirmation",
  message,
  onConfirm,
  onCancel,
}) => {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <HelpOutlineIcon color="primary" sx={{ fontSize: 28 }} />
        <Box component="span" fontWeight="bold">
          {title}
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <DialogContentText color="text.primary">
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ p: 2, justifyContent: 'flex-end', gap: 1 }}>
        <Button
          onClick={onCancel}
          color="error"
          variant="contained"
          startIcon={<CloseIcon />}
        >
          No
        </Button>
        <Button
          onClick={onConfirm}
          color="success"
          variant="contained"
          startIcon={<CheckIcon />}
          autoFocus
        >
          Yes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AppConfirmationDialog;
