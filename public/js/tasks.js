const taskList = document.getElementById('taskList');
const msg = document.getElementById('msg');

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

async function loadTasks() {
  msg.textContent = '';
  taskList.innerHTML = '';

  try {
    const res = await fetch('/api/tasks');
    const data = await res.json();

    if (!res.ok) {
      msg.style.color = 'red';
      msg.textContent = data?.message || 'Failed to load tasks';
      return;
    }

    if (!data.length) {
      msg.style.color = '';
      msg.textContent = 'No tasks yet.';
      return;
    }

    data.forEach((task) => {
      const li = document.createElement('li');

      li.innerHTML = `
        <strong>${task.title}</strong>
        <div>Category: ${task.category || 'General'}</div>
        <div>Priority: ${task.priority || 'Medium'}</div>
        <div>Due: ${formatDate(task.dueDate)}</div>
        <div>Status: ${task.status || 'Pending'}</div>
        <hr />
      `;

      taskList.appendChild(li);
    });

  } catch (err) {
    msg.style.color = 'red';
    msg.textContent = 'Error while loading tasks.';
  }
}

loadTasks();
