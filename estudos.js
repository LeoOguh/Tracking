// ─── TEMA COMPARTILHADO ───────────────────────────────────────────────────────
let isLight = localStorage.getItem('clarity_theme') === 'light';
if (isLight) document.body.classList.add('light');
document.getElementById('themeToggleBtn').textContent = isLight ? '☾ escuro' : '☀ claro';

// ─── ESTADO ───────────────────────────────────────────────────────────────────
let studySessions  = JSON.parse(localStorage.getItem('study_sessions'))    || {};
let studyGoals     = JSON.parse(localStorage.getItem('study_daily_goals')) || {};
let studySubjects  = JSON.parse(localStorage.getItem('study_subjects'))    || [];

let currentDate      = new Date();
let calMonth         = new Date();
let chartDaily       = null;
let chartSubject     = null;
let editingId        = null;
let studySummaryOpen = false;
let aiMode           = 'subjects';

// ─── CRONÔMETRO ───────────────────────────────────────────────────────────────
let timerInterval    = null;
let timerStartTime   = null; // Date object quando o timer começou
let timerSubject     = '';
let timerContent     = '';
let timerRunning     = false;

const monthNames = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

// Paleta de cores
const SUBJECT_COLORS = ['#3498db','#9b59b6','#e67e22','#2ecc71','#e74c3c','#1abc9c','#f39c12','#d35400','#8e44ad','#27ae60','#2980b9','#c0392b','#16a085','#f1c40f'];
let subjectColorMap = JSON.parse(localStorage.getItem('study_subject_colors')) || {};

function getSubjectColor(subject) {
    const key = (subject || '').toLowerCase().trim();
    if (!key) return '#7f8c8d';
    if (!subjectColorMap[key]) {
        const used  = Object.values(subjectColorMap);
        const avail = SUBJECT_COLORS.filter(c => !used.includes(c));
        subjectColorMap[key] = avail.length ? avail[0] : SUBJECT_COLORS[Object.keys(subjectColorMap).length % SUBJECT_COLORS.length];
        localStorage.setItem('study_subject_colors', JSON.stringify(subjectColorMap));
    }
    return subjectColorMap[key];
}
function getSubjectColorResolved(name) {
    const found = studySubjects.find(s => s.name.toLowerCase() === (name||'').toLowerCase().trim());
    return found ? found.color : getSubjectColor(name);
}

// ─── TEMA ─────────────────────────────────────────────────────────────────────
function toggleTheme() {
    isLight = !isLight;
    document.body.classList.toggle('light', isLight);
    localStorage.setItem('clarity_theme', isLight ? 'light' : 'dark');
    document.getElementById('themeToggleBtn').textContent = isLight ? '☾ escuro' : '☀ claro';
    renderCharts();
}

