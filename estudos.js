// ─── TEMA COMPARTILHADO ───────────────────────────────────────────────────────
let isLight = localStorage.getItem('clarity_theme') === 'light';
if (isLight) document.body.classList.add('light');
{ const _tb = document.getElementById('themeToggleBtn'); if (_tb) _tb.textContent = isLight ? '☾ escuro' : '☀ claro'; }

// ─── ESTADO ───────────────────────────────────────────────────────────────────
let studySessions  = JSON.parse(localStorage.getItem('study_sessions'))    || {};
let studyGoals     = JSON.parse(localStorage.getItem('study_daily_goals')) || {};
let studySubjects  = JSON.parse(localStorage.getItem('study_subjects'))    || [];

let currentDate      = new Date();
let dpDate           = new Date();
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
let timerPaused      = false;
let timerPausedAt    = null;  // Date when paused
let timerPausedMs    = 0;     // Accumulated paused milliseconds

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
    { const _tb = document.getElementById('themeToggleBtn'); if (_tb) _tb.textContent = isLight ? '☾ escuro' : '☀ claro'; }
    renderCharts();
}

// ─── UTILITÁRIOS ──────────────────────────────────────────────────────────────
function dateKey(d) {
    // Use local date to avoid UTC timezone offset shifting the day
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
}
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
function changeDate(delta) { currentDate.setDate(currentDate.getDate() + delta); updateTodayBtn(); render(); }
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
    const data = { studySessions, studyGoals, studySubjects, scheduleData, editalSubjects, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data,null,2)], { type:'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href=url; a.download=`clarity-estudos-${todayKey()}.json`; a.click();
    URL.revokeObjectURL(url);
}

function importStudyData() {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const data = JSON.parse(ev.target.result);
                if (!confirm('Isso substituirá TODOS os dados de estudos atuais. Continuar?')) return;
                if (data.studySessions) { studySessions = data.studySessions; localStorage.setItem('study_sessions', JSON.stringify(studySessions)); }
                if (data.studyGoals) { studyGoals = data.studyGoals; localStorage.setItem('study_daily_goals', JSON.stringify(studyGoals)); }
                if (data.studySubjects) { studySubjects = data.studySubjects; localStorage.setItem('study_subjects', JSON.stringify(studySubjects)); }
                if (data.scheduleData) { scheduleData = data.scheduleData; localStorage.setItem('study_schedule_data', JSON.stringify(scheduleData)); }
                if (data.editalSubjects) { editalSubjects = data.editalSubjects; localStorage.setItem('study_edital_subjects', JSON.stringify(editalSubjects)); }
                alert('Dados importados com sucesso!');
                location.reload();
            } catch (err) { alert('Erro ao ler o arquivo: ' + err.message); }
        };
        reader.readAsText(file);
    };
    input.click();
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
    if (e) return;
    document.getElementById('subjectsModalOverlay').classList.remove('open');
    populateSubjectDropdown();
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
    timerStartTime  = new Date();
    timerRunning    = true;
    timerPaused     = false;
    timerPausedAt   = null;
    timerPausedMs   = 0;

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
    if (!timerStartTime || timerPaused) return;
    const pausedOffset = timerPausedMs;
    const elapsed = Math.floor((new Date() - timerStartTime - pausedOffset) / 1000);
    document.getElementById('timerCounter').textContent = formatHHMMSS(Math.max(0, elapsed));
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
    const diffMs      = (endTime - timerStartTime) - timerPausedMs;
    const totalMinutes = Math.round(Math.max(0, diffMs) / 60000);

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
        // Sessão cruzou meia-noite — salva silenciosamente nos dois dias
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
    timerStartTime = null; timerSubject = ''; timerContent = ''; timerPausedMs = 0; timerPausedAt = null; timerPaused = false;

    // Avança fStart para o horário de término
    document.getElementById('fStart').value = `${eh}:${em}`;
    render();
}

