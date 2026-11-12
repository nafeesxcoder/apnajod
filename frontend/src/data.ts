export type Match = {
  id: string; profileId?: string; matchId?: string; name: string; age: number; city: string; profession: string;
  gender: 'woman' | 'man' | 'nonbinary';
  intent: string; match: 'Strong Match' | 'Great Match' | 'Exceptional Match';
  /** Set only when a human approved their selfie. Absent means not verified. */
  verified?: boolean;
  /** Approved selfie AND Plus/Pro. The server never sets it without `verified`. */
  blueTick?: boolean;
  vibes: string[]; photo: string; photos: string[]; about: string; values: string; goals: string;
  timeline: string; children: string; family: string; relocation: string; languages: string[];
  interests: string[]; familyPriority: 'high' | 'balanced' | 'independent';
  vouches: { count: number; qualities: string[] };
  reasons?: string[];
  modelVersion?: string;
  hobbies?: string[]; // <-- YEH ADD KARO
};

export const matches: Match[] = [
  {
    id: '1', name: 'Anika', age: 29, city: 'Mumbai, MH', profession: 'Product Designer',
    gender: 'woman',
    intent: 'Long-term, leading to Marriage', match: 'Exceptional Match', vibes: ['Family First', 'Ambitious', 'Foodie'],
    photo: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1000&q=88',
    photos: ['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1000&q=88','https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?auto=format&fit=crop&w=1000&q=88'],
    about: 'Designer by day, amateur pasta critic by night. I value warmth, curiosity, and people who mean what they say.',
    values: 'Family, emotional honesty, and building a life that leaves room for joy.',
    goals: 'Create a beautiful home, see more of the world, and build something lasting with my person.',
    timeline: 'Marriage in 1–2 years', children: 'Wants children', family: 'Family is deeply important', relocation: 'Open for the right person', languages: ['English','Hindi'], interests:['family dinners','design','home building','food walks'], familyPriority:'high', vouches:{count:2,qualities:['Thoughtful','Dependable','Shows up for people']}
  },
  {
    id: '2', name: 'Meera', age: 31, city: 'Pune, MH', profession: 'Pediatrician',
    gender: 'woman',
    intent: 'Marriage', match: 'Great Match', vibes: ['Spiritual', 'Travel Lover', 'Simple Life'],
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=88',
    photos: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=88'],
    about: 'Calm energy, quick laugh. Weekends are for farmers markets, long calls home, and planning the next trip.',
    values: 'Kindness, loyalty, and keeping both families close.',
    goals: 'A grounded partnership, a lively home, and plenty of passport stamps.',
    timeline: 'Marriage in 1–2 years', children: 'Wants children', family: 'Balanced family involvement', relocation: 'Prefers to stay in Texas', languages: ['English','Gujarati','Hindi'], interests:['family time','temple mornings','travel','chai dates'], familyPriority:'balanced', vouches:{count:3,qualities:['Warm','Emotionally mature','Family-minded']}
  },
  {
    id: '3', name: 'Riya', age: 28, city: 'Bengaluru, KA', profession: 'Founder',
    gender: 'woman',
    intent: 'Long-term Relationship', match: 'Strong Match', vibes: ['Business Minded', 'Fitness Focused', 'Ambitious'],
    photo: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1000&q=88',
    photos: ['https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1000&q=88'],
    about: 'Building a company and a meaningful life. I like early hikes, sharp ideas, and soft-hearted people.',
    values: 'Growth, consistency, generosity, and a genuine partnership.',
    goals: 'Build boldly, love deeply, and never stop learning.',
    timeline: 'Marriage in 2–3 years', children: 'Open to children', family: 'Balanced family involvement', relocation: 'Open to discuss', languages: ['English','Hindi','Punjabi'], interests:['startups','fitness','family boundaries','weekend hikes'], familyPriority:'balanced', vouches:{count:2,qualities:['Driven','Loyal','Great listener']}
  },
  {
    id: '4', name: 'Kavya', age: 27, city: 'Delhi, DL', profession: 'Finance Manager',
    gender: 'woman',
    intent: 'Marriage', match: 'Exceptional Match', vibes: ['Family First', 'Spiritual', 'Simple Life'],
    photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1000&q=88',
    photos: ['https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1000&q=88'],
    about: 'I’m close to my family, serious about faith and values, and happiest around a warm dinner table.',
    values: 'Respect, patience, family, and a calm home where both people feel safe.',
    goals: 'Marriage with friendship at the center, kids when the time is right, and a home full of laughter.',
    timeline: 'Marriage in 1–2 years', children: 'Wants children', family: 'Family is deeply important', relocation: 'Open for the right person', languages: ['English','Hindi','Marathi'], interests:['family gatherings','spiritual life','home cooking','long walks'], familyPriority:'high', vouches:{count:3,qualities:['Grounded','Family-minded','Kind']}
  },
  {
    id: '5', name: 'Naina', age: 32, city: 'Hyderabad, TG', profession: 'Software Engineer',
    gender: 'woman',
    intent: 'Long-term, leading to Marriage', match: 'Great Match', vibes: ['Travel Lover', 'Foodie', 'Ambitious'],
    photo: 'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?auto=format&fit=crop&w=1000&q=88',
    photos: ['https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?auto=format&fit=crop&w=1000&q=88'],
    about: 'Techie with a soft spot for old Bollywood songs, thoughtful dates, and spontaneous weekend trips.',
    values: 'Partnership, honesty, curiosity, and building a life that still feels playful.',
    goals: 'A stable relationship, travel memories, and eventually a beautiful home with the right person.',
    timeline: 'Marriage in 2–3 years', children: 'Open to children', family: 'Close, with healthy boundaries', relocation: 'Open to discuss', languages: ['English','Hindi','Telugu'], interests:['travel','restaurants','career growth','music nights'], familyPriority:'balanced', vouches:{count:2,qualities:['Optimistic','Smart','Reliable']}
  },
  {
    id: '6', name: 'Simran', age: 30, city: 'Chandigarh, CH', profession: 'Product Manager',
    gender: 'woman',
    intent: 'Marriage', match: 'Exceptional Match', vibes: ['Family First', 'Culture Proud', 'Ambitious'],
    photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1000&q=88',
    photos: ['https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1000&q=88'],
    about: 'Punjabi heart, city-life energy. I love thoughtful conversations, wedding playlists, and building with someone steady.',
    values: 'Respect, family, consistency, and choosing each other every day.',
    goals: 'A joyful marriage, a warm home, and a partner who feels like best friend plus family.',
    timeline: 'Marriage in 1–2 years', children: 'Wants children', family: 'Family is deeply important', relocation: 'Open for the right person', languages: ['English','Punjabi','Hindi'], interests:['Punjabi music','family events','career growth','home dinners'], familyPriority:'high', vouches:{count:3,qualities:['Loyal','Family-minded','Ambitious']}
  },
  {
    id: '7', name: 'Jasleen', age: 27, city: 'Kochi, KL', profession: 'UX Researcher',
    gender: 'woman',
    intent: 'Long-term, leading to Marriage', match: 'Great Match', vibes: ['Spiritual', 'Creative Soul', 'Travel Lover'],
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1000&q=88',
    photos: ['https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1000&q=88'],
    about: 'Soft-spoken until the bhangra starts. I’m into meaningful design, mountain weekends, and emotionally mature love.',
    values: 'Faith, empathy, loyalty, and making space for both families.',
    goals: 'Grow slowly and intentionally toward marriage with someone kind and clear.',
    timeline: 'Marriage in 2–3 years', children: 'Open to children', family: 'Close, with healthy boundaries', relocation: 'Open to discuss', languages: ['English','Punjabi'], interests:['design','gurdwara mornings','mountains','music nights'], familyPriority:'balanced', vouches:{count:2,qualities:['Gentle','Creative','Grounded']}
  },
  {
    id: '8', name: 'Priya', age: 33, city: 'Chennai, TN', profession: 'Data Scientist',
    gender: 'woman',
    intent: 'Marriage', match: 'Strong Match', vibes: ['Book Lover', 'Ambitious', 'Home Builder'],
    photo: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=1000&q=88',
    photos: ['https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=1000&q=88'],
    about: 'Numbers at work, novels at night. I like calm confidence, shared routines, and people who keep their word.',
    values: 'Stability, intellectual curiosity, family respect, and sincere communication.',
    goals: 'A peaceful marriage, a beautiful library wall, and a life with purpose.',
    timeline: 'Marriage in 1–2 years', children: 'Wants children', family: 'Balanced family involvement', relocation: 'Open for the right person', languages: ['English','Tamil','Hindi'], interests:['books','data','temple visits','home projects'], familyPriority:'balanced', vouches:{count:1,qualities:['Thoughtful','Sharp','Reliable']}
  },
  {
    id: '9', name: 'Aisha', age: 29, city: 'Ahmedabad, GJ', profession: 'Attorney',
    gender: 'woman',
    intent: 'Long-term, leading to Marriage', match: 'Great Match', vibes: ['Family First', 'Emotionally Mature', 'Community Minded'],
    photo: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=1000&q=88',
    photos: ['https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=1000&q=88'],
    about: 'I care about justice, Sunday brunch, and families who become one bigger family with time.',
    values: 'Faith, kindness, accountability, and protecting each other’s peace.',
    goals: 'A respectful partnership that grows into marriage, family, and shared service.',
    timeline: 'Marriage in 1–2 years', children: 'Wants children', family: 'Family is deeply important', relocation: 'Prefers to stay in Texas', languages: ['English','Urdu','Hindi'], interests:['community work','family dinners','brunch','faith'], familyPriority:'high', vouches:{count:2,qualities:['Principled','Warm','Protective']}
  },
  {
    id: '10', name: 'Emily', age: 28, city: 'Jaipur, RJ', profession: 'Nurse Practitioner',
    gender: 'woman',
    intent: 'Long-term Relationship', match: 'Strong Match', vibes: ['Fitness Focused', 'Pet Lover', 'Simple Life'],
    photo: 'https://images.unsplash.com/photo-1512316609839-ce289d3eba0a?auto=format&fit=crop&w=1000&q=88',
    photos: ['https://images.unsplash.com/photo-1512316609839-ce289d3eba0a?auto=format&fit=crop&w=1000&q=88'],
    about: 'Healthcare, hikes, and a golden retriever named Maple. Looking for calm love with real future energy.',
    values: 'Compassion, honesty, health, and showing up when life gets busy.',
    goals: 'A committed relationship, future marriage if it feels right, and a home with lots of fresh air.',
    timeline: 'Marriage in 2–3 years', children: 'Open to children', family: 'Close, with healthy boundaries', relocation: 'Open to discuss', languages: ['English'], interests:['hiking','dogs','wellness','simple weekends'], familyPriority:'balanced', vouches:{count:2,qualities:['Caring','Consistent','Easygoing']}
  },
  {
    id: '11', name: 'Sophia', age: 31, city: 'Kolkata, WB', profession: 'Film Producer',
    gender: 'woman',
    intent: 'Long-term, leading to Marriage', match: 'Great Match', vibes: ['Creative Soul', 'Music Nights', 'Ambitious'],
    photo: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=1000&q=88',
    photos: ['https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=1000&q=88'],
    about: 'Creative career, old-school heart. I love cinema, live music, and people who are kind when no one is watching.',
    values: 'Creativity, loyalty, emotional openness, and making ordinary days feel special.',
    goals: 'Build a beautiful partnership that supports both dreams and downtime.',
    timeline: 'Marriage in 2–3 years', children: 'Open to children', family: 'Balanced family involvement', relocation: 'Open to discuss', languages: ['English','Spanish'], interests:['films','concerts','creative work','date nights'], familyPriority:'balanced', vouches:{count:1,qualities:['Creative','Generous','Honest']}
  },
  {
    id: '12', name: 'Harleen', age: 26, city: 'Indore, MP', profession: 'Marketing Lead',
    gender: 'woman',
    intent: 'Marriage', match: 'Exceptional Match', vibes: ['Foodie', 'Culture Proud', 'Family First'],
    photo: 'https://images.unsplash.com/photo-1546961329-78bef0414d7c?auto=format&fit=crop&w=1000&q=88',
    photos: ['https://images.unsplash.com/photo-1546961329-78bef0414d7c?auto=format&fit=crop&w=1000&q=88'],
    about: 'Big family, bigger laugh. I’m happiest around Punjabi food, road trips, and people who respect elders.',
    values: 'Family unity, patience, shared ambition, and celebrating culture with pride.',
    goals: 'A marriage full of teamwork, laughter, and Sunday dinners that become tradition.',
    timeline: 'Marriage in 1–2 years', children: 'Wants children', family: 'Family is deeply important', relocation: 'Open for the right person', languages: ['English','Punjabi','Hindi'], interests:['Punjabi food','family parties','road trips','marketing'], familyPriority:'high', vouches:{count:3,qualities:['Joyful','Family-minded','Confident']}
  },
  {
    id: '13', name: 'Maya', age: 30, city: 'Delhi, DL', profession: 'Architect',
    gender: 'woman',
    intent: 'Long-term, leading to Marriage', match: 'Great Match', vibes: ['Home Builder', 'Creative Soul', 'Travel Lover'],
    photo: 'https://images.unsplash.com/photo-1517365830460-955ce3ccd263?auto=format&fit=crop&w=1000&q=88',
    photos: ['https://images.unsplash.com/photo-1517365830460-955ce3ccd263?auto=format&fit=crop&w=1000&q=88'],
    about: 'I design spaces and daydream about the one I’ll build with my person. Good coffee is my love language.',
    values: 'Beauty, effort, family respect, and honest conversations before ego.',
    goals: 'Marriage, travel, and a home that feels like both of us.',
    timeline: 'Marriage in 2–3 years', children: 'Open to children', family: 'Close, with healthy boundaries', relocation: 'Open to discuss', languages: ['English','Hindi'], interests:['architecture','coffee','travel','home design'], familyPriority:'balanced', vouches:{count:2,qualities:['Tasteful','Steady','Curious']}
  },
  {
    id: '14', name: 'Lauren', age: 32, city: 'Hyderabad, TG', profession: 'Sustainability Consultant',
    gender: 'woman',
    intent: 'Marriage', match: 'Strong Match', vibes: ['Simple Life', 'Pet Lover', 'Book Lover'],
    photo: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1000&q=88',
    photos: ['https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1000&q=88'],
    about: 'Quiet mornings, meaningful work, and a home with plants in every room. Serious about love, not drama.',
    values: 'Simplicity, kindness, sustainability, and building trust slowly.',
    goals: 'A grounded marriage, shared routines, and a life that feels peaceful.',
    timeline: 'Marriage in 1–2 years', children: 'Open to children', family: 'Balanced family involvement', relocation: 'Prefers to stay in Pacific Northwest', languages: ['English'], interests:['reading','dogs','sustainability','farmers markets'], familyPriority:'balanced', vouches:{count:1,qualities:['Grounded','Kind','Patient']}
  },
  {
    id: '15', name: 'Tanvi', age: 28, city: 'Coimbatore, TN', profession: 'Dentist',
    gender: 'woman',
    intent: 'Marriage', match: 'Great Match', vibes: ['Fitness Focused', 'Family First', 'Spiritual'],
    photo: 'https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?auto=format&fit=crop&w=1000&q=88',
    photos: ['https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?auto=format&fit=crop&w=1000&q=88'],
    about: 'Early workouts, late-night garba playlists, and a very serious chai standard.',
    values: 'Health, faith, family, and mutual encouragement.',
    goals: 'A marriage where both people feel chosen, supported, and proud of the life they’re building.',
    timeline: 'Marriage in 1–2 years', children: 'Wants children', family: 'Family is deeply important', relocation: 'Open for the right person', languages: ['English','Marathi','Hindi'], interests:['fitness','garba','chai','family trips'], familyPriority:'high', vouches:{count:2,qualities:['Disciplined','Warm','Faithful']}
  },
  {
    id: '16', name: 'Noor', age: 29, city: 'Lucknow, UP', profession: 'Pharmacist',
    gender: 'woman',
    intent: 'Long-term, leading to Marriage', match: 'Exceptional Match', vibes: ['Spiritual', 'Family First', 'Emotionally Mature'],
    photo: 'https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&w=1000&q=88',
    photos: ['https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&w=1000&q=88'],
    about: 'Calm, intentional, and close with family. I admire people who are soft-hearted and steady-minded.',
    values: 'Faith, compassion, accountability, and emotional safety.',
    goals: 'A respectful marriage, children if blessed, and a home that feels peaceful.',
    timeline: 'Marriage in 1–2 years', children: 'Wants children', family: 'Family is deeply important', relocation: 'Prefers to stay in Texas', languages: ['English','Punjabi','Urdu'], interests:['faith','family dinners','health','quiet cafés'], familyPriority:'high', vouches:{count:3,qualities:['Peaceful','Faithful','Dependable']}
  },
  {
    id: '17', name: 'Rachel', age: 27, city: 'Mumbai, MH', profession: 'Teacher',
    gender: 'woman',
    intent: 'Long-term Relationship', match: 'Strong Match', vibes: ['Community Minded', 'Book Lover', 'Simple Life'],
    photo: 'https://images.unsplash.com/photo-1542596594-649edbc13630?auto=format&fit=crop&w=1000&q=88',
    photos: ['https://images.unsplash.com/photo-1542596594-649edbc13630?auto=format&fit=crop&w=1000&q=88'],
    about: 'Teaching keeps me hopeful. I love museums, bookstores, and people who are gentle with the world.',
    values: 'Kindness, patience, learning, and doing the small things well.',
    goals: 'A committed partnership that grows naturally toward a shared future.',
    timeline: 'Marriage in 2–3 years', children: 'Open to children', family: 'Close, with healthy boundaries', relocation: 'Open to discuss', languages: ['English'], interests:['teaching','museums','books','community'], familyPriority:'balanced', vouches:{count:1,qualities:['Patient','Thoughtful','Kind']}
  },
  {
    id: '18', name: 'Gurleen', age: 31, city: 'Surat, GJ', profession: 'Financial Analyst',
    gender: 'woman',
    intent: 'Marriage', match: 'Great Match', vibes: ['Business Minded', 'Family First', 'Culture Proud'],
    photo: 'https://images.unsplash.com/photo-1534751516642-a1af1ef26a56?auto=format&fit=crop&w=1000&q=88',
    photos: ['https://images.unsplash.com/photo-1534751516642-a1af1ef26a56?auto=format&fit=crop&w=1000&q=88'],
    about: 'Practical with a romantic side. I love Punjabi weddings, smart money plans, and a man with clear intentions.',
    values: 'Financial stability, family respect, faith, and real commitment.',
    goals: 'Marriage, a solid home base, and building wealth without losing warmth.',
    timeline: 'Marriage in 1–2 years', children: 'Wants children', family: 'Family is deeply important', relocation: 'Open for the right person', languages: ['English','Punjabi'], interests:['finance','Punjabi culture','family events','travel'], familyPriority:'high', vouches:{count:2,qualities:['Responsible','Loyal','Practical']}
  },
  {
    id: '19', name: 'Pooja', age: 34, city: 'Nagpur, MH', profession: 'HR Director',
    gender: 'woman',
    intent: 'Marriage', match: 'Strong Match', vibes: ['Emotionally Mature', 'Home Builder', 'Foodie'],
    photo: 'https://images.unsplash.com/photo-1524503033411-c9566986fc8f?auto=format&fit=crop&w=1000&q=88',
    photos: ['https://images.unsplash.com/photo-1524503033411-c9566986fc8f?auto=format&fit=crop&w=1000&q=88'],
    about: 'Emotionally direct, family-aware, and still goofy around the right people. I make excellent undhiyu.',
    values: 'Maturity, humor, stability, and both families feeling respected.',
    goals: 'A peaceful marriage, traditions that feel ours, and a full dinner table.',
    timeline: 'Marriage in 1–2 years', children: 'Open to children', family: 'Balanced family involvement', relocation: 'Open to discuss', languages: ['English','Gujarati','Hindi'], interests:['cooking','people culture','family time','home hosting'], familyPriority:'balanced', vouches:{count:3,qualities:['Mature','Funny','Nurturing']}
  },
  {
    id: '20', name: 'Amrita', age: 29, city: 'Noida, UP', profession: 'Physician Assistant',
    gender: 'woman',
    intent: 'Long-term, leading to Marriage', match: 'Great Match', vibes: ['Spiritual', 'Family First', 'Fitness Focused'],
    photo: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=88',
    photos: ['https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=88'],
    about: 'I’m close to my parents, love morning workouts, and believe the right person makes life softer.',
    values: 'Family, faith, wellness, and emotional security.',
    goals: 'A serious relationship that moves with clarity toward marriage.',
    timeline: 'Marriage in 1–2 years', children: 'Wants children', family: 'Family is deeply important', relocation: 'Open for the right person', languages: ['English','Punjabi','Hindi'], interests:['healthcare','fitness','family calls','spiritual growth'], familyPriority:'high', vouches:{count:2,qualities:['Caring','Stable','Sincere']}
  },
  {
    id: '21', name: 'Ava', age: 30, city: 'Goa, GA', profession: 'Interior Designer',
    gender: 'woman',
    intent: 'Long-term Relationship', match: 'Strong Match', vibes: ['Creative Soul', 'Home Builder', 'Foodie'],
    photo: 'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=1000&q=88',
    photos: ['https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=1000&q=88'],
    about: 'Designing homes made me want one with the right person. I’m playful, warm, and serious when it matters.',
    values: 'Creativity, honesty, affection, and shared effort.',
    goals: 'A committed future, beautiful spaces, and little traditions that become ours.',
    timeline: 'Marriage in 2–3 years', children: 'Open to children', family: 'Close, with healthy boundaries', relocation: 'Open to discuss', languages: ['English'], interests:['interiors','restaurants','beach walks','hosting'], familyPriority:'balanced', vouches:{count:1,qualities:['Stylish','Warm','Fun']}
  },
  {
    id: '22', name: 'Neha', age: 26, city: 'Bhopal, MP', profession: 'Software Engineer',
    gender: 'woman',
    intent: 'Long-term, leading to Marriage', match: 'Great Match', vibes: ['Ambitious', 'Book Lover', 'Fitness Focused'],
    photo: 'https://images.unsplash.com/photo-1526510747491-58f928ec870f?auto=format&fit=crop&w=1000&q=88',
    photos: ['https://images.unsplash.com/photo-1526510747491-58f928ec870f?auto=format&fit=crop&w=1000&q=88'],
    about: 'Career-focused but not career-only. I’m into strength training, fantasy novels, and honest communication.',
    values: 'Growth, loyalty, healthy boundaries, and being kind under pressure.',
    goals: 'Build a strong relationship first, then marriage when both families and hearts are ready.',
    timeline: 'Marriage in 2–3 years', children: 'Open to children', family: 'Close, with healthy boundaries', relocation: 'Open to discuss', languages: ['English','Hindi'], interests:['coding','reading','lifting','family boundaries'], familyPriority:'balanced', vouches:{count:2,qualities:['Driven','Honest','Thoughtful']}
  },
  {
    id: '23', name: 'Kiran', age: 33, city: 'Visakhapatnam, AP', profession: 'Operations Manager',
    gender: 'woman',
    intent: 'Marriage', match: 'Strong Match', vibes: ['Simple Life', 'Family First', 'Culture Proud'],
    photo: 'https://images.unsplash.com/photo-1491349174775-aaafddd81942?auto=format&fit=crop&w=1000&q=88',
    photos: ['https://images.unsplash.com/photo-1491349174775-aaafddd81942?auto=format&fit=crop&w=1000&q=88'],
    about: 'I like calm routines, Punjabi food, and people who understand that love is also responsibility.',
    values: 'Commitment, family, simplicity, and steady communication.',
    goals: 'A marriage with peace, trust, and a home where everyone feels welcome.',
    timeline: 'Marriage in 1–2 years', children: 'Wants children', family: 'Family is deeply important', relocation: 'Open for the right person', languages: ['English','Punjabi'], interests:['operations','family dinners','culture','quiet weekends'], familyPriority:'high', vouches:{count:2,qualities:['Responsible','Warm','Steady']}
  },
  {
    id: '24', name: 'Olivia', age: 29, city: 'Pune, MH', profession: 'Product Marketer',
    gender: 'woman',
    intent: 'Long-term Relationship', match: 'Great Match', vibes: ['Travel Lover', 'Business Minded', 'Music Nights'],
    photo: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=1000&q=88',
    photos: ['https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=1000&q=88'],
    about: 'Strategic at work, spontaneous on weekends. Looking for someone emotionally available and future-minded.',
    values: 'Ambition, kindness, communication, and building memories with intention.',
    goals: 'A real relationship that can become marriage, plus a life with music, travel, and good friends.',
    timeline: 'Marriage in 2–3 years', children: 'Open to children', family: 'Balanced family involvement', relocation: 'Open to discuss', languages: ['English'], interests:['marketing','live music','travel','startups'], familyPriority:'balanced', vouches:{count:1,qualities:['Confident','Open','Fun']}
  },
  {
    id: '25', name: 'Shreya', age: 31, city: 'Gurugram, HR', profession: 'Policy Advisor',
    gender: 'woman',
    intent: 'Marriage', match: 'Exceptional Match', vibes: ['Ambitious', 'Community Minded', 'Spiritual'],
    photo: 'https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?auto=format&fit=crop&w=1000&q=88',
    photos: ['https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?auto=format&fit=crop&w=1000&q=88'],
    about: 'Purpose-driven, family-rooted, and fond of long walks after serious conversations.',
    values: 'Service, faith, family respect, and growing together with humility.',
    goals: 'Marriage with meaning, shared impact, and a home that welcomes both ambition and rest.',
    timeline: 'Marriage in 1–2 years', children: 'Wants children', family: 'Balanced family involvement', relocation: 'Open for the right person', languages: ['English','Hindi','Bengali'], interests:['policy','community','spirituality','walks'], familyPriority:'balanced', vouches:{count:2,qualities:['Purposeful','Kind','Wise']}
  }
];