// ─── UTILITÁRIOS ──────────────────────────────────────────────────────────────
function dateKey(d)    { return d.toISOString().split('T')[0]; }
function todayKey()    { return dateKey(new Date()); }
function addDays(dateStr, n) {
    const d = new Date(dateStr + 'T00:00:00'); d.setDate(d.getDate() + n); return dateKey(d);
}
function formatDateTitle(d) {
    const isToday     = dateKey(d) === todayKey();
    const isYesterday = (() => { const y = new Date(); y.setDate(y.getDate()-1); return dateKey(d) === dateKey(y); })();
    const base = d.toLocaleDateString('pt-br', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
    if (isToday) return `hoje — ${base}`; if (isYesterday) return `ontem — ${base}`; return base;
}
function changeDate(delta) { currentDate.setDate(currentDate.getDate() + delta); render(); }
function changeCalMonth(delta) { calMonth.setMonth(calMonth.getMonth() + delta); renderReviewCalendar(); }
function timeToMin(t) { if (!t) return 0; const [h,m] = t.split(':').map(Number); return h*60+m; }
function minToLabel(min) {
    if (min <= 0) return '0 min';
    const h = Math.floor(min/60), m = min%60;
    if (h===0) return `${m} min`;
    if (m===0) return `${h} h`;
    return `${h} h ${m.toString().padStart(2,'0')} min`;
}
function minToH(min) { return (min/60).toFixed(1); }
function formatHHMMSS(seconds) {
    const h = Math.floor(seconds/3600), m = Math.floor((seconds%3600)/60), s = seconds%60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// ─── EXPORTAR ─────────────────────────────────────────────────────────────────
function exportStudyData() {
    const data = { studySessions, studyGoals, studySubjects, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data,null,2)], { type:'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href=url; a.download=`clarity-estudos-${todayKey()}.json`; a.click();
    URL.revokeObjectURL(url);
}

// ─── DROPDOWN DE MATÉRIAS ─────────────────────────────────────────────────────
function populateSubjectDropdown() {
    const sel = document.getElementById('fSubjectSelect');
    if (!sel) return;
    const sorted = [...studySubjects].sort((a,b) => b.importance - a.importance);
    const stars  = n => '★'.repeat(n) + '☆'.repeat(5-n);
    sel.innerHTML = `<option value="">— matéria —</option>` +
        sorted.map(s => `<option value="${s.name}">${stars(s.importance)} ${s.name}</option>`).join('') +
        `<option value="__custom__">digitar manualmente…</option>`;
}
function onSubjectSelectChange() {
    const sel    = document.getElementById('fSubjectSelect');
    const custom = document.getElementById('fSubjectCustom');
    if (sel.value === '__custom__') { custom.classList.remove('hidden'); custom.focus(); }
    else { custom.classList.add('hidden'); custom.value = ''; }
}

// ─── GERENCIAR MATÉRIAS ───────────────────────────────────────────────────────
function openSubjectsModal() { renderSubjectsList(); document.getElementById('subjectsModalOverlay').classList.add('open'); }
function closeSubjectsModal(e) {
    if (!e || e.target === document.getElementById('subjectsModalOverlay')) {
        document.getElementById('subjectsModalOverlay').classList.remove('open');
        populateSubjectDropdown();
    }
}
function addSubject() {
    const name       = document.getElementById('sNewName').value.trim();
    const importance = parseInt(document.getElementById('sNewImportance').value);
    const color      = document.getElementById('sNewColor').value;
    if (!name) return;
    if (studySubjects.find(s => s.name.toLowerCase() === name.toLowerCase())) { alert('Matéria já cadastrada.'); return; }
    studySubjects.push({ id: Date.now(), name, importance, color });
    subjectColorMap[name.toLowerCase().trim()] = color;
    localStorage.setItem('study_subjects', JSON.stringify(studySubjects));
    localStorage.setItem('study_subject_colors', JSON.stringify(subjectColorMap));
    document.getElementById('sNewName').value = '';
    renderSubjectsList();
}
function removeSubject(id) {
    studySubjects = studySubjects.filter(s => s.id !== id);
    localStorage.setItem('study_subjects', JSON.stringify(studySubjects));
    renderSubjectsList();
}
function renderSubjectsList() {
    const sorted = [...studySubjects].sort((a,b) => b.importance - a.importance);
    const stars  = n => `<span style="color:#f9ca24;letter-spacing:1px">${'★'.repeat(n)}</span><span style="opacity:0.3;letter-spacing:1px">${'★'.repeat(5-n)}</span>`;
    document.getElementById('subjectsList').innerHTML = sorted.length
        ? sorted.map(s => `
            <div class="subject-item">
                <div class="subject-item-dot" style="background:${s.color}"></div>
                <span class="subject-item-name">${s.name}</span>
                <span class="subject-item-stars">${stars(s.importance)}</span>
                <button class="subject-item-del" onclick="removeSubject(${s.id})">✕</button>
            </div>`).join('')
        : `<div class="empty-state" style="padding:20px">nenhuma matéria cadastrada</div>`;
}

// ─── META DIÁRIA ──────────────────────────────────────────────────────────────
// ─── MODO DO FORMULÁRIO (cronômetro vs manual) ────────────────────────────────
let sessionMode = 'timer';
function setSessionMode(mode) {
    sessionMode = mode;
    document.getElementById('btnModeTimer').classList.toggle('sess-mode-btn--active', mode === 'timer');
    document.getElementById('btnModeManual').classList.toggle('sess-mode-btn--active', mode === 'manual');
    document.getElementById('panelTimer').classList.toggle('hidden', mode !== 'timer');
    document.getElementById('panelManual').classList.toggle('hidden', mode !== 'manual');
}

document.addEventListener('DOMContentLoaded', () => {
    // Meta diária
    const goalInput = document.getElementById('dailyGoalInput');
    if (goalInput) {
        goalInput.addEventListener('change', () => {
            const key = dateKey(currentDate);
            const val = parseFloat(goalInput.value);
            if (!isNaN(val) && val > 0) studyGoals[key] = val;
            else { delete studyGoals[key]; goalInput.value = ''; }
            localStorage.setItem('study_daily_goals', JSON.stringify(studyGoals));
            updateGoalBar();
        });
    }
    populateSubjectDropdown();
    syncGoalInput();

    // Atualiza duração ao vivo no modo manual
    const fStart = document.getElementById('fStart');
    const fEnd   = document.getElementById('fEnd');
    if (fStart && fEnd) {
        function updateDurDisplay() {
            const s = timeToMin(fStart.value), e = timeToMin(fEnd.value);
            const dur = document.getElementById('fDuration');
            if (fStart.value && fEnd.value) {
                const diff = e >= s ? (e - s) : (1440 - s + e); // suporta virada de dia
                dur.textContent = minToLabel(diff);
                dur.style.color = diff > 0 ? '#2ecc71' : '';
            } else { dur.textContent = '—'; dur.style.color = ''; }
        }
        fStart.addEventListener('change', updateDurDisplay);
        fEnd.addEventListener('change', updateDurDisplay);
    }

    // Pré-preenche horário de início com hora atual
    const now = new Date();
    if (fStart) fStart.value = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    // Modo padrão
    setSessionMode('timer');
});

// ─── ADICIONAR SESSÃO (MODO MANUAL) ──────────────────────────────────────────
function addSession() {
    const sel      = document.getElementById('fSubjectSelect');
    const custom   = document.getElementById('fSubjectCustom');
    const subject  = sel.value === '__custom__' ? custom.value.trim() : sel.value;
    const content  = document.getElementById('fContent').value.trim();
    const start    = document.getElementById('fStart').value;
    const end      = document.getElementById('fEnd').value;
    const reviewDays = document.getElementById('fReviewDays').value;

    if (!subject) { alert('Selecione ou digite a matéria.'); return; }
    if (!start || !end) { alert('Preencha o horário de início e de término.'); return; }

    // Suporte a virada de dia: se end < start, considera +24h
    const startMin = timeToMin(start);
    const endMin   = timeToMin(end);
    const minutes  = endMin >= startMin ? endMin - startMin : (1440 - startMin + endMin);

    if (minutes <= 0) { alert('O horário de término deve ser diferente do início.'); return; }

    // Sessão criada no dia navegado atual (permite dias anteriores)
    const key = dateKey(currentDate);
    if (!studySessions[key]) studySessions[key] = [];
    studySessions[key].push({
        id: Date.now(), subject, content, start, end, minutes,
        reviewDays:  reviewDays ? parseInt(reviewDays) : null,
        reviewDate:  reviewDays ? addDays(key, parseInt(reviewDays)) : null,
        reviewDone:  false,
    });
    studySessions[key].sort((a,b) => timeToMin(a.start)-timeToMin(b.start));
    save();

    // Limpa apenas campos que variam por sessão
    document.getElementById('fContent').value    = '';
    document.getElementById('fEnd').value        = '';
    document.getElementById('fDuration').textContent = '—';
    document.getElementById('fDuration').style.color = '';
    document.getElementById('fReviewDays').value  = '';
    // Avança fStart para o término
    document.getElementById('fStart').value = end;
    render();
}

// ─── PAINEL DE REVISÕES DE HOJE ───────────────────────────────────────────────
function renderTodayReviews() {
    const today     = todayKey();
    const reviewMap = getReviewMap();
    // Revisões que caem hoje ou estão atrasadas e não concluídas
    const pending   = [];
    Object.keys(reviewMap).sort().forEach(dateStr => {
        if (dateStr > today) return;
        reviewMap[dateStr].forEach(r => {
            if (!r.reviewDone) {
                const daysLate = Math.floor((new Date(today+'T00:00:00') - new Date(dateStr+'T00:00:00')) / 86400000);
                pending.push({ ...r, reviewDate: dateStr, daysLate });
            }
        });
    });

    const panel = document.getElementById('todayReviewsPanel');
    const list  = document.getElementById('todayReviewsItems');
    if (!pending.length) { panel.classList.remove('visible'); return; }
    panel.classList.add('visible');

    list.innerHTML = pending.map(r => {
        const lateTag = r.daysLate > 0
            ? `<span class="today-review-late">+${r.daysLate}d atrasado</span>`
            : '';
        const sessionFmt = r.sessionDate.slice(5).replace('-','/');
        return `
            <div class="today-review-row">
                <div class="today-review-dot" style="background:${r.color}"></div>
                <span class="today-review-subject">${r.subject}</span>
                <span class="today-review-session-date">sessão: ${sessionFmt}</span>
                ${lateTag}
                <button class="btn-complete-review" onclick="completeReviewFromPanel('${r.sessionDate}',${r.id})">
                    ✓ feita
                </button>
            </div>`;
    }).join('');
}
function completeReviewFromPanel(sessionDate, id) {
    const s = studySessions[sessionDate]?.find(s => s.id === id);
    if (s) { s.reviewDone = true; save(); render(); }
}

function updateGoalBar() {
    const key   = dateKey(currentDate);
    const goalH = studyGoals[key];
    const total = (studySessions[key]||[]).reduce((s,x)=>s+x.minutes,0);
    const fill  = document.getElementById('dgBarFill');
    const pctEl = document.getElementById('dgPct');
    if (!goalH||goalH<=0){fill.style.width='0%';pctEl.textContent='—';fill.className='dg-bar-fill';return;}
    const pct = Math.round((total/(goalH*60))*100);
    fill.style.width = Math.min(pct,100)+'%';
    pctEl.textContent = pct+'%';
    fill.className = 'dg-bar-fill'+(pct>=100?' over':pct>=60?' done':'');
}
function syncGoalInput() {
    const key = dateKey(currentDate);
    const input = document.getElementById('dailyGoalInput');
    if (input) input.value = studyGoals[key] || '';
    updateGoalBar();
}

// ─── CRONÔMETRO INTEGRADO ─────────────────────────────────────────────────────
function startTimer() {
    const sel     = document.getElementById('fSubjectSelect');
    const custom  = document.getElementById('fSubjectCustom');
    const subject = sel.value === '__custom__' ? custom.value.trim() : sel.value;
    const content = document.getElementById('fContent').value.trim();

    if (!subject) { alert('Selecione ou digite a matéria antes de iniciar o cronômetro.'); return; }

    timerSubject   = subject;
    timerContent   = content;
    timerStartTime = new Date();
    timerRunning   = true;

    // Registra horário de início no campo
    const h = String(timerStartTime.getHours()).padStart(2,'0');
    const m = String(timerStartTime.getMinutes()).padStart(2,'0');
    document.getElementById('fStart').value = `${h}:${m}`;

    // Atualiza UI
    document.getElementById('timerDisplay').style.display = 'flex';
    document.getElementById('btnStartTimer').style.display = 'none';
    document.getElementById('btnStopTimer').style.display  = 'inline-flex';
    document.getElementById('fEnd').value = '';

    timerInterval = setInterval(updateTimerDisplay, 1000);
    updateTimerDisplay();
}

function updateTimerDisplay() {
    if (!timerStartTime) return;
    const elapsed = Math.floor((new Date() - timerStartTime) / 1000);
    document.getElementById('timerCounter').textContent = formatHHMMSS(elapsed);
}

function stopTimer() {
    if (!timerRunning) return;
    clearInterval(timerInterval);
    timerRunning = false;

    const endTime = new Date();
    const eh = String(endTime.getHours()).padStart(2,'0');
    const em = String(endTime.getMinutes()).padStart(2,'0');
    document.getElementById('fEnd').value = `${eh}:${em}`;

    // Calcula duração em minutos, lidando com virada de dia
    const diffMs      = endTime - timerStartTime;
    const totalMinutes = Math.round(diffMs / 60000);

    document.getElementById('timerDisplay').style.display = 'none';
    document.getElementById('btnStartTimer').style.display = 'inline-flex';
    document.getElementById('btnStopTimer').style.display  = 'none';

    // Se a sessão cruzou a meia-noite, salva em dois dias
    const startDateKey = dateKey(timerStartTime);
    const endDateKey   = dateKey(endTime);

    if (startDateKey !== endDateKey) {
        // Minutos até meia-noite
        const midnight      = new Date(endTime); midnight.setHours(0,0,0,0);
        const minsDay1      = Math.round((midnight - timerStartTime) / 60000);
        const minsDay2      = totalMinutes - minsDay1;
        const startH        = String(timerStartTime.getHours()).padStart(2,'0');
        const startM        = String(timerStartTime.getMinutes()).padStart(2,'0');

        saveTimerSession(startDateKey, timerSubject, timerContent, `${startH}:${startM}`, '23:59', minsDay1, document.getElementById('fReviewDays').value);
        saveTimerSession(endDateKey,   timerSubject, timerContent, '00:00', `${eh}:${em}`, minsDay2, '');
        alert(`Sessão cruzou a meia-noite!\nDia ${startDateKey}: ${minToLabel(minsDay1)}\nDia ${endDateKey}: ${minToLabel(minsDay2)}`);
    } else {
        saveTimerSession(startDateKey, timerSubject, timerContent,
            document.getElementById('fStart').value, `${eh}:${em}`,
            totalMinutes, document.getElementById('fReviewDays').value);
    }

    // Limpa formulário
    document.getElementById('fContent').value    = '';
    document.getElementById('fReviewDays').value = '';
    document.getElementById('fDuration').textContent = '—';
    document.getElementById('fDuration').style.color = '';
    document.getElementById('timerCounter').textContent = '00:00:00';
    timerStartTime = null; timerSubject = ''; timerContent = '';

    // Avança fStart para o horário de término
    document.getElementById('fStart').value = `${eh}:${em}`;
    render();
}

function saveTimerSession(dateStr, subject, content, start, end, minutes, reviewDays) {
    if (!studySessions[dateStr]) studySessions[dateStr] = [];
    studySessions[dateStr].push({
        id: Date.now() + Math.random(),
        subject, content, start, end, minutes: Math.max(1, minutes),
        reviewDays:  reviewDays ? parseInt(reviewDays) : null,
        reviewDate:  reviewDays ? addDays(dateStr, parseInt(reviewDays)) : null,
        reviewDone:  false,
    });
    studySessions[dateStr].sort((a,b) => timeToMin(a.start)-timeToMin(b.start));
    save();
}

// ─── ADICIONAR SESSÃO (MANUAL) ────────────────────────────────────────────────
function addSession() {
    if (timerRunning) { alert('O cronômetro está rodando. Pare-o primeiro para registrar a sessão.'); return; }
    const sel        = document.getElementById('fSubjectSelect');
    const custom     = document.getElementById('fSubjectCustom');
    const subject    = sel.value === '__custom__' ? custom.value.trim() : sel.value;
    const content    = document.getElementById('fContent').value.trim();
    const start      = document.getElementById('fStart').value;
    const end        = document.getElementById('fEnd').value;
    const reviewDays = document.getElementById('fReviewDays').value;

    if (!subject || !start || !end) { alert('Preencha ao menos matéria, início e término.'); return; }
    const minutes = timeToMin(end) - timeToMin(start);
    if (minutes <= 0) { alert('O horário de término deve ser após o início.'); return; }

    const key = dateKey(currentDate);
    if (!studySessions[key]) studySessions[key] = [];
    studySessions[key].push({
        id: Date.now(), subject, content, start, end, minutes,
        reviewDays:  reviewDays ? parseInt(reviewDays) : null,
        reviewDate:  reviewDays ? addDays(key, parseInt(reviewDays)) : null,
        reviewDone:  false,
    });
    studySessions[key].sort((a,b) => timeToMin(a.start)-timeToMin(b.start));
    save();

    document.getElementById('fContent').value    = '';
    document.getElementById('fEnd').value        = '';
    document.getElementById('fDuration').textContent = '—';
    document.getElementById('fDuration').style.color = '';
    document.getElementById('fReviewDays').value  = '';
    document.getElementById('fStart').value       = end;
    custom.value = '';
    render();
}

// ─── REMOVER / TOGGLE REVISÃO ─────────────────────────────────────────────────
function removeSession(dateStr, id) {
    if (!studySessions[dateStr]) return;
    studySessions[dateStr] = studySessions[dateStr].filter(s => s.id !== id);
    if (!studySessions[dateStr].length) delete studySessions[dateStr];
    save(); render();
}
function toggleReviewDone(sessionDateStr, id) {
    const s = studySessions[sessionDateStr]?.find(s => s.id === id);
    if (s) { s.reviewDone = !s.reviewDone; save(); render(); }
}

// ─── EDITAR SESSÃO ────────────────────────────────────────────────────────────
function openEditModal(dateStr, id) {
    const session = studySessions[dateStr]?.find(s => s.id === id);
    if (!session) return;
    editingId = { date: dateStr, id };
    document.getElementById('eSubject').value    = session.subject;
    document.getElementById('eContent').value    = session.content;
    document.getElementById('eStart').value      = session.start;
    document.getElementById('eEnd').value        = session.end;
    document.getElementById('eReviewDays').value = session.reviewDays || '';
    document.getElementById('editModalOverlay').classList.add('open');
}
function closeEditModal(e) {
    if (!e || e.target === document.getElementById('editModalOverlay')) {
        document.getElementById('editModalOverlay').classList.remove('open'); editingId = null;
    }
}
function saveEdit() {
    if (!editingId) return;
    const { date, id } = editingId;
    const idx = studySessions[date]?.findIndex(s => s.id === id);
    if (idx === undefined || idx < 0) return;
    const subject    = document.getElementById('eSubject').value.trim();
    const content    = document.getElementById('eContent').value.trim();
    const start      = document.getElementById('eStart').value;
    const end        = document.getElementById('eEnd').value;
    const reviewDays = document.getElementById('eReviewDays').value;
    const minutes    = timeToMin(end) - timeToMin(start);
    if (minutes <= 0) { alert('Horário inválido.'); return; }
    studySessions[date][idx] = { ...studySessions[date][idx], subject, content, start, end, minutes,
        reviewDays: reviewDays ? parseInt(reviewDays) : null,
        reviewDate: reviewDays ? addDays(date, parseInt(reviewDays)) : null,
    };
    studySessions[date].sort((a,b) => timeToMin(a.start)-timeToMin(b.start));
    save();
    document.getElementById('editModalOverlay').classList.remove('open');
    editingId = null; render();
}

function save() { localStorage.setItem('study_sessions', JSON.stringify(studySessions)); }

// ─── MAPA DE REVISÕES ─────────────────────────────────────────────────────────
function getReviewMap() {
    const map = {};
    Object.keys(studySessions).forEach(sessionDate => {
        studySessions[sessionDate].forEach(s => {
            if (!s.reviewDate) return;
            if (!map[s.reviewDate]) map[s.reviewDate] = [];
            map[s.reviewDate].push({ subject:s.subject, color:getSubjectColorResolved(s.subject), sessionDate, reviewDone:s.reviewDone, id:s.id });
        });
    });
    return map;
}

// ─── BADGE DE REVISÕES PENDENTES ──────────────────────────────────────────────
function updateReviewBadge() {
    const today = todayKey();
    const reviewMap = getReviewMap();
    let pending = 0;
    Object.keys(reviewMap).forEach(dateStr => {
        if (dateStr <= today) reviewMap[dateStr].forEach(r => { if (!r.reviewDone) pending++; });
    });
    const wrap = document.getElementById('reviewBadgeWrap');
    if (pending > 0) {
        wrap.style.display = 'block';
        const badge = document.getElementById('reviewPendingBadge');
        // Monta o texto sem risco de concatenação duplicada
        if (pending === 1) {
            badge.textContent = '1 revisão pendente';
        } else {
            badge.textContent = `${pending} revisões pendentes`;
        }
    } else {
        wrap.style.display = 'none';
    }
}
function scrollToCalendar() {
    document.getElementById('reviewCalendarSection').scrollIntoView({ behavior:'smooth' });
}

// ─── RENDER PRINCIPAL ─────────────────────────────────────────────────────────
function render() {
    document.getElementById('dateTitle').textContent = formatDateTitle(currentDate);
    syncGoalInput();
    updateReviewBadge();
    renderTodayReviews();
    renderQuickStats();
    renderTable();
    renderCharts();
    renderReviewCalendar();
    if (studySummaryOpen) buildStudySummary();
}

// ─── PAINEL DE REVISÕES PENDENTES (hoje + atrasadas) ─────────────────────────
function renderTodayReviews() {
    const today     = todayKey();
    const reviewMap = getReviewMap();
    const pending   = [];

    Object.keys(reviewMap).sort().forEach(dateStr => {
        if (dateStr > today) return; // só hoje ou passado
        reviewMap[dateStr].forEach(r => {
            if (!r.reviewDone) {
                const d = new Date(dateStr + 'T00:00:00');
                const t = new Date(today + 'T00:00:00');
                const daysLate = Math.floor((t - d) / 86400000);
                pending.push({ ...r, reviewDate: dateStr, daysLate });
            }
        });
    });

    const panel     = document.getElementById('todayReviewsPanel');
    const list      = document.getElementById('todayReviewsItems');
    const titleEl   = document.getElementById('todayReviewsTitle');

    if (!pending.length) { panel.classList.remove('visible'); return; }
    panel.classList.add('visible');

    const overdueCount = pending.filter(r => r.daysLate > 0).length;
    const todayCount   = pending.length - overdueCount;
    let title = '';
    if (todayCount > 0 && overdueCount > 0)
        title = `${pending.length} revisão(ões) pendente(s) — ${overdueCount} atrasada(s)`;
    else if (overdueCount > 0)
        title = `${overdueCount} revisão(ões) atrasada(s)`;
    else
        title = `${todayCount} revisão(ões) para hoje`;
    titleEl.textContent = title;

    list.innerHTML = pending.map(r => {
        const lateTag = r.daysLate > 0
            ? `<span class="today-review-late">+${r.daysLate}d atrasado</span>`
            : `<span class="today-review-late" style="background:rgba(249,202,36,0.1);color:#f9ca24">hoje</span>`;
        const sessionFmt = r.sessionDate.slice(5).replace('-', '/');
        return `
            <div class="today-review-row">
                <div class="today-review-dot" style="background:${r.color}"></div>
                <span class="today-review-subject">${r.subject}</span>
                <span class="today-review-session-date">sessão ${sessionFmt}</span>
                ${lateTag}
                <button class="btn-complete-review" onclick="completeReviewFromPanel('${r.sessionDate}',${r.id})">
                    ✓ feita
                </button>
            </div>`;
    }).join('');
}

function completeReviewFromPanel(sessionDate, id) {
    const s = studySessions[sessionDate]?.find(s => s.id === id);
    if (s) { s.reviewDone = true; save(); render(); }
}

// (renderPendingReviewsPanel removido — unificado em renderTodayReviews acima)
function renderQuickStats() {
    const key=dateKey(currentDate), sessions=studySessions[key]||[];
    const total=sessions.reduce((s,x)=>s+x.minutes,0);
    const subjects=[...new Set(sessions.map(s=>s.subject.toLowerCase()))].length;
    const week=getPeriodStats(7), month=getPeriodStats(30);
    let activeDays=0;
    for(let i=0;i<7;i++){const d=new Date();d.setDate(d.getDate()-i);if((studySessions[dateKey(d)]||[]).length)activeDays++;}
    const avgMin=activeDays>0?Math.round(week.totalMin/activeDays):0;
    document.getElementById('quickStatsRow').innerHTML=`
        <div class="qs-card"><span class="qs-label">hoje</span><span class="qs-value">${minToLabel(total)}</span><span class="qs-sub">${sessions.length} sessão${sessions.length!==1?'ões':''} · ${subjects} matéria${subjects!==1?'s':''}</span></div>
        <div class="qs-card"><span class="qs-label">últimos 7 dias</span><span class="qs-value">${minToLabel(week.totalMin)}</span><span class="qs-sub">${week.totalSessions} sessões totais</span></div>
        <div class="qs-card"><span class="qs-label">média diária</span><span class="qs-value">${minToLabel(avgMin)}</span><span class="qs-sub">nos dias com estudo</span></div>
        <div class="qs-card"><span class="qs-label">últimos 30 dias</span><span class="qs-value">${minToLabel(month.totalMin)}</span><span class="qs-sub">melhor: ${month.bestDay?minToLabel(month.bestDayMin):'—'}</span></div>`;
}
function getPeriodStats(days) {
    const r={totalMin:0,totalSessions:0,bestDay:null,bestDayMin:0};
    for(let i=0;i<days;i++){const d=new Date();d.setDate(d.getDate()-i);const key=dateKey(d);const min=(studySessions[key]||[]).reduce((s,x)=>s+x.minutes,0);r.totalMin+=min;r.totalSessions+=(studySessions[key]||[]).length;if(min>r.bestDayMin){r.bestDayMin=min;r.bestDay=key;}}
    return r;
}

// ─── TABELA ───────────────────────────────────────────────────────────────────
function renderTable() {
    const key=dateKey(currentDate), sessions=studySessions[key]||[];
    const list=document.getElementById('sessionsList'), footer=document.getElementById('tableFooter');
    if(!sessions.length){list.innerHTML=`<div class="empty-state">nenhuma sessão registrada para este dia</div>`;footer.innerHTML='';return;}
    const today=todayKey();
    list.innerHTML=sessions.map(s=>{
        const color=getSubjectColorResolved(s.subject);
        let revBadge='';
        if(s.reviewDate){
            if(s.reviewDone){
                revBadge=`<span class="rev-badge done" title="Clique para desmarcar" onclick="toggleReviewDone('${key}',${s.id})" style="cursor:pointer">✓ feita</span>`;
            } else if(s.reviewDate<=today){
                revBadge=`<span class="rev-badge pending" onclick="toggleReviewDone('${key}',${s.id})" title="Clique para marcar como feita">⚠ pendente</span>`;
            } else {
                const d=new Date(s.reviewDate+'T00:00:00');
                revBadge=`<span class="rev-badge">${d.toLocaleDateString('pt-br',{day:'2-digit',month:'2-digit'})}</span>`;
            }
        }
        return `
            <div class="session-row">
                <div class="td td-subject"><span class="subject-dot" style="background:${color}"></span>${s.subject}</div>
                <div class="td td-content" title="${s.content||''}">${s.content||'—'}</div>
                <div class="td td-time">${s.start}</div>
                <div class="td td-time">${s.end}</div>
                <div class="td td-dur" style="color:${color}">${minToLabel(s.minutes)}</div>
                <div class="td td-rev">${revBadge}</div>
                <div class="td-actions">
                    <button class="btn-row-action" onclick="openEditModal('${key}',${s.id})">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn-row-action" onclick="removeSession('${key}',${s.id})" style="color:#ff7675">
                        <svg width="11" height="11" viewBox="0 0 448 512" fill="#ff7675"><path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/></svg>
                    </button>
                </div>
            </div>`;
    }).join('');
    const totalMin=sessions.reduce((s,x)=>s+x.minutes,0);
    footer.innerHTML=`<span class="tf-label">total do dia</span><span class="tf-value">${minToLabel(totalMin)}</span><span class="tf-label" style="margin-left:12px">sessões</span><span class="tf-value">${sessions.length}</span>`;
}

// ─── GRÁFICOS ─────────────────────────────────────────────────────────────────
function renderCharts(){renderDailyChart();renderSubjectChart();}
function renderDailyChart(){
    const labels=[],data=[];
    for(let i=13;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const key=dateKey(d);const min=(studySessions[key]||[]).reduce((s,x)=>s+x.minutes,0);labels.push(d.toLocaleDateString('pt-br',{day:'2-digit',month:'2-digit'}));data.push(parseFloat(minToH(min)));}
    const gc=isLight?'rgba(0,0,0,0.07)':'rgba(255,255,255,0.08)',tc=isLight?'#555':'#fff',lc='#3498db';
    const bg=data.map((_,i)=>i===13?lc:lc+'70');
    if(chartDaily)chartDaily.destroy();
    chartDaily=new Chart(document.getElementById('chartDaily'),{type:'bar',data:{labels,datasets:[{data,backgroundColor:bg,borderRadius:6,borderSkipped:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>` ${minToLabel(Math.round(ctx.parsed.y*60))}`}}},scales:{y:{min:0,grid:{color:gc},ticks:{color:tc,callback:v=>v+'h'}},x:{grid:{display:false},ticks:{color:tc,maxRotation:0}}}}});
}
function renderSubjectChart(){
    const now=new Date(),y=now.getFullYear(),m=now.getMonth(),map={};
    Object.keys(studySessions).forEach(dateStr=>{const d=new Date(dateStr+'T00:00:00');if(d.getFullYear()!==y||d.getMonth()!==m)return;studySessions[dateStr].forEach(s=>{const k=s.subject.toLowerCase().trim();map[k]=(map[k]||0)+s.minutes;});});
    const entries=Object.entries(map).sort((a,b)=>b[1]-a[1]);
    if(chartSubject)chartSubject.destroy();
    if(!entries.length){document.getElementById('donutCenter').innerHTML=`<div class="donut-center-value">—</div><div class="donut-center-label">sem dados</div>`;chartSubject=new Chart(document.getElementById('chartSubject'),{type:'doughnut',data:{labels:['sem dados'],datasets:[{data:[1],backgroundColor:['rgba(255,255,255,0.06)'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{enabled:false}},cutout:'70%'}});return;}
    const totalMin=entries.reduce((s,[,v])=>s+v,0);
    const labels=entries.map(([k])=>k),values=entries.map(([,v])=>v),colors=entries.map(([k])=>getSubjectColorResolved(k));
    document.getElementById('donutCenter').innerHTML=`<div class="donut-center-value" style="color:${colors[0]}">${minToLabel(entries[0][1])}</div><div class="donut-center-label">${entries[0][0]}</div>`;
    chartSubject=new Chart(document.getElementById('chartSubject'),{type:'doughnut',data:{labels,datasets:[{data:values,backgroundColor:colors.map(c=>c+'cc'),borderColor:colors,borderWidth:2,hoverOffset:8}]},options:{responsive:true,maintainAspectRatio:false,cutout:'70%',plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>` ${ctx.label}: ${minToLabel(ctx.raw)} (${Math.round(ctx.raw/totalMin*100)}%)`}}}}});
}

