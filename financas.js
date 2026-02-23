/* ═══════════════════════════════════════════════════════════
   FINANÇAS — Clarity  (financas.js) v2
   ═══════════════════════════════════════════════════════════ */

// ─── THEME ───────────────────────────────────────────────────────────────────
let isLight = localStorage.getItem('clarity_theme') === 'light';
function applyTheme() { document.body.classList.toggle('light', isLight); const b = document.getElementById('themeToggleBtn'); if (b) b.textContent = isLight ? '🌙 escuro' : '☀ claro'; }
function toggleTheme() { isLight = !isLight; localStorage.setItem('clarity_theme', isLight ? 'light' : 'dark'); applyTheme(); renderAll(); }
applyTheme();

// ─── DATA ────────────────────────────────────────────────────────────────────
const LS = k => JSON.parse(localStorage.getItem(k) || 'null');
const SS = (k, v) => localStorage.setItem(k, JSON.stringify(v));
let cartoes      = LS('fin_cartoes')      || [];
let lancCartao   = LS('fin_lanc_cartao')  || [];
let contas       = LS('fin_contas')       || [{ id: 1, name: 'Conta principal', saldo: 0 }];
let fluxoEntries = LS('fin_fluxo')        || [];
const CAT_DESP = ['Alimentação','Moradia','Transporte','Saúde','Educação','Lazer','Roupas','Assinaturas','Outros'];
const CAT_REC  = ['Salário fixo','Freelance','Avulso','Rendimento','Presente','Reembolso','Outros'];
let metasGasto   = LS('fin_metas_gasto')  || [];
let metaReceita  = LS('fin_meta_receita') || { limite: 0 };
let ativos       = LS('fin_ativos')       || [];
let dividendos   = LS('fin_dividendos')   || [];
let metaAlloc    = LS('fin_meta_alloc')   || { 'Renda Fixa': 60, 'Ações': 25, 'FIIs': 10, 'Cripto': 5 };
let metasFin     = LS('fin_metas_fin')    || [];
function saveAll() {
    SS('fin_cartoes', cartoes); SS('fin_lanc_cartao', lancCartao); SS('fin_contas', contas);
    SS('fin_fluxo', fluxoEntries); SS('fin_metas_gasto', metasGasto); SS('fin_meta_receita', metaReceita);
    SS('fin_ativos', ativos); SS('fin_dividendos', dividendos); SS('fin_meta_alloc', metaAlloc); SS('fin_metas_fin', metasFin);
}

// ─── DATE NAV ────────────────────────────────────────────────────────────────
let finMonth = new Date().getMonth(), finYear = new Date().getFullYear();
function finMonthKey() { return `${finYear}-${String(finMonth+1).padStart(2,'0')}`; }
function updateFinDate() { document.getElementById('finDateTitle').textContent = new Date(finYear, finMonth).toLocaleDateString('pt-br', { month: 'long', year: 'numeric' }); }
function finPrevMonth() { finMonth--; if (finMonth<0){finMonth=11;finYear--;} updateFinDate(); renderCurrentView(); }
function finNextMonth() { finMonth++; if (finMonth>11){finMonth=0;finYear++;} updateFinDate(); renderCurrentView(); }
updateFinDate();

// ─── DATE PICKER ─────────────────────────────────────────────────────────────
let dpOpen=false, dpYear, dpMo;
function toggleDatePicker() { const el=document.getElementById('datePicker'); dpOpen=!dpOpen; el.classList.toggle('hidden',!dpOpen); if(dpOpen){dpYear=finYear;dpMo=finMonth;renderDP();} }
function dpPrevMonth() { dpMo--; if(dpMo<0){dpMo=11;dpYear--;} renderDP(); }
function dpNextMonth() { dpMo++; if(dpMo>11){dpMo=0;dpYear++;} renderDP(); }
function renderDP() {
    document.getElementById('dpMonthLabel').textContent = new Date(dpYear, dpMo).toLocaleDateString('pt-br', { month: 'long', year: 'numeric' });
    const g=document.getElementById('dpGrid'); let h='';
    for(let m=0;m<12;m++){ const a=m===finMonth&&dpYear===finYear; h+=`<button class="dp-day${a?' dp-day--today':''}" onclick="selDP(${dpYear},${m})">${new Date(dpYear,m).toLocaleDateString('pt-br',{month:'short'})}</button>`; }
    g.innerHTML=h;
}
function selDP(y,m){ finYear=y;finMonth=m; updateFinDate();renderCurrentView(); document.getElementById('datePicker').classList.add('hidden');dpOpen=false; }
document.addEventListener('click',e=>{ if(dpOpen&&!e.target.closest('.date-picker-popup')&&!e.target.closest('#finDateTitle')){document.getElementById('datePicker').classList.add('hidden');dpOpen=false;} });

// ─── VIEWS ───────────────────────────────────────────────────────────────────
const VIEW_LABELS={dash:'dashboard',cartoes:'cartões de crédito',fluxo:'entradas & saídas',invest:'investimentos',metas:'metas financeiras'};
let currentFinView='dash';
function setFinView(v) {
    currentFinView=v;
    ['dash','cartoes','fluxo','invest','metas'].forEach(x=>{
        const el=document.getElementById('view'+x.charAt(0).toUpperCase()+x.slice(1));
        if(el)el.classList.toggle('hidden',x!==v);
        const d=document.getElementById('dItem'+x.charAt(0).toUpperCase()+x.slice(1));
        if(d)d.classList.toggle('drawer-item--active',x===v);
    });
    document.getElementById('finViewLabel').textContent=VIEW_LABELS[v]||v;
    renderCurrentView();
}
function renderCurrentView() {
    switch(currentFinView){ case 'dash':renderDashboard();break; case 'cartoes':renderCartoes();break; case 'fluxo':renderFluxo();break; case 'invest':renderInvest();break; case 'metas':renderMetas();break; }
}
function renderAll(){ renderCurrentView(); }

