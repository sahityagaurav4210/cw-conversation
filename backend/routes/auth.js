const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User, Conversation, sequelize } = require('../models');

const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        const { username, password, name } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        if (!usernameRegex.test(username)) {
            return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores.' });
        }
        if (username.length > 32) {
            return res.status(400).json({ error: 'Username cannot exceed 32 characters.' });
        }

        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) return res.status(400).json({ error: 'Username already exists' });

        if (password.length < 5 || password.length > 20) {
            return res.status(400).json({ error: 'Password must be between 5 and 20 characters.' });
        }

        if (name) {
            if (name.length > 32) return res.status(400).json({ error: 'Name cannot exceed 32 characters.' });
            if (!/^[a-zA-Z0-9 ]+$/.test(name)) return res.status(400).json({ error: 'Name can only contain letters, numbers, and spaces.' });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const newUser = await User.create({ username, password_hash, name, role: 'user' });
        res.status(201).json({ id: newUser.id, username: newUser.username, name: newUser.name, role: newUser.role });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { username, password, isAdminLogin } = req.body;
        const maxWrongPwdLimit = parseInt(process.env.MAX_WRONG_PWD_LIMIT || process.env.max_wrong_pwd_limit || '5', 10);

        const user = await User.findOne({ where: { username } });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        if (isAdminLogin && user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. You do not have administrator privileges.' });
        }

        if (user.is_deactivated) {
            return res.status(403).json({ error: 'Your account has been deactivated permanently. You cannot log in or recover this account.' });
        }

        const now = new Date();

        if (user.suspended_until && new Date(user.suspended_until) > now) {
            const untilStr = new Date(user.suspended_until).toLocaleString();
            return res.status(403).json({ error: `Account is suspended until ${untilStr}.` });
        }

        // Check if account is currently locked
        if (user.account_locked_until && new Date(user.account_locked_until) > now) {
            const remainingMs = new Date(user.account_locked_until) - now;
            const remainingMins = Math.ceil(remainingMs / (60 * 1000));
            return res.status(403).json({
                error: `Account is locked due to too many incorrect password attempts. Please try again after ${remainingMins} minute${remainingMins > 1 ? 's' : ''}.`
            });
        }

        // If lock period has expired, reset failed attempts & lock status
        if (user.account_locked_until && new Date(user.account_locked_until) <= now) {
            user.failed_login_attempts = 0;
            user.account_locked_until = null;
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            user.failed_login_attempts = (user.failed_login_attempts || 0) + 1;

            if (user.failed_login_attempts >= maxWrongPwdLimit) {
                user.account_locked_until = new Date(Date.now() + 30 * 60 * 1000);
                await user.save();
                return res.status(403).json({
                    error: `Account is locked for 30 minutes due to ${user.failed_login_attempts} consecutive failed login attempts.`
                });
            } else {
                await user.save();
                const remaining = maxWrongPwdLimit - user.failed_login_attempts;
                return res.status(401).json({
                    error: `Invalid credentials. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining before account lock.`
                });
            }
        }

        // On successful login, reset counter and lock state
        user.failed_login_attempts = 0;
        user.account_locked_until = null;
        await user.save();

        const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '15m';
        const token = jwt.sign({ id: user.id, username: user.username, name: user.name, role: user.role || 'user' }, process.env.JWT_SECRET, { expiresIn: jwtExpiresIn });
        res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role || 'user' } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Unauthorized' });
        req.user = decoded;
        next();
    });
};

const adminMiddleware = (req, res, next) => {
    authMiddleware(req, res, () => {
        if (req.user && req.user.role === 'admin') {
            next();
        } else {
            res.status(403).json({ error: 'Access denied. Admin privileges required.' });
        }
    });
};