function pauseTimer() {
    if (!timerRunning) return;
    if (!timerPaused) {
        // Pause
        timerPaused   = true;
        timerPausedAt = new Date();
        clearInterval(timerInterval);
        timerInterval = null;
        document.getElementById('btnPauseTimer').innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
            retomar`;
        document.getElementById('timerCounter').style.opacity = '0.4';
    } else {
        // Resume
        timerPausedMs += (new Date() - timerPausedAt);
        timerPaused   = false;
        timerPausedAt = null;
        timerInterval = setInterval(updateTimerDisplay, 1000);
        updateTimerDisplay();
        document.getElementById('btnPauseTimer').innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            pausar`;
        document.getElementById('timerCounter').style.opacity = '1';
    }
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
    if (e) return;
    document.getElementById('editModalOverlay').classList.remove('open'); editingId = null;
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
function openAIModal() {
    const hasSchedule = Object.keys(scheduleData).length > 0;
    const warning = document.getElementById('aiScheduleExistsWarning');
    const content = document.getElementById('aiModalContent');
    const genBtn = document.getElementById('aiBtnGenerate');

    if (hasSchedule) {
        warning.style.display = 'flex';
        content.style.display = 'none';
        genBtn.disabled = true;
        genBtn.style.opacity = '0.4';
    } else {
        warning.style.display = 'none';
        content.style.display = '';
        genBtn.disabled = false;
        genBtn.style.opacity = '';
    }

    document.getElementById('aiModalOverlay').classList.add('open');
    document.getElementById('aiResult').style.display = 'none';
    buildAIWeekdaysToggle();
    buildAIWeekdaysToggle2();
    renderAISubjectsPreview();
    renderAIEditalPreview();
}
function closeAIModal(e) { if (e) return; document.getElementById('aiModalOverlay').classList.remove('open'); }

// ─── WEEKDAY SELECTOR FOR AI MODAL ──────────────────────────────────────────
const AI_DAY_LABELS = ['D','S','T','Q','Q','S','S'];
let aiSelectedDays = [1,2,3,4,5];
let aiSelectedDays2 = [1,2,3,4,5];

function buildAIWeekdaysToggle() {
    const el = document.getElementById('aiWeekdaysToggle');
    if (!el) return;
    el.innerHTML = AI_DAY_LABELS.map((lbl, i) =>
        `<button type="button" class="wd-btn ${aiSelectedDays.includes(i) ? 'active' : ''}" onclick="toggleAIDay(${i})">${lbl}</button>`
    ).join('');
}
function toggleAIDay(i) {
    if (aiSelectedDays.includes(i)) {
        if (aiSelectedDays.length > 1) aiSelectedDays = aiSelectedDays.filter(d => d !== i);
    } else { aiSelectedDays.push(i); }
    buildAIWeekdaysToggle();
}
function buildAIWeekdaysToggle2() {
    const el = document.getElementById('aiWeekdaysToggle2');
    if (!el) return;
    el.innerHTML = AI_DAY_LABELS.map((lbl, i) =>
        `<button type="button" class="wd-btn ${aiSelectedDays2.includes(i) ? 'active' : ''}" onclick="toggleAIDay2(${i})">${lbl}</button>`
    ).join('');
}
function toggleAIDay2(i) {
    if (aiSelectedDays2.includes(i)) {
        if (aiSelectedDays2.length > 1) aiSelectedDays2 = aiSelectedDays2.filter(d => d !== i);
    } else { aiSelectedDays2.push(i); }
    buildAIWeekdaysToggle2();
}

function renderAISubjectsPreview() {
    const el = document.getElementById('aiSubjectsPreview');
    if (!el) return;
    if (!studySubjects.length) {
        el.innerHTML = '<span style="font-size:0.75rem;color:rgba(255,255,255,0.3)">nenhuma matéria cadastrada</span>';
        return;
    }
    el.innerHTML = studySubjects.map(s => {
        const stars = '★'.repeat(s.importance || 3) + '☆'.repeat(5 - (s.importance || 3));
        return `<span class="ai-subj-tag"><span style="color:${s.color || '#7f8c8d'}">●</span> ${s.name} <span class="ai-subj-stars">${stars}</span></span>`;
    }).join('');
}

function renderAIEditalPreview() {
    const el = document.getElementById('aiEditalPreview');
    const emptyEl = document.getElementById('aiEditalEmpty');
    if (!el) return;
    if (!editalSubjects.length) {
        el.innerHTML = '';
        if (emptyEl) emptyEl.style.display = '';
        return;
    }
    if (emptyEl) emptyEl.style.display = 'none';
    el.innerHTML = editalSubjects.map(s => {
        const stars = '★'.repeat(s.importance || 3) + '☆'.repeat(5 - (s.importance || 3));
        return `<span class="ai-subj-tag">${s.name} <span class="ai-subj-stars">${stars}</span></span>`;
    }).join('');
}

function setAIMode(mode) {
    aiMode = mode;
    document.getElementById('aiModeSubjects').classList.toggle('type-btn--active', mode === 'subjects');
    document.getElementById('aiModeEdital').classList.toggle('type-btn--active', mode === 'edital');
    document.getElementById('aiPanelSubjects').style.display = mode === 'subjects' ? '' : 'none';
    document.getElementById('aiPanelEdital').style.display = mode === 'edital' ? '' : 'none';
}

// ─── EDITAL SUBJECTS (from PDF analysis) ────────────────────────────────────
let editalSubjects = JSON.parse(localStorage.getItem('study_edital_subjects')) || [];

function saveEditalSubjects() {
    localStorage.setItem('study_edital_subjects', JSON.stringify(editalSubjects));
}

// ─── ANALYZE EDITAL MODAL ───────────────────────────────────────────────────
function openAnalyzeEditalModal() {
    document.getElementById('analyzeEditalOverlay').classList.add('open');
    document.getElementById('aiAnalyzeResult').style.display = 'none';
    document.getElementById('aiAnalyzeLoading').style.display = 'none';
}
function closeAnalyzeEditalModal(e) {
    if (e) return;
    document.getElementById('analyzeEditalOverlay').classList.remove('open');
}

async function analyzeEdital() {
    const btn = document.getElementById('aiBtnAnalyze');
    btn.disabled = true;
    document.getElementById('aiAnalyzeLoading').style.display = 'flex';
    document.getElementById('aiAnalyzeResult').style.display = 'none';

    let text = document.getElementById('aiTextarea').value.trim();
    if (aiPdfText) text = aiPdfText + '\n\n' + text;

    if (!text && !aiPdfBase64) {
        alert('Envie um PDF do edital ou cole o texto.');
        btn.disabled = false;
        document.getElementById('aiAnalyzeLoading').style.display = 'none';
        return;
    }

    try {
        const response = await fetch('/api/analisar-edital', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texto: text, pdfBase64: aiPdfBase64 })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message || data.error || "Erro na API.");
        if (!data.candidates || !data.candidates[0]) throw new Error("A IA não retornou dados.");

        const rawText = data.candidates[0].content.parts[0].text;
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Formato inválido retornado pela IA.");

        const parsed = JSON.parse(jsonMatch[0]);

        if (parsed && parsed.subjects && parsed.subjects.length) {
            editalSubjects = parsed.subjects.map(s => ({
                name: s.name,
                importance: s.importance || 3,
                topics: (s.topics || []).map(t => ({
                    name: t.name || t,
                    subtopics: t.subtopics || []
                }))
            }));
            saveEditalSubjects();

            document.getElementById('aiAnalyzeResult').innerHTML = `<div style="color:#2ecc71;font-weight:600">✓ Edital analisado com sucesso!</div><div style="margin-top:6px;font-size:0.82rem;color:rgba(255,255,255,0.6)">${editalSubjects.length} matérias extraídas.</div>`;
            document.getElementById('aiAnalyzeResult').style.display = 'block';

            setTimeout(() => {
                closeAnalyzeEditalModal();
                openCronoSubjectsPanel('edital');
            }, 1200);
        } else {
            throw new Error("Nenhuma matéria encontrada no edital.");
        }
    } catch (err) {
        console.error(err);
        document.getElementById('aiAnalyzeResult').innerHTML = `<span style="color:#ff7675">Erro: ${err.message}</span>`;
        document.getElementById('aiAnalyzeResult').style.display = 'block';
    } finally {
        document.getElementById('aiAnalyzeLoading').style.display = 'none';
        btn.disabled = false;
    }
}

