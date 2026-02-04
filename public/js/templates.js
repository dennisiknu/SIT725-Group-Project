const listEl = document.getElementById('templatesList');
const emptyEl = document.getElementById('templatesEmpty');
const refreshBtn = document.getElementById('refreshTemplatesBtn');

const form = document.getElementById('templateForm');
const msg = document.getElementById('tplMsg');

const tplName = document.getElementById('tplName');
const tplTitle = document.getElementById('tplTitle');
const tplCategory = document.getElementById('tplCategory');
const tplDueDate = document.getElementById('tplDueDate');
const tplPriority = document.getElementById('tplPriority');
const tplStatus = document.getElementById('tplStatus');

let templates = [];

function setMsg(text, color = '') {
  msg.textContent = text;
  msg.style.color = color || '';
}

function escapeHtml(s) {
  return String(s || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString();
}

function templateCardHTML(t) {
  return `
    <div class="taskCard">
      <div class="taskTop">
        <div>
          <div class="taskTitle">${escapeHtml(t.name)}</div>
          <div class="taskMeta">
            <span class="chip">${escapeHtml(t.category || 'General')}</span>
            <span class="chip">${escapeHtml(t.priority || 'Medium')}</span>
            <span class="chip">${escapeHtml(t.status || 'Pending')}</span>
            <span class="chip">Due: ${escapeHtml(fmtDate(t.dueDate))}</span>
          </div>
          ${t.title ? `<div class="taskDesc" style="margin-top:6px;">${escapeHtml(t.title)}</div>` : ''}
        </div>

        <div style="display:flex; gap:8px; align-items:center;">
          <button class="btn btnSecondary" data-use="${t._id}">Use</button>
          <button class="btn btnDanger" data-del="${t._id}">Delete</button>
        </div>
      </div>
    </div>
  `;
}

function render() {
  if (!templates.length) {
    listEl.innerHTML = '';
    emptyEl.style.display = 'block';
    return;
  }
  emptyEl.style.display = 'none';
  listEl.innerHTML = templates.map(templateCardHTML).join('');
}

async function loadTemplates() {
  setMsg('');
  try {
    const res = await fetch('/api/templates');
    const data = await res.json();

    if (!res.ok) {
      setMsg(data?.message || 'Failed to load templates. Login first.', 'red');
      templates = [];
      render();
      return;
    }

    templates = Array.isArray(data) ? data : [];
    render();
  } catch (err) {
    setMsg('Network error while loading templates.', 'red');
  }
}

async function createTemplate(payload) {
  const res = await fetch('/api/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  return { res, data };
}

async function deleteTemplate(id) {
  const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
  const data = await res.json();
  return { res, data };
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  setMsg('');

  const name = tplName.value.trim();
  if (!name || name.length < 2) {
    setMsg('Template name must be at least 2 characters.', 'red');
    return;
  }

  const payload = {
    name,
    title: tplTitle.value.trim(),
    category: tplCategory.value.trim() || 'General',
    priority: tplPriority.value,
    status: tplStatus.value,
    dueDate: tplDueDate.value || undefined
  };

  try {
    const { res, data } = await createTemplate(payload);

    if (!res.ok) {
      setMsg(data?.message || 'Failed to create template', 'red');
      return;
    }

    setMsg('Template saved', 'green');
    form.reset();
    tplPriority.value = 'Medium';
    tplStatus.value = 'Pending';

    await loadTemplates();
  } catch (err) {
    setMsg('Network error while creating template.', 'red');
  }
});

listEl.addEventListener('click', async (e) => {
  const useBtn = e.target.closest('[data-use]');
  const delBtn = e.target.closest('[data-del]');

  if (useBtn) {
    const id = useBtn.getAttribute('data-use');
    window.location.href = `/createtask.html?template=${encodeURIComponent(id)}`;
    return;
  }

  if (delBtn) {
    const id = delBtn.getAttribute('data-del');
    if (!confirm('Delete this template?')) return;

    try {
      const { res, data } = await deleteTemplate(id);
      if (!res.ok) {
        setMsg(data?.message || 'Failed to delete template', 'red');
        return;
      }
      setMsg('Template deleted.', 'green');
      await loadTemplates();
    } catch (err) {
      setMsg('Network error while deleting template.', 'red');
    }
  }
});

refreshBtn.addEventListener('click', loadTemplates);

loadTemplates();