router.get('/users', authMiddleware, async (req, res) => {
    try {
        const search = req.query.search;
        let whereClause = { id: { [Op.ne]: req.user.id }, role: 'user' }; // Exclude logged in user and admins
        
        if (search) {
            whereClause.username = { [Op.iLike]: `%${search}%` };
        }

        // Get all user IDs the current user has chatted with
        const conversations = await Conversation.findAll({
            where: {
                [Op.or]: [{ user1_id: req.user.id }, { user2_id: req.user.id }]
            }
        });
        
        const chattedUserIds = conversations.map(c => c.user1_id === req.user.id ? c.user2_id : c.user1_id);

        let orderClause = [['username', 'ASC']];
        if (chattedUserIds.length > 0) {
            orderClause = [
                [sequelize.literal(`CASE WHEN id IN (${chattedUserIds.join(',')}) THEN 0 ELSE 1 END`), 'ASC'],
                ['username', 'ASC']
            ];
        }

        const users = await User.findAll({ 
            attributes: ['id', 'username', 'name'],
            where: whereClause,
            order: orderClause,
            limit: 15
        });
        
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { name, password } = req.body;
        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (name !== undefined && name !== null) {
            if (name.length > 32) return res.status(400).json({ error: 'Name cannot exceed 32 characters.' });
            if (name.length > 0 && !/^[a-zA-Z0-9 ]+$/.test(name)) return res.status(400).json({ error: 'Name can only contain letters, numbers, and spaces.' });
            user.name = name;
        }
        if (password) {
            if (password.length < 5 || password.length > 20) return res.status(400).json({ error: 'Password must be between 5 and 20 characters.' });
            const salt = await bcrypt.genSalt(10);
            user.password_hash = await bcrypt.hash(password, salt);
        }
        await user.save();

        const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '15m';
        const token = jwt.sign({ id: user.id, username: user.username, name: user.name, role: user.role || 'user' }, process.env.JWT_SECRET, { expiresIn: jwtExpiresIn });
        res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role || 'user' } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Refresh Token Endpoint (Extends user JWT session)
router.post('/refresh', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true }, async (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        try {
            const user = await User.findByPk(decoded.id);
            if (!user || user.is_deactivated) {
                return res.status(403).json({ error: 'User account inactive or deactivated' });
            }

            const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '15m';
            const newToken = jwt.sign(
                { id: user.id, username: user.username, name: user.name, role: user.role || 'user' },
                process.env.JWT_SECRET,
                { expiresIn: jwtExpiresIn }
            );

            res.json({
                token: newToken,
                user: { id: user.id, username: user.username, name: user.name, role: user.role || 'user' }
            });
        } catch (error) {
            console.error('Refresh token error:', error);
            res.status(500).json({ error: 'Server error during token refresh' });
        }
    });
});

// ==================== ADMIN ENDPOINTS ====================