// ─── SUBJECTS PANEL (view/edit) ─────────────────────────────────────────────
function openCronoSubjectsPanel(type) {
    const overlay = document.getElementById('cronoSubjectsPanelOverlay');
    const title = document.getElementById('cronoSubjectsPanelTitle');
    const body = document.getElementById('cronoSubjectsPanelBody');

    if (type === 'manual') {
        title.textContent = 'matérias cadastradas';
        let actionsHtml = `<div class="crono-subj-panel-actions">
            <button class="btn-topbar-action btn-topbar-action--text" onclick="openAddManualSubjectInCrono()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                adicionar matéria
            </button>
        </div>`;
        if (!studySubjects.length) {
            body.innerHTML = actionsHtml + '<div class="crono-subj-panel-empty">Nenhuma matéria cadastrada.</div>';
        } else {
            body.innerHTML = actionsHtml + studySubjects.map((s, i) => {
                const impClass = s.importance >= 4 ? 'imp-high' : s.importance >= 3 ? 'imp-medium' : 'imp-low';
                return `<div class="crono-subj-item" id="manualSubj${i}">
                    <div class="crono-subj-header" style="cursor:default">
                        <div class="crono-subj-dot" style="background:${s.color || '#7f8c8d'}"></div>
                        <span class="crono-subj-name">${s.name}</span>
                        <div class="crono-subj-imp-wrap">
                            <span class="crono-subj-imp ${impClass}">${'★'.repeat(s.importance || 3)}</span>
                            <button class="crono-subj-imp-btn" onclick="event.stopPropagation();openManualSubjectEditor(${i})">editar</button>
                            <button class="crono-subj-imp-btn" onclick="event.stopPropagation();deleteManualSubject(${i})" style="color:#ff7675">✕</button>
                        </div>
                    </div>
                </div>`;
            }).join('');
        }
    } else {
        title.textContent = 'matérias do edital';
        let actionsHtml = `<div class="crono-subj-panel-actions">
            <button class="btn-topbar-action btn-topbar-action--text" onclick="closeCronoSubjectsPanel();openAnalyzeEditalModal()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                ${editalSubjects.length ? 'reanalisar edital' : 'analisar edital'}
            </button>
            ${editalSubjects.length ? `<button class="btn-topbar-action btn-topbar-action--text" onclick="clearEditalSubjects()" style="color:#ff7675">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                limpar
            </button>` : ''}
        </div>`;

        if (!editalSubjects.length) {
            body.innerHTML = actionsHtml + '<div class="crono-subj-panel-empty">Nenhum edital analisado ainda.</div>';
        } else {
            body.innerHTML = actionsHtml + editalSubjects.map((s, i) => {
                const impClass = s.importance >= 4 ? 'imp-high' : s.importance >= 3 ? 'imp-medium' : 'imp-low';
                const hasTopics = s.topics && s.topics.length > 0;
                let topicsHtml = '';
                if (hasTopics) {
                    topicsHtml = '<div class="crono-subj-topics">' + s.topics.map((t, ti) => {
                        const tName = typeof t === 'string' ? t : t.name;
                        let html = `<div class="crono-topic-item"><strong>${ti + 1}. ${tName}</strong> <button class="crono-subj-imp-btn" onclick="event.stopPropagation();editEditalTopic(${i},${ti})" style="font-size:0.6rem;padding:1px 5px">✎</button> <button class="crono-subj-imp-btn" onclick="event.stopPropagation();deleteEditalTopic(${i},${ti})" style="font-size:0.6rem;padding:1px 5px;color:#ff7675">✕</button></div>`;
                        if (t.subtopics && t.subtopics.length) {
                            html += t.subtopics.map((st, si) => `<div class="crono-subtopic">${ti + 1}.${si + 1} ${st} <button class="crono-subj-imp-btn" onclick="event.stopPropagation();editEditalSubtopic(${i},${ti},${si})" style="font-size:0.55rem;padding:0 4px">✎</button> <button class="crono-subj-imp-btn" onclick="event.stopPropagation();deleteEditalSubtopic(${i},${ti},${si})" style="font-size:0.55rem;padding:0 4px;color:#ff7675">✕</button></div>`).join('');
                        }
                        return html;
                    }).join('') +
                    `<button class="crono-add-subject-btn" onclick="event.stopPropagation();addEditalTopic(${i})" style="margin-top:6px;padding:6px;font-size:0.72rem">+ adicionar tópico</button>` +
                    '</div>';
                }
                return `<div class="crono-subj-item" id="editalSubj${i}">
                    <div class="crono-subj-header" onclick="${hasTopics ? `toggleEditalSubject(${i})` : ''}">
                        <span class="crono-subj-name">${s.name}</span>
                        <div class="crono-subj-imp-wrap" id="editalImpWrap${i}">
                            <div class="crono-star-editor">${[1,2,3,4,5].map(n =>
                                `<button class="star-btn ${n <= (s.importance||3) ? 'active' : ''}" onclick="event.stopPropagation();setEditalImportance(${i},${n})">★</button>`
                            ).join('')}</div>
                        </div>
                        ${hasTopics ? '<span class="crono-subj-chevron">▾</span>' : ''}
                    </div>
                    ${topicsHtml}
                </div>`;
            }).join('');
        }
    }

    overlay.classList.add('open');
}

function closeCronoSubjectsPanel(e) {
    if (e) return;
    document.getElementById('cronoSubjectsPanelOverlay').classList.remove('open');
}

function toggleEditalSubject(idx) {
    const el = document.getElementById('editalSubj' + idx);
    if (el) el.classList.toggle('open');
}

