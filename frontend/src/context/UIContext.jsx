import React, { createContext, useState, useContext } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { TOAST_GLOBAL_CONFIG, notify } from '../config/toastConfig';
import AppConfirmationDialog from '../components/AppConfirmationDialog';

export const UIContext = createContext();

export const useUI = () => useContext(UIContext);

export const UIProvider = ({ children }) => {
    const [confirmConfig, setConfirmConfig] = useState({ open: false, message: '', onConfirm: null, onCancel: null });

    const showAlert = (message, severity = 'info') => {
        notify(message, severity);
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
        <UIContext.Provider value={{ showAlert, showConfirm, notify }}>
            {children}
            
            {/* Global react-toastify Toast Container */}
            <ToastContainer {...TOAST_GLOBAL_CONFIG} />

            {/* Global Custom Confirmation Dialog */}
            <AppConfirmationDialog
                open={confirmConfig.open}
                message={confirmConfig.message}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
            />
        </UIContext.Provider>
    );
};
