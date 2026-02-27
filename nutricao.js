// ─── TEMA ─────────────────────────────────────────────────────────────────────
let isLight = localStorage.getItem('clarity_theme') === 'light';
if (isLight) document.body.classList.add('light');
{ const _tb = document.getElementById('themeToggleBtn'); if (_tb) _tb.textContent = isLight ? '☾ escuro' : '☀ claro'; }
function toggleTheme() {
    isLight = !isLight; document.body.classList.toggle('light', isLight);
    localStorage.setItem('clarity_theme', isLight ? 'light' : 'dark');
    { const _tb = document.getElementById('themeToggleBtn'); if (_tb) _tb.textContent = isLight ? '☾ escuro' : '☀ claro'; }
    renderCalChart();
}

// ─── ESTADO ───────────────────────────────────────────────────────────────────
// nutriLog = { 'YYYY-MM-DD': { meals: [{id, type, name, cal, prot, carb, gord, obs}] } }
let nutriLog  = JSON.parse(localStorage.getItem('clarity_nutri_log'))  || {};
let hidData   = JSON.parse(localStorage.getItem('clarity_hid'))        || {};
let nutriMetas = JSON.parse(localStorage.getItem('clarity_nutri_metas')) || { cal: 2000, prot: 150, carb: 250, gord: 65 };

let currentDate  = new Date();
let macrosChart  = null;
let calChart     = null;

function dateKey(d)  { return d.toISOString().split('T')[0]; }
function todayKey()  { return dateKey(new Date()); }
function saveLog()   { localStorage.setItem('clarity_nutri_log', JSON.stringify(nutriLog)); }
function saveHid()   { localStorage.setItem('clarity_hid', JSON.stringify(hidData)); }
function saveMetas() {
    const cal  = parseInt(document.getElementById('metaCal').value)  || nutriMetas.cal;
    const prot = parseInt(document.getElementById('metaProt').value) || nutriMetas.prot;
    const carb = parseInt(document.getElementById('metaCarb').value) || nutriMetas.carb;
    const gord = parseInt(document.getElementById('metaGord').value) || nutriMetas.gord;
    nutriMetas = { cal, prot, carb, gord };
    localStorage.setItem('clarity_nutri_metas', JSON.stringify(nutriMetas));
    closeMetasModal();
    renderDia();
}

// ─── NAVEGAÇÃO ────────────────────────────────────────────────────────────────
function changeNutriDate(delta) {
    currentDate.setDate(currentDate.getDate() + delta);
    renderDia();
    updateDateTitle();
}

