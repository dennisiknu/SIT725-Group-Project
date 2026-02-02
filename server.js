const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');

const Task = require('./models/Task');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 3000;

// .use
app.use(express.json());
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

app.post('/api/register', async (req, res) => {
    try {
        const user = new User(req.body);
        await user.save();
        req.session.userId = user._id;
        res.status(201).json({ message: 'User registered' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });

    if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    req.session.userId = user._id;
    res.json({ message: 'Login successful' });
});

app.get('/api/me', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await User.findById(req.session.userId);
    res.json(user);
});

app.post('/api/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ message: 'Logged out' });
    });
});


// CREATE TASK
app.post('/api/tasks', async (req, res) => {
    try {
        const task = new Task(req.body);
        await task.save();
        res.status(201).json(task);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// GET ALL TASKS
app.get('/api/tasks', async (req, res) => {
    try {
        const tasks = await Task.find().sort({ createdAt: -1 });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// UPDATE TASK
app.put('/api/tasks/:id', async (req, res) => {
    try {
        const task = await Task.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json(task);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE TASK
app.delete('/api/tasks/:id', async (req, res) => {
    try {
        await Task.findByIdAndDelete(req.params.id);
        res.json({ message: 'Task deleted' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.get('/api/tasks/filter', async (req, res) => {
    try {
        const {
            status = 'All',
            priority = 'All',
            sort_by = 'created_at',
            sort_order = 'desc'
        } = req.query;

        const filter = {};
        if (status !== 'All') filter.status = status;
        if (priority !== 'All') filter.priority = priority;

        let sortField = 'createdAt';
        if (sort_by === 'priority') sortField = 'priority';
        if (sort_by === 'status') sortField = 'status';

        const sortDir = sort_order === 'asc' ? 1 : -1;

        const tasks = await Task.find(filter).sort({ [sortField]: sortDir });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});