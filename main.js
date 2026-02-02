// Import required dependencies
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose'); // Replace sqlite3 with mongoose for MongoDB integration

// Initialize Express application
const app = express();
const PORT = process.env.PORT || 8000;

// Middleware configuration
app.use(cors()); // Enable cross-origin resource sharing for frontend integration
app.use(bodyParser.json()); // Parse JSON request bodies
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded request bodies
app.use(express.static('public')); // Serve static files from public directory

// --------------- MongoDB Configuration ---------------
// 1. Connect to MongoDB database (match team member's connection string)
const MONGO_URI = 'mongodb://127.0.0.1:27017/sit725_project';
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Successfully connected to MongoDB'))
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1); // Exit process on connection failure
  });

// 2. Define Task Schema (equivalent to SQLite tasks table structure)
const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is a required field'], // Equivalent to SQL NOT NULL constraint
    trim: true // Remove whitespace from both ends
  },
  description: {
    type: String,
    default: null
  },
  status: {
    type: String,
    default: 'To Do' // Default value (equivalent to SQL DEFAULT)
  },
  progress: {
    type: Number,
    default: 0.0 // Default value for progress percentage
  },
  priority: {
    type: String,
    default: 'Medium' // Default priority level
  },
  due_date: {
    type: String, // Keep ISO string format for consistency with original implementation
    default: null
  },
  created_at: {
    type: String,
    default: new Date().toISOString() // Simulate SQL datetime('now', 'utc')
  }
});

// Create Task Model (MongoDB automatically creates plural collection name: "tasks")
const Task = mongoose.model('Task', taskSchema);

// --------------- Root Route ---------------
app.get('/', (req, res) => {
  res.redirect('/tasks.html'); // Redirect root to task management page
});

// --------------- API Endpoints (1:1 Match with Original SQLite Version) ---------------
/**
 * POST /api/tasks
 * Create a new task
 * Request body: { title: string, description?: string, due_date?: string, priority?: string }
 * Response: Created task object with all fields
 */
app.post('/api/tasks', async (req, res) => {
  try {
    const { title, description = null, due_date = null, priority = 'Medium' } = req.body;

    // Basic validation: title is required
    if (!title || title.trim() === '') {
      return res.status(400).json({ detail: 'Title is a required field' });
    }

    // Create new task document
    const newTask = new Task({
      title,
      description,
      priority,
      due_date
    });

    // Save task to MongoDB
    const savedTask = await newTask.save();
    res.status(200).json(savedTask); // Maintain original 200 response code for consistency
  } catch (err) {
    res.status(500).json({ detail: 'Failed to create task: ' + err.message });
  }
});

/**
 * POST /api/tasks/filter
 * Get filtered and sorted tasks
 * Request body: { status?: string, priority?: string, sort_by?: string, sort_order?: string }
 * Default sort: created_at DESC
 * Response: Array of task objects
 */
app.post('/api/tasks/filter', async (req, res) => {
  try {
    const {
      status = null,
      priority = null,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.body;

    // Sanitize sort column (prevent invalid sort fields)
    const validSortColumns = ['_id', 'title', 'status', 'progress', 'priority', 'due_date', 'created_at'];
    const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'created_at';
    // MongoDB sort syntax: 1 = ascending, -1 = descending
    const sortDirection = sort_order.toLowerCase() === 'asc' ? 1 : -1;

    // Build filter object (equivalent to SQL WHERE clause)
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    // Execute query with filtering and sorting
    const tasks = await Task.find(filter)
      .sort({ [sortColumn]: sortDirection });

    res.status(200).json(tasks);
  } catch (err) {
    res.status(500).json({ detail: 'Failed to fetch tasks: ' + err.message });
  }
});

/**
 * PUT /api/tasks/:task_id
 * Update task status and progress (core feature)
 * Path param: task_id (MongoDB ObjectId string)
 * Request body: { status: string, progress: number }
 * Validation: progress must be 0-100
 * Response: Updated task object
 */
app.put('/api/tasks/:task_id', async (req, res) => {
  try {
    const taskId = req.params.task_id;
    const { status, progress } = req.body;

    // Validation checks
    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ detail: 'Task ID must be a valid MongoDB ObjectId' });
    }
    // Validate progress range (0-100)
    if (typeof progress !== 'number' || progress < 0 || progress > 100) {
      return res.status(400).json({ detail: 'Progress must be between 0 and 100' });
    }
    // Validate status is provided
    if (!status || status.trim() === '') {
      return res.status(400).json({ detail: 'Status is a required field' });
    }

    // Update task in database (equivalent to SQL UPDATE)
    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      { status, progress }, // Fields to update
      { 
        new: true, // Return updated document instead of original
        runValidators: true // Enforce schema validation on update
      }
    );

    // Check if task exists
    if (!updatedTask) {
      return res.status(404).json({ detail: 'Task not found' });
    }

    res.status(200).json(updatedTask);
  } catch (err) {
    res.status(500).json({ detail: 'Failed to update task: ' + err.message });
  }
});

/**
 * DELETE /api/tasks/:task_id
 * Delete a task by ID
 * Path param: task_id (MongoDB ObjectId string)
 * Response: Success message
 */
app.delete('/api/tasks/:task_id', async (req, res) => {
  try {
    const taskId = req.params.task_id;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ detail: 'Task ID must be a valid MongoDB ObjectId' });
    }

    // Delete task from database (equivalent to SQL DELETE)
    const deletedTask = await Task.findByIdAndDelete(taskId);

    // Check if task existed
    if (!deletedTask) {
      return res.status(404).json({ detail: 'Task not found' });
    }

    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (err) {
    res.status(500).json({ detail: 'Failed to delete task: ' + err.message });
  }
});

/**
 * GET /api/tasks/filter
 * Extended functionality: Add date filter (overdue/upcoming)
 * Request query params: { status?, priority?, sort_by?, sort_order?, date_filter? }
 * Response: Array of filtered tasks
 */
app.get('/api/tasks/filter', async (req, res) => {
  try {
    const {
      status = null,
      priority = null,
      sort_by = 'created_at',
      sort_order = 'desc',
      date_filter = null
    } = req.query;

    // Sanitize sort column
    const validSortColumns = ['_id', 'title', 'status', 'progress', 'priority', 'due_date', 'created_at'];
    const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = sort_order.toLowerCase() === 'asc' ? 1 : -1;

    // Build base filter object
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    // Date filter logic (overdue/upcoming)
    if (date_filter) {
      const today = new Date().toISOString().split('T')[0]; // Current date in YYYY-MM-DD format
      
      if (date_filter === 'overdue') {
        // Overdue tasks: due_date < today AND status != Completed
        filter.due_date = { $lt: today };
        filter.status = { $ne: 'Completed' };
      } else if (date_filter === 'upcoming') {
        // Upcoming tasks: due_date >= today AND due_date <= today + 7 days
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const nextWeekStr = nextWeek.toISOString().split('T')[0];
        
        filter.due_date = { 
          $gte: today, 
          $lte: nextWeekStr 
        };
      }
    }

    // Execute filtered query with sorting
    const tasks = await Task.find(filter)
      .sort({ [sortColumn]: sortDirection });

    res.status(200).json(tasks);
  } catch (err) {
    res.status(500).json({ detail: 'Failed to fetch tasks: ' + err.message });
  }
});

// Start Express server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Task Management API is running on http://0.0.0.0:${PORT}`);
  console.log('API Documentation: Use Postman/Thunder Client to test all endpoints');
});