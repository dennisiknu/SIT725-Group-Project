// public/js/createtask.js
const form = document.getElementById('taskForm');
const msg = document.getElementById('msg');

function setMsg(text, color = '') {
  msg.textContent = text;
  msg.style.color = color || '';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  setMsg('');

  const title = document.getElementById('title').value.trim();
  const category = document.getElementById('category').value.trim();
  const priority = document.getElementById('priority').value;
  const dueDate = document.getElementById('dueDate').value;
  const status = document.getElementById('status').value; // required

  if (!title || title.length < 3) {
    setMsg('Title must be at least 3 characters.', 'red');
    return;
  }

  try {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        category: category || 'General',
        priority,
        dueDate: dueDate || undefined,
        status
      })
    });

    const data = await res.json();

    if (!res.ok) {
      setMsg(data?.message || 'Failed to create task', 'red');

      if (Array.isArray(data?.errors) && data.errors.length) {
        setMsg((data?.message || 'Failed to create task') + ' — ' + data.errors.join(' '), 'red');
      }
      return;
    }

    setMsg('Task created successfully. You can create another or go back to Tasks.', 'green');
    form.reset();

    // keep defaults
    document.getElementById('priority').value = 'Medium';
    document.getElementById('status').value = 'Pending';

  } catch (err) {
    setMsg('Error. Please try again.', 'red');
  }
});
