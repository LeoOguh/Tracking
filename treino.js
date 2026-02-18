// ─── TEMA ─────────────────────────────────────────────────────────────────────
let isLight = localStorage.getItem('clarity_theme') === 'light';
if (isLight) document.body.classList.add('light');
document.getElementById('themeToggleBtn').textContent = isLight ? '☾ escuro' : '☀ claro';
function toggleTheme() {
    isLight = !isLight; document.body.classList.toggle('light', isLight);
    localStorage.setItem('clarity_theme', isLight ? 'light' : 'dark');
    document.getElementById('themeToggleBtn').textContent = isLight ? '☾ escuro' : '☀ claro';
    renderProgressChart();
}

// ─── ESTADO ───────────────────────────────────────────────────────────────────
// workoutLog = { 'YYYY-MM-DD': { exercises:[{id,type,muscle,name,equip,sets:[{weight,count,note}],notes}] } }
// workoutPlans = [{id, name, exercises:[{muscle,name,equip,obs}]}]
// bodyMeasures = [{date,peso,altura,peito,cintura,quadril,biceps,coxa,gordura}]

let workoutLog   = JSON.parse(localStorage.getItem('clarity_workout_log'))   || {};
let workoutPlans = JSON.parse(localStorage.getItem('clarity_workout_plans')) || [];
let bodyMeasures = JSON.parse(localStorage.getItem('clarity_body_measures')) || [];

let currentDate       = new Date();
let progressChart     = null;
let editingPlanId     = null;   // null = novo plano
let editingPlanExes   = [];     // exercícios do plano sendo editado
let selectedPlanId    = null;   // plano selecionado para o dia de registro
let paeEquip          = 'livre';
let medidasPesoChart  = null;

const MUSCLE_COLORS = {
    'Peito':'#e74c3c','Costas':'#3498db','Ombro':'#9b59b6','Bíceps':'#2ecc71',
    'Tríceps':'#e67e22','Quadríceps':'#f39c12','Posterior':'#1abc9c','Glúteo':'#e91e63',
    'Panturrilha':'#00bcd4','Abdômen':'#8bc34a','Cardio':'#ff5722','Outro':'#795548'
};

const EXERCISES_BY_MUSCLE = {
    'Peito':       ['Supino reto','Supino inclinado','Supino declinado','Crucifixo','Crossover','Flexão','Peck deck'],
    'Costas':      ['Puxada frontal','Remada curvada','Remada sentado','Pull-up','Levantamento terra','Serrote','Pullover'],
    'Ombro':       ['Desenvolvimento','Elevação lateral','Elevação frontal','Crucifixo invertido','Arnold press','Face pull'],
    'Bíceps':      ['Rosca direta','Rosca alternada','Rosca martelo','Rosca concentrada','Rosca scott','Rosca 21'],
    'Tríceps':     ['Tríceps pulley','Tríceps testa','Tríceps francês','Mergulho','Tríceps coice','Tríceps banco'],
    'Quadríceps':  ['Agachamento','Leg press','Cadeira extensora','Hack squat','Avanço','Afundo','Búlgaro'],
    'Posterior':   ['Mesa flexora','Cadeira flexora','Stiff','Levantamento terra romeno','Leg curl em pé'],
    'Glúteo':      ['Glúteo 4 apoios','Hip thrust','Agachamento sumô','Extensão de quadril','Abdução'],
    'Panturrilha': ['Panturrilha em pé','Panturrilha sentado','Panturrilha no leg press'],
    'Abdômen':     ['Abdominal crunch','Prancha','Abdominal oblíquo','Elevação de pernas','Abdominal máquina'],
    'Outro':       ['__custom__'],
};

// Comparativos de força (em kg)
const FORCE_REFS = [
    { name: 'gato doméstico', kg: 4, emoji: '🐱' },
    { name: 'bulldog inglês', kg: 25, emoji: '🐕' },
    { name: 'dálmata', kg: 32, emoji: '🐕' },
    { name: 'labrador', kg: 40, emoji: '🐕' },
    { name: 'ovelha', kg: 70, emoji: '🐑' },
    { name: 'lobo', kg: 80, emoji: '🐺' },
    { name: 'porco adulto', kg: 100, emoji: '🐷' },
    { name: 'veado', kg: 120, emoji: '🦌' },
    { name: 'leão', kg: 190, emoji: '🦁' },
    { name: 'urso pardo', kg: 250, emoji: '🐻' },
    { name: 'boi', kg: 600, emoji: '🐂' },
    { name: 'bisão', kg: 900, emoji: '🦬' },
    { name: 'hipopótamo', kg: 1500, emoji: '🦛' },
    { name: 'elefante africano', kg: 5000, emoji: '🐘' },
];

// ─── IMAGENS DE EXERCÍCIO ─────────────────────────────────────────────────────
// Fonte: ExerciseDB (API pública) - URLs estáticas funcionais
const EXERCISE_IMAGES = {
    'Supino reto':           'https://wger.de/static/images/exercises/small/7-0.png',
    'Supino inclinado':      'https://wger.de/static/images/exercises/small/23-0.png',
    'Crucifixo':             'https://wger.de/static/images/exercises/small/195-0.png',
    'Puxada frontal':        'https://wger.de/static/images/exercises/small/118-0.png',
    'Remada curvada':        'https://wger.de/static/images/exercises/small/63-0.png',
    'Pull-up':               'https://wger.de/static/images/exercises/small/61-0.png',
    'Levantamento terra':    'https://wger.de/static/images/exercises/small/68-0.png',
    'Desenvolvimento':       'https://wger.de/static/images/exercises/small/78-0.png',
    'Elevação lateral':      'https://wger.de/static/images/exercises/small/79-0.png',
    'Rosca direta':          'https://wger.de/static/images/exercises/small/90-0.png',
    'Rosca martelo':         'https://wger.de/static/images/exercises/small/91-0.png',
    'Tríceps pulley':        'https://wger.de/static/images/exercises/small/25-0.png',
    'Tríceps testa':         'https://wger.de/static/images/exercises/small/79-0.png',
    'Agachamento':           'https://wger.de/static/images/exercises/small/6-0.png',
    'Leg press':             'https://wger.de/static/images/exercises/small/85-0.png',
    'Cadeira extensora':     'https://wger.de/static/images/exercises/small/84-0.png',
    'Mesa flexora':          'https://wger.de/static/images/exercises/small/86-0.png',
    'Stiff':                 'https://wger.de/static/images/exercises/small/68-0.png',
    'Hip thrust':            'https://wger.de/static/images/exercises/small/345-0.png',
    'Panturrilha em pé':     'https://wger.de/static/images/exercises/small/138-0.png',
    'Abdominal crunch':      'https://wger.de/static/images/exercises/small/1-0.png',
    'Prancha':               'https://wger.de/static/images/exercises/small/219-0.png',
};

function dateKey(d)  { return d.toISOString().split('T')[0]; }
function todayKey()  { return dateKey(new Date()); }
function saveLog()   { localStorage.setItem('clarity_workout_log',   JSON.stringify(workoutLog)); }
function savePlans() { localStorage.setItem('clarity_workout_plans', JSON.stringify(workoutPlans)); }
function saveMeasures() { localStorage.setItem('clarity_body_measures', JSON.stringify(bodyMeasures)); }

