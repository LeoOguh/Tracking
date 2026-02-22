/* ═══════════════════════════════════════════════════════════
   FINANÇAS — Clarity  (financas.js)
   ═══════════════════════════════════════════════════════════ */

// ─── THEME ───────────────────────────────────────────────────────────────────
let isLight = localStorage.getItem('clarity_theme') === 'light';
function applyTheme() {
    document.body.classList.toggle('light', isLight);
    const btn = document.getElementById('themeToggleBtn');
    if (btn) btn.textContent = isLight ? '🌙 escuro' : '☀ claro';
}
function toggleTheme() { isLight = !isLight; localStorage.setItem('clarity_theme', isLight ? 'light' : 'dark'); applyTheme(); renderAll(); }
applyTheme();

// ─── DATA STORES ─────────────────────────────────────────────────────────────
const LS = k => JSON.parse(localStorage.getItem(k) || 'null');
const SS = (k, v) => localStorage.setItem(k, JSON.stringify(v));

let cartoes      = LS('fin_cartoes')      || [];
let lancCartao   = LS('fin_lanc_cartao')  || [];
let contas       = LS('fin_contas')       || [{ id: 1, name: 'Conta principal', saldo: 0 }];
let fluxoEntries = LS('fin_fluxo')        || [];
let categorias   = LS('fin_categorias')   || [
    'Alimentação','Moradia','Transporte','Saúde','Educação','Lazer',
    'Roupas','Assinaturas','Investimento','Salário','Freelance','Outros'
];
let metasGasto    = LS('fin_metas_gasto')   || [];
let ativos        = LS('fin_ativos')        || [];
let dividendos    = LS('fin_dividendos')    || [];
let metaAlloc     = LS('fin_meta_alloc')    || { 'Renda Fixa': 60, 'Ações': 25, 'FIIs': 10, 'Cripto': 5 };
let metasFin      = LS('fin_metas_fin')     || [];

function save(k, v) { SS(k, v); }
function saveAll() {
    save('fin_cartoes', cartoes);       save('fin_lanc_cartao', lancCartao);
    save('fin_contas', contas);         save('fin_fluxo', fluxoEntries);
    save('fin_categorias', categorias); save('fin_metas_gasto', metasGasto);
    save('fin_ativos', ativos);         save('fin_dividendos', dividendos);
    save('fin_meta_alloc', metaAlloc);  save('fin_metas_fin', metasFin);
}

// ─── DATE NAV ────────────────────────────────────────────────────────────────
let finMonth = new Date().getMonth();
let finYear  = new Date().getFullYear();
function finMonthKey() { return `${finYear}-${String(finMonth+1).padStart(2,'0')}`; }
function updateFinDate() {
    const m = new Date(finYear, finMonth).toLocaleDateString('pt-br', { month: 'long', year: 'numeric' });
    document.getElementById('finDateTitle').textContent = m;
}
function finPrevMonth() { finMonth--; if (finMonth < 0) { finMonth = 11; finYear--; } updateFinDate(); renderCurrentView(); }
function finNextMonth() { finMonth++; if (finMonth > 11) { finMonth = 0; finYear++; } updateFinDate(); renderCurrentView(); }
updateFinDate();

// ─── DATE PICKER (reuse pattern) ─────────────────────────────────────────────
let dpOpen = false, dpYear, dpMonth;
function toggleDatePicker() {
    const el = document.getElementById('datePicker');
    dpOpen = !dpOpen;
    el.classList.toggle('hidden', !dpOpen);
    if (dpOpen) { dpYear = finYear; dpMonth = finMonth; renderDP(); }
}
function dpPrevMonth() { dpMonth--; if (dpMonth < 0) { dpMonth = 11; dpYear--; } renderDP(); }
function dpNextMonth() { dpMonth++; if (dpMonth > 11) { dpMonth = 0; dpYear++; } renderDP(); }
function renderDP() {
    document.getElementById('dpMonthLabel').textContent = new Date(dpYear, dpMonth).toLocaleDateString('pt-br', { month: 'long', year: 'numeric' });
    const grid = document.getElementById('dpGrid');
    grid.innerHTML = '';
    // Just show months for finance
    const months = [];
    for (let m = 0; m < 12; m++) {
        const active = m === finMonth && dpYear === finYear;
        months.push(`<button class="dp-day${active ? ' dp-day--today' : ''}" onclick="selectDPMonth(${dpYear},${m})">${new Date(dpYear, m).toLocaleDateString('pt-br', { month: 'short' })}</button>`);
    }
    grid.innerHTML = months.join('');
}
function selectDPMonth(y, m) {
    finYear = y; finMonth = m;
    updateFinDate(); renderCurrentView();
    document.getElementById('datePicker').classList.add('hidden'); dpOpen = false;
}
document.addEventListener('click', e => {
    if (dpOpen && !e.target.closest('.date-picker-popup') && !e.target.closest('#finDateTitle')) {
        document.getElementById('datePicker').classList.add('hidden'); dpOpen = false;
    }
});

// ─── VIEW SWITCHING ──────────────────────────────────────────────────────────
const VIEW_LABELS = { dash: 'dashboard', cartoes: 'cartões de crédito', fluxo: 'entradas & saídas', invest: 'investimentos', metas: 'metas financeiras' };
let currentFinView = 'dash';

function setFinView(view) {
    currentFinView = view;
    ['dash','cartoes','fluxo','invest','metas'].forEach(v => {
        const el = document.getElementById('view' + v.charAt(0).toUpperCase() + v.slice(1));
        if (el) el.classList.toggle('hidden', v !== view);
        const tab = document.getElementById('tab' + v.charAt(0).toUpperCase() + v.slice(1));
        if (tab) tab.classList.toggle('fin-tab--active', v === view);
    });
    document.getElementById('finViewLabel').textContent = VIEW_LABELS[view] || view;
    renderCurrentView();
}

function renderCurrentView() {
    switch (currentFinView) {
        case 'dash':    renderDashboard(); break;
        case 'cartoes': renderCartoes(); break;
        case 'fluxo':   renderFluxo(); break;
        case 'invest':  renderInvest(); break;
        case 'metas':   renderMetas(); break;
    }
}

function renderAll() { renderCurrentView(); }

