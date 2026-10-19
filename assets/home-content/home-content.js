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
    shared as "Anyone with the link" - leave "" for no picture).

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
    titleEn: "Welcome to Amader Elaka (a New App)",
    titleBn: "আমাদের এলাকায় স্বাগতম",
    textEn: "Drivers, doctors and more of your area are being added step by step. Check back often.",
    textBn: "আপনার এলাকার ড্রাইভার, ডাক্তারসহ আরও অনেক তথ্য ধাপে ধাপে যুক্ত হচ্ছে। নিয়মিত দেখুন।",
    date: "",
    urgent: false,
    link: "",
    bgImage: "https://drive.google.com/file/d/16vtek6IELpey6VdJRngKvREFRPHAXCpL/view?usp=drivesdk"
  },
  {
    titleEn: "Follow our Facebook page",
    titleBn: "আমাদের ফেসবুক পেজ ফলো করুন",
    textEn: "A Facebook page has been opened in the name of Amader Elaka. Follow it to get new notices, news and updates first, and tell your friends too.",
    textBn: "আমাদের এলাকা নামে একটি ফেসবুক পেজ খোলা হয়েছে। নতুন নোটিশ, খবর ও আপডেট সবার আগে পেতে পেজটি ফলো করুন এবং বন্ধুদের জানান।",
    date: "",
    urgent: false,
    link: "https://www.facebook.com/REPLACE-WITH-PAGE-LINK",
    bgImage: "https://drive.google.com/file/d/16vtek6IELpey6VdJRngKvREFRPHAXCpL/view?usp=drivesdk"
  },
  {
    titleEn: "Bloodless circumcision with a machine",
    titleBn: "মেশিনের সাহায্যে রক্তপাতহীন মুসলমানি",
    textEn: "A doctor in our area performs circumcision (Musalmani) with a machine, with no bleeding. See the doctor's profile for details and contact.",
    textBn: "আমাদের এলাকায় একজন ডাক্তার আছেন, যিনি মেশিনের সাহায্যে মুসলমানি (খতনা) করান, এতে কোনো রক্তপাত হয় না। বিস্তারিত ও যোগাযোগের জন্য ডাক্তারের প্রোফাইল দেখুন।",
    date: "",
    urgent: false,
    link: "#/driver/DR1213",
    bgImage: "https://drive.google.com/file/d/16vtek6IELpey6VdJRngKvREFRPHAXCpL/view?usp=drivesdk"
  },
  {
    titleEn: "Saiful Tournament",
    titleBn: "সাইফুল টুর্নামেন্ট",
    textEn: "A big tournament, the Saiful Tournament, will be held in our area on Wednesday, 21 October 2026. Everyone is welcome to come and enjoy. Tap the button to see the venue on the map.",
    textBn: "বুধবার, ২১ অক্টোবর ২০২৬ তারিখে আমাদের এলাকায় বড় আকারের সাইফুল টুর্নামেন্ট অনুষ্ঠিত হবে। সবাই আমন্ত্রিত, এসে খেলা উপভোগ করুন। স্থান দেখতে নিচের বাটনে চাপুন।",
    date: "বুধবার, ২১ অক্টোবর ২০২৬",
    urgent: false,
    link: "https://www.google.com/maps/search/?api=1&query=REPLACE-WITH-TOURNAMENT-LOCATION",
    bgImage: "https://drive.google.com/file/d/16vtek6IELpey6VdJRngKvREFRPHAXCpL/view?usp=drivesdk"
  }
];

window.HOME_CATEGORIES = [
  { id: "drivers",   icon: "🚗", en: "Drivers",                bn: "ড্রাইভার",                  type: "drivers" },
  { id: "doctor",    icon: "🩺", en: "Doctors",                bn: "ডাক্তার",                   type: "doctor" },
  { id: "emergency", icon: "🚑", en: "Emergency",              bn: "জরুরি সেবা",                type: "emergency" },
  { id: "shop",      icon: "🛒", en: "Shops & Business",       bn: "দোকান ও ব্যবসা",            type: "other", slug: "shop" },
  { id: "mosque",    icon: "🕌", en: "Mosque & Madrasa",       bn: "মসজিদ ও মাদ্রাসা",          type: "other", slug: "mosque-madrasa" },
  { id: "notable",   icon: "🌟", en: "Notable People",         bn: "সুনামধন্য ব্যক্তি",         type: "other", slug: "notable-people" },
  { id: "sports",    icon: "⚽", en: "Sports & Tournaments",   bn: "খেলাধুলা ও টুর্নামেন্ট",    type: "other", slug: "sports" },
  { id: "education", icon: "🏫", en: "School & College",       bn: "স্কুল ও কলেজ",              type: "other", slug: "school-college" },
  { id: "other",     icon: "➕", en: "Others",                 bn: "অন্যান্য",                  type: "otherAll" }
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
