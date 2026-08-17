"""Post-processing and renderers for a transcription result.

`collapse_blocks` merges consecutive segments of the same speaker into one
readable block ("SPEAKER_00: ... / SPEAKER_01: ..."). The `format_*` functions
render a result dict (see transcriber.transcribe_ogg) as txt / json / srt / html.
"""

from __future__ import annotations

import html
import json
from typing import Iterable

UNKNOWN_SPEAKER = "UNKNOWN"


# ------------------------------------------------------------------ helpers
def fmt_ts(seconds: float, always_hours: bool = False) -> str:
    """0 -> 00:00, 75.4 -> 01:15, 3725 -> 1:02:05."""
    seconds = max(0.0, float(seconds))
    total = int(round(seconds))
    h, rem = divmod(total, 3600)
    m, s = divmod(rem, 60)
    if h or always_hours:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"


def _srt_ts(seconds: float) -> str:
    seconds = max(0.0, float(seconds))
    ms = int(round((seconds - int(seconds)) * 1000))
    total = int(seconds)
    h, rem = divmod(total, 3600)
    m, s = divmod(rem, 60)
    if ms == 1000:  # rounding edge
        ms = 0
        s += 1
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def speaker_order(segments: Iterable[dict]) -> list[str]:
    """Speakers in order of first appearance."""
    seen: list[str] = []
    for seg in segments:
        spk = seg.get("speaker") or UNKNOWN_SPEAKER
        if spk not in seen:
            seen.append(spk)
    return seen


# ------------------------------------------------------------- collapsing
def collapse_blocks(segments: Iterable[dict], max_gap: float | None = None) -> list[dict]:
    """Merge consecutive segments spoken by the same speaker into one block.

    max_gap: if given, a silence longer than this (seconds) between two
    segments starts a new block even for the same speaker.
    """
    blocks: list[dict] = []
    for seg in segments:
        text = (seg.get("text") or "").strip()
        if not text:
            continue
        spk = seg.get("speaker") or UNKNOWN_SPEAKER
        start = float(seg.get("start", 0.0))
        end = float(seg.get("end", start))
        if blocks:
            last = blocks[-1]
            same_speaker = last["speaker"] == spk
            close_enough = max_gap is None or (start - last["end"]) <= max_gap
            if same_speaker and close_enough:
                last["text"] = (last["text"] + " " + text).strip()
                last["end"] = max(last["end"], end)
                continue
        blocks.append({"speaker": spk, "start": start, "end": end, "text": text})
    return blocks


# -------------------------------------------------------------- renderers
def format_txt(result: dict, timestamps: bool = False) -> str:
    """Speaker-labeled block transcript. Empty result -> a one-line note."""
    blocks = result.get("blocks") or collapse_blocks(result.get("segments", []))
    if not blocks:
        return "(no speech detected)\n"
    lines = []
    for b in blocks:
        prefix = f"[{fmt_ts(b['start'])} - {fmt_ts(b['end'])}] " if timestamps else ""
        lines.append(f"{prefix}{b['speaker']}: {b['text']}")
    return "\n\n".join(lines) + "\n"


def format_json(result: dict) -> str:
    return json.dumps(result, ensure_ascii=False, indent=2) + "\n"


def format_srt(result: dict) -> str:
    """SubRip using the raw segments (finer than blocks); speaker as prefix."""
    segments = [s for s in result.get("segments", []) if (s.get("text") or "").strip()]
    out = []
    for i, seg in enumerate(segments, start=1):
        spk = seg.get("speaker") or UNKNOWN_SPEAKER
        out.append(f"{i}\n{_srt_ts(seg['start'])} --> {_srt_ts(seg['end'])}\n{spk}: {seg['text'].strip()}\n")
    return "\n".join(out) + ("\n" if out else "")


_HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<style>
  :root {{
    --bg: #f4f1ea; --paper: #ffffff; --ink: #1f1d1a; --muted: #6f6a60; --line: #e5e0d5;
    --accent: #6d4c2f;
    --s0: #2f6f5e; --s1: #b0592a; --s2: #3b5b8f; --s3: #8a4d7a; --s4: #6f7a2f; --s5: #a1541c;
  }}
  * {{ box-sizing: border-box; }}
  body {{ margin: 0; background: var(--bg); color: var(--ink);
         font: 15px/1.55 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }}
  .wrap {{ max-width: 860px; margin: 0 auto; padding: 28px 18px 60px; }}
  header {{ margin-bottom: 18px; }}
  h1 {{ font-size: 20px; margin: 0 0 6px; }}
  .meta {{ color: var(--muted); font-size: 13px; display: flex; flex-wrap: wrap; gap: 6px 16px; }}
  .legend {{ display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0 6px; }}
  .chip {{ border: 1px solid var(--line); background: var(--paper); border-radius: 999px;
           padding: 3px 10px 3px 6px; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }}
  .chip .dot {{ width: 10px; height: 10px; border-radius: 50%; display: inline-block; }}
  .chip:hover {{ border-color: var(--accent); }}
  .tools {{ display: flex; gap: 8px; flex-wrap: wrap; margin: 10px 0 18px; }}
  button {{ font: inherit; font-size: 13px; padding: 6px 12px; border-radius: 8px; border: 1px solid var(--line);
            background: var(--paper); color: var(--ink); cursor: pointer; }}
  button:hover {{ border-color: var(--accent); }}
  .block {{ background: var(--paper); border: 1px solid var(--line); border-left: 4px solid var(--c, var(--accent));
            border-radius: 10px; padding: 10px 14px; margin: 0 0 10px; }}
  .block .who {{ font-weight: 600; color: var(--c, var(--accent)); font-size: 13px; letter-spacing: .02em; }}
  .block .ts {{ color: var(--muted); font-size: 12px; margin-left: 8px; font-variant-numeric: tabular-nums; }}
  body.hide-ts .ts {{ display: none; }}
  .block p {{ margin: 4px 0 0; white-space: pre-wrap; }}
  .empty {{ color: var(--muted); font-style: italic; }}
  footer {{ margin-top: 30px; color: var(--muted); font-size: 12px; }}
  @media print {{ body {{ background: #fff; }} .tools {{ display: none; }} .block {{ break-inside: avoid; }} }}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>{title}</h1>
    <div class="meta">
      <span>{source_label}</span>
      <span>Duration {duration}</span>
      <span>Language {language}</span>
      <span>Model {model}</span>
      <span>{nspk} speaker(s)</span>
    </div>
    <div class="legend">{legend}</div>
    <div class="tools">
      <button type="button" data-act="ts">Show / hide timestamps</button>
      <button type="button" data-act="copy">Copy transcript</button>
      <button type="button" data-act="print">Print / PDF</button>
      <span class="meta" style="align-self:center">Tip: click a speaker chip to rename that speaker everywhere.</span>
    </div>
  </header>
  <main id="transcript">
{blocks}
  </main>
  <footer>Generated locally with ogg_transcriber (faster-whisper + pyannote via WhisperX). Nothing was uploaded.</footer>
</div>
<script>
(function () {{
  var names = {names_json};
  function apply() {{
    document.querySelectorAll('[data-spk]').forEach(function (el) {{
      var k = el.getAttribute('data-spk');
      el.textContent = names[k] || k;
    }});
  }}
  document.querySelectorAll('.chip').forEach(function (chip) {{
    chip.addEventListener('click', function () {{
      var k = chip.getAttribute('data-key');
      var v = window.prompt('Name for ' + k + ':', names[k] || k);
      if (v !== null && v.trim()) {{ names[k] = v.trim(); apply(); }}
    }});
  }});
  document.querySelector('[data-act="ts"]').addEventListener('click', function () {{
    document.body.classList.toggle('hide-ts');
  }});
  document.querySelector('[data-act="print"]').addEventListener('click', function () {{ window.print(); }});
  document.querySelector('[data-act="copy"]').addEventListener('click', function () {{
    var lines = [];
    document.querySelectorAll('.block').forEach(function (b) {{
      var who = b.querySelector('.who').textContent;
      var ts = b.querySelector('.ts');
      var p = b.querySelector('p').textContent;
      lines.push((document.body.classList.contains('hide-ts') || !ts ? '' : ts.textContent + ' ') + who + ': ' + p);
    }});
    var text = lines.join('\\n\\n');
    if (navigator.clipboard) {{ navigator.clipboard.writeText(text); }}
    else {{ var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }}
  }});
  apply();
}})();
</script>
</body>
</html>
"""


def format_html(result: dict, title: str | None = None) -> str:
    """Standalone HTML transcript: colored speaker blocks, timestamps, rename + copy tools."""
    meta = result.get("meta", {}) or {}
    blocks = result.get("blocks") or collapse_blocks(result.get("segments", []))
    speakers = result.get("speakers") or speaker_order(blocks)
    palette = ["var(--s0)", "var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)"]
    color_of = {spk: palette[i % len(palette)] for i, spk in enumerate(speakers)}

    source = meta.get("source") or ""
    title = title or (f"Transcript - {source}" if source else "Transcript")

    legend_html = "".join(
        f'<span class="chip" data-key="{html.escape(spk)}"><span class="dot" style="background:{color_of[spk]}"></span>'
        f'<span data-spk="{html.escape(spk)}">{html.escape(spk)}</span></span>'
        for spk in speakers
    )
    if blocks:
        block_html = "\n".join(
            f'    <div class="block" style="--c:{color_of.get(b["speaker"], "var(--accent)")}">'
            f'<span class="who" data-spk="{html.escape(b["speaker"])}">{html.escape(b["speaker"])}</span>'
            f'<span class="ts">{fmt_ts(b["start"])} - {fmt_ts(b["end"])}</span>'
            f'<p>{html.escape(b["text"])}</p></div>'
            for b in blocks
        )
    else:
        block_html = '    <p class="empty">No speech detected.</p>'

    return _HTML_TEMPLATE.format(
        lang=html.escape(result.get("language") or "es"),
        title=html.escape(title),
        source_label=html.escape(source) if source else "",
        duration=fmt_ts(meta.get("duration_seconds", 0.0)),
        language=html.escape(result.get("language") or "auto"),
        model=html.escape(str(meta.get("model", "?"))),
        nspk=len(speakers),
        legend=legend_html,
        blocks=block_html,
        names_json=json.dumps({s: s for s in speakers}, ensure_ascii=False),
    )


FORMATTERS = {
    "txt": lambda r, **kw: format_txt(r, timestamps=kw.get("timestamps", False)),
    "json": lambda r, **kw: format_json(r),
    "srt": lambda r, **kw: format_srt(r),
    "html": lambda r, **kw: format_html(r, title=kw.get("title")),
}
