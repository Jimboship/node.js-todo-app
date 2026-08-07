const form = document.getElementById('todo-form');
const input = document.getElementById('todo-input');
const dateInput = document.getElementById('todo-date');
const addBtn = document.getElementById('todo-add');
const messageBox = document.getElementById('form-message');
const viewTasksButton = document.querySelector('.view-tasks');
const currentDayEl = document.getElementById('current-day');
const weekNav = document.getElementById('week-nav');
const drawer = document.getElementById('left-drawer');
const drawerOverlay = document.getElementById('drawer-overlay');
const moreBtn = document.getElementById('more-btn');
const drawerClose = document.getElementById('drawer-close');
const drawerDays = document.getElementById('drawer-days');
const weekSnapshot = document.getElementById('week-snapshot');
const drawerDayName = document.getElementById('drawer-dayname');
const drawerNotes = document.getElementById('drawer-notes');
const drawerTaskCount = document.getElementById('drawer-task-count');
const notesTitle = document.getElementById('notes-title');
const dayNotes = document.getElementById('day-notes');
const darkToggle = document.getElementById('dark-toggle');
const filterBtns = document.querySelectorAll('.filter-btn');
const clearFilteredBtn = document.getElementById('clear-filtered');
const sectionToggleButtons = document.querySelectorAll('.collapse-toggle');

const sectionLists = document.querySelectorAll('.section-list');

let state = {
  selectedDate: normalizeDate(new Date()),
  tasks: loadFromStorage('tasks') || [],
  notes: loadFromStorage('notes') || {},
  filter: loadFromStorage('filter') || 'all',
  dark: loadFromStorage('dark') === true || loadFromStorage('dark') === 'true',
  collapsed: loadFromStorage('collapsed') || { morning:false, afternoon:false, evening:false, night:false },
};

function saveState() {
  localStorage.setItem('tasks', JSON.stringify(state.tasks));
  localStorage.setItem('notes', JSON.stringify(state.notes));
  localStorage.setItem('filter', state.filter);
  localStorage.setItem('dark', state.dark);
}

function setMessage(message, type = '') {
  if (!messageBox) return;
  messageBox.textContent = message;
  messageBox.className = `form-message${type ? ` ${type}` : ''}`;
}

function normalizeDate(d) {
  const dt = new Date(d);
  dt.setHours(0,0,0,0);
  return dt.toISOString().slice(0,10);
}

