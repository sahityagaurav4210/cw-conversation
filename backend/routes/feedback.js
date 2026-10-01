const express = require('express');
const jwt = require('jsonwebtoken');
const { Feedback, User } = require('../models');

const router = express.Router();

// Middleware to verify JWT
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
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    next();
};

router.use(authMiddleware);

// RFC 5322 Email Validation Regex
const rfcEmailRegex = /^(?:[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?|\[(?:(?:(2(5[0-5]|Wait|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|Wait|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-zA-Z0-9-]*[a-zA-Z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/;
// Name regex: letters & spaces, max 32
const nameRegex = /^[a-zA-Z ]{1,32}$/;
// Message regex (same as Chat.jsx): allowed characters + multiline support
const messageRegex = /^[a-zA-Z0-9 .(),_\-#$/&%@*+'\r\n]+$/;

// Submit feedback (User)
router.post('/', async (req, res) => {
    try {
        const { name, email, section_name, suggestion } = req.body;

        if (!name || !nameRegex.test(name.trim())) {
            return res.status(400).json({ error: 'Name must contain only letters and spaces, up to 32 characters.' });
        }

        if (!email || !rfcEmailRegex.test(email.trim())) {
            return res.status(400).json({ error: 'Invalid email address format (RFC standard required).' });
        }

        const validSections = ['accounts', 'login', 'chats'];
        if (!section_name || !validSections.includes(section_name)) {
            return res.status(400).json({ error: 'Section name must be one of: accounts, login, chats.' });
        }

        if (!suggestion || suggestion.trim().length === 0 || suggestion.length > 2048) {
            return res.status(400).json({ error: 'Suggestion is required and must be at most 2048 characters.' });
        }

        if (!messageRegex.test(suggestion)) {
            return res.status(400).json({ error: 'Suggestion contains invalid characters.' });
        }

        const feedback = await Feedback.create({
            user_id: req.user.id,
            name: name.trim(),
            email: email.trim(),
            section_name,
            suggestion: suggestion.trim(),
            status: 'pending',
            reason: null
        });

        res.status(201).json(feedback);
    } catch (err) {
        console.error('Error submitting feedback:', err);
        res.status(500).json({ error: 'Failed to submit feedback' });
    }
});

// Get user's own feedback list (User view)
router.get('/my', async (req, res) => {
    try {
        const feedbacks = await Feedback.findAll({
            where: { user_id: req.user.id },
            order: [['created_at', 'DESC']]
        });
        res.json(feedbacks);
    } catch (err) {
        console.error('Error fetching user feedback:', err);
        res.status(500).json({ error: 'Failed to fetch feedbacks' });
    }
});

// Get all feedbacks (Admin panel)
router.get('/admin', adminMiddleware, async (req, res) => {
    try {
        const feedbacks = await Feedback.findAll({
            include: [{ model: User, attributes: ['id', 'username', 'name'] }],
            order: [['created_at', 'DESC']]
        });
        res.json(feedbacks);
    } catch (err) {
        console.error('Error fetching admin feedbacks:', err);
        res.status(500).json({ error: 'Failed to fetch feedbacks' });
    }
});

// Admin accept/reject feedback action
router.put('/admin/:id/action', adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reason } = req.body;

        if (!['accepted', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Status must be accepted or rejected.' });
        }

        if (!reason || reason.trim().length === 0) {
            return res.status(400).json({ error: 'Reason is mandatory.' });
        }

        if (reason.length > 512) {
            return res.status(400).json({ error: 'Reason must be at most 512 characters.' });
        }

        if (!messageRegex.test(reason)) {
            return res.status(400).json({ error: 'Reason contains invalid characters.' });
        }

        const feedback = await Feedback.findByPk(id);
        if (!feedback) {
            return res.status(404).json({ error: 'Feedback not found.' });
        }

        feedback.status = status;
        feedback.reason = reason.trim();
        await feedback.save();

        res.json({ message: `Feedback ${status} successfully.`, feedback });
    } catch (err) {
        console.error('Error updating feedback status:', err);
        res.status(500).json({ error: 'Failed to update feedback status' });
    }
});

module.exports = router;
