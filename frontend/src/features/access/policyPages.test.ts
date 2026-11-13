import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const pub = (name: string) => readFileSync(join(__dirname, "..", "..", "..", "public", name), "utf8");
const welcome = readFileSync(join(__dirname, "screens", "WelcomeScreen.tsx"), "utf8");

describe("the pages Razorpay looks for", () => {
  it("exist: contact, shipping and pricing", () => {
    for (const name of ["contact.html", "shipping.html", "pricing.html"]) {
      expect(existsSync(join(__dirname, "..", "..", "..", "public", name))).toBe(true);
    }
  });

  it("open at /contact, /shipping and /pricing too", () => {
    expect(pub("index.html")).toContain("(privacy|terms|refund|contact|shipping|pricing)");
  });

  it("say who runs the site and how to reach them", () => {
    const contact = pub("contact.html");
    expect(contact).toContain("Nafees Ahmad (Proprietor)");
    expect(contact).toContain("mailto:nafeesahadbly@gmail.com");
    expect(contact).toContain("Bareilly, Uttar Pradesh, India");
  });

  it("say nothing is shipped and when a purchase arrives", () => {
    const shipping = pub("shipping.html").replace(/\s+/g, " ");
    expect(shipping).toContain("digital service");
    expect(shipping).toContain("no shipping");
  });

  it("list the same prices as the server's plans", () => {
    const pricing = pub("pricing.html");
    for (const price of ["₹99", "₹249", "₹49", "₹199", "₹29", "₹119"]) expect(pricing).toContain(price);
    expect(pricing).toContain("do not renew automatically");
  });

  it("are linked from every policy page and from the first screen", () => {
    for (const name of ["privacy.html", "terms.html", "refund.html", "contact.html", "shipping.html", "pricing.html"]) {
      const page = pub(name);
      for (const link of ["/contact.html", "/shipping.html", "/pricing.html", "/refund.html"]) {
        expect(page, `${name} → ${link}`).toContain(link);
      }
    }
    for (const label of ["Privacy", "Terms", "Refund", "Shipping", "Pricing", "Contact Us"]) {
      expect(welcome).toContain(`label: "${label}"`);
    }
  });
});
