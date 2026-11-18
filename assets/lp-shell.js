/* lp-shell: gemeinsame Kopfzeile aller Lernplattformen.
   - Kapitel oben (bei Gruppen zwei Reihen: Gruppen, darunter die Kapitel der Gruppe)
   - Fortschritt zum Ein- und Ausblenden (Druckschichten wie die 3D-Druck-Plattform, je Kapitel erledigt/gesamt)
   - Hell/Dunkel für alle Plattformen gemeinsam (localStorage 'lp-theme', setzt data-theme auf <html>)
   Jede Plattform meldet sich mit einem Adapter an: LPShell.init({chapters, current, go, mountBar, mountTools, bodyClass}).
   chapters() liefert [{id, label, group, done, total}] (total 0 = ohne Aufgaben, z. B. Start oder Abgabe). */
(function () {
  'use strict';
  var TK = 'lp-theme', PK = 'lp-shell-prog';
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function el(t, a, kids) { var e = document.createElement(t); if (a) for (var n in a) { if (a[n] == null || a[n] === false) continue; if (n === 'class') e.className = a[n]; else if (n === 'html') e.innerHTML = a[n]; else if (n.slice(0, 2) === 'on') e.addEventListener(n.slice(2), a[n]); else e.setAttribute(n, a[n] === true ? '' : a[n]); } (kids || []).forEach(function (k) { if (k != null) e.append(k.nodeType ? k : document.createTextNode(k)); }); return e; }
  function isDark() { var t = document.documentElement.getAttribute('data-theme'); if (t) return t === 'dark'; return !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches); }
  function setTheme(t) { document.documentElement.setAttribute('data-theme', t); ls(TK, t); }
  var SUN = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';
  var A = null, bar, rowG, rowC, panel, btnP, btnT, selGroup = null, timer = 0, lastSig = '';

  function stats() {
    var ch = A.chapters() || [], cur = A.current(), done = 0, total = 0;
    ch.forEach(function (c) { done += c.done || 0; total += c.total || 0; });
    return { ch: ch, cur: cur, done: done, total: total, pct: total ? Math.round(100 * done / total) : 0 };
  }
  function stIcon(c) {
    if (!c.total) return null;
    if (c.done >= c.total) return el('span', { class: 'lps-st lps-done', 'aria-hidden': 'true' });
    if (c.done > 0) { var s = el('span', { class: 'lps-st lps-part', 'aria-hidden': 'true' }); s.style.setProperty('--p', Math.round(100 * c.done / c.total) + '%'); return s; }
    return el('span', { class: 'lps-st', 'aria-hidden': 'true' });
  }
  function aria(c) { return c.label + (c.total ? ': ' + c.done + ' von ' + c.total + ' erledigt' : ''); }
  function groupsOf(ch) { var g = []; ch.forEach(function (c) { if (c.group && g.indexOf(c.group) < 0) g.push(c.group); }); return g; }

  function render(force) {
    var S = stats(), sig = JSON.stringify([S.cur, selGroup, S.ch.map(function (c) { return [c.id, c.done, c.total]; }), panel && !panel.hidden]);
    if (!force && sig === lastSig) return; lastSig = sig;
    var groups = groupsOf(S.ch), curC = S.ch.filter(function (c) { return c.id === S.cur; })[0];
    if (groups.length > 1) {
      if (!selGroup || groups.indexOf(selGroup) < 0) selGroup = (curC && curC.group) || groups[0];
      rowG.hidden = false;
      rowG.replaceChildren.apply(rowG, groups.map(function (g) {
        var cs = S.ch.filter(function (c) { return c.group === g; }), d = 0, t = 0; cs.forEach(function (c) { d += c.done || 0; t += c.total || 0; });
        return el('button', { class: 'lps-pill', type: 'button', 'aria-current': g === selGroup ? 'true' : null, 'aria-label': g + (t ? ': ' + d + ' von ' + t + ' erledigt' : ''), onclick: function () { selGroup = g; render(true); } }, [g, t ? el('span', { class: 'lps-c' }, [d + '/' + t]) : null]);
      }));
    } else rowG.hidden = true;
    var shown = groups.length > 1 ? S.ch.filter(function (c) { return !c.group || c.group === selGroup || c.always; }) : S.ch;
    if (groups.length > 1) shown = S.ch.filter(function (c) { return c.group === selGroup; });
    rowC.replaceChildren.apply(rowC, shown.map(function (c) {
      return el('button', { class: 'lps-pill', type: 'button', 'aria-current': c.id === S.cur ? 'page' : null, 'aria-label': aria(c), onclick: function () { A.go(c.id); setTimeout(function () { render(true); }, 60); } }, [stIcon(c), c.label]);
    }));
    var cp = rowC.querySelector('[aria-current]'); if (cp) { var r = rowC.getBoundingClientRect(), b = cp.getBoundingClientRect(); if (b.left < r.left || b.right > r.right) rowC.scrollLeft += b.left - r.left - (r.width - b.width) / 2; }
    // Fortschritts-Knopf
    var on = Math.round(S.pct / 100 * 5);
    btnP.innerHTML = '<span class="lps-mini" aria-hidden="true">' + [0, 1, 2, 3, 4].map(function (i) { return '<i' + (i < on ? ' class="on"' : '') + '></i>'; }).join('') + '</span><span>' + S.pct + ' %</span><span class="lps-lbl">Fortschritt</span>';
    btnP.setAttribute('aria-label', 'Fortschritt ' + S.pct + ' Prozent, ' + S.done + ' von ' + S.total + ' Aufgaben. ' + (panel.hidden ? 'Einblenden' : 'Ausblenden'));
    btnT.innerHTML = (isDark() ? SUN : MOON) + '<span class="lps-lbl">' + (isDark() ? 'Hell' : 'Dunkel') + '</span>';
    btnT.setAttribute('aria-label', isDark() ? 'Helle Ansicht' : 'Dunkle Ansicht');
    if (!panel.hidden) renderPanel(S);
  }
  function renderPanel(S) {
    var n = 20, on = Math.round(S.pct / 100 * n), layers = el('div', { class: 'lps-layers', 'aria-hidden': 'true' });
    for (var i = 0; i < n; i++) layers.append(el('i', { class: i < on ? (i === on - 1 ? 'on top' : 'on') : null }));
    var list = el('div', { class: 'lps-list' }), lastG = null;
    S.ch.forEach(function (c) {
      if (c.group && c.group !== lastG && groupsOf(S.ch).length > 1) { list.append(el('div', { class: 'lps-lg' }, [c.group])); lastG = c.group; }
      var b = el('span', { class: 'lps-b' }, [el('i', { style: 'width:' + (c.total ? Math.round(100 * c.done / c.total) : 0) + '%' })]);
      list.append(el('button', { class: 'lps-li' + (c.total && c.done >= c.total ? ' lps-done' : ''), type: 'button', 'aria-current': c.id === S.cur ? 'page' : null, onclick: function () { A.go(c.id); if (c.group) selGroup = c.group; setTimeout(function () { render(true); }, 60); } },
        [el('span', null, [c.label]), el('span', { class: 'lps-n' }, [c.total ? c.done + '/' + c.total : '–']), c.total ? b : null]));
    });
    list.append(el('p', { class: 'lps-note' }, ['Dein Fortschritt bleibt nur in diesem Browser gespeichert. Sichern kannst du ihn mit der Ergebnis-Datei.']));
    panel.firstChild.replaceChildren(el('div', { class: 'lps-sum' }, [layers, el('div', null, [el('div', { class: 'lps-pct' }, [S.pct + ' %']), el('small', null, [S.done + ' von ' + S.total + ' Aufgaben'])])]), list);
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(function () { render(false); }, 250); }

  window.LPShell = {
    init: function (adapter) {
      if (A) return; A = adapter;
      if (A.bodyClass) document.body.classList.add(A.bodyClass);
      document.body.classList.add('lps-on');
      rowG = el('div', { class: 'lps-row lps-grp', role: 'group', 'aria-label': 'Kapitelgruppen' });
      rowC = el('div', { class: 'lps-row', role: 'group', 'aria-label': 'Kapitel' });
      panel = el('div', { class: 'lps-panel', id: 'lps-panel', hidden: ls(PK) !== '1' }, [el('div', { class: 'lps-pin' })]);
      bar = el('nav', { class: 'lps', 'aria-label': 'Kapitel und Fortschritt' }, [el('div', { class: 'lps-in' }, [rowG, rowC]), panel]);
      btnP = el('button', { class: 'lps-btn', type: 'button', 'aria-controls': 'lps-panel', 'aria-expanded': panel.hidden ? 'false' : 'true',
        onclick: function () { panel.hidden = !panel.hidden; btnP.setAttribute('aria-expanded', panel.hidden ? 'false' : 'true'); ls(PK, panel.hidden ? '0' : '1'); render(true); } });
      btnT = el('button', { class: 'lps-btn', type: 'button', onclick: function () { setTheme(isDark() ? 'light' : 'dark'); render(true); } });
      var tools = el('div', { class: 'lps-tools' }, [btnP, btnT]);
      (A.mountBar || function (b) { document.body.prepend(b); })(bar);
      (A.mountTools || function (t) { bar.firstChild.prepend(t); })(tools);
      ['hashchange', 'click', 'input', 'change', 'keyup'].forEach(function (ev) { window.addEventListener(ev, schedule, true); });
      if (window.matchMedia) try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { render(true); }); } catch (e) {}
      render(true);
    },
    refresh: function () { if (A) render(true); }
  };
})();
