# claude-cards

Decision and report cards for Claude `show_widget` payloads.

```html
<script type="application/json" class="hc">{"type":"decision", ...}</script>
<script>var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/gh/helios-live/claude-cards@v1.1.0/card.js';document.body.appendChild(s)</script>
```

Load it with the small inline loader above: a plain `<script src>` tag is not
reliably executed by widget hosts that stream HTML.

Spec format is documented at the top of `card.js`.

**Always pin an exact tag.** Tags are never moved or deleted. Breaking
changes ship as a new major version (`v2.0.0`).

MIT licensed.
