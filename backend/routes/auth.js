const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const { User, Conversation, EmailClientMaster, CodingLanguageMaster, sequelize } = require('../models');

const router = express.Router();

const memoryUpload = multer({
    limits: { fileSize: 2 * 1024 * 1024 } // 2 MB limit
});

const validateImageMagicBytes = (buffer) => {
    if (!buffer || buffer.length < 4) return false;
    // JPEG magic bytes: FF D8 FF
    const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
    // PNG magic bytes: 89 50 4E 47
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
    return isJpeg || isPng;
};

const validateCaptcha = async (captcha, captchaId) => {
    if (!captcha || !captchaId) {
        return { valid: false, message: 'CAPTCHA code and CAPTCHA ID are required.' };
    }
    try {
        const CAPTCHA_SERVICE_URL = process.env.CAPTCHA_SERVICE_URL || 'http://localhost:11905';
        const response = await axios.post(`${CAPTCHA_SERVICE_URL}/api/v1/captcha/validate`, {
            captcha: String(captcha).trim(),
            captchaId: String(captchaId).trim()
        });

        if (response.data && (response.data.status === 'success' || response.status === 200)) {
            return { valid: true };
        }
        return { valid: false, message: response.data?.details?.message || 'CAPTCHA validation failed.' };
    } catch (error) {
        console.error('CAPTCHA Service error:', error.response?.data || error.message);
        const msg = error.response?.data?.details?.message || error.response?.data?.message || 'Invalid or expired CAPTCHA.';
        return { valid: false, message: msg };
    }
};

router.get('/captcha/generate', async (req, res) => {
    try {
        const CAPTCHA_SERVICE_URL = process.env.CAPTCHA_SERVICE_URL || 'http://localhost:11905';
        const response = await axios.get(`${CAPTCHA_SERVICE_URL}/api/v1/captcha/generate`);
        res.json(response.data);
    } catch (err) {
        console.error("Captcha generation error:", err.message);
        res.status(500).json({ error: "Failed to generate CAPTCHA" });
    }
});

router.get('/captcha/image/:captchaId', async (req, res) => {
    try {
        const CAPTCHA_SERVICE_URL = process.env.CAPTCHA_SERVICE_URL || 'http://localhost:11905';
        const response = await axios.get(`${CAPTCHA_SERVICE_URL}/api/v1/captcha/image/${req.params.captchaId}`, {
            responseType: 'stream'
        });
        res.setHeader('Content-Type', response.headers['content-type'] || 'image/png');
        response.data.pipe(res);
    } catch (err) {
        console.error("Captcha image proxy error:", err.message);
        res.status(500).json({ error: "Failed to fetch CAPTCHA image" });
    }
});

router.get('/captcha/audio/:captchaId', async (req, res) => {
    try {
        const CAPTCHA_SERVICE_URL = process.env.CAPTCHA_SERVICE_URL || 'http://localhost:11905';
        const response = await axios.get(`${CAPTCHA_SERVICE_URL}/api/v1/captcha/audio/${req.params.captchaId}`, {
            responseType: 'stream'
        });
        res.setHeader('Content-Type', response.headers['content-type'] || 'audio/mpeg');
        response.data.pipe(res);
    } catch (err) {
        console.error("Captcha audio proxy error:", err.message);
        res.status(500).json({ error: "Failed to fetch CAPTCHA audio" });
    }
});

