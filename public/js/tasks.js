const pendingList = document.getElementById('pendingList');
const completedList = document.getElementById('completedList');

const pendingCount = document.getElementById('pendingCount');
const completedCount = document.getElementById('completedCount');
const statOverdue = document.getElementById('statOverdue');

const refreshBtn = document.getElementById('refreshBtn');

const searchInput = document.getElementById('searchInput');
const filterStatus = document.getElementById('filterStatus');
const filterPriority = document.getElementById('filterPriority');
const sortBy = document.getElementById('sortBy');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');

const qaTitle = document.getElementById('qaTitle');
const qaCategory = document.getElementById('qaCategory');
const qaPriority = document.getElementById('qaPriority');
const qaStatus = document.getElementById('qaStatus');
const qaDue = document.getElementById('qaDue');
const qaAddBtn = document.getElementById('qaAddBtn');

const statTotal = document.getElementById('statTotal');
const statDone = document.getElementById('statDone');
const statTodo = document.getElementById('statTodo');

// Toast (msg)
const toast = document.getElementById('msg');
const toastTitle = document.getElementById('toastTitle');
const toastBody = document.getElementById('toastBody');

// Edit modal
const editOverlay = document.getElementById('editOverlay');
const editCloseBtn = document.getElementById('editCloseBtn');
const editCancelBtn = document.getElementById('editCancelBtn');
const editSaveBtn = document.getElementById('editSaveBtn');

const editId = document.getElementById('editId');
const editTitle = document.getElementById('editTitle');
const editCategory = document.getElementById('editCategory');
const editDueDate = document.getElementById('editDueDate');
const editPriority = document.getElementById('editPriority');
const editStatus = document.getElementById('editStatus');

// ------- State ----------
let allTasks = [];