// ─── UTILS ───────────────────────────────────────────────────────────────────
function fmt(v) { return 'R$ ' + Number(v||0).toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtShort(v) { return Number(v||0).toLocaleString('pt-br', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function nextId(arr) { return arr.length ? Math.max(...arr.map(x => x.id || 0)) + 1 : 1; }
function monthOf(dateStr) { return dateStr?.substring(0, 7) || ''; }
function dayOf(dateStr) { return dateStr?.substring(8, 10) || ''; }

const CAT_COLORS = {
    'Alimentação': '#f59e0b', 'Moradia': '#6366f1', 'Transporte': '#3b82f6',
    'Saúde': '#ef4444', 'Educação': '#8b5cf6', 'Lazer': '#ec4899',
    'Roupas': '#f97316', 'Assinaturas': '#06b6d4', 'Investimento': '#22c55e',
    'Salário': '#10b981', 'Freelance': '#14b8a6', 'Outros': '#64748b'
};
const CLASSE_COLORS = { 'Renda Fixa': '#3b82f6', 'Ações': '#22c55e', 'FIIs': '#f59e0b', 'Cripto': '#8b5cf6', 'Outro': '#64748b' };

// ═══════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════
let dashPatChart = null, dashCatChart = null;

function renderDashboard() {
    const mk = finMonthKey();
    // Contas total
    const saldoTotal = contas.reduce((s, c) => s + (c.saldo || 0), 0) + ativos.reduce((s, a) => s + (a.qty * a.price), 0);
    document.getElementById('dashSaldoTotal').textContent = fmt(saldoTotal);
    document.getElementById('dashSaldoSub').textContent = `${contas.length} conta${contas.length !== 1 ? 's' : ''} + investimentos`;

    // Month receitas/despesas
    const monthFluxo = fluxoEntries.filter(e => monthOf(e.date) === mk);
    const receitas = monthFluxo.filter(e => e.type === 'receita').reduce((s, e) => s + e.valor, 0);
    const despesas = monthFluxo.filter(e => e.type === 'despesa').reduce((s, e) => s + e.valor, 0);
    const balanco = receitas - despesas;
    document.getElementById('dashReceitas').textContent = fmt(receitas);
    document.getElementById('dashDespesas').textContent = fmt(despesas);
    const balEl = document.getElementById('dashBalanco');
    balEl.textContent = fmt(balanco);
    balEl.style.color = balanco >= 0 ? '#22c55e' : '#ef4444';

    // Next fatura
    renderDashFatura();
    // Charts
    renderDashPatrimonioChart();
    renderDashCatChart();
    // Alertas
    renderDashAlertas();
}

function renderDashFatura() {
    const el = document.getElementById('dashFatura');
    const sub = document.getElementById('dashFaturaSub');
    if (!cartoes.length) { el.textContent = '—'; sub.textContent = 'sem cartões cadastrados'; return; }
    // Find next fatura
    const today = new Date();
    let nearest = null, nearVal = 0;
    cartoes.forEach(c => {
        const venc = new Date(today.getFullYear(), today.getMonth(), c.vencimento || 10);
        if (venc < today) venc.setMonth(venc.getMonth() + 1);
        const fTotal = calcFaturaTotal(c.id, venc.getFullYear(), venc.getMonth());
        if (!nearest || venc < nearest.date) { nearest = { card: c, date: venc }; nearVal = fTotal; }
    });
    if (nearest) {
        el.textContent = fmt(nearVal);
        sub.textContent = `${nearest.card.name} · venc. ${nearest.date.toLocaleDateString('pt-br', { day: '2-digit', month: '2-digit' })}`;
    }
}

function renderDashPatrimonioChart() {
    if (dashPatChart) dashPatChart.destroy();
    const labels = [], data = [];
    for (let i = 5; i >= 0; i--) {
        let m = finMonth - i, y = finYear;
        while (m < 0) { m += 12; y--; }
        const mk = `${y}-${String(m + 1).padStart(2, '0')}`;
        labels.push(new Date(y, m).toLocaleDateString('pt-br', { month: 'short' }));
        const fluxo = fluxoEntries.filter(e => monthOf(e.date) <= mk);
        const bal = fluxo.reduce((s, e) => s + (e.type === 'receita' ? e.valor : -e.valor), 0);
        const inv = ativos.reduce((s, a) => s + a.qty * a.price, 0);
        data.push(bal + inv);
    }
    const gc = isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.08)';
    const tc = isLight ? '#555' : 'rgba(255,255,255,0.6)';
    dashPatChart = new Chart(document.getElementById('dashPatrimonioChart'), {
        type: 'line',
        data: { labels, datasets: [{ data, borderColor: '#3b82f6', borderWidth: 2, pointRadius: 4, pointBackgroundColor: '#3b82f6', backgroundColor: '#3b82f622', fill: true, tension: 0.4 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: tc }, grid: { color: gc } }, y: { ticks: { color: tc, callback: v => fmt(v) }, grid: { color: gc } } } }
    });
}

function renderDashCatChart() {
    if (dashCatChart) dashCatChart.destroy();
    const mk = finMonthKey();
    const bycat = {};
    fluxoEntries.filter(e => monthOf(e.date) === mk && e.type === 'despesa').forEach(e => {
        bycat[e.cat || 'Outros'] = (bycat[e.cat || 'Outros'] || 0) + e.valor;
    });
    const entries = Object.entries(bycat).sort((a, b) => b[1] - a[1]);
    if (!entries.length) { return; }
    dashCatChart = new Chart(document.getElementById('dashCatChart'), {
        type: 'doughnut',
        data: {
            labels: entries.map(e => e[0]),
            datasets: [{ data: entries.map(e => e[1]), backgroundColor: entries.map(e => CAT_COLORS[e[0]] || '#64748b'), borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: isLight ? '#555' : 'rgba(255,255,255,0.6)', font: { size: 11 } } } } }
    });
}

function renderDashAlertas() {
    const el = document.getElementById('dashAlertas');
    const alerts = [];
    const today = new Date();
    // Faturas próximas (7 dias)
    cartoes.forEach(c => {
        const venc = new Date(today.getFullYear(), today.getMonth(), c.vencimento || 10);
        if (venc < today) venc.setMonth(venc.getMonth() + 1);
        const diff = Math.ceil((venc - today) / 86400000);
        if (diff <= 7 && diff >= 0) {
            const total = calcFaturaTotal(c.id, venc.getFullYear(), venc.getMonth());
            alerts.push({ color: '#f59e0b', text: `Fatura ${c.name} vence em ${diff} dia${diff !== 1 ? 's' : ''} (${fmt(total)})` });
        }
    });
    // Metas estouradas
    const mk = finMonthKey();
    metasGasto.forEach(mg => {
        const gasto = fluxoEntries.filter(e => monthOf(e.date) === mk && e.type === 'despesa' && e.cat === mg.cat).reduce((s, e) => s + e.valor, 0);
        if (gasto > mg.limite) alerts.push({ color: '#ef4444', text: `Meta de ${mg.cat} estourada: ${fmt(gasto)} / ${fmt(mg.limite)}` });
        else if (gasto > mg.limite * 0.8) alerts.push({ color: '#f59e0b', text: `${mg.cat}: ${Math.round(gasto / mg.limite * 100)}% da meta (${fmt(gasto)} / ${fmt(mg.limite)})` });
    });
    if (!alerts.length) alerts.push({ color: '#22c55e', text: 'Tudo em dia! Nenhum alerta no momento.' });
    el.innerHTML = alerts.map(a => `<div class="dash-alerta" style="border-left-color:${a.color}">${a.text}</div>`).join('');
}

