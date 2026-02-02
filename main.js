// Import required dependencies
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const { format } = require('date-fns'); // For date formatting (lightweight date library)

// Initialize Express application
const app = express();
const PORT = process.env.PORT || 8000;

// Middleware configuration
app.use(cors()); // Allow cross-origin requests (for frontend integration)
app.use(bodyParser.json()); // Parse JSON request bodies
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded request bodies



app.use(express.static('public')); 


app.get('/', (req, res) => {
  res.redirect('/tasks.html');
});
// --------------- SQLite Database Configuration ---------------
// Connect to SQLite database (creates task_database.db if it doesn't exist)
const db = new sqlite3.Database('./task_database.db', (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Successfully connected to the SQLite task database.');
    // Create tasks table if it doesn't exist (mirrors FastAPI SQLAlchemy model)
    createTasksTable();
  }
});

// Create tasks table with schema matching the original FastAPI DB model
function createTasksTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'To Do',
      progress REAL DEFAULT 0.0,
      priority TEXT DEFAULT 'Medium',
      due_date TEXT, -- Store as ISO string for easy datetime handling
      created_at TEXT DEFAULT (datetime('now', 'utc')) -- UTC time by default
    );
  `;
  db.run(createTableQuery, (err) => {
    if (err) {
      console.error('Error creating tasks table:', err.message);
    } else {
      console.log('Tasks table is ready (created or already exists).');
    }
  });
}

// --------------- API Endpoints (1:1 Match with FastAPI Version) ---------------
/**
 * POST /api/tasks
 * Create a new task
 * Request body: { title: string, description?: string, due_date?: string, priority?: string }
 * Response: Created task object with all fields
 */
app.post('/api/tasks', (req, res) => {
  const { title, description = null, due_date = null, priority = 'Medium' } = req.body;

  // Basic validation: title is required
  if (!title || title.trim() === '') {
    return res.status(400).json({ detail: 'Title is a required field' });
  }

  // Insert new task into database
  const insertQuery = `
    INSERT INTO tasks (title, description, priority, due_date)
    VALUES (?, ?, ?, ?)
  `;
  db.run(
    insertQuery,
    [title, description, priority, due_date],
    function (err) {
      if (err) {
        return res.status(500).json({ detail: 'Failed to create task: ' + err.message });
      }
      // Get the newly created task and return it (mimic db.refresh in SQLAlchemy)
      db.get('SELECT * FROM tasks WHERE id = ?', [this.lastID], (err, task) => {
        if (err) {
          return res.status(500).json({ detail: 'Failed to fetch created task: ' + err.message });
        }
        res.status(200).json(task); // Match FastAPI's 200 response (instead of 201 for consistency)
      });
    }
  );
});

/**
 * POST /api/tasks/filter
 * Get filtered and sorted tasks
 * Request body: { status?: string, priority?: string, sort_by?: string, sort_order?: string }
 * Default sort: created_at DESC
 * Response: Array of task objects
 */
app.post('/api/tasks/filter', (req, res) => {
  const {
    status = null,
    priority = null,
    sort_by = 'created_at',
    sort_order = 'desc'
  } = req.body;

  // Sanitize sort column (prevent SQL injection, only allow valid columns)
  const validSortColumns = ['id', 'title', 'status', 'progress', 'priority', 'due_date', 'created_at'];
  const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'created_at';

  // Sanitize sort order (only asc/desc)
  const sortOrder = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  // Build dynamic query with filters
  let query = 'SELECT * FROM tasks WHERE 1=1';
  const params = [];

  // Apply status filter if provided
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  // Apply priority filter if provided
  if (priority) {
    query += ' AND priority = ?';
    params.push(priority);
  }

  // Apply sorting
  query += ` ORDER BY ${sortColumn} ${sortOrder}`;

  // Execute query and return results
  db.all(query, params, (err, tasks) => {
    if (err) {
      return res.status(500).json({ detail: 'Failed to fetch tasks: ' + err.message });
    }
    res.status(200).json(tasks);
  });
});

/**
 * PUT /api/tasks/:task_id
 * Update task status and progress (core feature)
 * Path param: task_id (integer)
 * Request body: { status: string, progress: number }
 * Validation: progress must be 0-100
 * Response: Updated task object
 */
app.put('/api/tasks/:task_id', (req, res) => {
  const taskId = parseInt(req.params.task_id);
  const { status, progress } = req.body;

  // Basic validation
  if (isNaN(taskId)) {
    return res.status(400).json({ detail: 'Task ID must be a valid integer' });
  }
  if (typeof progress !== 'number' || progress < 0 || progress > 100) {
    return res.status(400).json({ detail: 'Progress must be between 0 and 100' });
  }
  if (!status || status.trim() === '') {
    return res.status(400).json({ detail: 'Status is a required field' });
  }

  // Update task in database
  const updateQuery = `
    UPDATE tasks
    SET status = ?, progress = ?
    WHERE id = ?
  `;
  db.run(
    updateQuery,
    [status, progress, taskId],
    function (err) {
      if (err) {
        return res.status(500).json({ detail: 'Failed to update task: ' + err.message });
      }
      // Check if any row was affected (task exists)
      if (this.changes === 0) {
        return res.status(404).json({ detail: 'Task not found' });
      }
      // Return the updated task
      db.get('SELECT * FROM tasks WHERE id = ?', [taskId], (err, task) => {
        if (err) {
          return res.status(500).json({ detail: 'Failed to fetch updated task: ' + err.message });
        }
        res.status(200).json(task);
      });
    }
  );
});

/**
 * DELETE /api/tasks/:task_id
 * Delete a task by ID
 * Path param: task_id (integer)
 * Response: Success message
 */
app.delete('/api/tasks/:task_id', (req, res) => {
  const taskId = parseInt(req.params.task_id);

  if (isNaN(taskId)) {
    return res.status(400).json({ detail: 'Task ID must be a valid integer' });
  }

  const deleteQuery = 'DELETE FROM tasks WHERE id = ?';
  db.run(
    deleteQuery,
    [taskId],
    function (err) {
      if (err) {
        return res.status(500).json({ detail: 'Failed to delete task: ' + err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ detail: 'Task not found' });
      }
      res.status(200).json({ message: 'Task deleted successfully' });
    }
  );
});

// Start the Express server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Task Management API is running on http://0.0.0.0:${PORT}`);
  console.log('API Docs (original FastAPI) style: Use Postman/Thunder Client to test endpoints');
});



