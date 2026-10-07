/*! claude-cards — decision & report cards for Claude widgets. MIT.
 *
 * Usage inside a show_widget payload (spec first, loader last):
 *
 *   <script type="application/json" class="hc">{"type":"decision", ...}</script>
 *   <script src="https://cdn.jsdelivr.net/gh/helios-live/claude-cards@v1.1.0/card.js"></script>
 *
 * Always pin an exact tag. Breaking changes ship as a new major tag (v2.0.0),
 * so existing pins never change under you.
 *
 * Decision spec:
 *   {"type":"decision","id":"D7","level":"blocks"|"nice","question":"Do X → Y?",
 *    "multi":false,
 *    "rows":[{"tag":"changed"|"new"|"risk"|"decided","text":"...","settled":false}],
 *    "options":[{"name":"short","label":"Self-explaining label","rec":true}]}
 *   Reply sent back: "D7: 1. short; 2. other."
 *
 * Report spec (optional "decision" = a decision spec without "type"; it is
 * drawn inside "Needs you" so a report never needs a second card):
 *   {"type":"report","topic":"...","title":"...","decision":{...},
 *    "lines":[{"kind":"your move"|"blocked"|"risk"|"in progress"|"not visible"|
 *              "next"|"check it"|"done","text":"...","url":"https://..."}]}
 */
