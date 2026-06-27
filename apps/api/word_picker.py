import re

import uiautomation as automation


WORD_PATTERN = re.compile(r"[A-Za-z]+(?:['’-][A-Za-z]+)*")


def _clean_word(text: str) -> str | None:
    matches = WORD_PATTERN.findall(text or "")
    if len(matches) != 1:
        return None
    word = matches[0].replace("’", "'")
    return word if 2 <= len(word) <= 64 else None


def word_at_point(x: int, y: int) -> str | None:
    """Best-effort word lookup using the Windows accessibility text pattern."""
    try:
        with automation.UIAutomationInitializerInThread():
            control = automation.ControlFromPoint(x, y)
            for _ in range(5):
                if not control:
                    break
                try:
                    pattern = control.GetPattern(automation.PatternId.TextPattern)
                    if pattern:
                        text_range = pattern.RangeFromPoint(x, y)
                        if text_range:
                            text_range.ExpandToEnclosingUnit(automation.TextUnit.Word)
                            word = _clean_word(text_range.GetText(64))
                            if word:
                                return word
                except Exception:
                    pass

                # Some controls expose each link or label as a single accessible name.
                word = _clean_word(control.Name)
                if word:
                    return word
                control = control.GetParentControl()
    except Exception:
        return None
    return None