function totalSetsOfExercise(ex) { return (ex.sets||[]).reduce((s,x) => s + (x.count||1), 0); }
function setLabel(s) {
    const w = s.weight > 0 ? `${s.weight}kg` : 'BW';
    const c = (s.count||1) > 1 ? `${s.count}×` : '';
    const n = s.note ? ` (${s.note})` : '';
    return `${c} ${w}${n}`.trim();
}
function formatDateLabel(d) {
    const key = dateKey(d), today = todayKey();
    if (key === today) return `hoje — ${d.toLocaleDateString('pt-br',{weekday:'long',day:'numeric',month:'long'})}`;
    const yest = new Date(); yest.setDate(yest.getDate()-1);
    if (key === dateKey(yest)) return `ontem — ${d.toLocaleDateString('pt-br',{weekday:'long',day:'numeric',month:'long'})}`;
    return d.toLocaleDateString('pt-br',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
}

function exportTreino() {
    const blob = new Blob([JSON.stringify({workoutLog,workoutPlans,bodyMeasures,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href=url; a.download=`clarity-treino-${todayKey()}.json`; a.click();
    URL.revokeObjectURL(url);
}

// ─── NAVEGAÇÃO DE DATA ────────────────────────────────────────────────────────
function changeDate(delta) { currentDate.setDate(currentDate.getDate()+delta); renderRegistro(); }

// ─── DRAWER ───────────────────────────────────────────────────────────────────
// Drawer agora sempre visível - funções mantidas para compatibilidade mas não fazem nada
function openDrawer() { }
function closeDrawer() { }

const VIEW_LABELS = { planos:'planos', registro:'registrar treino', stats:'estatísticas', medidas:'medidas' };

// ─── VISTAS ───────────────────────────────────────────────────────────────────
function setView(view) {
    ['planos','registro','stats','medidas'].forEach(v => {
        const el = document.getElementById('view'+v.charAt(0).toUpperCase()+v.slice(1));
        if (el) el.classList.toggle('hidden', v !== view);
        const btn = document.getElementById('dItem'+v.charAt(0).toUpperCase()+v.slice(1));
        if (btn) btn.classList.toggle('drawer-item--active', v === view);
    });
    const lbl = document.getElementById('treinoViewLabel');
    if (lbl) lbl.textContent = VIEW_LABELS[view] || view;
    if (view === 'stats')    renderStatsView();
    if (view === 'medidas')  renderMedidas();
    if (view === 'registro') renderRegistro();
    if (view === 'planos')   renderPlansList();
}

// ─── PLANOS: LISTAGEM ─────────────────────────────────────────────────────────
function renderPlansList() {
    const el = document.getElementById('plansList');
    if (!workoutPlans.length) {
        el.innerHTML = `<div class="plans-empty">nenhum plano criado ainda<br><small>clique em "novo plano" para começar</small></div>`;
        return;
    }
    el.innerHTML = workoutPlans.map(p => {
        const muscles = [...new Set((p.exercises||[]).map(e=>e.muscle))].join(', ') || '—';
        const count   = (p.exercises||[]).length;
        return `<div class="plan-card" onclick="openPlan(${p.id})">
            <div class="plan-card-name">${p.name}</div>
            <div class="plan-card-meta">${count} exercício${count!==1?'s':''} · ${muscles}</div>
            <div class="plan-card-exes">${(p.exercises||[]).map(e=>`
                <span class="plan-ex-chip" style="border-color:${MUSCLE_COLORS[e.muscle]||'#555'}33;color:${MUSCLE_COLORS[e.muscle]||'#888'}">
                    ${e.equip==='maquina'?'⚙️':'🏋️'} ${e.name}
                </span>`).join('')}
            </div>
        </div>`;
    }).join('');
}

// ─── PLANOS: EDITOR ───────────────────────────────────────────────────────────
function openNewPlan() {
    editingPlanId   = null;
    editingPlanExes = [];
    document.getElementById('planNameInput').value = '';
    document.getElementById('btnDelPlan').style.display = 'none';
    document.getElementById('planEditor').style.display = 'block';
    document.getElementById('plansWrapper').classList.add('plans-split');
    document.getElementById('plansCenterPanel').classList.add('plans-left');
    renderPlanEditorGroups();
    document.getElementById('planNameInput').focus();
}

function openPlan(id) {
    const plan = workoutPlans.find(p => p.id === id);
    if (!plan) return;
    editingPlanId   = id;
    editingPlanExes = JSON.parse(JSON.stringify(plan.exercises||[]));
    document.getElementById('planNameInput').value = plan.name;
    document.getElementById('btnDelPlan').style.display = 'inline-flex';
    document.getElementById('planEditor').style.display = 'block';
    document.getElementById('plansWrapper').classList.add('plans-split');
    document.getElementById('plansCenterPanel').classList.add('plans-left');
    renderPlanEditorGroups();
}

function closePlanEditor() {
    document.getElementById('planEditor').style.display = 'none';
    document.getElementById('plansWrapper').classList.remove('plans-split');
    document.getElementById('plansCenterPanel').classList.remove('plans-left');
    editingPlanId   = null;
    editingPlanExes = [];
}

function renderPlanEditorGroups() {
    const el = document.getElementById('planMuscleGroups');
    if (!editingPlanExes.length) {
        el.innerHTML = `<div class="plans-empty" style="margin:10px 0">nenhum exercício adicionado</div>`;
        return;
    }
    // Agrupa por músculo
    const groups = {};
    editingPlanExes.forEach((ex, i) => {
        if (!groups[ex.muscle]) groups[ex.muscle] = [];
        groups[ex.muscle].push({...ex, _idx: i});
    });
    el.innerHTML = Object.entries(groups).map(([muscle, exes]) => {
        const color = MUSCLE_COLORS[muscle] || '#7f8c8d';
        return `<div class="plan-muscle-block">
            <div class="plan-muscle-label" style="color:${color}">${muscle}</div>
            ${exes.map(ex => `
                <div class="plan-ex-row">
                    <span class="plan-ex-equip">${ex.equip==='maquina'?'⚙️':'🏋️'}</span>
                    <span class="plan-ex-name">${ex.name}${ex.obs?` <span class="plan-ex-obs">(${ex.obs})</span>`:''}</span>
                    <button class="plan-ex-del" onclick="removePlanEx(${ex._idx})">✕</button>
                </div>`).join('')}
        </div>`;
    }).join('');
}

function onPaeMuscleChange(muscle) {
    if (!muscle) muscle = document.getElementById('paeMusc').value;
    const sel    = document.getElementById('paeEx');
    const custom = document.getElementById('paeExCustom');
    sel.innerHTML = '<option value="">— exercício —</option>';
    if (muscle && EXERCISES_BY_MUSCLE[muscle]) {
        EXERCISES_BY_MUSCLE[muscle].filter(e=>e!=='__custom__').forEach(e=>{
            sel.innerHTML += `<option value="${e}">${e}</option>`;
        });
    }
    sel.innerHTML += '<option value="__custom__">digitar manualmente…</option>';
    custom.classList.add('hidden'); custom.value='';
    sel.onchange = () => {
        custom.classList.toggle('hidden', sel.value!=='__custom__');
        if (sel.value==='__custom__') custom.focus();
    };
}

// ─── AVATAR MUSCULAR ─────────────────────────────────────────────────────────
function initMuscleAvatar() {
    document.querySelectorAll('.muscle-zone').forEach(zone => {
        zone.addEventListener('click', function() {
            const muscle = this.dataset.muscle;
            // Update hidden input
            document.getElementById('paeMusc').value = muscle;
            // Update display
            const nameEl = document.getElementById('muscleSelectedName');
            if (nameEl) {
                nameEl.textContent = muscle;
                nameEl.style.color = MUSCLE_COLORS[muscle] || '#fff';
            }
            // Highlight all zones of this muscle (both SVGs)
            document.querySelectorAll('.muscle-zone').forEach(z => {
                z.classList.toggle('muscle-zone--active', z.dataset.muscle === muscle);
            });
            // Update exercise dropdown
            onPaeMuscleChange(muscle);
        });
    });
}

function setPaeEquip(eq) {
    paeEquip = eq;
    document.getElementById('paeBtnLivre').classList.toggle('equip-btn--active', eq==='livre');
    document.getElementById('paeBtnMaquina').classList.toggle('equip-btn--active', eq==='maquina');
}

function addExToPlan() {
    const muscle  = document.getElementById('paeMusc').value;
    const exSel   = document.getElementById('paeEx');
    const custom  = document.getElementById('paeExCustom');
    const name    = exSel.value==='__custom__' ? custom.value.trim() : exSel.value;
    const obs     = document.getElementById('paeObs').value.trim();
    if (!muscle || !name) { alert('Selecione músculo e exercício.'); return; }

    editingPlanExes.push({ muscle, name, equip: paeEquip, obs });
    // Manter músculo selecionado
    const savedMuscle = muscle;
    document.getElementById('paeEx').innerHTML = '<option value="">— exercício —</option>';
    document.getElementById('paeExCustom').classList.add('hidden');
    document.getElementById('paeObs').value = '';
    // Re-popula exercícios do músculo atual
    if (savedMuscle && EXERCISES_BY_MUSCLE[savedMuscle]) {
        const sel = document.getElementById('paeEx');
        EXERCISES_BY_MUSCLE[savedMuscle].filter(e=>e!=='__custom__').forEach(e=>{
            sel.innerHTML += `<option value="${e}">${e}</option>`;
        });
        sel.innerHTML += '<option value="__custom__">digitar manualmente…</option>';
    }
    renderPlanEditorGroups();
}

function removePlanEx(idx) {
    editingPlanExes.splice(idx, 1);
    renderPlanEditorGroups();
}

function savePlanEdit() {
    const name = document.getElementById('planNameInput').value.trim();
    if (!name) { alert('Dê um nome ao plano.'); return; }
    if (!editingPlanExes.length) { alert('Adicione ao menos um exercício.'); return; }
    if (editingPlanId !== null) {
        const idx = workoutPlans.findIndex(p=>p.id===editingPlanId);
        if (idx >= 0) workoutPlans[idx] = { id:editingPlanId, name, exercises:[...editingPlanExes] };
    } else {
        workoutPlans.push({ id:Date.now(), name, exercises:[...editingPlanExes] });
    }
    savePlans();
    closePlanEditor();
    renderPlansList();
}

function deletePlan() {
    if (!confirm('Apagar este plano?')) return;
    workoutPlans = workoutPlans.filter(p=>p.id!==editingPlanId);
    savePlans();
    closePlanEditor();
    renderPlansList();
}

// ─── REGISTRO: SELECIONAR PLANO ───────────────────────────────────────────────
function renderPlanDaySelector() {
    const row = document.getElementById('pdsPlansList');
    if (!workoutPlans.length) {
        row.innerHTML = `<div style="font-size:0.78rem;color:rgba(255,255,255,0.3)">crie planos na aba "planos" primeiro</div>`;
        return;
    }
    row.innerHTML = workoutPlans.map(p => `
        <button class="pds-plan-btn ${selectedPlanId===p.id?'pds-plan-btn--active':''}" onclick="selectPlan(${p.id})">
            <span class="pds-plan-name">${p.name}</span>
            <span class="pds-plan-count">${(p.exercises||[]).length} exerc.</span>
        </button>`).join('');
}

function selectPlan(id) {
    selectedPlanId = id;
    const plan = workoutPlans.find(p=>p.id===id);
    if (!plan) return;
    renderPlanDaySelector();
    // Monta accordion de exercícios do plano
    document.getElementById('pefPlanName').textContent = plan.name;
    const accordion = document.getElementById('pefExercisesAccordion');
    // Agrupa por músculo
    const groups = {};
    (plan.exercises||[]).forEach((ex, i) => {
        if (!groups[ex.muscle]) groups[ex.muscle] = [];
        groups[ex.muscle].push({...ex, _planIdx: i});
    });
    accordion.innerHTML = Object.entries(groups).map(([muscle, exes]) => {
        const color = MUSCLE_COLORS[muscle] || '#7f8c8d';
        return `<div class="pef-muscle-group">
            <div class="pef-muscle-title" style="border-left:3px solid ${color};padding-left:10px">${muscle}</div>
            ${exes.map(ex => {
                const hint = getProgressionSuggestion(ex.name);
                const id   = `pef_${ex._planIdx}`;
                const img  = EXERCISE_IMAGES[ex.name];
                return `<div class="pef-ex-block glass-panel">
                    <div class="pef-ex-header">
                        ${img ? `<img src="${img}" class="pef-ex-img" alt="${ex.name}" onerror="this.style.display='none'">` : ''}
                        <span class="pef-ex-equip">${ex.equip==='maquina'?'⚙️':'🏋️'}</span>
                        <span class="pef-ex-name">${ex.name}</span>
                        ${ex.obs?`<span class="pef-ex-obs-tag">${ex.obs}</span>`:''}
                    </div>
                    ${hint?`<div class="progression-hint" style="margin:0 0 8px"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>${hint}</div>`:''}
                    <div class="ef-row-add" id="${id}_row">
                        <div class="ef-add-field">
                            <label class="ef-add-label">carga (kg)</label>
                            <input type="number" id="${id}_w" class="f-input ef-num-input" min="0" step="0.5" placeholder="0">
                        </div>
                        <div class="ef-add-field ef-add-field--sm">
                            <label class="ef-add-label">séries</label>
                            <input type="number" id="${id}_s" class="f-input ef-num-input" min="1" step="1" value="1">
                        </div>
                        <div class="ef-add-field ef-add-field--lg">
                            <label class="ef-add-label">obs.</label>
                            <input type="text" id="${id}_n" class="f-input" placeholder="opcional">
                        </div>
                        <button class="btn-add-set" onclick="addSetToAccordion('${id}','${muscle}','${ex.name.replace(/'/g,"\\'")}','${ex.equip||"livre"}')">+ adicionar</button>
                    </div>
                    <div class="pef-chips-wrap" id="${id}_chips"></div>
                </div>`;
            }).join('')}
        </div>`;
    }).join('');
    document.getElementById('planExercisesForm').style.display = 'block';
    document.getElementById('formCardio').classList.add('hidden');
    document.getElementById('btnCardioToggle').classList.remove('active');
}

function cancelPlanSelection() {
    selectedPlanId = null;
    document.getElementById('planExercisesForm').style.display = 'none';
    renderPlanDaySelector();
}

// Dados temporários por exercício do accordion  {id: [{weight,count,note}]}
let accordionSets = {};

function addSetToAccordion(id, muscle, name, equip) {
    const weight = parseFloat(document.getElementById(`${id}_w`).value) || 0;
    const count  = parseInt(document.getElementById(`${id}_s`).value)   || 1;
    const note   = document.getElementById(`${id}_n`).value.trim();
    if (!accordionSets[id]) accordionSets[id] = { muscle, name, equip, sets:[] };
    const existing = accordionSets[id].sets.find(s=>s.weight===weight && s.note===note);
    if (existing) existing.count += count;
    else accordionSets[id].sets.push({weight,count,note});
    // Reset campos mas mantém foco em carga
    document.getElementById(`${id}_w`).value = '';
    document.getElementById(`${id}_s`).value = '1';
    document.getElementById(`${id}_n`).value = '';
    document.getElementById(`${id}_w`).focus();
    renderAccordionChips(id);
    // Show rest timer after adding a set
    restTimerLeft = restTimerTotal;
    showRestTimer(name);
}

function renderAccordionChips(id) {
    const wrap = document.getElementById(`${id}_chips`);
    if (!wrap) return;
    const data = accordionSets[id];
    if (!data?.sets?.length) { wrap.innerHTML=''; return; }
    const total = data.sets.reduce((s,x)=>s+(x.count||1),0);
    wrap.innerHTML = `<div class="pef-chips-row">${data.sets.map((s,i)=>`
        <span class="pending-chip">${setLabel(s)}<button class="pending-chip-del" onclick="removeAccordionSet('${id}',${i})">✕</button></span>`
    ).join('')}</div>
    <div class="pef-chips-total">${total} série${total!==1?'s':''} registrada${total!==1?'s':''}</div>`;
}

function removeAccordionSet(id, idx) {
    if (accordionSets[id]) {
        accordionSets[id].sets.splice(idx,1);
        if (!accordionSets[id].sets.length) delete accordionSets[id];
    }
    renderAccordionChips(id);
}

function saveSession() {
    const entries = Object.entries(accordionSets).filter(([,v])=>v.sets.length);
    if (!entries.length) { alert('Registre ao menos um conjunto de séries antes de salvar.'); return; }
    const key = dateKey(currentDate);
    if (!workoutLog[key]) workoutLog[key] = { exercises:[] };
    entries.forEach(([,v]) => {
        workoutLog[key].exercises.push({
            id: Date.now() + Math.random(),
            type: 'musculacao',
            muscle: v.muscle,
            name: v.name,
            equip: v.equip,
            sets: [...v.sets]
        });
    });
    saveLog();
    accordionSets = {};
    selectedPlanId = null;
    document.getElementById('planExercisesForm').style.display = 'none';
    renderRegistro();
    populateProgressChartSel();
}

// ─── CARDIO ───────────────────────────────────────────────────────────────────
function toggleCardioForm() {
    const form = document.getElementById('formCardio');
    const btn  = document.getElementById('btnCardioToggle');
    const isHidden = form.classList.contains('hidden');
    form.classList.toggle('hidden', !isHidden);
    btn.classList.toggle('active', isHidden);
    if (isHidden) {
        selectedPlanId = null;
        document.getElementById('planExercisesForm').style.display = 'none';
        renderPlanDaySelector();
    }
}
function saveCardio() {
    const activity  = document.getElementById('cfActivity').value.trim();
    const duration  = parseInt(document.getElementById('cfDuration').value) || 0;
    const distance  = parseFloat(document.getElementById('cfDistance').value) || 0;
    const intensity = document.getElementById('cfIntensity').value;
    const obs       = document.getElementById('cfObs').value.trim();
    if (!activity) { alert('Informe a atividade.'); return; }
    const key = dateKey(currentDate);
    if (!workoutLog[key]) workoutLog[key] = { exercises:[] };
    workoutLog[key].exercises.push({ id:Date.now(), type:'cardio', muscle:'Cardio', name:activity, duration, distance, intensity, notes:obs });
    saveLog();
    document.getElementById('cfActivity').value='';
    document.getElementById('cfDuration').value='';
    document.getElementById('cfDistance').value='';
    document.getElementById('cfObs').value='';
    document.getElementById('formCardio').classList.add('hidden');
    document.getElementById('btnCardioToggle').classList.remove('active');
    renderRegistro();
}

function removeExercise(id) {
    const key = dateKey(currentDate);
    if (!workoutLog[key]) return;
    workoutLog[key].exercises = workoutLog[key].exercises.filter(e=>e.id!==id);
    if (!workoutLog[key].exercises.length) delete workoutLog[key];
    saveLog(); renderRegistro(); populateProgressChartSel();
}

// ─── SUGESTÃO DE PROGRESSÃO ───────────────────────────────────────────────────
function getProgressionSuggestion(exerciseName) {
    const today = todayKey();
    const history = [];
    Object.keys(workoutLog).sort().forEach(dateStr => {
        if (dateStr >= today) return;
        (workoutLog[dateStr]?.exercises||[]).forEach(ex => {
            if (ex.type!=='cardio' && ex.name?.toLowerCase()===exerciseName.toLowerCase())
                history.push(ex);
        });
    });
    if (!history.length) return null;
    const last    = history[history.length-1];
    const sets    = (last.sets||[]).filter(s=>s.weight>0);
    if (!sets.length) return null;
    const maxW    = Math.max(...sets.map(s=>s.weight));
    const total   = sets.reduce((s,x)=>s+(x.count||1),0);
    return `Última: ${maxW}kg · ${total} série${total!==1?'s':''}. Tente ${maxW+2.5}kg ou +1 série.`;
}

// ─── RENDER REGISTRO ──────────────────────────────────────────────────────────
function renderRegistro() {
    document.getElementById('treinoDateTitle').textContent = formatDateLabel(currentDate);
    renderStats();
    renderDayAnimal();
    renderExercisesList();
    renderPlanDaySelector();
    renderRecentHistory();
    populateProgressChartSel();
}

// ─── ANIMAL DO DIA (aba registro) ────────────────────────────────────────────
function renderDayAnimal() {
    const key   = dateKey(currentDate);
    const exes  = (workoutLog[key]?.exercises||[]).filter(e=>e.type!=='cardio');
    const panel = document.getElementById('regAnimalPanel');
    if (!exes.length || !panel) { if (panel) panel.style.display='none'; return; }
    let maxLift=0;
    exes.forEach(ex=>(ex.sets||[]).forEach(s=>{ if(s.weight>maxLift) maxLift=s.weight; }));
    if (!maxLift) { panel.style.display='none'; return; }
    panel.style.display='block';
    const animal = [...FORCE_REFS].reverse().find(a=>a.kg<=maxLift)||FORCE_REFS[0];
    const nextAn = FORCE_REFS.find(a=>a.kg>maxLift);
    panel.innerHTML=`<div class="reg-animal-inner">
        <div style="font-size:2.2rem;line-height:1">${animal.emoji}</div>
        <div class="animal-info">
            <div class="animal-title">força deste treino</div>
            <div class="animal-desc">com <strong>${maxLift}kg</strong> você consegue levantar um <strong>${animal.name}</strong> (${animal.kg}kg)</div>
            ${nextAn?`<div class="animal-next">próximo: ${nextAn.emoji} ${nextAn.name} — faltam <strong>${nextAn.kg-maxLift}kg</strong></div>`:'<div class="animal-next">🏆 nível máximo atingido!</div>'}
        </div>
    </div>`;
}

function renderStats() {
    const key  = dateKey(currentDate);
    const exes = workoutLog[key]?.exercises || [];
    const musc = exes.filter(e=>e.type!=='cardio');
    const sets = musc.reduce((s,e)=>s+totalSetsOfExercise(e),0);
    let weekSessions = 0;
    for (let i=0;i<7;i++) { const d=new Date(); d.setDate(d.getDate()-i); if((workoutLog[dateKey(d)]?.exercises||[]).length) weekSessions++; }
    let prCount = 0;
    musc.forEach(ex=>{
        const maxToday = Math.max(...(ex.sets||[]).filter(s=>s.weight>0).map(s=>s.weight),0);
        const allPrev  = Object.keys(workoutLog).filter(d=>d<key).flatMap(d=>(workoutLog[d].exercises||[]).filter(e=>e.name===ex.name&&e.type!=='cardio').flatMap(e=>(e.sets||[]).map(s=>s.weight)));
        if (maxToday>0 && (!allPrev.length||maxToday>Math.max(...allPrev))) prCount++;
    });
    document.getElementById('treinoStatsRow').innerHTML=`
        <div class="ts-card"><span class="ts-label">exercícios hoje</span><span class="ts-value">${musc.length}</span><span class="ts-sub">${sets} séries</span></div>
        <div class="ts-card"><span class="ts-label">treinos esta semana</span><span class="ts-value">${weekSessions}</span><span class="ts-sub">dos últimos 7 dias</span></div>
        <div class="ts-card"><span class="ts-label">recordes hoje</span><span class="ts-value ${prCount?'pr-value':''}">${prCount||'—'}</span><span class="ts-sub">novos PRs 🏆</span></div>`;
}

function renderExercisesList() {
    const key  = dateKey(currentDate);
    const exes = workoutLog[key]?.exercises || [];
    const el   = document.getElementById('exercisesList');
    const title= document.getElementById('exercisesListTitle');
    title.textContent = key===todayKey() ? 'exercícios de hoje' : `exercícios — ${new Date(key+'T00:00:00').toLocaleDateString('pt-br',{day:'2-digit',month:'2-digit'})}`;
    if (!exes.length) { el.innerHTML=`<div class="empty-exercises">nenhum exercício registrado neste dia</div>`; return; }
    el.innerHTML = exes.map(ex => {
        const color = MUSCLE_COLORS[ex.muscle]||'#7f8c8d';
        if (ex.type==='cardio') {
            const parts = [ex.duration&&`${ex.duration} min`, ex.distance&&`${ex.distance} km`, ex.intensity].filter(Boolean);
            return `<div class="exercise-entry"><div class="ee-header">
                <span class="ee-muscle-tag" style="background:${color}22;color:${color}">cardio</span>
                <span class="ee-name">${ex.name}</span>
                <button class="ee-del" onclick="removeExercise(${ex.id})">✕</button>
            </div>
            <div class="ee-cardio-info">${parts.map(p=>`<span class="ee-cardio-badge">${p}</span>`).join('')}</div>
            ${ex.notes?`<div class="ee-notes">${ex.notes}</div>`:''}</div>`;
        }
        const totalSets = totalSetsOfExercise(ex);
        const setsHtml  = (ex.sets||[]).map(s=>{
            const allPrev = Object.keys(workoutLog).filter(d=>d<key).flatMap(d=>(workoutLog[d].exercises||[]).filter(e=>e.name===ex.name&&e.type!=='cardio').flatMap(e=>(e.sets||[]).map(x=>x.weight)));
            const isPR    = s.weight>0 && (!allPrev.length||s.weight>Math.max(...allPrev));
            return `<span class="ee-set-chip${isPR?' pr':''}">${setLabel(s)}${isPR?' 🏆':''}</span>`;
        }).join('');
        const equipBadge = ex.equip==='maquina' ? '<span class="equip-badge equip-badge--maquina">⚙️ máquina</span>' : '<span class="equip-badge equip-badge--livre">🏋️ livre</span>';
        return `<div class="exercise-entry"><div class="ee-header">
            <span class="ee-muscle-tag" style="background:${color}22;color:${color}">${ex.muscle}</span>
            <span class="ee-name">${ex.name}</span>
            ${equipBadge}
            <button class="ee-del" onclick="removeExercise(${ex.id})">✕</button>
        </div>
        <div class="ee-sets">${setsHtml}</div>
        <div class="ee-serie-total">${totalSets} série${totalSets!==1?'s':''}</div></div>`;
    }).join('');
}

// ─── GRÁFICO PROGRESSÃO ───────────────────────────────────────────────────────
function populateProgressChartSel() {
    const sel  = document.getElementById('chartExerciseSel');
    const prev = sel.value;
    const names = new Set();
    Object.values(workoutLog).forEach(day=>(day.exercises||[]).filter(e=>e.type!=='cardio').forEach(e=>names.add(e.name)));
    sel.innerHTML = '<option value="">selecione um exercício</option>'+[...names].sort().map(n=>`<option value="${n}">${n}</option>`).join('');
    if (prev && [...names].includes(prev)) sel.value=prev;
    renderProgressChart();
}

function renderProgressChart() {
    const name = document.getElementById('chartExerciseSel').value;
    if (progressChart) { progressChart.destroy(); progressChart=null; }
    const el = document.getElementById('pcpPR');
    if (!name) { el.textContent=''; return; }
    const points=[];
    Object.keys(workoutLog).sort().forEach(dateStr=>{
        (workoutLog[dateStr]?.exercises||[]).filter(e=>e.type!=='cardio'&&e.name?.toLowerCase()===name.toLowerCase()).forEach(ex=>{
            const maxLoad=Math.max(...(ex.sets||[]).filter(s=>s.weight>0).map(s=>s.weight),0);
            if (maxLoad>0) points.push({dateStr,maxLoad});
        });
    });
    if (!points.length) { el.textContent='sem dados.'; return; }
    const pr=Math.max(...points.map(p=>p.maxLoad));
    el.textContent=`🏆 recorde: ${pr}kg`;
    const gc=isLight?'rgba(0,0,0,0.07)':'rgba(255,255,255,0.08)';
    const tc=isLight?'#555':'rgba(255,255,255,0.6)';
    progressChart=new Chart(document.getElementById('progressChart'),{
        type:'line',
        data:{labels:points.map(p=>{const d=new Date(p.dateStr+'T00:00:00');return `${d.getDate()}/${d.getMonth()+1}`;}),
              datasets:[{data:points.map(p=>p.maxLoad),borderColor:'#3498db',borderWidth:2,pointRadius:4,pointBackgroundColor:'#3498db',backgroundColor:'#3498db22',fill:true,tension:0.4,label:'carga máx'}]},
        options:{responsive:true,maintainAspectRatio:false,
            plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>` ${ctx.parsed.y}kg`}}},
            scales:{y:{min:0,grid:{color:gc},ticks:{color:tc,callback:v=>v+'kg'}},x:{grid:{display:false},ticks:{color:tc}}}}
    });
}

function renderRecentHistory() {
    const sessions=Object.keys(workoutLog).sort().reverse().slice(0,5);
    const el=document.getElementById('recentHistoryList');
    if (!sessions.length) { el.innerHTML='<div style="font-size:0.75rem;color:rgba(255,255,255,0.2);padding:8px 0">sem histórico ainda</div>'; return; }
    el.innerHTML=sessions.map(dateStr=>{
        const day=workoutLog[dateStr];
        const exes=day.exercises||[];
        const musc=exes.filter(e=>e.type!=='cardio');
        const sets=musc.reduce((s,e)=>s+totalSetsOfExercise(e),0);
        const muscles=[...new Set(exes.map(e=>e.muscle))].join(', ')||'—';
        const d=new Date(dateStr+'T00:00:00');
        return `<div class="rh-session">
            <span class="rh-session-date">${d.toLocaleDateString('pt-br',{weekday:'short',day:'2-digit',month:'short'})}</span>
            <span class="rh-session-name">${muscles}</span>
            <span class="rh-session-stats">${exes.length} exerc.${sets>0?' · '+sets+' séries':''}</span>
        </div>`;
    }).join('');
}

// ─── ESTATÍSTICAS ─────────────────────────────────────────────────────────────
function renderStatsView() {
    renderStatsMuscle();
    renderStatsFreq();
    renderStatsCalendar();
    renderStatsSummary();
    renderStatsAnimals();
    renderStatsPRs();
}

function renderStatsMuscle() {
    const muscleSets={};
    for (let i=6;i>=0;i--) {
        const d=new Date(); d.setDate(d.getDate()-i);
        (workoutLog[dateKey(d)]?.exercises||[]).forEach(ex=>{
            if (ex.type==='cardio') return;
            muscleSets[ex.muscle]=(muscleSets[ex.muscle]||0)+totalSetsOfExercise(ex);
        });
    }
    const entries=Object.entries(muscleSets).sort((a,b)=>b[1]-a[1]);
    const max=entries[0]?.[1]||1;
    const el=document.getElementById('statsMuscleList');
    if (!entries.length) { el.innerHTML='<div class="empty-exercises">nenhum treino esta semana</div>'; return; }
    el.innerHTML=entries.map(([muscle,sets])=>{
        const pct=Math.round((sets/max)*100);
        const color=MUSCLE_COLORS[muscle]||'#7f8c8d';
        return `<div class="muscle-bar-row">
            <span class="muscle-bar-name">${muscle}</span>
            <div class="muscle-bar-track"><div class="muscle-bar-fill" style="width:${pct}%;background:${color}"></div></div>
            <span class="muscle-bar-val">${sets} série${sets!==1?'s':''}</span>
        </div>`;
    }).join('');
}

function renderStatsFreq() {
    const weeks=[];
    for (let w=3;w>=0;w--) {
        let s=0;
        for (let d=0;d<7;d++) { const date=new Date(); date.setDate(date.getDate()-w*7-d); if((workoutLog[dateKey(date)]?.exercises||[]).length) s++; }
        const start=new Date(); start.setDate(start.getDate()-w*7-6);
        weeks.push({label:`${start.getDate()}/${start.getMonth()+1}`,sessions:s});
    }
    const gc=isLight?'rgba(0,0,0,0.07)':'rgba(255,255,255,0.08)';
    const tc=isLight?'#555':'rgba(255,255,255,0.6)';
    const canvas=document.getElementById('statsFreqChart');
    if (window._statsFreqChart) window._statsFreqChart.destroy();
    window._statsFreqChart=new Chart(canvas,{
        type:'bar',
        data:{labels:weeks.map(w=>w.label),datasets:[{data:weeks.map(w=>w.sessions),backgroundColor:'#3498db99',borderRadius:6,borderSkipped:false}]},
        options:{responsive:true,maintainAspectRatio:false,
            plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>` ${ctx.parsed.y} dia${ctx.parsed.y!==1?'s':''}`}}},
            scales:{y:{min:0,max:7,grid:{color:gc},ticks:{color:tc,stepSize:1}},x:{grid:{display:false},ticks:{color:tc}}}}
    });
}