function setEditalImportance(idx, val) {
    editalSubjects[idx].importance = val;
    saveEditalSubjects();
    // Update stars inline without full re-render
    const wrap = document.getElementById('editalImpWrap' + idx);
    if (wrap) {
        wrap.innerHTML = `<div class="crono-star-editor">${[1,2,3,4,5].map(n =>
            `<button class="star-btn ${n <= val ? 'active' : ''}" onclick="event.stopPropagation();setEditalImportance(${idx},${n})">★</button>`
        ).join('')}</div>`;
    }
}

// ─── EDITAL TOPIC EDITING ───────────────────────────────────────────────────
function editEditalTopic(subjIdx, topicIdx) {
    const t = editalSubjects[subjIdx].topics[topicIdx];
    const name = typeof t === 'string' ? t : t.name;
    const newName = prompt('Editar nome do tópico:', name);
    if (newName === null) return;
    if (newName.trim() === '') { deleteEditalTopic(subjIdx, topicIdx); return; }
    if (typeof t === 'string') { editalSubjects[subjIdx].topics[topicIdx] = newName.trim(); }
    else { editalSubjects[subjIdx].topics[topicIdx].name = newName.trim(); }
    saveEditalSubjects();
    openCronoSubjectsPanel('edital');
    // Re-open the subject
    setTimeout(() => toggleEditalSubject(subjIdx), 50);
}

function deleteEditalTopic(subjIdx, topicIdx) {
    if (!confirm('Remover este tópico?')) return;
    editalSubjects[subjIdx].topics.splice(topicIdx, 1);
    saveEditalSubjects();
    openCronoSubjectsPanel('edital');
    setTimeout(() => toggleEditalSubject(subjIdx), 50);
}

function addEditalTopic(subjIdx) {
    const name = prompt('Nome do novo tópico:');
    if (!name || !name.trim()) return;
    if (!editalSubjects[subjIdx].topics) editalSubjects[subjIdx].topics = [];
    editalSubjects[subjIdx].topics.push({ name: name.trim(), subtopics: [] });
    saveEditalSubjects();
    openCronoSubjectsPanel('edital');
    setTimeout(() => toggleEditalSubject(subjIdx), 50);
}

function editEditalSubtopic(subjIdx, topicIdx, subIdx) {
    const t = editalSubjects[subjIdx].topics[topicIdx];
    const st = t.subtopics[subIdx];
    const newName = prompt('Editar subtópico:', st);
    if (newName === null) return;
    if (newName.trim() === '') { deleteEditalSubtopic(subjIdx, topicIdx, subIdx); return; }
    editalSubjects[subjIdx].topics[topicIdx].subtopics[subIdx] = newName.trim();
    saveEditalSubjects();
    openCronoSubjectsPanel('edital');
    setTimeout(() => toggleEditalSubject(subjIdx), 50);
}

function deleteEditalSubtopic(subjIdx, topicIdx, subIdx) {
    editalSubjects[subjIdx].topics[topicIdx].subtopics.splice(subIdx, 1);
    saveEditalSubjects();
    openCronoSubjectsPanel('edital');
    setTimeout(() => toggleEditalSubject(subjIdx), 50);
}

function clearEditalSubjects() {
    if (!confirm('Remover todas as matérias do edital?')) return;
    editalSubjects = [];
    saveEditalSubjects();
    openCronoSubjectsPanel('edital');
}

// ─── MANUAL SUBJECT MANAGEMENT IN CRONOGRAMA ───────────────────────────────
function openAddManualSubjectInCrono() {
    const name = prompt('Nome da nova matéria:');
    if (!name || !name.trim()) return;
    const impStr = prompt('Importância (1 a 5):', '3');
    const importance = Math.max(1, Math.min(5, parseInt(impStr) || 3));
    const COLORS = ['#3498db','#9b59b6','#e67e22','#2ecc71','#e74c3c','#1abc9c','#f39c12','#d35400','#8e44ad','#27ae60'];
    const usedColors = studySubjects.map(s => s.color);
    const color = COLORS.find(c => !usedColors.includes(c)) || COLORS[studySubjects.length % COLORS.length];

    studySubjects.push({ name: name.trim(), importance, color });
    localStorage.setItem('study_subjects', JSON.stringify(studySubjects));
    openCronoSubjectsPanel('manual');
}

function openManualSubjectEditor(idx) {
    const s = studySubjects[idx];
    const newName = prompt('Editar nome da matéria:', s.name);
    if (newName === null) return;
    if (!newName.trim()) return;
    const impStr = prompt('Importância (1 a 5):', String(s.importance || 3));
    const importance = Math.max(1, Math.min(5, parseInt(impStr) || 3));
    studySubjects[idx].name = newName.trim();
    studySubjects[idx].importance = importance;
    localStorage.setItem('study_subjects', JSON.stringify(studySubjects));
    openCronoSubjectsPanel('manual');
}

function deleteManualSubject(idx) {
    if (!confirm(`Remover a matéria "${studySubjects[idx].name}"?`)) return;
    studySubjects.splice(idx, 1);
    localStorage.setItem('study_subjects', JSON.stringify(studySubjects));
    openCronoSubjectsPanel('manual');
}

// ─── CRONOGRAMA STATE ────────────────────────────────────────────────────────
let scheduleData = JSON.parse(localStorage.getItem('study_schedule_data')) || {};
let cronoMonth = new Date();
let aiPdfText = '';

function saveScheduleData() { localStorage.setItem('study_schedule_data', JSON.stringify(scheduleData)); }

function changeCronoMonth(delta) {
    cronoMonth.setMonth(cronoMonth.getMonth() + delta);
    renderCronoCalendar();
}