// ═══════════════════════════════════════════════════════════
// CARTÕES DE CRÉDITO
// ═══════════════════════════════════════════════════════════
let selectedCardId = null;
let faturaOffset = 0; // 0 = current, +1 = next, etc

function renderCartoes() {
    renderCartoesList();
    if (selectedCardId) renderCardDetail();
}

function renderCartoesList() {
    const el = document.getElementById('cartoesList');
    if (!cartoes.length) { el.innerHTML = '<div class="empty-state">nenhum cartão cadastrado</div>'; return; }
    el.innerHTML = cartoes.map(c => {
        const usado = calcFaturaTotal(c.id, finYear, finMonth);
        const pct = c.limite ? Math.min(100, Math.round(usado / c.limite * 100)) : 0;
        const barColor = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#22c55e';
        return `<div class="card-item ${selectedCardId === c.id ? 'card-item--active' : ''}" onclick="selectCard(${c.id})">
            <div class="card-item-top">
                <div class="card-color-dot" style="background:${c.cor || '#3b82f6'}"></div>
                <span class="card-item-name">${c.name}</span>
                <span class="card-item-bandeira">${c.bandeira || ''}</span>
            </div>
            <div class="card-limit-bar"><div class="card-limit-fill" style="width:${pct}%;background:${barColor}"></div></div>
            <div class="card-limit-info"><span>${fmt(usado)} usado</span><span>limite ${fmt(c.limite)}</span></div>
        </div>`;
    }).join('');
}

function selectCard(id) {
    selectedCardId = id; faturaOffset = 0;
    renderCartoesList(); renderCardDetail();
}

function calcFaturaMonth(cardId, year, month) {
    const c = cartoes.find(x => x.id === cardId);
    if (!c) return [];
    const fech = c.fechamento || 5;
    // Fatura de mês M: compras de dia (fech+1 do mês M-1) até dia (fech do mês M)
    const start = new Date(year, month - 1, fech + 1);
    const end = new Date(year, month, fech);
    return lancCartao.filter(l => {
        if (l.cardId !== cardId) return false;
        const d = new Date(l.date + 'T00:00:00');
        // For parceled: check if this installment falls in this fatura
        if (l.parcelas > 1) {
            const compraDate = new Date(l.date + 'T00:00:00');
            for (let p = 0; p < l.parcelas; p++) {
                const pDate = new Date(compraDate.getFullYear(), compraDate.getMonth() + p, compraDate.getDate());
                if (pDate >= start && pDate <= end) return true;
            }
            return false;
        }
        return d >= start && d <= end;
    }).map(l => {
        if (l.parcelas > 1) {
            const compraDate = new Date(l.date + 'T00:00:00');
            for (let p = 0; p < l.parcelas; p++) {
                const pDate = new Date(compraDate.getFullYear(), compraDate.getMonth() + p, compraDate.getDate());
                const start2 = new Date(year, month - 1, (c.fechamento || 5) + 1);
                const end2 = new Date(year, month, c.fechamento || 5);
                if (pDate >= start2 && pDate <= end2) {
                    return { ...l, parcelaAtual: p + 1, valorParcela: l.valor / l.parcelas };
                }
            }
        }
        return { ...l, parcelaAtual: 1, valorParcela: l.valor };
    });
}

function calcFaturaTotal(cardId, year, month) {
    return calcFaturaMonth(cardId, year, month).reduce((s, l) => s + (l.valorParcela || l.valor), 0);
}

function renderCardDetail() {
    const c = cartoes.find(x => x.id === selectedCardId);
    if (!c) { document.getElementById('cartoesDetail').innerHTML = '<div class="empty-state">selecione um cartão</div>'; return; }
    const fYear = finYear + Math.floor((finMonth + faturaOffset) / 12);
    const fMonth = (finMonth + faturaOffset) % 12;
    const lancs = calcFaturaMonth(c.id, fYear, fMonth < 0 ? fMonth + 12 : fMonth);
    const total = lancs.reduce((s, l) => s + (l.valorParcela || l.valor), 0);
    const fLabel = new Date(fYear, fMonth < 0 ? fMonth + 12 : fMonth).toLocaleDateString('pt-br', { month: 'long', year: 'numeric' });

    // Devedores
    const byPessoa = {};
    lancs.filter(l => l.pessoa).forEach(l => { byPessoa[l.pessoa] = (byPessoa[l.pessoa] || 0) + (l.valorParcela || l.valor); });

    const el = document.getElementById('cartoesDetail');
    el.innerHTML = `
        <div class="glass-panel" style="padding:16px 20px;display:flex;flex-direction:column;gap:10px">
            <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="font-size:0.92rem;font-weight:700;color:rgba(255,255,255,0.9)">${c.name}</span>
                <div style="display:flex;gap:6px">
                    <button class="btn-sm" onclick="openCardLancModal()">+ lançamento</button>
                    <button class="btn-sm" onclick="openCardRecModal()">+ recorrente</button>
                    <button class="btn-sm" onclick="editCard(${c.id})" style="background:rgba(255,255,255,0.04);border-color:rgba(255,255,255,0.1);color:rgba(255,255,255,0.5)">✏️ editar</button>
                    <button class="btn-sm" onclick="deleteCard(${c.id})" style="background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.15);color:#ef4444">🗑</button>
                </div>
            </div>
            <div class="fatura-nav">
                <button class="fatura-nav-btn" onclick="faturaOffset--;renderCardDetail()">‹</button>
                <span class="fatura-label">fatura de ${fLabel}</span>
                <button class="fatura-nav-btn" onclick="faturaOffset++;renderCardDetail()">›</button>
            </div>
            <div class="fatura-total">${fmt(total)}</div>
            ${Object.keys(byPessoa).length ? `<div class="fatura-devedor-bar">${Object.entries(byPessoa).map(([p, v]) => `<span class="devedor-chip">👤 ${p}: ${fmt(v)}</span>`).join('')}</div>` : ''}
            <div style="display:flex;flex-direction:column;gap:0">
                ${lancs.length ? lancs.map(l => `<div class="card-lancamento">
                    <span class="cl-date">${dayOf(l.date)}/${String((new Date(l.date+'T00:00:00')).getMonth()+1).padStart(2,'0')}</span>
                    <span class="cl-desc">${l.desc}</span>
                    ${l.tags?.length ? `<div class="cl-tags">${l.tags.map(t => `<span class="cl-tag">${t}</span>`).join('')}</div>` : ''}
                    ${l.pessoa ? `<span class="cl-pessoa">👤 ${l.pessoa}</span>` : ''}
                    ${l.parcelas > 1 ? `<span class="cl-parcela">${l.parcelaAtual}/${l.parcelas}</span>` : ''}
                    <span class="cl-valor">${fmt(l.valorParcela || l.valor)}</span>
                    <button class="cl-del" onclick="deleteCardLanc(${l.id})">✕</button>
                </div>`).join('') : '<div class="empty-state">sem lançamentos nesta fatura</div>'}
            </div>
        </div>`;
}

