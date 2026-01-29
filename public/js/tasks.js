// public/js/tasks.js
document.addEventListener('DOMContentLoaded', async () => {
  
  initFilterSortEvents();
  
  await loadTasks();
});


async function loadTasks() {
  try {
   
    const status = document.getElementById('statusFilter').value || '';
    const priority = document.getElementById('priorityFilter').value || '';
    const sortBy = document.getElementById('sortBy').value || 'created_at';
    const sortOrder = document.getElementById('sortOrder').value || 'desc';

   
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (priority) params.append('priority', priority);
    params.append('sort_by', sortBy);
    params.append('sort_order', sortOrder);

    
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


async function updateTaskStatus(taskId) {
  try {
    
    const status = document.getElementById(`status-${taskId}`).value;
    const progress = parseFloat(document.getElementById(`progress-${taskId}`).value);

    
    if (progress < 0 || progress > 100) {
      showMessage('errorMsg', 'Progress must be between 0 and 100', 'red');
      return;
    }

    
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

    
    await loadTasks();
    showMessage('successMsg', 'Task updated successfully!', 'green');
  } catch (error) {
    showMessage('errorMsg', error.message, 'red');
  }
}


function renderTasks(tasks) {
  const container = document.getElementById('tasksContainer');
  container.innerHTML = '';

  if (tasks.length === 0) {
    container.innerHTML = '<p>No tasks found</p>';
    return;
  }

  tasks.forEach(task => {
    const taskCard = document.createElement('div');
    taskCard.className = 'task-card';
    
    const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date';
    const createdAt = new Date(task.created_at).toLocaleString();

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
      <p><strong>Due Date:</strong> ${dueDate}</p>
      <p><small>Created at: ${createdAt}</small></p>
    `;
    container.appendChild(taskCard);
  });
}


function initFilterSortEvents() {
  
  ['statusFilter', 'priorityFilter', 'sortBy', 'sortOrder'].forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('change', loadTasks);
    }
  });
}


function showMessage(elementId, message, color) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = message;
    element.style.color = color;
    setTimeout(() => element.textContent = '', 3000);
  }
}