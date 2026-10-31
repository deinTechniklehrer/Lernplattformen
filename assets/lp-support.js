/* Lernplattformen – gemeinsames Hilfsmodul (deinTechniklehrer, CC BY-NC-SA 4.0)
   Lernenergie-Balken, Hinweis und Hilfe nach drei Fehlversuchen, Zusammenfassung für die Abgabe,
   Arbeitsstand in PDF/HTML speichern und daraus wieder laden. */
(function () {
  'use strict';
  var C = window.LP_CFG || {};
  var SLUG = C.slug || location.pathname;
  var EK = 'lp-energy:' + SLUG;
  var E;
  try { E = JSON.parse(localStorage.getItem(EK) || '{}') || {}; } catch (e) { E = {}; }
  E.t = E.t || {};
  var SNAP = {};
  var lastCheck = 0;
  function saveE() { try { localStorage.setItem(EK, JSON.stringify(E)); } catch (e) { } }

  /* ---------- Hilfen ---------- */
  function mk(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function txt(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function b64u(str) { var b = new TextEncoder().encode(str), s = ''; for (var i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64u(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; var bin = atob(s), b = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i); return new TextDecoder().decode(b); }

  /* Klicks auf „Prüfen“ merken, damit nur echte Prüfungen zählen */
  document.addEventListener('click', function (ev) {
    var b = ev.target && ev.target.closest && ev.target.closest('button');
    if (b && /pr(ü|ue)f/i.test(b.textContent || '')) lastCheck = Date.now();
  }, true);

  function snap(c) {
    if (!c) return '';
    var v = [].map.call(c.querySelectorAll('input,select,textarea'), function (i) { return (i.type === 'checkbox' || i.type === 'radio') ? (i.checked ? '1' : '0') : i.value; }).join('|');
    var st = [].map.call(c.querySelectorAll('[aria-pressed],[aria-checked],[aria-selected]'), function (n) { return (n.getAttribute('aria-pressed') || '') + (n.getAttribute('aria-checked') || '') + (n.getAttribute('aria-selected') || ''); }).join('');
    var on = [].map.call(c.querySelectorAll('.on,.sel,.selected,.picked,.active,.chosen'), function (n) { return n.textContent.length; }).join(',');
    var cl = c.cloneNode(true);
    [].forEach.call(cl.querySelectorAll('.fb,.lp-hint,.res,.msg,[aria-live],.state,.why'), function (n) { n.remove(); });
    return v + '#' + st + '#' + on + '#' + txt(cl.textContent).slice(0, 6000);
  }

  /* ---------- Lernenergie ---------- */
  function val(r) { if (r.a) return 30; return Math.max(30, 100 - 20 * (r.f || 0)); }
  function energy() { var rs = Object.keys(E.t).map(function (k) { return E.t[k]; }); if (!rs.length) return null; return Math.round(rs.reduce(function (s, r) { return s + val(r); }, 0) / rs.length); }
  function stuck() { return Object.keys(E.t).map(function (k) { return E.t[k]; }).filter(function (r) { return r.f >= 2 || r.a; }).sort(function (a, b) { return (b.f || 0) - (a.f || 0); }); }
  function zone(p) { return p >= 70 ? 'g' : p >= 40 ? 'y' : 'r'; }
  function zoneTxt(p) { return p >= 70 ? 'im grünen Bereich' : p >= 40 ? 'im gelben Bereich' : 'im roten Bereich'; }
  function stuckTxt(r) { return (r.f || 0) + ' Fehlversuch' + (r.f === 1 ? '' : 'e') + (r.a ? ', mit Lösungshilfe' : r.ok ? ', dann gelöst' : ', noch nicht gelöst'); }

  var pill, panel;
  var HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.5 3 4.5 6.8 4.5c2.1 0 3.6 1.2 5.2 3.1 1.6-1.9 3.1-3.1 5.2-3.1 3.8 0 5.9 4 4.4 7.3C19.5 16.4 12 21 12 21z"/></svg>';
  function paint(hit) {
    var p = energy();
    if (p === null) { if (pill) pill.hidden = true; return; }
    if (!pill) {
      pill = mk('button', 'lp-pill'); pill.type = 'button';
      pill.setAttribute('aria-expanded', 'false');
      pill.innerHTML = HEART + '<span class="lp-bar"><i></i></span><b></b>';
      pill.onclick = function () { var o = panel.hidden; panel.hidden = !o; pill.setAttribute('aria-expanded', String(o)); if (o) fillPanel(); };
      panel = mk('div', 'lp-panel'); panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Lernenergie');
      document.body.append(pill, panel);
      if (C.bottom) { pill.style.setProperty('--lp-b', C.bottom + 'px'); panel.style.setProperty('--lp-b', C.bottom + 'px'); }
    }
    pill.hidden = false;
    pill.className = 'lp-pill z-' + zone(p) + (hit ? ' hit' : '');
    pill.querySelector('i').style.width = p + '%';
    pill.querySelector('b').textContent = p + ' %';
    pill.setAttribute('aria-label', 'Lernenergie ' + p + ' Prozent, ' + zoneTxt(p) + '. Tippen für Details.');
    if (hit) setTimeout(function () { pill && pill.classList.remove('hit'); }, 700);
    if (panel && !panel.hidden) fillPanel();
  }
  function fillPanel() {
    var p = energy(), s = stuck();
    panel.innerHTML = '<button class="lp-x" type="button" aria-label="Schließen">×</button><h4>Deine Lernenergie: ' + p + ' %</h4>' +
      '<p>Richtig beim ersten Versuch hält deine Energie voll. Jeder Fehlversuch kostet etwas. Mit guten Antworten bei den nächsten Aufgaben steigt sie wieder.</p>' +
      (s.length ? '<p><b>Hier hat es gehakt:</b></p><ul>' + s.slice(0, 8).map(function (r) { return '<li>' + esc(r.l) + ' <span>(' + stuckTxt(r) + ')</span></li>'; }).join('') + '</ul>' : '<p>Bisher keine Aufgabe mit mehreren Fehlversuchen.</p>') +
      '<p class="lp-small">Der Stand erscheint auch in deiner Abgabe.</p>';
    panel.querySelector('.lp-x').onclick = function () { panel.hidden = true; pill.setAttribute('aria-expanded', 'false'); };
  }

  /* ---------- Hinweis und Hilfe ---------- */
  function findInfo(c) {
    var out = [];
    [].forEach.call(c.querySelectorAll('details.info, .info-box, .infobody'), function (d) { if (out.indexOf(d) < 0) out.push(d); });
    var skip = function (n) { return !n.matches || n.matches('.task, article.task, h2, h3, header, nav, .st-head, .pagehead, .modnav, .pager, .lp-hint, .lp-up, .lp-pill, .lp-panel, .lp-kifrei, script, style') || txt(n.textContent).length < 80; };
    var node = c, levels = 0;
    while (!out.length && node && node !== document.body && levels < 3) {
      var sib = node.previousElementSibling, n = 0;
      while (sib && out.length < 2 && n < 8) { if (!skip(sib)) out.push(sib); sib = sib.previousElementSibling; n++; }
      node = node.parentElement; levels++;
    }
    return out;
  }
  function markInfo(list) {
    var any = 0;
    list.forEach(function (el) {
      if (el.tagName === 'DETAILS') el.open = true;
      var p = el.closest && el.closest('details'); if (p) p.open = true;
      [].forEach.call(el.querySelectorAll('b, strong, mark, dfn, .term, .key, em'), function (b) { if (txt(b.textContent).length > 1) { b.classList.add('lp-mark'); any++; } });
    });
    if (!any) list.forEach(function (el) { el.classList.add('lp-markbox'); });
    if (list[0]) list[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
    return any;
  }
  function clearHint(c, key) { if (!c) return; [].forEach.call(c.querySelectorAll('.lp-hint'), function (n) { if (!key || n.dataset.k === key) n.remove(); }); }
  function showHint(key, c, at0) {
    if (!c || [].some.call(c.querySelectorAll('.lp-hint'), function (n) { return n.dataset.k === key; })) return;
    var box = mk('div', 'lp-hint'); box.dataset.k = key;
    box.setAttribute('role', 'status');
    box.innerHTML = '<p><b>Bitte lies dir die Information noch einmal genau durch</b> und versuche dann, die Aufgabe zu lösen.</p><button class="lp-help" type="button">Hilfe anzeigen</button><p class="lp-helpnote" hidden></p>';
    var foot = c.querySelector('.ex-foot') || null;
    var fbs = c.querySelectorAll('.fb'); var fb = fbs.length ? fbs[fbs.length - 1] : null;
    var at = at0 || foot || fb;
    if (at && at.parentNode) at.parentNode.insertBefore(box, at.nextSibling); else c.appendChild(box);
    var btn = box.querySelector('.lp-help'), note = box.querySelector('.lp-helpnote');
    btn.onclick = function () {
      var list = (C.help && C.help(c)) || findInfo(c);
      if (!list.length) { note.hidden = false; note.textContent = 'Lies den Text über der Aufgabe noch einmal Satz für Satz. Achte auf die fett gedruckten Fachbegriffe.'; return; }
      var any = markInfo(list);
      note.hidden = false;
      note.textContent = any ? 'Die wichtigsten Stellen sind jetzt gelb markiert. Lies sie und versuche es dann noch einmal.' : 'Der wichtige Abschnitt ist jetzt gelb umrandet. Lies ihn und versuche es dann noch einmal.';
      E.t[key] && (E.t[key].h = 1); saveE();
    };
  }

  /* ---------- Ergebnisse melden ---------- */
  function result(key, ok, label, c, at) {
    if (!key) return;
    var r = E.t[key] || (E.t[key] = { f: 0, ok: false, l: label || key });
    if (label) r.l = txt(label);
    if (r.ok) { if (ok) clearHint(c, key); return; }
    if (ok) { r.ok = true; saveE(); clearHint(c, key); paint(false); return; }
    var s = snap(c);
    if (SNAP[key] === s) return;            /* nichts geändert: nicht noch einmal zählen */
    SNAP[key] = s;
    r.f = (r.f || 0) + 1; saveE(); paint(true);
    if (r.f >= 3) showHint(key, c, at);
  }
  function assist(key, label) { var r = E.t[key] || (E.t[key] = { f: 0, ok: false, l: label || key }); if (label) r.l = txt(label); if (!r.ok) { r.a = true; saveE(); paint(false); } }
  function fb(fbEl, cls) {
    if (!fbEl || !fbEl.id || Date.now() - lastCheck > 2500) return;
    var key = fbEl.id.replace(/^fb-/, '');
    if (C.ignore && new RegExp(C.ignore).test(key)) return;
    var c = fbEl.closest('article.task, .task') || fbEl.parentElement;
    var sec = c.closest('section'); var h2 = sec && sec.querySelector('h2');
    var num = c.querySelector('.num'); var h3 = c.querySelector('h3');
    var label = [h2 ? txt(h2.textContent) : '', (num && /\d/.test(num.textContent) ? 'Aufgabe ' + txt(num.textContent) + ': ' : '') + (h3 ? txt(h3.textContent) : '')].filter(Boolean).join(' · ');
    setTimeout(function () { if (cls !== 'ok' && /noch nicht alle|unsortiert|fehlen noch|fehlt noch|erst alle|noch keine|nicht vollständig/i.test(fbEl.textContent || '')) return; result(key, cls === 'ok', label, c, fbEl); }, 0);
  }

  /* ---------- Zusammenfassung für die Abgabe ---------- */
  function textLines() {
    var p = energy(), s = stuck(), L = ['', '== LERNENERGIE =='];
    if (p === null) { L.push('Noch keine Aufgabe geprüft.'); return L; }
    L.push('Lernenergie: ' + p + ' % (' + zoneTxt(p) + ')');
    if (s.length) { L.push('Hier hat es gehakt:'); s.forEach(function (r) { L.push('  - ' + r.l + ' (' + stuckTxt(r) + ')'); }); }
    else L.push('Keine Aufgabe mit mehreren Fehlversuchen.');
    return L;
  }
  function stateCode() {
    var ls = {}; (C.keys || []).concat([EK]).forEach(function (k) { try { var v = localStorage.getItem(k); if (v != null) ls[k] = v; } catch (e) { } });
    return 'LPS0.' + b64u(JSON.stringify({ s: SLUG, d: new Date().toISOString(), ls: ls }));
  }
  function htmlSummary() {
    var p = energy(), s = stuck();
    var h = '<h2>Lernenergie</h2>';
    if (p === null) h += '<p>Noch keine Aufgabe geprüft.</p>';
    else {
      var col = p >= 70 ? '#1f8a4c' : p >= 40 ? '#c98a00' : '#c23b2e';
      h += '<div style="display:flex;align-items:center;gap:12px;margin:8px 0"><div style="flex:0 0 260px;height:16px;border-radius:9px;background:#e4e8ea;overflow:hidden"><div style="height:100%;width:' + p + '%;background:' + col + '"></div></div><b>' + p + ' %</b> <span>(' + zoneTxt(p) + ')</span></div>';
      h += s.length ? '<p><b>Hier hat es gehakt:</b></p><ul>' + s.map(function (r) { return '<li>' + esc(r.l) + ' (' + stuckTxt(r) + ')</li>'; }).join('') + '</ul>' : '<p>Keine Aufgabe mit mehreren Fehlversuchen.</p>';
    }
    if (C.keys && C.keys.length) h += '<script type="application/json" id="lp-state">' + stateCode() + '<\/script><p style="font-size:12px;color:#56676b">In dieser Datei steckt dein Arbeitsstand. Du kannst sie in der Lernplattform wieder hochladen und weiterarbeiten.</p>';
    return h;
  }
  var CP = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
  function clean(t) { return String(t || '').replace(/→/g, '->').replace(/−/g, '-').split('').filter(function (ch) { var c = ch.charCodeAt(0); return c === 10 || (c >= 32 && c <= 126) || (c >= 160 && c <= 255) || CP.indexOf(ch) >= 0; }).join(''); }
  function addSection(d) {
    var k = d.internal.scaleFactor, u = function (mm) { return mm * 72 / 25.4 / k; };
    var W = d.internal.pageSize.getWidth(), M = u(18), y = u(24);
    var p = energy(), s = stuck();
    d.addPage();
    d.setFont('helvetica', 'bold'); d.setFontSize(16); d.setTextColor(3, 85, 145);
    d.text(clean('Lernenergie und Übungsverlauf'), M, y); y += u(10);
    d.setFont('helvetica', 'normal'); d.setFontSize(10.5); d.setTextColor(20, 35, 47);
    if (p === null) { d.text('Noch keine Aufgabe geprüft.', M, y); y += u(8); }
    else {
      var col = p >= 70 ? [31, 138, 76] : p >= 40 ? [201, 138, 0] : [194, 59, 46];
      d.setFillColor(228, 232, 234); d.roundedRect(M, y - u(5), u(110), u(7), u(3), u(3), 'F');
      d.setFillColor(col[0], col[1], col[2]); d.roundedRect(M, y - u(5), Math.max(u(4), u(110) * p / 100), u(7), u(3), u(3), 'F');
      d.setFont('helvetica', 'bold'); d.setFontSize(13); d.text(p + ' %', M + u(115), y); d.setFont('helvetica', 'normal'); d.setFontSize(10.5);
      d.text(clean('(' + zoneTxt(p) + ')'), M + u(132), y); y += u(10);
      d.splitTextToSize(clean('Richtig beim ersten Versuch hält die Lernenergie voll. Jeder Fehlversuch kostet etwas, mit Lösungshilfe zählt eine Aufgabe nur wenig. Gute Antworten bei weiteren Aufgaben heben den Wert wieder.'), W - 2 * M).forEach(function (l) { d.text(l, M, y); y += u(5); });
      y += u(3);
      d.setFont('helvetica', 'bold'); d.text(clean(s.length ? 'Hier hat es gehakt:' : 'Keine Aufgabe mit mehreren Fehlversuchen.'), M, y); y += u(6); d.setFont('helvetica', 'normal');
      s.forEach(function (r) { d.splitTextToSize(clean('- ' + r.l + ' (' + stuckTxt(r) + ')'), W - 2 * M - u(4)).forEach(function (l, i) { if (y > d.internal.pageSize.getHeight() - u(20)) { d.addPage(); y = u(24); } d.text(l, M + (i ? u(3) : 0), y); y += u(5); }); });
    }
    if (C.keys && C.keys.length) { y += u(6); d.setFontSize(9); d.setTextColor(86, 103, 107); d.splitTextToSize(clean('In dieser PDF steckt dein Arbeitsstand. Über „PDF laden“ in der Lernplattform kannst du damit weiterarbeiten.'), W - 2 * M).forEach(function (l) { d.text(l, M, y); y += u(4.5); }); }
  }
  function wrapPdf() {
    var ns = window.jspdf; if (!ns || !ns.jsPDF || ns.jsPDF.__lp) return;
    var J0 = ns.jsPDF;
    var J = function () {
      var d = new (Function.prototype.bind.apply(J0, [null].concat([].slice.call(arguments))))();
      var out = d.output.bind(d), sv = d.save && d.save.bind(d), done = false;
      var fin = function () {
        if (done) return; done = true;
        try {
          var w = d.internal.pageSize.getWidth(), h = d.internal.pageSize.getHeight(), k = d.internal.scaleFactor, mm = function (v) { return v * k * 25.4 / 72; };
          if (Math.min(mm(w), mm(h)) >= 190 && Math.max(mm(w), mm(h)) >= 270) {
            if (C.pdfSection !== false) addSection(d);
            if (C.keys && C.keys.length) d.setProperties({ keywords: stateCode() });
          }
        } catch (e) { }
      };
      d.output = function () { fin(); return out.apply(null, arguments); };
      if (sv) d.save = function () { fin(); return sv.apply(null, arguments); };
      return d;
    };
    J.prototype = J0.prototype; for (var p in J0) { try { J[p] = J0[p]; } catch (e) { } } J.API = J0.API; J.__lp = 1;
    ns.jsPDF = J;
  }
  wrapPdf();

  /* ---------- Aus PDF oder HTML weiterarbeiten ---------- */
  function codeFrom(text) {
    var all = (text.match(/LPS0\.[A-Za-z0-9_-]{20,}/g) || []).sort(function (a, b) { return b.length - a.length; });
    for (var i = 0; i < all.length; i++) for (var cut = 0; cut <= 4; cut++) { var c = all[i].slice(0, all[i].length - cut); try { var o = JSON.parse(unb64u(c.slice(5))); if (o && o.ls) return o; } catch (e) { } }
    return null;
  }
  function mountUpload(anchor, mode) {
    if (!anchor || anchor.dataset.lpUp) return; anchor.dataset.lpUp = '1';
    var accept = C.accept || '.pdf,application/pdf', label = C.uploadLabel || 'PDF laden';
    var lab = mk('label', 'lp-btn'); lab.innerHTML = esc(label) + '<input type="file" accept="' + accept + '">';
    var note = mk('p', 'lp-note'); note.hidden = true; note.setAttribute('aria-live', 'polite');
    var inp = lab.querySelector('input'), pending = null;
    inp.onchange = function () {
      var f = inp.files && inp.files[0]; inp.value = ''; if (!f) return;
      note.hidden = false; note.textContent = 'Datei wird gelesen …';
      f.arrayBuffer().then(function (buf) {
        var o = codeFrom(new TextDecoder('latin1').decode(new Uint8Array(buf)));
        if (!o) { note.textContent = C.noCodeText || 'In dieser Datei steckt kein Arbeitsstand. Das klappt nur mit Dateien, die du hier in der Lernplattform gespeichert hast. Bildschirmfotos oder Dateien, die du aus Notability neu exportiert hast, enthalten ihn meist nicht.'; return; }
        if (o.s !== SLUG) { note.textContent = 'Diese Datei gehört zu einer anderen Lernplattform.'; return; }
        pending = o;
        var dt = new Date(o.d), when = isNaN(dt) ? '' : ' vom ' + dt.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' Uhr';
        note.innerHTML = 'Gefunden: Arbeitsstand' + esc(when) + '. Dein aktueller Stand auf diesem Gerät wird ersetzt. <button type="button" class="lp-ok">Ja, Stand laden</button>';
        note.querySelector('.lp-ok').onclick = function () {
          try { Object.keys(pending.ls).forEach(function (k) { localStorage.setItem(k, pending.ls[k]); }); }
          catch (e) { note.textContent = 'Speichern auf diesem Gerät ist nicht möglich (zum Beispiel im privaten Fenster).'; return; }
          note.textContent = 'Geladen. Die Seite startet neu …'; setTimeout(function () { location.reload(); }, 400);
        };
      }).catch(function () { note.textContent = 'Die Datei konnte nicht gelesen werden.'; });
    };
    if (mode === 'row') { anchor.parentNode.appendChild(lab); anchor.parentNode.parentNode.insertBefore(note, anchor.parentNode.nextSibling); }
    else {
      var box = mk('div', 'lp-up'); box.innerHTML = '<p><b>' + esc(C.uploadTitle || 'Mit gespeicherter PDF weiterarbeiten') + '</b> ' + esc(C.uploadText || 'Lade die PDF hoch, die du hier gespeichert hast. Darin steckt dein Arbeitsstand.') + '</p>';
      box.appendChild(lab); box.appendChild(note);
      if (mode === 'append') anchor.appendChild(box); else anchor.parentNode.insertBefore(box, anchor.nextSibling);
    }
  }
  function mountAnchors() {
    (C.anchors || []).forEach(function (a) {
      [].forEach.call(document.querySelectorAll(a.sel), function (n) { var t = a.closest ? n.closest(a.closest) : n; if (t) mountUpload(t, a.mode); });
    });
  }
  var mt = null;
  function boot() {
    wrapPdf(); mountAnchors(); paint(false);
    if (C.anchors && C.anchors.length) new MutationObserver(function () { clearTimeout(mt); mt = setTimeout(mountAnchors, 120); }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.addEventListener('load', wrapPdf);

  window.LP = { result: result, assist: assist, fb: fb, textLines: textLines, htmlSummary: htmlSummary, energy: energy, stuck: stuck, stateCode: stateCode, _codeFrom: codeFrom };
})();
