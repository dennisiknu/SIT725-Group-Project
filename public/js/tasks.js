// public/js/tasks.js
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize filter/sort event listeners
  initFilterSortEvents();
  // Load task list with default filters
  await loadTasks();
});

/**
 * Core function: Load filtered/sorted tasks from backend
 */
async function loadTasks() {
  try {
    // Get date filter parameter (new)
    const dateFilter = document.getElementById('dateFilter').value || '';
    // Get existing filter parameters
    const status = document.getElementById('statusFilter').value || '';
    const priority = document.getElementById('priorityFilter').value || '';
    const sortBy = document.getElementById('sortBy').value || 'created_at';
    const sortOrder = document.getElementById('sortOrder').value || 'desc';

    // Build URL parameters
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (priority) params.append('priority', priority);
    if (dateFilter) params.append('date_filter', dateFilter); // Add date filter (new)
    params.append('sort_by', sortBy);
    params.append('sort_order', sortOrder);

    // Fetch filtered tasks from backend
    const response = await fetch(`/api/tasks/filter?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to load tasks');
    }

    const tasks = await response.json();
    renderTasks(tasks);
  } catch (error) {
    showMessage('errorMsg', error.message, 'red');
  }
}

/**
 * Core function: Update task status and progress
 * @param {number} taskId - ID of the task to update
 */
async function updateTaskStatus(taskId) {
  try {
    // Get selected status and progress
    const status = document.getElementById(`status-${taskId}`).value;
    const progress = parseFloat(document.getElementById(`progress-${taskId}`).value);

    // Validate progress range (0-100)
    if (progress < 0 || progress > 100) {
      showMessage('errorMsg', 'Progress must be between 0 and 100', 'red');
      return;
    }

    // Update task via PUT request
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status, progress })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update task');
    }

    // Refresh task list after update
    await loadTasks();
    showMessage('successMsg', 'Task updated successfully!', 'green');
  } catch (error) {
    showMessage('errorMsg', error.message, 'red');
  }
}

/**
 * Helper function: Render task list to DOM
 * @param {Array} tasks - List of tasks from backend
 */
function renderTasks(tasks) {
  const container = document.getElementById('tasksContainer');
  container.innerHTML = '';
  const today = new Date().toISOString().split('T')[0]; // Today's date (YYYY-MM-DD)

  if (tasks.length === 0) {
    container.innerHTML = '<p>No tasks found</p>';
    return;
  }

  tasks.forEach(task => {
    const taskCard = document.createElement('div');
    taskCard.className = 'task-card';
    
    // Check if task is overdue (new)
    const isOverdue = task.due_date && task.due_date < today && task.status !== 'Completed';
    // Highlight overdue tasks with red border and text
    if (isOverdue) {
      taskCard.style.borderLeft = '4px solid red';
      taskCard.style.color = '#dc3545';
    }

    // Format dates for display
    const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date';
    const createdAt = new Date(task.created_at).toLocaleString();

    // Build task card HTML
    taskCard.innerHTML = `
      <h3>${task.title}</h3>
      <p><strong>Description:</strong> ${task.description || 'No description'}</p>
      <p><strong>Status:</strong> 
        <select id="status-${task.id}" class="status-select">
          <option value="To Do" ${task.status === 'To Do' ? 'selected' : ''}>To Do</option>
          <option value="In Progress" ${task.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
          <option value="Completed" ${task.status === 'Completed' ? 'selected' : ''}>Completed</option>
        </select>
      </p>
      <p><strong>Progress:</strong> 
        <input type="number" id="progress-${task.id}" min="0" max="100" value="${task.progress}" style="width: 60px;">%
        <button onclick="updateTaskStatus(${task.id})">Save</button>
      </p>
      <p><strong>Priority:</strong> ${task.priority}</p>
      <p><strong>Due Date:</strong> ${dueDate} ${isOverdue ? '(Overdue)' : ''}</p>
      <p><small>Created at: ${createdAt}</small></p>
    `;
    container.appendChild(taskCard);
  });
}

/**
 * Helper function: Initialize filter/sort event listeners
 */
function initFilterSortEvents() {
  // Add change event to all filter/sort controls (include dateFilter)
  ['statusFilter', 'priorityFilter', 'dateFilter', 'sortBy', 'sortOrder'].forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('change', loadTasks);
    }
  });
}

/**
 * Helper function: Display temporary message to user
 * @param {string} elementId - ID of message container
 * @param {string} message - Message text to display
 * @param {string} color - Text color (e.g., 'red', 'green')
 */
function showMessage(elementId, message, color) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = message;
    element.style.color = color;
    // Clear message after 3 seconds
    setTimeout(() => element.textContent = '', 3000);
  }
}