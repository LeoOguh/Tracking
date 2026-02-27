
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
let diaryEntries = JSON.parse(localStorage.getItem('clarity_diary'))  || [];
// diaryEntries = [{ id, title, content, tag, createdAt, updatedAt }]

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
    const data = { diaryEntries, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data,null,2)], { type:'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href=url; a.download=`clarity-notas-${todayKey()}.json`; a.click();
    URL.revokeObjectURL(url);
}

function importNotas() {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const data = JSON.parse(ev.target.result);
                if (!confirm('Isso substituirá TODOS os dados de notas atuais. Continuar?')) return;
                if (data.diaryEntries) { diaryEntries = data.diaryEntries; saveDiary(); }
                alert('Dados importados com sucesso!');
                location.reload();
            } catch (err) { alert('Erro ao ler o arquivo: ' + err.message); }
        };
        reader.readAsText(file);
    };
    input.click();
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
    const el = document.getElementById('notasSub');
    if (el) el.textContent = `${totalEntries} entrada${totalEntries!==1?'s':''} no diário`;
}

// ─── ENTER NO INPUT ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
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
renderDiary();