// ═══════════════════════════════════════════════════════════
// ENTRADAS & SAÍDAS
// ═══════════════════════════════════════════════════════════
let fluxoType = 'despesa';

function renderFluxo() {
    populateCatSelects();
    renderContasList();
    renderFluxoList();
    renderMetasGasto();
    document.getElementById('fluxoData').value = `${finYear}-${String(finMonth + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
}

function setFluxoType(type) {
    fluxoType = type;
    document.getElementById('fttDespesa').classList.toggle('ftt-btn--active', type === 'despesa');
    document.getElementById('fttReceita').classList.toggle('ftt-btn--active', type === 'receita');
}

function populateCatSelects() {
    const opts = '<option value="">— categoria —</option>' + categorias.map(c => `<option value="${c}">${c}</option>`).join('');
    document.getElementById('fluxoCat').innerHTML = opts;
    const contaOpts = '<option value="">— conta —</option>' + contas.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    document.getElementById('fluxoConta').innerHTML = contaOpts;
    // Filter selects
    document.getElementById('fluxoFilterCat').innerHTML = '<option value="">todas categorias</option>' + categorias.map(c => `<option value="${c}">${c}</option>`).join('');
}

function renderContasList() {
    const el = document.getElementById('contasList');
    el.innerHTML = contas.map(c => `
        <div class="conta-chip" onclick="editConta(${c.id})">
            <span class="conta-chip-name">${c.name}</span>
            <span class="conta-chip-saldo">${fmt(c.saldo)}</span>
        </div>`).join('');
}

function saveFluxo() {
    const desc = document.getElementById('fluxoDesc').value.trim();
    const valor = parseFloat(document.getElementById('fluxoValor').value);
    const date = document.getElementById('fluxoData').value;
    const cat = document.getElementById('fluxoCat').value;
    const contaId = parseInt(document.getElementById('fluxoConta').value) || null;
    const tagsStr = document.getElementById('fluxoTags').value.trim();
    const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];
    const recorrencia = document.getElementById('fluxoRecorrencia').value;

    if (!desc || !valor || !date) { alert('Preencha descrição, valor e data.'); return; }

    const entry = { id: nextId(fluxoEntries), type: fluxoType, desc, valor, date, cat, contaId, tags, recorrencia };
    fluxoEntries.push(entry);

    // Update conta saldo
    if (contaId) {
        const conta = contas.find(c => c.id === contaId);
        if (conta) conta.saldo += fluxoType === 'receita' ? valor : -valor;
    }

    // Generate recurrence entries for 12 months
    if (recorrencia === 'mensal') {
        for (let i = 1; i <= 11; i++) {
            const d = new Date(date + 'T00:00:00');
            d.setMonth(d.getMonth() + i);
            const rDate = d.toISOString().split('T')[0];
            fluxoEntries.push({ id: nextId(fluxoEntries), type: fluxoType, desc: desc + ' (rec.)', valor, date: rDate, cat, contaId, tags: [...tags, 'recorrente'], recorrencia: '' });
        }
    } else if (recorrencia === 'semanal') {
        for (let i = 1; i <= 51; i++) {
            const d = new Date(date + 'T00:00:00');
            d.setDate(d.getDate() + i * 7);
            const rDate = d.toISOString().split('T')[0];
            fluxoEntries.push({ id: nextId(fluxoEntries), type: fluxoType, desc: desc + ' (rec.)', valor, date: rDate, cat, contaId, tags: [...tags, 'recorrente'], recorrencia: '' });
        }
    }

    saveAll();
    // Clear form
    document.getElementById('fluxoDesc').value = '';
    document.getElementById('fluxoValor').value = '';
    document.getElementById('fluxoTags').value = '';
    document.getElementById('fluxoRecorrencia').value = '';
    renderFluxo();
}

function renderFluxoList() {
    const mk = finMonthKey();
    const filterCat = document.getElementById('fluxoFilterCat')?.value || '';
    const filterType = document.getElementById('fluxoFilterType')?.value || '';
    let entries = fluxoEntries.filter(e => monthOf(e.date) === mk);
    if (filterCat) entries = entries.filter(e => e.cat === filterCat);
    if (filterType) entries = entries.filter(e => e.type === filterType);
    entries.sort((a, b) => b.date.localeCompare(a.date));

    document.getElementById('fluxoListTitle').textContent = `lançamentos — ${new Date(finYear, finMonth).toLocaleDateString('pt-br', { month: 'long' })}`;

    const el = document.getElementById('fluxoList');
    if (!entries.length) { el.innerHTML = '<div class="empty-state">sem lançamentos neste mês</div>'; }
    else {
        el.innerHTML = entries.map(e => {
            const catColor = CAT_COLORS[e.cat] || '#64748b';
            const conta = contas.find(c => c.id === e.contaId);
            return `<div class="fluxo-entry">
                <span class="fe-date">${dayOf(e.date)}/${String(finMonth + 1).padStart(2, '0')}</span>
                <span class="fe-cat-dot" style="background:${catColor}"></span>
                <span class="fe-desc">${e.desc}</span>
                ${e.tags?.length ? `<div class="fe-tags">${e.tags.map(t => `<span class="fe-tag">${t}</span>`).join('')}</div>` : ''}
                ${conta ? `<span class="fe-conta">${conta.name}</span>` : ''}
                <span class="fe-valor fe-valor--${e.type}">${e.type === 'receita' ? '+' : '-'} ${fmtShort(e.valor)}</span>
                <button class="fe-del" onclick="deleteFluxo(${e.id})">✕</button>
            </div>`;
        }).join('');
    }

    // Totals
    const allMonth = fluxoEntries.filter(e => monthOf(e.date) === mk);
    const rec = allMonth.filter(e => e.type === 'receita').reduce((s, e) => s + e.valor, 0);
    const desp = allMonth.filter(e => e.type === 'despesa').reduce((s, e) => s + e.valor, 0);
    document.getElementById('fluxoTotals').innerHTML = `
        <span>receitas: <strong style="color:#22c55e">${fmt(rec)}</strong></span>
        <span>despesas: <strong style="color:#ef4444">${fmt(desp)}</strong></span>
        <span>balanço: <strong style="color:${rec - desp >= 0 ? '#22c55e' : '#ef4444'}">${fmt(rec - desp)}</strong></span>`;
}

function deleteFluxo(id) {
    const e = fluxoEntries.find(x => x.id === id);
    if (!e) return;
    if (e.contaId) {
        const conta = contas.find(c => c.id === e.contaId);
        if (conta) conta.saldo -= e.type === 'receita' ? e.valor : -e.valor;
    }
    fluxoEntries = fluxoEntries.filter(x => x.id !== id);
    saveAll(); renderFluxo();
}

function renderMetasGasto() {
    const mk = finMonthKey();
    const el = document.getElementById('fluxoMetasGasto');
    if (!metasGasto.length) { el.innerHTML = '<div class="empty-state" style="padding:10px">nenhuma meta definida</div>'; return; }
    el.innerHTML = metasGasto.map(mg => {
        const gasto = fluxoEntries.filter(e => monthOf(e.date) === mk && e.type === 'despesa' && e.cat === mg.cat).reduce((s, e) => s + e.valor, 0);
        const pct = mg.limite ? Math.min(100, Math.round(gasto / mg.limite * 100)) : 0;
        const color = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#22c55e';
        return `<div class="meta-gasto-card">
            <div style="display:flex;justify-content:space-between;align-items:center">
                <span class="mg-cat">${mg.cat}</span>
                <button class="fe-del" onclick="deleteMetaGasto(${mg.id})">✕</button>
            </div>
            <div class="mg-bar"><div class="mg-bar-fill" style="width:${pct}%;background:${color}"></div></div>
            <div class="mg-info"><span>${fmt(gasto)}</span><span>${fmt(mg.limite)}</span></div>
        </div>`;
    }).join('');
}

function deleteMetaGasto(id) { metasGasto = metasGasto.filter(x => x.id !== id); saveAll(); renderMetasGasto(); }

// ═══════════════════════════════════════════════════════════
// INVESTIMENTOS
// ═══════════════════════════════════════════════════════════
let investAllocChart = null;

function renderInvest() {
    // Summary
    const totalInv = ativos.reduce((s, a) => s + a.qty * a.price, 0);
    const totalCost = ativos.reduce((s, a) => s + a.qty * a.avgCost, 0);
    const rent = totalCost > 0 ? ((totalInv - totalCost) / totalCost * 100).toFixed(1) : 0;
    const totalDiv = dividendos.reduce((s, d) => s + d.valor, 0);

    document.getElementById('investTotal').textContent = fmt(totalInv);
    const rentEl = document.getElementById('investRent');
    rentEl.textContent = totalCost > 0 ? `${rent > 0 ? '+' : ''}${rent}%` : '—';
    rentEl.style.color = rent >= 0 ? '#22c55e' : '#ef4444';
    document.getElementById('investDiv').textContent = fmt(totalDiv);

    renderInvestAllocChart(totalInv);
    renderInvestMetaAlloc(totalInv);
    renderInvestAtivos();
    renderInvestDiv();
}

function renderInvestAllocChart(totalInv) {
    if (investAllocChart) investAllocChart.destroy();
    const byClasse = {};
    ativos.forEach(a => { byClasse[a.classe || 'Outro'] = (byClasse[a.classe || 'Outro'] || 0) + a.qty * a.price; });
    const entries = Object.entries(byClasse);
    if (!entries.length) {
        document.getElementById('investAllocLegend').innerHTML = '<div class="empty-state" style="padding:10px">nenhum ativo cadastrado</div>';
        return;
    }
    investAllocChart = new Chart(document.getElementById('investAllocChart'), {
        type: 'doughnut',
        data: {
            labels: entries.map(e => e[0]),
            datasets: [{ data: entries.map(e => e[1]), backgroundColor: entries.map(e => CLASSE_COLORS[e[0]] || '#64748b'), borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
    document.getElementById('investAllocLegend').innerHTML = entries.map(([classe, val]) =>
        `<div class="alloc-legend-item"><div class="alloc-legend-dot" style="background:${CLASSE_COLORS[classe] || '#64748b'}"></div>${classe}: ${fmt(val)} (${totalInv > 0 ? Math.round(val / totalInv * 100) : 0}%)</div>`
    ).join('');
}

function renderInvestMetaAlloc(totalInv) {
    const el = document.getElementById('investMetaAlloc');
    const byClasse = {};
    ativos.forEach(a => { byClasse[a.classe || 'Outro'] = (byClasse[a.classe || 'Outro'] || 0) + a.qty * a.price; });
    el.innerHTML = Object.entries(metaAlloc).map(([classe, meta]) => {
        const atual = totalInv > 0 ? Math.round((byClasse[classe] || 0) / totalInv * 100) : 0;
        const color = CLASSE_COLORS[classe] || '#64748b';
        return `<div class="invest-meta-row">
            <div class="alloc-legend-dot" style="background:${color}"></div>
            <span style="width:80px">${classe}</span>
            <div class="invest-meta-bar"><div class="invest-meta-fill" style="width:${atual}%;background:${color}"></div></div>
            <span class="invest-meta-pct">${atual}% / ${meta}%</span>
        </div>`;
    }).join('');
}

function renderInvestAtivos() {
    const el = document.getElementById('investAtivosList');
    if (!ativos.length) { el.innerHTML = '<div class="empty-state">nenhum ativo cadastrado</div>'; return; }
    el.innerHTML = `
        <div class="invest-ativo-row invest-ativo-row--header">
            <span>ativo</span><span>classe</span><span>qtd</span><span>preço</span><span>total</span><span></span>
        </div>
        ${ativos.map(a => `<div class="invest-ativo-row">
            <span class="invest-ativo-name">${a.name}</span>
            <span><span class="invest-ativo-classe" style="background:${CLASSE_COLORS[a.classe] || '#64748b'}22;color:${CLASSE_COLORS[a.classe] || '#64748b'}">${a.classe}</span></span>
            <span>${a.qty}</span>
            <span>${fmt(a.price)}</span>
            <span>${fmt(a.qty * a.price)}</span>
            <button class="fe-del" onclick="deleteAtivo(${a.id})">✕</button>
        </div>`).join('')}`;
}

function deleteAtivo(id) { ativos = ativos.filter(a => a.id !== id); saveAll(); renderInvest(); }

function renderInvestDiv() {
    const el = document.getElementById('investDivList');
    const sorted = [...dividendos].sort((a, b) => b.date.localeCompare(a.date));
    if (!sorted.length) { el.innerHTML = '<div class="empty-state">sem dividendos registrados</div>'; return; }
    el.innerHTML = sorted.slice(0, 20).map(d => `<div class="invest-div-row">
        <span class="idv-date">${new Date(d.date + 'T00:00:00').toLocaleDateString('pt-br', { day: '2-digit', month: '2-digit' })}</span>
        <span class="idv-ativo">${d.ativo}</span>
        <span class="idv-valor">+ ${fmtShort(d.valor)}</span>
        <button class="fe-del" onclick="deleteDividendo(${d.id})">✕</button>
    </div>`).join('');
}

function deleteDividendo(id) { dividendos = dividendos.filter(d => d.id !== id); saveAll(); renderInvest(); }

// ═══════════════════════════════════════════════════════════
// METAS FINANCEIRAS
// ═══════════════════════════════════════════════════════════
function renderMetas() {
    const el = document.getElementById('metasFinList');
    if (!metasFin.length) { el.innerHTML = '<div class="empty-state">nenhuma meta criada</div>'; return; }
    el.innerHTML = metasFin.map(m => {
        const pct = m.alvo > 0 ? Math.min(100, Math.round(m.atual / m.alvo * 100)) : 0;
        const color = pct >= 100 ? '#22c55e' : pct > 60 ? '#3b82f6' : '#f59e0b';
        return `<div class="meta-fin-card">
            <div class="mf-header">
                <span class="mf-name">${m.name}</span>
                <span class="mf-emoji">${m.emoji || '🎯'}</span>
            </div>
            <div class="mf-progress-bar"><div class="mf-progress-fill" style="width:${pct}%;background:${color}"></div></div>
            <div class="mf-info">
                <span><strong>${fmt(m.atual)}</strong> de ${fmt(m.alvo)}</span>
                <span><strong>${pct}%</strong></span>
            </div>
            ${m.prazo ? `<div style="font-size:0.7rem;color:rgba(255,255,255,0.3)">prazo: ${new Date(m.prazo + 'T00:00:00').toLocaleDateString('pt-br')}</div>` : ''}
            <div class="mf-footer">
                <button class="mf-btn" onclick="aportarMeta(${m.id})">+ aporte</button>
                <button class="mf-btn" onclick="editMetaFin(${m.id})">✏️ editar</button>
                <button class="mf-btn" onclick="deleteMetaFin(${m.id})" style="color:#ef4444">🗑</button>
            </div>
        </div>`;
    }).join('');
}

function deleteMetaFin(id) { metasFin = metasFin.filter(m => m.id !== id); saveAll(); renderMetas(); }

function aportarMeta(id) {
    const m = metasFin.find(x => x.id === id);
    if (!m) return;
    const val = parseFloat(prompt(`Quanto deseja aportar em "${m.name}"?`));
    if (!val || val <= 0) return;
    m.atual = (m.atual || 0) + val;
    saveAll(); renderMetas();
}

// ═══════════════════════════════════════════════════════════
// MODAIS
// ═══════════════════════════════════════════════════════════
function openModal(title, bodyHTML, actionsHTML) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHTML;
    document.getElementById('modalActions').innerHTML = actionsHTML;
    document.getElementById('modalOverlay').classList.remove('hidden');
}
function closeModal() { document.getElementById('modalOverlay').classList.add('hidden'); }

// --- Novo Cartão ---
function openCardModal(editId) {
    const c = editId ? cartoes.find(x => x.id === editId) : null;
    openModal(c ? 'Editar Cartão' : 'Novo Cartão', `
        <input type="text" id="mCardName" class="f-input" placeholder="nome do cartão" value="${c?.name || ''}">
        <input type="text" id="mCardBandeira" class="f-input" placeholder="bandeira (visa, master...)" value="${c?.bandeira || ''}">
        <input type="number" id="mCardLimite" class="f-input" placeholder="limite" min="0" step="100" value="${c?.limite || ''}">
        <div style="display:flex;gap:8px">
            <div style="flex:1"><label style="font-size:0.7rem;color:rgba(255,255,255,0.4)">fechamento (dia)</label><input type="number" id="mCardFech" class="f-input" min="1" max="31" value="${c?.fechamento || 5}"></div>
            <div style="flex:1"><label style="font-size:0.7rem;color:rgba(255,255,255,0.4)">vencimento (dia)</label><input type="number" id="mCardVenc" class="f-input" min="1" max="31" value="${c?.vencimento || 10}"></div>
        </div>
        <div style="display:flex;align-items:center;gap:10px"><label style="font-size:0.7rem;color:rgba(255,255,255,0.4)">cor</label><input type="color" id="mCardCor" value="${c?.cor || '#3b82f6'}" style="width:40px;height:30px;border:none;background:none"></div>
    `, `<button class="modal-btn modal-btn--cancel" onclick="closeModal()">cancelar</button>
        <button class="modal-btn modal-btn--primary" onclick="saveCardModal(${editId || 0})">salvar</button>`);
}

function saveCardModal(editId) {
    const name = document.getElementById('mCardName').value.trim();
    const bandeira = document.getElementById('mCardBandeira').value.trim();
    const limite = parseFloat(document.getElementById('mCardLimite').value) || 0;
    const fechamento = parseInt(document.getElementById('mCardFech').value) || 5;
    const vencimento = parseInt(document.getElementById('mCardVenc').value) || 10;
    const cor = document.getElementById('mCardCor').value;
    if (!name) { alert('Nome obrigatório.'); return; }
    if (editId) {
        const c = cartoes.find(x => x.id === editId);
        if (c) Object.assign(c, { name, bandeira, limite, fechamento, vencimento, cor });
    } else {
        cartoes.push({ id: nextId(cartoes), name, bandeira, limite, fechamento, vencimento, cor });
    }
    saveAll(); closeModal(); renderCartoes();
}
function editCard(id) { openCardModal(id); }
function deleteCard(id) {
    if (!confirm('Apagar este cartão e todos os lançamentos?')) return;
    cartoes = cartoes.filter(c => c.id !== id);
    lancCartao = lancCartao.filter(l => l.cardId !== id);
    selectedCardId = null; saveAll(); renderCartoes();
    document.getElementById('cartoesDetail').innerHTML = '<div class="empty-state">selecione ou crie um cartão</div>';
}

// --- Lançamento Cartão ---
function openCardLancModal() {
    openModal('Novo Lançamento', `
        <input type="text" id="mLancDesc" class="f-input" placeholder="descrição">
        <input type="number" id="mLancValor" class="f-input" placeholder="valor total" min="0" step="0.01">
        <input type="date" id="mLancDate" class="f-input" value="${finYear}-${String(finMonth+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}">
        <input type="number" id="mLancParcelas" class="f-input" placeholder="parcelas (1 = à vista)" min="1" max="48" value="1">
        <input type="text" id="mLancTags" class="f-input" placeholder="tags (separar por vírgula)">
        <input type="text" id="mLancPessoa" class="f-input" placeholder="pessoa (se emprestou o cartão)">
        <select id="mLancCat" class="f-select">${categorias.map(c => `<option value="${c}">${c}</option>`).join('')}</select>
    `, `<button class="modal-btn modal-btn--cancel" onclick="closeModal()">cancelar</button>
        <button class="modal-btn modal-btn--primary" onclick="saveCardLancModal()">salvar</button>`);
}

function saveCardLancModal() {
    const desc = document.getElementById('mLancDesc').value.trim();
    const valor = parseFloat(document.getElementById('mLancValor').value);
    const date = document.getElementById('mLancDate').value;
    const parcelas = parseInt(document.getElementById('mLancParcelas').value) || 1;
    const tagsStr = document.getElementById('mLancTags').value.trim();
    const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];
    const pessoa = document.getElementById('mLancPessoa').value.trim();
    const cat = document.getElementById('mLancCat').value;
    if (!desc || !valor || !date) { alert('Preencha descrição, valor e data.'); return; }
    lancCartao.push({ id: nextId(lancCartao), cardId: selectedCardId, desc, valor, date, parcelas, tags, pessoa, cat });
    saveAll(); closeModal(); renderCardDetail(); renderCartoesList();
}

function openCardRecModal() {
    openModal('Lançamento Recorrente', `
        <p style="font-size:0.78rem;color:rgba(255,255,255,0.5)">Cria lançamentos mensais automáticos para os próximos 12 meses.</p>
        <input type="text" id="mRecDesc" class="f-input" placeholder="descrição (ex: Netflix)">
        <input type="number" id="mRecValor" class="f-input" placeholder="valor mensal" min="0" step="0.01">
        <input type="number" id="mRecDia" class="f-input" placeholder="dia da cobrança" min="1" max="31" value="1">
        <input type="text" id="mRecTags" class="f-input" placeholder="tags" value="assinatura">
    `, `<button class="modal-btn modal-btn--cancel" onclick="closeModal()">cancelar</button>
        <button class="modal-btn modal-btn--primary" onclick="saveCardRecModal()">salvar</button>`);
}

function saveCardRecModal() {
    const desc = document.getElementById('mRecDesc').value.trim();
    const valor = parseFloat(document.getElementById('mRecValor').value);
    const dia = parseInt(document.getElementById('mRecDia').value) || 1;
    const tagsStr = document.getElementById('mRecTags').value.trim();
    const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];
    if (!desc || !valor) { alert('Preencha descrição e valor.'); return; }
    for (let i = 0; i < 12; i++) {
        const d = new Date(finYear, finMonth + i, dia);
        const dateStr = d.toISOString().split('T')[0];
        lancCartao.push({ id: nextId(lancCartao), cardId: selectedCardId, desc, valor, date: dateStr, parcelas: 1, tags, pessoa: '', cat: 'Assinaturas' });
    }
    saveAll(); closeModal(); renderCardDetail(); renderCartoesList();
}

function deleteCardLanc(id) { lancCartao = lancCartao.filter(l => l.id !== id); saveAll(); renderCardDetail(); renderCartoesList(); }

// --- Conta ---
function openContaModal(editId) {
    const c = editId ? contas.find(x => x.id === editId) : null;
    openModal(c ? 'Editar Conta' : 'Nova Conta', `
        <input type="text" id="mContaName" class="f-input" placeholder="nome da conta" value="${c?.name || ''}">
        <input type="number" id="mContaSaldo" class="f-input" placeholder="saldo atual" step="0.01" value="${c?.saldo || 0}">
    `, `<button class="modal-btn modal-btn--cancel" onclick="closeModal()">cancelar</button>
        ${c ? `<button class="modal-btn modal-btn--cancel" onclick="deleteConta(${c.id})" style="color:#ef4444">apagar</button>` : ''}
        <button class="modal-btn modal-btn--primary" onclick="saveContaModal(${editId || 0})">salvar</button>`);
}

function saveContaModal(editId) {
    const name = document.getElementById('mContaName').value.trim();
    const saldo = parseFloat(document.getElementById('mContaSaldo').value) || 0;
    if (!name) { alert('Nome obrigatório.'); return; }
    if (editId) {
        const c = contas.find(x => x.id === editId);
        if (c) Object.assign(c, { name, saldo });
    } else {
        contas.push({ id: nextId(contas), name, saldo });
    }
    saveAll(); closeModal(); renderFluxo();
}

function editConta(id) { openContaModal(id); }
function deleteConta(id) {
    if (!confirm('Apagar esta conta?')) return;
    contas = contas.filter(c => c.id !== id);
    saveAll(); closeModal(); renderFluxo();
}

// --- Meta de gasto ---
function openMetaGastoModal() {
    openModal('Nova Meta de Gasto', `
        <select id="mMGCat" class="f-select">${categorias.map(c => `<option value="${c}">${c}</option>`).join('')}</select>
        <input type="number" id="mMGLimite" class="f-input" placeholder="limite mensal (R$)" min="0" step="10">
    `, `<button class="modal-btn modal-btn--cancel" onclick="closeModal()">cancelar</button>
        <button class="modal-btn modal-btn--primary" onclick="saveMetaGastoModal()">salvar</button>`);
}

function saveMetaGastoModal() {
    const cat = document.getElementById('mMGCat').value;
    const limite = parseFloat(document.getElementById('mMGLimite').value);
    if (!cat || !limite) { alert('Preencha todos os campos.'); return; }
    metasGasto.push({ id: nextId(metasGasto), cat, limite });
    saveAll(); closeModal(); renderMetasGasto();
}

// --- Novo Ativo ---
function openAtivoModal() {
    openModal('Novo Aporte', `
        <input type="text" id="mAtivoName" class="f-input" placeholder="nome do ativo (ex: PETR4, CDB 120%)">
        <select id="mAtivoClasse" class="f-select">
            <option value="Renda Fixa">Renda Fixa</option><option value="Ações">Ações</option>
            <option value="FIIs">FIIs</option><option value="Cripto">Cripto</option><option value="Outro">Outro</option>
        </select>
        <div style="display:flex;gap:8px">
            <input type="number" id="mAtivoQty" class="f-input" placeholder="quantidade" min="0" step="1" style="flex:1">
            <input type="number" id="mAtivoPrice" class="f-input" placeholder="preço unitário" min="0" step="0.01" style="flex:1">
        </div>
        <input type="date" id="mAtivoDate" class="f-input" value="${new Date().toISOString().split('T')[0]}">
    `, `<button class="modal-btn modal-btn--cancel" onclick="closeModal()">cancelar</button>
        <button class="modal-btn modal-btn--primary" onclick="saveAtivoModal()">salvar</button>`);
}

function saveAtivoModal() {
    const name = document.getElementById('mAtivoName').value.trim();
    const classe = document.getElementById('mAtivoClasse').value;
    const qty = parseFloat(document.getElementById('mAtivoQty').value) || 0;
    const price = parseFloat(document.getElementById('mAtivoPrice').value) || 0;
    const date = document.getElementById('mAtivoDate').value;
    if (!name || !qty || !price) { alert('Preencha todos os campos.'); return; }
    // Check if ativo already exists — average cost
    const existing = ativos.find(a => a.name.toLowerCase() === name.toLowerCase());
    if (existing) {
        const totalQty = existing.qty + qty;
        existing.avgCost = (existing.qty * existing.avgCost + qty * price) / totalQty;
        existing.qty = totalQty;
        existing.price = price; // Update current price
    } else {
        ativos.push({ id: nextId(ativos), name, classe, qty, price, avgCost: price, date });
    }
    saveAll(); closeModal(); renderInvest();
}

// --- Dividendo ---
function openDividendoModal() {
    const ativoOpts = ativos.map(a => `<option value="${a.name}">${a.name}</option>`).join('');
    openModal('Registrar Dividendo', `
        <select id="mDivAtivo" class="f-select"><option value="">— ativo —</option>${ativoOpts}</select>
        <input type="number" id="mDivValor" class="f-input" placeholder="valor recebido" min="0" step="0.01">
        <input type="date" id="mDivDate" class="f-input" value="${new Date().toISOString().split('T')[0]}">
    `, `<button class="modal-btn modal-btn--cancel" onclick="closeModal()">cancelar</button>
        <button class="modal-btn modal-btn--primary" onclick="saveDividendoModal()">salvar</button>`);
}

function saveDividendoModal() {
    const ativo = document.getElementById('mDivAtivo').value;
    const valor = parseFloat(document.getElementById('mDivValor').value);
    const date = document.getElementById('mDivDate').value;
    if (!ativo || !valor || !date) { alert('Preencha todos os campos.'); return; }
    dividendos.push({ id: nextId(dividendos), ativo, valor, date });
    saveAll(); closeModal(); renderInvest();
}

// --- Meta Alocação ---
function openMetaAllocModal() {
    const fields = Object.entries(metaAlloc).map(([classe, pct]) =>
        `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="width:100px;font-size:0.82rem;color:rgba(255,255,255,0.7)">${classe}</span>
            <input type="number" class="f-input mAllocInput" data-classe="${classe}" value="${pct}" min="0" max="100" step="1" style="flex:1">
            <span style="font-size:0.75rem;color:rgba(255,255,255,0.3)">%</span>
        </div>`).join('');
    openModal('Meta de Alocação', fields, `
        <button class="modal-btn modal-btn--cancel" onclick="closeModal()">cancelar</button>
        <button class="modal-btn modal-btn--primary" onclick="saveMetaAllocModal()">salvar</button>`);
}

function saveMetaAllocModal() {
    document.querySelectorAll('.mAllocInput').forEach(input => {
        metaAlloc[input.dataset.classe] = parseInt(input.value) || 0;
    });
    saveAll(); closeModal(); renderInvest();
}

// --- Meta Financeira ---
function openMetaFinModal(editId) {
    const m = editId ? metasFin.find(x => x.id === editId) : null;
    openModal(m ? 'Editar Meta' : 'Nova Meta', `
        <input type="text" id="mMetaName" class="f-input" placeholder="nome da meta (ex: Reserva de emergência)" value="${m?.name || ''}">
        <input type="text" id="mMetaEmoji" class="f-input" placeholder="emoji (ex: 🏖️)" value="${m?.emoji || '🎯'}" style="width:80px">
        <input type="number" id="mMetaAlvo" class="f-input" placeholder="valor alvo (R$)" min="0" step="100" value="${m?.alvo || ''}">
        <input type="number" id="mMetaAtual" class="f-input" placeholder="valor atual (R$)" min="0" step="0.01" value="${m?.atual || 0}">
        <input type="date" id="mMetaPrazo" class="f-input" value="${m?.prazo || ''}">
    `, `<button class="modal-btn modal-btn--cancel" onclick="closeModal()">cancelar</button>
        <button class="modal-btn modal-btn--primary" onclick="saveMetaFinModal(${editId || 0})">salvar</button>`);
}

function saveMetaFinModal(editId) {
    const name = document.getElementById('mMetaName').value.trim();
    const emoji = document.getElementById('mMetaEmoji').value.trim() || '🎯';
    const alvo = parseFloat(document.getElementById('mMetaAlvo').value) || 0;
    const atual = parseFloat(document.getElementById('mMetaAtual').value) || 0;
    const prazo = document.getElementById('mMetaPrazo').value;
    if (!name || !alvo) { alert('Nome e valor alvo obrigatórios.'); return; }
    if (editId) {
        const m = metasFin.find(x => x.id === editId);
        if (m) Object.assign(m, { name, emoji, alvo, atual, prazo });
    } else {
        metasFin.push({ id: nextId(metasFin), name, emoji, alvo, atual, prazo });
    }
    saveAll(); closeModal(); renderMetas();
}

function editMetaFin(id) { openMetaFinModal(id); }

// ─── INIT ────────────────────────────────────────────────────────────────────
setFinView('dash');
