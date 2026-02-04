// public/js/createtask.js
const form = document.getElementById('taskForm');
const msg = document.getElementById('msg');

const templateSelect = document.getElementById('templateSelect');
let templates = [];

function setMsg(text, color = '') {
  msg.textContent = text;
  msg.style.color = color || '';
}

function formatDateInputValue(date) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function fillFromTemplate(tpl) {
  if (!tpl) return;

  const titleEl = document.getElementById('title');
  const categoryEl = document.getElementById('category');
  const priorityEl = document.getElementById('priority');
  const dueDateEl = document.getElementById('dueDate');
  const statusEl = document.getElementById('status');

  if (tpl.title) titleEl.value = tpl.title;
  categoryEl.value = tpl.category || 'General';
  priorityEl.value = tpl.priority || 'Medium';
  statusEl.value = tpl.status || 'Pending';
  dueDateEl.value = formatDateInputValue(tpl.dueDate);

  setMsg(`Template applied: ${tpl.name}`, 'green');
}

async function loadTemplates() {
  if (!templateSelect) return;

  try {
    const res = await fetch('/api/templates');
    const data = await res.json();
    if (!res.ok) return;

    templates = Array.isArray(data) ? data : [];

    templateSelect.innerHTML =
      `<option value="">— None —</option>` +
      templates.map(t => `<option value="${t._id}">${t.name}</option>`).join('');

    // auto-apply if opened via "Use" button
    const params = new URLSearchParams(window.location.search);
    const tid = params.get('template');
    if (tid) {
      templateSelect.value = tid;
      const found = templates.find(t => String(t._id) === String(tid));
      if (found) fillFromTemplate(found);
    }
  } catch (err) {
    // ignore
  }
}

templateSelect?.addEventListener('change', () => {
  setMsg('');
  const id = templateSelect.value;
  const found = templates.find(t => String(t._id) === String(id));
  if (found) fillFromTemplate(found);
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  setMsg('');

  const title = document.getElementById('title').value.trim();
  const category = document.getElementById('category').value.trim();
  const priority = document.getElementById('priority').value;
  const dueDate = document.getElementById('dueDate').value;
  const status = document.getElementById('status').value;

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
      return;
    }

    setMsg('Task created successfully ', 'green');
    form.reset();

    // keep defaults
    document.getElementById('priority').value = 'Medium';
    document.getElementById('status').value = 'Pending';
    if (templateSelect) templateSelect.value = '';
  } catch (err) {
    setMsg('Error. Please try again.', 'red');
  }
});

loadTemplates();