function updateDateTitle() {
    const key   = dateKey(currentDate);
    const today = todayKey();
    const d     = new Date(key + 'T00:00:00');
    let label;
    if (key === today) {
        label = 'hoje — ' + d.toLocaleDateString('pt-br', { weekday: 'long', day: 'numeric', month: 'long' });
    } else {
        const yest = new Date(); yest.setDate(yest.getDate() - 1);
        if (key === dateKey(yest)) {
            label = 'ontem — ' + d.toLocaleDateString('pt-br', { weekday: 'long', day: 'numeric', month: 'long' });
        } else {
            label = d.toLocaleDateString('pt-br', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        }
    }
    document.getElementById('nutriDateTitle').textContent = label;
}

// ─── VIEWS ────────────────────────────────────────────────────────────────────
const VIEW_LABELS = { dia: 'registro diário', agua: 'hidratação', stats: 'estatísticas' };

function setNutriView(view) {
    ['dia', 'agua', 'stats'].forEach(v => {
        const el  = document.getElementById('view' + v.charAt(0).toUpperCase() + v.slice(1));
        const btn = document.getElementById('ndItem' + v.charAt(0).toUpperCase() + v.slice(1));
        if (el)  el.classList.toggle('hidden', v !== view);
        if (btn) btn.classList.toggle('drawer-item--active', v === view);
    });
    document.getElementById('nutriViewLabel').textContent = VIEW_LABELS[view] || view;
    if (view === 'agua')  renderHidCard();
    if (view === 'stats') renderStats();
}

// ─── REGISTRO DIÁRIO ─────────────────────────────────────────────────────────
function getMealsForDay(key) {
    return (nutriLog[key]?.meals || []);
}

function getTotals(meals) {
    return meals.reduce((t, m) => ({
        cal:  t.cal  + (m.cal  || 0),
        prot: t.prot + (m.prot || 0),
        carb: t.carb + (m.carb || 0),
        gord: t.gord + (m.gord || 0),
    }), { cal: 0, prot: 0, carb: 0, gord: 0 });
}

function saveMeal() {
    const name = document.getElementById('mealName').value.trim();
    if (!name) { alert('Informe o nome da refeição.'); return; }
    const type = document.getElementById('mealType').value;
    const cal  = parseFloat(document.getElementById('mealCal').value)  || 0;
    const prot = parseFloat(document.getElementById('mealProt').value) || 0;
    const carb = parseFloat(document.getElementById('mealCarb').value) || 0;
    const gord = parseFloat(document.getElementById('mealGord').value) || 0;
    const obs  = document.getElementById('mealObs').value.trim();

    const key = dateKey(currentDate);
    if (!nutriLog[key]) nutriLog[key] = { meals: [] };
    nutriLog[key].meals.push({ id: Date.now(), type, name, cal, prot, carb, gord, obs });
    saveLog();

    // Clear inputs
    ['mealName', 'mealCal', 'mealProt', 'mealCarb', 'mealGord', 'mealObs'].forEach(id => {
        document.getElementById(id).value = '';
    });
    renderDia();
}

function removeMeal(id) {
    const key = dateKey(currentDate);
    if (!nutriLog[key]) return;
    nutriLog[key].meals = nutriLog[key].meals.filter(m => m.id !== id);
    if (!nutriLog[key].meals.length) delete nutriLog[key];
    saveLog();
    renderDia();
}

const MEAL_ORDER = ['café da manhã', 'lanche da manhã', 'almoço', 'lanche da tarde', 'jantar', 'ceia', 'outro'];

function renderDia() {
    updateDateTitle();
    const key   = dateKey(currentDate);
    const meals = getMealsForDay(key);
    const tots  = getTotals(meals);

    // Macros bar
    const pct = v => Math.min(100, Math.round((v / (nutriMetas.cal || 1)) * 100));
    document.getElementById('totalCal').textContent  = Math.round(tots.cal);
    document.getElementById('totalProt').textContent = tots.prot.toFixed(1) + 'g';
    document.getElementById('totalCarb').textContent = tots.carb.toFixed(1) + 'g';
    document.getElementById('totalGord').textContent = tots.gord.toFixed(1) + 'g';
    document.getElementById('calFill').style.width   = Math.min(100, Math.round((tots.cal / (nutriMetas.cal || 2000)) * 100)) + '%';
    document.getElementById('protFill').style.width  = Math.min(100, Math.round((tots.prot / (nutriMetas.prot || 150)) * 100)) + '%';
    document.getElementById('carbFill').style.width  = Math.min(100, Math.round((tots.carb / (nutriMetas.carb || 250)) * 100)) + '%';
    document.getElementById('gordFill').style.width  = Math.min(100, Math.round((tots.gord / (nutriMetas.gord || 65)) * 100)) + '%';

    // Meals list
    const el = document.getElementById('mealsList');
    if (!meals.length) {
        el.innerHTML = '<div style="padding:30px;text-align:center;color:rgba(255,255,255,0.15);font-size:0.85rem;letter-spacing:0.5px">nenhuma refeição registrada neste dia</div>';
    } else {
        // Group by type
        const groups = {};
        MEAL_ORDER.forEach(t => { groups[t] = []; });
        meals.forEach(m => { if (!groups[m.type]) groups[m.type] = []; groups[m.type].push(m); });
        el.innerHTML = MEAL_ORDER.filter(t => groups[t].length).map(type => {
            const items = groups[type];
            const groupCals = items.reduce((s, m) => s + (m.cal || 0), 0);
            return `<div class="meal-group">
                <div class="meal-group-header">
                    <span class="meal-group-name">${type}</span>
                    <span class="meal-group-cals">${Math.round(groupCals)} kcal</span>
                </div>
                ${items.map(m => `<div class="meal-item">
                    <span class="meal-item-name">${m.name}${m.obs ? ` <span style="font-size:0.72rem;opacity:0.45">(${m.obs})</span>` : ''}</span>
                    <span class="meal-item-macros">
                        ${m.prot ? `<span>P: ${m.prot}g</span>` : ''}
                        ${m.carb ? `<span>C: ${m.carb}g</span>` : ''}
                        ${m.gord ? `<span>G: ${m.gord}g</span>` : ''}
                    </span>
                    <span class="meal-item-cal">${m.cal ? Math.round(m.cal) + ' kcal' : '—'}</span>
                    <button class="meal-item-del" onclick="removeMeal(${m.id})">✕</button>
                </div>`).join('')}
            </div>`;
        }).join('');
    }

    // Donut chart
    renderMacrosDonut(tots);

    // Water quick
    renderWaterQuick();
}

function renderMacrosDonut(tots) {
    if (macrosChart) { macrosChart.destroy(); macrosChart = null; }
    const canvas = document.getElementById('macrosDonut');
    const total  = tots.prot * 4 + tots.carb * 4 + tots.gord * 9;
    document.getElementById('donutCenter').textContent = Math.round(tots.cal) + ' kcal';
    if (!total) return;
    macrosChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['Proteína', 'Carboidratos', 'Gorduras'],
            datasets: [{ data: [tots.prot * 4, tots.carb * 4, tots.gord * 9],
                backgroundColor: ['#f97316', '#eab308', '#a855f7'],
                borderWidth: 0, hoverOffset: 4 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '70%',
            plugins: { legend: { display: false }, tooltip: { callbacks: {
                label: ctx => ` ${ctx.label}: ${Math.round(ctx.parsed)} kcal`
            }}}
        }
    });
}

