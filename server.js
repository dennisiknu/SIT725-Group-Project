const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const Task = require('./models/Task');
const User = require('./models/User');
const Template = require('./models/Template');

const app = express();
const PORT = process.env.PORT || 3000;

const MONGO_URI = 'mongodb://127.0.0.1:27017/sit725_project';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: 'sit725-secret-key',
    resave: false,
    saveUninitialized: false
  })
);

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: 'Unauthorized. Please login.' });
  }
  next();
}

// DB
mongoose
  .connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// ---------------- AUTH ----------------
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = new User({ username, email, password: hashed });
    await user.save();

    // IMPORTANT for templates (and any per-user data)
    req.session.userId = user._id;

    res.status(201).json({ message: 'User registered' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    // IMPORTANT for templates (and any per-user data)
    req.session.userId = user._id;

    res.json({ message: 'Login successful' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    // Always return the same message (prevents account enumeration)
    const genericMsg = 'If an account exists for that email, a reset link has been generated.';

    if (!user) {
      return res.json({ message: genericMsg });
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken = token;
    user.resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    await user.save();

    // For uni demo: return a reset link (instead of sending email)
    const resetUrl = `/resetpassword.html?token=${token}`;

    res.json({ message: genericMsg, resetUrl });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Missing token or password.' });
    }

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    user.password = hashed;
    user.resetToken = null;
    user.resetTokenExpiry = null;

    await user.save();

    res.json({ message: 'Password updated successfully. You can now log in.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/me', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: 'Not authenticated' });
  const user = await User.findById(req.session.userId);
  res.json(user);
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ message: 'Logged out' }));
});

// ---------------- TEMPLATES ----------------
app.get('/api/templates', requireAuth, async (req, res) => {
  try {
    const templates = await Template.find({ userId: req.session.userId }).sort({ createdAt: -1 });
    res.json(templates);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load templates' });
  }
});

app.post('/api/templates', requireAuth, async (req, res) => {
  try {
    const { name, title, category, priority, status, dueDate } = req.body;

    if (!name || String(name).trim().length < 2) {
      return res.status(400).json({ message: 'Template name must be at least 2 characters.' });
    }

    const created = await Template.create({
      userId: req.session.userId,
      name: String(name).trim(),
      title: title ? String(title).trim() : '',
      category: category ? String(category).trim() : 'General',
      priority: priority || 'Medium',
      status: status || 'Pending',
      dueDate: dueDate ? new Date(dueDate) : undefined
    });

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create template' });
  }
});

app.delete('/api/templates/:id', requireAuth, async (req, res) => {
  try {
    const deleted = await Template.findOneAndDelete({
      _id: req.params.id,
      userId: req.session.userId
    });

    if (!deleted) return res.status(404).json({ message: 'Template not found' });

    res.json({ message: 'Template deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete template' });
  }
});

// ---------------- TASKS ----------------
app.post('/api/tasks', async (req, res) => {
  try {
    const { title, category, priority, dueDate, status } = req.body;

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

    const allowedStatus = ['Pending', 'Completed'];
    if (status !== undefined && !allowedStatus.includes(status)) {
      errors.push('Status must be Pending or Completed.');
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
      category: (category || 'General').trim(),
      priority: priority || 'Medium',
      status: status || 'Pending',
      dueDate: parsedDueDate
    });

    res.status(201).json({ message: 'Task created', task });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { title, category, priority, dueDate, status } = req.body;

    const update = {};
    if (title !== undefined) update.title = String(title).trim();
    if (category !== undefined) update.category = String(category).trim();
    if (priority !== undefined) update.priority = priority;
    if (status !== undefined) update.status = status;

    if (dueDate === '' || dueDate === null) update.dueDate = undefined;
    else if (dueDate !== undefined) update.dueDate = new Date(dueDate);

    const updated = await Task.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!updated) return res.status(404).json({ message: 'Task not found' });

    res.json({ message: 'Task updated', task: updated });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const deleted = await Task.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Task not found' });

    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Optional filter endpoint (keep if your UI uses it)
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
