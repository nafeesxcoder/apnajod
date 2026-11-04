#!/usr/bin/env python3
"""
Hides the "Coach" button in the chat context bar of ChatFeature.tsx.

Usage:
    python hide_coach.py frontend/src/features/chat/ChatFeature.tsx

Backup is saved as ChatFeature.tsx.coach.bak. To bring the button back later,
change `{false &&` back to `{chatWidth >= 520 &&` on that line.
"""
import re
import shutil
import sys

PATTERN = re.compile(
    r'\{chatWidth >= 520 &&(\s*\(\s*<Pressable\s+accessibilityRole="button"\s+'
    r'accessibilityLabel="Reply coach")'
)


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    path = sys.argv[1]
    with open(path, encoding="utf-8", newline="") as f:
        src = f.read()

    matches = PATTERN.findall(src)
    if len(matches) != 1:
        sys.exit(f"[ABORT] expected 1 match, found {len(matches)}. "
                 "File was NOT changed.")

    new_src = PATTERN.sub(lambda m: "{false &&" + m.group(1), src)
    shutil.copyfile(path, path + ".coach.bak")
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write(new_src)
    print("[ok] Coach button hidden")
    print(f"Backup: {path}.coach.bak")


if __name__ == "__main__":
    main()
