import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Search engines see apnajoda.com the way WhatsApp Web works: the app
 * itself. The home page carries the title, description, share card and
 * app details (nothing extra on screen); members' links are never indexed. (A separate website comes later.)
 */
const PUBLIC = join(__dirname, "..", "..", "public");
const read = (p: string) => readFileSync(join(PUBLIC, p), "utf8");
const home = read("index.html");

describe("search engines", () => {
  it("gives the home page a title and description that say 'dating app'", () => {
    expect(home).toContain("<title>Apnajoda - Dating App for Serious Relationships &amp; Marriage in India</title>");
    const description = /<meta name="description" content="([^"]+)"/.exec(home)?.[1] ?? "";
    expect(description).toContain("dating app");
    expect(description.length).toBeGreaterThan(100);
    expect(description.length).toBeLessThan(260);
    expect(home).toContain('<link rel="canonical" href="https://apnajoda.com/" />');
  });

  it("has a share card and app details for Google", () => {
    expect(home).toContain('property="og:image" content="https://apnajoda.com/og-image.png"');
    expect(home).toContain('name="twitter:card" content="summary_large_image"');
    expect(home).toContain('"@type":"MobileApplication"');
    expect(home).toContain('"@type":"WebSite"');
    expect(existsSync(join(PUBLIC, "og-image.png"))).toBe(true);
  });

  it("adds nothing on screen: the app's own loader shows while it loads", () => {
    expect(home).toContain('<div id="root"></div>');
    expect(home).not.toContain("seo-landing");
  });

  it("has no separate website pages for now", () => {
    for (const gone of ["about", "features", "blog", "dating-in", "hi", "faq", "safety"]) {
      expect(existsSync(join(PUBLIC, gone)), gone).toBe(false);
    }
  });

  it("lists only the home page and the legal pages in the sitemap", () => {
    const sitemap = read("sitemap.xml");
    const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(urls[0]).toBe("https://apnajoda.com/");
    expect(urls).toHaveLength(7);
    for (const url of urls.slice(1)) expect(url).toMatch(/\.html$/);
  });

  it("keeps members' links out of search", () => {
    const robots = read("robots.txt");
    for (const param of ["share", "post", "story", "chat", "ludo", "invite"]) expect(robots).toContain(`Disallow: /*?${param}=`);
    expect(robots).toContain("Sitemap: https://apnajoda.com/sitemap.xml");
    expect(home).toContain("(share|post|story|chat|ludo|invite|screen)=");
    expect(home).toContain('m.content = "noindex, nofollow"');
  });
});