// Calendário navegável — mês único
let calViewYear  = new Date().getFullYear();
let calViewMonth = new Date().getMonth();
const CAL_MONTH_NAMES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

function calPrevMonth() { calViewMonth--; if (calViewMonth<0){calViewMonth=11;calViewYear--;} renderStatsCalendar(); }
function calNextMonth() { calViewMonth++; if (calViewMonth>11){calViewMonth=0;calViewYear++;} renderStatsCalendar(); }

function renderStatsCalendar() {
    const el    = document.getElementById('statsCalendar');
    const label = document.getElementById('calMonthLabel');
    if (label) label.textContent = `${CAL_MONTH_NAMES[calViewMonth]} ${calViewYear}`;
    const daysInMonth = new Date(calViewYear, calViewMonth+1, 0).getDate();
    const firstDay    = new Date(calViewYear, calViewMonth, 1).getDay();
    let html = '';
    // Cabeçalho dias da semana
    ['D','S','T','Q','Q','S','S'].forEach(d => { html += `<div class="cal-cell cal-cell--header">${d}</div>`; });
    for (let i=0;i<firstDay;i++) html += '<div class="cal-cell cal-cell--empty"></div>';
    for (let d=1;d<=daysInMonth;d++) {
        const key   = `${calViewYear}-${String(calViewMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const exes  = workoutLog[key]?.exercises||[];
        const hasMu = exes.some(e=>e.type!=='cardio');
        const hasCa = exes.some(e=>e.type==='cardio');
        const isToday = key===todayKey();
        const muscles = hasMu ? [...new Set(exes.filter(e=>e.type!=='cardio').map(e=>e.muscle))] : [];
        let cls = 'cal-cell cal-cell--lg';
        if (hasMu) cls += ' cal-cell--workout';
        else if (hasCa) cls += ' cal-cell--cardio';
        if (isToday) cls += ' cal-cell--today';
        const hasData = hasMu||hasCa;
        const dotHtml = muscles.slice(0,3).map(m=>`<div class="cal-muscle-dot" style="background:${MUSCLE_COLORS[m]||'#7f8c8d'}"></div>`).join('');
        html += `<div class="${cls}" ${hasData?`onclick="openCalDayModal('${key}')" title="ver detalhes"`:''}">
            <span class="cal-day-num">${d}</span>
            ${dotHtml ? `<div class="cal-dots">${dotHtml}</div>` : ''}
        </div>`;
    }
    el.innerHTML = `<div class="cal-month-grid-lg">${html}</div>`;
}

function openCalDayModal(key) {
    const exes = workoutLog[key]?.exercises||[];
    if (!exes.length) return;
    const d = new Date(key+'T00:00:00');
    document.getElementById('calDayDate').textContent = d.toLocaleDateString('pt-br',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    const musc = exes.filter(e=>e.type!=='cardio');
    const sets = musc.reduce((s,e)=>s+totalSetsOfExercise(e),0);
    let maxLift=0;
    musc.forEach(ex=>(ex.sets||[]).forEach(s=>{ if(s.weight>maxLift) maxLift=s.weight; }));
    const animal = maxLift>0 ? ([...FORCE_REFS].reverse().find(a=>a.kg<=maxLift)||FORCE_REFS[0]) : null;
    document.getElementById('calDayContent').innerHTML = `
        <div class="cal-day-stats">
            <div class="cal-day-stat"><span class="cal-day-stat-val">${exes.length}</span><span class="cal-day-stat-lbl">exercícios</span></div>
            <div class="cal-day-stat"><span class="cal-day-stat-val">${sets}</span><span class="cal-day-stat-lbl">séries totais</span></div>
            <div class="cal-day-stat"><span class="cal-day-stat-val">${maxLift ? maxLift+'kg' : '—'}</span><span class="cal-day-stat-lbl">carga máxima</span></div>
            ${animal?`<div class="cal-day-stat"><span class="cal-day-stat-val">${animal.emoji}</span><span class="cal-day-stat-lbl">${animal.name}</span></div>`:`<div class="cal-day-stat"><span class="cal-day-stat-val">—</span><span class="cal-day-stat-lbl">nível de força</span></div>`}
        </div>
        <div class="cal-day-exercises">
            <div class="cal-day-exercises-title">exercícios realizados</div>
            ${exes.map(ex=>{
                const color=MUSCLE_COLORS[ex.muscle]||'#7f8c8d';
                if (ex.type==='cardio') return `<div class="cal-day-ex"><span class="ee-muscle-tag" style="background:${color}22;color:${color};flex-shrink:0">cardio</span><span class="cal-day-ex-name">${ex.name}${ex.duration?' · '+ex.duration+'min':''}</span></div>`;
                const total=totalSetsOfExercise(ex);
                const exMaxLift=Math.max(0,...(ex.sets||[]).map(s=>s.weight||0));
                return `<div class="cal-day-ex">
                    <span class="ee-muscle-tag" style="background:${color}22;color:${color};flex-shrink:0">${ex.muscle}</span>
                    <span class="cal-day-ex-name">${ex.name}${exMaxLift?' · '+exMaxLift+'kg':''}</span>
                    <span class="cal-day-ex-sets">${total} série${total!==1?'s':''}</span>
                </div>`;
            }).join('')}
        </div>`;
    document.getElementById('calDayOverlay').classList.add('open');
}

function closeCalDayModal(e) {
    if (!e || e.target===document.getElementById('calDayOverlay'))
        document.getElementById('calDayOverlay').classList.remove('open');
}

function renderStatsSummary() {
    let totalSessions=0,totalExes=0,totalSets=0;
    const muscleDays={};
    for (let i=0;i<30;i++) {
        const d=new Date(); d.setDate(d.getDate()-i);
        const day=workoutLog[dateKey(d)];
        if (!day?.exercises?.length) continue;
        totalSessions++;
        day.exercises.forEach(ex=>{
            if (ex.type==='cardio') return;
            totalExes++;
            totalSets+=totalSetsOfExercise(ex);
            muscleDays[ex.muscle]=(muscleDays[ex.muscle]||0)+1;
        });
    }
    const topMuscle=Object.entries(muscleDays).sort((a,b)=>b[1]-a[1])[0];
    const avgSets=totalSessions>0?Math.round(totalSets/totalSessions):0;
    document.getElementById('statsSummary').innerHTML=`
        <div class="stats-summary-row"><span class="stats-summary-lbl">treinos</span><span class="stats-summary-val">${totalSessions}</span></div>
        <div class="stats-summary-row"><span class="stats-summary-lbl">exercícios</span><span class="stats-summary-val">${totalExes}</span></div>
        <div class="stats-summary-row"><span class="stats-summary-lbl">total de séries</span><span class="stats-summary-val">${totalSets}</span></div>
        <div class="stats-summary-row"><span class="stats-summary-lbl">média séries/treino</span><span class="stats-summary-val">${avgSets}</span></div>
        <div class="stats-summary-row"><span class="stats-summary-lbl">músculo + trabalhado</span><span class="stats-summary-val" style="color:${MUSCLE_COLORS[topMuscle?.[0]]||'#fff'}">${topMuscle?.[0]||'—'}</span></div>`;
}

// 🦁 Comparativo global de força com animais
function renderStatsAnimals() {
    let maxLift = 0, maxEx = '', totalVol = 0;
    Object.values(workoutLog).forEach(day=>{
        (day.exercises||[]).filter(e=>e.type!=='cardio').forEach(ex=>{
            (ex.sets||[]).forEach(s=>{
                const w = s.weight||0;
                if (w > maxLift) { maxLift=w; maxEx=ex.name; }
                totalVol += w*(s.count||1);
            });
        });
    });
    const el = document.getElementById('statsAnimals');
    if (!maxLift) { el.innerHTML='<div class="empty-exercises">registre seus primeiros treinos para ver a comparação!</div>'; return; }

    const liftAnimal = [...FORCE_REFS].reverse().find(a=>a.kg<=maxLift)||FORCE_REFS[0];
    const nextAnimal = FORCE_REFS.find(a=>a.kg>maxLift);
    const volKg      = Math.round(totalVol); // total em kg
    const volTons    = Math.round(volKg/100)/10; // em toneladas com 1 casa decimal
    // Para volume: quantos do maior animal que consegue levantar (liftAnimal) caberiam no volume?
    const nAnimals   = liftAnimal.kg > 0 ? Math.round(volKg / liftAnimal.kg) : 1;

    el.innerHTML=`
        <div class="animal-stat">
            <div style="font-size:2.5rem;line-height:1">${liftAnimal.emoji}</div>
            <div class="animal-info">
                <div class="animal-title">carga máxima levantada</div>
                <div class="animal-desc"><strong>${maxLift}kg</strong> no ${maxEx} — equivalente ao peso de <strong>um ${liftAnimal.name}</strong> (${liftAnimal.kg}kg)</div>
                ${nextAnimal?`<div class="animal-next">próximo nível: ${nextAnimal.emoji} ${nextAnimal.name} (${nextAnimal.kg}kg) — faltam apenas ${nextAnimal.kg-maxLift}kg</div>`:'<div class="animal-next">🏆 você levanta o peso de um hipopótamo!</div>'}
            </div>
        </div>
        <div class="animal-stat" style="margin-top:10px">
            <div style="font-size:2.5rem;line-height:1">⚖️</div>
            <div class="animal-info">
                <div class="animal-title">volume total acumulado</div>
                <div class="animal-desc"><strong>${volTons}t</strong> levantados no total — o suficiente para levantar <strong>${nAnimals} ${liftAnimal.name}${nAnimals>1?'s':''}</strong> (${liftAnimal.kg}kg cada)</div>
            </div>
        </div>`;
}

function renderStatsPRs() {
    const prMap={};
    Object.keys(workoutLog).sort().forEach(dateStr=>{
        (workoutLog[dateStr].exercises||[]).filter(e=>e.type!=='cardio').forEach(ex=>{
            (ex.sets||[]).forEach(s=>{
                if (s.weight>0 && (!prMap[ex.name]||s.weight>prMap[ex.name].weight))
                    prMap[ex.name]={weight:s.weight,date:dateStr,muscle:ex.muscle};
            });
        });
    });
    const entries=Object.entries(prMap).sort((a,b)=>b[1].weight-a[1].weight);
    const el=document.getElementById('statsPRList');
    if (!entries.length) { el.innerHTML='<div class="empty-exercises">nenhum PR registrado ainda</div>'; return; }
    el.innerHTML=entries.map(([name,pr])=>{
        const d=new Date(pr.date+'T00:00:00');
        const color=MUSCLE_COLORS[pr.muscle]||'#7f8c8d';
        return `<div class="stats-pr-item">
            <span class="stats-pr-name" style="border-left:2px solid ${color};padding-left:6px">${name}</span>
            <span class="stats-pr-val">${pr.weight}kg</span>
            <span class="stats-pr-date">${d.toLocaleDateString('pt-br',{day:'2-digit',month:'2-digit',year:'2-digit'})}</span>
        </div>`;
    }).join('');
}

// ─── MEDIDAS CORPORAIS ────────────────────────────────────────────────────────
function saveMedida() {
    const fields=['Peso','Altura','Peito','Cintura','Quadril','Biceps','Coxa','Gordura'];
    const date = document.getElementById('mDate').value || todayKey();
    const entry = { date };
    fields.forEach(f=>{
        const v=parseFloat(document.getElementById('m'+f).value);
        if (!isNaN(v) && v>0) entry[f.toLowerCase()]=v;
    });
    if (Object.keys(entry).length<=1) { alert('Preencha ao menos uma medida.'); return; }
    // Substitui se mesma data
    const idx = bodyMeasures.findIndex(m=>m.date===date);
    if (idx>=0) bodyMeasures[idx]=entry; else bodyMeasures.push(entry);
    bodyMeasures.sort((a,b)=>a.date.localeCompare(b.date));
    saveMeasures();
    fields.forEach(f=>document.getElementById('m'+f).value='');
    renderMedidas();
}

function renderMedidas() {
    // Define data inicial
    document.getElementById('mDate').value = todayKey();
    renderMedidasChart();
    renderMedidasDiff();
    renderMedidasTable();
}

function renderMedidasChart() {
    const points = bodyMeasures.filter(m=>m.peso>0).map(m=>({x:m.date,y:m.peso}));
    if (medidasPesoChart) { medidasPesoChart.destroy(); medidasPesoChart=null; }
    if (!points.length) return;
    const gc=isLight?'rgba(0,0,0,0.07)':'rgba(255,255,255,0.08)';
    const tc=isLight?'#555':'rgba(255,255,255,0.6)';
    medidasPesoChart=new Chart(document.getElementById('medidasPesoChart'),{
        type:'line',
        data:{labels:points.map(p=>{const d=new Date(p.x+'T00:00:00');return `${d.getDate()}/${d.getMonth()+1}`;}),
              datasets:[{data:points.map(p=>p.y),borderColor:'#2ecc71',borderWidth:2,pointRadius:4,pointBackgroundColor:'#2ecc71',backgroundColor:'#2ecc7122',fill:true,tension:0.4,label:'peso (kg)'}]},
        options:{responsive:true,maintainAspectRatio:false,
            plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>` ${ctx.parsed.y}kg`}}},
            scales:{y:{grid:{color:gc},ticks:{color:tc,callback:v=>v+'kg'}},x:{grid:{display:false},ticks:{color:tc}}}}
    });
}

function renderMedidasDiff() {
    const el=document.getElementById('medidasDiff');
    if (bodyMeasures.length<2) { el.innerHTML='<div class="empty-exercises">registre ao menos 2 medições para ver a evolução</div>'; return; }
    const first=bodyMeasures[0], last=bodyMeasures[bodyMeasures.length-1];
    const fields=[
        {key:'peso',label:'peso',unit:'kg'},
        {key:'peito',label:'peito',unit:'cm'},
        {key:'cintura',label:'cintura',unit:'cm'},
        {key:'quadril',label:'quadril',unit:'cm'},
        {key:'biceps',label:'bíceps',unit:'cm'},
        {key:'coxa',label:'coxa',unit:'cm'},
        {key:'gordura',label:'% gordura',unit:'%'},
    ];
    el.innerHTML=fields.filter(f=>first[f.key]&&last[f.key]).map(f=>{
        const diff=Math.round((last[f.key]-first[f.key])*10)/10;
        const sign=diff>0?'+':'';
        const color=f.key==='gordura'||f.key==='cintura' ? (diff<0?'#2ecc71':'#e74c3c') : (diff>0?'#2ecc71':'#e74c3c');
        return `<div class="stats-summary-row">
            <span class="stats-summary-lbl">${f.label}</span>
            <span class="stats-summary-val">${last[f.key]}${f.unit} <span style="font-size:0.75rem;color:${diff===0?'rgba(255,255,255,0.3)':color}">${sign}${diff}${f.unit}</span></span>
        </div>`;
    }).join('')||'<div class="empty-exercises">sem dados comparáveis ainda</div>';
}

function renderMedidasTable() {
    const el=document.getElementById('medidasTable');
    if (!bodyMeasures.length) { el.innerHTML='<div class="empty-exercises">nenhuma medida registrada</div>'; return; }
    const sorted=[...bodyMeasures].reverse();
    el.innerHTML=`<table class="medidas-tbl">
        <thead><tr><th>data</th><th>peso</th><th>peito</th><th>cintura</th><th>quadril</th><th>bíceps</th><th>coxa</th><th>gordura</th><th></th></tr></thead>
        <tbody>${sorted.map(m=>`<tr>
            <td>${new Date(m.date+'T00:00:00').toLocaleDateString('pt-br',{day:'2-digit',month:'2-digit',year:'2-digit'})}</td>
            <td>${m.peso||'—'}kg</td>
            <td>${m.peito||'—'}cm</td>
            <td>${m.cintura||'—'}cm</td>
            <td>${m.quadril||'—'}cm</td>
            <td>${m.biceps||'—'}cm</td>
            <td>${m.coxa||'—'}cm</td>
            <td>${m.gordura||'—'}%</td>
            <td><button class="plan-ex-del" onclick="deleteMedida('${m.date}')">✕</button></td>
        </tr>`).join('')}</tbody>
    </table>`;
}

function deleteMedida(date) {
    bodyMeasures=bodyMeasures.filter(m=>m.date!==date);
    saveMeasures(); renderMedidas();
}

// ─── TIMER DE DESCANSO ────────────────────────────────────────────────────────
let restTimerDuration = parseInt(localStorage.getItem('rest_timer_duration') || '60');
let restTimerRemaining = 0;
let restTimerInterval  = null;
let restTimerTotal     = 0;

function setRestDuration(secs) {
    restTimerDuration = secs;
    localStorage.setItem('rest_timer_duration', secs);
    document.querySelectorAll('.rest-preset').forEach(b => {
        b.classList.toggle('rest-preset--active', parseInt(b.textContent) === secs ||
            (b.textContent === '1 min' && secs === 60) ||
            (b.textContent === '1:30' && secs === 90) ||
            (b.textContent === '2 min' && secs === 120) ||
            (b.textContent === '3 min' && secs === 180));
    });
    if (restTimerInterval) {
        clearInterval(restTimerInterval);
        restTimerRemaining = secs;
        restTimerTotal     = secs;
        tickRestTimer();
        startRestTimerInterval();
    }
}

function openRestTimer(exerciseName) {
    restTimerRemaining = restTimerDuration;
    restTimerTotal     = restTimerDuration;
    const info = document.getElementById('restTimerInfo');
    if (info && exerciseName) info.textContent = `após: ${exerciseName}`;
    if (restTimerInterval) clearInterval(restTimerInterval);
    tickRestTimer();
    startRestTimerInterval();
    document.getElementById('restTimerOverlay').classList.add('open');
    // Play beep if available
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        osc.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
    } catch(e) {}
}

function skipRestTimer() {
    if (restTimerInterval) clearInterval(restTimerInterval);
    restTimerInterval = null;
    document.getElementById('restTimerOverlay').classList.remove('open');
}

function adjustRestTimer(delta) {
    restTimerRemaining = Math.max(5, restTimerRemaining + delta);
    if (restTimerRemaining > restTimerTotal) restTimerTotal = restTimerRemaining;
    tickRestTimer();
}

function startRestTimerInterval() {
    restTimerInterval = setInterval(() => {
        restTimerRemaining--;
        tickRestTimer();
        if (restTimerRemaining <= 0) {
            clearInterval(restTimerInterval);
            restTimerInterval = null;
            // End beep
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                [440, 550, 660].forEach((f, i) => {
                    const osc = ctx.createOscillator();
                    osc.connect(ctx.destination);
                    osc.frequency.value = f;
                    osc.start(ctx.currentTime + i * 0.15);
                    osc.stop(ctx.currentTime + i * 0.15 + 0.12);
                });
            } catch(e) {}
            setTimeout(skipRestTimer, 800);
        }
    }, 1000);
}

function tickRestTimer() {
    const countEl = document.getElementById('restTimerCount');
    const progEl  = document.getElementById('restTimerProgress');
    if (!countEl) return;
    const mins = Math.floor(restTimerRemaining / 60);
    const secs = restTimerRemaining % 60;
    countEl.textContent = mins > 0 ? `${mins}:${String(secs).padStart(2,'0')}` : String(restTimerRemaining);
    // Circle progress
    const circumference = 2 * Math.PI * 52; // r=52
    const pct = restTimerTotal > 0 ? restTimerRemaining / restTimerTotal : 1;
    if (progEl) {
        progEl.style.strokeDasharray  = circumference;
        progEl.style.strokeDashoffset = circumference * (1 - pct);
    }
}

// Override addSetToAccordion para disparar o timer
const _origAddSet = addSetToAccordion;
function addSetToAccordion(id, muscle, name, equip) {
    _origAddSet(id, muscle, name, equip);
    openRestTimer(name);
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
renderPlansList();
renderRegistro();
initMuscleAvatar();

// ─── Preview de imagem do exercício ──────────────────────────────────────────
function updatePaePreview() {
    const exName = document.getElementById('paeEx').value;
    const preview = document.getElementById('paeExPreview');
    const img = EXERCISE_IMAGES[exName];
    if (img && exName) {
        preview.src = img;
        preview.classList.remove('hidden');
        preview.onerror = () => preview.classList.add('hidden');
    } else {
        preview.classList.add('hidden');
    }
}