// ---------- Helpers -------
function escapeHtml(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDateInputValue(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDatePretty(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

function getPriorityPill(priority) {
  const p = (priority || 'Medium').toLowerCase();
  if (p === 'high') return { cls: 'pillRed', label: 'High' };
  if (p === 'low') return { cls: 'pillGreen', label: 'Low' };
  return { cls: 'pillAmber', label: 'Medium' };
}

function getStatusPill(status) {
  const s = status || 'Pending';
  if (s === 'Completed') return { cls: 'pillGreen', label: 'Completed' };
  return { cls: 'pillBlue', label: 'Pending' };
}

let toastTimer = null;
function showToast(title, body = '', type = 'success') {
  if (!toast) return;

  toast.classList.remove('success', 'error', 'show');
  toast.classList.add(type === 'error' ? 'error' : 'success', 'show');

  toastTitle.textContent = title;
  toastBody.textContent = body;

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

function setLoading(isLoading) {
  if (refreshBtn) {
    refreshBtn.disabled = isLoading;
    refreshBtn.textContent = isLoading ? 'Refreshing…' : 'Refresh';
  }
  if (qaAddBtn) {
    qaAddBtn.disabled = isLoading;
  }
}

function isOverdue(task) {
  if (!task?.dueDate) return false;
  if ((task?.status || 'Pending') === 'Completed') return false;
  const d = new Date(task.dueDate);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

// ----- Rendering ----------
function applyFilters(tasks) {
  const q = (searchInput?.value || '').trim().toLowerCase();
  const statusVal = filterStatus?.value || 'All';
  const priorityVal = filterPriority?.value || 'All';
  const sortVal = sortBy?.value || 'Newest';

  let filtered = [...tasks];

  if (q) {
    filtered = filtered.filter(t => {
      const title = (t.title || '').toLowerCase();
      const cat = (t.category || '').toLowerCase();
      return title.includes(q) || cat.includes(q);
    });
  }

  if (statusVal !== 'All') {
    filtered = filtered.filter(t => (t.status || 'Pending') === statusVal);
  }

  if (priorityVal !== 'All') {
    filtered = filtered.filter(t => (t.priority || 'Medium') === priorityVal);
  }

  if (sortVal === 'Title') {
    filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  } else if (sortVal === 'DueSoon') {
    filtered.sort((a, b) => {
      const ad = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
      const bd = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
      return ad - bd;
    });
  } else {
    filtered.sort((a, b) => {
      const ac = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bc = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (ac && bc) return bc - ac;
      return String(b._id || '').localeCompare(String(a._id || ''));
    });
  }

  return filtered;
}

function taskCardHTML(task) {
  const title = escapeHtml(task.title || '');
  const category = escapeHtml(task.category || 'General');
  const duePretty = formatDatePretty(task.dueDate);

  const pr = getPriorityPill(task.priority);
  const st = getStatusPill(task.status);

  const overdue = isOverdue(task);

  const overduePill = overdue
    ? `<span class="pill pillRed">Overdue</span>`
    : '';

  const descText = category ? `Category: ${category}` : 'Category: General';

  return `
    <article class="card" data-id="${escapeHtml(task._id)}">
      <div class="cardTitle">${title}</div>

      <div class="cardMeta">
        <span>Due: ${escapeHtml(duePretty)}</span>
      </div>

      <div class="cardDesc">${descText}</div>

      <div class="pills">
        <span class="pill ${pr.cls}">Priority: ${escapeHtml(pr.label)}</span>
        <span class="pill ${st.cls}">${escapeHtml(st.label)}</span>
        ${overduePill}
      </div>

      <div class="cardActions">
        <button class="btn btnIcon js-edit" type="button" title="Edit">
          ${icons.pencil}
        </button>
        <button class="btn btnIcon js-delete" type="button" title="Delete">
          ${icons.trash}
        </button>
      </div>
    </article>
  `;
}

function render(tasks) {
  const filtered = applyFilters(tasks);

  const overdueAll = tasks.filter(isOverdue).length;
  const pending = filtered.filter(t => (t.status || 'Pending') !== 'Completed');
  const completed = filtered.filter(t => (t.status || 'Pending') === 'Completed');

  const totalAll = tasks.length;
  const doneAll = tasks.filter(t => (t.status || 'Pending') === 'Completed').length;
  const todoAll = totalAll - doneAll;

  statTotal.textContent = String(totalAll);
  statDone.textContent = String(doneAll);
  statTodo.textContent = String(todoAll);
  statOverdue.textContent = String(overdueAll);

  pendingCount.textContent = `${pending.length} task${pending.length === 1 ? '' : 's'}`;
  completedCount.textContent = `${completed.length} task${completed.length === 1 ? '' : 's'}`;

  pendingList.innerHTML = pending.length
    ? pending.map(taskCardHTML).join('')
    : `<div class="empty">No matching pending tasks. Try clearing filters or adding a new task.</div>`;

  completedList.innerHTML = completed.length
    ? completed.map(taskCardHTML).join('')
    : `<div class="empty">No matching completed tasks yet.</div>`;
}

// ---------- APIs -----
async function loadTasks() {
  setLoading(true);
  try {
    const res = await fetch('/api/tasks', { method: 'GET' });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(text.slice(0, 120));
    }

    if (!res.ok) {
      showToast('Could not load tasks', data?.message || 'Please try again.', 'error');
      return;
    }

    allTasks = Array.isArray(data) ? data : [];
    render(allTasks);
  } catch (err) {
    showToast('Network error', 'Error while loading tasks.', 'error');
  } finally {
    setLoading(false);
  }
}

async function createTask(payload) {
  const res = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  return { res, data };
}

async function updateTask(id, payload) {
  const res = await fetch(`/api/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  return { res, data };
}

async function deleteTask(id) {
  const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
  const data = await res.json();
  return { res, data };
}

// ------- Modal ----------
function openEditModal(task) {
  editId.value = task._id;
  editTitle.value = task.title || '';
  editCategory.value = task.category || 'General';
  editDueDate.value = formatDateInputValue(task.dueDate);
  editPriority.value = task.priority || 'Medium';
  editStatus.value = task.status || 'Pending';

  editOverlay.classList.add('show');
  editOverlay.setAttribute('aria-hidden', 'false');

  setTimeout(() => editTitle.focus(), 50);
}

function closeEditModal() {
  editOverlay.classList.remove('show');
  editOverlay.setAttribute('aria-hidden', 'true');
}

editOverlay.addEventListener('click', (e) => {
  if (e.target === editOverlay) closeEditModal();
});

editCloseBtn.addEventListener('click', closeEditModal);
editCancelBtn.addEventListener('click', closeEditModal);

editSaveBtn.addEventListener('click', async () => {
  const id = editId.value;
  const newTitle = editTitle.value.trim();
  const newCategory = editCategory.value.trim();
  const newDue = editDueDate.value;
  const newPriority = editPriority.value;
  const newStatus = editStatus.value;

  if (!newTitle || newTitle.length < 3) {
    showToast('Title too short', 'Title must be at least 3 characters.', 'error');
    return;
  }

  setLoading(true);
  try {
    const { res, data } = await updateTask(id, {
      title: newTitle,
      category: newCategory || 'General',
      priority: newPriority,
      dueDate: newDue || undefined,
      status: newStatus
    });

    if (!res.ok) {
      showToast('Update failed', data?.message || 'Please try again.', 'error');
      return;
    }

    showToast('Saved', 'Task updated successfully.', 'success');
    closeEditModal();
    await loadTasks();
  } catch (err) {
    showToast('Network error', 'Error while updating task.', 'error');
  } finally {
    setLoading(false);
  }
});

// --------- Events ----------
const rerender = () => render(allTasks);

if (searchInput) searchInput.addEventListener('input', rerender);
if (filterStatus) filterStatus.addEventListener('change', rerender);
if (filterPriority) filterPriority.addEventListener('change', rerender);
if (sortBy) sortBy.addEventListener('change', rerender);

if (clearFiltersBtn) {
  clearFiltersBtn.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    if (filterStatus) filterStatus.value = 'All';
    if (filterPriority) filterPriority.value = 'All';
    if (sortBy) sortBy.value = 'Newest';
    render(allTasks);
  });
}

if (refreshBtn) refreshBtn.addEventListener('click', loadTasks);

// ----- Quick Add ----------
if (qaAddBtn) {
  qaAddBtn.addEventListener('click', async () => {
    const title = qaTitle.value.trim();
    const category = qaCategory.value.trim();
    const priority = qaPriority.value;
    const status = qaStatus.value;
    const dueDate = qaDue.value;

    if (!title || title.length < 3) {
      showToast('Title required', 'Enter at least 3 characters.', 'error');
      return;
    }

    setLoading(true);
    try {
      const { res, data } = await createTask({
        title,
        category: category || 'General',
        priority,
        dueDate: dueDate || undefined,
        status
      });

      if (!res.ok) {
        const more = Array.isArray(data?.errors) && data.errors.length ? ` ${data.errors.join(' ')}` : '';
        showToast('Create failed', (data?.message || 'Could not create task.') + more, 'error');
        return;
      }

      showToast('Created', 'Task added.', 'success');
      qaTitle.value = '';
      qaCategory.value = '';
      qaPriority.value = 'Medium';
      qaStatus.value = 'Pending';
      qaDue.value = '';

      await loadTasks();
    } catch (err) {
      showToast('Network error', 'Error while creating task.', 'error');
    } finally {
      setLoading(false);
    }
  });
}

// ---------- Card actions------
document.addEventListener('click', async (e) => {
  const editBtn = e.target.closest('.js-edit');
  const delBtn = e.target.closest('.js-delete');
  if (!editBtn && !delBtn) return;

  const card = e.target.closest('.card');
  const id = card?.getAttribute('data-id');
  if (!id) return;

  const task = allTasks.find(t => String(t._id) === String(id));
  if (!task) return;

  if (editBtn) {
    openEditModal(task);
    return;
  }

  if (delBtn) {
    const ok = confirm('Delete this task? This will remove it from the database.');
    if (!ok) return;

    setLoading(true);
    try {
      const { res, data } = await deleteTask(id);
      if (!res.ok) {
        showToast('Delete failed', data?.message || 'Please try again.', 'error');
        return;
      }
      showToast('Deleted', 'Task removed.', 'success');
      await loadTasks();
    } catch (err) {
      showToast('Network error', 'Error while deleting task.', 'error');
    } finally {
      setLoading(false);
    }
  }
});

// close modal with ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && editOverlay && editOverlay.classList.contains('show')) {
    closeEditModal();
  }
});

// ---------- Icons -------
const icons = {
  pencil: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
    </svg>`,
  trash: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M3 6h18"/>
      <path d="M8 6V4h8v2"/>
      <path d="M19 6l-1 14H6L5 6"/>
      <path d="M10 11v6"/>
      <path d="M14 11v6"/>
    </svg>`
};

// ------- Start ----------
loadTasks();
