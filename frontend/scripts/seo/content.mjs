/**
 * The words of Apnajoda's public pages (for search engines and visitors).
 * Everything here describes what the app really does - no made-up numbers,
 * ratings or reviews. Run `node scripts/seo/build-seo.mjs` after a change.
 */

export const SITE = "https://apnajoda.com";
export const UPDATED = "2026-11-15";

/** Short facts reused across pages. */
export const FEATURES = [
  ["🛡️", "Selfie-verified profiles", "Members verify with a live selfie and earn a blue tick, so you know the person is real."],
  ["💍", "Built for marriage-minded people", "Profiles say what you are looking for, so serious people find each other faster."],
  ["🪐", "Kundli & Gun Milan", "Add your Rashi and Nakshatra if you follow kundli, and see your Gun score (out of 36) with a match. Fully optional."],
  ["✨", "Aaj ke 5 - daily picks", "A few thoughtful introductions every day, chosen for what you want from a relationship."],
  ["💬", "Chat, voice & video calls", "Talk inside the app before you share your number. Calls go through the app, not your phone number."],
  ["☕", "Meet up plans", "Suggest a safe public place and time for a first meeting, right from the chat."],
  ["🎲", "Play together", "Ludo with live voice and fun chat games break the ice better than small talk."],
  ["🔒", "Your privacy, your rules", "Private accounts, close friends for stories, block and report in two taps."],
];

export const FAQ = [
  ["Is Apnajoda free?", "Yes. You can create a profile, get daily picks, like, match, chat and call for free. Premium adds extras such as weekly Super Likes and Boosts."],
  ["Is Apnajoda only for India?", "Yes. Apnajoda is made for people living in India, with features like optional Kundli matching, festival themes and UPI payments."],
  ["How does verification work?", "You take a live selfie in a pose the app asks for. Our team checks it against your photos. Verified members get a blue tick."],
  ["Do I have to share my phone number with matches?", "No. You can chat, voice call and video call inside the app. Share your number only when you feel ready."],
  ["Is Kundli matching compulsory?", "No. It is completely optional and hidden from your public profile. Only people who add their Rashi and Nakshatra see Gun scores."],
  ["Can I use Apnajoda in a web browser?", "Yes. Open apnajoda.com in any browser on your phone or computer. You can also add it to your home screen like an app."],
  ["How do I stay safe?", "Meet in public places, tell a friend where you are going, never send money to someone you met online, and report anyone who makes you uncomfortable. Read our safety guide for more."],
  ["Can I delete my account?", "Yes. You can pause your account or delete it permanently from Settings at any time."],
];

/**
 * Cities: a line about the city and two well-known public places that suit
 * a first meeting. Keep these to widely known landmarks.
 */
