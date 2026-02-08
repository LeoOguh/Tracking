
// ─── MARKDOWN EDITOR HELPERS ──────────────────────────────────────────────────
function insertMd(before, after) {
    const ta  = document.getElementById('dEntryContent');
    const s   = ta.selectionStart, e = ta.selectionEnd;
    const sel = ta.value.substring(s, e);
    ta.value  = ta.value.substring(0, s) + before + sel + after + ta.value.substring(e);
    ta.selectionStart = s + before.length;
    ta.selectionEnd   = s + before.length + sel.length;
    ta.focus();
}

function toggleMdPreview() {
    const ta      = document.getElementById('dEntryContent');
    const preview = document.getElementById('dEntryPreview');
    const btn     = document.getElementById('dBtnPreview');
    const isShowing = !preview.classList.contains('hidden');
    if (isShowing) {
        preview.classList.add('hidden');
        ta.classList.remove('hidden');
        btn.textContent = '👁 prévia';
    } else {
        preview.innerHTML = parseMarkdown(ta.value);
        preview.classList.remove('hidden');
        ta.classList.add('hidden');
        btn.textContent = '✎ editar';
    }
}

// ─── TEMA ─────────────────────────────────────────────────────────────────────
let isLight = localStorage.getItem('clarity_theme') === 'light';
if (isLight) document.body.classList.add('light');
{ const _tb = document.getElementById('themeToggleBtn'); if (_tb) _tb.textContent = isLight ? '☾ escuro' : '☀ claro'; }
function toggleTheme() {
    isLight = !isLight; document.body.classList.toggle('light', isLight);
    localStorage.setItem('clarity_theme', isLight ? 'light' : 'dark');
    { const _tb = document.getElementById('themeToggleBtn'); if (_tb) _tb.textContent = isLight ? '☾ escuro' : '☀ claro'; }
}

// ─── ESTADO ───────────────────────────────────────────────────────────────────
let tasks        = JSON.parse(localStorage.getItem('clarity_tasks'))  || {};
// tasks = { 'YYYY-MM-DD': [{ id, text, done, priority, createdAt }] }

let diaryEntries = JSON.parse(localStorage.getItem('clarity_diary'))  || [];
// diaryEntries = [{ id, title, content, tag, createdAt, updatedAt }]

let taskDate      = new Date();   // data atual da lista de tarefas
let editingEntry  = null;         // id da entrada sendo editada (null = nova)

const monthNames = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const weekNames  = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];

