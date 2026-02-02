// public/js/tasks.js

document.addEventListener('DOMContentLoaded', () => {
  initFilterSortEvents();
  loadTasks();
});

function showMessage(elementId, message, color) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.style.color = color || '';
  setTimeout(() => { el.textContent = ''; }, 3000);
}

function formatDateForInput(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function escapeAttr(str) {
  return String(str || '').replaceAll('"', '&quot;');
}

/**
 * Load filtered/sorted tasks from backend (MongoDB)
 */
async function loadTasks() {
  const taskList = document.getElementById('taskList');
  if (!taskList) return;

  taskList.innerHTML = '';
  showMessage('errorMsg', '', '');
  showMessage('successMsg', '', '');

  try {
    // Read dropdown values from tasks.html
    const dateFilter = document.getElementById('dateFilter')?.value || '';
    const status = document.getElementById('statusFilter')?.value || '';
    const priority = document.getElementById('priorityFilter')?.value || '';
    const sortBy = document.getElementById('sortBy')?.value || 'created_at';
    const sortOrder = document.getElementById('sortOrder')?.value || 'desc';

    // Build query string
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (priority) params.append('priority', priority);
    if (dateFilter) params.append('date_filter', dateFilter); // Only works if backend supports it
    params.append('sort_by', sortBy);
    params.append('sort_order', sortOrder);

    const res = await fetch(`/api/tasks/filter?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(text.slice(0, 120));
    }

    if (!res.ok) {
      showMessage('errorMsg', data?.message || 'Failed to load tasks', 'red');
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      taskList.innerHTML = '<p>No tasks found.</p>';
      return;
    }

    data.forEach((task) => {
      const card = document.createElement('div');
      card.className = 'task-card';

      const due = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—';
      const created = task.createdAt ? new Date(task.createdAt).toLocaleString() : '—';

      const view = document.createElement('div');
      view.innerHTML = `
        <strong>${task.title}</strong>
        <div>Category: ${task.category || 'General'}</div>
        <div>Priority: ${task.priority || 'Medium'}</div>
        <div>Status: ${task.status || 'To Do'}</div>
        <div>Due: ${due}</div>
        <div><small>Created: ${created}</small></div>
        <div style="margin-top:8px;">
          <button class="editBtn">Edit</button>
          <button class="delBtn" style="margin-left:6px;">Delete</button>
        </div>
      `;

      const edit = document.createElement('div');
      edit.style.display = 'none';
      edit.style.marginTop = '10px';
      edit.innerHTML = `
        <div>
          <label>Title</label><br/>
          <input type="text" class="editTitle" value="${escapeAttr(task.title)}" />
        </div>

        <div style="margin-top:8px;">
          <label>Category</label><br/>
          <input type="text" class="editCategory" value="${escapeAttr(task.category || 'General')}" />
        </div>

        <div style="margin-top:8px;">
          <label>Priority</label><br/>
          <select class="editPriority">
            <option value="Low" ${task.priority === 'Low' ? 'selected' : ''}>Low</option>
            <option value="Medium" ${(!task.priority || task.priority === 'Medium') ? 'selected' : ''}>Medium</option>
            <option value="High" ${task.priority === 'High' ? 'selected' : ''}>High</option>
          </select>
        </div>

        <div style="margin-top:8px;">
          <label>Due Date</label><br/>
          <input type="date" class="editDueDate" value="${formatDateForInput(task.dueDate)}" />
        </div>

        <div style="margin-top:8px;">
          <label>Status</label><br/>
          <select class="editStatus">
            <option value="To Do" ${(!task.status || task.status === 'To Do') ? 'selected' : ''}>To Do</option>
            <option value="In Progress" ${task.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option value="Completed" ${task.status === 'Completed' ? 'selected' : ''}>Completed</option>
          </select>
        </div>

        <div style="margin-top:10px;">
          <button class="saveBtn">Save</button>
          <button class="cancelBtn" style="margin-left:6px;">Cancel</button>
        </div>
      `;

      // Button wiring
      const editBtn = view.querySelector('.editBtn');
      const delBtn = view.querySelector('.delBtn');
      const saveBtn = edit.querySelector('.saveBtn');
      const cancelBtn = edit.querySelector('.cancelBtn');

      editBtn.addEventListener('click', () => {
        view.style.display = 'none';
        edit.style.display = 'block';
      });

      cancelBtn.addEventListener('click', () => {
        edit.style.display = 'none';
        view.style.display = 'block';
      });

      delBtn.addEventListener('click', async () => {
        const ok = confirm('Are you sure you want to delete this task?');
        if (!ok) return;

        try {
          const r = await fetch(`/api/tasks/${task._id}`, { method: 'DELETE' });
          const t = await r.text();
          let d;
          try { d = JSON.parse(t); } catch { d = {}; }

          if (!r.ok) {
            showMessage('errorMsg', d?.message || 'Delete failed', 'red');
            return;
          }

          showMessage('successMsg', 'Task deleted', 'green');
          loadTasks();
        } catch {
          showMessage('errorMsg', 'Error while deleting', 'red');
        }
      });

      saveBtn.addEventListener('click', async () => {
        const newTitle = edit.querySelector('.editTitle').value.trim();
        const newCategory = edit.querySelector('.editCategory').value.trim();
        const newPriority = edit.querySelector('.editPriority').value;
        const newDueDate = edit.querySelector('.editDueDate').value; // yyyy-mm-dd or ""
        const newStatus = edit.querySelector('.editStatus').value;

        if (!newTitle || newTitle.length < 3) {
          showMessage('errorMsg', 'Title must be at least 3 characters.', 'red');
          return;
        }

        try {
          const r = await fetch(`/api/tasks/${task._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: newTitle,
              category: newCategory || 'General',
              priority: newPriority,
              dueDate: newDueDate || '',
              status: newStatus
            })
          });

          const t = await r.text();
          let d;
          try { d = JSON.parse(t); } catch { d = {}; }

          if (!r.ok) {
            showMessage('errorMsg', d?.message || 'Update failed', 'red');
            return;
          }

          showMessage('successMsg', 'Task updated', 'green');
          loadTasks();
        } catch {
          showMessage('errorMsg', 'Error while updating', 'red');
        }
      });

      card.appendChild(view);
      card.appendChild(edit);
      taskList.appendChild(card);
    });

  } catch (err) {
    showMessage('errorMsg', `Error while loading tasks: ${err.message}`, 'red');
  }
}

/**
 * Wire up dropdown change events
 */
function initFilterSortEvents() {
  ['statusFilter', 'priorityFilter', 'dateFilter', 'sortBy', 'sortOrder'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', loadTasks);
  });
}