function renderCronoCalendar() {
    const grid = document.getElementById('cronoCalendarGrid');
    const label = document.getElementById('cronoMonthLabelTopbar');
    if (!grid) return;

    const y = cronoMonth.getFullYear(), m = cronoMonth.getMonth();
    if (label) label.textContent = monthNames[m] + ' ' + y;

    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const prevDays = new Date(y, m, 0).getDate();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

    let html = '';
    for (let i = firstDay - 1; i >= 0; i--) {
        const d = prevDays - i;
        html += `<div class="crono-day-cell other-month"><span class="crono-day-num">${d}</span></div>`;
    }
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const isToday = dateStr === todayStr;
        const dayData = scheduleData[dateStr];
        const hasSchedule = dayData && dayData.subjects && dayData.subjects.length > 0;
        let classes = 'crono-day-cell';
        if (isToday) classes += ' today';
        if (hasSchedule) classes += ' has-schedule';

        let inner = `<span class="crono-day-num">${d}${isToday ? ' <span style="font-size:0.55rem;opacity:0.6">hoje</span>' : ''}</span>`;
        if (hasSchedule) {
            // Get session hours for this date
            const sessionsForDate = studySessions[dateStr] || [];
            inner += '<div class="crono-day-subjects">';
            const maxTags = 3;
            dayData.subjects.slice(0, maxTags).forEach(s => {
                const color = getSubjectColorResolved(s.name) || '#7f8c8d';
                const status = getSubjectCompletionStatus(s, sessionsForDate);
                const statusIcon = status === 'done' ? '✅' : status === 'progress' ? '🔶' : '';
                const doneClass = status === 'done' ? ' completed' : '';
                inner += `<div class="crono-day-tag${doneClass}" style="background:${color}22;border-left:2px solid ${color}">${s.name}${statusIcon ? `<span class="crono-status-icon">${statusIcon}</span>` : ''}</div>`;
            });
            if (dayData.subjects.length > maxTags) {
                inner += `<span class="crono-day-more">+${dayData.subjects.length - maxTags} mais</span>`;
            }
            inner += '</div>';
            const totalH = dayData.subjects.reduce((acc, s) => acc + (s.hours || 0), 0);
            if (totalH > 0) inner += `<span class="crono-day-hours">${totalH}h</span>`;
        }

        html += `<div class="${classes}" onclick="openCronoDayModal('${dateStr}')">${inner}</div>`;
    }
    const totalCells = firstDay + daysInMonth;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
        html += `<div class="crono-day-cell other-month"><span class="crono-day-num">${i}</span></div>`;
    }
    grid.innerHTML = html;
    renderCronoLegend();
}

// 5) Check completion status of a schedule subject against actual sessions
function getSubjectCompletionStatus(schedSubject, sessions) {
    if (!sessions || !sessions.length) return '';
    const subjectName = (schedSubject.name || '').toLowerCase().trim();
    const requiredMin = (schedSubject.hours || 0) * 60;
    if (requiredMin <= 0) return '';

    let totalMin = 0;
    sessions.forEach(sess => {
        const sessName = (sess.subject || '').toLowerCase().trim();
        if (sessName === subjectName) {
            if (sess.start && sess.end) {
                const startMin = timeToMin(sess.start);
                const endMin = timeToMin(sess.end);
                if (endMin > startMin) totalMin += (endMin - startMin);
            }
        }
    });

    if (totalMin >= requiredMin) return 'done';
    if (totalMin > 0) return 'progress';
    return '';
}

function renderCronoLegend() {
    const legend = document.getElementById('cronoLegend');
    if (!legend) return;
    const subjects = new Set();
    Object.entries(scheduleData).forEach(([key, day]) => {
        if (key === '_source') return;
        if (day.subjects) day.subjects.forEach(s => subjects.add(s.name));
    });
    if (subjects.size === 0) { legend.innerHTML = ''; return; }
    legend.innerHTML = [...subjects].map(name => {
        const color = getSubjectColorResolved(name) || '#7f8c8d';
        return `<div class="crono-legend-item"><div class="crono-legend-dot" style="background:${color}"></div>${name}</div>`;
    }).join('');
}

let cronoDayModalDateStr = ''; // Track which day is being viewed

function openCronoDayModal(dateStr) {
    cronoDayModalDateStr = dateStr;
    const overlay = document.getElementById('cronoDayModalOverlay');
    const dateEl = document.getElementById('cronoDayModalDate');
    const totalEl = document.getElementById('cronoDayModalTotal');
    const body = document.getElementById('cronoDayModalBody');

    const parts = dateStr.split('-');
    const dt = new Date(+parts[0], +parts[1]-1, +parts[2]);
    const weekDays = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
    dateEl.textContent = `${weekDays[dt.getDay()]}, ${dt.getDate()} de ${monthNames[dt.getMonth()]} de ${dt.getFullYear()}`;

    const dayData = scheduleData[dateStr];
    const sessionsForDate = studySessions[dateStr] || [];

    if (!dayData || !dayData.subjects || dayData.subjects.length === 0) {
        totalEl.textContent = '';
        body.innerHTML = '<div class="crono-modal-empty">nenhum estudo programado para este dia</div>';
    } else {
        const totalH = dayData.subjects.reduce((acc, s) => acc + (s.hours || 0), 0);
        const totalSessions = dayData.subjects.reduce((acc, s) => acc + (s.sessions || 0), 0);
        totalEl.textContent = `${totalH}h total · ${totalSessions} sessão(ões)`;

        body.innerHTML = dayData.subjects.map((s, idx) => {
            const color = getSubjectColorResolved(s.name) || '#7f8c8d';
            const status = getSubjectCompletionStatus(s, sessionsForDate);
            const statusLabel = status === 'done' ? '✅ concluído' : status === 'progress' ? '🔶 em andamento' : '';

            // Calculate studied minutes
            let studiedMin = 0;
            sessionsForDate.forEach(sess => {
                if ((sess.subject||'').toLowerCase().trim() === (s.name||'').toLowerCase().trim()) {
                    if (sess.start && sess.end) {
                        const sm = timeToMin(sess.start), em = timeToMin(sess.end);
                        if (em > sm) studiedMin += (em - sm);
                    }
                }
            });
            const studiedH = (studiedMin / 60).toFixed(1);

            let details = '';
            if (s.hours) details += `<strong>Meta:</strong> ${s.hours}h`;
            if (studiedMin > 0) details += ` · <strong>Estudado:</strong> ${studiedH}h`;
            if (statusLabel) details += ` · ${statusLabel}`;
            if (s.sessions) details += ` · <strong>Sessões:</strong> ${s.sessions}x ${s.sessionTime || 25}min`;
            if (s.importance) details += ` · <strong>Importância:</strong> ${'★'.repeat(s.importance)}${'☆'.repeat(5 - s.importance)}`;
            if (s.topics && s.topics.length) details += `<br><strong>Conteúdo:</strong> ${s.topics.join(', ')}`;
            if (s.questions) details += `<br><strong>Questões sugeridas:</strong> ${s.questions}`;
            if (s.notes) details += `<br><strong>Obs:</strong> ${s.notes}`;

            return `<div class="crono-modal-subject" style="border-color:${color}${status === 'done' ? ';opacity:0.6' : ''}">
                <div class="crono-modal-subject-header">
                    <span class="crono-modal-subject-name">${s.name}</span>
                    <div class="crono-modal-subject-actions">
                        <span class="crono-modal-subject-hours">${s.hours || 0}h</span>
                        <button class="crono-edit-btn" onclick="openCronoEditSubject('${dateStr}', ${idx})">editar</button>
                    </div>
                </div>
                <div class="crono-modal-detail">${details}</div>
            </div>`;
        }).join('');
    }

    // Add "add subject" button at the bottom
    body.innerHTML += `<button class="crono-add-subject-btn" onclick="openCronoEditSubject('${dateStr}', -1)">+ adicionar matéria</button>`;

    overlay.classList.add('open');
}

