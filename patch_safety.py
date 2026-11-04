#!/usr/bin/env python3
"""
Adds a null guard for `match` in SafetyActions (SafetyScreens.tsx).

Usage:
    python patch_safety.py frontend/src/features/trust/screens/SafetyScreens.tsx

A backup is saved as SafetyScreens.tsx.bak. The file is changed only if all
3 patterns are found exactly once.
"""
import shutil
import sys

EDITS = [
    (
        "visible,match,isBlocked=false,",
        "visible,match:matchProp,isBlocked=false,",
        "props destructuring",
    ),
    (
        "visible:boolean;match:Match;isBlocked?:boolean;",
        "visible:boolean;match?:Match|null;isBlocked?:boolean;",
        "props type",
    ),
    (
        "const [details,setDetails]=useState('');",
        "const [details,setDetails]=useState('');\n"
        "  if(!matchProp) return null;\n"
        "  const match=matchProp;",
        "null guard after hooks",
    ),
]


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    path = sys.argv[1]
    with open(path, encoding="utf-8", newline="") as f:
        src = f.read()

    for old, _, label in EDITS:
        n = src.count(old)
        if n != 1:
            sys.exit(f"[ABORT] '{label}': expected 1 match, found {n}. "
                     "File was NOT changed.")

    for old, new, label in EDITS:
        src = src.replace(old, new)
        print(f"[ok] {label}")

    shutil.copyfile(path, path + ".bak")
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write(src)
    print(f"\nDone. Backup: {path}.bak")


if __name__ == "__main__":
    main()