router.post('/register', async (req, res) => {
    try {
        const { username, password, name, captcha, captchaId } = req.body;

        const captchaCheck = await validateCaptcha(captcha, captchaId);
        if (!captchaCheck.valid) {
            return res.status(400).json({ error: captchaCheck.message });
        }

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
        const { username, password, isAdminLogin, captcha, captchaId } = req.body;

        const captchaCheck = await validateCaptcha(captcha, captchaId);
        if (!captchaCheck.valid) {
            return res.status(400).json({ error: captchaCheck.message });
        }

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
        const userObj = {
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            profile_photo: user.profile_photo,
            sex: user.sex,
            role: user.role || 'user'
        };
        const token = jwt.sign(userObj, process.env.JWT_SECRET, { expiresIn: jwtExpiresIn });
        res.json({ token, user: userObj });
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
            attributes: ['id', 'username', 'name', 'email', 'profile_photo', 'sex'],
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

router.put('/profile', authMiddleware, memoryUpload.single('profile_photo'), async (req, res) => {
    try {
        const { name, password, email, sex, captcha, captchaId, remove_photo } = req.body;

        const captchaCheck = await validateCaptcha(captcha, captchaId);
        if (!captchaCheck.valid) {
            return res.status(400).json({ error: captchaCheck.message });
        }

        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (name !== undefined && name !== null) {
            if (name.length > 32) return res.status(400).json({ error: 'Name cannot exceed 32 characters.' });
            if (name.length > 0 && !/^[a-zA-Z0-9 ]+$/.test(name)) return res.status(400).json({ error: 'Name can only contain letters, numbers, and spaces.' });
            user.name = name;
        }

        if (email !== undefined && email !== null && email.trim() !== '') {
            const cleanEmail = email.trim();
            const emailParts = cleanEmail.split('@');
            if (emailParts.length !== 2 || !emailParts[0] || !emailParts[1]) {
                return res.status(400).json({ error: 'Invalid email address format.' });
            }
            const domain = emailParts[1].toLowerCase();
            const activeDomain = await EmailClientMaster.findOne({ where: { domain, is_active: true } });
            if (!activeDomain) {
                return res.status(400).json({ error: `Email client domain @${domain} is not an allowed active domain.` });
            }
            user.email = cleanEmail;
        } else if (email === '') {
            user.email = null;
        }

        if (sex !== undefined && sex !== null && sex.trim() !== '') {
            const validSexes = ['male', 'female', 'tgp'];
            if (!validSexes.includes(sex)) {
                return res.status(400).json({ error: 'Sex must be one of: male, female, tgp.' });
            }
            user.sex = sex;
        }

        if (remove_photo === 'true' || remove_photo === true) {
            user.profile_photo = null;
        }

        if (req.file) {
            if (req.file.size > 2 * 1024 * 1024) {
                return res.status(400).json({ error: 'Profile photo size exceeds limit of 2MB.' });
            }
            if (!validateImageMagicBytes(req.file.buffer)) {
                return res.status(400).json({ error: 'Security validation failed: File content does not match allowed JPEG or PNG image format (magic bytes check failed).' });
            }
            const isJpeg = req.file.buffer[0] === 0xFF && req.file.buffer[1] === 0xD8;
            const ext = isJpeg ? '.jpg' : '.png';
            const filename = `photo_${user.id}_${Date.now()}${ext}`;
            const targetDir = path.join(__dirname, '../uploads/profiles');
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }
            const targetPath = path.join(targetDir, filename);
            fs.writeFileSync(targetPath, req.file.buffer);
            user.profile_photo = `/uploads/profiles/${filename}`;
        }

        if (password) {
            if (password.length < 5 || password.length > 20) return res.status(400).json({ error: 'Password must be between 5 and 20 characters.' });
            const salt = await bcrypt.genSalt(10);
            user.password_hash = await bcrypt.hash(password, salt);
        }
        await user.save();

        const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '15m';
        const userPayload = {
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            profile_photo: user.profile_photo,
            sex: user.sex,
            role: user.role || 'user'
        };
        const token = jwt.sign(userPayload, process.env.JWT_SECRET, { expiresIn: jwtExpiresIn });
        res.json({ token, user: userPayload });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || 'Server error' });
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
            const userPayload = {
                id: user.id,
                username: user.username,
                name: user.name,
                email: user.email,
                profile_photo: user.profile_photo,
                sex: user.sex,
                role: user.role || 'user'
            };
            const newToken = jwt.sign(
                userPayload,
                process.env.JWT_SECRET,
                { expiresIn: jwtExpiresIn }
            );

            res.json({
                token: newToken,
                user: userPayload
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

// ==================== EMAIL CLIENT MASTER ENDPOINTS ====================

// Get active email clients for user profile autocomplete dropdown
router.get("/email-clients", authMiddleware, async (req, res) => {
  try {
    const clients = await EmailClientMaster.findAll({
      where: { is_active: true },
      order: [["domain", "ASC"]],
    });
    res.json(clients);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch email clients" });
  }
});

// Admin: Get all email clients for Admin Panel Table
router.get("/admin/email-clients", adminMiddleware, async (req, res) => {
  try {
    const clients = await EmailClientMaster.findAll({
      order: [["created_at", "DESC"]],
    });
    res.json(clients);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch email clients" });
  }
});

// Admin: Add new email client domain
router.post("/admin/email-clients", adminMiddleware, async (req, res) => {
  try {
    const { domain } = req.body;
    if (!domain || !domain.trim()) {
      return res.status(400).json({ error: "Domain name is required." });
    }
    let cleanDomain = domain.trim().toLowerCase();
    if (cleanDomain.startsWith("@")) {
      cleanDomain = cleanDomain.substring(1);
    }
    const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(cleanDomain)) {
      return res.status(400).json({
        error: "Invalid email client domain format (e.g. gmail.com or company.com).",
      });
    }

    const existing = await EmailClientMaster.findOne({
      where: { domain: cleanDomain },
    });
    if (existing) {
      return res.status(400).json({ error: "Email client domain already exists." });
    }

    const newClient = await EmailClientMaster.create({
      domain: cleanDomain,
      is_active: true,
    });
    res.status(201).json(newClient);
  } catch (err) {
    console.error("Error creating email client:", err);
    res.status(500).json({ error: "Failed to add email client domain" });
  }
});

// Admin: Toggle email client active status
router.put("/admin/email-clients/:id/status", adminMiddleware, async (req, res) => {
  try {
    const client = await EmailClientMaster.findByPk(req.params.id);
    if (!client) return res.status(404).json({ error: "Email client not found." });

    client.is_active = !client.is_active;
    await client.save();
    res.json({ message: "Email client status updated successfully.", client });
  } catch (err) {
    console.error("Error updating email client status:", err);
    res.status(500).json({ error: "Failed to update email client status" });
  }
});

// ==================== CODING LANGUAGE MASTER ENDPOINTS ====================

// Get active coding languages for CodeSnippetModal autocomplete dropdown
router.get("/coding-languages", authMiddleware, async (req, res) => {
  try {
    const languages = await CodingLanguageMaster.findAll({
      where: { is_active: true },
      order: [["name", "ASC"]],
    });
    res.json(languages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch coding languages" });
  }
});

// Admin: Get all coding languages for Admin Panel Table
router.get("/admin/coding-languages", adminMiddleware, async (req, res) => {
  try {
    const languages = await CodingLanguageMaster.findAll({
      order: [["created_at", "DESC"]],
    });
    res.json(languages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch coding languages" });
  }
});

// Admin: Add new coding language
router.post("/admin/coding-languages", adminMiddleware, async (req, res) => {
  try {
    const { name, value } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Language name is required." });
    }
    const cleanName = name.trim();
    let cleanValue = value && value.trim() ? value.trim().toLowerCase() : cleanName.toLowerCase().replace(/[^a-z0-9]/g, "");

    const existing = await CodingLanguageMaster.findOne({
      where: {
        [Op.or]: [{ name: cleanName }, { value: cleanValue }],
      },
    });
    if (existing) {
      return res.status(400).json({ error: "Coding language name or identifier value already exists." });
    }

    const newLang = await CodingLanguageMaster.create({
      name: cleanName,
      value: cleanValue,
      is_active: true,
    });
    res.status(201).json(newLang);
  } catch (err) {
    console.error("Error creating coding language:", err);
    res.status(500).json({ error: "Failed to add coding language" });
  }
});

// Admin: Toggle coding language active status
router.put("/admin/coding-languages/:id/status", adminMiddleware, async (req, res) => {
  try {
    const lang = await CodingLanguageMaster.findByPk(req.params.id);
    if (!lang) return res.status(404).json({ error: "Coding language not found." });

    lang.is_active = !lang.is_active;
    await lang.save();
    res.json({ message: "Coding language status updated successfully.", lang });
  } catch (err) {
    console.error("Error updating coding language status:", err);
    res.status(500).json({ error: "Failed to update coding language status" });
  }
});

module.exports = router;
