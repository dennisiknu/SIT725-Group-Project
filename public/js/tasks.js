const taskList = document.getElementById('taskList');
const msg = document.getElementById('msg');

function setMsg(text, color = '') {
  msg.textContent = text;
  msg.style.color = color;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  // year month day formate convert
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function loadTasks() {
  setMsg('');
  taskList.innerHTML = '';

  try {
    const res = await fetch('/api/tasks');
    const data = await res.json();

    if (!res.ok) {
      setMsg(data?.message || 'Failed to load tasks', 'red');
      return;
    }

    if (!data.length) {
      setMsg('No tasks yet.');
      return;
    }

    data.forEach((task) => {
      const card = document.createElement('div');
      card.style.border = '1px solid #ccc';
      card.style.padding = '10px';
      card.style.marginBottom = '10px';

      const view = document.createElement('div');
      view.innerHTML = `
        <strong>${task.title}</strong>
        <div>Category: ${task.category || 'General'}</div>
        <div>Priority: ${task.priority || 'Medium'}</div>
        <div>Due: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}</div>
        <div>Status: ${task.status || 'Pending'}</div>
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
          <input type="text" class="editTitle" value="${task.title.replaceAll('"', '&quot;')}" />
        </div>

        <div style="margin-top:8px;">
          <label>Category</label><br/>
          <input type="text" class="editCategory" value="${(task.category || 'General').replaceAll('"', '&quot;')}" />
        </div>

        <div style="margin-top:8px;">
          <label>Priority</label><br/>
          <select class="editPriority">
            <option value="Low" ${task.priority === 'Low' ? 'selected' : ''}>Low</option>
            <option value="Medium" ${!task.priority || task.priority === 'Medium' ? 'selected' : ''}>Medium</option>
            <option value="High" ${task.priority === 'High' ? 'selected' : ''}>High</option>
          </select>
        </div>

        <div style="margin-top:8px;">
          <label>Due Date</label><br/>
          <input type="date" class="editDueDate" value="${formatDate(task.dueDate)}" />
        </div>

        <div style="margin-top:8px;">
          <label>Status</label><br/>
          <select class="editStatus">
            <option value="Pending" ${!task.status || task.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Completed" ${task.status === 'Completed' ? 'selected' : ''}>Completed</option>
          </select>
        </div>

        <div style="margin-top:10px;">
          <button class="saveBtn">Save</button>
          <button class="cancelBtn" style="margin-left:6px;">Cancel</button>
        </div>
      `;

      // buttons
      const editBtn = view.querySelector('.editBtn');
      const delBtn = view.querySelector('.delBtn');

      editBtn.addEventListener('click', () => {
        view.style.display = 'none';
        edit.style.display = 'block';
      });

      delBtn.addEventListener('click', async () => {
        const ok = confirm('Are you sure you want to delete this task?');
        if (!ok) return;

        try {
          const r = await fetch(`/api/tasks/${task._id}`, { method: 'DELETE' });
          const d = await r.json();

          if (!r.ok) {
            setMsg(d?.message || 'Delete failed', 'red');
            return;
          }

          setMsg('Task deleted ', 'green');
          loadTasks();
        } catch (err) {
          setMsg('Error while deleting', 'red');
        }
      });

      const saveBtn = edit.querySelector('.saveBtn');
      const cancelBtn = edit.querySelector('.cancelBtn');

      cancelBtn.addEventListener('click', () => {
        edit.style.display = 'none';
        view.style.display = 'block';
      });

      saveBtn.addEventListener('click', async () => {
        const newTitle = edit.querySelector('.editTitle').value.trim();
        const newCategory = edit.querySelector('.editCategory').value.trim();
        const newPriority = edit.querySelector('.editPriority').value;
        const newDueDate = edit.querySelector('.editDueDate').value; // yyyy-mm-dd or ""
        const newStatus = edit.querySelector('.editStatus').value;

        if (!newTitle || newTitle.length < 3) {
          setMsg('Title must be at least 3 characters.', 'red');
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

          const d = await r.json();

          if (!r.ok) {
            setMsg(d?.message || 'Update failed', 'red');
            return;
          }

          setMsg('Task updated', 'green');
          loadTasks();
        } catch (err) {
          setMsg('Error while updating', 'red');
        }
      });

      card.appendChild(view);
      card.appendChild(edit);
      taskList.appendChild(card);
    });

  } catch (err) {
    setMsg('Error while loading tasks.', 'red');
  }
}

loadTasks();
