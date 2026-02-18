// ─── TEMA PERSISTIDO ──────────────────────────────────────────────────────────
let isLight = localStorage.getItem('clarity_theme') === 'light';
if (isLight) document.body.classList.add('light');

// ─── ESTADO GLOBAL ────────────────────────────────────────────────────────────
let currentMonth      = new Date().getMonth();
let currentYear       = new Date().getFullYear();
let habits            = JSON.parse(localStorage.getItem('my_habits'))  || [];
let history           = JSON.parse(localStorage.getItem('my_history')) || {};
let moodHistory       = JSON.parse(localStorage.getItem('my_mood'))    || {};
let notesHistory      = JSON.parse(localStorage.getItem('my_notes'))   || {};
let activeHabitFilter = null;
let chartInstance     = null;
let dragSourceIndex   = null;
let moodModalDate     = null;
let isCompact         = localStorage.getItem('clarity_compact') === 'true';
let noteModalDate     = null;
let summaryOpen       = false;
let selectedDays      = [0,1,2,3,4,5,6];
let newHabitType      = 'meta';       // 'meta' | 'limite'
let newHabitDuration  = 'recorrente'; // 'recorrente' | 'periodo'
let editHabitIndex    = null;
let editSelectedDays  = [0,1,2,3,4,5,6];
let editHabitType     = 'meta';
let editHabitDuration = 'recorrente';

// ─── CONSTANTES ───────────────────────────────────────────────────────────────
const DAY_LABELS       = ['D','S','T','Q','Q','S','S'];
const moodEmojis       = { 1:'😞', 2:'😕', 3:'😐', 4:'🙂', 5:'😄' };
const monthNames       = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const dayNames         = ['D','S','T','Q','Q','S','S'];
const weekBorderColors = ['#3498db','#9b59b6','#e67e22','#e74c3c','#1abc9c','#f39c12'];

const moodEmojiPlugin = {
    id: 'moodEmojiLabels',
    afterDraw(chart) {
        const dataset = chart.data.datasets[1];
        if (!dataset) return;
        const meta = chart.getDatasetMeta(1);
        const ctx  = chart.ctx;
        const emojiMap = { 0:'😞', 25:'😕', 50:'😐', 75:'🙂', 100:'😄' };
        ctx.save();
        ctx.font = '11px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        meta.data.forEach((point, i) => {
            const val = dataset.data[i];
            if (val !== null && val !== undefined) {
                const emoji = emojiMap[Math.round(val / 25) * 25];
                if (emoji) ctx.fillText(emoji, point.x, point.y - 4);
            }
        });
        ctx.restore();
    }
};

// ─── TEMA ─────────────────────────────────────────────────────────────────────
function toggleTheme() {
    isLight = !isLight;
    document.body.classList.toggle('light', isLight);
    localStorage.setItem('clarity_theme', isLight ? 'light' : 'dark');
    document.getElementById('themeToggleBtn')?.textContent = isLight ? '☾ escuro' : '☀ claro';
    const weeks = getWeeks(currentMonth, currentYear);
    updateChart(weeks.flat().filter(d => d !== null));
}
// Atualiza botão no carregamento
document.getElementById('themeToggleBtn')?.textContent = isLight ? '☾ escuro' : '☀ claro';

