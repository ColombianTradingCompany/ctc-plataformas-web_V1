"""Small, conservative clean-ups applied after ASR + diarization.

Both were motivated by a real 22-minute WhatsApp call (2026-08-17):

* Diarization jitter at overlaps produced 1-2 s speaker flips INSIDE a sentence
  ("...lo que nos falta es | ponerlo al | servicio de la humanidad."). A sentence
  that Whisper emitted as one unit is almost always one voice, so a tiny minority
  speaker inside a sentence is folded into the sentence's majority speaker.

* Whisper's repetition hallucination produced ~50 x "no," over 14 s. Runs of the
  same token are collapsed to a short marker so the reader sees what happened
  instead of a wall of "no, no, no".
"""

from __future__ import annotations

import re
from collections import Counter
from typing import Iterable

# Speaker smoothing: a minority speaker in a sentence is absorbed when it holds
# at most MAX_FRAGMENT_WORDS words AND less than MAX_FRAGMENT_RATIO of the words.
MAX_FRAGMENT_WORDS = 3
MAX_FRAGMENT_RATIO = 0.4

# Repetition collapse: >= MIN_REPEATS identical consecutive tokens -> keep KEEP_REPEATS + marker.
MIN_REPEATS = 6
KEEP_REPEATS = 3

_STRIP = re.compile(r"[\W_]+", re.UNICODE)


def smooth_word_speakers(words: Iterable[dict],
                         max_fragment_words: int = MAX_FRAGMENT_WORDS,
                         max_fragment_ratio: float = MAX_FRAGMENT_RATIO) -> int:
    """Fold tiny minority speakers of ONE sentence into its majority speaker (in place).

    Returns the number of words re-labelled. Ties (2 vs 2) are left untouched.
    """
    labeled = [w for w in words if w.get("speaker") and (w.get("word") or "").strip()]
    if len(labeled) < 2:
        return 0
    counts = Counter(w["speaker"] for w in labeled)
    if len(counts) < 2:
        return 0
    (majority, top), (_, second) = counts.most_common(2)
    if top == second:  # genuine tie - do not guess
        return 0
    total = len(labeled)
    changed = 0
    for spk, c in list(counts.items()):
        if spk == majority:
            continue
        if c <= max_fragment_words and (c / total) < max_fragment_ratio:
            for w in labeled:
                if w["speaker"] == spk:
                    w["speaker"] = majority
                    changed += 1
    return changed


def _norm(token: str) -> str:
    return _STRIP.sub("", token).lower()


def collapse_repetitions(text: str, min_repeats: int = MIN_REPEATS, keep: int = KEEP_REPEATS) -> tuple[str, int]:
    """Collapse runs of the same word ("no, no, no, no, no, no, no") into "no, no, no, (…×7)".

    Returns (new_text, number_of_runs_collapsed). Natural repetition ("muy muy bueno",
    "no, no, no") is far below the threshold and left alone.
    """
    tokens = text.split()
    if len(tokens) < min_repeats:
        return text, 0
    out: list[str] = []
    i = 0
    collapsed = 0
    while i < len(tokens):
        key = _norm(tokens[i])
        j = i + 1
        while j < len(tokens) and key and _norm(tokens[j]) == key:
            j += 1
        run = j - i
        if run >= min_repeats:
            out.extend(tokens[i:i + keep])
            out.append(f"(…×{run})")
            collapsed += 1
        else:
            out.extend(tokens[i:j])
        i = j
    return (" ".join(out) if collapsed else text), collapsed