// Extend GET /api/tasks/filter endpoint in main.js to add date filter logic
app.get('/api/tasks/filter', (req, res) => {
  const {
    status = null,
    priority = null,
    sort_by = 'created_at',
    sort_order = 'desc',
    // New: Receive date filter type from frontend (overdue/upcoming)
    date_filter = null 
  } = req.query;

  // Validate sort column (prevent SQL injection, only allow valid columns)
  const validSortColumns = ['id', 'title', 'status', 'progress', 'priority', 'due_date', 'created_at'];
  const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'created_at';
  const sortOrder = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  let query = 'SELECT * FROM tasks WHERE 1=1';
  const params = [];

  // Apply status filter if provided
  if (status) { 
    query += ' AND status = ?'; 
    params.push(status); 
  }
  // Apply priority filter if provided
  if (priority) { 
    query += ' AND priority = ?'; 
    params.push(priority); 
  }

  // New: Date filter logic (overdue/upcoming)
  if (date_filter) {
    const today = new Date().toISOString().split('T')[0]; // Today's date (format: YYYY-MM-DD)
    if (date_filter === 'overdue') {
      // Overdue: due_date < today AND status is not Completed
      query += ' AND due_date < ? AND status != ?';
      params.push(today, 'Completed');
    } else if (date_filter === 'upcoming') {
      // Upcoming: due_date >= today AND due_date <= today + 7 days
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().split('T')[0];
      query += ' AND due_date >= ? AND due_date <= ?';
      params.push(today, nextWeekStr);
    }
  }

  // Apply sorting
  query += ` ORDER BY ${sortColumn} ${sortOrder}`;

  // Execute query and return results
  db.all(query, params, (err, tasks) => {
    if (err) {
      return res.status(500).json({ detail: 'Failed to fetch tasks: ' + err.message });
    }
    res.status(200).json(tasks);
  });
});