// ─── EXPORTAR DADOS ───────────────────────────────────────────────────────────
function exportData() {
    const data = { habits, history, moodHistory, notesHistory, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `clarity-habitos-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// ─── TIPO E DURAÇÃO DO NOVO HÁBITO ────────────────────────────────────────────
function setHabitType(type) {
    newHabitType = type;
    document.getElementById('btnTypeMeta').classList.toggle('type-btn--active', type === 'meta');
    document.getElementById('btnTypeLimit').classList.toggle('type-btn--active', type === 'limite');
}
function setHabitDuration(dur) {
    newHabitDuration = dur;
    document.getElementById('btnDurRec').classList.toggle('type-btn--active', dur === 'recorrente');
    document.getElementById('btnDurPer').classList.toggle('type-btn--active', dur === 'periodo');
    document.getElementById('habitPeriod').classList.toggle('hidden', dur !== 'periodo');
}

// ─── SELETOR DE DIAS ──────────────────────────────────────────────────────────
function buildWeekdaysToggle() {
    const el = document.getElementById('weekdaysToggle');
    el.innerHTML = DAY_LABELS.map((lbl, i) =>
        `<button class="wd-btn ${selectedDays.includes(i) ? 'active' : ''}" onclick="toggleDay(${i})">${lbl}</button>`
    ).join('');
}
function toggleDay(i) {
    if (selectedDays.includes(i)) {
        if (selectedDays.length > 1) selectedDays = selectedDays.filter(d => d !== i);
    } else { selectedDays.push(i); }
    buildWeekdaysToggle();
}

function buildEditWeekdaysToggle() {
    const el = document.getElementById('editWeekdaysToggle');
    if (!el) return;
    el.innerHTML = DAY_LABELS.map((lbl, i) =>
        `<button class="wd-btn ${editSelectedDays.includes(i) ? 'active' : ''}" onclick="toggleEditDay(${i})">${lbl}</button>`
    ).join('');
}
function toggleEditDay(i) {
    if (editSelectedDays.includes(i)) {
        if (editSelectedDays.length > 1) editSelectedDays = editSelectedDays.filter(d => d !== i);
    } else { editSelectedDays.push(i); }
    buildEditWeekdaysToggle();
}

// ─── VERIFICAR SE HÁBITO ESTÁ ATIVO NUMA DATA ─────────────────────────────────
function isHabitActiveOnDate(habit, dateObj) {
    const activeDays = habit.activeDays || [0,1,2,3,4,5,6];
    if (!activeDays.includes(dateObj.getDay())) return false;

    // Hábito por período: verifica se a data está dentro da janela
    if (habit.durationType === 'periodo' && habit.startDate && habit.periodDays) {
        const start = new Date(habit.startDate + 'T00:00:00');
        const end   = new Date(start);
        end.setDate(end.getDate() + habit.periodDays - 1);
        if (dateObj < start || dateObj > end) return false;
    }
    return true;
}

// ─── STREAK ───────────────────────────────────────────────────────────────────
function getStreak(habit) {
    const hName     = habit.name || habit;
    const startDate = habit.startDate
        ? new Date(habit.startDate + 'T00:00:00')
        : new Date();
    startDate.setHours(0,0,0,0);

    let streak = 0, safety = 0;
    let checkDate = new Date(); checkDate.setHours(0,0,0,0);

    while (safety++ < 730) {
        // Não conta antes da data de criação do hábito
        if (checkDate < startDate) break;

        if (!isHabitActiveOnDate(habit, checkDate)) {
            checkDate.setDate(checkDate.getDate() - 1); continue;
        }
        const dStr      = checkDate.toISOString().split('T')[0];
        const val       = history[dStr]?.[hName];
        const isSuccess = habit.habitType === 'limite' ? !val : !!val;
        if (isSuccess) { streak++; checkDate.setDate(checkDate.getDate() - 1); }
        else break;
    }
    return streak;
}

// Verifica se o streak pode quebrar hoje (hábito ativo hoje, não registrado ainda)
function isStreakAtRisk(habit) {
    const today = new Date(); today.setHours(0,0,0,0);

    // Hábito criado hoje não pode estar em risco ainda
    const startDate = habit.startDate ? new Date(habit.startDate + 'T00:00:00') : today;
    startDate.setHours(0,0,0,0);
    if (startDate.getTime() === today.getTime()) return false;

    if (!isHabitActiveOnDate(habit, today)) return false;
    const dStr      = today.toISOString().split('T')[0];
    const val       = history[dStr]?.[habit.name || habit];
    const isSuccess = habit.habitType === 'limite' ? !val : !!val;
    if (isSuccess) return false; // já foi bem-sucedido hoje

    // Verifica se ontem foi sucesso (ou seja, havia streak)
    const yesterday    = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    if (yesterday < startDate) return false; // criado hoje mesmo
    const yStr         = yesterday.toISOString().split('T')[0];
    const yVal         = history[yStr]?.[habit.name || habit];
    const hadStreak    = habit.habitType === 'limite' ? !yVal : !!yVal;
    return hadStreak;
}

function getBestStreak(habit) {
    const hName      = habit.name || habit;
    const activeDays = habit.activeDays || [0,1,2,3,4,5,6];
    const allDates   = Object.keys(history).filter(dStr => {
        const val = history[dStr]?.[hName];
        return habit.habitType === 'limite' ? val === false || val === undefined : !!val;
    }).sort();
    if (!allDates.length) return 0;
    let best = 1, current = 1;
    for (let i = 1; i < allDates.length; i++) {
        const prev = new Date(allDates[i-1] + 'T00:00:00');
        const curr = new Date(allDates[i]   + 'T00:00:00');
        const diff = (curr - prev) / 86400000;
        let consecutive = diff === 1;
        if (!consecutive && diff > 1) {
            let allInactive = true;
            const check = new Date(prev); check.setDate(check.getDate() + 1);
            while (check < curr) {
                if (activeDays.includes(check.getDay())) { allInactive = false; break; }
                check.setDate(check.getDate() + 1);
            }
            consecutive = allInactive;
        }
        if (consecutive) { current++; best = Math.max(best, current); }
        else current = 1;
    }
    return best;
}

// ─── GERADOR DE SEMANAS ───────────────────────────────────────────────────────
function getWeeks(m, y) {
    const weeks = [];
    let date = new Date(y, m, 1);
    while (date.getMonth() === m) {
        let week = new Array(7).fill(null);
        for (let i = date.getDay(); i < 7; i++) {
            if (date.getMonth() === m) { week[i] = new Date(date); date.setDate(date.getDate() + 1); }
            else break;
        }
        weeks.push(week);
    }
    return weeks;
}

// ─── DRAG AND DROP ────────────────────────────────────────────────────────────
function handleDragStart(e) { dragSourceIndex = parseInt(e.currentTarget.dataset.index); e.currentTarget.classList.add('dragging'); }
function handleDragOver(e) { e.preventDefault(); }
function handleDrop(e) {
    e.preventDefault();
    const targetIndex = parseInt(e.currentTarget.dataset.index);
    if (dragSourceIndex !== null && dragSourceIndex !== targetIndex) {
        const movedItem = habits.splice(dragSourceIndex, 1)[0];
        habits.splice(targetIndex, 0, movedItem);
        localStorage.setItem('my_habits', JSON.stringify(habits));
        render();
    }
}
function handleDragEnd(e) { e.currentTarget.classList.remove('dragging'); }

// ─── RESET ────────────────────────────────────────────────────────────────────
function resetAllData() {
    if (confirm('Isso apagará todos os hábitos e histórico permanentemente. Tem certeza?')) {
        localStorage.clear();
        habits = []; history = {}; moodHistory = {}; notesHistory = {};
        activeHabitFilter = null; render();
    }
}

// ─── MODAL HUMOR ──────────────────────────────────────────────────────────────
function openMoodModal(dStr) {
    moodModalDate = dStr;
    const d = new Date(dStr + 'T00:00:00');
    document.getElementById('moodModalDate').innerText =
        d.toLocaleDateString('pt-br', { weekday:'long', day:'numeric', month:'long' });
    const current = moodHistory[dStr];
    document.querySelectorAll('.mood-option').forEach(el =>
        el.classList.toggle('selected', parseInt(el.dataset.value) === current)
    );
    document.getElementById('btnMoodClear').classList.toggle('visible', current !== undefined);
    document.getElementById('moodModalOverlay').classList.add('open');
}
function closeMoodModal(e) {
    if (!e || e.target === document.getElementById('moodModalOverlay')) {
        document.getElementById('moodModalOverlay').classList.remove('open');
        moodModalDate = null;
    }
}
function selectMood(value) {
    if (!moodModalDate) return;
    moodHistory[moodModalDate] = value;
    localStorage.setItem('my_mood', JSON.stringify(moodHistory));
    document.getElementById('moodModalOverlay').classList.remove('open');
    moodModalDate = null; render();
}
function clearMood() {
    if (!moodModalDate) return;
    delete moodHistory[moodModalDate];
    localStorage.setItem('my_mood', JSON.stringify(moodHistory));
    document.getElementById('moodModalOverlay').classList.remove('open');
    moodModalDate = null; render();
}

// ─── MODAL NOTAS ──────────────────────────────────────────────────────────────
function openNoteModal(dStr) {
    noteModalDate = dStr;
    const d = new Date(dStr + 'T00:00:00');
    document.getElementById('noteModalDate').innerText =
        d.toLocaleDateString('pt-br', { weekday:'long', day:'numeric', month:'long' });
    document.getElementById('noteTextarea').value = notesHistory[dStr] || '';
    document.getElementById('noteModalOverlay').classList.add('open');
    setTimeout(() => document.getElementById('noteTextarea').focus(), 50);
}
function closeNoteModal(e) {
    if (!e || e.target === document.getElementById('noteModalOverlay')) {
        document.getElementById('noteModalOverlay').classList.remove('open');
        noteModalDate = null;
    }
}
function saveNote() {
    if (!noteModalDate) return;
    const txt = document.getElementById('noteTextarea').value.trim();
    if (txt) notesHistory[noteModalDate] = txt;
    else delete notesHistory[noteModalDate];
    localStorage.setItem('my_notes', JSON.stringify(notesHistory));
    document.getElementById('noteModalOverlay').classList.remove('open');
    noteModalDate = null; render();
}

// ─── MODAL ESTATÍSTICAS ───────────────────────────────────────────────────────
function openStatsModal(habitIndex) {
    const h          = habits[habitIndex];
    const hName      = h.name || h;
    const hColor     = h.color || '#2ecc71';
    const isLimit    = h.habitType === 'limite';
    const today      = new Date(); today.setHours(0,0,0,0);
    const allDates   = Object.keys(history).sort();

    const totalDone = allDates.filter(dStr => {
        const val = history[dStr]?.[hName];
        return isLimit ? !val : !!val;
    }).length;

    const weeks           = getWeeks(currentMonth, currentYear);
    const daysThisMonth   = weeks.flat().filter(d => d !== null && d <= today);
    const activeThisMonth = daysThisMonth.filter(d => isHabitActiveOnDate(h, d));
    const doneThisMonth   = activeThisMonth.filter(d => {
        const val = history[d.toISOString().split('T')[0]]?.[hName];
        return isLimit ? !val : !!val;
    }).length;
    const pctThisMonth = activeThisMonth.length > 0
        ? Math.round((doneThisMonth / activeThisMonth.length) * 100) : 0;

    const currentStreakVal = getStreak(h);
    const bestStreakVal    = getBestStreak(h);

    let firstDate = today;
    if (allDates.length) {
        const candidate = new Date(allDates[0] + 'T00:00:00');
        if (candidate < firstDate) firstDate = candidate;
    }
    let totalActivePast = 0;
    const cursor = new Date(firstDate);
    while (cursor <= today) {
        if (isHabitActiveOnDate(h, cursor)) totalActivePast++;
        cursor.setDate(cursor.getDate() + 1);
    }
    const overallRate = totalActivePast > 0
        ? Math.round((totalDone / totalActivePast) * 100) : 0;

    const dayFullNames = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
    const doneByDay = [0,0,0,0,0,0,0], countByDay = [0,0,0,0,0,0,0];
    allDates.forEach(dStr => {
        const d = new Date(dStr + 'T00:00:00');
        if (!isHabitActiveOnDate(h, d)) return;
        countByDay[d.getDay()]++;
        const val = history[dStr]?.[hName];
        if (isLimit ? !val : !!val) doneByDay[d.getDay()]++;
    });
    let bestDayIdx = -1, bestDayRate = -1;
    for (let i = 0; i < 7; i++) {
        if (!isHabitActiveOnDate(h, new Date(2024, 0, i)) || countByDay[i] === 0) continue;
        const r = doneByDay[i] / countByDay[i];
        if (r > bestDayRate) { bestDayRate = r; bestDayIdx = i; }
    }

    document.getElementById('statsModalTitle').textContent = hName;
    document.getElementById('statsModalTitle').style.color = hColor;
    document.getElementById('statsModalSubtitle').textContent =
        `${isLimit ? 'hábito de limite' : 'hábito de meta'} · ${h.durationType === 'periodo' ? h.periodDays + ' dias' : 'recorrente'}`;

    document.getElementById('statsGrid').innerHTML = `
        <div class="stats-card">
            <span class="stats-card-label">streak atual</span>
            <span class="stats-card-value" style="color:${currentStreakVal >= 4 ? '#ff9f43' : '#fff'}">${currentStreakVal} dia${currentStreakVal !== 1 ? 's' : ''}</span>
            <span class="stats-card-sub">${currentStreakVal >= 4 ? '🔥 em sequência' : 'consecutivos'}</span>
        </div>
        <div class="stats-card">
            <span class="stats-card-label">melhor streak</span>
            <span class="stats-card-value">${bestStreakVal} dia${bestStreakVal !== 1 ? 's' : ''}</span>
            <span class="stats-card-sub">recorde pessoal</span>
        </div>
        <div class="stats-card">
            <span class="stats-card-label">${isLimit ? 'dias respeitados' : 'dias completos'}</span>
            <span class="stats-card-value" style="color:${hColor}">${totalDone}</span>
            <span class="stats-card-sub">no histórico total</span>
        </div>
        <div class="stats-card">
            <span class="stats-card-label">este mês</span>
            <span class="stats-card-value">${doneThisMonth} / ${activeThisMonth.length}</span>
            <span class="stats-card-sub">${pctThisMonth}% de sucesso</span>
        </div>
        <div class="stats-card">
            <span class="stats-card-label">taxa geral</span>
            <span class="stats-card-value">${overallRate}%</span>
            <span class="stats-card-sub">dias ativos cumpridos</span>
        </div>
        <div class="stats-card">
            <span class="stats-card-label">melhor dia</span>
            <span class="stats-card-value">${bestDayIdx >= 0 ? dayFullNames[bestDayIdx] : '—'}</span>
            <span class="stats-card-sub">${bestDayIdx >= 0 ? Math.round(bestDayRate * 100) + '% de acerto' : 'sem dados'}</span>
        </div>`;

    buildStatsHeatmap(h, hColor, today);
    document.getElementById('statsModalOverlay').classList.add('open');
}

function buildStatsHeatmap(habit, hColor, today) {
    const hName    = habit.name || habit;
    const isLimit  = habit.habitType === 'limite';
    const container = document.getElementById('statsHeatmap');
    container.innerHTML = '';
    const r = parseInt(hColor.slice(1,3),16);
    const g = parseInt(hColor.slice(3,5),16);
    const b = parseInt(hColor.slice(5,7),16);
    const start = new Date(today); start.setDate(start.getDate() - 364);
    for (let i = 0; i < 365; i++) {
        const d    = new Date(start); d.setDate(d.getDate() + i);
        const dStr = d.toISOString().split('T')[0];
        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';
        if (!isHabitActiveOnDate(habit, d)) {
            cell.style.background = 'rgba(255,255,255,0.02)';
            cell.title = `${dStr} — inativo`;
        } else {
            const val     = history[dStr]?.[hName];
            const success = isLimit ? !val : !!val;
            if (d > today) {
                cell.style.background = 'rgba(255,255,255,0.04)';
            } else if (success) {
                cell.style.background = `rgba(${r},${g},${b},0.8)`;
                cell.title = `${dStr} ✓`;
            } else {
                cell.style.background = 'rgba(255,77,77,0.15)';
                cell.title = `${dStr} ✗`;
            }
        }
        container.appendChild(cell);
    }
}

function closeStatsModal(e) {
    if (!e || e.target === document.getElementById('statsModalOverlay')) {
        document.getElementById('statsModalOverlay').classList.remove('open');
    }
}

// ─── MODAL EDITAR HÁBITO ─────────────────────────────────────────────────────
function openEditHabit(i) {
    editHabitIndex    = i;
    const h           = habits[i];
    editSelectedDays  = [...(h.activeDays || [0,1,2,3,4,5,6])];
    editHabitType     = h.habitType     || 'meta';
    editHabitDuration = h.durationType  || 'recorrente';

    document.getElementById('eHabitColor').value  = h.color        || '#2ecc71';
    document.getElementById('eHabitName').value   = h.name         || '';
    document.getElementById('eHabitGoal').value   = h.goal         || '';
    document.getElementById('eHabitPeriod').value = h.periodDays   || '';

    // Notificação
    const notif = h.notif || { type:'none' };
    editNotifType = notif.type || 'none';
    setEditNotif(editNotifType);
    if (notif.intervalH) document.getElementById('eNotifIntervalH').value = notif.intervalH;
    if (notif.fixedTime) document.getElementById('eNotifTime').value = notif.fixedTime;

    setEditType(editHabitType);
    setEditDuration(editHabitDuration);
    buildEditWeekdaysToggle();
    document.getElementById('editHabitOverlay').classList.add('open');
}
function closeEditHabit(e) {
    if (!e || e.target === document.getElementById('editHabitOverlay')) {
        document.getElementById('editHabitOverlay').classList.remove('open');
        editHabitIndex = null;
    }
}
function setEditType(type) {
    editHabitType = type;
    document.getElementById('eBtnTypeMeta').classList.toggle('active', type === 'meta');
    document.getElementById('eBtnTypeLimit').classList.toggle('active', type === 'limite');
}
function setEditDuration(dur) {
    editHabitDuration = dur;
    document.getElementById('eBtnDurRec').classList.toggle('active', dur === 'recorrente');
    document.getElementById('eBtnDurPer').classList.toggle('active', dur === 'periodo');
    document.getElementById('eHabitPeriod').classList.toggle('hidden', dur !== 'periodo');
}
function saveEditHabit() {
    if (editHabitIndex === null) return;
    const name  = document.getElementById('eHabitName').value.trim();
    if (!name) { alert('Nome é obrigatório.'); return; }
    const oldName = habits[editHabitIndex].name || habits[editHabitIndex];

    // Renomeia no histórico se o nome mudou
    if (name !== oldName) {
        Object.keys(history).forEach(dStr => {
            if (history[dStr]?.[oldName] !== undefined) {
                history[dStr][name] = history[dStr][oldName];
                delete history[dStr][oldName];
            }
        });
        localStorage.setItem('my_history', JSON.stringify(history));
        if (activeHabitFilter === oldName) activeHabitFilter = name;
    }

    const goalVal  = parseInt(document.getElementById('eHabitGoal').value);
    const perVal   = parseInt(document.getElementById('eHabitPeriod').value);

    // Notificação
    let notif = { type: editNotifType };
    if (editNotifType === 'interval') {
        notif.intervalH = parseFloat(document.getElementById('eNotifIntervalH').value) || 2;
    } else if (editNotifType === 'fixed') {
        notif.fixedTime = document.getElementById('eNotifTime').value || '08:00';
    }

    habits[editHabitIndex] = {
        ...habits[editHabitIndex],
        name,
        color:        document.getElementById('eHabitColor').value,
        activeDays:   [...editSelectedDays].sort(),
        habitType:    editHabitType,
        durationType: editHabitDuration,
        goal:         !isNaN(goalVal) && goalVal >= 1 ? goalVal : undefined,
        periodDays:   editHabitDuration === 'periodo' && !isNaN(perVal) ? perVal : undefined,
        startDate:    habits[editHabitIndex].startDate || new Date().toISOString().split('T')[0],
        notif,
    };
    localStorage.setItem('my_habits', JSON.stringify(habits));
    document.getElementById('editHabitOverlay').classList.remove('open');
    editHabitIndex = null;
    scheduleNotifs();
    render();
}

// ─── RESUMO MENSAL ────────────────────────────────────────────────────────────
function toggleSummary() {
    summaryOpen = !summaryOpen;
    document.getElementById('summaryHeader').classList.toggle('open', summaryOpen);
    document.getElementById('summaryChevron').classList.toggle('open', summaryOpen);
    document.getElementById('summaryBody').classList.toggle('open', summaryOpen);
    if (summaryOpen) buildSummary();
}

function buildSummary() {
    const weeks       = getWeeks(currentMonth, currentYear);
    const today       = new Date(); today.setHours(0,0,0,0);
    const daysInMonth = weeks.flat().filter(d => d !== null && d <= today);

    if (!habits.length || !daysInMonth.length) {
        document.getElementById('summaryBody').innerHTML =
            `<div class="summary-stat"><span class="summary-stat-label">sem dados</span><span class="summary-stat-value">—</span></div>`;
        return;
    }
    let bestWeekIdx = -1, bestWeekPct = -1;
    weeks.forEach((week, wi) => {
        const wd = week.filter(d => d && d <= today); if (!wd.length) return;
        let done = 0, total = 0;
        wd.forEach(d => {
            const dStr = d.toISOString().split('T')[0];
            habits.forEach(h => {
                if (!isHabitActiveOnDate(h, d)) return; total++;
                const val = history[dStr]?.[h.name||h];
                if (h.habitType === 'limite' ? !val : !!val) done++;
            });
        });
        const pct = total > 0 ? done / total : 0;
        if (pct > bestWeekPct) { bestWeekPct = pct; bestWeekIdx = wi; }
    });
    let bestHabit = null, bestHabitPct = -1;
    habits.forEach(h => {
        const active = daysInMonth.filter(d => isHabitActiveOnDate(h, d)); if (!active.length) return;
        const done = active.filter(d => {
            const val = history[d.toISOString().split('T')[0]]?.[h.name||h];
            return h.habitType === 'limite' ? !val : !!val;
        }).length;
        const pct = done / active.length;
        if (pct > bestHabitPct) { bestHabitPct = pct; bestHabit = h.name||h; }
    });
    const failsByDay = [0,0,0,0,0,0,0];
    daysInMonth.forEach(d => {
        const dStr = d.toISOString().split('T')[0];
        habits.forEach(h => {
            if (!isHabitActiveOnDate(h, d)) return;
            const val = history[dStr]?.[h.name||h];
            const success = h.habitType === 'limite' ? !val : !!val;
            if (!success) failsByDay[d.getDay()]++;
        });
    });
    const dayFullNames = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
    const worstDayIdx  = failsByDay.indexOf(Math.max(...failsByDay));
    let longestStreak = 0, curStreak = 0;
    daysInMonth.forEach(d => {
        const dStr   = d.toISOString().split('T')[0];
        const allDone = habits.every(h => {
            if (!isHabitActiveOnDate(h, d)) return true;
            const val = history[dStr]?.[h.name||h];
            return h.habitType === 'limite' ? !val : !!val;
        });
        if (allDone) { curStreak++; longestStreak = Math.max(longestStreak, curStreak); }
        else curStreak = 0;
    });
    document.getElementById('summaryBody').innerHTML = `
        <div class="summary-stat">
            <span class="summary-stat-label">melhor semana</span>
            <span class="summary-stat-value">${bestWeekIdx >= 0 ? 'Semana ' + (bestWeekIdx + 1) : '—'}</span>
            <span class="summary-stat-sub">${bestWeekIdx >= 0 ? Math.round(bestWeekPct * 100) + '% de sucesso' : ''}</span>
        </div>
        <div class="summary-stat">
            <span class="summary-stat-label">hábito mais consistente</span>
            <span class="summary-stat-value">${bestHabit || '—'}</span>
            <span class="summary-stat-sub">${bestHabit ? Math.round(bestHabitPct * 100) + '% do mês' : ''}</span>
        </div>
        <div class="summary-stat">
            <span class="summary-stat-label">dia com mais falhas</span>
            <span class="summary-stat-value">${dayFullNames[worstDayIdx]}</span>
            <span class="summary-stat-sub">${failsByDay[worstDayIdx]} falha${failsByDay[worstDayIdx] !== 1 ? 's' : ''}</span>
        </div>
        <div class="summary-stat">
            <span class="summary-stat-label">maior sequência perfeita</span>
            <span class="summary-stat-value">${longestStreak} dia${longestStreak !== 1 ? 's' : ''}</span>
            <span class="summary-stat-sub">todos os hábitos completos</span>
        </div>`;
}

function weekBarColor(pct) {
    if (pct < 40) return '#ff4d4d';
    if (pct < 70) return '#f9ca24';
    return '#2ecc71';
}

// ─── RENDER PRINCIPAL ─────────────────────────────────────────────────────────
function render() {
    const today = new Date(); today.setHours(0,0,0,0);
    // Update progress widget
    if (typeof renderTodayProgressWidget === 'function') renderTodayProgressWidget();

    document.getElementById('monthTitle').innerText = `${monthNames[currentMonth]} ${currentYear}`;
    const weeks       = getWeeks(currentMonth, currentYear);
    const daysInMonth = weeks.flat().filter(d => d !== null);

    document.getElementById('weeksHeaderChart').innerHTML =
        weeks.map((_, i) => `<div class="week-chart-label">Semana ${i+1}</div>`).join('');

    // ── Sidebar
    const habitsList = document.getElementById('habitsList');
    habitsList.innerHTML = habits.map((h, i) => {
        const hName      = h.name || h;
        const hColor     = h.color || '#2ecc71';
        const isLimit    = h.habitType === 'limite';
        const activeInMonth = daysInMonth.filter(d => isHabitActiveOnDate(h, d));
        let pct;
        if (isLimit) {
            pct = calcLimitMonthlyPct(h, activeInMonth);
        } else {
            const done = activeInMonth.filter(d => !!history[d.toISOString().split('T')[0]]?.[hName]).length;
            pct = activeInMonth.length > 0 ? Math.round((done / activeInMonth.length) * 100) : 0;
        }
        const streak     = getStreak(h);
        const atRisk     = isStreakAtRisk(h);
        const isActive   = activeHabitFilter === hName ? 'active-filter' : '';

        // Badge de streak
        let streakBadge = '';
        if (streak >= 4) streakBadge = `<span class="streak-badge">🔥${streak}</span>`;
        else if (atRisk && streak > 0) streakBadge = `<span class="streak-at-risk" title="Streak em risco!">⚠${streak}</span>`;
        else streakBadge = `<span class="streak-badge"></span>`;

        const typeBadge = `<span class="habit-type-badge habit-type-badge--${isLimit ? 'limit' : 'meta'}">${isLimit ? 'limite' : 'meta'}</span>`;

        return `
            <div class="row-habit ${isActive}" draggable="true" data-index="${i}"
                 ondragstart="handleDragStart(event)" ondragover="handleDragOver(event)"
                 ondrop="handleDrop(event)" ondragend="handleDragEnd(event)"
                 onclick="setFilter('${hName.replace(/'/g, "\\'")}')">
                <div class="habit-label-cell">
                    ${streakBadge}
                    ${typeBadge}
                    <span class="habit-name" style="border-left:2px solid ${hColor}; padding-left:8px;">${hName}</span>
                    ${habits[i].notif && habits[i].notif.type !== 'none' ? `<span class="notif-badge" title="${habits[i].notif.type==='interval'?'a cada '+habits[i].notif.intervalH+'h':'às '+habits[i].notif.fixedTime}">🔔</span>` : ''}
                    <div class="monthly-progress-wrapper">
                        <div class="monthly-bar-container">
                            <div class="monthly-bar-fill" style="width:${pct}%; background:${hColor}"></div>
                        </div>
                        <span style="font-size:0.6rem; color:#fff; opacity:0.6; min-width:22px">${pct}%</span>
                    </div>
                    <button class="btn-stats" title="estatísticas" onclick="event.stopPropagation(); openStatsModal(${i})">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="1" y="12" width="4" height="11" rx="1"/>
                            <rect x="9" y="7" width="4" height="16" rx="1"/>
                            <rect x="17" y="2" width="4" height="21" rx="1"/>
                        </svg>
                    </button>
                    <button class="btn-stats" title="editar" onclick="event.stopPropagation(); openEditHabit(${i})">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="btn-del" onclick="event.stopPropagation(); removeHabit(${i})">
                        <svg width="10" height="10" viewBox="0 0 448 512" fill="#ff7675">
                            <path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/>
                        </svg>
                    </button>
                </div>
            </div>`;
    }).join('');

    // ── Semanas
    const wrapper = document.getElementById('weeksWrapper');
    wrapper.innerHTML = '';

    weeks.forEach((week, wIdx) => {
        const col = document.createElement('div');
        col.className = 'week-col';
        col.style.backgroundColor = `rgba(255,255,255, ${0.01 + wIdx * 0.02})`;
        const borderColor = weekBorderColors[wIdx % weekBorderColors.length];

        let html = `<div class="row-header">
            <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${borderColor};opacity:0.6;border-radius:3px 3px 0 0;pointer-events:none;"></div>
            <span class="week-title">Semana ${wIdx+1}</span>
            <div style="display:flex;width:100%">`;

        dayNames.forEach((name, dIdx) => {
            const d = week[dIdx];
            const isToday = d && d.getTime() === today.getTime() ? 'today-mark' : '';
            html += `<div class="day-cell" style="flex-direction:column">
                        <span style="font-size:8px;color:#fff;opacity:0.5;margin-bottom:2px">${name}</span>
                        <span class="date-num ${isToday}">${d ? d.getDate() : ''}</span>
                     </div>`;
        });
        html += `</div></div>`;

        // Humor
        html += `<div class="row-mood-week">`;
        week.forEach(d => {
            html += `<div class="mood-cell">`;
            if (d && d <= today) {
                const dStr = d.toISOString().split('T')[0];
                const mv   = moodHistory[dStr];
                html += `<div class="mood-trigger ${mv !== undefined ? 'has-mood' : ''}" onclick="openMoodModal('${dStr}')">${mv !== undefined ? moodEmojis[mv] : ''}</div>`;
            }
            html += `</div>`;
        });
        html += `</div>`;

        // Notas
        html += `<div class="row-notes-week">`;
        week.forEach(d => {
            html += `<div class="note-cell">`;
            if (d && d <= today) {
                const dStr = d.toISOString().split('T')[0];
                html += `<div class="note-trigger ${notesHistory[dStr] ? 'has-note' : ''}" onclick="openNoteModal('${dStr}')">✎</div>`;
            }
            html += `</div>`;
        });
        html += `</div>`;

        // Checkboxes por hábito
        habits.forEach(h => {
            const hName   = h.name || h;
            const hColor  = h.color || '#2ecc71';
            const isLimit = h.habitType === 'limite';
            html += `<div class="row-habit" style="cursor:default">`;
            week.forEach(d => {
                html += `<div class="day-cell">`;
                if (d) {
                    if (!isHabitActiveOnDate(h, d)) {
                        html += `<div class="custom-check off-day"></div>`;
                    } else {
                        const dStr     = d.toISOString().split('T')[0];
                        const val      = history[dStr]?.[hName];
                        const isFuture = d > today;
                        const isToday2 = d.getTime() === today.getTime();

                        let sClass;
                        if (isFuture) {
                            sClass = 'disabled';
                        } else if (isLimit) {
                            // Limite: val=true → usou (marcado) → pode ser falha ou ok dependendo do total
                            if (val)     sClass = 'limit-used';
                            else if (isToday2) sClass = 'today';
                            else         sClass = 'limit-success'; // não usou = bom
                        } else {
                            // Meta: val=true → completou
                            if (val)         sClass = 'checked';
                            else if (isToday2) sClass = 'today';
                            else             sClass = 'missed';
                        }
                        html += `<div class="custom-check ${sClass}" style="--habit-color:${hColor}" onclick="toggleHabit('${dStr}','${hName.replace(/'/g,"\\'")}')"></div>`;
                    }
                }
                html += `</div>`;
            });
            html += `</div>`;
        });

        // Barra semanal — filtrada se há hábito ativo
        const weekDays = week.filter(d => d !== null);
        let weeklyPct = 0;
        const habitsToCount = activeHabitFilter
            ? habits.filter(h => (h.name||h) === activeHabitFilter)
            : habits;

        if (habitsToCount.length > 0) {
            let totalGoalMet = 0;
            habitsToCount.forEach(h => {
                const hName    = h.name || h;
                const isLimit  = h.habitType === 'limite';
                const goal     = (h.goal && h.goal > 0) ? Math.min(h.goal, 7) : null;
                const activeWD = weekDays.filter(d => isHabitActiveOnDate(h, d));
                const doneDays = activeWD.filter(d => {
                    const val = history[d.toISOString().split('T')[0]]?.[hName];
                    return isLimit ? !val : !!val;
                }).length;

                if (isLimit) {
                    // Limite: sucesso se usou ≤ meta (ou zero se sem meta)
                    const limitUsed = activeWD.filter(d => !!history[d.toISOString().split('T')[0]]?.[hName]).length;
                    const limitGoal = goal !== null ? goal : activeWD.length;
                    totalGoalMet += limitUsed <= limitGoal ? 1 : Math.max(0, 1 - (limitUsed - limitGoal) / limitGoal);
                } else {
                    if (goal !== null) totalGoalMet += Math.min(doneDays / goal, 1);
                    else totalGoalMet += activeWD.length > 0 ? doneDays / activeWD.length : 0;
                }
            });
            weeklyPct = (totalGoalMet / habitsToCount.length) * 100;
        }

        const barColor = weekBarColor(weeklyPct);
        const barLabel = activeHabitFilter ? `${activeHabitFilter.substring(0,8)}…` : '';
        html += `<div class="row-footer">
                    <div class="weekly-bar-container">
                        <div class="weekly-bar-fill" style="width:${weeklyPct}%;background:${barColor}"></div>
                    </div>
                    <span style="font-size:9px;color:#fff;margin-top:5px;font-weight:600">${Math.round(weeklyPct)}%</span>
                 </div>`;

        col.innerHTML = html;
        wrapper.appendChild(col);
    });

    if (summaryOpen) buildSummary();
    updateChart(daysInMonth);
}

