# claude-cards

Decision and report cards for Claude `show_widget` payloads.

```html
<div class="hcm" style="font-size:13px;color:var(--text-muted)">Loading card…</div>
<script type="application/json" class="hc">{"type":"decision", ...}</script>
<script>var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/gh/helios-live/claude-cards@v1.1.0/card.js';s.onload=function(){document.querySelector('.hcm').remove()};s.onerror=function(){document.querySelector('.hcm').textContent='Card failed to load'};document.body.appendChild(s)</script>
```

Load it with the small inline loader above: a plain `<script src>` tag is not
reliably executed by widget hosts that stream HTML, and a widget with no
visible content may be collapsed before the card draws — keep the placeholder.

Spec format is documented at the top of `card.js`.

**Always pin an exact tag.** Tags are never moved or deleted. Breaking
changes ship as a new major version (`v2.0.0`).

MIT licensed.