function closeCronoDayModal(e) { if(e) return; document.getElementById('cronoDayModalOverlay').classList.remove('open'); }

function clearScheduleData() {
    if (!confirm('Tem certeza que deseja limpar todo o cronograma?')) return;
    scheduleData = {};
    saveScheduleData();
    renderCronoCalendar();
}

// ─── PDF HANDLING ────────────────────────────────────────────────────────────
let aiPdfBase64 = null; // Variável global para guardar o arquivo

function handlePdfSelect(input) {
    const file = input.files[0];
    const label = document.getElementById('aiPdfLabel');
    const nameEl = document.getElementById('aiPdfName');
    if (!file) return;
    
    nameEl.textContent = file.name;
    label.classList.add('has-file');

    const reader = new FileReader();
    reader.onload = function(e) {
        if (file.name.endsWith('.txt')) {
            aiPdfText = e.target.result;
            aiPdfBase64 = null;
        } else {
            // Guarda o arquivo limpo para enviar para a Vercel
            aiPdfBase64 = e.target.result.split(',')[1];
            aiPdfText = ''; 
        }
    };
    
    if (file.name.endsWith('.txt')) reader.readAsText(file);
    else reader.readAsDataURL(file); // Lê como DataURL para pegar o Base64
}

// ─── AI SCHEDULE GENERATION ──────────────────────────────────────────────────
async function generateSchedule() {
    // Block if schedule exists
    const scheduleKeys = Object.keys(scheduleData).filter(k => k !== '_source');
    if (scheduleKeys.length > 0) {
        alert('Já existe um cronograma. Limpe o cronograma atual antes de gerar um novo.');
        return;
    }

    const btn = document.getElementById('aiBtnGenerate');
    btn.disabled = true;
    document.getElementById('aiLoading').style.display = 'flex';
    document.getElementById('aiResult').style.display = 'none';

    let hoursPerDay, totalDays, activeDays;
    const startDate = new Date();
    const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth()+1).padStart(2,'0')}-${String(startDate.getDate()).padStart(2,'0')}`;
    const dayNames = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];

    let payload = {
        tipoGeracao: 'subjects',
        dataInicio: startStr
    };

    let sourceSubjects;

    if (aiMode === 'subjects') {
        hoursPerDay = parseFloat(document.getElementById('aiHoursPerDay').value) || 4;
        totalDays = parseInt(document.getElementById('aiTotalDays').value) || 30;
        activeDays = [...aiSelectedDays].sort();
        sourceSubjects = studySubjects;

        if (!sourceSubjects.length) {
            alert('Cadastre ao menos uma matéria na aba Sessões primeiro.');
            btn.disabled = false; document.getElementById('aiLoading').style.display = 'none'; return;
        }
    } else {
        hoursPerDay = parseFloat(document.getElementById('aiHoursPerDay2').value) || 4;
        totalDays = parseInt(document.getElementById('aiTotalDays2').value) || 30;
        activeDays = [...aiSelectedDays2].sort();
        sourceSubjects = editalSubjects;

        if (!sourceSubjects.length) {
            alert('Analise um edital primeiro para extrair as matérias.');
            btn.disabled = false; document.getElementById('aiLoading').style.display = 'none'; return;
        }
    }

    const totalImportance = sourceSubjects.reduce((acc, s) => acc + (s.importance || 3), 0);
    payload.materias = [...sourceSubjects].sort((a, b) => (b.importance || 3) - (a.importance || 3))
        .map(s => {
            const pct = Math.round(((s.importance || 3) / totalImportance) * 100);
            let line = `- ${s.name} (importância: ${s.importance || 3}/5, peso: ${pct}% do tempo)`;
            if (s.topics && s.topics.length) {
                const topicNames = s.topics.map(t => typeof t === 'string' ? t : t.name).join(', ');
                line += ` [tópicos: ${topicNames}]`;
            }
            return line;
        }).join('\n');

    payload.horasDia = hoursPerDay;
    payload.dias = totalDays;
    payload.diasSemana = activeDays.map(d => dayNames[d]);
    payload.diasSemanaIdx = activeDays;

    try {
        const response = await fetch('/api/gerar-cronograma', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.error) throw new Error(data.error.message || data.error || "Erro na API.");
        if (!data.candidates || !data.candidates[0]) throw new Error("A IA não retornou dados.");

        const rawText = data.candidates[0].content.parts[0].text;
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Formato inválido retornado pela IA.");

        const parsed = JSON.parse(jsonMatch[0]);

        if (parsed && parsed.schedule) {
            scheduleData = { _source: aiMode };
            Object.entries(parsed.schedule).forEach(([date, dayInfo]) => {
                if (dayInfo.subjects && Array.isArray(dayInfo.subjects)) {
                    scheduleData[date] = dayInfo;
                }
            });
            saveScheduleData();
            renderCronoCalendar();

            const totalGeneratedDays = Object.keys(parsed.schedule).length;
            const totalSubjectsSet = new Set();
            Object.values(parsed.schedule).forEach(d => d.subjects?.forEach(s => totalSubjectsSet.add(s.name)));

            document.getElementById('aiResult').innerHTML = `<div style="color:#2ecc71;font-weight:600">✓ Cronograma gerado com sucesso!</div><div style="margin-top:6px;font-size:0.82rem;color:rgba(255,255,255,0.6)">${totalGeneratedDays} dias programados · ${totalSubjectsSet.size} matérias</div>`;
            document.getElementById('aiResult').style.display = 'block';

            setTimeout(() => {
                closeAIModal();
                setStudyView('cronograma');
            }, 1200);
        }
    } catch (err) {
        console.error(err);
        document.getElementById('aiResult').innerHTML = `<span style="color:#ff7675">Erro: ${err.message}</span>`;
        document.getElementById('aiResult').style.display = 'block';
    } finally {
        document.getElementById('aiLoading').style.display = 'none';
        btn.disabled = false;
    }
}

// ─── EDITAR MATÉRIA DO CRONOGRAMA ─────────────────────────────────────────────
let cronoEditDateStr = '';
let cronoEditSubjectIdx = -1; // -1 means adding new

function openCronoEditSubject(dateStr, idx) {
    cronoEditDateStr = dateStr;
    cronoEditSubjectIdx = idx;
    const overlay = document.getElementById('cronoEditSubjectOverlay');
    const select = document.getElementById('ceSubjectSelect');
    const customInput = document.getElementById('ceSubjectCustom');
    const hoursInput = document.getElementById('ceHours');
    const topicsInput = document.getElementById('ceTopics');
    const notesInput = document.getElementById('ceNotes');
    const deleteBtn = document.getElementById('ceDeleteBtn');

    // Populate subject select
    select.innerHTML = '<option value="">— selecione —</option>';
    // Add manual subjects
    if (studySubjects.length) {
        select.innerHTML += '<optgroup label="Minhas matérias">';
        studySubjects.forEach(s => {
            select.innerHTML += `<option value="${s.name}">${s.name}</option>`;
        });
        select.innerHTML += '</optgroup>';
    }
    // Add edital subjects
    if (editalSubjects.length) {
        select.innerHTML += '<optgroup label="Matérias do edital">';
        editalSubjects.forEach(s => {
            select.innerHTML += `<option value="${s.name}">${s.name}</option>`;
        });
        select.innerHTML += '</optgroup>';
    }
    select.innerHTML += '<option value="__custom__">digitar manualmente…</option>';
    select.onchange = function() {
        customInput.classList.toggle('hidden', select.value !== '__custom__');
    };

    if (idx >= 0) {
        // Editing existing
        const dayData = scheduleData[dateStr];
        if (dayData && dayData.subjects && dayData.subjects[idx]) {
            const s = dayData.subjects[idx];
            const matchOption = [...select.options].find(o => o.value.toLowerCase() === (s.name||'').toLowerCase());
            if (matchOption) {
                select.value = matchOption.value;
                customInput.classList.add('hidden');
            } else {
                select.value = '__custom__';
                customInput.classList.remove('hidden');
                customInput.value = s.name;
            }
            hoursInput.value = s.hours || '';
            topicsInput.value = (s.topics || []).join(', ');
            notesInput.value = s.notes || '';
        }
        deleteBtn.style.display = 'inline-flex';
    } else {
        // Adding new
        select.value = '';
        customInput.classList.add('hidden');
        customInput.value = '';
        hoursInput.value = '';
        topicsInput.value = '';
        notesInput.value = '';
        deleteBtn.style.display = 'none';
    }

    overlay.classList.add('open');
}

function closeCronoEditSubject(e) {
    if (e) return;
    document.getElementById('cronoEditSubjectOverlay').classList.remove('open');
}

function saveCronoSubjectEdit() {
    const select = document.getElementById('ceSubjectSelect');
    const customInput = document.getElementById('ceSubjectCustom');
    const hoursInput = document.getElementById('ceHours');
    const topicsInput = document.getElementById('ceTopics');
    const notesInput = document.getElementById('ceNotes');

    const name = select.value === '__custom__' ? customInput.value.trim() : select.value;
    if (!name) { alert('Selecione ou digite uma matéria.'); return; }

    const hours = parseFloat(hoursInput.value) || 1;
    const topics = topicsInput.value.trim() ? topicsInput.value.split(',').map(t => t.trim()).filter(Boolean) : [];
    const notes = notesInput.value.trim();

    // Ensure dayData exists
    if (!scheduleData[cronoEditDateStr]) {
        scheduleData[cronoEditDateStr] = { subjects: [] };
    }
    if (!scheduleData[cronoEditDateStr].subjects) {
        scheduleData[cronoEditDateStr].subjects = [];
    }

    const subjectEntry = {
        name,
        hours,
        sessions: Math.ceil(hours * 2), // ~30min sessions
        sessionTime: 30,
        importance: (studySubjects.find(s => s.name.toLowerCase() === name.toLowerCase()) || editalSubjects.find(s => s.name.toLowerCase() === name.toLowerCase()) || {}).importance || 3,
        topics,
        notes
    };

    if (cronoEditSubjectIdx >= 0) {
        // Update existing - preserve questions if present
        const existing = scheduleData[cronoEditDateStr].subjects[cronoEditSubjectIdx];
        if (existing && existing.questions) subjectEntry.questions = existing.questions;
        scheduleData[cronoEditDateStr].subjects[cronoEditSubjectIdx] = subjectEntry;
    } else {
        // Add new
        scheduleData[cronoEditDateStr].subjects.push(subjectEntry);
    }

    saveScheduleData();
    renderCronoCalendar();
    closeCronoEditSubject();
    // Refresh the day modal
    openCronoDayModal(cronoEditDateStr);
}

function deleteCronoSubjectEntry() {
    if (!confirm('Remover esta matéria do dia?')) return;
    if (scheduleData[cronoEditDateStr] && scheduleData[cronoEditDateStr].subjects) {
        scheduleData[cronoEditDateStr].subjects.splice(cronoEditSubjectIdx, 1);
        if (scheduleData[cronoEditDateStr].subjects.length === 0) {
            delete scheduleData[cronoEditDateStr];
        }
    }
    saveScheduleData();
    renderCronoCalendar();
    closeCronoEditSubject();
    openCronoDayModal(cronoEditDateStr);
}

function toggleCronoDayEdit() {
    // Not used - edit is now per-subject inline
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
    
    // 1. Oculta TODAS as views do container principal
    document.querySelectorAll('.study-view').forEach(v => {
        v.classList.add('hidden');
        v.style.display = 'none'; 
    });
    
    // 2. Exibe apenas a view ativa
    const activeView = document.getElementById('view' + view.charAt(0).toUpperCase() + view.slice(1));
    if (activeView) {
        activeView.classList.remove('hidden');
        activeView.style.display = 'flex';
    }
    
    // 3. Atualiza o item azul no menu lateral
    document.querySelectorAll('.study-drawer .drawer-item').forEach(item => {
        item.classList.remove('drawer-item--active');
    });
    const activeMenuItem = document.getElementById('sdItem' + view.charAt(0).toUpperCase() + view.slice(1));
    if (activeMenuItem) activeMenuItem.classList.add('drawer-item--active');

    // 4. Elementos da Topbar
    const dayNav = document.getElementById('studyDateNav');
    const cronoNav = document.getElementById('cronoMonthNavTopbar');
    const goalBox = document.querySelector('.daily-goal-box');
    const reviewBadge = document.getElementById('reviewBadgeWrap');
    const topActionsSessoes = document.getElementById('topActionsSessoes');
    const topActionsCronograma = document.getElementById('topActionsCronograma');
    const topbar = document.querySelector('.study-topbar');

    // 5. CONTROLE RIGOROSO: O QUE APARECE EM CADA ABA
    if (view === 'sessoes') {
        if (topbar) topbar.style.flexWrap = 'wrap';
        if (dayNav) { dayNav.classList.remove('hidden'); dayNav.style.display = 'flex'; }
        if (cronoNav) { cronoNav.classList.add('hidden'); cronoNav.style.display = 'none'; }
        if (goalBox) goalBox.style.display = 'flex';
        if (reviewBadge) reviewBadge.style.display = 'block';
        if (topActionsSessoes) { topActionsSessoes.classList.remove('hidden'); topActionsSessoes.style.display = 'flex'; }
        if (topActionsCronograma) { topActionsCronograma.classList.add('hidden'); topActionsCronograma.style.display = 'none'; }
    } 
    else if (view === 'cronograma') {
        if (topbar) topbar.style.flexWrap = 'nowrap';
        if (dayNav) { dayNav.classList.add('hidden'); dayNav.style.display = 'none'; }
        if (cronoNav) { cronoNav.classList.remove('hidden'); cronoNav.style.display = 'flex'; }
        if (goalBox) goalBox.style.display = 'none';
        if (reviewBadge) reviewBadge.style.display = 'none';
        if (topActionsSessoes) { topActionsSessoes.classList.add('hidden'); topActionsSessoes.style.display = 'none'; }
        if (topActionsCronograma) { 
            topActionsCronograma.classList.remove('hidden');
            topActionsCronograma.style.display = 'flex';
            topActionsCronograma.style.marginLeft = 'auto'; 
        }
        renderCronoCalendar();
    } 
    else if (view === 'erros') {
        if (topbar) topbar.style.flexWrap = 'wrap';
        if (dayNav) { dayNav.classList.add('hidden'); dayNav.style.display = 'none'; }
        if (cronoNav) { cronoNav.classList.add('hidden'); cronoNav.style.display = 'none'; }
        if (goalBox) goalBox.style.display = 'none'; // Esconde a barra de progresso!
        if (reviewBadge) reviewBadge.style.display = 'none';
        if (topActionsSessoes) { topActionsSessoes.classList.add('hidden'); topActionsSessoes.style.display = 'none'; }
        if (topActionsCronograma) { topActionsCronograma.classList.add('hidden'); topActionsCronograma.style.display = 'none'; }

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

// ─── CALENDÁRIO POPUP (estudos) ───────────────────────────────────────────────
function toggleDatePicker() {
    const popup = document.getElementById('datePicker');
    if (!popup) return;
    dpDate = new Date(currentDate);
    const isHidden = popup.classList.contains('hidden');
    popup.classList.add('hidden');
    if (isHidden) {
        const title = document.getElementById('dateTitle');
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
    const selStr   = dateKey(currentDate);
    let html = '<div class="dp-weekdays"><span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span></div><div class="dp-days">';
    for (let i=0;i<firstDay;i++) html += '<span class="dp-empty"></span>';
    for (let d=1;d<=daysInMonth;d++) {
        const ds = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const isToday = ds===todayStr, isSel = ds===selStr;
        const hasLog  = !!(studySessions[ds]?.length);
        html += `<span class="dp-day${isSel?' dp-sel':''}${isToday?' dp-today':''}${hasLog?' dp-has-log':''}" onclick="dpSelectDate('${ds}')">${d}</span>`;
    }
    html += '</div>';
    grid.innerHTML = html;
}
function dpSelectDate(ds) {
    currentDate = new Date(ds+'T12:00:00');
    closeDatePicker();
    updateTodayBtn();
    render();
}
function goToToday() {
    currentDate = new Date();
    updateTodayBtn();
    render();
}
function updateTodayBtn() {
    const btn = document.getElementById('todayBtn');
    if (!btn) return;
    btn.classList.toggle('hidden', dateKey(currentDate) === todayKey());
}
document.addEventListener('click', function(e) {
    const picker = document.getElementById('datePicker');
    const title  = document.getElementById('dateTitle');
    if (!picker || picker.classList.contains('hidden')) return;
    if (!picker.contains(e.target) && e.target !== title) closeDatePicker();
});