// ─── RESUMO MENSAL ────────────────────────────────────────────────────────────
function toggleStudySummary(){
    studySummaryOpen=!studySummaryOpen;
    document.getElementById('studySummaryHeader').classList.toggle('open',studySummaryOpen);
    document.getElementById('studySummaryChevron').classList.toggle('open',studySummaryOpen);
    document.getElementById('studySummaryBody').classList.toggle('open',studySummaryOpen);
    if(studySummaryOpen)buildStudySummary();
}
function buildStudySummary(){
    const now=new Date(),y=now.getFullYear(),m=now.getMonth();
    const subjectMap={},dayMap=[0,0,0,0,0,0,0];
    let totalMin=0,totalSessions=0,daysStudied=0,bestDayMin=0,bestDayStr=null,totalReviews=0,doneReviews=0;
    for(let day=1;day<=new Date(y,m+1,0).getDate();day++){
        const dStr=`${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const sessions=studySessions[dStr]||[];const dayMin=sessions.reduce((s,x)=>s+x.minutes,0);
        if(dayMin>0){daysStudied++;totalMin+=dayMin;if(dayMin>bestDayMin){bestDayMin=dayMin;bestDayStr=dStr;}}
        totalSessions+=sessions.length;
        sessions.forEach(s=>{const sk=s.subject.toLowerCase().trim();subjectMap[sk]=(subjectMap[sk]||0)+s.minutes;const d=new Date(dStr+'T00:00:00');dayMap[d.getDay()]+=s.minutes;if(s.reviewDate){totalReviews++;if(s.reviewDone)doneReviews++;}});
    }
    const entries=Object.entries(subjectMap).sort((a,b)=>b[1]-a[1]);
    const top=entries[0];const avgPerDay=daysStudied>0?Math.round(totalMin/daysStudied):0;
    const dayNms=['dom','seg','ter','qua','qui','sex','sáb'];const bestDOW=dayMap.indexOf(Math.max(...dayMap));
    const bestDayLabel=bestDayStr?new Date(bestDayStr+'T00:00:00').toLocaleDateString('pt-br',{day:'2-digit',month:'2-digit'}):'—';
    const body=document.getElementById('studySummaryBody');
    if(!totalSessions){body.innerHTML=`<div class="summary-stat"><span class="summary-stat-label">sem dados este mês</span><span class="summary-stat-value">—</span></div>`;return;}
    body.innerHTML=`
        <div class="summary-stat"><span class="summary-stat-label">total no mês</span><span class="summary-stat-value">${minToLabel(totalMin)}</span><span class="summary-stat-sub">${daysStudied} dia${daysStudied!==1?'s':''} com estudo</span></div>
        <div class="summary-stat"><span class="summary-stat-label">média por dia</span><span class="summary-stat-value">${minToLabel(avgPerDay)}</span><span class="summary-stat-sub">nos dias com estudo</span></div>
        <div class="summary-stat"><span class="summary-stat-label">matéria mais estudada</span><span class="summary-stat-value" style="color:${top?getSubjectColorResolved(top[0]):'#fff'}">${top?top[0]:'—'}</span><span class="summary-stat-sub">${top?minToLabel(top[1]):''}</span></div>
        <div class="summary-stat"><span class="summary-stat-label">melhor dia</span><span class="summary-stat-value">${bestDayLabel}</span><span class="summary-stat-sub">${bestDayMin?minToLabel(bestDayMin):''}</span></div>
        <div class="summary-stat"><span class="summary-stat-label">dia mais produtivo</span><span class="summary-stat-value">${dayNms[bestDOW]}</span><span class="summary-stat-sub">${minToLabel(dayMap[bestDOW])} acumulados</span></div>
        <div class="summary-stat"><span class="summary-stat-label">revisões</span><span class="summary-stat-value">${doneReviews} / ${totalReviews}</span><span class="summary-stat-sub">${totalReviews?Math.round(doneReviews/totalReviews*100)+'% concluídas':'nenhuma programada'}</span></div>
        ${entries.slice(0,3).map(([s,min])=>`<div class="summary-stat"><span class="summary-stat-label" style="border-left:2px solid ${getSubjectColorResolved(s)};padding-left:6px">${s}</span><span class="summary-stat-value">${minToLabel(min)}</span><span class="summary-stat-sub">${totalMin>0?Math.round(min/totalMin*100):0}% do total</span></div>`).join('')}`;
}

// ─── CALENDÁRIO DE REVISÕES ───────────────────────────────────────────────────
function renderReviewCalendar(){
    const reviewMap=getReviewMap(),y=calMonth.getFullYear(),m=calMonth.getMonth();
    document.getElementById('calMonthTitle').textContent=`${monthNames[m]} ${y}`;
    const firstDay=new Date(y,m,1).getDay(),daysInMon=new Date(y,m+1,0).getDate(),todayStr=todayKey();
    let html=['D','S','T','Q','Q','S','S'].map(d=>`<div class="cal-day-header">${d}</div>`).join('');
    for(let i=0;i<firstDay;i++)html+=`<div class="cal-day empty"></div>`;
    const legendSubjects=new Set();
    for(let day=1;day<=daysInMon;day++){
        const dStr=`${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const reviews=reviewMap[dStr]||[];const isToday=dStr===todayStr;
        let cls='cal-day'+(isToday?' today':'')+(reviews.length?' has-review':'');
        let dotsHtml='';
        if(reviews.length){const dots=reviews.slice(0,4).map(r=>{legendSubjects.add(r.subject);return `<div class="cal-review-dot" style="background:${r.color};opacity:${r.reviewDone?0.3:1}"></div>`;}).join('');dotsHtml=`<div class="cal-review-dots">${dots}</div>`;}
        const tooltip=reviews.length?reviews.map(r=>`${r.reviewDone?'✓':'•'} ${r.subject}`).join('\n'):'';
        html+=`<div class="${cls}" ${reviews.length?`onmouseenter="showReviewTip(event,'${dStr}','${tooltip.replace(/'/g,"\\'").replace(/\n/g,'\\n')}')" onmouseleave="hideReviewTip()"`:''}}>${day}${dotsHtml}</div>`;
    }
    document.getElementById('reviewCalGrid').innerHTML=html;
    const legendArr=[...legendSubjects];
    document.getElementById('reviewLegend').innerHTML=legendArr.length
        ?legendArr.map(s=>`<div class="review-legend-item"><div class="review-legend-dot" style="background:${getSubjectColorResolved(s)}"></div>${s}</div>`).join('')
        :`<span style="font-size:0.65rem;color:rgba(255,255,255,0.2)">nenhuma revisão programada</span>`;
}
function showReviewTip(e,dateStr,tooltip){
    const tip=document.getElementById('reviewTooltip'),d=new Date(dateStr+'T00:00:00');
    tip.innerHTML=`<strong>${d.toLocaleDateString('pt-br',{weekday:'short',day:'numeric',month:'short'})}</strong><br>${tooltip.split('\\n').join('<br>')}`;
    tip.classList.add('visible');tip.style.left=(e.clientX+12)+'px';tip.style.top=(e.clientY-10)+'px';
}
function hideReviewTip(){document.getElementById('reviewTooltip').classList.remove('visible');}

