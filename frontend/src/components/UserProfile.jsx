import React, { useState, useContext, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, Box, Avatar } from '@mui/material';
import { AuthContext } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import EditIcon from '@mui/icons-material/Edit';

const UserProfile = ({ open, onClose }) => {
    const { user, updateProfile } = useContext(AuthContext);
    const { showAlert } = useUI();
    const [isEditing, setIsEditing] = useState(false);
    const [profileName, setProfileName] = useState('');
    const [profilePassword, setProfilePassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Reset state when dialog opens
    useEffect(() => {
        if (open) {
            setIsEditing(false);
            setProfileName(user?.name || '');
            setProfilePassword('');
        }
    }, [open, user]);

    const handleProfileUpdate = async () => {
        if (profileName) {
            if (profileName.length > 32) {
                showAlert('Name cannot exceed 32 characters.', 'error');
                return;
            }
            if (!/^[a-zA-Z0-9 ]+$/.test(profileName)) {
                showAlert('Name can only contain letters, numbers, and spaces.', 'error');
                return;
            }
        }
        if (profilePassword) {
            if (profilePassword.length < 5 || profilePassword.length > 20) {
                showAlert('Password must be between 5 and 20 characters.', 'error');
                return;
            }
        }

        setIsSaving(true);
        try {
            await updateProfile(profileName, profilePassword);
            showAlert('Profile updated successfully!', 'success');
            setIsEditing(false);
            setProfilePassword('');
        } catch (err) {
            showAlert('Failed to update profile.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        setIsEditing(false);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {isEditing ? 'Edit Profile' : 'User Profile'}
            </DialogTitle>
            <DialogContent>
                <Box display="flex" flexDirection="column" alignItems="center" my={2}>
                    <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: 36, mb: 2 }}>
                        {(user?.name || user?.username || 'U').charAt(0).toUpperCase()}
                    </Avatar>

                    {!isEditing ? (
                        <>
                            <Typography variant="h5" gutterBottom>{user?.name || 'No Name Provided'}</Typography>
                            <Typography variant="body1" color="text.secondary" gutterBottom>@{user?.username}</Typography>
                        </>
                    ) : (
                        <Box width="100%">
                            <TextField 
                                fullWidth 
                                margin="normal" 
                                label="Name" 
                                value={profileName} 
                                onChange={(e) => setProfileName(e.target.value)} 
                                autoFocus
                            />
                            <TextField 
                                fullWidth 
                                margin="normal" 
                                label="New Password (optional)" 
                                type="password" 
                                value={profilePassword} 
                                onChange={(e) => setProfilePassword(e.target.value)} 
                                helperText="Leave blank if you don't want to change your password."
                            />
                        </Box>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                {!isEditing ? (
                    <>
                        <Button onClick={handleClose} color="secondary">Close</Button>
                        <Button onClick={() => setIsEditing(true)} color="primary" variant="contained" startIcon={<EditIcon />}>
                            Edit Profile
                        </Button>
                    </>
                ) : (
                    <>
                        <Button onClick={() => setIsEditing(false)} disabled={isSaving}>Cancel</Button>
                        <Button onClick={handleProfileUpdate} color="primary" variant="contained" disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default UserProfile;
