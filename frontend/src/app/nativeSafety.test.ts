import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * Things the website forgives but the phone app crashes on. Each of these
 * once made the Android app show "A small pause in the story".
 */
const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : e.name.endsWith(".tsx") && !e.name.includes(".test.") ? [join(dir, e.name)] : [],
  );

const BOX = /^(View|Pressable|TouchableOpacity|TouchableHighlight|ScrollView|LinearGradient|Animated\.View|SafeAreaView|KeyboardAvoidingView|ImageBackground|Modal|PressScale|Reveal|)$/;
const meaningful = (raw: string) => (raw.includes("\n") ? raw.split("\n").some((l) => l.trim()) : raw.length > 0);
const isString = (e: ts.Expression | undefined): boolean =>
  !!e &&
  (ts.isStringLiteral(e) ||
    ts.isNoSubstitutionTemplateLiteral(e) ||
    ts.isTemplateExpression(e) ||
    (ts.isConditionalExpression(e) && (isString(e.whenTrue) || isString(e.whenFalse))) ||
    (ts.isBinaryExpression(e) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken].includes(e.operatorToken.kind) && isString(e.right)) ||
    (ts.isParenthesizedExpression(e) && isString(e.expression)));

describe("the phone app", () => {
  it("never puts text (not even a space) straight inside a View or button", () => {
    const found: string[] = [];
    for (const file of files("src")) {
      const src = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const visit = (node: ts.Node) => {
        if (ts.isJsxElement(node) || ts.isJsxFragment(node)) {
          const tag = ts.isJsxFragment(node) ? "" : node.openingElement.tagName.getText();
          if (BOX.test(tag)) {
            for (const child of node.children) {
              const bad =
                (ts.isJsxText(child) && meaningful(child.getFullText())) ||
                (ts.isJsxExpression(child) && isString(child.expression));
              if (bad) found.push(`${file}:${src.getLineAndCharacterOfPosition(child.getStart()).line + 1} <${tag || "<>"}>`);
            }
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(src);
    }
    expect(found).toEqual([]);
  });

  it("does not give Pressable a style function (NativeWind drops it on phones)", () => {
    const found = files("src").filter((file) => !file.endsWith(join("components", "Pressable.tsx"))).filter((file) => {
      const source = readFileSync(file, "utf8");
      return /style=\{\(\s*\{\s*pressed/.test(source) && !/from ["'][./]*components\/Pressable["']/.test(source);
    });
    expect(found).toEqual([]);
  });

  it("reports a crash to the server log so it can be found", () => {
    expect(readFileSync("src/components/ErrorBoundary.tsx", "utf8")).toContain("`${API_URL}/client-errors`");
  });
});
