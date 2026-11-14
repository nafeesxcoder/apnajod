import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(join(__dirname, "..", "..", "..", "..", p), "utf8");

describe("the + on Home", () => {
  it("asks Story or Post", () => {
    const button = read("src/features/profile/components/AddPostButton.tsx");
    const home = read("src/features/discovery/screens/HomeScreen.tsx");
    const tray = read("src/features/stories/StoriesTray.tsx");
    expect(home).toMatch(/<AddPostButton[\s\S]{0,300}withStory/);
    expect(button).toContain('<Sheet visible={menuOpen} title="Create"');
    expect(button).toContain('if (kind === "story") setTimeout(openStoryChooser, 250);');
    expect(tray).toContain("useEffect(() => onStoryChooser(() => setChoosing(true)), []);");
  });
});