export const CITIES = [
  { slug: "delhi", name: "Delhi", state: "Delhi", intro: "From Old Delhi's lanes to the cafes of Hauz Khas, Delhi moves fast - and so do its people. Apnajoda helps you slow down and meet someone who wants the same future as you.", spots: ["a walk at Lodhi Garden", "coffee near Connaught Place"] },
  { slug: "mumbai", name: "Mumbai", state: "Maharashtra", intro: "In a city that never stops, finding time for love is hard. Apnajoda shows you a few serious, verified people at a time, so every conversation counts.", spots: ["an evening walk on Marine Drive", "a cafe in Bandra"] },
  { slug: "bangalore", name: "Bengaluru", state: "Karnataka", intro: "Bengaluru's mix of startups, old neighbourhoods and people from every state makes it a great place to meet someone new. Apnajoda keeps it genuine with verified profiles.", spots: ["a morning walk in Cubbon Park", "filter coffee in Basavanagudi"] },
  { slug: "hyderabad", name: "Hyderabad", state: "Telangana", intro: "Hyderabad blends old-city charm with a booming tech life. Whether you grew up here or moved for work, Apnajoda helps you meet people looking for something real.", spots: ["an evening by Hussain Sagar", "a cafe in Banjara Hills"] },
  { slug: "chennai", name: "Chennai", state: "Tamil Nadu", intro: "Chennai values family, tradition and sincerity. Apnajoda fits right in - built for people who want a relationship that can lead to marriage.", spots: ["a walk on Besant Nagar beach", "coffee in Mylapore"] },
  { slug: "kolkata", name: "Kolkata", state: "West Bengal", intro: "The City of Joy loves long conversations over cha. Apnajoda gives you a calm place to start them with people who are serious about love.", spots: ["a stroll at Prinsep Ghat", "a cafe on Park Street"] },
  { slug: "pune", name: "Pune", state: "Maharashtra", intro: "Pune's students, professionals and old Puneri families make for a lively mix. Meet verified, marriage-minded people near you on Apnajoda.", spots: ["a walk in Koregaon Park", "breakfast on FC Road"] },
  { slug: "ahmedabad", name: "Ahmedabad", state: "Gujarat", intro: "Ahmedabad is warm, family-first and full of food. Apnajoda helps you find a partner who shares your values - with Kundli matching if you want it.", spots: ["an evening at the Sabarmati Riverfront", "a cafe near Law Garden"] },
  { slug: "jaipur", name: "Jaipur", state: "Rajasthan", intro: "The Pink City mixes royal heritage with a young, modern crowd. Apnajoda is a respectful way to meet someone in Jaipur who is looking for a lasting relationship.", spots: ["a walk at Central Park", "chai near MI Road"] },
  { slug: "lucknow", name: "Lucknow", state: "Uttar Pradesh", intro: "Lucknow is known for its tehzeeb - courtesy and grace. Apnajoda keeps dating just as respectful, with verified profiles and a focus on marriage.", spots: ["an evening at Gomti Riverfront", "kebabs in Aminabad"] },
  { slug: "chandigarh", name: "Chandigarh", state: "Chandigarh", intro: "Planned, green and friendly, Chandigarh is a lovely city to fall in love in. Meet serious, verified people from the Tricity on Apnajoda.", spots: ["a walk around Sukhna Lake", "coffee in Sector 17"] },
  { slug: "indore", name: "Indore", state: "Madhya Pradesh", intro: "India's cleanest city also has one of its friendliest crowds. Apnajoda helps people in Indore meet someone genuine for a relationship that lasts.", spots: ["late-night snacks at Sarafa Bazaar", "a cafe in Vijay Nagar"] },
  { slug: "bhopal", name: "Bhopal", state: "Madhya Pradesh", intro: "The City of Lakes has an easy, gentle pace. Apnajoda brings that same calm to dating - fewer swipes, more meaningful matches.", spots: ["an evening at Upper Lake (Bada Talab)", "a cafe on New Market road"] },
  { slug: "nagpur", name: "Nagpur", state: "Maharashtra", intro: "At the heart of India, Nagpur is close-knit and warm. Apnajoda helps you meet verified people nearby who are serious about the future.", spots: ["a walk at Futala Lake", "a cafe in Dharampeth"] },
  { slug: "surat", name: "Surat", state: "Gujarat", intro: "Surat is fast-growing, enterprising and food-loving. Meet someone who shares your values and family outlook on Apnajoda.", spots: ["an evening at Dumas beach", "a cafe in Vesu"] },
  { slug: "kochi", name: "Kochi", state: "Kerala", intro: "Kochi's sea breeze and easy-going life make it perfect for slow, meaningful dating. Apnajoda keeps it safe with verified profiles.", spots: ["a walk at Marine Drive, Kochi", "a cafe in Fort Kochi"] },
  { slug: "coimbatore", name: "Coimbatore", state: "Tamil Nadu", intro: "Coimbatore is calm, hardworking and rooted in family. Apnajoda helps you find a partner here with the same seriousness about marriage.", spots: ["an evening at Race Course", "coffee near RS Puram"] },
  { slug: "patna", name: "Patna", state: "Bihar", intro: "Patna's people value honesty and family. Apnajoda gives you a safe, respectful place to meet someone who is looking for the same.", spots: ["a walk at Eco Park", "a cafe on Boring Road"] },
  { slug: "bhubaneswar", name: "Bhubaneswar", state: "Odisha", intro: "The Temple City is growing into a modern hub. Meet verified, marriage-minded people in Bhubaneswar on Apnajoda.", spots: ["an evening at Ekamra Kanan", "a cafe in Saheed Nagar"] },
  { slug: "guwahati", name: "Guwahati", state: "Assam", intro: "The gateway to the Northeast brings people from many cultures together. Apnajoda helps you meet someone special here, safely.", spots: ["a walk along the Brahmaputra riverfront", "a cafe in Zoo Road area"] },
  { slug: "dehradun", name: "Dehradun", state: "Uttarakhand", intro: "With the hills close by and a relaxed pace, Dehradun is made for long talks. Find someone serious about love on Apnajoda.", spots: ["a walk on Rajpur Road", "coffee in a quiet Rajpur Road cafe"] },
  { slug: "varanasi", name: "Varanasi", state: "Uttar Pradesh", intro: "One of the world's oldest cities, Varanasi holds tradition close. Apnajoda respects that, with optional Kundli matching and a focus on marriage.", spots: ["an evening at Assi Ghat", "a cafe near BHU"] },
  { slug: "visakhapatnam", name: "Visakhapatnam", state: "Andhra Pradesh", intro: "Vizag's beaches and hills make every first meeting special. Meet verified, serious people near you on Apnajoda.", spots: ["a walk on RK Beach", "a cafe near Beach Road"] },
  { slug: "noida", name: "Noida", state: "Uttar Pradesh", intro: "Noida's young professionals have busy days and little time to waste. Apnajoda shows a few genuine matches daily, so you can focus on the right ones.", spots: ["a cafe in a Sector 18 mall", "a walk in a nearby park"] },
  { slug: "gurugram", name: "Gurugram", state: "Haryana", intro: "Gurugram works hard and lives fast. Apnajoda makes dating simple and safe, with verified people who want something real.", spots: ["a cafe at CyberHub", "a walk at Leisure Valley Park"] },
  { slug: "gwalior", name: "Gwalior", state: "Madhya Pradesh", intro: "Gwalior's history and close communities make trust important. Apnajoda builds that trust with selfie-verified profiles.", spots: ["an evening near Phool Bagh", "a cafe on City Centre road"] },
];

