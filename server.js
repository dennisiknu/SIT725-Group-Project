const express = require('express');
const path = require('path');
const session = require('express-session');
const mongoose = require('mongoose');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 3000;

const MONGO_URI = 'mongodb://127.0.0.1:27017/sit725_project';

mongoose
    .connect(MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

app.use(session({
    secret: 'sit725-secret-key',
    resave: false,
    saveUninitialized: false
}));

app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Please fill in all fields.' });
        }

        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(409).json({ error: 'Email is already registered.' });
        }

        const user = await User.create({ username, email, password });

        return res.status(201).json({
            message: 'Registration successful.',
            user: { id: user._id, username: user.username, email: user.email }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error during registration.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});