// ─── CRONOGRAMA IA ────────────────────────────────────────────────────────────
function openAIModal()  { document.getElementById('aiModalOverlay').classList.add('open'); document.getElementById('aiResult').style.display='none'; }
function closeAIModal(e){ if(!e||e.target===document.getElementById('aiModalOverlay')) document.getElementById('aiModalOverlay').classList.remove('open'); }
function setAIMode(mode){
    aiMode=mode;
    document.getElementById('aiModeSubjects').classList.toggle('type-btn--active',mode==='subjects');
    document.getElementById('aiModeText').classList.toggle('type-btn--active',mode==='text');
    document.getElementById('aiPanelSubjects').style.display=mode==='subjects'?'':'none';
    document.getElementById('aiPanelText').style.display=mode==='text'?'':'none';
}

async function generateSchedule(){
    const btn=document.getElementById('aiBtnGenerate');
    btn.disabled=true;
    document.getElementById('aiLoading').style.display='flex';
    document.getElementById('aiResult').style.display='none';

    let hoursPerDay,days,prompt;
    const impLabel=['','baixa','média','alta','muito alta','máxima'];
    const stars=n=>'★'.repeat(n)+'☆'.repeat(5-n);

    if(aiMode==='subjects'){
        hoursPerDay=parseFloat(document.getElementById('aiHoursPerDay').value)||4;
        days=parseInt(document.getElementById('aiDays').value)||30;
        if(!studySubjects.length){alert('Cadastre ao menos uma matéria primeiro.');btn.disabled=false;document.getElementById('aiLoading').style.display='none';return;}
        const subList=studySubjects.sort((a,b)=>b.importance-a.importance).map(s=>`- ${s.name} (importância: ${stars(s.importance)})`).join('\n');
        prompt=`Você é especialista em planejamento de estudos. Crie um cronograma detalhado:\n\nMATÉRIAS:\n${subList}\n\nParâmetros: ${days} dias, ${hoursPerDay}h/dia disponíveis, início hoje (${new Date().toLocaleDateString('pt-br')}).\n\nInstruções:\n1. Distribua as matérias proporcionalmente à importância (5 estrelas = maior prioridade)\n2. Intercale matérias ao longo da semana\n3. Reserve tempo para revisões\n4. Apresente semana a semana (Semana 1, Semana 2...)\n5. Para cada semana: quais matérias estudar em cada dia e por quantas horas\n6. Resumo final: total de horas por matéria\nResponda em português de forma clara e estruturada.`;
    } else {
        hoursPerDay=parseFloat(document.getElementById('aiHoursPerDay2').value)||4;
        days=parseInt(document.getElementById('aiDays2').value)||30;
        const text=document.getElementById('aiTextarea').value.trim();
        if(!text){alert('Cole o texto do edital ou das matérias.');btn.disabled=false;document.getElementById('aiLoading').style.display='none';return;}
        prompt=`Você é especialista em planejamento de estudos para concursos. Analise o texto e crie um cronograma:\n\nTEXTO:\n${text.substring(0,4000)}\n\nParâmetros: ${days} dias, ${hoursPerDay}h/dia, início hoje (${new Date().toLocaleDateString('pt-br')}).\n\nInstruções:\n1. Identifique todas as matérias/tópicos\n2. Priorize os de maior peso ou frequência\n3. Apresente semana a semana\n4. Para cada semana: matérias por dia e horas\n5. Inclua dias de revisão\n6. Resumo: total de horas por matéria\nResponda em português de forma clara.`;
    }

    try {
        const response=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-5-20250929',max_tokens:1500,messages:[{role:'user',content:prompt}]})});
        const data=await response.json();
        const text2=data.content?.map(c=>c.text||'').join('\n')||'Erro ao gerar cronograma.';
        const html=text2.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/^### (.+)$/gm,'<h3>$1</h3>').replace(/^## (.+)$/gm,'<h3>$1</h3>').replace(/^# (.+)$/gm,'<h3>$1</h3>').replace(/\n/g,'<br>');
        document.getElementById('aiResult').innerHTML=html;
        document.getElementById('aiResult').style.display='block';
    } catch(err) {
        document.getElementById('aiResult').innerHTML=`<span style="color:#ff7675">Erro ao conectar com a IA. Verifique sua conexão e se a chave de API está configurada.</span>`;
        document.getElementById('aiResult').style.display='block';
    }
    document.getElementById('aiLoading').style.display='none';
    btn.disabled=false;
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
render();

// ─── SELETOR DE ESTRELAS ──────────────────────────────────────────────────────
let currentStars = 3;
function setStars(n) {
    currentStars = n;
    document.getElementById('sNewImportance').value = n;
    document.querySelectorAll('#starSelector .star').forEach((el, i) => {
        el.classList.toggle('active', i < n);
    });
}
// Inicializa as estrelas ao abrir o modal
function initStars() { setStars(3); }

// ─── FALLBACK: ABRIR NO CLAUDE ────────────────────────────────────────────────
function openInClaude() {
    const url = 'https://claude.ai/new';
    window.open(url, '_blank');
}

// Corrige o openSubjectsModal para inicializar estrelas
const _origOpenSubjectsModal = openSubjectsModal;
window.openSubjectsModal = function() {
    initStars();
    _origOpenSubjectsModal();
};

// ═══════════════════════════════════════════════════════════
// POMODORO
// ═══════════════════════════════════════════════════════════
let pomodoroInterval = null;
let pomodoroSeconds  = 25 * 60;
let pomodoroRunning  = false;
let pomodoroMode     = 'work'; // 'work' | 'short' | 'long'
let pomodoroCount    = 0;      // sessões concluídas
const POMO_TIMES     = { work: 25*60, short: 5*60, long: 15*60 };
const POMO_LABELS    = { work: '▶ iniciar', short: '▶ iniciar', long: '▶ iniciar' };

function togglePomodoro() {
    const panel = document.getElementById('pomodoroPanel');
    const show  = panel.style.display === 'none';
    panel.style.display = show ? 'flex' : 'none';
    if (show) updatePomodoroDisplay();
}

function setPomoMode(mode) {
    pomodoroMode = mode;
    pomodoroReset();
    ['Work','Short','Long'].forEach(m => {
        document.getElementById('pomoBtn'+m).classList.toggle('pomo-mode-btn--active', mode === m.toLowerCase());
    });
}

function updatePomodoroDisplay() {
    const m = Math.floor(pomodoroSeconds / 60).toString().padStart(2,'0');
    const s = (pomodoroSeconds % 60).toString().padStart(2,'0');
    document.getElementById('pomoDisplay').textContent = `${m}:${s}`;
    // Sessions dots
    const dots = Array.from({length:4}, (_,i) => `<span style="color:${i<pomodoroCount%4?'#f97316':'rgba(255,255,255,0.2)'}">⬤</span>`).join(' ');
    document.getElementById('pomoSessions').innerHTML = dots;
    document.getElementById('pomodoroIndicator').textContent = pomodoroRunning ? '🔴' : '🍅';
}

function pomodoroStart() {
    if (pomodoroRunning) {
        clearInterval(pomodoroInterval);
        pomodoroRunning = false;
        document.getElementById('pomoBtnStart').textContent = '▶ retomar';
    } else {
        pomodoroRunning = true;
        document.getElementById('pomoBtnStart').textContent = '⏸ pausar';
        pomodoroInterval = setInterval(() => {
            pomodoroSeconds--;
            if (pomodoroSeconds <= 0) {
                clearInterval(pomodoroInterval);
                pomodoroRunning = false;
                if (pomodoroMode === 'work') {
                    pomodoroCount++;
                    if (Notification.permission === 'granted')
                        new Notification('🍅 Pomodoro concluído!', { body: 'Hora de uma pausa. Ótimo trabalho!' });
                    alert('🍅 Sessão concluída! Hora de uma pausa.');
                } else {
                    if (Notification.permission === 'granted')
                        new Notification('⏰ Pausa encerrada!', { body: 'Hora de voltar ao foco.' });
                }
                setPomoMode('work');
            }
            updatePomodoroDisplay();
        }, 1000);
    }
    updatePomodoroDisplay();
}

function pomodoroReset() {
    clearInterval(pomodoroInterval);
    pomodoroRunning = false;
    pomodoroSeconds = POMO_TIMES[pomodoroMode];
    document.getElementById('pomoBtnStart').textContent = '▶ iniciar';
    updatePomodoroDisplay();
}

// ═══════════════════════════════════════════════════════════
// CADERNO DE ERROS
// ═══════════════════════════════════════════════════════════
let erros = JSON.parse(localStorage.getItem('study_erros')) || [];
// erros = [{ id, materia, conteudo, descricao, resolucao, status, createdAt }]

function saveErros() { localStorage.setItem('study_erros', JSON.stringify(erros)); }

// Modal functions removed - erros is now a view, not a modal

function saveErro() {
    const materia    = document.getElementById('erroMateria').value;
    const conteudo   = document.getElementById('erroConteudo').value.trim();
    const descricao  = document.getElementById('erroDescricao').value.trim();
    const resolucao  = document.getElementById('erroResolucao').value.trim();
    if (!conteudo && !descricao) { alert('Preencha ao menos o conteúdo ou a descrição.'); return; }
    erros.unshift({ id: Date.now(), materia, conteudo, descricao, resolucao, status:'pendente', createdAt: new Date().toISOString() });
    saveErros();
    hideErrosForm();
    renderErrosList();
}

function toggleErroStatus(id) {
    const e = erros.find(e=>e.id===id);
    if (e) { e.status = e.status==='revisado' ? 'pendente' : 'revisado'; saveErros(); renderErrosList(); }
}

function deleteErro(id) {
    if (!confirm('Remover este erro?')) return;
    erros = erros.filter(e=>e.id!==id);
    saveErros(); renderErrosList();
}

function renderErrosList() {
    const filterMat = document.getElementById('errosFilterMateria').value;
    const filterSt  = document.getElementById('errosFilterStatus').value;
    let list = erros.filter(e => {
        if (filterMat && e.materia !== filterMat) return false;
        if (filterSt  && e.status  !== filterSt)  return false;
        return true;
    });
    const el = document.getElementById('errosListContent');
    if (!list.length) {
        el.innerHTML = `<div style="text-align:center;color:rgba(255,255,255,0.2);padding:30px;font-size:0.85rem">nenhum erro encontrado</div>`;
        return;
    }
    el.innerHTML = list.map(e => {
        const color = e.materia ? getSubjectColorResolved(e.materia) : '#7f8c8d';
        const done  = e.status === 'revisado';
        return `<div class="erro-card ${done?'erro-card--done':''}">
            <div class="erro-card-header">
                ${e.materia?`<span class="erro-materia-tag" style="background:${color}22;color:${color}">${escapeHtml(e.materia)}</span>`:''}
                <span class="erro-conteudo">${escapeHtml(e.conteudo||'(sem conteúdo)')}</span>
                <span class="erro-status-badge ${done?'erro-status--ok':'erro-status--pend'}">${done?'✓ revisado':'pendente'}</span>
            </div>
            ${e.descricao?`<div class="erro-desc">${escapeHtml(e.descricao)}</div>`:''}
            ${e.resolucao?`<div class="erro-resolucao">💡 ${escapeHtml(e.resolucao)}</div>`:''}
            <div class="erro-card-footer">
                <span class="erro-date">${new Date(e.createdAt).toLocaleDateString('pt-br')}</span>
                <button class="btn-toggle-erro" onclick="toggleErroStatus(${e.id})">${done?'↩ reabrir':'✓ marcar como revisado'}</button>
                <button class="btn-del-erro" onclick="deleteErro(${e.id})">apagar</button>
            </div>
        </div>`;
    }).join('');
}

function escapeHtml(str) {
    return (str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ═══════════════════════════════════════════════════════════
// CONTROLE DE VIEWS (sessões vs caderno de erros)
// ═══════════════════════════════════════════════════════════
let currentStudyView = 'sessoes';

function setStudyView(view) {
    currentStudyView = view;
    document.querySelectorAll('.study-view').forEach(v => v.classList.add('hidden'));
    document.getElementById('view' + view.charAt(0).toUpperCase() + view.slice(1)).classList.remove('hidden');
    // Update active drawer item
    document.querySelectorAll('.study-drawer .drawer-item').forEach(item => {
        item.classList.remove('drawer-item--active');
    });
    document.getElementById('sdItem' + view.charAt(0).toUpperCase() + view.slice(1)).classList.add('drawer-item--active');
    if (view === 'erros') {
        populateErrosSelects();
        renderErrosList();
    }
}

function showErrosForm() {
    document.getElementById('errosNewForm').classList.remove('hidden');
}

function hideErrosForm() {
    document.getElementById('errosNewForm').classList.add('hidden');
    document.getElementById('erroConteudo').value = '';
    document.getElementById('erroDescricao').value = '';
    document.getElementById('erroResolucao').value = '';
}

function populateErrosSelects() {
    const mat = document.getElementById('erroMateria');
    const mf = document.querySelector('#viewErros #errosFilterMateria');
    mat.innerHTML = '<option value="">— matéria —</option>';
    mf.innerHTML = '<option value="">— todas as matérias —</option>';
    studySubjects.forEach(s => {
        mat.innerHTML += `<option>${s.name}</option>`;
        mf.innerHTML += `<option>${s.name}</option>`;
    });
}

// Update saveErro to hide form after save
const _origSaveErro = saveErro;
saveErro = function() {
    _origSaveErro();
    hideErrosForm();
};

// Init
setStudyView('sessoes');
