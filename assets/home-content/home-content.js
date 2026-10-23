/*
  Home page content — edit this file to change the notices and the category cards.
  No backend or Google Sheet work is needed for anything in this file.

  NOTICES
  - Shown in the "Notices & News" section under the banner (newest first, in the order written here).
  - To remove the section completely, make the list empty: window.HOME_NOTICES = [];
  - Fields: titleEn, titleBn, textEn, textBn (any may be left empty), date (text shown as-is),
    urgent (true = red highlight), link (optional web address; adds a "Read more" button.
    Write "#/driver/<Driver ID>" to open that driver/doctor profile inside the app, on the same page, without reloading),
    bgImage (optional Google Drive photo link used as that notice's own background picture; the Drive file must be
    shared as "Anyone with the link" - leave "" for no picture). A picture file in assets/banner-images/ named
    home-notice-01.jpg, home-notice-02.jpg ... (notice 1, notice 2 ... in the order written here) is used first;
    bgImage is used only when that file is not there.

  LIVE COUNTDOWN INSIDE A HOME NOTICE (textEn / textBn)
  - Write [[timer:YYYY-MM-DD HH:mm]] anywhere inside the text, 24-hour time, Bangladesh time. Example:
    textBn: "আজকের ইফতার: [[timer:2027-02-20 17:52]]"
  - It shows a live countdown (days only while at least one day is left, then hours:minutes and smaller seconds).
    When the time is over it stays on screen as 00:00:00, struck through, in red with "সময় শেষ" / "Time's up".
  - Works in the home notices only (not in CATEGORY_NOTICES). No backend or Google Sheet work is needed.

  CATEGORIES
  - type "drivers"   -> opens the driver flow of the chosen bazar
  - type "doctor"    -> opens the doctor list
  - type "emergency" -> opens the emergency list
  - type "other"     -> opens the Other Section category whose English-name slug equals "slug"
                        (slug = the "English Name" in the Vehicle Categories sheet, lower-case, spaces as "-").
                        The card shows "Coming soon" until at least one approved profile exists
                        for that category in the chosen bazar.
  - type "otherAll"  -> opens the full Other Section list
  - To hide a card, delete its line. To add a card, copy a line and change it.

  HOME CATEGORY CARD PHOTOS
  - Each card above can show a photo next to its emoji icon (same look as the bazar and vehicle cards).
  - Put a .jpg in assets/local-photos/categories/ named exactly like the card's id:
    drivers.jpg, doctor.jpg, emergency.jpg, shop.jpg, mosque.jpg, notable.jpg, sports.jpg, education.jpg, other.jpg
    (for a new card, use the id you wrote on its line, e.g. id: "farm" -> farm.jpg).
  - No file = the card simply shows its emoji icon, as before. No code change or backend work is needed.

  CATEGORY_NOTICES
  - A notice box shown ONLY inside the chosen category's page, directly above the first profile card
    (banner, search and everything else stay as they are). A category with no entry shows no notice.
  - The key is the category slug: the slug of the Vehicle Categories sheet row (its "English Name" in lower-case, spaces as "-"),
    e.g. "sports", "mosque-madrasa", "school-college", "shop", "notable-people", or a driver vehicle slug such as "cng" / "auto".
    The Doctors page uses "doctor" and the Emergency page uses "emergency".
  - Each category holds a list; every { ... } is one notice, shown in the order written. Fields are the same as NOTICES above:
    titleEn, titleBn, textEn, textBn (any may be left empty), date (text shown as-is, e.g. a day and time),
    urgent (true = red highlight and an "Urgent" tag), link (optional web address; adds a "Read more" button).
  - To remove a notice, delete its { ... } block. To remove all notices of a category, make its list empty ( [] ) or delete the category line.

  CATEGORY_EXTRA_FIELDS
  - Extra detail boxes shown in the application form, the profile edit form and the detail page
    for a category. The key is the category slug; up to 4 boxes per category (Extra 1 to Extra 4 in the sheet).
  - Each box needs an English and a Bangla label. Use the same slug as in the cards above.
  - Works for any category slug, including new ones you add. The boxes appear in the application form
    (step 2) only after that category is ticked; one box takes the full line, two boxes sit side by side,
    three boxes are two + one, four boxes are two + two.
  - A box with key: "qualification" is saved in the Qualification column (it does not use up Extra 1 to 4).
    The doctor category uses it. Change its en / bn text to rename the box, or delete the line to remove it.
*/
window.HOME_NOTICES = [
  {
    titleEn: "✨ Welcome to Amader Elaka 🏡",
    titleBn: "✨ 'আমাদের এলাকা' অ্যাপে আপনাকে স্বাগতম 🏡",
    textEn: "Welcome to our platform! 🚀 Find drivers, doctors, and essential local services right at your fingertips. 📲 Scroll down now to explore all services and contacts! 👇✨",
    textBn: "আমাদের প্ল্যাটফর্মে আপনাকে স্বাগতম! 🚀 এখন আপনার এলাকার ড্রাইভার, ডাক্তারসহ যাবতীয় প্রয়োজনীয় সেবা পেয়ে যাবেন হাতের নাগালেই। 📲 প্রয়োজনীয় সেবা পেতে এখনই নিচে দেখুন! 👇✨",
    date: "",
    urgent: false,
    link: "",
    bgImage: "https://drive.google.com/file/d/16vtek6IELpey6VdJRngKvREFRPHAXCpL/view?usp=drivesdk"
  },
  {
    titleEn: "✨ Holy Shab-e-Meraj Notice 🌙",
    titleBn: "✨ পবিত্র শবে মেরাজ বিজ্ঞপ্তি 🌙",
    textEn: "The holy Shab-e-Meraj will be observed on Tuesday night, January 5, 2027. Time remaining: [[timer:2027-01-05 17:45]]. 🤲 May this blessed night bring endless peace, divine blessings, and forgiveness to everyone. 🤍",
    textBn: "আগামী ৫ জানুয়ারি, ২০২৭ মঙ্গলবার রাতে পবিত্র শবে মেরাজ পালিত হবে। 🌙 বরকতময় এই রাত আসতে আর মাত্র: [[timer:2027-01-05 17:45]] বাকি। 🤲 পবিত্র এই রাতে সবার সর্বাঙ্গীন মঙ্গল, শান্তি ও ক্ষমা প্রার্থনা করছি। 🤍",
    date: "05-01-2027",
    urgent: true,
    link: "https://www.facebook.com/share/v/1FNbv5gDST/",
    bgImage: "https://drive.google.com/file/d/16vtek6IELpey6VdJRngKvREFRPHAXCpL/view?usp=drivesdk"
  },
  {
    titleEn: "🩸 Modern Bloodless Circumcision 🩺",
    titleBn: "🩺 আধুনিক মেশিনের সাহায্যে রক্তপাতহীন খতনা ✨",
    textEn: "Dr. Sala Uddin at Bangla Bazar performs safe circumcision using a digital machine with no bleeding, no stitches, and no bandages. 🩹✨ Check the doctor's profile for full details and contact info.",
    textBn: "বাংলা বাজারের ছালা উদ্দিন ডাক্তার এখন ডিজিটাল মেশিনের সাহায্যে সম্পূর্ণ রক্তপাতহীন, সেলাই ও ব্যান্ডেজবিহীন আধুনিক পদ্ধতিতে মুসলমানি (খতনা) করান। 🩺✨ বিস্তারিত জানতে ও যোগাযোগের জন্য ডাক্তারের প্রোফাইলটি দেখে নিন। 📱",
    date: "",
    urgent: false,
    link: "#/driver/DR1213",
    bgImage: "https://drive.google.com/file/d/16vtek6IELpey6VdJRngKvREFRPHAXCpL/view?usp=drivesdk"
  },
  {
    titleEn: "🗳️ Choose Qualified & Honest Leaders 🤝",
    titleBn: "🗳️ যোগ্য ও সৎ জনপ্রতিনিধি নির্বাচন করুন 🤝",
    textEn: "Upcoming local elections are around the corner! 🗳️ Since Union Members and Chairmen are the pillars of local development, choose based on personal character and qualifications, not party lines. ✨ Elect honest candidates to ensure true progress for our area. 🏡🙌",
    textBn: "আর কিছুদিন পরেই আসছে স্থানীয় মেম্বার ও চেয়ারম্যান নির্বাচন! 🗳️ যেহেতু মেম্বার ও চেয়ারম্যানগণ আমাদের এলাকার উন্নয়নের মূল ভিত্তি, তাই দল না দেখে প্রার্থীর সততা, মেধা ও গুণাবলী বিবেচনা করুন। ✨ এলাকার সঠিক উন্নয়নের জন্য যোগ্য মানুষকে ভোট দিয়ে জয়যুক্ত করুন। 🏡🙌",
    date: "",
    urgent: false,
    link: "https://www.facebook.com/share/1DmGpfAYn6/",
    bgImage: "https://drive.google.com/file/d/16vtek6IELpey6VdJRngKvREFRPHAXCpL/view?usp=drivesdk"
  },
];

