const express = require('express');
const path = require('path');
const session = require('express-session');
const mongoose = require('mongoose');
const Task = require('./models/Task');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 3000;

// .use
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true })); 

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

// API end point start
app.post('/api/tasks', async (req, res) => {
  try {
    const { title, category, priority, dueDate } = req.body;

    const errors = [];

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
        errors.push('Title is required and must be at least 3 characters.');
    }

    if (category !== undefined && typeof category !== 'string') {
        errors.push('Category must be a string.');
    }

    const allowedPriorities = ['Low', 'Medium', 'High'];
    if (priority !== undefined && !allowedPriorities.includes(priority)) {
        errors.push('Priority must be between Low, Medium, High.');
    }

    let parsedDueDate;
    if (dueDate !== undefined && dueDate !== null && dueDate !== '') {
        parsedDueDate = new Date(dueDate);
        if (Number.isNaN(parsedDueDate.getTime())) {
            errors.push('Due date must be a valid date.');
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({ message: 'Validation failed', errors });
    }


    const task = await Task.create({
        title: title.trim(),
        category: category?.trim() || 'General',
        priority: priority || 'Medium',
        dueDate: parsedDueDate
    });

    return res.status(201).json({ message: 'Task created', task });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});
// API endpoint Finish

// API data fetch
app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    return res.status(200).json(tasks);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});
// API data fetch end


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

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Please enter email and password.' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        if (user.password !== password) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        req.session.userId = user._id;

        return res.json({
            message: 'Login successful',
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error during login.' });
    }
});

app.get('/api/me', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not logged in' });
    }

    return res.json({
        message: 'User is logged in',
        userId: req.session.userId
    });
});


app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Logout failed.' });
        }
        return res.json({ message: 'Logout successful' });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});