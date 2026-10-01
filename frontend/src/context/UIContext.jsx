import React, { createContext, useState, useContext } from 'react';
import { Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';

export const UIContext = createContext();

export const useUI = () => useContext(UIContext);

export const UIProvider = ({ children }) => {
    const [alertConfig, setAlertConfig] = useState({ open: false, message: '', severity: 'info' });
    const [confirmConfig, setConfirmConfig] = useState({ open: false, message: '', onConfirm: null, onCancel: null });

    const showAlert = (message, severity = 'info') => {
        setAlertConfig({ open: true, message, severity });
    };

    const hideAlert = () => {
        setAlertConfig(prev => ({ ...prev, open: false }));
    };

    const showConfirm = (message, onConfirm, onCancel = null) => {
        setConfirmConfig({ open: true, message, onConfirm, onCancel });
    };

    const handleConfirm = () => {
        if (confirmConfig.onConfirm) confirmConfig.onConfirm();
        setConfirmConfig(prev => ({ ...prev, open: false }));
    };

    const handleCancel = () => {
        if (confirmConfig.onCancel) confirmConfig.onCancel();
        setConfirmConfig(prev => ({ ...prev, open: false }));
    };

    return (
        <UIContext.Provider value={{ showAlert, showConfirm }}>
            {children}
            
            {/* Global Snackbar */}
            <Snackbar open={alertConfig.open} autoHideDuration={6000} onClose={hideAlert} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
                <Alert onClose={hideAlert} severity={alertConfig.severity} sx={{ width: '100%' }}>
                    {alertConfig.message}
                </Alert>
            </Snackbar>

            {/* Global Confirm Dialog */}
            <Dialog open={confirmConfig.open} onClose={handleCancel}>
                <DialogTitle>Confirmation</DialogTitle>
                <DialogContent>
                    <DialogContentText>{confirmConfig.message}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancel} color="secondary">No</Button>
                    <Button onClick={handleConfirm} color="primary" autoFocus>Yes</Button>
                </DialogActions>
            </Dialog>
        </UIContext.Provider>
    );
};