/** Blog articles: our own writing, practical and safe advice. */
export const ARTICLES = [
  {
    slug: "first-date-safety-tips",
    title: "First date safety tips for online dating in India",
    description: "Simple, practical ways to stay safe when you meet someone from a dating app for the first time - before, during and after the date.",
    sections: [
      ["Before you meet", "Talk inside the app first and have at least one video call. It confirms the person is who they say they are and that you actually enjoy talking. Look for a verified blue tick, and read their profile carefully - real people usually write real details. If something feels off, trust that feeling."],
      ["Choose a public place", "Pick a busy cafe, a mall food court or a well-known park in the daytime. Avoid homes, hotel rooms or isolated spots for a first meeting. On Apnajoda you can send a Meet up plan with a place and time from the chat, so both of you agree on it clearly."],
      ["Tell someone", "Share the person's name, profile and the meeting place with a friend or sibling. Agree on a time you will message them after the date. Keep your phone charged."],
      ["Travel on your own", "Reach the place and leave on your own - by your own vehicle, a cab you book or public transport. Do not accept a ride to or from a first date."],
      ["Money and personal details", "Never send money, share OTPs, bank details or documents with someone you met online, whatever the reason. A genuine person will not ask. Report anyone who does."],
      ["After the date", "If you did not feel comfortable, you do not owe anyone a second meeting. You can unmatch, block or report in two taps. If it went well - take your time, there is no hurry."],
    ],
  },
  {
    slug: "how-to-write-a-good-dating-profile",
    title: "How to write a dating profile that attracts serious matches",
    description: "Photos, bio and prompts that show the real you - and help marriage-minded people find you.",
    sections: [
      ["Start with clear, recent photos", "Use 4 to 6 photos taken in the last year. The first should show your face clearly, without sunglasses or heavy filters. Add one full-length photo and a couple that show what you enjoy - travel, cooking, sport or family moments."],
      ["Write a bio that sounds like you", "Two or three short lines are enough. Say what you do, what you enjoy on a weekend and what you are looking for. 'I teach maths, love long drives and want a partner who values family' says more than a list of adjectives."],
      ["Be honest about what you want", "If you are looking for marriage, say so. On Apnajoda, saying what you want helps the right people find you and saves everyone time."],
      ["Answer prompts with stories", "Instead of 'I love food', try 'My mother's rajma chawal is my love language'. Small, specific details start better conversations."],
      ["Get verified", "A verified blue tick tells others you are real. It takes a minute with a live selfie and makes people much more comfortable replying."],
      ["Keep it positive", "Avoid long lists of what you do not want. Focus on what you are excited about. Positive profiles get more thoughtful messages."],
    ],
  },
  {
    slug: "questions-to-ask-before-marriage",
    title: "25 questions to ask before marriage (and how to ask them)",
    description: "Thoughtful questions about family, money, career and everyday life to ask someone you are getting serious with.",
    sections: [
      ["Why these talks matter", "Love grows from shared values. Talking honestly about the big topics early helps you understand each other and avoid surprises later. Ask gently, share your own answers too, and listen without judging."],
      ["Family and living", "Where would you like to live after marriage - with family, on our own, or near family? How involved should parents be in our decisions? How do you see festivals and family functions? How often would you like to visit each side?"],
      ["Career and money", "What are your career plans for the next five years? Would you move cities for work? How should we manage money - joint, separate or both? What do you save for? How do you feel about loans and big purchases?"],
      ["Everyday life", "What does a perfect Sunday look like for you? How do you share housework? Are you a morning person or a night owl? How much time alone do you need? How do you like to celebrate birthdays?"],
      ["Children and the future", "Do you want children, and when? How would you like to raise them - values, schooling, languages? Who would take time off work, if needed?"],
      ["Conflict and support", "How do you handle anger or stress? What do you need from me when you are upset? How do you say sorry? What would make you feel respected in a marriage?"],
      ["Faith and traditions", "How important are religion and rituals to you? Do you follow kundli or astrology? Which traditions would you like to keep in our home?"],
    ],
  },
  {
    slug: "kundli-gun-milan-explained",
    title: "Kundli Gun Milan explained: what the 36 points mean",
    description: "A simple guide to Ashtakoot Gun Milan - the eight kootas, how the score out of 36 works, and how to use it alongside real compatibility.",
    sections: [
      ["What is Gun Milan?", "Gun Milan (Ashtakoot Milan) is a traditional way of comparing two horoscopes using the Moon's position at birth - the Rashi (Moon sign) and Nakshatra (lunar mansion). It gives a score out of 36 points across eight categories called kootas."],
      ["The eight kootas", "Varna (1 point), Vashya (2), Tara (3), Yoni (4), Graha Maitri (5), Gana (6), Bhakoot (7) and Nadi (8). Together they add up to 36. Each looks at a different side of compatibility, from temperament to health and family life, as traditional astrology describes it."],
      ["What do scores mean?", "Traditionally, 18 or more out of 36 is seen as acceptable, 24 and above as a good match, and above 28 as very good. Many families also look at Manglik status. Scores are a tradition many people value - not a guarantee."],
      ["How Apnajoda shows it", "On Apnajoda, Kundli is completely optional. If you add your Rashi and Nakshatra (you can choose them from your birth date and time), you will see a Gun score with matches who have added theirs. It never shows on your public profile, and Premium members can filter by a minimum score."],
      ["Balance tradition with real compatibility", "A great score cannot replace good conversation, shared values and mutual respect. Use Gun Milan as one input - and spend real time getting to know the person."],
    ],
  },
  {
    slug: "how-to-spot-online-dating-scams",
    title: "How to spot online dating scams (and what to do)",
    description: "Warning signs of romance scams and fake profiles, and the steps to take if someone asks you for money.",
    sections: [
      ["The most common trick", "Scammers build trust quickly, then invent an emergency - a hospital bill, a customs fee, a stuck payment - and ask for money or gift cards. A genuine person you have not met will not ask you for money."],
      ["Warning signs", "They avoid video calls, their photos look like a model's, they move the chat to another app straight away, they talk about love very fast, or their story keeps changing. Investment 'tips' and crypto offers are a big red flag."],
      ["Check before you trust", "Look for a verified blue tick. Ask for a quick video call inside the app. A real person will be happy to do it."],
      ["Never share these", "OTPs, UPI PINs, bank details, Aadhaar or PAN, or private photos. No real partner needs them."],
      ["If it happens to you", "Stop replying, do not send money, report the profile in the app and block it. If you have lost money, report it at cybercrime.gov.in or call the national cyber crime helpline 1930 as soon as possible."],
    ],
  },
];
