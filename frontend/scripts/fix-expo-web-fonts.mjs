import { copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const outputArgument = process.argv.find((argument) => argument.startsWith("--output="));
const outputDirectory = path.resolve(outputArgument?.slice("--output=".length) || "dist");
const assetDirectory = path.join(outputDirectory, "assets");
const publicFontDirectory = path.join(assetDirectory, "fonts");
const bundleDirectory = path.join(outputDirectory, "_expo", "static", "js", "web");
const baseArgument = process.argv.find((argument) => argument.startsWith("--base="));
const basePath = (baseArgument?.slice("--base=".length) || "").replace(/\/$/, "");

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(entryPath) : [entryPath];
  }));
  return nested.flat();
}

const fontFiles = (await filesUnder(assetDirectory)).filter((file) => /\.(?:ttf|otf|woff2?)$/i.test(file));
const bundleFiles = (await filesUnder(bundleDirectory)).filter((file) => file.endsWith(".js"));
if (!fontFiles.length || !bundleFiles.length) throw new Error("Expo font assets or web bundle were not found.");

await mkdir(publicFontDirectory, { recursive: true });
const replacements = [];
for (const sourcePath of fontFiles) {
  if (sourcePath.startsWith(publicFontDirectory)) continue;
  const fileName = path.basename(sourcePath);
  await copyFile(sourcePath, path.join(publicFontDirectory, fileName));
  const originalUrl = `/${path.relative(outputDirectory, sourcePath).split(path.sep).join("/")}`;
  replacements.push([originalUrl, `/assets/fonts/${fileName}`]);
}

let replacementCount = 0;
for (const bundlePath of bundleFiles) {
  let bundle = await readFile(bundlePath, "utf8");
  for (const [originalUrl, publicUrl] of replacements) {
    if (!bundle.includes(originalUrl)) continue;
    bundle = bundle.split(originalUrl).join(publicUrl);
    replacementCount += 1;
  }
  if (basePath) bundle = bundle.split('"/assets/').join(`"${basePath}/assets/`);
  await writeFile(bundlePath, bundle);
}

if (!replacementCount) throw new Error("Expo web bundle did not contain the expected font URLs.");
if (basePath) {
  const indexPath = path.join(outputDirectory, "index.html");
  let html = await readFile(indexPath, "utf8");
  html = html.split('src="/_expo/').join(`src="${basePath}/_expo/`);
  html = html.split('href="/favicon.ico"').join(`href="${basePath}/favicon.ico"`);
  await writeFile(indexPath, html);
}
console.log(`Flattened ${fontFiles.length} font assets, rewrote ${replacementCount} bundle paths${basePath ? `, and applied base path ${basePath}` : ""}.`);