// ─── HIDRATAÇÃO ──────────────────────────────────────────────────────────────
function getTodayHid() {
    const k = todayKey();
    if (!hidData[k]) hidData[k] = { cups: 0, goal: parseInt(localStorage.getItem('hid_goal') || '8') };
    return hidData[k];
}

function getHidMl() { return parseInt(localStorage.getItem('hid_ml') || '250'); }

function setHidMl(val) {
    const ml = Math.max(50, Math.min(1000, parseInt(val) || 250));
    localStorage.setItem('hid_ml', ml);
    renderHidCard();
}

function addWater(delta) {
    const d = getTodayHid();
    d.cups = Math.max(0, d.cups + delta);
    saveHid();
    renderHidCard();
    renderWaterQuick();
}

function setHidGoal(val) {
    const g = Math.max(1, parseInt(val) || 8);
    localStorage.setItem('hid_goal', g);
    getTodayHid().goal = g;
    saveHid();
    renderHidCard();
}

function renderHidCard() {
    const d    = getTodayHid();
    const goal = d.goal;
    const cups = d.cups;
    const ml   = getHidMl();
    const pct  = Math.min(100, Math.round((cups / goal) * 100));
    const totalMl = cups * ml;

    document.getElementById('aguaCount').textContent       = cups;
    document.getElementById('aguaGoalDisplay').textContent = goal;
    const hidGoalEl = document.getElementById('hidGoalInput');
    if (hidGoalEl) hidGoalEl.value = goal;
    const hidMlEl = document.getElementById('hidMlInput');
    if (hidMlEl) hidMlEl.value = ml;
    document.getElementById('hidBar').style.width = pct + '%';

    const mlEl = document.getElementById('aguaMlTotal');
    if (mlEl) mlEl.textContent = totalMl > 0 ? (totalMl >= 1000 ? `${(totalMl/1000).toFixed(1)}L` : `${totalMl}mL`) : '';

    const grid = document.getElementById('hidCupsGrid');
    let html = '';
    for (let i = 0; i < goal; i++) {
        html += `<div class="hid-cup ${i < cups ? 'hid-cup--full' : ''}" onclick="addWater(${i < cups ? -1 : 1})" title="${i < cups ? 'remover' : 'adicionar'} copo (${ml}mL)">💧</div>`;
    }
    grid.innerHTML = html;

    renderAguaWeekChart();
}