// Get all users of role 'user'
router.get('/admin/users', adminMiddleware, async (req, res) => {
    try {
        const users = await User.findAll({
            where: { role: 'user' },
            attributes: [
                'id',
                'username',
                'name',
                'role',
                'is_deactivated',
                'suspended_until',
                'failed_login_attempts',
                'account_locked_until',
                'reset_code',
                'reset_code_expires',
                'created_at'
            ],
            order: [['id', 'ASC']]
        });
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Deactivate user
router.put('/admin/users/:id/deactivate', adminMiddleware, async (req, res) => {
    try {
        const targetUser = await User.findOne({ where: { id: req.params.id, role: 'user' } });
        if (!targetUser) return res.status(404).json({ error: 'User not found or is an admin.' });

        targetUser.is_deactivated = true;
        await targetUser.save();
        res.json({ message: 'User account deactivated permanently.', user: targetUser });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Suspend user
router.put('/admin/users/:id/suspend', adminMiddleware, async (req, res) => {
    try {
        const { durationMinutes } = req.body;
        if (!durationMinutes || isNaN(durationMinutes) || durationMinutes <= 0) {
            return res.status(400).json({ error: 'Valid suspension duration in minutes required.' });
        }

        const targetUser = await User.findOne({ where: { id: req.params.id, role: 'user' } });
        if (!targetUser) return res.status(404).json({ error: 'User not found or is an admin.' });

        const suspendMs = parseInt(durationMinutes, 10) * 60 * 1000;
        targetUser.suspended_until = new Date(Date.now() + suspendMs);
        await targetUser.save();

        res.json({ message: `User account suspended until ${targetUser.suspended_until.toLocaleString()}.`, user: targetUser });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Unlock / Un-suspend user
router.put('/admin/users/:id/unlock', adminMiddleware, async (req, res) => {
    try {
        const targetUser = await User.findOne({ where: { id: req.params.id, role: 'user' } });
        if (!targetUser) return res.status(404).json({ error: 'User not found or is an admin.' });

        targetUser.failed_login_attempts = 0;
        targetUser.account_locked_until = null;
        targetUser.suspended_until = null;
        await targetUser.save();

        res.json({ message: 'User account unlocked/unsuspended successfully.', user: targetUser });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Edit user profile
router.put('/admin/users/:id/edit', adminMiddleware, async (req, res) => {
    try {
        const { name, username, password } = req.body;
        const targetUser = await User.findOne({ where: { id: req.params.id, role: 'user' } });
        if (!targetUser) return res.status(404).json({ error: 'User not found or is an admin.' });

        if (username && username !== targetUser.username) {
            const usernameRegex = /^[a-zA-Z0-9_]+$/;
            if (!usernameRegex.test(username)) {
                return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores.' });
            }
            if (username.length > 32) {
                return res.status(400).json({ error: 'Username cannot exceed 32 characters.' });
            }
            const existing = await User.findOne({ where: { username } });
            if (existing) return res.status(400).json({ error: 'Username already taken.' });
            targetUser.username = username;
        }

        if (name !== undefined && name !== null) {
            if (name.length > 32) return res.status(400).json({ error: 'Name cannot exceed 32 characters.' });
            if (name.length > 0 && !/^[a-zA-Z0-9 ]+$/.test(name)) return res.status(400).json({ error: 'Name can only contain letters, numbers, and spaces.' });
            targetUser.name = name;
        }

        if (password) {
            if (password.length < 5 || password.length > 20) return res.status(400).json({ error: 'Password must be between 5 and 20 characters.' });
            const salt = await bcrypt.genSalt(10);
            targetUser.password_hash = await bcrypt.hash(password, salt);
        }

        await targetUser.save();
        res.json({ message: 'User updated successfully.', user: targetUser });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== FORGOT PASSWORD ENDPOINTS ====================

// Request code
router.post('/forgot-password/request', async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) return res.status(400).json({ error: 'Username is required.' });

        const user = await User.findOne({ where: { username, role: 'user' } });
        if (!user) return res.status(404).json({ error: 'User not found.' });

        if (user.is_deactivated) {
            return res.status(403).json({ error: 'Account has been deactivated permanently. Password reset is not allowed.' });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        user.reset_code = code;
        user.reset_code_expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await user.save();

        res.json({ message: 'Reset code requested successfully. Please contact your Administrator to retrieve your reset code.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Verify code and reset password
router.post('/forgot-password/verify', async (req, res) => {
    try {
        const { username, code, newPassword } = req.body;
        if (!username || !code || !newPassword) {
            return res.status(400).json({ error: 'Username, reset code, and new password are required.' });
        }

        const user = await User.findOne({ where: { username, role: 'user' } });
        if (!user) return res.status(404).json({ error: 'User not found.' });

        if (user.is_deactivated) {
            return res.status(403).json({ error: 'Account has been deactivated permanently.' });
        }

        if (!user.reset_code || user.reset_code.trim() !== code.trim()) {
            return res.status(400).json({ error: 'Invalid reset code. Please check with your administrator.' });
        }

        if (user.reset_code_expires && new Date(user.reset_code_expires) < new Date()) {
            return res.status(400).json({ error: 'Reset code has expired. Please submit a new request.' });
        }

        if (newPassword.length < 5 || newPassword.length > 20) {
            return res.status(400).json({ error: 'Password must be between 5 and 20 characters.' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password_hash = await bcrypt.hash(newPassword, salt);
        user.reset_code = null;
        user.reset_code_expires = null;
        user.failed_login_attempts = 0;
        user.account_locked_until = null;
        await user.save();

        res.json({ message: 'Password reset successful! You can now log in with your new password.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