// ─── UTILS ───────────────────────────────────────────────────────────────────
function fmt(v){ return 'R$ '+Number(v||0).toLocaleString('pt-br',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function fmtS(v){ return Number(v||0).toLocaleString('pt-br',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function nid(a){ return a.length?Math.max(...a.map(x=>x.id||0))+1:1; }
function mOf(d){ return d?.substring(0,7)||''; }
function dOf(d){ if(!d)return''; const p=d.split('-'); return p[2]+'/'+p[1]; }
function dFull(d){ if(!d)return''; const p=d.split('-'); return p[2]+'/'+p[1]+'/'+p[0]; }
function todayStr(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
const CAT_COLORS={'Alimentação':'#f59e0b','Moradia':'#6366f1','Transporte':'#3b82f6','Saúde':'#ef4444','Educação':'#8b5cf6','Lazer':'#ec4899','Roupas':'#f97316','Assinaturas':'#06b6d4','Outros':'#64748b','Salário fixo':'#10b981','Freelance':'#14b8a6','Avulso':'#84cc16','Rendimento':'#22c55e','Presente':'#f472b6','Reembolso':'#38bdf8','Meta':'#8b5cf6'};
const CL_COLORS={'Renda Fixa':'#3b82f6','Ações':'#22c55e','FIIs':'#f59e0b','Cripto':'#8b5cf6','Outro':'#64748b'};

// ═══════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════
let dashPC=null, dashCC=null;
function renderDashboard(){
    const mk=finMonthKey();
    const st=contas.reduce((s,c)=>s+(c.saldo||0),0)+ativos.reduce((s,a)=>s+a.qty*a.price,0);
    document.getElementById('dashSaldoTotal').textContent=fmt(st);
    document.getElementById('dashSaldoSub').textContent=`${contas.length} conta${contas.length!==1?'s':''} + investimentos`;
    const mf=fluxoEntries.filter(e=>mOf(e.date)===mk);
    const rec=mf.filter(e=>e.type==='receita').reduce((s,e)=>s+e.valor,0);
    const desp=mf.filter(e=>e.type==='despesa').reduce((s,e)=>s+e.valor,0);
    const bal=rec-desp;
    document.getElementById('dashReceitas').textContent=fmt(rec);
    document.getElementById('dashDespesas').textContent=fmt(desp);
    const be=document.getElementById('dashBalanco'); be.textContent=fmt(bal); be.style.color=bal>=0?'#22c55e':'#ef4444';
    renderDashFatura(); renderDashPatChart(); renderDashCatChart(); renderDashAlertas();
}
function renderDashFatura(){
    const el=document.getElementById('dashFatura'),sub=document.getElementById('dashFaturaSub');
    if(!cartoes.length){el.textContent='—';sub.textContent='sem cartões';return;}
    const t=new Date(); let near=null,nv=0;
    cartoes.forEach(c=>{const v=new Date(t.getFullYear(),t.getMonth(),c.vencimento||10);if(v<t)v.setMonth(v.getMonth()+1);const ft=calcFT(c.id,v.getFullYear(),v.getMonth());if(!near||v<near.d){near={c,d:v};nv=ft;}});
    if(near){el.textContent=fmt(nv);sub.textContent=`${near.c.name} · venc. ${dOf(near.d.toISOString().split('T')[0])}`;}
}
function renderDashPatChart(){
    if(dashPC)dashPC.destroy();
    const lb=[],dt=[];
    for(let i=5;i>=0;i--){let m=finMonth-i,y=finYear;while(m<0){m+=12;y--;}const mk=`${y}-${String(m+1).padStart(2,'0')}`;lb.push(new Date(y,m).toLocaleDateString('pt-br',{month:'short'}));const f=fluxoEntries.filter(e=>mOf(e.date)<=mk);const b=f.reduce((s,e)=>s+(e.type==='receita'?e.valor:e.type==='despesa'?-e.valor:0),0);dt.push(b+ativos.reduce((s,a)=>s+a.qty*a.price,0));}
    const gc=isLight?'rgba(0,0,0,0.07)':'rgba(255,255,255,0.08)',tc=isLight?'#555':'rgba(255,255,255,0.6)';
    dashPC=new Chart(document.getElementById('dashPatrimonioChart'),{type:'line',data:{labels:lb,datasets:[{data:dt,borderColor:'#3b82f6',borderWidth:2,pointRadius:3,pointBackgroundColor:'#3b82f6',backgroundColor:'#3b82f622',fill:true,tension:0.4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:tc},grid:{color:gc}},y:{ticks:{color:tc,callback:v=>fmt(v)},grid:{color:gc}}}}});
}
function renderDashCatChart(){
    if(dashCC)dashCC.destroy();const mk=finMonthKey();const bc={};
    fluxoEntries.filter(e=>mOf(e.date)===mk&&e.type==='despesa').forEach(e=>{bc[e.cat||'Outros']=(bc[e.cat||'Outros']||0)+e.valor;});
    const en=Object.entries(bc).sort((a,b)=>b[1]-a[1]);if(!en.length)return;
    dashCC=new Chart(document.getElementById('dashCatChart'),{type:'doughnut',data:{labels:en.map(e=>e[0]),datasets:[{data:en.map(e=>e[1]),backgroundColor:en.map(e=>CAT_COLORS[e[0]]||'#64748b'),borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:isLight?'#555':'rgba(255,255,255,0.6)',font:{size:10}}}}}});
}
function renderDashAlertas(){
    const el=document.getElementById('dashAlertas'),al=[],t=new Date(),mk=finMonthKey();
    cartoes.forEach(c=>{const v=new Date(t.getFullYear(),t.getMonth(),c.vencimento||10);if(v<t)v.setMonth(v.getMonth()+1);const df=Math.ceil((v-t)/864e5);if(df<=7&&df>=0){const ft=calcFT(c.id,v.getFullYear(),v.getMonth());al.push({c:'#f59e0b',t:`Fatura ${c.name} vence em ${df}d (${fmt(ft)})`});}});
    metasGasto.forEach(mg=>{const g=fluxoEntries.filter(e=>mOf(e.date)===mk&&e.type==='despesa'&&e.cat===mg.cat).reduce((s,e)=>s+e.valor,0);if(g>mg.limite)al.push({c:'#ef4444',t:`${mg.cat} estourada: ${fmt(g)}/${fmt(mg.limite)}`});else if(g>mg.limite*0.8)al.push({c:'#f59e0b',t:`${mg.cat}: ${Math.round(g/mg.limite*100)}% da meta`});});
    if(!al.length)al.push({c:'#22c55e',t:'Tudo em dia!'});
    el.innerHTML=al.map(a=>`<div class="dash-alerta" style="border-left-color:${a.c}">${a.t}</div>`).join('');
}

// ═══════════════════════════════════════════════════════════
// CARTÕES
// ═══════════════════════════════════════════════════════════
let selCardId=null, fatOff=0;
function renderCartoes(){ renderCartoesList(); if(selCardId)renderCardDetail(); renderDevedores(); }
function renderCartoesList(){
    const el=document.getElementById('cartoesList');
    if(!cartoes.length){el.innerHTML='<div class="empty-state">nenhum cartão</div>';return;}
    el.innerHTML=cartoes.map(c=>{const u=calcFT(c.id,finYear,finMonth);const p=c.limite?Math.min(100,Math.round(u/c.limite*100)):0;const bc=p>90?'#ef4444':p>70?'#f59e0b':'#22c55e';
    return `<div class="card-item ${selCardId===c.id?'card-item--active':''}" onclick="selectCard(${c.id})"><div class="card-item-top"><div class="card-color-dot" style="background:${c.cor||'#3b82f6'}"></div><span class="card-item-name">${c.name}</span><span class="card-item-bandeira">${c.bandeira||''}</span></div><div class="card-limit-bar"><div class="card-limit-fill" style="width:${p}%;background:${bc}"></div></div><div class="card-limit-info"><span>${fmt(u)}</span><span>${fmt(c.limite)}</span></div></div>`;}).join('');
}
function selectCard(id){ selCardId=id;fatOff=0;renderCartoesList();renderCardDetail(); }
function calcFM(cid,y,m){
    const c=cartoes.find(x=>x.id===cid);if(!c)return[];const f=c.fechamento||5;
    const s=new Date(y,m-1,f+1),e=new Date(y,m,f);
    return lancCartao.filter(l=>{if(l.cardId!==cid)return false;if(l.parcelas>1){const cd=new Date(l.date+'T00:00:00');for(let p=0;p<l.parcelas;p++){const pd=new Date(cd.getFullYear(),cd.getMonth()+p,cd.getDate());if(pd>=s&&pd<=e)return true;}return false;}const d=new Date(l.date+'T00:00:00');return d>=s&&d<=e;}).map(l=>{
        if(l.parcelas>1){const cd=new Date(l.date+'T00:00:00');for(let p=0;p<l.parcelas;p++){const pd=new Date(cd.getFullYear(),cd.getMonth()+p,cd.getDate());const s2=new Date(y,m-1,f+1),e2=new Date(y,m,f);if(pd>=s2&&pd<=e2)return{...l,pa:p+1,vp:l.valor/l.parcelas};}}
        return{...l,pa:1,vp:l.valor};});
}
function calcFT(cid,y,m){ return calcFM(cid,y,m).reduce((s,l)=>s+(l.vp||l.valor),0); }
function renderCardDetail(){
    const c=cartoes.find(x=>x.id===selCardId);if(!c){document.getElementById('cartoesDetail').innerHTML='<div class="empty-state">selecione um cartão</div>';return;}
    const fy=finYear+Math.floor((finMonth+fatOff)/12),fm=((finMonth+fatOff)%12+12)%12;
    const ls=calcFM(c.id,fy,fm),tot=ls.reduce((s,l)=>s+(l.vp||l.valor),0);
    const fl=new Date(fy,fm).toLocaleDateString('pt-br',{month:'long',year:'numeric'});
    const bp={};ls.filter(l=>l.pessoa).forEach(l=>{bp[l.pessoa]=(bp[l.pessoa]||0)+(l.vp||l.valor);});
    document.getElementById('cartoesDetail').innerHTML=`<div class="glass-panel" style="padding:16px 20px;display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px"><span style="font-size:0.9rem;font-weight:700;color:rgba(255,255,255,0.9)">${c.name}</span><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn-sm" onclick="openCardLancModal()">+ lançamento</button><button class="btn-sm" onclick="openCardRecModal()">+ recorrente</button><button class="btn-sm" onclick="editCard(${c.id})" style="background:rgba(255,255,255,0.04);border-color:rgba(255,255,255,0.1);color:rgba(255,255,255,0.5)">✏️</button><button class="btn-sm" onclick="deleteCard(${c.id})" style="background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.15);color:#ef4444">🗑</button></div></div>
        <div class="fatura-nav"><button class="fatura-nav-btn" onclick="fatOff--;renderCardDetail()">‹</button><span class="fatura-label">fatura de ${fl}</span><button class="fatura-nav-btn" onclick="fatOff++;renderCardDetail()">›</button></div>
        <div class="fatura-total">${fmt(tot)}</div>
        ${Object.keys(bp).length?`<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center">${Object.entries(bp).map(([p,v])=>`<span class="cl-pessoa" style="font-size:0.72rem">👤 ${p}: ${fmt(v)}</span>`).join('')}</div>`:''}
        <div style="display:flex;flex-direction:column">${ls.length?ls.map(l=>`<div class="card-lancamento"><span class="cl-date">${dOf(l.date)}</span><span class="cl-desc">${l.desc}</span>${l.tags?.length?l.tags.map(t=>`<span class="cl-tag">${t}</span>`).join(''):''}${l.pessoa?`<span class="cl-pessoa">👤 ${l.pessoa}</span>`:''}${l.parcelas>1?`<span class="cl-parcela">${l.pa}/${l.parcelas}</span>`:''}
        <span class="cl-valor">${fmt(l.vp||l.valor)}</span><div class="cl-actions"><button class="cl-btn" onclick="editCardLanc(${l.id})">✏️</button><button class="cl-btn cl-btn--del" onclick="delCardLanc(${l.id})">✕</button></div></div>`).join(''):'<div class="empty-state">sem lançamentos</div>'}</div></div>`;
}
function renderDevedores(){
    const bp={};lancCartao.forEach(l=>{if(l.pessoa){const v=l.parcelas>1?l.valor/l.parcelas:l.valor;bp[l.pessoa]=(bp[l.pessoa]||0)+v;}});
    const el=document.getElementById('devedoresResumo');
    if(!Object.keys(bp).length){el.innerHTML='<div style="font-size:0.75rem;color:rgba(255,255,255,0.25);padding:4px 0">ninguém</div>';return;}
    el.innerHTML=Object.entries(bp).map(([p,v])=>`<div class="devedor-row"><span>👤 ${p}</span><span>${fmt(v)}</span></div>`).join('');
}

// ═══════════════════════════════════════════════════════════
// ENTRADAS & SAÍDAS
// ═══════════════════════════════════════════════════════════
let fluxoType='despesa';
function renderFluxo(){ populateCatSels(); renderContasList(); renderFluxoList(); renderMetasGasto(); renderMetaReceita(); document.getElementById('fluxoData').value=todayStr(); }
function setFluxoType(t){
    fluxoType=t;
    document.getElementById('fttDespesa').classList.toggle('ftt-btn--active',t==='despesa');
    document.getElementById('fttReceita').classList.toggle('ftt-btn--active',t==='receita');
    document.getElementById('fttMeta').classList.toggle('ftt-btn--active',t==='meta');
    // Show/hide meta select
    document.getElementById('fluxoMeta').classList.toggle('hidden',t!=='meta');
    populateCatSels();
}
function populateCatSels(){
    const cats=fluxoType==='receita'?CAT_REC:CAT_DESP;
    document.getElementById('fluxoCat').innerHTML='<option value="">— categoria —</option>'+cats.map(c=>`<option value="${c}">${c}</option>`).join('');
    document.getElementById('fluxoConta').innerHTML='<option value="">— conta —</option>'+contas.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
    // Meta select
    document.getElementById('fluxoMeta').innerHTML='<option value="">— meta —</option>'+metasFin.map(m=>`<option value="${m.id}">${m.emoji||'🎯'} ${m.name}</option>`).join('');
    document.getElementById('fluxoFilterCat').innerHTML='<option value="">todas categorias</option>'+[...CAT_DESP,...CAT_REC].map(c=>`<option value="${c}">${c}</option>`).join('');
}
function renderContasList(){
    document.getElementById('contasList').innerHTML=contas.map(c=>`<div class="conta-chip" onclick="editConta(${c.id})"><span class="conta-chip-name">${c.name}</span><span class="conta-chip-saldo">${fmt(c.saldo)}</span></div>`).join('');
}
function saveFluxo(){
    const desc=document.getElementById('fluxoDesc').value.trim(),valor=parseFloat(document.getElementById('fluxoValor').value),date=document.getElementById('fluxoData').value,cat=document.getElementById('fluxoCat').value,contaId=parseInt(document.getElementById('fluxoConta').value)||null,tagsS=document.getElementById('fluxoTags').value.trim(),tags=tagsS?tagsS.split(',').map(t=>t.trim()).filter(Boolean):[],rec=document.getElementById('fluxoRecorrencia').value,metaId=parseInt(document.getElementById('fluxoMeta').value)||null;
    if(!desc||!valor||!date){alert('Preencha descrição, valor e data.');return;}
    // If type is meta, add to meta
    if(fluxoType==='meta'&&metaId){
        const m=metasFin.find(x=>x.id===metaId);
        if(m) m.atual=(m.atual||0)+valor;
    }
    const entry={id:nid(fluxoEntries),type:fluxoType==='meta'?'meta':fluxoType,desc,valor,date,cat:fluxoType==='meta'?'Meta':cat,contaId,tags,recorrencia:rec,metaId:metaId||null};
    fluxoEntries.push(entry);
    if(contaId){const ct=contas.find(c=>c.id===contaId);if(ct)ct.saldo+=fluxoType==='receita'?valor:-valor;}
    // Recurrence
    if(rec==='mensal'){for(let i=1;i<=11;i++){const d=new Date(date+'T00:00:00');d.setMonth(d.getMonth()+i);fluxoEntries.push({id:nid(fluxoEntries),type:entry.type,desc:desc+' (rec.)',valor,date:d.toISOString().split('T')[0],cat:entry.cat,contaId,tags:[...tags,'recorrente'],recorrencia:'',metaId:entry.metaId});}}
    else if(rec==='semanal'){for(let i=1;i<=51;i++){const d=new Date(date+'T00:00:00');d.setDate(d.getDate()+i*7);fluxoEntries.push({id:nid(fluxoEntries),type:entry.type,desc:desc+' (rec.)',valor,date:d.toISOString().split('T')[0],cat:entry.cat,contaId,tags:[...tags,'recorrente'],recorrencia:'',metaId:entry.metaId});}}
    saveAll();
    document.getElementById('fluxoDesc').value='';document.getElementById('fluxoValor').value='';document.getElementById('fluxoTags').value='';document.getElementById('fluxoRecorrencia').value='';
    renderFluxo();
}
function renderFluxoList(){
    const mk=finMonthKey(),fc=document.getElementById('fluxoFilterCat')?.value||'',ft=document.getElementById('fluxoFilterType')?.value||'';
    let en=fluxoEntries.filter(e=>mOf(e.date)===mk);if(fc)en=en.filter(e=>e.cat===fc);if(ft)en=en.filter(e=>e.type===ft);en.sort((a,b)=>b.date.localeCompare(a.date));
    document.getElementById('fluxoListTitle').textContent=`lançamentos — ${new Date(finYear,finMonth).toLocaleDateString('pt-br',{month:'long'})}`;
    const el=document.getElementById('fluxoList');
    if(!en.length)el.innerHTML='<div class="empty-state">sem lançamentos</div>';
    else el.innerHTML=en.map(e=>{const cc=CAT_COLORS[e.cat]||'#64748b';const ct=contas.find(c=>c.id===e.contaId);
    return `<div class="fluxo-entry"><span class="fe-date">${dOf(e.date)}</span><span class="fe-cat-dot" style="background:${cc}"></span><span class="fe-desc">${e.desc}</span>${e.tags?.length?`<div class="fe-tags">${e.tags.map(t=>`<span class="fe-tag">${t}</span>`).join('')}</div>`:''}${ct?`<span class="fe-conta">${ct.name}</span>`:''}
    <span class="fe-valor fe-valor--${e.type}">${e.type==='receita'?'+':e.type==='meta'?'→':'-'} ${fmtS(e.valor)}</span><div class="fe-actions"><button class="fe-btn" onclick="editFluxo(${e.id})">✏️</button><button class="fe-btn fe-btn--del" onclick="delFluxo(${e.id})">✕</button></div></div>`;}).join('');
    const am=fluxoEntries.filter(e=>mOf(e.date)===mk);
    const r=am.filter(e=>e.type==='receita').reduce((s,e)=>s+e.valor,0),d=am.filter(e=>e.type==='despesa').reduce((s,e)=>s+e.valor,0),mt=am.filter(e=>e.type==='meta').reduce((s,e)=>s+e.valor,0);
    document.getElementById('fluxoTotals').innerHTML=`<span>receitas: <strong style="color:#22c55e">${fmt(r)}</strong></span><span>despesas: <strong style="color:#ef4444">${fmt(d)}</strong></span>${mt?`<span>metas: <strong style="color:#8b5cf6">${fmt(mt)}</strong></span>`:''}<span>balanço: <strong style="color:${r-d>=0?'#22c55e':'#ef4444'}">${fmt(r-d)}</strong></span>`;
}
function delFluxo(id){const e=fluxoEntries.find(x=>x.id===id);if(!e)return;if(e.contaId){const ct=contas.find(c=>c.id===e.contaId);if(ct)ct.saldo-=e.type==='receita'?e.valor:-e.valor;}if(e.type==='meta'&&e.metaId){const m=metasFin.find(x=>x.id===e.metaId);if(m)m.atual=Math.max(0,(m.atual||0)-e.valor);}fluxoEntries=fluxoEntries.filter(x=>x.id!==id);saveAll();renderFluxo();}
function editFluxo(id){
    const e=fluxoEntries.find(x=>x.id===id);if(!e)return;
    const cats=e.type==='receita'?CAT_REC:CAT_DESP;
    openModal('Editar Lançamento',`
        <span class="modal-label">descrição</span><input type="text" id="meDesc" class="f-input" value="${e.desc}">
        <span class="modal-label">valor</span><input type="number" id="meValor" class="f-input" value="${e.valor}" min="0" step="0.01">
        <span class="modal-label">data</span><input type="date" id="meDate" class="f-input" value="${e.date}">
        <span class="modal-label">categoria</span><select id="meCat" class="f-select">${cats.map(c=>`<option value="${c}"${e.cat===c?' selected':''}>${c}</option>`).join('')}</select>
        <span class="modal-label">tags</span><input type="text" id="meTags" class="f-input" value="${(e.tags||[]).join(', ')}">
    `,`<button class="modal-btn modal-btn--cancel" onclick="closeModal()">cancelar</button><button class="modal-btn modal-btn--primary" onclick="saveEditFluxo(${id})">salvar</button>`);
}
function saveEditFluxo(id){
    const e=fluxoEntries.find(x=>x.id===id);if(!e)return;
    e.desc=document.getElementById('meDesc').value.trim();e.valor=parseFloat(document.getElementById('meValor').value)||e.valor;e.date=document.getElementById('meDate').value;e.cat=document.getElementById('meCat').value;
    const ts=document.getElementById('meTags').value.trim();e.tags=ts?ts.split(',').map(t=>t.trim()).filter(Boolean):[];
    saveAll();closeModal();renderFluxo();
}
function renderMetasGasto(){
    const mk=finMonthKey(),el=document.getElementById('fluxoMetasGasto');
    if(!metasGasto.length){el.innerHTML='<div style="font-size:0.75rem;color:rgba(255,255,255,0.25)">nenhuma meta</div>';return;}
    el.innerHTML=metasGasto.map(mg=>{const g=fluxoEntries.filter(e=>mOf(e.date)===mk&&e.type==='despesa'&&e.cat===mg.cat).reduce((s,e)=>s+e.valor,0);const p=mg.limite?Math.min(100,Math.round(g/mg.limite*100)):0;const c=p>90?'#ef4444':p>70?'#f59e0b':'#22c55e';
    return `<div class="meta-gasto-card"><div style="display:flex;justify-content:space-between"><span class="mg-cat">${mg.cat}</span><button class="fe-btn fe-btn--del" onclick="delMG(${mg.id})">✕</button></div><div class="mg-bar"><div class="mg-bar-fill" style="width:${p}%;background:${c}"></div></div><div class="mg-info"><span>${fmt(g)}</span><span>${fmt(mg.limite)}</span></div></div>`;}).join('');
}
function delMG(id){metasGasto=metasGasto.filter(x=>x.id!==id);saveAll();renderMetasGasto();}
function renderMetaReceita(){
    const mk=finMonthKey(),el=document.getElementById('fluxoMetaReceita');
    const rec=fluxoEntries.filter(e=>mOf(e.date)===mk&&e.type==='receita').reduce((s,e)=>s+e.valor,0);
    const lim=metaReceita.limite||0;
    if(!lim){el.innerHTML='<div style="font-size:0.75rem;color:rgba(255,255,255,0.25)">sem meta definida</div>';return;}
    const p=Math.min(100,Math.round(rec/lim*100));const c=p>=100?'#22c55e':p>60?'#3b82f6':'#f59e0b';
    el.innerHTML=`<div class="meta-receita-card"><div class="mr-bar"><div class="mr-fill" style="width:${p}%;background:${c}"></div></div><div class="mg-info"><span>${fmt(rec)}</span><span>${fmt(lim)} (${p}%)</span></div></div>`;
}

// ═══════════════════════════════════════════════════════════
// INVESTIMENTOS
// ═══════════════════════════════════════════════════════════
let invAC=null;
function renderInvest(){
    const ti=ativos.reduce((s,a)=>s+a.qty*a.price,0),tc=ativos.reduce((s,a)=>s+a.qty*a.avgCost,0);
    const r=tc>0?((ti-tc)/tc*100).toFixed(1):0,td=dividendos.reduce((s,d)=>s+d.valor,0);
    document.getElementById('investTotal').textContent=fmt(ti);
    const re=document.getElementById('investRent');re.textContent=tc>0?`${r>0?'+':''}${r}%`:'—';re.style.color=r>=0?'#22c55e':'#ef4444';
    document.getElementById('investDiv').textContent=fmt(td);
    renderInvAlloc(ti);renderInvMeta(ti);renderInvAtivos();renderInvDiv();
}
function renderInvAlloc(ti){
    if(invAC)invAC.destroy();const bc={};ativos.forEach(a=>{bc[a.classe||'Outro']=(bc[a.classe||'Outro']||0)+a.qty*a.price;});
    const en=Object.entries(bc);if(!en.length){document.getElementById('investAllocLegend').innerHTML='<div class="empty-state" style="padding:8px">nenhum ativo</div>';return;}
    invAC=new Chart(document.getElementById('investAllocChart'),{type:'doughnut',data:{labels:en.map(e=>e[0]),datasets:[{data:en.map(e=>e[1]),backgroundColor:en.map(e=>CL_COLORS[e[0]]||'#64748b'),borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}});
    document.getElementById('investAllocLegend').innerHTML=en.map(([cl,v])=>`<div class="alloc-legend-item"><div class="alloc-legend-dot" style="background:${CL_COLORS[cl]||'#64748b'}"></div>${cl}: ${fmt(v)} (${ti>0?Math.round(v/ti*100):0}%)</div>`).join('');
}
function renderInvMeta(ti){
    const bc={};ativos.forEach(a=>{bc[a.classe||'Outro']=(bc[a.classe||'Outro']||0)+a.qty*a.price;});
    document.getElementById('investMetaAlloc').innerHTML=Object.entries(metaAlloc).map(([cl,mt])=>{const at=ti>0?Math.round((bc[cl]||0)/ti*100):0;const c=CL_COLORS[cl]||'#64748b';return `<div class="invest-meta-row"><div class="alloc-legend-dot" style="background:${c}"></div><span style="width:80px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${cl}</span><div class="invest-meta-bar"><div class="invest-meta-fill" style="width:${at}%;background:${c}"></div></div><span class="invest-meta-pct">${at}%/${mt}%</span></div>`;}).join('');
}
function renderInvAtivos(){
    const el=document.getElementById('investAtivosList');if(!ativos.length){el.innerHTML='<div class="empty-state">nenhum ativo</div>';return;}
    el.innerHTML=`<div class="invest-ativo-row invest-ativo-row--header"><span>ativo</span><span>classe</span><span>qtd</span><span>preço</span><span>total</span><span></span></div>`+ativos.map(a=>`<div class="invest-ativo-row"><span class="invest-ativo-name">${a.name}</span><span><span class="invest-ativo-classe" style="background:${CL_COLORS[a.classe]||'#64748b'}22;color:${CL_COLORS[a.classe]||'#64748b'}">${a.classe}</span></span><span>${a.qty}</span><span>${fmt(a.price)}</span><span>${fmt(a.qty*a.price)}</span><button class="fe-btn fe-btn--del" onclick="delAtivo(${a.id})">✕</button></div>`).join('');
}
function delAtivo(id){ativos=ativos.filter(a=>a.id!==id);saveAll();renderInvest();}
function renderInvDiv(){
    const el=document.getElementById('investDivList'),s=[...dividendos].sort((a,b)=>b.date.localeCompare(a.date));
    if(!s.length){el.innerHTML='<div class="empty-state">sem dividendos</div>';return;}
    el.innerHTML=s.slice(0,20).map(d=>`<div class="invest-div-row"><span class="idv-date">${dOf(d.date)}</span><span class="idv-ativo">${d.ativo}</span><span class="idv-valor">+${fmtS(d.valor)}</span><button class="fe-btn fe-btn--del" onclick="delDiv(${d.id})">✕</button></div>`).join('');
}
function delDiv(id){dividendos=dividendos.filter(d=>d.id!==id);saveAll();renderInvest();}

// ═══════════════════════════════════════════════════════════
// METAS FINANCEIRAS
// ═══════════════════════════════════════════════════════════
function renderMetas(){
    const el=document.getElementById('metasFinList');if(!metasFin.length){el.innerHTML='<div class="empty-state">nenhuma meta</div>';return;}
    el.innerHTML=metasFin.map(m=>{const p=m.alvo>0?Math.min(100,Math.round(m.atual/m.alvo*100)):0;const c=p>=100?'#22c55e':p>60?'#3b82f6':'#f59e0b';
    return `<div class="meta-fin-card"><div class="mf-header"><span class="mf-name">${m.name}</span><span class="mf-emoji">${m.emoji||'🎯'}</span></div><div class="mf-progress-bar"><div class="mf-progress-fill" style="width:${p}%;background:${c}"></div></div><div class="mf-info"><span><strong>${fmt(m.atual)}</strong> de ${fmt(m.alvo)}</span><span><strong>${p}%</strong></span></div>${m.prazo?`<div style="font-size:0.68rem;color:rgba(255,255,255,0.3)">prazo: ${dFull(m.prazo)}</div>`:''}<div class="mf-footer"><button class="mf-btn" onclick="aportarMeta(${m.id})">+ aporte</button><button class="mf-btn" onclick="editMetaFin(${m.id})">✏️</button><button class="mf-btn" onclick="delMetaFin(${m.id})" style="color:#ef4444">🗑</button></div></div>`;}).join('');
}
function delMetaFin(id){metasFin=metasFin.filter(m=>m.id!==id);saveAll();renderMetas();}
function aportarMeta(id){const m=metasFin.find(x=>x.id===id);if(!m)return;const v=parseFloat(prompt(`Quanto aportar em "${m.name}"?`));if(!v||v<=0)return;m.atual=(m.atual||0)+v;saveAll();renderMetas();}

// ═══════════════════════════════════════════════════════════
// MODAIS
// ═══════════════════════════════════════════════════════════
function openModal(t,b,a){document.getElementById('modalTitle').textContent=t;document.getElementById('modalBody').innerHTML=b;document.getElementById('modalActions').innerHTML=a;document.getElementById('modalOverlay').classList.remove('hidden');}
function closeModal(){document.getElementById('modalOverlay').classList.add('hidden');}

function openCardModal(eid){
    const c=eid?cartoes.find(x=>x.id===eid):null;
    openModal(c?'Editar Cartão':'Novo Cartão',`
        <span class="modal-label">nome</span><input type="text" id="mCN" class="f-input" value="${c?.name||''}">
        <span class="modal-label">bandeira</span><input type="text" id="mCB" class="f-input" placeholder="visa, master..." value="${c?.bandeira||''}">
        <span class="modal-label">limite</span><input type="number" id="mCL" class="f-input" min="0" step="100" value="${c?.limite||''}">
        <div style="display:flex;gap:8px"><div style="flex:1"><span class="modal-label">fechamento (dia)</span><input type="number" id="mCF" class="f-input" min="1" max="31" value="${c?.fechamento||5}"></div><div style="flex:1"><span class="modal-label">vencimento (dia)</span><input type="number" id="mCV" class="f-input" min="1" max="31" value="${c?.vencimento||10}"></div></div>
        <div style="display:flex;align-items:center;gap:8px"><span class="modal-label">cor</span><input type="color" id="mCC" value="${c?.cor||'#3b82f6'}" style="width:36px;height:28px;border:none;background:none"></div>
    `,`<button class="modal-btn modal-btn--cancel" onclick="closeModal()">cancelar</button><button class="modal-btn modal-btn--primary" onclick="saveCard(${eid||0})">salvar</button>`);
}
function saveCard(eid){
    const n=document.getElementById('mCN').value.trim(),b=document.getElementById('mCB').value.trim(),l=parseFloat(document.getElementById('mCL').value)||0,f=parseInt(document.getElementById('mCF').value)||5,v=parseInt(document.getElementById('mCV').value)||10,co=document.getElementById('mCC').value;
    if(!n){alert('Nome obrigatório.');return;}
    if(eid){const c=cartoes.find(x=>x.id===eid);if(c)Object.assign(c,{name:n,bandeira:b,limite:l,fechamento:f,vencimento:v,cor:co});}
    else cartoes.push({id:nid(cartoes),name:n,bandeira:b,limite:l,fechamento:f,vencimento:v,cor:co});
    saveAll();closeModal();renderCartoes();
}
function editCard(id){openCardModal(id);}
function deleteCard(id){if(!confirm('Apagar cartão e lançamentos?'))return;cartoes=cartoes.filter(c=>c.id!==id);lancCartao=lancCartao.filter(l=>l.cardId!==id);selCardId=null;saveAll();renderCartoes();document.getElementById('cartoesDetail').innerHTML='<div class="empty-state">selecione um cartão</div>';}

function openCardLancModal(eid){
    const l=eid?lancCartao.find(x=>x.id===eid):null;
    openModal(l?'Editar Lançamento':'Novo Lançamento',`
        <span class="modal-label">descrição</span><input type="text" id="mLD" class="f-input" value="${l?.desc||''}">
        <span class="modal-label">valor total</span><input type="number" id="mLV" class="f-input" min="0" step="0.01" value="${l?.valor||''}">
        <span class="modal-label">data da compra</span><input type="date" id="mLDt" class="f-input" value="${l?.date||todayStr()}">
        <span class="modal-label">parcelas</span><input type="number" id="mLP" class="f-input" min="1" max="48" value="${l?.parcelas||1}">
        <span class="modal-label">tags (separar por vírgula)</span><input type="text" id="mLT" class="f-input" value="${(l?.tags||[]).join(', ')}">
        <span class="modal-label">pessoa (se emprestou)</span><input type="text" id="mLPs" class="f-input" value="${l?.pessoa||''}">
        <span class="modal-label">categoria</span><select id="mLCa" class="f-select">${CAT_DESP.map(c=>`<option value="${c}"${l?.cat===c?' selected':''}>${c}</option>`).join('')}</select>
    `,`<button class="modal-btn modal-btn--cancel" onclick="closeModal()">cancelar</button><button class="modal-btn modal-btn--primary" onclick="saveCardLanc(${eid||0})">salvar</button>`);
}
function saveCardLanc(eid){
    const d=document.getElementById('mLD').value.trim(),v=parseFloat(document.getElementById('mLV').value),dt=document.getElementById('mLDt').value,p=parseInt(document.getElementById('mLP').value)||1,ts=document.getElementById('mLT').value.trim(),tags=ts?ts.split(',').map(t=>t.trim()).filter(Boolean):[],ps=document.getElementById('mLPs').value.trim(),ca=document.getElementById('mLCa').value;
    if(!d||!v||!dt){alert('Preencha descrição, valor e data.');return;}
    if(eid){const l=lancCartao.find(x=>x.id===eid);if(l)Object.assign(l,{desc:d,valor:v,date:dt,parcelas:p,tags,pessoa:ps,cat:ca});}
    else lancCartao.push({id:nid(lancCartao),cardId:selCardId,desc:d,valor:v,date:dt,parcelas:p,tags,pessoa:ps,cat:ca});
    saveAll();closeModal();renderCardDetail();renderCartoesList();
}
function editCardLanc(id){openCardLancModal(id);}
function delCardLanc(id){lancCartao=lancCartao.filter(l=>l.id!==id);saveAll();renderCardDetail();renderCartoesList();}

function openCardRecModal(){
    openModal('Lançamento Recorrente',`
        <p style="font-size:0.75rem;color:rgba(255,255,255,0.45)">Cria lançamentos mensais para 12 meses.</p>
        <span class="modal-label">descrição</span><input type="text" id="mRD" class="f-input" placeholder="ex: Netflix">
        <span class="modal-label">valor mensal</span><input type="number" id="mRV" class="f-input" min="0" step="0.01">
        <span class="modal-label">dia da cobrança</span><input type="number" id="mRDi" class="f-input" min="1" max="31" value="1">
        <span class="modal-label">tags</span><input type="text" id="mRT" class="f-input" value="assinatura">
    `,`<button class="modal-btn modal-btn--cancel" onclick="closeModal()">cancelar</button><button class="modal-btn modal-btn--primary" onclick="saveCardRec()">salvar</button>`);
}
function saveCardRec(){
    const d=document.getElementById('mRD').value.trim(),v=parseFloat(document.getElementById('mRV').value),di=parseInt(document.getElementById('mRDi').value)||1,ts=document.getElementById('mRT').value.trim(),tags=ts?ts.split(',').map(t=>t.trim()).filter(Boolean):[];
    if(!d||!v){alert('Preencha descrição e valor.');return;}
    for(let i=0;i<12;i++){const dt=new Date(finYear,finMonth+i,di);lancCartao.push({id:nid(lancCartao),cardId:selCardId,desc:d,valor:v,date:dt.toISOString().split('T')[0],parcelas:1,tags,pessoa:'',cat:'Assinaturas'});}
    saveAll();closeModal();renderCardDetail();renderCartoesList();
}

function openContaModal(eid){
    const c=eid?contas.find(x=>x.id===eid):null;
    openModal(c?'Editar Conta':'Nova Conta',`
        <span class="modal-label">nome</span><input type="text" id="mCtN" class="f-input" value="${c?.name||''}">
        <span class="modal-label">saldo atual</span><input type="number" id="mCtS" class="f-input" step="0.01" value="${c?.saldo||0}">
    `,`<button class="modal-btn modal-btn--cancel" onclick="closeModal()">cancelar</button>${c?`<button class="modal-btn modal-btn--cancel" onclick="delConta(${c.id})" style="color:#ef4444">apagar</button>`:''}<button class="modal-btn modal-btn--primary" onclick="saveConta(${eid||0})">salvar</button>`);
}
function saveConta(eid){const n=document.getElementById('mCtN').value.trim(),s=parseFloat(document.getElementById('mCtS').value)||0;if(!n){alert('Nome obrigatório.');return;}if(eid){const c=contas.find(x=>x.id===eid);if(c)Object.assign(c,{name:n,saldo:s});}else contas.push({id:nid(contas),name:n,saldo:s});saveAll();closeModal();renderFluxo();}
function editConta(id){openContaModal(id);}
function delConta(id){if(!confirm('Apagar conta?'))return;contas=contas.filter(c=>c.id!==id);saveAll();closeModal();renderFluxo();}

function openTransferModal(){
    const opts=contas.map(c=>`<option value="${c.id}">${c.name} (${fmt(c.saldo)})</option>`).join('');
    openModal('Transferência entre Contas',`
        <span class="modal-label">de</span><select id="mTrDe" class="f-select">${opts}</select>
        <span class="modal-label">para</span><select id="mTrPa" class="f-select">${opts}</select>
        <span class="modal-label">valor</span><input type="number" id="mTrV" class="f-input" min="0" step="0.01">
    `,`<button class="modal-btn modal-btn--cancel" onclick="closeModal()">cancelar</button><button class="modal-btn modal-btn--primary" onclick="saveTransfer()">transferir</button>`);
}
function saveTransfer(){
    const de=parseInt(document.getElementById('mTrDe').value),pa=parseInt(document.getElementById('mTrPa').value),v=parseFloat(document.getElementById('mTrV').value);
    if(de===pa){alert('Selecione contas diferentes.');return;}if(!v||v<=0){alert('Valor inválido.');return;}
    const cd=contas.find(c=>c.id===de),cp=contas.find(c=>c.id===pa);if(cd)cd.saldo-=v;if(cp)cp.saldo+=v;
    saveAll();closeModal();renderFluxo();
}

function openMetaGastoModal(){
    openModal('Nova Meta de Gasto',`
        <span class="modal-label">categoria</span><select id="mMGC" class="f-select">${CAT_DESP.map(c=>`<option value="${c}">${c}</option>`).join('')}</select>
        <span class="modal-label">limite mensal (R$)</span><input type="number" id="mMGL" class="f-input" min="0" step="10">
    `,`<button class="modal-btn modal-btn--cancel" onclick="closeModal()">cancelar</button><button class="modal-btn modal-btn--primary" onclick="saveMG()">salvar</button>`);
}
function saveMG(){const c=document.getElementById('mMGC').value,l=parseFloat(document.getElementById('mMGL').value);if(!c||!l){alert('Preencha.');return;}metasGasto.push({id:nid(metasGasto),cat:c,limite:l});saveAll();closeModal();renderMetasGasto();}

function openMetaReceitaModal(){
    openModal('Meta de Receita Mensal',`
        <span class="modal-label">quanto quer ganhar por mês (R$)</span><input type="number" id="mMRL" class="f-input" min="0" step="100" value="${metaReceita.limite||''}">
    `,`<button class="modal-btn modal-btn--cancel" onclick="closeModal()">cancelar</button><button class="modal-btn modal-btn--primary" onclick="saveMR()">salvar</button>`);
}
function saveMR(){metaReceita.limite=parseFloat(document.getElementById('mMRL').value)||0;saveAll();closeModal();renderMetaReceita();}

function openAtivoModal(){
    openModal('Novo Aporte',`
        <span class="modal-label">nome do ativo</span><input type="text" id="mAN" class="f-input" placeholder="ex: PETR4, CDB 120%">
        <span class="modal-label">classe</span><select id="mAC" class="f-select"><option>Renda Fixa</option><option>Ações</option><option>FIIs</option><option>Cripto</option><option>Outro</option></select>
        <div style="display:flex;gap:8px"><div style="flex:1"><span class="modal-label">quantidade</span><input type="number" id="mAQ" class="f-input" min="0" step="1"></div><div style="flex:1"><span class="modal-label">preço unitário</span><input type="number" id="mAP" class="f-input" min="0" step="0.01"></div></div>
        <span class="modal-label">data</span><input type="date" id="mAD" class="f-input" value="${todayStr()}">
    `,`<button class="modal-btn modal-btn--cancel" onclick="closeModal()">cancelar</button><button class="modal-btn modal-btn--primary" onclick="saveAtivo()">salvar</button>`);
}
function saveAtivo(){
    const n=document.getElementById('mAN').value.trim(),cl=document.getElementById('mAC').value,q=parseFloat(document.getElementById('mAQ').value)||0,p=parseFloat(document.getElementById('mAP').value)||0;
    if(!n||!q||!p){alert('Preencha.');return;}
    const ex=ativos.find(a=>a.name.toLowerCase()===n.toLowerCase());
    if(ex){const tq=ex.qty+q;ex.avgCost=(ex.qty*ex.avgCost+q*p)/tq;ex.qty=tq;ex.price=p;}
    else ativos.push({id:nid(ativos),name:n,classe:cl,qty:q,price:p,avgCost:p,date:document.getElementById('mAD').value});
    saveAll();closeModal();renderInvest();
}

function openDividendoModal(){
    openModal('Registrar Dividendo',`
        <span class="modal-label">ativo</span><select id="mDA" class="f-select"><option value="">—</option>${ativos.map(a=>`<option value="${a.name}">${a.name}</option>`).join('')}</select>
        <span class="modal-label">valor</span><input type="number" id="mDV" class="f-input" min="0" step="0.01">
        <span class="modal-label">data</span><input type="date" id="mDD" class="f-input" value="${todayStr()}">
    `,`<button class="modal-btn modal-btn--cancel" onclick="closeModal()">cancelar</button><button class="modal-btn modal-btn--primary" onclick="saveDiv()">salvar</button>`);
}
function saveDiv(){const a=document.getElementById('mDA').value,v=parseFloat(document.getElementById('mDV').value),d=document.getElementById('mDD').value;if(!a||!v||!d){alert('Preencha.');return;}dividendos.push({id:nid(dividendos),ativo:a,valor:v,date:d});saveAll();closeModal();renderInvest();}

function openMetaAllocModal(){
    const f=Object.entries(metaAlloc).map(([cl,p])=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="width:90px;font-size:0.8rem;color:rgba(255,255,255,0.65)">${cl}</span><input type="number" class="f-input mAI" data-cl="${cl}" value="${p}" min="0" max="100" style="flex:1"><span style="font-size:0.7rem;color:rgba(255,255,255,0.3)">%</span></div>`).join('');
    openModal('Meta de Alocação',f,`<button class="modal-btn modal-btn--cancel" onclick="closeModal()">cancelar</button><button class="modal-btn modal-btn--primary" onclick="saveMA()">salvar</button>`);
}
function saveMA(){document.querySelectorAll('.mAI').forEach(i=>{metaAlloc[i.dataset.cl]=parseInt(i.value)||0;});saveAll();closeModal();renderInvest();}

function openMetaFinModal(eid){
    const m=eid?metasFin.find(x=>x.id===eid):null;
    openModal(m?'Editar Meta':'Nova Meta',`
        <span class="modal-label">nome</span><input type="text" id="mMN" class="f-input" value="${m?.name||''}">
        <span class="modal-label">emoji</span><input type="text" id="mME" class="f-input" value="${m?.emoji||'🎯'}" style="width:70px">
        <span class="modal-label">valor alvo (R$)</span><input type="number" id="mMA" class="f-input" min="0" step="100" value="${m?.alvo||''}">
        <span class="modal-label">valor atual (R$)</span><input type="number" id="mMAt" class="f-input" min="0" step="0.01" value="${m?.atual||0}">
        <span class="modal-label">prazo</span><input type="date" id="mMP" class="f-input" value="${m?.prazo||''}">
    `,`<button class="modal-btn modal-btn--cancel" onclick="closeModal()">cancelar</button><button class="modal-btn modal-btn--primary" onclick="saveMF(${eid||0})">salvar</button>`);
}
function saveMF(eid){
    const n=document.getElementById('mMN').value.trim(),e=document.getElementById('mME').value.trim()||'🎯',a=parseFloat(document.getElementById('mMA').value)||0,at=parseFloat(document.getElementById('mMAt').value)||0,p=document.getElementById('mMP').value;
    if(!n||!a){alert('Nome e valor alvo.');return;}
    if(eid){const m=metasFin.find(x=>x.id===eid);if(m)Object.assign(m,{name:n,emoji:e,alvo:a,atual:at,prazo:p});}
    else metasFin.push({id:nid(metasFin),name:n,emoji:e,alvo:a,atual:at,prazo:p});
    saveAll();closeModal();renderMetas();
}
function editMetaFin(id){openMetaFinModal(id);}

function exportFinancas(){
    const data={cartoes,lancCartao,contas,fluxoEntries,metasGasto,metaReceita,ativos,dividendos,metaAlloc,metasFin};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`financas_${todayStr()}.json`;a.click();
}

// Função para converter arquivo para Base64
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
});

async function processarExtratoComIA() {
    const fileInput = document.getElementById('aiExtratoFile');
    const status = document.getElementById('aiStatus');
    
    if (!fileInput.files[0]) return alert("Selecione um PDF primeiro.");

    status.textContent = "Processando arquivo... aguarde.";
    status.style.color = "#60a5fa";
    
    try {
        const base64File = await toBase64(fileInput.files[0]);
        
        const response = await fetch('/api/analisar-extrato', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                pdfBase64: base64File,
                categorias: [...CAT_DESP, ...CAT_REC].join(', ')
            })
        });

        const data = await response.json();

        if (data.error) {
            const msg = typeof data.error === 'string' ? data.error : (data.error.message || "");
            if (msg.toLowerCase().includes("quota")) throw new Error("Limite de cota atingido. Aguarde 60s.");
            throw new Error(msg || "Erro desconhecido na API.");
        }

        if (!data.candidates || !data.candidates[0]) throw new Error("A IA não retornou dados.");

        let textoRaw = data.candidates[0].content.parts[0].text;
        
        const jsonMatch = textoRaw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Formato inválido retornado pela IA.");
        
        const resultado = JSON.parse(jsonMatch[0]);

        if (resultado.lancamentos && Array.isArray(resultado.lancamentos)) {
            
            // LIMPEZA: Remove os itens invisíveis do teste anterior para não duplicar
            fluxoEntries = fluxoEntries.filter(e => !e.tags || !e.tags.includes('importado-ia') || e.date.includes('-'));

            resultado.lancamentos.forEach(l => {
                // Conversor automático de data (DD/MM/YYYY para YYYY-MM-DD)
                let dataFormatada = l.date || todayStr();
                if (dataFormatada.includes('/')) {
                    const partes = dataFormatada.split('/');
                    if (partes.length === 3 && partes[2].length === 4) {
                        dataFormatada = `${partes[2]}-${partes[1]}-${partes[0]}`;
                    }
                }

                fluxoEntries.push({
                    id: nid(fluxoEntries),
                    type: l.type || 'despesa',
                    desc: (l.desc || 'Transação') + " (IA ✨)",
                    valor: Math.abs(parseFloat(l.valor)) || 0,
                    date: dataFormatada,
                    cat: l.cat || 'Outros',
                    contaId: contas[0]?.id || 1,
                    tags: ['importado-ia'],
                    recorrencia: ''
                });
            });

            saveAll();
            renderCurrentView(); 
            status.textContent = "Sucesso! " + resultado.lancamentos.length + " itens visíveis.";
            status.style.color = "#22c55e";
            fileInput.value = ""; 
        }

    } catch (error) {
        console.error("Erro:", error);
        status.textContent = error.message;
        status.style.color = "#ef4444";
    }
}
// ─── INIT ────────────────────────────────────────────────────────────────────
setFinView('dash');
