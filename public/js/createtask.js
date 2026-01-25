const form = document.getElementById('taskForm');
const msg = document.getElementById('msg');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.textContent = '';
  msg.style.color = '';

  const title = document.getElementById('title').value.trim();
  const category = document.getElementById('category').value.trim();
  const priority = document.getElementById('priority').value;
  const dueDate = document.getElementById('dueDate').value; // year month date

  try {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        category: category || undefined,
        priority,
        dueDate: dueDate || undefined
      })
    });

    const data = await res.json();

    if (!res.ok) {
      msg.style.color = 'red';
      msg.textContent = data?.message || 'Failed to create task';

      if (Array.isArray(data?.errors) && data.errors.length) {
        msg.textContent += ' — ' + data.errors.join(' ');
      }
      return;
    }

    msg.style.color = 'green';
    msg.textContent = 'Task created successfully ';
    form.reset();

    // it's optional- we can remove that but it will auto redirect after 1 sec to tasks
/*    setTimeout(() => {
      window.location.href = '/tasks.html';
    }, 800); */

  } catch (err) {
    msg.style.color = 'red';
    msg.textContent = 'Network or server error. Please try again.';
  }
});