// ─── FILTRO ───────────────────────────────────────────────────────────────────
function setFilter(hName) {
    activeHabitFilter = (activeHabitFilter === hName) ? null : hName;
    render();
}

// ─── GRÁFICO ──────────────────────────────────────────────────────────────────
function updateChart(daysInMonth) {
    const today = new Date(); today.setHours(0,0,0,0);

    const data = daysInMonth.map(d => {
        const dStr = d.toISOString().split('T')[0];
        const habitsToUse = activeHabitFilter
            ? habits.filter(h => (h.name||h) === activeHabitFilter)
            : habits;
        if (!habitsToUse.length) return 0;

        let totalScore = 0;
        habitsToUse.forEach(h => {
            const hName   = h.name || h;
            const isLimit = h.habitType === 'limite';
            if (!isHabitActiveOnDate(h, d)) return;

            if (isLimit) {
                // Para limite no gráfico: olha a semana que contém esse dia
                const weekGoal = h.goal || 0;
                if (!weekGoal) { totalScore += 100; return; }
                // Dias da mesma semana do mês (ISO: dom-sab)
                const dayOfWeek = d.getDay();
                const weekStart = new Date(d); weekStart.setDate(d.getDate() - dayOfWeek);
                const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
                // Conta usos até o dia d na semana
                let usedThisWeek = 0;
                const cursor = new Date(weekStart);
                while (cursor <= d && cursor <= weekEnd) {
                    const cStr = cursor.toISOString().split('T')[0];
                    if (isHabitActiveOnDate(h, cursor) && history[cStr]?.[hName]) usedThisWeek++;
                    cursor.setDate(cursor.getDate() + 1);
                }
                // 100% se dentro do limite, cai proporcionalmente se acima
                if (usedThisWeek <= weekGoal) totalScore += 100;
                else totalScore += Math.max(0, 100 - ((usedThisWeek - weekGoal) / weekGoal) * 100);
            } else {
                const val = history[dStr]?.[hName];
                totalScore += !!val ? 100 : 0;
            }
        });

        const activeCount = habitsToUse.filter(h => isHabitActiveOnDate(h, d)).length;
        return activeCount > 0 ? totalScore / activeCount : 0;
    });

    const moodData = daysInMonth.map(d => {
        const val = moodHistory[d.toISOString().split('T')[0]];
        return val !== undefined ? ((val - 1) / 4) * 100 : null;
    });

    const chartColor = activeHabitFilter
        ? (habits.find(h => (h.name||h) === activeHabitFilter)?.color || '#fff')
        : (isLight ? '#1a1a1a' : '#ffffff');

    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(document.getElementById('habitsChart'), {
        type: 'line',
        data: {
            labels: daysInMonth.map(d => d.getDate()),
            datasets: [
                { data, borderColor: chartColor, borderWidth: 2, pointRadius: 3,
                  pointBackgroundColor: chartColor, backgroundColor: chartColor + '15',
                  fill: true, tension: 0.4, label: 'hábitos' },
                { data: moodData, borderColor: 'rgba(255,255,255,0.6)', borderWidth: 1.5,
                  pointRadius: 2, pointBackgroundColor: 'rgba(255,255,255,0.8)',
                  backgroundColor: 'rgba(255,255,255,0.04)', fill: false, tension: 0.4,
                  borderDash: [4,3], spanGaps: true, label: 'humor' }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            layout: { padding: { top: 18 } },
            scales: {
                y: { min:0, max:100, grid:{ color: isLight?'rgba(0,0,0,0.07)':'rgba(255,255,255,0.1)' }, ticks:{ color: isLight?'#555':'#fff' } },
                x: { grid:{ display:false }, ticks:{ color: isLight?'#555':'#fff' } }
            },
            plugins: { legend:{ display:false } }
        },
        plugins: [moodEmojiPlugin]
    });
}

// ─── TOGGLE HÁBITO ────────────────────────────────────────────────────────────
function toggleHabit(dStr, hName) {
    const clickedDate = new Date(dStr + 'T00:00:00');
    const today = new Date(); today.setHours(0,0,0,0);
    if (clickedDate > today) return;
    if (!history[dStr]) history[dStr] = {};
    history[dStr][hName] = !history[dStr][hName];
    localStorage.setItem('my_history', JSON.stringify(history));
    render();
}

// ─── ADICIONAR HÁBITO ─────────────────────────────────────────────────────────
function addHabit() {
    const input      = document.getElementById('habitInput');
    const colorInput = document.getElementById('habitColor');
    const goalInput  = document.getElementById('habitGoal');
    const perInput   = document.getElementById('habitPeriod');
    const name       = input.value.trim();
    if (!name) return;
    if (habits.some(h => (h.name||h).toLowerCase() === name.toLowerCase())) {
        alert(`O hábito "${name}" já existe.`); return;
    }
    const goalVal = parseInt(goalInput.value);
    const perVal  = parseInt(perInput.value);
    const habit   = {
        name,
        color:        colorInput.value,
        activeDays:   [...selectedDays].sort(),
        habitType:    newHabitType,
        durationType: newHabitDuration,
        startDate:    new Date().toISOString().split('T')[0],
    };
    if (!isNaN(goalVal) && goalVal >= 1 && goalVal <= 7) habit.goal = goalVal;
    if (newHabitDuration === 'periodo' && !isNaN(perVal) && perVal >= 1) habit.periodDays = perVal;

    habits.push(habit);
    localStorage.setItem('my_habits', JSON.stringify(habits));
    input.value = ''; goalInput.value = ''; perInput.value = '';
    selectedDays = [0,1,2,3,4,5,6];
    buildWeekdaysToggle();
    render();
}

// ─── PROGRESSO MENSAL PARA HÁBITO DE LIMITE ───────────────────────────────────
// Lógica: o hábito fica em 100% enquanto o total de usos não ultrapassa o limite.
// Cada uso além do limite desconta (100 / diasQuePoderiamFalhar) %.
function calcLimitMonthlyPct(habit, activeInMonth) {
    const hName    = habit.name || habit;
    const weekGoal = habit.goal || 0; // usos máximos por semana

    // Calcula o limite mensal: (número de semanas do mês * usos por semana)
    // Se não houver meta definida, usa todos os dias ativos como limite (100% sempre)
    if (!weekGoal) return 100;

    // Conta semanas únicas envolvidas nos dias ativos
    const weekSet = new Set();
    activeInMonth.forEach(d => {
        const key = `${d.getFullYear()}-W${Math.ceil(d.getDate() / 7)}`;
        weekSet.add(key);
    });
    const numWeeks  = weekSet.size || 1;
    const monthLimit = weekGoal * numWeeks;          // ex: 3 dias/sem × 4 sem = 12
    const totalActive = activeInMonth.length;
    const extraDays  = Math.max(0, totalActive - monthLimit); // dias que "não poderia usar"

    // Quantas vezes foi usado no mês
    const usedCount = activeInMonth.filter(d => !!history[d.toISOString().split('T')[0]]?.[hName]).length;

    if (usedCount <= monthLimit) return 100; // dentro do limite → 100%

    // Cada dia de excesso pesa (100 / extraDays) %
    const penaltyPerDay = extraDays > 0 ? (100 / extraDays) : 0;
    const over = usedCount - monthLimit;
    return Math.max(0, Math.round(100 - over * penaltyPerDay));
}

// ─── REMOVER HÁBITO ───────────────────────────────────────────────────────────
function removeHabit(i) {
    if (confirm('remover hábito?')) {
        const hName = habits[i].name || habits[i];
        // Apaga todo o histórico desse hábito para que não ressurja se recriado
        Object.keys(history).forEach(dStr => {
            if (history[dStr] && hName in history[dStr]) {
                delete history[dStr][hName];
                if (!Object.keys(history[dStr]).length) delete history[dStr];
            }
        });
        habits.splice(i, 1);
        localStorage.setItem('my_habits', JSON.stringify(habits));
        localStorage.setItem('my_history', JSON.stringify(history));
        if (activeHabitFilter === hName) activeHabitFilter = null;
        render();
    }
}

// ─── NAVEGAR MESES ────────────────────────────────────────────────────────────
function changeMonth(s) {
    currentMonth += s;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    else if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    render();
}

// ─── NOTIFICAÇÕES DE HÁBITOS ──────────────────────────────────────────────────
// Tipos: 'none' | 'interval' (a cada N horas) | 'fixed' (horário fixo HH:MM)
// Estrutura salva no hábito: notif: { type, intervalH, fixedTime }

let editNotifType = 'none';
const notifTimers = {}; // { habitName: intervalId }

function setEditNotif(type) {
    editNotifType = type;
    document.getElementById('eNotifNone').classList.toggle('active', type==='none');
    document.getElementById('eNotifInterval').classList.toggle('active', type==='interval');
    document.getElementById('eNotifFixed').classList.toggle('active', type==='fixed');
    document.getElementById('eNotifIntervalRow').classList.toggle('hidden', type!=='interval');
    document.getElementById('eNotifFixedRow').classList.toggle('hidden', type!=='fixed');
}

// Solicita permissão de notificação ao carregar
function requestNotifPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function sendNotif(habitName) {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') {
        Notification.requestPermission().then(p => {
            if (p === 'granted') new Notification('Clarity — lembrete de hábito 🔔', { body: `Hora de: ${habitName}`, icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><text y="28" font-size="28">✅</text></svg>' });
        });
        return;
    }
    new Notification('Clarity — lembrete de hábito 🔔', { body: `Hora de: ${habitName}` });
}

function scheduleNotifs() {
    // Limpa timers antigos
    Object.values(notifTimers).forEach(clearInterval);
    habits.forEach(h => {
        const notif = h.notif;
        if (!notif || notif.type === 'none') return;
        const name = h.name || h;
        if (notif.type === 'interval' && notif.intervalH > 0) {
            const ms = notif.intervalH * 60 * 60 * 1000;
            notifTimers[name] = setInterval(() => sendNotif(name), ms);
        } else if (notif.type === 'fixed' && notif.fixedTime) {
            // Verifica a cada minuto se chegou a hora
            notifTimers[name] = setInterval(() => {
                const now = new Date();
                const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
                if (hhmm === notif.fixedTime) sendNotif(name);
            }, 60000);
        }
    });
}

// ─── INICIALIZAÇÃO ────────────────────────────────────────────────────────────
buildWeekdaysToggle();
render();
requestNotifPermission();
scheduleNotifs();

// ═══════════════════════════════════════════════════════════
// SONO
// ═══════════════════════════════════════════════════════════
let sonoHistory   = JSON.parse(localStorage.getItem('clarity_sono'))    || {};
// sonoHistory = { 'YYYY-MM-DD': { start:'23:00', end:'07:00', quality:4, obs:'' } }
let sonoQuality   = 3;
let sonoEditingDate = null; // data sendo editada no modal

function saveSonoHistory() { localStorage.setItem('clarity_sono', JSON.stringify(sonoHistory)); }

function todayKey() { return new Date().toISOString().split('T')[0]; }

function openSonoModal(dateKey = null) {
    sonoEditingDate = dateKey || todayKey();
    const reg   = sonoHistory[sonoEditingDate];
    const d = new Date(sonoEditingDate + 'T12:00:00');
    document.getElementById('sonoModalDate').textContent = d.toLocaleDateString('pt-br',{weekday:'long',day:'numeric',month:'long'});
    document.getElementById('sonoStart').value = reg ? reg.start : '23:00';
    document.getElementById('sonoEnd').value   = reg ? reg.end   : '07:00';
    document.getElementById('sonoObs').value   = reg ? (reg.obs||'') : '';
    sonoQuality = reg ? reg.quality : 3;
    document.getElementById('btnSonoDelete').style.display = reg ? 'inline-flex' : 'none';
    renderSonoQualitySelect();
    document.getElementById('sonoModalOverlay').classList.add('open');
}

function closeSonoModal(e) {
    if (!e || e.target === document.getElementById('sonoModalOverlay'))
        document.getElementById('sonoModalOverlay').classList.remove('open');
}

function selectSonoQuality(v) { sonoQuality = v; renderSonoQualitySelect(); }

function renderSonoQualitySelect() {
    document.querySelectorAll('.sqb').forEach(b => {
        b.classList.toggle('sqb--active', +b.dataset.val === sonoQuality);
    });
}

function calcSonoHours(start, end) {
    const [sh,sm] = start.split(':').map(Number);
    const [eh,em] = end.split(':').map(Number);
    let mins = (eh*60+em) - (sh*60+sm);
    if (mins < 0) mins += 24*60;
    return Math.round(mins/6)/10;
}

function saveSono() {
    const start = document.getElementById('sonoStart').value;
    const end   = document.getElementById('sonoEnd').value;
    const obs   = document.getElementById('sonoObs').value.trim();
    if (!start || !end) return;
    sonoHistory[sonoEditingDate] = { start, end, quality: sonoQuality, obs };
    saveSonoHistory();
    closeSonoModal();
    renderSonoCard();
}

function deleteSonoRecord() {
    if (!confirm('Apagar este registro de sono?')) return;
    delete sonoHistory[sonoEditingDate];
    saveSonoHistory();
    closeSonoModal();
    renderSonoCard();
}

const SONO_QUALITY_LABELS = { 1:'😫 péssima', 2:'😕 ruim', 3:'😐 ok', 4:'😊 boa', 5:'😄 ótima' };

function renderSonoCard() {
    // Summary text
    const today = todayKey();
    const reg   = sonoHistory[today];
    const txt   = document.getElementById('sonoQuickText');
    if (reg) {
        const h = calcSonoHours(reg.start, reg.end);
        txt.textContent = `Hoje: ${h}h de sono (${SONO_QUALITY_LABELS[reg.quality]})`;
    } else {
        txt.textContent = 'Nenhum registro hoje — clique "registrar"';
    }
    
    // Chart with clickable bars
    renderSonoWeekChart();
}

function renderSonoWeekChart() {
    const el  = document.getElementById('sonoWeekChart');
    const now = new Date();
    let bars  = '';
    for (let i=6; i>=0; i--) {
        const d   = new Date(now); d.setDate(d.getDate()-i);
        const key = d.toISOString().split('T')[0];
        const reg = sonoHistory[key];
        const h   = reg ? calcSonoHours(reg.start, reg.end) : 0;
        const pct = Math.min(100, Math.round((h/10)*100));
        const color = h >= 7 ? '#22c55e' : h >= 5 ? '#3b82f6' : h > 0 ? '#ef4444' : 'rgba(255,255,255,0.08)';
        const dayL  = ['D','S','T','Q','Q','S','S'][d.getDay()];
        bars += `<div class="sono-bar-wrap" onclick="openSonoModal('${key}')" title="${h > 0 ? h+'h — clique para editar' : 'sem registro — clique para adicionar'}" style="cursor:pointer">
            <div class="sono-bar-track"><div class="sono-bar-fill" style="height:${pct}%;background:${color}"></div></div>
            <div class="sono-bar-label">${dayL}</div>
        </div>`;
    }
    el.innerHTML = `<div class="sono-bars">${bars}</div>`;
}

// ═══════════════════════════════════════════════════════════
// HIDRATAÇÃO
// ═══════════════════════════════════════════════════════════
let hidData = JSON.parse(localStorage.getItem('clarity_hid')) || {};
// hidData = { 'YYYY-MM-DD': { cups:3, goal:8 } }

function saveHid() { localStorage.setItem('clarity_hid', JSON.stringify(hidData)); }

function getTodayHid() {
    const k = todayKey();
    if (!hidData[k]) hidData[k] = { cups:0, goal: parseInt(localStorage.getItem('hid_goal')||'8') };
    return hidData[k];
}

function addWater(delta) {
    const d = getTodayHid();
    d.cups = Math.max(0, d.cups + delta);
    saveHid(); renderHidCard();
}

function setHidGoal(val) {
    const g = Math.max(1, parseInt(val)||8);
    localStorage.setItem('hid_goal', g);
    getTodayHid().goal = g;
    saveHid(); renderHidCard();
}

function renderHidCard() {
    const d    = getTodayHid();
    const goal = d.goal;
    const cups = d.cups;
    const pct  = Math.min(100, Math.round((cups/goal)*100));
    // Elementos só existem na página de hábitos — sai silenciosamente se não estiverem presentes
    const metaEl = document.getElementById('hidMeta');
    const barEl  = document.getElementById('hidBar');
    const goalEl = document.getElementById('hidGoalInput');
    const gridEl = document.getElementById('hidCupsGrid');
    if (!metaEl) return;
    metaEl.textContent = `${cups} / ${goal} copos`;
    if (goalEl) goalEl.value = goal;
    if (barEl) {
        barEl.style.width = pct + '%';
        barEl.style.background = pct >= 100 ? '#22c55e' : pct >= 60 ? '#3b82f6' : '#93c5fd';
    }
    // Cups grid
    if (gridEl) {
        let html = '';
        for (let i=0; i<goal; i++) {
            html += `<div class="hid-cup ${i < cups ? 'hid-cup--full' : ''}" onclick="addWater(${i < cups ? -1 : 1})" title="${i < cups ? 'remover' : 'adicionar'} copo">💧</div>`;
        }
        gridEl.innerHTML = html;
    }
}

// ═══════════════════════════════════════════════════════════
// RESUMO SEMANAL (aparece todo domingo)
// ═══════════════════════════════════════════════════════════
function checkWeeklySummary() {
    const today = new Date();
    if (today.getDay() !== 0) return; // só domingo
    const wKey = `weekly_seen_${todayKey()}`;
    if (localStorage.getItem(wKey)) return;
    localStorage.setItem(wKey, '1');
    showWeeklySummary();
}

function showWeeklySummary() {
    // Coleta dados dos últimos 7 dias
    const now = new Date();
    let habitsCompleted = 0, habitsPossible = 0;
    let sonoTotal = 0, sonoDays = 0;
    let hidTotal = 0, hidDays = 0;
    const studySessions = JSON.parse(localStorage.getItem('study_sessions'))||{};
    let studyHours = 0;
    const workoutLog = JSON.parse(localStorage.getItem('clarity_workout_log'))||{};
    let workouts = 0;

    for (let i=1; i<=7; i++) {
        const d = new Date(now); d.setDate(d.getDate()-i);
        const key = d.toISOString().split('T')[0];
        // Hábitos
        habits.forEach(h => {
            const val = (history[key]||{})[h.name];
            if (val !== undefined) { habitsPossible++; if (val) habitsCompleted++; }
        });
        // Sono
        const s = sonoHistory[key];
        if (s) { sonoTotal += calcSonoHours(s.start, s.end); sonoDays++; }
        // Hidratação
        const hd = hidData[key];
        if (hd) { hidTotal += hd.cups; hidDays++; }
        // Estudo
        const ss = studySessions[key];
        if (ss) studyHours += ss.reduce((t,s)=>(t+(s.hours||0)),0);
        // Treino
        if ((workoutLog[key]?.exercises||[]).length) workouts++;
    }

    const habitPct = habitsPossible > 0 ? Math.round((habitsCompleted/habitsPossible)*100) : 0;
    const avgSono  = sonoDays > 0 ? Math.round(sonoTotal/sonoDays*10)/10 : 0;
    const avgHid   = hidDays  > 0 ? Math.round(hidTotal/hidDays) : 0;

    const overlay = document.createElement('div');
    overlay.className = 'weekly-overlay';
    overlay.innerHTML = `
        <div class="weekly-modal">
            <div class="weekly-header">
                <div class="weekly-emoji">🗓</div>
                <div class="weekly-title">resumo da semana</div>
                <div class="weekly-sub">${now.toLocaleDateString('pt-br',{day:'numeric',month:'long',year:'numeric'})}</div>
            </div>
            <div class="weekly-stats">
                <div class="weekly-stat">
                    <div class="weekly-stat-val" style="color:#22c55e">${habitPct}%</div>
                    <div class="weekly-stat-lbl">hábitos concluídos</div>
                    <div class="weekly-stat-sub">${habitsCompleted}/${habitsPossible}</div>
                </div>
                <div class="weekly-stat">
                    <div class="weekly-stat-val" style="color:#f97316">${studyHours.toFixed(1)}h</div>
                    <div class="weekly-stat-lbl">horas de estudo</div>
                </div>
                <div class="weekly-stat">
                    <div class="weekly-stat-val" style="color:#3b82f6">${workouts}</div>
                    <div class="weekly-stat-lbl">treinos realizados</div>
                </div>
                <div class="weekly-stat">
                    <div class="weekly-stat-val" style="color:#8b5cf6">${avgSono > 0 ? avgSono+'h' : '—'}</div>
                    <div class="weekly-stat-lbl">média de sono</div>
                </div>
                <div class="weekly-stat">
                    <div class="weekly-stat-val" style="color:#06b6d4">${avgHid > 0 ? avgHid : '—'}</div>
                    <div class="weekly-stat-lbl">copos/dia (média)</div>
                </div>
                <div class="weekly-stat">
                    <div class="weekly-stat-val">${getMoodAvg()}</div>
                    <div class="weekly-stat-lbl">humor médio</div>
                </div>
            </div>
            <button class="weekly-close" onclick="this.closest('.weekly-overlay').remove()">fechar resumo</button>
        </div>`;
    document.body.appendChild(overlay);
}

function getMoodAvg() {
    const now = new Date();
    let total = 0, count = 0;
    for (let i=1; i<=7; i++) {
        const d = new Date(now); d.setDate(d.getDate()-i);
        const key = d.toISOString().split('T')[0];
        const m = moodHistory[key];
        if (m) { total += m; count++; }
    }
    if (!count) return '—';
    const avg = total/count;
    const moodEmojis = { 1:'😞', 2:'😕', 3:'😐', 4:'🙂', 5:'😄' };
    return moodEmojis[Math.round(avg)] || '😐';
}

// Init wellness
renderSonoCard();
renderHidCard();
checkWeeklySummary();


// ─── WIDGET DE PROGRESSO DO DIA ──────────────────────────────────────────────
function renderTodayProgressWidget() {
    const today    = new Date();
    const todayKey = today.toISOString().split('T')[0];
    const dayHabits = habits.filter(h => isHabitActiveOnDate(h, today));
    if (!dayHabits.length) {
        const el = document.getElementById('tpwDetail');
        if (el) el.textContent = 'nenhum hábito para hoje';
        return;
    }
    const done = dayHabits.filter(h => {
        const hName = h.name || h;
        return !!history[todayKey]?.[hName];
    }).length;
    const pct = Math.round((done / dayHabits.length) * 100);
    const circumference = 113.1;
    const offset = circumference - (pct / 100) * circumference;

    const ring   = document.getElementById('tpwRing');
    const pctEl  = document.getElementById('tpwPct');
    const detail = document.getElementById('tpwDetail');
    if (ring)   { ring.style.strokeDashoffset = offset; ring.style.stroke = pct >= 80 ? '#2ecc71' : pct >= 50 ? '#f39c12' : '#3b82f6'; }
    if (pctEl)  pctEl.textContent = pct + '%';
    if (detail) detail.textContent = `${done} de ${dayHabits.length} hábito${dayHabits.length !== 1 ? 's' : ''}`;
}

// ─── MODO COMPACTO ────────────────────────────────────────────────────────────
function applyCompactMode() {
    document.body.classList.toggle('compact-mode', isCompact);
    const btn = document.getElementById('tpwCompactBtn');
    if (btn) {
        btn.textContent = isCompact ? '⊟' : '⊞';
        btn.title = isCompact ? 'Modo normal' : 'Modo compacto';
    }
    // Forçar re-render do gráfico após mudar altura das linhas
    if (typeof renderChart === 'function') setTimeout(renderChart, 50);
}

function toggleCompactMode() {
    isCompact = !isCompact;
    localStorage.setItem('clarity_compact', isCompact);
    applyCompactMode();
}

// ─── TOGGLE GRÁFICO MENSAL ────────────────────────────────────────────────────
let isChartCollapsed = localStorage.getItem('clarity_chart_collapsed') === 'true';

function applyChartCollapsed() {
    const wrapper = document.getElementById('chartWrapper');
    const icon    = document.getElementById('chartCollapseIcon');
    const label   = document.getElementById('chartCollapseLabel');
    if (!wrapper) return;
    wrapper.classList.toggle('chart-collapsed', isChartCollapsed);
    if (label) label.textContent = isChartCollapsed ? 'expandir' : 'recolher';
    if (icon) {
        // Aponta pra cima quando expandido, pra baixo quando recolhido
        icon.setAttribute('d', isChartCollapsed
            ? 'M6 9l6 6 6-6'   // chevron-down
            : 'M18 15l-6-6-6 6' // chevron-up
        );
        // Muda o elemento polyline para path
        icon.innerHTML = isChartCollapsed
            ? '<polyline points="6 9 12 15 18 9"/>'
            : '<polyline points="18 15 12 9 6 15"/>';
    }
}

function toggleChart() {
    isChartCollapsed = !isChartCollapsed;
    localStorage.setItem('clarity_chart_collapsed', isChartCollapsed);
    applyChartCollapsed();
}

applyCompactMode();
applyChartCollapsed();
renderTodayProgressWidget();

// ─── ONBOARDING ───────────────────────────────────────────────────────────────
function showOnboardingIfNeeded() {
    if (localStorage.getItem('clarity_onboarded')) return;
    const overlay = document.getElementById('onboardingOverlay');
    if (overlay) overlay.classList.add('open');
}

function closeOnboarding() {
    localStorage.setItem('clarity_onboarded', '1');
    const overlay = document.getElementById('onboardingOverlay');
    if (overlay) overlay.classList.remove('open');
}

showOnboardingIfNeeded();

// ─── METAS MENSAIS — painel colapsável ───────────────────────────────────────
let metasPanelOpen = localStorage.getItem('clarity_metas_panel') !== 'false';

function applyMetasPanelState() {
    const body    = document.getElementById('metasPanelBody');
    const chevron = document.getElementById('metasPanelChevron');
    if (body)    body.classList.toggle('open', metasPanelOpen);
    if (chevron) chevron.classList.toggle('open', metasPanelOpen);
}

function toggleMetasMensais() {
    metasPanelOpen = !metasPanelOpen;
    localStorage.setItem('clarity_metas_panel', metasPanelOpen);
    applyMetasPanelState();
}

// ─── METAS MENSAIS ────────────────────────────────────────────────────────────
// metasMensais = { 'YYYY-MM': [{id, title, current, target, unit}] }
let metasMensais = JSON.parse(localStorage.getItem('clarity_metas_mensais')) || {};
let editingMetaId = null;

function saveMetasMensais() {
    localStorage.setItem('clarity_metas_mensais', JSON.stringify(metasMensais));
}

function currentMonthKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMetasForCurrentMonth() {
    const key = currentMonthKey();
    if (!metasMensais[key]) metasMensais[key] = [];
    return metasMensais[key];
}

function openMetaMensalForm(id) {
    const overlay = document.getElementById('metaMensalModalOverlay');
    const titleEl = document.getElementById('metaMensalModalTitle');
    const delBtn  = document.getElementById('mmBtnDelete');
    if (!overlay) return;

    if (id !== undefined) {
        // Editar meta existente
        const metas = getMetasForCurrentMonth();
        const meta  = metas.find(m => m.id === id);
        if (!meta) return;
        editingMetaId = id;
        document.getElementById('mmTitle').value   = meta.title;
        document.getElementById('mmCurrent').value = meta.current;
        document.getElementById('mmTarget').value  = meta.target;
        document.getElementById('mmUnit').value    = meta.unit || '';
        titleEl.textContent = 'editar meta';
        delBtn.style.display = 'inline-flex';
    } else {
        // Nova meta
        editingMetaId = null;
        document.getElementById('mmTitle').value   = '';
        document.getElementById('mmCurrent').value = '0';
        document.getElementById('mmTarget').value  = '1';
        document.getElementById('mmUnit').value    = '';
        titleEl.textContent = 'nova meta do mês';
        delBtn.style.display = 'none';
    }
    overlay.classList.add('open');
    setTimeout(() => document.getElementById('mmTitle').focus(), 50);
}

function closeMetaMensalModal(e) {
    if (!e || e.target === document.getElementById('metaMensalModalOverlay')) {
        document.getElementById('metaMensalModalOverlay').classList.remove('open');
        editingMetaId = null;
    }
}

function saveMetaMensal() {
    const title   = document.getElementById('mmTitle').value.trim();
    const current = parseFloat(document.getElementById('mmCurrent').value) || 0;
    const target  = parseFloat(document.getElementById('mmTarget').value)  || 1;
    const unit    = document.getElementById('mmUnit').value.trim();

    if (!title) { document.getElementById('mmTitle').focus(); return; }

    const metas = getMetasForCurrentMonth();

    if (editingMetaId !== null) {
        const idx = metas.findIndex(m => m.id === editingMetaId);
        if (idx >= 0) metas[idx] = { ...metas[idx], title, current, target, unit };
    } else {
        metas.push({ id: Date.now(), title, current, target, unit });
    }

    saveMetasMensais();
    closeMetaMensalModal();
    renderMetasMensais();
}

function deleteMetaMensal() {
    if (editingMetaId === null) return;
    const key = currentMonthKey();
    if (metasMensais[key]) {
        metasMensais[key] = metasMensais[key].filter(m => m.id !== editingMetaId);
    }
    saveMetasMensais();
    closeMetaMensalModal();
    renderMetasMensais();
}

function updateMetaProgress(id, delta) {
    const metas = getMetasForCurrentMonth();
    const meta  = metas.find(m => m.id === id);
    if (!meta) return;
    meta.current = Math.max(0, Math.min(meta.target, parseFloat((meta.current + delta).toFixed(2))));
    saveMetasMensais();
    renderMetasMensais();
}

const MM_COLORS = ['#3b82f6','#8b5cf6','#f97316','#ec4899','#06b6d4','#eab308','#10b981','#f43f5e'];

function renderMetasMensais() {
    const el    = document.getElementById('metasMensaisList');
    const metas = getMetasForCurrentMonth();
    if (!el) return;

    // Badge de contagem
    const countEl = document.getElementById('metasPanelCount');
    if (countEl && metas.length > 0) {
        const done = metas.filter(m => m.current >= m.target).length;
        countEl.textContent = `${done}/${metas.length}`;
    } else if (countEl) { countEl.textContent = ''; }

    applyMetasPanelState();

    if (!metas.length) {
        el.innerHTML = `<div class="metas-empty">nenhuma meta para este mês — clique em "meta do mês" para adicionar</div>`;
        return;
    }

    el.innerHTML = metas.map((meta, idx) => {
        const pct     = Math.min(100, Math.round((meta.current / meta.target) * 100));
        const done    = pct >= 100;
        const unitStr = meta.unit ? ` ${meta.unit}` : '';
        const color   = done ? '#2ecc71' : MM_COLORS[idx % MM_COLORS.length];
        const step    = meta.unit && ['km','kg','h','horas','mi'].includes(meta.unit.toLowerCase()) ? 0.5 : 1;

        // SVG ring (r=22, viewBox 50x50, circ≈138.2)
        const r = 22; const circ = +(2 * Math.PI * r).toFixed(1);
        const offset = +(circ - (pct / 100) * circ).toFixed(1);

        return `<div class="meta-mensal-card ${done ? 'meta-mensal-card--done' : ''}" style="--mm-color:${color}">
            <div class="mm-card-title-row">
                <span class="mm-card-title">${meta.title}</span>
                <button class="mm-edit-btn" onclick="openMetaMensalForm(${meta.id})" title="editar">✎</button>
            </div>

            <div class="mm-card-body">
                <div class="mm-ring-wrap">
                    <svg class="mm-ring-svg" viewBox="0 0 50 50">
                        <circle class="mm-ring-bg" cx="25" cy="25" r="${r}"/>
                        <circle class="mm-ring-fill" cx="25" cy="25" r="${r}"
                            stroke="${color}"
                            stroke-dasharray="${circ}"
                            stroke-dashoffset="${offset}"/>
                    </svg>
                    <div class="mm-ring-pct">${pct}%</div>
                </div>
                <div class="mm-card-stats">
                    <div class="mm-stat-current">${meta.current}${unitStr}</div>
                    <div class="mm-stat-target">de ${meta.target}${unitStr}${done ? ' ✓' : ''}</div>
                </div>
            </div>

            <div class="mm-bar-track">
                <div class="mm-bar-fill" style="width:${pct}%;background:${color}"></div>
            </div>

            <div class="mm-controls">
                <button class="mm-adjust-btn" onclick="updateMetaProgress(${meta.id}, -${step})">−${step}${unitStr}</button>
                <button class="mm-adjust-btn mm-adjust-btn--add" onclick="updateMetaProgress(${meta.id}, ${step})">+${step}${unitStr}</button>
            </div>
        </div>`;
    }).join('');
}

renderMetasMensais();