function renderWaterQuick() {
    const d    = getTodayHid();
    const goal = d.goal;
    const cups = d.cups;
    const pct  = Math.min(100, Math.round((cups / goal) * 100));

    const metaEl = document.getElementById('waterQuickMeta');
    const fillEl = document.getElementById('waterQuickFill');
    const cupsEl = document.getElementById('waterQuickCups');
    if (!metaEl) return;

    metaEl.textContent   = `${cups} / ${goal} copos`;
    fillEl.style.width   = pct + '%';
    let html = '';
    for (let i = 0; i < Math.min(goal, 10); i++) {
        html += `<div class="hid-cup ${i < cups ? 'hid-cup--full' : ''}" onclick="addWater(${i < cups ? -1 : 1})" style="font-size:1.1rem">💧</div>`;
    }
    cupsEl.innerHTML = html;
}

function renderAguaWeekChart() {
    const el  = document.getElementById('sonoWeekChart');
    if (!el) return;
    const now = new Date();
    let bars  = '';
    for (let i = 6; i >= 0; i--) {
        const d   = new Date(now); d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        const rec = hidData[key];
        const cups = rec ? rec.cups : 0;
        const goal = rec ? rec.goal : 8;
        const pct  = goal > 0 ? Math.min(100, Math.round((cups / goal) * 100)) : 0;
        const color = cups >= goal ? '#22c55e' : cups >= goal * 0.6 ? '#3b82f6' : cups > 0 ? '#ef4444' : 'rgba(255,255,255,0.08)';
        const dayL  = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][d.getDay()];
        bars += `<div class="sono-bar-wrap" title="${cups} copos">
            <div class="sono-bar-track"><div class="sono-bar-fill" style="height:${pct}%;background:${color}"></div></div>
            <div class="sono-bar-label">${dayL}</div>
        </div>`;
    }
    el.innerHTML = `<div class="sono-bars">${bars}</div>`;
}

// ─── ESTATÍSTICAS ────────────────────────────────────────────────────────────
function renderStats() {
    renderCalChart();
    renderWeekAvg();
    renderTopFoods();
}

function renderCalChart() {
    if (calChart) { calChart.destroy(); calChart = null; }
    const points = [];
    for (let i = 13; i >= 0; i--) {
        const d   = new Date(); d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        const cal = getTotals(getMealsForDay(key)).cal;
        points.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, cal });
    }
    const gc = isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.08)';
    const tc = isLight ? '#555' : 'rgba(255,255,255,0.6)';
    calChart = new Chart(document.getElementById('calChart'), {
        type: 'bar',
        data: {
            labels: points.map(p => p.label),
            datasets: [{
                data: points.map(p => p.cal),
                backgroundColor: '#22c55e88', borderRadius: 6, borderSkipped: false,
                borderColor: '#22c55e', borderWidth: 1
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false },
                tooltip: { callbacks: { label: ctx => ` ${Math.round(ctx.parsed.y)} kcal` } } },
            scales: {
                y: { min: 0, grid: { color: gc }, ticks: { color: tc, callback: v => v + ' kcal' } },
                x: { grid: { display: false }, ticks: { color: tc } }
            }
        }
    });
}

function renderWeekAvg() {
    const el = document.getElementById('statsWeekAvg');
    const totals = { cal: 0, prot: 0, carb: 0, gord: 0 };
    let days = 0;
    for (let i = 0; i < 7; i++) {
        const d   = new Date(); d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        const meals = getMealsForDay(key);
        if (meals.length) {
            const t = getTotals(meals);
            totals.cal  += t.cal;
            totals.prot += t.prot;
            totals.carb += t.carb;
            totals.gord += t.gord;
            days++;
        }
    }
    if (!days) { el.innerHTML = '<div style="color:rgba(255,255,255,0.2);font-size:0.82rem;padding:10px 0">sem dados na última semana</div>'; return; }
    el.innerHTML = `
        <div class="stats-summary-row"><span class="stats-summary-lbl">calorias/dia</span><span class="stats-summary-val">${Math.round(totals.cal / days)} kcal</span></div>
        <div class="stats-summary-row"><span class="stats-summary-lbl">proteína/dia</span><span class="stats-summary-val">${(totals.prot / days).toFixed(1)}g</span></div>
        <div class="stats-summary-row"><span class="stats-summary-lbl">carboidratos/dia</span><span class="stats-summary-val">${(totals.carb / days).toFixed(1)}g</span></div>
        <div class="stats-summary-row"><span class="stats-summary-lbl">gorduras/dia</span><span class="stats-summary-val">${(totals.gord / days).toFixed(1)}g</span></div>
        <div class="stats-summary-row"><span class="stats-summary-lbl">dias registrados</span><span class="stats-summary-val">${days} / 7</span></div>`;
}