// ─── UTILITÁRIOS ──────────────────────────────────────────────────────────────
function dateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
}
function todayKey() { return dateKey(new Date()); }
function saveTasks() { localStorage.setItem('clarity_tasks', JSON.stringify(tasks)); }
function saveDiary() { localStorage.setItem('clarity_diary', JSON.stringify(diaryEntries)); }
function fmtDate(isoStr) {
    const d = new Date(isoStr);
    return `${weekNames[d.getDay()]}, ${d.getDate()} de ${monthNames[d.getMonth()]} de ${d.getFullYear()}`;
}
function fmtDateShort(isoStr) {
    const d = new Date(isoStr);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

// ─── EXPORTAR ─────────────────────────────────────────────────────────────────
function exportNotas() {
    const data = { tasks, diaryEntries, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data,null,2)], { type:'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href=url; a.download=`clarity-notas-${todayKey()}.json`; a.click();
    URL.revokeObjectURL(url);
}

// ─── TOGGLE DE VISTA (focus mode) ─────────────────────────────────────────────
let activeView = 'both'; // 'both' | 'tasks' | 'diary'
function toggleView(view) {
    const container = document.getElementById('notasContainer');
    const colTasks  = document.getElementById('colTasks');
    const colDiary  = document.getElementById('colDiary');
    const btnT = document.getElementById('focusBtnTasks');
    const btnD = document.getElementById('focusBtnDiary');

    if (activeView === view) {
        // Volta para a vista dupla
        activeView = 'both';
        colTasks.classList.remove('hidden'); colDiary.classList.remove('hidden');
        container.classList.remove('focus-tasks','focus-diary');
        btnT.classList.remove('active'); btnD.classList.remove('active');
    } else {
        activeView = view;
        colTasks.classList.toggle('hidden', view === 'diary');
        colDiary.classList.toggle('hidden', view === 'tasks');
        container.classList.remove('focus-tasks','focus-diary');
        container.classList.add('focus-' + view);
        btnT.classList.toggle('active', view === 'tasks');
        btnD.classList.toggle('active', view === 'diary');
    }
}

// ─── NAVEGAÇÃO DE DATA (tarefas) ──────────────────────────────────────────────
function changeTaskDate(delta) {
    taskDate.setDate(taskDate.getDate() + delta);
    renderTasks();
}
function getTaskDateLabel() {
    const key   = dateKey(taskDate);
    const today = todayKey();
    const yest  = (() => { const d=new Date(); d.setDate(d.getDate()-1); return dateKey(d); })();
    const tom   = (() => { const d=new Date(); d.setDate(d.getDate()+1); return dateKey(d); })();
    if (key===today) return 'hoje';
    if (key===yest)  return 'ontem';
    if (key===tom)   return 'amanhã';
    return fmtDateShort(key+'T00:00:00');
}

// ─── TAREFAS ──────────────────────────────────────────────────────────────────
function addTask() {
    const input   = document.getElementById('taskInput');
    const priSel  = document.getElementById('taskPriority');
    const text    = input.value.trim();
    if (!text) return;
    const key = dateKey(taskDate);
    if (!tasks[key]) tasks[key] = [];
    tasks[key].push({ id: Date.now(), text, done: false, priority: priSel.value, createdAt: new Date().toISOString() });
    saveTasks();
    input.value = ''; priSel.value = 'normal';
    renderTasks();
}

function toggleTask(id) {
    const key = dateKey(taskDate);
    const t   = tasks[key]?.find(t => t.id === id);
    if (t) { t.done = !t.done; saveTasks(); renderTasks(); }
}

function deleteTask(id) {
    const key = dateKey(taskDate);
    if (!tasks[key]) return;
    tasks[key] = tasks[key].filter(t => t.id !== id);
    saveTasks(); renderTasks();
}

function renderTasks() {
    const key   = dateKey(taskDate);
    const list  = tasks[key] || [];
    const label = getTaskDateLabel();
    document.getElementById('taskDateLabel').textContent = label;

    // Progresso
    const total  = list.length;
    const done   = list.filter(t => t.done).length;
    const pct    = total > 0 ? Math.round((done/total)*100) : 0;
    const fill   = document.getElementById('tasksProgressFill');
    fill.style.width      = pct + '%';
    fill.style.background = pct === 100 ? '#2ecc71' : pct >= 60 ? '#f9ca24' : '#3498db';
    document.getElementById('tasksProgressLabel').textContent = `${done} / ${total}`;
    document.getElementById('tasksProgressWrap').style.display = total > 0 ? 'flex' : 'none';

    const el = document.getElementById('tasksList');
    if (!list.length) {
        el.innerHTML = `<div class="tasks-empty">nenhuma tarefa para ${label === 'hoje' ? 'hoje' : label}</div>`;
    } else {
        // Ordem: alta prioridade → normal → baixa; pendentes primeiro
        const sorted = [...list].sort((a,b) => {
            const pOrder = { high:0, normal:1, low:2 };
            if (a.done !== b.done) return a.done ? 1 : -1;
            return (pOrder[a.priority]||1) - (pOrder[b.priority]||1);
        });
        el.innerHTML = sorted.map(t => {
            const timeStr = t.createdAt ? (() => {
                const d = new Date(t.createdAt);
                return d.toLocaleTimeString('pt-br', { hour:'2-digit', minute:'2-digit' });
            })() : '';
            return `
            <div class="task-item ${t.done?'done':''}" id="task-${t.id}">
                <div class="task-checkbox ${t.done?'checked':''}" onclick="toggleTask(${t.id})"></div>
                <div class="task-priority-dot priority-${t.priority}"></div>
                <div class="task-body">
                    <span class="task-text">${escapeHtml(t.text)}</span>
                    ${timeStr ? `<span class="task-time">criado às ${timeStr}</span>` : ''}
                </div>
                <button class="task-del" onclick="deleteTask(${t.id})">✕</button>
            </div>`;
        }).join('');
    }

    // Stats
    const statsEl = document.getElementById('tasksStatsRow');
    if (!list.length) { statsEl.innerHTML = ''; return; }
    const highPending = list.filter(t=>!t.done&&t.priority==='high').length;
    statsEl.innerHTML = `
        <div class="task-stat-chip"><strong>${done}</strong> concluída${done!==1?'s':''}</div>
        <div class="task-stat-chip"><strong>${total-done}</strong> pendente${total-done!==1?'s':''}</div>
        ${highPending?`<div class="task-stat-chip" style="color:#e74c3c"><strong>${highPending}</strong> alta prioridade</div>`:''}
        <div class="task-stat-chip"><strong>${pct}%</strong> do dia</div>`;

    // Atualiza sub-título
    updatePageSub();
}

// ─── DIÁRIO ───────────────────────────────────────────────────────────────────
function openNewEntry() {
    editingEntry = null;
    document.getElementById('dEntryTitle').value   = '';
    document.getElementById('dEntryContent').value = '';
    document.getElementById('dEntryTag').value     = '';
    document.getElementById('dEntryDateLabel').textContent = fmtDate(new Date().toISOString());
    document.getElementById('dBtnDelete').style.display = 'none';
    document.getElementById('diaryModalOverlay').classList.add('open');
    setTimeout(() => document.getElementById('dEntryTitle').focus(), 100);
}

function openEntry(id) {
    const e = diaryEntries.find(e => e.id === id);
    if (!e) return;
    editingEntry = id;
    document.getElementById('dEntryTitle').value   = e.title;
    document.getElementById('dEntryContent').value = e.content;
    document.getElementById('dEntryTag').value     = e.tag || '';
    document.getElementById('dEntryDateLabel').textContent = fmtDate(e.createdAt);
    document.getElementById('dBtnDelete').style.display = 'inline-flex';
    document.getElementById('diaryModalOverlay').classList.add('open');
}

function closeDiaryModal(e) {
    if (!e || e.target === document.getElementById('diaryModalOverlay')) {
        document.getElementById('diaryModalOverlay').classList.remove('open');
    }
}

function saveEntry() {
    const title   = document.getElementById('dEntryTitle').value.trim();
    const content = document.getElementById('dEntryContent').value.trim();
    const tag     = document.getElementById('dEntryTag').value;
    if (!title && !content) { alert('Escreva algo antes de salvar.'); return; }

    const now = new Date().toISOString();
    if (editingEntry !== null) {
        const idx = diaryEntries.findIndex(e => e.id === editingEntry);
        if (idx >= 0) {
            diaryEntries[idx] = { ...diaryEntries[idx], title: title || '(sem título)', content, tag, updatedAt: now };
        }
    } else {
        diaryEntries.unshift({ id: Date.now(), title: title || '(sem título)', content, tag, createdAt: now, updatedAt: now });
    }
    saveDiary();
    document.getElementById('diaryModalOverlay').classList.remove('open');
    renderDiary();
}

function deleteEntry() {
    if (!editingEntry) return;
    if (!confirm('Apagar esta entrada?')) return;
    diaryEntries = diaryEntries.filter(e => e.id !== editingEntry);
    saveDiary();
    document.getElementById('diaryModalOverlay').classList.remove('open');
    renderDiary();
}

function quickDeleteEntry(id) {
    if (!confirm('Apagar esta entrada?')) return;
    diaryEntries = diaryEntries.filter(e => e.id !== id);
    saveDiary(); renderDiary();
}

const TAG_LABELS = { ideia:'💡 ideia', reflexao:'💭 reflexão', plano:'🗺 plano', aprendizado:'📚 aprendizado', motivacao:'⚡ motivação', outro:'📌 outro' };


// ─── MARKDOWN SIMPLES ─────────────────────────────────────────────────────────
function parseMarkdown(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        // Headers
        .replace(/^### (.+)$/gm, '<h4 style="font-size:0.88rem;font-weight:700;margin:8px 0 4px;color:rgba(255,255,255,0.85)">$1</h4>')
        .replace(/^## (.+)$/gm,  '<h3 style="font-size:1rem;font-weight:700;margin:10px 0 5px;color:rgba(255,255,255,0.9)">$1</h3>')
        .replace(/^# (.+)$/gm,   '<h2 style="font-size:1.15rem;font-weight:700;margin:12px 0 6px;color:#fff">$1</h2>')
        // Bold & Italic
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Lists
        .replace(/^- (.+)$/gm, '<li style="margin-left:16px;margin-bottom:2px">$1</li>')
        .replace(/(<li[^>]*>.*?<\/li>\s*)+/g, '<ul style="margin:6px 0;padding:0">$&</ul>')
        // Numbered lists
        .replace(/^\d+\. (.+)$/gm, '<li style="margin-left:16px;margin-bottom:2px">$1</li>')
        // Inline code
        .replace(/`(.+?)`/g, '<code style="background:rgba(255,255,255,0.1);padding:1px 5px;border-radius:4px;font-family:monospace;font-size:0.85em">$1</code>')
        // Line breaks
        .replace(/\n/g, '<br>');
}

function renderDiary() {
    const query   = document.getElementById('diarySearch').value.trim().toLowerCase();
    const entries = diaryEntries.filter(e => {
        if (!query) return true;
        return e.title.toLowerCase().includes(query) || e.content.toLowerCase().includes(query);
    });

    const el = document.getElementById('diaryEntriesList');
    if (!entries.length) {
        el.innerHTML = `<div class="diary-empty">${query ? 'nenhum resultado para "'+escapeHtml(query)+'"' : 'nenhuma entrada ainda'}<br><small style="opacity:0.5">clique em "nova entrada" para começar</small></div>`;
        return;
    }

    // Agrupa por mês
    const groups = {};
    entries.forEach(e => {
        const d  = new Date(e.createdAt);
        const mk = `${d.getFullYear()}-${d.getMonth()}`;
        if (!groups[mk]) groups[mk] = { label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`, entries: [] };
        groups[mk].entries.push(e);
    });

    el.innerHTML = Object.values(groups).map(g => `
        <div class="diary-month-group">${g.label}</div>
        ${g.entries.map(e => {
            const preview = e.content.replace(/\n/g,' ').substring(0, 120);
            const dateStr = new Date(e.createdAt).toLocaleDateString('pt-br', { day:'2-digit', month:'2-digit', year:'numeric' });
            const timeStr = new Date(e.createdAt).toLocaleTimeString('pt-br', { hour:'2-digit', minute:'2-digit' });
            const tagHtml = e.tag ? `<span class="diary-tag-chip">${TAG_LABELS[e.tag]||e.tag}</span>` : '';
            return `
                <div class="diary-entry-card" onclick="openEntry(${e.id})">
                    <button class="diary-entry-del" onclick="event.stopPropagation();quickDeleteEntry(${e.id})" title="Apagar">✕</button>
                    <div class="diary-entry-top">
                        <span class="diary-entry-title">${escapeHtml(e.title)}</span>
                        ${tagHtml}
                    </div>
                    ${preview ? `<div class="diary-entry-preview">${escapeHtml(preview)}</div>` : ''}
                    <div class="diary-entry-meta">
                        <span class="diary-entry-date">${dateStr} às ${timeStr}</span>
                        ${e.updatedAt !== e.createdAt ? `<span class="diary-entry-date">· editado</span>` : ''}
                    </div>
                </div>`;
        }).join('')}`
    ).join('');
    updatePageSub();
}

// ─── SUB-TÍTULO ───────────────────────────────────────────────────────────────
function updatePageSub() {
    const totalEntries = diaryEntries.length;
    const todayTasks   = (tasks[todayKey()]||[]);
    const doneTasks    = todayTasks.filter(t=>t.done).length;
    document.getElementById('notasSub').textContent =
        `${doneTasks} de ${todayTasks.length} tarefas concluídas hoje · ${totalEntries} entrada${totalEntries!==1?'s':''} no diário`;
}

// ─── ENTER NO INPUT ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('taskInput').addEventListener('keydown', e => {
        if (e.key === 'Enter') addTask();
    });
    // Ctrl+Enter no textarea salva
    document.getElementById('dEntryContent').addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') saveEntry();
    });
});

// ─── ESCAPE HTML ──────────────────────────────────────────────────────────────
function escapeHtml(str) {
    return (str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
renderTasks();
renderDiary();

// ─── CALENDÁRIO POPUP (notas/tarefas) ────────────────────────────────────────
let dpDate = new Date();

function toggleDatePicker() {
    const popup = document.getElementById('datePicker');
    if (!popup) return;
    dpDate = new Date(taskDate);
    const isHidden = popup.classList.contains('hidden');
    popup.classList.add('hidden');
    if (isHidden) {
        const title = document.getElementById('taskDateLabel');
        const rect  = title.getBoundingClientRect();
        popup.style.top       = (rect.bottom + 8) + 'px';
        popup.style.left      = (rect.left + rect.width / 2) + 'px';
        popup.style.transform = 'translateX(-50%)';
        requestAnimationFrame(() => {
            const pr = popup.getBoundingClientRect();
            if (pr.right > window.innerWidth - 8) { popup.style.left = (window.innerWidth - pr.width - 8) + 'px'; popup.style.transform = 'none'; }
            if (pr.left < 8) { popup.style.left = '8px'; popup.style.transform = 'none'; }
        });
        popup.classList.remove('hidden');
        renderDpGrid();
    }
}
function closeDatePicker() { document.getElementById('datePicker')?.classList.add('hidden'); }
function dpPrevMonth() { dpDate.setMonth(dpDate.getMonth()-1); renderDpGrid(); }
function dpNextMonth() { dpDate.setMonth(dpDate.getMonth()+1); renderDpGrid(); }
function renderDpGrid() {
    const label = document.getElementById('dpMonthLabel');
    const grid  = document.getElementById('dpGrid');
    if (!label || !grid) return;
    const y = dpDate.getFullYear(), m = dpDate.getMonth();
    label.textContent = new Date(y,m,1).toLocaleDateString('pt-br',{month:'long',year:'numeric'});
    const firstDay = new Date(y,m,1).getDay();
    const daysInMonth = new Date(y,m+1,0).getDate();
    const todayStr = todayKey();
    const selStr   = dateKey(taskDate);
    let html = '<div class="dp-weekdays"><span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span></div><div class="dp-days">';
    for (let i=0;i<firstDay;i++) html += '<span class="dp-empty"></span>';
    for (let d=1;d<=daysInMonth;d++) {
        const ds = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const isToday = ds===todayStr, isSel = ds===selStr;
        html += `<span class="dp-day${isSel?' dp-sel':''}${isToday?' dp-today':''}" onclick="dpSelectDate('${ds}')">${d}</span>`;
    }
    html += '</div>';
    grid.innerHTML = html;
}
function dpSelectDate(ds) {
    taskDate = new Date(ds+'T12:00:00');
    closeDatePicker();
    renderTasks();
}
document.addEventListener('click', function(e) {
    const picker = document.getElementById('datePicker');
    const title  = document.getElementById('taskDateLabel');
    if (!picker || picker.classList.contains('hidden')) return;
    if (!picker.contains(e.target) && e.target !== title) closeDatePicker();
});
