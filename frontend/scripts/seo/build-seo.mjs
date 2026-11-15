/**
 * Builds Apnajoda's public pages for search engines into public/:
 * about, features, how it works, safety, FAQ, marriage, verified, kundli,
 * a Hindi page, a page for each city, the blog, robots.txt and sitemap.xml.
 *
 *   node scripts/seo/build-seo.mjs
 *
 * Each page is plain, fast HTML (no app to load) with its own title,
 * description, canonical link, share card and structured data.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ARTICLES, CITIES, FAQ, FEATURES, SITE, UPDATED } from "./content.mjs";

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "public");
const pages = [];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const ld = (data) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;

const ORG = { "@type": "Organization", "@id": `${SITE}/#org`, name: "Apnajoda", url: `${SITE}/`, logo: `${SITE}/icon-512.png` };

const CSS = `
*{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Mukta,Roboto,sans-serif;color:#14202E;background:#FDF7F4;line-height:1.7}
a{color:#A8243A}header{background:#1F4D7A}header .in,main,footer .in{max-width:880px;margin:0 auto;padding:0 20px}
header .in{display:flex;align-items:center;gap:6px 16px;min-height:60px;flex-wrap:wrap;padding-top:10px;padding-bottom:10px}header .logo{color:#fff;font:600 22px Georgia,serif;text-decoration:none}
header nav{margin-left:auto;display:flex;gap:16px;flex-wrap:wrap}header nav a{color:#E8EEF7;text-decoration:none;font-size:14px}
.hero{background:linear-gradient(120deg,#1F4D7A,#A8243A);color:#fff;padding:48px 20px 40px}.hero .in{max-width:880px;margin:0 auto}
.hero h1{font:400 clamp(28px,5vw,44px)/1.2 Georgia,serif;margin:0 0 12px}.hero p{font-size:18px;opacity:.95;margin:0 0 22px;max-width:640px}
.btn{display:inline-block;background:#fff;color:#A8243A;font-weight:700;padding:13px 26px;border-radius:999px;text-decoration:none}
.btn.dark{background:#A8243A;color:#fff}
main{padding:28px 20px 40px}h2{font:400 26px/1.3 Georgia,serif;color:#1F4D7A;margin:32px 0 10px}h3{margin:20px 0 6px;font-size:18px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}.card{background:#fff;border-radius:16px;padding:16px;box-shadow:0 2px 10px rgba(20,32,46,.06)}
.card b{display:block;margin-bottom:4px}.crumbs{font-size:13px;color:#5A6878;margin-bottom:8px}.crumbs a{color:#5A6878}
.cities{display:flex;flex-wrap:wrap;gap:8px}.cities a{background:#fff;border:1px solid #E7DDD5;border-radius:999px;padding:6px 14px;text-decoration:none;color:#14202E;font-size:14px}
details{background:#fff;border-radius:12px;padding:12px 16px;margin:8px 0}summary{font-weight:700;cursor:pointer}
.cta{background:#fff;border-radius:20px;padding:22px;margin-top:30px;text-align:center;box-shadow:0 2px 10px rgba(20,32,46,.06)}
footer{background:#14202E;color:#C9D3DF;padding:28px 0;font-size:14px}footer a{color:#E8EEF7;text-decoration:none;margin-right:14px;line-height:2}
`;

const NAV = [
  ["/features/", "Features"],
  ["/how-it-works/", "How it works"],
  ["/safety/", "Safety"],
  ["/dating-in/", "Cities"],
  ["/blog/", "Blog"],
];

function layout({ path, title, description, h1, lead, body, schema = [], lang = "en", crumbs = null, ctaText = "Open Apnajoda - it's free" }) {
  const url = `${SITE}${path}`;
  pages.push({ path, title });
  const crumbList = crumbs
    ? {
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map(([name, href], i) => ({ "@type": "ListItem", position: i + 1, name, item: `${SITE}${href}` })),
      }
    : null;
  const html = `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#1F4D7A">
<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png?v=2">
<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2">
<link rel="alternate" hreflang="en-IN" href="${SITE}/">
<link rel="alternate" hreflang="hi-IN" href="${SITE}/hi/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Apnajoda">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="${lang === "hi" ? "hi_IN" : "en_IN"}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${SITE}/og-image.png">
${ld({ "@context": "https://schema.org", "@graph": [ORG, ...(crumbList ? [crumbList] : []), ...schema] })}
<style>${CSS.replace(/\n/g, "")}</style>
</head>
<body>
<header><div class="in"><a class="logo" href="/">Apnajoda</a><nav>${NAV.map(([h, t]) => `<a href="${h}">${t}</a>`).join("")}</nav></div></header>
<section class="hero"><div class="in">${crumbs ? `<div class="crumbs" style="color:#E8EEF7">${crumbs.map(([n, h]) => `<a style="color:#E8EEF7" href="${h}">${esc(n)}</a>`).join(" › ")}</div>` : ""}<h1>${esc(h1)}</h1><p>${esc(lead)}</p><a class="btn" href="/">${esc(ctaText)}</a></div></section>
<main>
${body}
<div class="cta"><h2 style="margin-top:0">${lang === "hi" ? "आज ही शुरू करें" : "Ready to meet someone serious?"}</h2><p>${lang === "hi" ? "Apnajoda पर प्रोफ़ाइल बनाना मुफ़्त है।" : "Create your free profile in a few minutes - on the web or as an app."}</p><a class="btn dark" href="/">${esc(ctaText)}</a></div>
</main>
<footer><div class="in">
<p><a href="/about/">About</a><a href="/features/">Features</a><a href="/how-it-works/">How it works</a><a href="/safety/">Safety</a><a href="/faq/">FAQ</a><a href="/kundli-matching/">Kundli matching</a><a href="/dating-app-for-marriage/">Dating for marriage</a><a href="/verified-dating-app-india/">Verified dating</a><a href="/dating-in/">Cities</a><a href="/blog/">Blog</a><a href="/hi/">हिन्दी</a></p>
<p><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a><a href="/refund.html">Refund</a><a href="/pricing.html">Pricing</a><a href="/contact.html">Contact</a></p>
<p>© ${UPDATED.slice(0, 4)} Apnajoda. Made in India, for India.</p>
</div></footer>
</body>
</html>
`;
  const file = path === "/" ? "index.html" : join(path.replace(/^\//, ""), "index.html");
  const out = join(PUBLIC, file);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
}

const featureGrid = (list = FEATURES) => `<div class="grid">${list.map(([icon, t, d]) => `<div class="card"><b>${icon} ${esc(t)}</b>${esc(d)}</div>`).join("")}</div>`;
const faqBlock = (list) => list.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("");
const faqSchema = (list) => ({ "@type": "FAQPage", mainEntity: list.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) });
const cityLinks = () => `<div class="cities">${CITIES.map((c) => `<a href="/dating-in/${c.slug}/">${esc(c.name)}</a>`).join("")}</div>`;
const APP = {
  "@type": "MobileApplication",
  name: "Apnajoda",
  operatingSystem: "Android, Web",
  applicationCategory: "LifestyleApplication",
  url: `${SITE}/`,
  description: "Serious, selfie-verified dating for marriage-minded people in India.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  publisher: { "@id": `${SITE}/#org` },
};

// ---- Pages ---------------------------------------------------------------

layout({
  path: "/about/",
  title: "About Apnajoda - Serious, Verified Dating for India",
  description: "Apnajoda is an Indian dating app for people who want a real relationship that can lead to marriage - with verified profiles, optional Kundli matching and safe in-app calls.",
  h1: "About Apnajoda",
  lead: "We built Apnajoda for people in India who are tired of endless swiping and want something real.",
  crumbs: [["Home", "/"], ["About", "/about/"]],
  schema: [{ "@type": "AboutPage", name: "About Apnajoda", url: `${SITE}/about/` }],
  body: `<h2>Why Apnajoda</h2><p>Most dating apps are built for quick swipes. Apnajoda is built for people who want a partner for life. Profiles say what each person is looking for, members verify themselves with a live selfie, and you get a few thoughtful introductions a day instead of an endless feed.</p>
<h2>Made for India</h2><p>Indian relationships involve families, traditions and values. That is why Apnajoda has optional Kundli & Gun Milan, festival themes, UPI payments and a strong focus on respect and safety. It is available only in India.</p>
<h2>What we believe</h2><p>Real people, honest profiles, and safety first. You decide who sees you, who can message you and when you share your number. Anyone who breaks the rules can be reported in two taps.</p>
<h2>What you can do</h2>${featureGrid()}`,
});

layout({
  path: "/features/",
  title: "Features - Verified Profiles, Kundli Match, Video Calls | Apnajoda",
  description: "Everything Apnajoda offers: selfie verification, daily picks, Kundli & Gun Milan, in-app voice and video calls, Meet up plans, Ludo with live voice and strong privacy controls.",
  h1: "Everything you need to find the one",
  lead: "Thoughtful features for meeting serious, verified people - and staying safe while you do.",
  crumbs: [["Home", "/"], ["Features", "/features/"]],
  schema: [APP],
  body: `${featureGrid()}
<h2>Stories, posts and more</h2><p>Share moments with stories (with music and stickers), post photos to your profile, and see who reacted. Keep some stories for close friends only.</p>
<h2>Premium</h2><p>The core of Apnajoda - profile, daily picks, likes, matches, chat and calls - is free. Premium adds extras such as weekly Super Likes and Boosts. See <a href="/pricing.html">pricing</a>.</p>`,
});

layout({
  path: "/how-it-works/",
  title: "How Apnajoda Works - From Profile to First Meeting",
  description: "Create your profile, verify with a selfie, get daily picks, match, chat and call safely in the app, then plan a meet up - here is how Apnajoda works.",
  h1: "How Apnajoda works",
  lead: "Five simple steps from signing up to a safe first meeting.",
  crumbs: [["Home", "/"], ["How it works", "/how-it-works/"]],
  schema: [
    {
      "@type": "HowTo",
      name: "How to find a serious match on Apnajoda",
      step: [
        ["Create your profile", "Add clear photos, a short bio and what you are looking for."],
        ["Verify yourself", "Take a live selfie to earn the blue tick."],
        ["Get daily picks", "See a few thoughtful introductions every day and like the ones you connect with."],
        ["Match and talk", "When you both like each other, chat, voice call or video call inside the app."],
        ["Plan a meet up", "Suggest a public place and time from the chat when you are both ready."],
      ].map(([name, text], i) => ({ "@type": "HowToStep", position: i + 1, name, text })),
    },
  ],
  body: `<h2>1. Create your profile</h2><p>Sign up with your phone or email, add 4-6 clear photos, write a short bio and say what you are looking for. Takes about five minutes.</p>
<h2>2. Verify yourself</h2><p>Take a live selfie in the pose the app shows. Once our team checks it, you get a blue tick - people reply much more to verified profiles.</p>
<h2>3. Get your daily picks</h2><p>Every day you see "Aaj ke 5" - a few introductions chosen for what you want. You can also browse and use match filters, including an optional minimum Gun score.</p>
<h2>4. Match and talk</h2><p>When you both like each other, it is a match. Chat, send voice notes, play a game together, and voice or video call - all without sharing your phone number.</p>
<h2>5. Plan a meet up</h2><p>When you are ready, send a Meet up plan with a public place and time. Read our <a href="/safety/">safety guide</a> before your first date.</p>`,
});

layout({
  path: "/safety/",
  title: "Dating Safety Tips & How Apnajoda Keeps You Safe",
  description: "How Apnajoda protects you - selfie verification, in-app calls, block and report - plus practical safety tips for online dating and first dates in India.",
  h1: "Your safety comes first",
  lead: "How Apnajoda keeps you safe, and simple habits that protect you when you date online.",
  crumbs: [["Home", "/"], ["Safety", "/safety/"]],
  body: `<h2>How Apnajoda protects you</h2><div class="grid">
<div class="card"><b>🛡️ Selfie verification</b>A live selfie checked by our team, so the blue tick means a real person.</div>
<div class="card"><b>📞 In-app calls</b>Voice and video calls go through the app - no need to share your number.</div>
<div class="card"><b>🚫 Block & report</b>Two taps to block or report anyone. Our team reviews every report.</div>
<div class="card"><b>🔒 Privacy controls</b>Private account, close friends for stories, and pause your account any time.</div></div>
<h2>Online dating safety tips</h2>
<h3>Video call before you meet</h3><p>A short video call inside the app confirms the person is real and helps you feel comfortable.</p>
<h3>Meet in public, travel on your own</h3><p>Choose a busy cafe or park in the daytime, and reach and leave on your own.</p>
<h3>Tell someone you trust</h3><p>Share who you are meeting, where and when. Message them after the date.</p>
<h3>Never send money</h3><p>No genuine match will ask for money, OTPs, UPI PINs or bank details. Report anyone who does.</p>
<h3>If you lose money to a scam</h3><p>Report it immediately at <a href="https://cybercrime.gov.in" rel="nofollow">cybercrime.gov.in</a> or call the national cyber crime helpline <b>1930</b>.</p>
<p>Read more: <a href="/blog/first-date-safety-tips/">first date safety tips</a> and <a href="/blog/how-to-spot-online-dating-scams/">how to spot dating scams</a>.</p>`,
});

layout({
  path: "/faq/",
  title: "Apnajoda FAQ - Common Questions Answered",
  description: "Answers about Apnajoda: is it free, how verification works, Kundli matching, using it in a browser, privacy and deleting your account.",
  h1: "Frequently asked questions",
  lead: "Quick answers to what people ask most about Apnajoda.",
  crumbs: [["Home", "/"], ["FAQ", "/faq/"]],
  schema: [faqSchema(FAQ)],
  body: faqBlock(FAQ),
});

layout({
  path: "/dating-app-for-marriage/",
  title: "Dating App for Marriage in India - Meet Serious, Verified Partners | Apnajoda",
  description: "Looking for a life partner? Apnajoda is a dating app for marriage-minded Indians - verified profiles, optional Kundli matching and a focus on real relationships.",
  h1: "A dating app for people who want to get married",
  lead: "Not a matrimony site, not a swipe app - a modern way for marriage-minded Indians to meet and get to know each other.",
  crumbs: [["Home", "/"], ["Dating for marriage", "/dating-app-for-marriage/"]],
  schema: [APP],
  body: `<h2>Dating with marriage in mind</h2><p>Many people want to choose their own partner but still want the seriousness of a family-arranged match. Apnajoda sits in between: you meet people yourself, talk freely, and everyone on it says up front that they are looking for something long-term.</p>
<h2>Why it works better than endless swiping</h2>${featureGrid(FEATURES.slice(0, 4))}
<h2>Questions to ask before you say yes</h2><p>Getting serious? Read our guide to <a href="/blog/questions-to-ask-before-marriage/">questions to ask before marriage</a> - about family, money, career and everyday life.</p>
<h2>Find people in your city</h2>${cityLinks()}`,
});

layout({
  path: "/verified-dating-app-india/",
  title: "Verified Dating App in India - Real People, Selfie Checked | Apnajoda",
  description: "Meet real people on a verified dating app in India. Apnajoda checks members with a live selfie, keeps calls in the app and makes blocking and reporting easy.",
  h1: "Verified dating for India",
  lead: "Fake profiles waste time and put people at risk. On Apnajoda, verified members carry a blue tick.",
  crumbs: [["Home", "/"], ["Verified dating", "/verified-dating-app-india/"]],
  schema: [APP],
  body: `<h2>How verification works</h2><p>You take a live selfie copying a pose the app shows. Our team compares it with your profile photos. If it matches, you get the blue tick. It takes about a minute.</p>
<h2>Why it matters</h2><p>Verified profiles get more replies because people trust them. And it makes it much harder for scammers and fake accounts to reach you.</p>
<h2>Safe from the first message</h2>${featureGrid([FEATURES[0], FEATURES[4], FEATURES[7], FEATURES[5]])}
<p>See our full <a href="/safety/">safety guide</a>.</p>`,
});

layout({
  path: "/kundli-matching/",
  title: "Kundli Matching & Gun Milan with Your Matches | Apnajoda",
  description: "See your Gun Milan score out of 36 with matches on Apnajoda. Add your Rashi and Nakshatra (or pick them from your birth details) - optional and private.",
  h1: "Kundli matching, built into dating",
  lead: "If you follow kundli, see your Ashtakoot Gun score with each match - without leaving the app.",
  crumbs: [["Home", "/"], ["Kundli matching", "/kundli-matching/"]],
  schema: [faqSchema([
    ["Is Kundli matching on Apnajoda free?", "Yes. Adding your Rashi and Nakshatra and seeing Gun scores with matches is free. Premium members can also filter matches by a minimum score."],
    ["Do I need my birth time?", "You can choose your Rashi and Nakshatra directly, or work them out from your birth date and time in the app. Your birth details are not stored."],
    ["Will others see my kundli?", "No. It never shows on your public profile. Gun scores appear only between people who have both added their details."],
  ])],
  body: `<h2>How it works</h2><p>Go to Settings › Kundli & Gun Milan, add your Rashi (Moon sign) and Nakshatra, and say if you are Manglik. When a match has added theirs too, you will see your Gun score out of 36 and a breakdown of the eight kootas.</p>
<h2>Optional and private</h2><p>Many people do not follow kundli, so it is completely optional and hidden from your profile. Only you decide whether to use it.</p>
<h2>Learn more</h2><p>New to Gun Milan? Read <a href="/blog/kundli-gun-milan-explained/">Kundli Gun Milan explained</a>.</p>`,
});

// Hindi
layout({
  path: "/hi/",
  lang: "hi",
  title: "Apnajoda - शादी के लिए भरोसेमंद डेटिंग ऐप | वेरिफ़ाइड प्रोफ़ाइल",
  description: "Apnajoda भारत का डेटिंग ऐप है उन लोगों के लिए जो सच्चा रिश्ता और शादी चाहते हैं - सेल्फ़ी से वेरिफ़ाइड प्रोफ़ाइल, कुंडली गुण मिलान और ऐप के अंदर सुरक्षित कॉल।",
  h1: "शादी के लिए भरोसेमंद डेटिंग ऐप",
  lead: "बेवजह स्वाइप नहीं - असली, वेरिफ़ाइड लोग जो लंबा रिश्ता चाहते हैं।",
  ctaText: "Apnajoda खोलें - मुफ़्त",
  schema: [APP],
  body: `<h2>Apnajoda क्यों?</h2><div class="grid">
<div class="card"><b>🛡️ वेरिफ़ाइड प्रोफ़ाइल</b>लाइव सेल्फ़ी से पहचान की जाँच, ताकि आप जानें कि सामने वाला असली है।</div>
<div class="card"><b>💍 शादी के लिए गंभीर लोग</b>हर प्रोफ़ाइल बताती है कि व्यक्ति क्या ढूँढ रहा है।</div>
<div class="card"><b>🪐 कुंडली और गुण मिलान</b>अपनी राशि और नक्षत्र जोड़ें और मैच के साथ 36 में से गुण देखें। पूरी तरह वैकल्पिक।</div>
<div class="card"><b>📞 सुरक्षित कॉल</b>नंबर दिए बिना ऐप के अंदर चैट, वॉइस और वीडियो कॉल।</div></div>
<h2>कैसे शुरू करें</h2><p>प्रोफ़ाइल बनाएँ, सेल्फ़ी से वेरिफ़ाई करें, रोज़ "आज के 5" देखें, मैच होने पर बात करें, और तैयार होने पर किसी सार्वजनिक जगह पर मिलने का प्लान बनाएँ।</p>
<h2>सुरक्षा सबसे पहले</h2><p>पहली मुलाक़ात सार्वजनिक जगह पर करें, किसी भरोसेमंद व्यक्ति को बताएँ, और किसी को भी पैसे, OTP या बैंक जानकारी न दें। ठगी होने पर <a href="https://cybercrime.gov.in" rel="nofollow">cybercrime.gov.in</a> पर शिकायत करें या <b>1930</b> पर कॉल करें।</p>
<h2>आपके शहर में</h2>${cityLinks()}`,
});

// Cities
layout({
  path: "/dating-in/",
  title: "Dating in Indian Cities - Meet Verified Singles Near You | Apnajoda",
  description: "Apnajoda is available across India. Find serious, verified singles in Delhi, Mumbai, Bengaluru, Hyderabad, Chennai, Kolkata, Pune, Jaipur, Lucknow and more.",
  h1: "Meet serious singles across India",
  lead: "Apnajoda works everywhere in India. Pick your city to see how dating works there.",
  crumbs: [["Home", "/"], ["Cities", "/dating-in/"]],
  body: `${cityLinks()}<h2>Not in the list?</h2><p>Apnajoda works in every city and town in India - these are just a few. Sign up and set your location to meet people near you.</p>`,
});

for (const city of CITIES) {
  const qa = [
    [`Is Apnajoda available in ${city.name}?`, `Yes. Apnajoda works across ${city.state} and all of India. Set your location to ${city.name} to meet people nearby.`],
    [`Where should I meet my match in ${city.name} for the first time?`, `Choose a busy public place in the daytime - for example ${city.spots[0]} or ${city.spots[1]}. Tell a friend where you are going and travel on your own.`],
    ["Are profiles verified?", "Members verify with a live selfie and get a blue tick. Look for it before you meet anyone."],
  ];
  layout({
    path: `/dating-in/${city.slug}/`,
    title: `Dating in ${city.name} - Meet Serious, Verified Singles | Apnajoda`,
    description: `Looking for a serious relationship in ${city.name}? Meet selfie-verified, marriage-minded singles in ${city.name}, ${city.state} on Apnajoda. Free to join.`,
    h1: `Dating in ${city.name}`,
    lead: city.intro,
    crumbs: [["Home", "/"], ["Cities", "/dating-in/"], [city.name, `/dating-in/${city.slug}/`]],
    schema: [faqSchema(qa)],
    body: `<h2>Why people in ${esc(city.name)} use Apnajoda</h2>${featureGrid(FEATURES.slice(0, 6))}
<h2>Ideas for a first meeting in ${esc(city.name)}</h2><p>Keep the first meeting short, public and in daylight - ${esc(city.spots[0])}, or ${esc(city.spots[1])}. You can send a Meet up plan with the place and time right from the chat.</p>
<h2>Questions about dating in ${esc(city.name)}</h2>${faqBlock(qa)}
<h2>Other cities</h2>${cityLinks()}`,
  });
}

// Blog
layout({
  path: "/blog/",
  title: "Apnajoda Blog - Dating, Relationships & Safety Tips for India",
  description: "Practical advice on online dating in India: first date safety, writing a great profile, questions to ask before marriage, Kundli Gun Milan and avoiding scams.",
  h1: "The Apnajoda blog",
  lead: "Honest, practical advice for dating with marriage in mind.",
  crumbs: [["Home", "/"], ["Blog", "/blog/"]],
  schema: [{ "@type": "Blog", name: "Apnajoda Blog", url: `${SITE}/blog/`, publisher: { "@id": `${SITE}/#org` } }],
  body: `<div class="grid">${ARTICLES.map((a) => `<a class="card" style="text-decoration:none;color:inherit" href="/blog/${a.slug}/"><b>${esc(a.title)}</b>${esc(a.description)}</a>`).join("")}</div>`,
});

for (const article of ARTICLES) {
  layout({
    path: `/blog/${article.slug}/`,
    title: `${article.title} | Apnajoda`,
    description: article.description,
    h1: article.title,
    lead: article.description,
    crumbs: [["Home", "/"], ["Blog", "/blog/"], [article.title, `/blog/${article.slug}/`]],
    schema: [
      {
        "@type": "Article",
        headline: article.title,
        description: article.description,
        datePublished: UPDATED,
        dateModified: UPDATED,
        author: { "@id": `${SITE}/#org` },
        publisher: { "@id": `${SITE}/#org` },
        image: `${SITE}/og-image.png`,
        mainEntityOfPage: `${SITE}/blog/${article.slug}/`,
      },
    ],
    body: `${article.sections.map(([h, p]) => `<h2>${esc(h)}</h2><p>${esc(p)}</p>`).join("\n")}
<h2>More from the blog</h2><p>${ARTICLES.filter((a) => a.slug !== article.slug)
      .map((a) => `<a href="/blog/${a.slug}/">${esc(a.title)}</a>`)
      .join(" · ")}</p>`,
  });
}

// ---- robots.txt and sitemap.xml -------------------------------------------

const legal = ["/privacy.html", "/terms.html", "/refund.html", "/pricing.html", "/contact.html", "/shipping.html"];
const priority = (path) => (path === "/" ? "1.0" : /^\/(features|dating-app-for-marriage|verified-dating-app-india|hi)\/$/.test(path) ? "0.9" : path.startsWith("/dating-in/") || path.startsWith("/blog/") ? "0.7" : legal.includes(path) ? "0.3" : "0.8");
const urls = ["/", ...pages.map((p) => p.path), ...legal];
writeFileSync(
  join(PUBLIC, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${UPDATED}</lastmod><priority>${priority(u)}</priority></url>`).join("\n")}
</urlset>
`,
);

writeFileSync(
  join(PUBLIC, "robots.txt"),
  `# Apnajoda - public pages are open to search engines.
# Members' profiles, posts, stories, chats and shared links are private: never indexed.
User-agent: *
Allow: /
Disallow: /api/
Disallow: /uploads/
Disallow: /*?share=
Disallow: /*?post=
Disallow: /*?story=
Disallow: /*?chat=
Disallow: /*?ludo=
Disallow: /*?invite=
Disallow: /*?screen=

Sitemap: ${SITE}/sitemap.xml
`,
);

console.log(`Built ${pages.length} pages, robots.txt and sitemap.xml (${urls.length} URLs).`);