export const vibes = [
  'Family First',
  'Ambitious',
  'Travel Lover',
  'Fitness Focused',
  'Spiritual',
  'Foodie',
  'Business Minded',
  'Simple Life',
  'Emotionally Mature',
  'Creative Soul',
  'Home Builder',
  'Culture Proud',
  'Pet Lover',
  'Book Lover',
  'Music Nights',
  'Community Minded',
];

export const religions = [
  'Prefer not to say',
  'Hindu',
  'Sikh',
  'Muslim',
  'Christian',
  'Jain',
  'Buddhist',
  'Jewish',
  'Zoroastrian / Parsi',
  'Spiritual',
  'Agnostic',
  'Atheist',
  'Other',
];

export const profileCities = [
  'Mumbai, MH','Delhi, DL','Bengaluru, KA','Hyderabad, TG','Ahmedabad, GJ','Chennai, TN','Kolkata, WB','Pune, MH','Jaipur, RJ','Surat, GJ',
  'Lucknow, UP','Kanpur, UP','Nagpur, MH','Indore, MP','Thane, MH','Bhopal, MP','Visakhapatnam, AP','Patna, BR','Vadodara, GJ','Ghaziabad, UP',
  'Ludhiana, PB','Agra, UP','Nashik, MH','Faridabad, HR','Meerut, UP','Rajkot, GJ','Varanasi, UP','Srinagar, JK','Aurangabad, MH','Dhanbad, JH',
  'Amritsar, PB','Navi Mumbai, MH','Allahabad, UP','Ranchi, JH','Howrah, WB','Coimbatore, TN','Jabalpur, MP','Gwalior, MP','Vijayawada, AP','Jodhpur, RJ',
  'Madurai, TN','Raipur, CT','Kota, RJ','Chandigarh, CH','Guwahati, AS','Solapur, MH','Hubli, KA','Mysuru, KA','Tiruchirappalli, TN','Bareilly, UP',
  'Aligarh, UP','Tiruppur, TN','Moradabad, UP','Jalandhar, PB','Bhubaneswar, OR','Salem, TN','Warangal, TG','Guntur, AP','Bhiwandi, MH','Saharanpur, UP',
  'Gorakhpur, UP','Bikaner, RJ','Amravati, MH','Noida, UP','Jamshedpur, JH','Bhilai, CT','Cuttack, OR','Firozabad, UP','Kochi, KL','Dehradun, UT',
  'Durgapur, WB','Asansol, WB','Nanded, MH','Kolhapur, MH','Ajmer, RJ','Gulbarga, KA','Jamnagar, GJ','Ujjain, MP','Siliguri, WB','Jhansi, UP',
  'Gurugram, HR','Thiruvananthapuram, KL','Mangaluru, KA','Udaipur, RJ','Tirunelveli, TN','Malegaon, MH','Gaya, BR','Jalgaon, MH','Bhavnagar, GJ','Panaji, GA',
  'Shimla, HP','Imphal, MN','Shillong, ML','Aizawl, MZ','Kohima, NL','Agartala, TR','Gangtok, SK','Itanagar, AR','Puducherry, PY','Port Blair, AN',
];