(function () {
  var CSS =
    ".c{border:.5px solid var(--border);border-radius:12px;padding:20px;background:var(--surface-2);max-width:680px}" +
    ".pl{font-size:12px;font-weight:500;padding:3px 10px;border-radius:999px}" +
    ".hd{display:flex;gap:10px;align-items:center;margin-bottom:6px}.sub{font-size:12px;color:var(--text-muted)}" +
    ".c h2{font-size:18px;font-weight:500;margin:0 0 16px}.c.rp h2{margin-bottom:4px}" +
    ".tg{font-size:11px;font-weight:500;padding:2px 8px;border-radius:6px;min-width:64px;text-align:center;flex:none}" +
    ".must{color:color-mix(in srgb,var(--text-danger) 60%,var(--text-primary))}.mu{color:var(--text-muted)}" +
    ".r{background:var(--bg-danger);color:var(--text-danger)}.a{background:var(--bg-warning);color:var(--text-warning)}" +
    ".g{background:var(--bg-success);color:var(--text-success)}.b{background:var(--bg-accent);color:var(--text-accent)}" +
    ".gr{border:.5px solid var(--border);color:var(--text-muted)}" +
    ".rows{display:flex;flex-direction:column;gap:10px;margin-bottom:20px}" +
    ".row{display:flex;gap:10px;align-items:baseline;font-size:14px;line-height:1.5}" +
    ".hr{border-top:.5px solid var(--border);margin:4px 0}.fl{display:flex;flex-wrap:wrap;gap:8px}" +
    ".nb{font-size:12px;font-weight:500;width:22px;height:22px;border-radius:50%;border:.5px solid var(--border-strong);display:inline-flex;align-items:center;justify-content:center;flex:none;color:var(--text-secondary)}" +
    ".opt,.bt{display:flex;gap:8px;align-items:center;border-radius:var(--radius);padding:8px 14px;background:var(--surface-2);font-size:14px;cursor:pointer;border:.5px solid var(--border-strong);text-align:left;color:inherit;font-family:inherit}" +
    ".rec,.send{border:2px solid var(--border-accent)}.opt[aria-pressed=true],.opt:has(input:checked){background:var(--bg-accent)}" +
    ".opt input{margin:0}.bt:disabled{opacity:.5;cursor:default}" +
    ".pv{font-family:var(--font-mono);color:var(--text-secondary);user-select:all}" +
    ".sec{font-size:11px;color:var(--text-muted);margin:14px 0 6px}" +
    ".ln{display:flex;gap:10px;align-items:center;padding:8px 10px;border-radius:8px;font-size:14px;line-height:1.4}" +
    ".ln .tg{min-width:78px}.ln a{color:inherit}" +
    ".ym{background:var(--bg-danger);color:var(--text-danger)}.ym .tg{background:var(--surface-2);color:var(--text-danger)}.ym .tx{font-weight:500}" +
    ".dsh{border:1px dashed var(--border-warning);color:var(--text-warning)}" +
    ".out{border:.5px solid var(--border-strong);color:var(--text-secondary)}.sec2{color:var(--text-secondary)}" +
    ".dn{color:var(--text-muted);font-size:13px}" +
    ".dq{border:.5px solid var(--border-strong);border-radius:10px;padding:14px 16px;margin-bottom:8px}" +
    ".dq h3{font-size:16px;font-weight:500;margin:0 0 12px}.dq .rows{margin-bottom:14px}";

  var TAGS = { changed: "a", "new": "a", risk: "r" };
  // kind: [section, tag class, icon, row class, text class]
  var LINES = {
    "your move": ["Needs you", "", "hand-finger", "ym", ""],
    "blocked": ["Needs you", "r", "lock", "", "must"],
    "risk": ["Needs you", "r", "alert-triangle", "", "must"],
    "in progress": ["Moving", "a", "loader-2", "", ""],
    "not visible": ["Moving", "dsh", "eye-off", "", ""],
    "next": ["Moving", "out", "circle-dashed", "", "sec2"],
    "check it": ["Finished", "g", "external-link", "", ""],
    "done": ["Finished", "gr", "check", "dn", ""]
  };
  var ICON = { r: "--text-danger", a: "--text-warning", dsh: "--text-warning", out: "--text-secondary",
               g: "--text-success", gr: "--text-muted" };
  var LABEL = { next: "next (me)" };
  var SECTIONS = ["Needs you", "Moving", "Finished"];

  function e(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function settled(r) { return r.tag === "decided" || !!r.settled; }
  function head(cls, pill, sub, title) {
    return '<div class="hd"><span class="pl ' + cls + '">' + e(pill) + '</span><span class="sub">' + e(sub) +
      "</span></div><h2>" + e(title) + "</h2>";
  }

  function decisionBody(s) {
    var multi = !!s.multi, rows = s.rows || [];
    var must = rows.filter(function (r) { return !settled(r); }), done = rows.filter(settled);
    var h = '<div class="rows">';
    must.forEach(function (r) {
      h += '<div class="row"><span class="tg ' + (TAGS[r.tag] || "a") + '">' + e(r.tag) + '</span><span class="must">' +
        e(r.text) + "</span></div>";
    });
    if (must.length && done.length) h += '<div class="hr"></div>';
    done.forEach(function (r) {
      h += '<div class="row mu"><span class="tg gr">' + e(r.tag) + "</span><span>" + e(r.text) + "</span></div>";
    });
    h += '</div><div class="fl" style="margin-bottom:12px">';
    (s.options || []).forEach(function (o, i) {
      var k = i + 1, cls = o.rec ? "opt rec" : "opt", inner = '<span class="nb">' + k + "</span>" + e(o.label);
      h += multi
        ? '<label class="' + cls + '"><input type="checkbox" data-k="' + k + '" data-name="' + e(o.name) + '">' + inner + "</label>"
        : '<button type="button" class="' + cls + '" data-k="' + k + '" data-name="' + e(o.name) + '">' + inner + "</button>";
    });
    return h + '</div><div class="fl"><button type="button" class="bt send">Send</button>' +
      '<button type="button" class="bt copy"><i class="ti ti-copy" aria-hidden="true"></i> Copy</button></div>' +
      '<div class="sub" style="margin-top:8px">Sends: <span class="pv"></span></div>' +
      '<div class="st" style="font-size:13px;margin-top:4px"></div>';
  }

  function pillOf(s) {
    var blocks = (s.level || "blocks") === "blocks";
    return [blocks ? "r" : "b", blocks ? "Blocks" : "Nice", s.id + (s.multi ? " · tick any" : "")];
  }

  function decision(s) {
    var p = pillOf(s);
    return '<h2 class="sr-only">Decision card ' + e(s.id) + ": " + e(s.question) + "</h2>" +
      '<div class="c" data-d="' + e(s.id) + '">' + head(p[0], p[1], p[2], s.question) + decisionBody(s) + "</div>";
  }

  // A decision embedded in a report's "Needs you" section: one card, not two.
  function embedded(s) {
    var p = pillOf(s);
    return '<div class="dq" data-d="' + e(s.id) + '"><div class="hd"><span class="pl ' + p[0] + '">' + e(p[1]) +
      '</span><span class="sub">' + e(p[2]) + "</span></div><h3>" + e(s.question) + "</h3>" + decisionBody(s) + "</div>";
  }

  function report(s) {
    var h = '<h2 class="sr-only">Report: ' + e(s.title) + '</h2><div class="c rp">' +
      head("g", "Report", s.topic || "", s.title);
    SECTIONS.forEach(function (sec) {
      var ls = (s.lines || []).filter(function (l) { return LINES[l.kind] && LINES[l.kind][0] === sec; });
      var dq = sec === "Needs you" && s.decision;
      if (!ls.length && !dq) return;
      h += '<div class="sec">' + sec + "</div>";
      if (dq) h += embedded(s.decision);
      ls.forEach(function (l) {
        var d = LINES[l.kind], text = e(l.text);
        if (l.url) text += ' · <a href="' + e(l.url) + '">' + e(l.url) + "</a>";
        var ic = ICON[d[1]] ? ' style="color:var(' + ICON[d[1]] + ')"' : "";
        h += '<div class="ln ' + d[3] + '"><span class="tg ' + d[1] + '">' + e(LABEL[l.kind] || l.kind) + "</span>" +
          '<i class="ti ti-' + d[2] + '"' + ic + ' aria-hidden="true"></i><span class="tx ' + d[4] + '">' + text + "</span></div>";
      });
    });
    return h + "</div>";
  }

  function wire(c) {
    var D = c.getAttribute("data-d"), pv = c.querySelector(".pv"), st = c.querySelector(".st"),
      sd = c.querySelector(".send"), sent = null,
      bs = [].slice.call(c.querySelectorAll("button.opt")), xs = [].slice.call(c.querySelectorAll("input[data-k]"));
    bs.forEach(function (b) {
      b.addEventListener("click", function () {
        bs.forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); rf();
      });
    });
    xs.forEach(function (i) { i.addEventListener("change", rf); });
    function msg() {
      var p = xs.length ? xs.filter(function (i) { return i.checked; })
        : bs.filter(function (b) { return b.getAttribute("aria-pressed") === "true"; });
      return p.length ? D + ": " + p.map(function (x) { return x.dataset.k + ". " + x.dataset.name; }).join("; ") + "." : "";
    }
    function say(t, err) { st.style.color = err ? "var(--text-danger)" : "var(--text-muted)"; st.textContent = t; }
    function rf() { var v = msg(); pv.textContent = v || "(nothing picked)"; sd.disabled = !v || v === sent; st.textContent = ""; }
    rf();
    sd.addEventListener("click", function () {
      var v = msg(); if (!v || v === sent) return;
      sent = v; sd.disabled = true;
      try { sendPrompt(v); say("Sent once. If it is not in the chat box, use Copy."); }
      catch (err) { sent = null; sd.disabled = false; say("Send failed. Use Copy.", 1); }
    });
    c.querySelector(".copy").addEventListener("click", function () {
      var v = msg(); if (!v) { say("Pick something first", 1); return; }
      function fb() {
        var r = document.createRange(); r.selectNodeContents(pv);
        var s = getSelection(); s.removeAllRanges(); s.addRange(r);
        var ok = false; try { ok = document.execCommand("copy"); } catch (x) {}
        say(ok ? "Copied. Paste it in the chat." : "Line selected. Press Cmd+C, then paste.", !ok);
      }
      if (navigator.clipboard && navigator.clipboard.writeText)
        navigator.clipboard.writeText(v).then(function () { say("Copied. Paste it in the chat."); }, fb);
      else fb();
    });
  }

  var style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);

  [].slice.call(document.querySelectorAll("script.hc")).forEach(function (tag) {
    var box = document.createElement("div");
    try {
      var s = JSON.parse(tag.textContent);
      box.innerHTML = s.type === "report" ? report(s) : decision(s);
    } catch (err) {
      box.textContent = "Card spec error: " + err.message;
      box.style.color = "var(--text-danger)";
    }
    if (tag.parentNode === document.head) document.body.insertBefore(box, document.body.firstChild);
    else tag.parentNode.insertBefore(box, tag);
    [].slice.call(box.querySelectorAll("[data-d]")).forEach(wire);
  });
})();
