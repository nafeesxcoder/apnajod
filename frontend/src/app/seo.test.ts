import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PUBLIC = join(__dirname, "..", "..", "public");
const read = (p: string) => readFileSync(join(PUBLIC, p), "utf8");

/** Every page built for search engines (folder/index.html under public/). */
function pages(dir = PUBLIC, base = ""): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (existsSync(join(path, "index.html"))) out.push(`${base}/${name}/`);
      out.push(...pages(path, `${base}/${name}`));
    }
  }
  return out;
}

const tag = (html: string, re: RegExp) => re.exec(html)?.[1] ?? "";

describe("search engines", () => {
  const list = pages();

  it("has the public pages, every one in the sitemap", () => {
    expect(list.length).toBeGreaterThanOrEqual(40);
    const sitemap = read("sitemap.xml");
    for (const path of ["/", ...list]) expect(sitemap).toContain(`<loc>https://apnajoda.com${path}</loc>`);
    for (const must of ["/features/", "/safety/", "/faq/", "/hi/", "/dating-in/delhi/", "/dating-in/gwalior/", "/blog/first-date-safety-tips/", "/kundli-matching/"]) {
      expect(list).toContain(must);
    }
  });

  it("gives every page its own title, description and canonical link", () => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    for (const path of list) {
      const html = read(`${path.slice(1)}index.html`);
      const title = tag(html, /<title>([^<]+)<\/title>/);
      const description = tag(html, /<meta name="description" content="([^"]+)"/);
      expect(title.length, path).toBeGreaterThan(20);
      expect(title.length, path).toBeLessThan(110);
      expect(description.length, path).toBeGreaterThan(70);
      expect(description.length, path).toBeLessThan(260);
      expect(html).toContain(`<link rel="canonical" href="https://apnajoda.com${path}">`);
      expect(html).toContain('<script type="application/ld+json">');
      expect(html).toContain('property="og:image" content="https://apnajoda.com/og-image.png"');
      titles.add(title);
      descriptions.add(description);
    }
    expect(titles.size).toBe(list.length);
    expect(descriptions.size).toBe(list.length);
  });

  it("keeps members' links out of search, and points to the sitemap", () => {
    const robots = read("robots.txt");
    for (const param of ["share", "post", "story", "chat", "ludo", "invite"]) expect(robots).toContain(`Disallow: /*?${param}=`);
    expect(robots).toContain("Disallow: /uploads/");
    expect(robots).toContain("Sitemap: https://apnajoda.com/sitemap.xml");
  });

  it("gives the home page a title, description, share card and readable text", () => {
    const home = read("index.html");
    expect(home).toContain("<title>Apnajoda - Verified Dating App for Serious Relationships &amp; Marriage in India</title>");
    expect(home).toContain('<meta name="description" content="Apnajoda is a dating app for marriage-minded Indians');
    expect(home).toContain('<link rel="canonical" href="https://apnajoda.com/" />');
    expect(home).toContain("<h1>Serious, verified dating for marriage-minded India</h1>");
    expect(home).toContain('"@type":"MobileApplication"');
    // A shared profile, post or story link is never indexed.
    expect(home).toContain("(share|post|story|chat|ludo|invite|screen)=");
    expect(home).toContain('m.content = "noindex, nofollow"');
    expect(existsSync(join(PUBLIC, "og-image.png"))).toBe(true);
  });

  it("makes no claims it cannot back: no ratings or review counts", () => {
    for (const path of ["index.html", ...list.map((p) => `${p.slice(1)}index.html`)]) {
      const html = read(path);
      expect(html, path).not.toContain("aggregateRating");
      expect(html, path).not.toMatch(/\b\d{1,3}(,\d{3})+\+? (users|members|couples)\b/i);
    }
  });
});
