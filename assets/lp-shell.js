/* lp-shell: gemeinsamer Rahmen aller Lernplattformen (seit 18.11.2026, Pilot Arduino-Lernheft).
   - Kapitel oben im Stil der neueren Plattformen (Bedürfnis-Werkstatt, AI Badge). Bei Gruppen zwei Reihen: Gruppen (wie die Level-Karten
     im AI Badge), darunter die Kapitel der gewählten Gruppe mit Nummer „Gruppe.Kapitel“.
   - Fortschritt links, ein- und ausklappbar (Druckschichten wie die 3D-Druck-Plattform, je Kapitel erledigt/gesamt).
   - Hell/Dunkel für alle Plattformen gemeinsam (localStorage 'lp-theme', data-theme auf <html>).
   Jede Plattform meldet sich mit einem Adapter an:
     LPShell.init({chapters, current, go, mountBar, mountTools, bodyClass})
     chapters() → [{id, label, group, num, done, total}]  (total 0 = ohne Aufgaben, z. B. Start oder Abgabe; num optional)
   LPShell.refresh() zeichnet neu (sonst automatisch nach Klicks, Eingaben und Seitenwechseln). */
(function () {
  'use strict';
  var TK = 'lp-theme', OK_KEY = 'lp-shell-side';
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function el(t, a, kids) { var e = document.createElement(t); if (a) for (var n in a) { if (a[n] == null || a[n] === false) continue; if (n === 'class') e.className = a[n]; else if (n === 'html') e.innerHTML = a[n]; else if (n.slice(0, 2) === 'on') e.addEventListener(n.slice(2), a[n]); else e.setAttribute(n, a[n] === true ? '' : a[n]); } (kids || []).forEach(function (k) { if (k != null) e.append(k.nodeType ? k : document.createTextNode(k)); }); return e; }
  function isDark() { var t = document.documentElement.getAttribute('data-theme'); if (t) return t === 'dark'; return !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches); }
  var SUN = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';
  var OK = '<svg class="lps-ok" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4 10-10"/></svg>';
  var A = null, rowG, rowC, side, tab, back, sumBox, listBox, themeBtns = [], selGroup = null, timer = 0, lastSig = '';

  function stats() {
    var ch = A.chapters() || [], cur = A.current(), done = 0, total = 0;
    ch.forEach(function (c) { done += c.done || 0; total += c.total || 0; });
    if (!total && ch.length) { var ix = ch.findIndex(function (c) { return c.id === cur; }); return { ch: ch, cur: cur, done: ix + 1, total: ch.length, pct: Math.round(100 * (ix + 1) / ch.length), nav: true }; }
    return { ch: ch, cur: cur, done: done, total: total, pct: total ? Math.round(100 * done / total) : 0 };
  }
  function groupsOf(ch) { var g = []; ch.forEach(function (c) { if (c.group && g.indexOf(c.group) < 0) g.push(c.group); }); return g; }
  function kcls(i) { return 'lps-k' + (i % 5 + 1); }
  function isOpen() { return document.documentElement.classList.contains('lps-open'); }
  function setOpen(on, focus) {
    document.documentElement.classList.toggle('lps-open', on); ls(OK_KEY, on ? '1' : '0');
    side.setAttribute('aria-hidden', on ? 'false' : 'true'); side.inert = !on; tab.setAttribute('aria-expanded', on ? 'true' : 'false');
    if (focus) (on ? side.querySelector('.lps-x') : tab).focus();
  }
  function layers(n, pct, cls) { var on = Math.round(pct / 100 * n), d = el('div', { class: cls, 'aria-hidden': 'true' }); for (var i = 0; i < n; i++) d.append(el('i', { class: i < on ? (i === on - 1 ? 'on top' : 'on') : null })); return d; }

  /* Farbe der Fortschrittsspalte passt sich der Seite an (Wunsch Daniel, 19.11.2026): A.color (CSS-Variable, Farbe oder Funktion),
     sonst die Farbe des sichtbaren Kapitelkopfs (.st-head, .chead), sonst --accent/--primary/--green/--blue; daraus ein dunkler Ton gleicher Farbe. */
  var probe = null;
  function rgbOf(c) { if (!c) return null; if (!probe) { probe = el('i', { 'aria-hidden': 'true' }); probe.style.display = 'none'; document.body.append(probe); } probe.style.color = ''; probe.style.color = c; if (!probe.style.color) return null; var m = getComputedStyle(probe).color.match(/[\d.]+/g); return m ? m.slice(0, 3).map(Number) : null; }
  function satOf(r) { var mx = Math.max.apply(null, r), mn = Math.min.apply(null, r); return mx ? (mx - mn) / mx : 0; }
  function pageColor() {
    var de = document.documentElement, cs = getComputedStyle(de), c = null;
    if (typeof A.color === 'function') c = A.color(); else if (A.color) c = A.color.indexOf('--') === 0 ? cs.getPropertyValue(A.color).trim() : A.color;
    var r = rgbOf(c);
    if (!r) { var cand = Array.prototype.slice.call(document.querySelectorAll('.st-head,.chead')).filter(function (e) { var b = e.getBoundingClientRect(); return e.offsetParent && b.bottom > 0 && b.top < innerHeight; });
      for (var i = 0; i < cand.length && !r; i++) { var x = rgbOf(getComputedStyle(cand[i]).backgroundColor); if (x && satOf(x) > 0.3) r = x; } }
    ['--accent', '--primary', '--green', '--blue'].forEach(function (v) { if (!r) { var x = rgbOf(cs.getPropertyValue(v).trim()); if (x && satOf(x) > 0.3) r = x; } });
    return r;
  }
  function hsl(r) { var R = r[0] / 255, G = r[1] / 255, B = r[2] / 255, mx = Math.max(R, G, B), mn = Math.min(R, G, B), h = 0, s = 0, l = (mx + mn) / 2, d = mx - mn;
    if (d) { s = d / (1 - Math.abs(2 * l - 1)); h = mx === R ? ((G - B) / d) % 6 : mx === G ? (B - R) / d + 2 : (R - G) / d + 4; h = (h * 60 + 360) % 360; } return [h, s, l]; }
  function paint() {
    var r = pageColor(), de = document.documentElement;
    if (!r) { de.style.removeProperty('--lps-panel'); de.style.removeProperty('--lps-layer-on'); return; }
    var x = hsl(r), s = Math.min(x[1], 0.7);
    de.style.setProperty('--lps-panel', 'hsl(' + Math.round(x[0]) + ' ' + Math.round(s * 100) + '% ' + (isDark() ? 13 : 21) + '%)');
    de.style.setProperty('--lps-layer-on', 'hsl(' + Math.round(x[0]) + ' ' + Math.round(Math.max(s, 0.45) * 100) + '% 62%)');
  }

  function render(force) {
    var S = stats(), groups = groupsOf(S.ch), multi = groups.length > 1;
    var sig = JSON.stringify([S.cur, selGroup, S.ch.map(function (c) { return [c.id, c.done, c.total]; }), isDark()]);
    if (!force && sig === lastSig) return; lastSig = sig;
    try { paint(); } catch (e) {}
    var curC = S.ch.filter(function (c) { return c.id === S.cur; })[0];
    if (multi && (!selGroup || groups.indexOf(selGroup) < 0 || force === 'nav')) selGroup = (curC && curC.group) || selGroup || groups[0];
    // Gruppen
    rowG.hidden = !multi;
    if (multi) rowG.replaceChildren.apply(rowG, groups.map(function (g, gi) {
      var cs = S.ch.filter(function (c) { return c.group === g; }), d = 0, t = 0; cs.forEach(function (c) { d += c.done || 0; t += c.total || 0; });
      return el('button', { class: 'lps-g ' + kcls(gi), type: 'button', 'aria-current': g === selGroup ? 'true' : null, 'aria-label': 'Teil ' + gi + ': ' + g + (t ? ', ' + d + ' von ' + t + ' erledigt' : ''), onclick: function () { selGroup = g; render(true); } },
        [/^Teil\b/.test(g) ? null : el('span', { class: 'lps-gk' }, ['Teil ' + gi]), el('span', { class: 'lps-gt' }, [g]), el('span', { class: 'lps-gc' }, [t ? d + ' von ' + t : ' '])]);
    }));
    // Kapitel
    var shown = multi ? S.ch.filter(function (c) { return c.group === selGroup; }) : S.ch, gi = multi ? groups.indexOf(selGroup) : 0;
    rowC.replaceChildren.apply(rowC, shown.map(function (c, i) {
      var num = c.num != null ? c.num : (multi ? gi + '.' + (i + 1) : String(i)), state = null;
      if (c.total && c.done >= c.total) state = el('span', { html: OK });
      else if (c.total && c.done > 0) state = el('span', { class: 'lps-part' }, [c.done + '/' + c.total]);
      return el('button', { class: 'lps-st ' + kcls(multi ? gi : i), type: 'button', 'aria-current': c.id === S.cur ? 'step' : null, 'aria-label': c.label + (c.total ? ', ' + c.done + ' von ' + c.total + ' erledigt' : ''), onclick: function () { A.go(c.id); setTimeout(function () { render('nav'); }, 80); } },
        [el('span', { class: 'lps-n' }, [num]), c.label, state]);
    }));
    var cp = rowC.querySelector('[aria-current]'); if (cp) { var r = rowC.getBoundingClientRect(), b = cp.getBoundingClientRect(); if (b.left < r.left || b.right > r.right) rowC.scrollLeft += b.left - r.left - (r.width - b.width) / 2; }
    // Fortschritt links
    sumBox.replaceChildren(layers(20, S.pct, 'lps-layers'), el('div', null, [el('div', { class: 'lps-pct' }, [S.pct + ' %']), el('small', null, [S.nav ? 'Kapitel ' + S.done + ' von ' + S.total : S.done + ' von ' + S.total + ' ' + (A.unit || 'Aufgaben')])]));
    var lastG = null, items = [];
    S.ch.forEach(function (c) {
      if (multi && c.group !== lastG) { items.push(el('div', { class: 'lps-lg' }, [c.group])); lastG = c.group; }
      items.push(el('button', { class: 'lps-li' + (c.total && c.done >= c.total ? ' lps-done' : ''), type: 'button', 'aria-current': c.id === S.cur ? 'page' : null,
        onclick: function () { A.go(c.id); if (!window.matchMedia('(min-width:1100px)').matches) setOpen(false); setTimeout(function () { render('nav'); }, 80); } },
        [el('span', null, [c.label]), el('span', { class: 'lps-cnt' }, [c.total ? c.done + '/' + c.total : '–']), c.total ? el('span', { class: 'lps-b' }, [el('i', { style: 'width:' + Math.round(100 * c.done / c.total) + '%' })]) : null]));
    });
    listBox.replaceChildren.apply(listBox, items);
    tab.replaceChildren(layers(6, S.pct, 'lps-mini'), el('span', { class: 'lps-vt' }, ['Fortschritt ' + S.pct + ' %']));
    tab.setAttribute('aria-label', 'Fortschritt einblenden: ' + S.pct + ' Prozent, ' + (S.nav ? 'Kapitel ' + S.done + ' von ' + S.total : S.done + ' von ' + S.total + ' ' + (A.unit || 'Aufgaben')));
    themeBtns.forEach(function (b) { b.innerHTML = (isDark() ? SUN : MOON) + '<span class="lps-lbl">' + (isDark() ? 'Hell' : 'Dunkel') + '</span>'; b.setAttribute('aria-label', isDark() ? 'Helle Ansicht' : 'Dunkle Ansicht'); });
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(function () { render(false); }, 250); }
  function themeBtn() { var b = el('button', { class: 'lps-btn', type: 'button', onclick: function () { var t = isDark() ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', t); ls(TK, t); render(true); } }); themeBtns.push(b); return b; }

  window.LPShell = {
    init: function (adapter) {
      if (A) return; A = adapter;
      if (A.bodyClass) A.bodyClass.split(' ').forEach(function (c) { if (c) document.body.classList.add(c); });
      /* Hell/Dunkel: gemeinsamer Wert lp-theme gilt vor dem eigenen Wert der Plattform; hat die Plattform schon einen eigenen gesetzt, wird er übernommen */
      var th = ls(TK), de = document.documentElement;
      if (th === 'light' || th === 'dark') de.setAttribute('data-theme', th); else if (/^(light|dark)$/.test(de.getAttribute('data-theme') || '')) ls(TK, de.getAttribute('data-theme'));
      document.body.classList.add('lps-on');
      rowG = el('div', { class: 'lps-row', role: 'group', 'aria-label': 'Teile' });
      rowC = el('div', { class: 'lps-row', role: 'group', 'aria-label': 'Kapitel' });
      var bar = el('nav', { class: 'lps', 'aria-label': 'Kapitel' }, [el('div', { class: 'lps-in' }, [rowG, rowC])]);
      sumBox = el('div', { class: 'lps-sum' }); listBox = el('div', { class: 'lps-list' });
      side = el('aside', { class: 'lps-side', id: 'lps-side', 'aria-label': 'Dein Fortschritt' }, [
        el('div', { class: 'lps-side-h' }, [el('b', null, ['Dein Fortschritt']), el('button', { class: 'lps-x', type: 'button', 'aria-label': 'Fortschritt ausblenden', onclick: function () { setOpen(false, true); } }, ['«'])]),
        sumBox, listBox,
        el('div', { class: 'lps-side-f' }, [themeBtn(), el('p', null, ['Dein Fortschritt bleibt nur in diesem Browser gespeichert. Sichern kannst du ihn mit der Ergebnis-Datei.'])])]);
      tab = el('button', { class: 'lps-tab', type: 'button', 'aria-controls': 'lps-side', onclick: function () { setOpen(true, true); } });
      back = el('div', { class: 'lps-back', onclick: function () { setOpen(false); } });
      document.body.append(side, tab, back);
      (A.mountBar || function (b) { document.body.prepend(b); })(bar);
      var tools = el('div', { class: 'lps-tools' }, [themeBtn()]);
      (A.mountTools || function (t) { bar.firstChild.prepend(t); })(tools);
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen() && !window.matchMedia('(min-width:1100px)').matches) setOpen(false, true); });
      ['hashchange', 'click', 'input', 'change', 'keyup'].forEach(function (ev) { window.addEventListener(ev, schedule, true); });
      window.addEventListener('hashchange', function () { setTimeout(function () { render('nav'); }, 50); });
      if (window.matchMedia) try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { render(true); }); } catch (e) {}
      var saved = ls(OK_KEY); setOpen(saved === null ? window.matchMedia('(min-width:1100px)').matches : saved === '1');
      render('nav');
    },
    refresh: function () { if (A) render(true); }
  };
})();