window.HOME_CATEGORIES = [
  { id: "drivers",   icon: "🚗", en: "Drivers",                bn: "ড্রাইভার",             type: "drivers" },
  { id: "doctor",    icon: "🩺", en: "Doctors",                bn: "ডাক্তার",              type: "doctor" },
  { id: "emergency", icon: "🚑", en: "Emergency",              bn: "জরুরি সেবা",          type: "emergency" },
  { id: "shop",      icon: "🛒", en: "Shops & Business",       bn: "দোকান ও ব্যবসা",       type: "other", slug: "shop" },
  { id: "mosque",    icon: "🕌", en: "Mosque & Madrasa",       bn: "মসজিদ ও মাদ্রাসা",      type: "other", slug: "mosque-madrasa" },
  { id: "education", icon: "🏫", en: "School & College",       bn: "স্কুল ও কলেজ",         type: "other", slug: "school-college" },
  { id: "government", icon: "🧑‍✈️", en: "Union Parishad",        bn: "ইউনিয়ন পরিষদ",        type: "other", slug: "union-parishad" },
  { id: "sports",    icon: "⚽", en: "Sports & Tournaments",   bn: "খেলাধুলা ও টুর্নামেন্ট",     type: "other", slug: "sports" },
  { id: "other",     icon: "➕", en: "Others",                 bn: "অন্যান্য",               type: "otherAll" }
];

