(function () {
  // @ts-ignore - acquireVsCodeApi is injected by VS Code in webviews
  const vscode = acquireVsCodeApi();
  const root = document.getElementById('root');

  const saved = vscode.getState() || {};
  const ui = {
    payload: saved.payload,
    selectedIndex: typeof saved.selectedIndex === 'number' ? saved.selectedIndex : 0,
    splitPct: clampPct(typeof saved.splitPct === 'number' ? saved.splitPct : 55),
  };

  if (ui.payload) render();

  window.addEventListener('message', (e) => {
    const msg = e.data;
    if (msg && msg.type === 'render') {
      ui.payload = msg.payload;
      ui.selectedIndex = 0;
      persist();
      render();
    }
  });

  function render() {
    const payload = ui.payload;
    if (!payload || payload.kind !== 'pr-list') {
      root.innerHTML = '<div class="empty">Unknown widget</div>';
      return;
    }
    const prs = Array.isArray(payload.prs) ? payload.prs : [];
    const selIdx = Math.max(0, Math.min(prs.length - 1, ui.selectedIndex));
    ui.selectedIndex = selIdx;

    const rows = prs
      .map((pr, i) => `
        <li class="pr ${i === selIdx ? 'sel' : ''}" data-idx="${i}" data-url="${esc(pr.url)}">
          <div class="pr-head">
            <span class="pr-num">#${pr.number}</span>
            ${pr.draft ? '<span class="pr-tag draft">draft</span>' : ''}
            <span class="pr-title">${esc(pr.title)}</span>
          </div>
          <div class="pr-meta">
            <span class="pr-author">${esc(pr.author)}</span>
            <span class="pr-sep">·</span>
            <span class="pr-updated" title="${esc(pr.updatedAt)}">${relTime(pr.updatedAt)}</span>
          </div>
        </li>`,
      )
      .join('');

    root.innerHTML = `
      <header class="hdr">
        <div class="hdr-title">${esc(payload.repo)}</div>
        <div class="hdr-sub">${prs.length} ${esc(payload.state)} pull request${prs.length === 1 ? '' : 's'}</div>
      </header>
      <div class="split" style="--split-left: ${ui.splitPct}%">
        <aside class="pane pane-left">
          <ul class="pr-list">${rows || '<li class="empty">No pull requests.</li>'}</ul>
        </aside>
        <div class="splitter" role="separator" aria-orientation="vertical" tabindex="0" title="Drag to resize"></div>
        <section class="pane pane-right">${detailHtml(prs[selIdx])}</section>
      </div>
    `;

    root.querySelectorAll('li.pr').forEach((el) => {
      el.addEventListener('click', () => {
        const idx = Number(el.getAttribute('data-idx'));
        if (!Number.isNaN(idx)) {
          ui.selectedIndex = idx;
          persist();
          render();
        }
      });
      el.addEventListener('dblclick', () => {
        const url = el.getAttribute('data-url');
        if (url) vscode.postMessage({ type: 'openUrl', url });
      });
    });

    const openBtn = root.querySelector('button[data-action="open"]');
    if (openBtn) {
      openBtn.addEventListener('click', () => {
        const url = openBtn.getAttribute('data-url');
        if (url) vscode.postMessage({ type: 'openUrl', url });
      });
    }

    wireSplitter();
  }

  function detailHtml(pr) {
    if (!pr) return '<div class="empty">No PR selected.</div>';
    return `
      <div class="detail">
        <div class="detail-head">
          <div class="detail-num">#${pr.number}${pr.draft ? ' <span class="pr-tag draft">draft</span>' : ''}</div>
          <h2 class="detail-title">${esc(pr.title)}</h2>
          <div class="detail-meta">
            opened by <strong>${esc(pr.author)}</strong>
            · updated ${relTime(pr.updatedAt)}
          </div>
        </div>
        <div class="detail-actions">
          <button data-action="open" data-url="${esc(pr.url)}">Open on GitHub ↗</button>
        </div>
        <div class="detail-url"><code>${esc(pr.url)}</code></div>
      </div>`;
  }

  function wireSplitter() {
    const splitter = root.querySelector('.splitter');
    const container = root.querySelector('.split');
    if (!splitter || !container) return;

    let dragging = false;
    const move = (clientX) => {
      const rect = container.getBoundingClientRect();
      ui.splitPct = clampPct(((clientX - rect.left) / rect.width) * 100);
      container.style.setProperty('--split-left', ui.splitPct + '%');
    };

    splitter.addEventListener('mousedown', (e) => {
      dragging = true;
      document.body.classList.add('dragging');
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
      if (dragging) move(e.clientX);
    });
    window.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      document.body.classList.remove('dragging');
      persist();
    });

    splitter.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      ui.splitPct = clampPct(ui.splitPct + (e.key === 'ArrowLeft' ? -2 : 2));
      container.style.setProperty('--split-left', ui.splitPct + '%');
      persist();
      e.preventDefault();
    });
  }

  function clampPct(p) {
    return Math.max(20, Math.min(80, p));
  }

  function persist() {
    vscode.setState({
      payload: ui.payload,
      selectedIndex: ui.selectedIndex,
      splitPct: ui.splitPct,
    });
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[c]);
  }

  function relTime(iso) {
    const raw = String(iso ?? '');
    const t = Date.parse(raw);
    if (!isFinite(t)) return esc(raw);
    const s = Math.round((Date.now() - t) / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.round(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.round(h / 24);
    if (d < 30) return `${d}d ago`;
    const mo = Math.round(d / 30);
    if (mo < 12) return `${mo}mo ago`;
    return `${Math.round(mo / 12)}y ago`;
  }
})();