function formatDateReadable(isoDate) {
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatTime(t) {
  if (!t) return '';
  return t;
}

function loadFromStorage(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

function getWeekDates(forDate) {
  const d = new Date(forDate);
  const day = d.getDay();
  const mondayDiff = (day + 6) % 7; // days since Monday
  const monday = new Date(d);
  monday.setDate(d.getDate() - mondayDiff);
  const days = [];
  for (let i=0;i<7;i++){
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    days.push(normalizeDate(dd));
  }
  return days;
}

function renderCurrentDay() {
  currentDayEl.textContent = formatDateReadable(state.selectedDate);
  notesTitle.textContent = `Notes for ${new Date(state.selectedDate).toLocaleDateString(undefined,{ weekday:'long' })}`;
}

function renderWeekNav() {
  const days = getWeekDates(state.selectedDate);
  weekNav.innerHTML = '';
  days.forEach(d => {
    const btn = document.createElement('button');
    btn.className = 'day-pill';
    btn.textContent = new Date(d).toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' });
    if (d === state.selectedDate) btn.classList.add('active');
    btn.addEventListener('click', () => { state.selectedDate = d; renderAll(); });
    weekNav.appendChild(btn);
  });
}

function tasksForDate(d) {
  return state.tasks.filter(t => t.date === d);
}

function sortTasks(a,b){
  if (!a.time) return 1;
  if (!b.time) return -1;
  return a.time.localeCompare(b.time);
}

function renderSections() {
  const lists = document.querySelectorAll('.section-list');
  lists.forEach(ul => ul.innerHTML='');
  let tasks = tasksForDate(state.selectedDate).slice().sort(sortTasks);
  // apply filter
  if (state.filter === 'completed') tasks = tasks.filter(t => t.completed);
  if (state.filter === 'pending') tasks = tasks.filter(t => !t.completed);
  const morning = tasks.filter(t => t.time && t.time >= '05:00' && t.time < '12:00');
  const afternoon = tasks.filter(t => t.time && t.time >= '12:00' && t.time < '17:00');
  const evening = tasks.filter(t => t.time && t.time >= '17:00' && t.time < '20:00');
  const night = tasks.filter(t => t.time && t.time >= '20:00' && t.time <= '23:59');
  const noTime = tasks.filter(t => !t.time);

  const append = (list, items) => {
    items.forEach((task) => {
      const li = document.createElement('li');
      const isOverdue = new Date(task.date) < new Date(normalizeDate(new Date()));
      li.className = `${task.completed ? 'completed' : ''} ${isOverdue && !task.completed ? 'overdue' : ''}`;
      li.innerHTML = `<div><label><input type="checkbox" class="task-complete" data-id="${task.id}" ${task.completed? 'checked':''}/> 
      <span class="time">${task.time||''}</span><span class="task-name">${escapeHtml(task.name)}</span>
      </label></div><div>
      <button data-id="${task.id}" class="delete-btn">Delete</button></div>`;
      list.appendChild(li);
    });
  }

  const morningUl = document.querySelector('.section-list[data-section="morning"]');
  const afternoonUl = document.querySelector('.section-list[data-section="afternoon"]');
  const eveningUl = document.querySelector('.section-list[data-section="evening"]');
  const nightUl = document.querySelector('.section-list[data-section="night"]');

  append(morningUl, morning);
  append(afternoonUl, afternoon.concat(noTime));
  append(eveningUl, evening);
  append(nightUl, night);

  // wire delete buttons
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const t = state.tasks.find(x => x.id === id);
      const isOverdue = t && new Date(t.date) < new Date(normalizeDate(new Date()));
      if (isOverdue && !t.completed) {
        if (!confirm('This task is overdue. Are you sure you want to delete it?')) return;
      }
      state.tasks = state.tasks.filter(t => t.id !== id);
      saveState(); renderAll();
    });
  });
  // wire complete toggles
  document.querySelectorAll('.task-complete').forEach(cb => {
    cb.addEventListener('change', () => {
      const id = cb.dataset.id;
      const t = state.tasks.find(x => x.id === id);
      if (t) { t.completed = cb.checked; saveState(); renderAll(); }
    });
  });
}

function renderNotes() {
  dayNotes.value = state.notes[state.selectedDate] || '';
  drawerNotes.value = state.notes[state.selectedDate] || '';
}

function renderSectionCollapseState() {
  sectionToggleButtons.forEach(btn => {
    const section = btn.closest('.time-section');
    if (!section) return;
    const name = section.dataset.section;
    const collapsed = state.collapsed[name] === true;
    section.classList.toggle('collapsed', collapsed);
    btn.textContent = collapsed ? '▶' : '▼';
    btn.setAttribute('aria-expanded', String(!collapsed));
    btn.setAttribute('aria-label', `${collapsed ? 'Expand' : 'Collapse'} ${name} tasks`);
  });
}

sectionToggleButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const section = btn.closest('.time-section');
    if (!section) return;
    const name = section.dataset.section;
    state.collapsed[name] = !state.collapsed[name];
    saveState();
    renderSectionCollapseState();
  });
});

function renderDrawer() {
  drawerDayName.textContent = new Date(state.selectedDate).toLocaleDateString(undefined,{ weekday:'long' });
  drawerTaskCount.textContent = `${tasksForDate(state.selectedDate).length} tasks planned for today`;

  // drawer days
  drawerDays.innerHTML = '';
  const days = getWeekDates(state.selectedDate);
  days.forEach(d => {
    const b = document.createElement('button');
    b.textContent = new Date(d).toLocaleDateString(undefined,{ weekday:'short' });
    if (d === state.selectedDate) b.classList.add('active');
    b.addEventListener('click', () => { state.selectedDate = d; renderAll(); closeDrawer(); });
    drawerDays.appendChild(b);
  });

  // week snapshot
  weekSnapshot.innerHTML = '';
  days.forEach(d => {
    const dayTasks = state.tasks.filter(t => t.date === d);
    const morningCount = dayTasks.filter(t => t.time && t.time >= '05:00' && t.time < '12:00').length;
    const afternoonCount = dayTasks.filter(t => t.time && t.time >= '12:00' && t.time < '17:00').length;
    const eveningCount = dayTasks.filter(t => t.time && t.time >= '17:00' && t.time < '20:00').length;
    const nightCount = dayTasks.filter(t => t.time && t.time >= '20:00' && t.time <= '23:59').length;
    const el = document.createElement('div');
    el.style.marginBottom = '8px';
    el.innerHTML = `<strong>${new Date(d).toLocaleDateString(undefined,{ weekday:'short' })}</strong>: ${dayTasks.length} total — M:${morningCount} A:${afternoonCount} E:${eveningCount} N:${nightCount}`;
    weekSnapshot.appendChild(el);
  });
}