function renderTopFoods() {
    const el    = document.getElementById('statsTopFoods');
    const freq  = {};
    Object.values(nutriLog).forEach(day => {
        (day.meals || []).forEach(m => { freq[m.name] = (freq[m.name] || 0) + 1; });
    });
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (!sorted.length) {
        el.innerHTML = '<div style="color:rgba(255,255,255,0.2);font-size:0.82rem;padding:10px 0">nenhum alimento registrado ainda</div>';
        return;
    }
    el.innerHTML = sorted.map(([name, count]) =>
        `<div class="top-food-item">
            <span class="top-food-name">${name}</span>
            <span class="top-food-count">${count}× registrado${count !== 1 ? 's' : ''}</span>
        </div>`
    ).join('');
}

// ─── MODAL METAS ─────────────────────────────────────────────────────────────
function openMetasModal() {
    document.getElementById('metaCal').value  = nutriMetas.cal;
    document.getElementById('metaProt').value = nutriMetas.prot;
    document.getElementById('metaCarb').value = nutriMetas.carb;
    document.getElementById('metaGord').value = nutriMetas.gord;
    document.getElementById('metasModalOverlay').classList.add('open');
}
function closeMetasModal(e) {
    if (e) return;
    document.getElementById('metasModalOverlay').classList.remove('open');
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
renderDia();

// Handle URL param ?view=agua for redirect from habits page
const urlParams = new URLSearchParams(window.location.search);
const initView  = urlParams.get('view');
if (initView === 'agua') {
    setNutriView('agua');
}

// ─── CALENDÁRIO POPUP (nutrição) ─────────────────────────────────────────────
let dpDate = new Date();

function toggleDatePicker() {
    const popup = document.getElementById('datePicker');
    if (!popup) return;
    dpDate = new Date(currentDate);
    const isHidden = popup.classList.contains('hidden');
    popup.classList.add('hidden');
    if (isHidden) {
        const title = document.getElementById('nutriDateTitle');
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
        html += `<span class="dp-day${isSel?' dp-sel':''}${isToday?' dp-today':''}" onclick="dpSelectDate('${ds}')">${d}</span>`;
    }
    html += '</div>';
    grid.innerHTML = html;
}
function dpSelectDate(ds) {
    currentDate = new Date(ds+'T12:00:00');
    closeDatePicker();
    renderDia();
    updateDateTitle();
}
document.addEventListener('click', function(e) {
    const picker = document.getElementById('datePicker');
    const title  = document.getElementById('nutriDateTitle');
    if (!picker || picker.classList.contains('hidden')) return;
    if (!picker.contains(e.target) && e.target !== title) closeDatePicker();
});

function exportNutricao() {
    const data = { nutriLog, hidData, nutriMetas, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data,null,2)], { type:'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href=url; a.download=`clarity-nutricao-${dateKey(new Date())}.json`; a.click();
    URL.revokeObjectURL(url);
}

function importNutricao() {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const data = JSON.parse(ev.target.result);
                if (!confirm('Isso substituirá TODOS os dados de nutrição atuais. Continuar?')) return;
                if (data.nutriLog) { nutriLog = data.nutriLog; saveLog(); }
                if (data.hidData) { hidData = data.hidData; saveHid(); }
                if (data.nutriMetas) { nutriMetas = data.nutriMetas; localStorage.setItem('clarity_nutri_metas', JSON.stringify(nutriMetas)); }
                alert('Dados importados com sucesso!');
                location.reload();
            } catch (err) { alert('Erro ao ler o arquivo: ' + err.message); }
        };
        reader.readAsText(file);
    };
    input.click();
}
