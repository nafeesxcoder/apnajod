/**
 * The words of a story's song, line by line with times (the admin adds them
 * to the song in the library), and the music sticker's looks. Pure, so it
 * can be tested.
 */
export type LyricLine = { at: number; text: string };

export type MusicStyle = "card" | "pill" | "lyrics";
export type LyricFont = "classic" | "box" | "glow";

/** The lines a clip plays: the one already playing at its start, then every line before its end. */
export function clipLines(lines: LyricLine[] | undefined, start: number, length: number): LyricLine[] {
  if (!lines?.length) return [];
  let from = 0;
  for (let i = 0; i < lines.length; i += 1) if (lines[i]!.at <= start) from = i;
  return lines.slice(from).filter((line) => line.at < start + length);
}

/** Which line is playing at `time` seconds into the song (-1 before the first). */
export function lineAt(lines: LyricLine[], time: number): number {
  let index = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i]!.at <= time + 0.05) index = i;
    else break;
  }
  return index;
}

type Look = { style: MusicStyle; lyricFont?: LyricFont };

/** Tapping the sticker: card, pill, then the words in three looks (only when the clip has words). */
export function nextMusicLook(current: Look, hasLyrics: boolean): Look {
  const looks: Look[] = [
    { style: "card" },
    { style: "pill" },
    ...(hasLyrics
      ? ([
          { style: "lyrics", lyricFont: "classic" },
          { style: "lyrics", lyricFont: "box" },
          { style: "lyrics", lyricFont: "glow" },
        ] as Look[])
      : []),
  ];
  const at = looks.findIndex((look) => look.style === current.style && (look.style !== "lyrics" || look.lyricFont === (current.lyricFont ?? "classic")));
  return looks[(at + 1) % looks.length]!;
}