window.CATEGORY_EXTRA_FIELDS = {
  "doctor": [
    { key: "qualification", en: "Qualification / Specialty", bn: "ডিগ্রি / বিশেষজ্ঞতা" }
  ],
  "sports": [
    { en: "Date", bn: "তারিখ" },
    { en: "Venue", bn: "স্থান" },
    { en: "Organizer", bn: "আয়োজক" },
    { en: "Result", bn: "ফলাফল" }
  ],
  "mosque-madrasa": [
    { en: "Prayer times", bn: "নামাজের সময়" },
    { en: "Imam / Head contact number", bn: "ইমাম / মুহতামিমের নম্বর" }
  ]
};

window.CATEGORY_NOTICES = {
  "sports": [
    {
      titleEn: "Match tomorrow",
      titleBn: "আগামীকাল খেলা",
      textEn: "A match will be played tomorrow, Thursday, at 3:00 PM in the afternoon. Everyone is welcome to come and cheer.",
      textBn: "আগামীকাল বৃহস্পতিবার বিকাল ৩:০০ টায় খেলা অনুষ্ঠিত হবে। সবাই আমন্ত্রিত, এসে খেলা উপভোগ করুন।",
      date: "বৃহস্পতিবার, বিকাল ৩:০০",
      urgent: false,
      link: ""
    },
    {
      titleEn: "Yesterday's match is over",
      titleBn: "গতকালের খেলা সম্পন্ন",
      textEn: "A match was played yesterday. Thank you to everyone who came.",
      textBn: "গতকাল একটি খেলা অনুষ্ঠিত হয়েছে। যারা এসেছিলেন সবাইকে ধন্যবাদ।",
      date: "গতকাল",
      urgent: false,
      link: ""
    }
  ]
};