function renderAll() {
  renderCurrentDay();
  renderWeekNav();
  renderSections();
  renderSectionCollapseState();
  renderNotes();
  renderDrawer();
}

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function openDrawer(){ drawer.classList.add('open'); drawerOverlay.classList.remove('hidden'); drawer.classList.remove('hidden'); drawerOverlay.classList.remove('hidden'); }
function closeDrawer(){ drawer.classList.remove('open'); drawerOverlay.classList.add('hidden'); setTimeout(()=>drawer.classList.add('hidden'),300); }

// Initialize inputs
dateInput.value = state.selectedDate;

addBtn.addEventListener('click', () => {
  const name = input.value.trim();
  const date = dateInput.value || state.selectedDate;
  if (!name) { setMessage('Please enter a task first.', 'error'); return; }
  const id = Math.random().toString(36).slice(2,9);
  state.tasks.push({ id, name, date: normalizeDate(date), time: '' });
  saveState(); input.value=''; renderAll(); setMessage('Task added', 'success');
});

// Section add buttons
document.querySelectorAll('.section-form').forEach(form => {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const section = form.dataset.section;
    const time = form.querySelector('.section-time').value;
    const name = form.querySelector('.section-input').value.trim();
    if (!name) { setMessage('Please enter a task first.', 'error'); return; }
    const id = Math.random().toString(36).slice(2,9);
    state.tasks.push({ id, name, date: state.selectedDate, time: time || '' });
    form.querySelector('.section-input').value=''; form.querySelector('.section-time').value='';
    saveState(); renderAll(); setMessage('Task added', 'success');
  });
});

// Notes
dayNotes.addEventListener('input', () => { state.notes[state.selectedDate] = dayNotes.value; saveState(); renderDrawer(); });
drawerNotes.addEventListener('input', () => { state.notes[state.selectedDate] = drawerNotes.value; saveState(); renderNotes(); });

// Drawer toggles
moreBtn.addEventListener('click', openDrawer);
drawerClose.addEventListener('click', closeDrawer);
drawerOverlay.addEventListener('click', closeDrawer);

// View tasks toggle weekly nav
viewTasksButton.addEventListener('click', () => {
  weekNav.classList.toggle('hidden');
});

// initial render
renderAll();

// apply saved dark mode
function applyDark() {
  if (state.dark) document.body.classList.add('dark'); else document.body.classList.remove('dark');
  if (darkToggle) darkToggle.textContent = state.dark ? '☀️' : '🌙';
}
applyDark();

// filter buttons
function updateFilterUI(){
  filterBtns.forEach(b => b.classList.toggle('active', b.dataset.filter === state.filter));
}
updateFilterUI();

filterBtns.forEach(b => b.addEventListener('click', () => {
  state.filter = b.dataset.filter; saveState(); updateFilterUI(); renderAll();
}));

if (clearFilteredBtn) {
  clearFilteredBtn.addEventListener('click', () => {
    const toRemove = tasksForDate(state.selectedDate).filter(t => {
      if (state.filter === 'completed') return t.completed;
      if (state.filter === 'pending') return !t.completed;
      return true;
    });
    if (!toRemove.length) { alert('No tasks to clear for this filter'); return; }
    const hasOverdue = toRemove.some(t => new Date(t.date) < new Date(normalizeDate(new Date())) && !t.completed);
    if (hasOverdue) {
      if (!confirm('Some tasks are overdue. Are you sure you want to delete the filtered tasks?')) return;
    } else {
      if (!confirm(`Delete ${toRemove.length} tasks for this filter?`)) return;
    }
    const ids = new Set(toRemove.map(t=>t.id));
    state.tasks = state.tasks.filter(t => !ids.has(t.id));
    saveState(); renderAll();
  });
}

if (darkToggle) darkToggle.addEventListener('click', () => { state.dark = !state.dark; saveState(); applyDark(); });

//show the tasks or hide
document