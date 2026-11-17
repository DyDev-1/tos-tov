import type { PlaceDetails } from "@/lib/validation/place-details";

// Sample places so every screen has something to show during development.
// Coordinates are approximate and fees are left empty on purpose: check and correct them
// before launch. Khmer text should be reviewed by a native speaker.

export type SeedPlace = {
  slug: string;
  nameEn: string;
  nameKm: string;
  taglineEn: string;
  taglineKm: string;
  descriptionEn: string;
  descriptionKm: string;
  province: string; // province slug
  category: string; // category slug
  lat: number;
  lng: number;
  entryFeeKhr?: number | null;
  entryFeeUsd?: number | null;
  bestMonths: number[];
  avoidMonths: number[];
  details: PlaceDetails;
  likesCount: number;
  addedBy: string; // seed user key
  hoursAgo: number;
};

export const seedUsers = [
  { key: "dara", name: "Dara" },
  { key: "lina", name: "Lina" },
  { key: "sokha", name: "Sokha" },
  { key: "tom", name: "Tom" },
  { key: "vanna", name: "Vanna" },
  { key: "emma", name: "Emma" },
] as const;

export const seedPlaces: SeedPlace[] = [
  {
    slug: "bou-sra-waterfall",
    nameEn: "Bou Sra Waterfall",
    nameKm: "ទឹកធ្លាក់ប៊ូស្រា",
    taglineEn: "Full flow after the rains",
    taglineKm: "ទឹកហូរខ្លាំងក្រោយរដូវភ្លៀង",
    descriptionEn:
      "A two-tier waterfall in the forest east of Sen Monorom, loudest and fullest in the months after the rains. Steps lead down to the base of each tier.",
    descriptionKm:
      "ទឹកធ្លាក់ពីរជាន់នៅក្នុងព្រៃខាងកើតក្រុងសែនមនោរម្យ ទឹកហូរខ្លាំងបំផុតក្នុងខែក្រោយរដូវភ្លៀង។ មានជណ្ដើរចុះទៅដល់ជើងទឹកធ្លាក់នីមួយៗ។",
    province: "mondulkiri",
    category: "waterfalls",
    lat: 12.5135,
    lng: 107.4287,
    bestMonths: [7, 8, 9, 10, 11, 12],
    avoidMonths: [3, 4],
    likesCount: 1248,
    addedBy: "sokha",
    hoursAgo: 24 * 14,
    details: {
      ticket: { en: "Pay at the gate, no pass needed", km: "បង់នៅច្រកចូល មិនចាំបាច់មានប័ណ្ណឆ្លងកាត់" },
      dressCode: { en: "None", km: "គ្មានតម្រូវការ" },
      whatToBring: { en: "Shoes with grip, water, rain jacket", km: "ស្បែកជើងមានកៅស៊ូតោង ទឹកផឹក អាវភ្លៀង" },
      difficulty: { en: "Easy, with steep wet steps", km: "ងាយស្រួល ប៉ុន្តែមានជណ្ដើរចោតសើម" },
      nearestTown: { en: "About 43 km from Sen Monorom", km: "ប្រហែល ៤៣ គីឡូម៉ែត្រពីក្រុងសែនមនោរម្យ" },
      transport: { en: "Motorbike, car, or hired driver", km: "ម៉ូតូ ឡាន ឬជួលអ្នកបើកបរ" },
      road: { en: "Paved all the way", km: "ផ្លូវចាក់កៅស៊ូពេញខ្សែ" },
      openingHours: { en: "Daylight hours", km: "ម៉ោងពេលថ្ងៃ" },
      timeNeeded: { en: "2 to 3 hours", km: "២ ទៅ ៣ ម៉ោង" },
      facilities: { en: "Parking, toilets, food stalls", km: "ចំណតរថយន្ត បន្ទប់ទឹក តូបអាហារ" },
      avoidNote: {
        en: "March and April: very little water. The falls can shrink to a trickle at the end of the dry season.",
        km: "ខែមីនា និងមេសា៖ មានទឹកតិចណាស់។ ទឹកធ្លាក់អាចស្ងួតស្ទើរអស់នៅចុងរដូវប្រាំង។",
      },
    },
  },
  {
    slug: "angkor-wat",
    nameEn: "Angkor Wat",
    nameKm: "អង្គរវត្ត",
    taglineEn: "Cool, dry mornings",
    taglineKm: "ព្រឹកត្រជាក់ និងស្ងួត",
    descriptionEn:
      "The largest temple of the Angkor complex. Arrive before sunrise to watch the towers appear over the moat.",
    descriptionKm:
      "ប្រាសាទធំបំផុតក្នុងរមណីយដ្ឋានអង្គរ។ មកដល់មុនថ្ងៃរះ ដើម្បីមើលប៉ម​លេចឡើងពីលើទឹកលេណ្ឌ។",
    province: "siem-reap",
    category: "temples",
    lat: 13.4125,
    lng: 103.867,
    entryFeeKhr: 0,
    bestMonths: [11, 12, 1, 2],
    avoidMonths: [],
    likesCount: 3902,
    addedBy: "dara",
    hoursAgo: 24 * 30,
    details: {
      ticket: {
        en: "Foreigners need an Angkor pass. Cambodians enter free with ID.",
        km: "ជនបរទេសត្រូវមានប័ណ្ណអង្គរ។ ជនជាតិខ្មែរចូលដោយឥតគិតថ្លៃ ដោយបង្ហាញអត្តសញ្ញាណប័ណ្ណ។",
      },
      dressCode: { en: "Cover shoulders and knees", km: "ត្រូវគ្របស្មា និងជង្គង់" },
      nearestTown: { en: "About 6 km from Siem Reap town", km: "ប្រហែល ៦ គីឡូម៉ែត្រពីក្រុងសៀមរាប" },
      transport: { en: "Tuk-tuk, bicycle, or hired car", km: "ឡានតុកតុក កង់ ឬជួលឡាន" },
      timeNeeded: { en: "Half a day", km: "កន្លះថ្ងៃ" },
    },
  },
  {
    slug: "long-set-beach",
    nameEn: "Long Set Beach, Koh Rong",
    nameKm: "ឆ្នេរឡុងសិត កោះរ៉ុង",
    taglineEn: "Calm seas return",
    taglineKm: "សមុទ្រស្ងប់ឡើងវិញ",
    descriptionEn: "A long white-sand beach on the quiet side of Koh Rong, reached by boat from Sihanoukville.",
    descriptionKm: "ឆ្នេរខ្សាច់ស វែងនៅផ្នែកស្ងប់ស្ងាត់នៃកោះរ៉ុង ធ្វើដំណើរតាមទូកពីក្រុងព្រះសីហនុ។",
    province: "preah-sihanouk",
    category: "beaches",
    lat: 10.6094,
    lng: 103.2889,
    bestMonths: [11, 12, 1, 2, 3, 4],
    avoidMonths: [8, 9],
    likesCount: 2116,
    addedBy: "tom",
    hoursAgo: 24 * 9,
    details: {
      transport: { en: "Boat from Sihanoukville", km: "ទូកពីក្រុងព្រះសីហនុ" },
      whatToBring: { en: "Sunscreen, water, cash", km: "ឡេការពារកម្តៅថ្ងៃ ទឹកផឹក លុយសាច់ប្រាក់" },
      avoidNote: {
        en: "August and September: rough seas, some boats do not run.",
        km: "ខែសីហា និងកញ្ញា៖ សមុទ្របក់ខ្លាំង ទូកខ្លះមិនដំណើរការ។",
      },
    },
  },
  {
    slug: "phnom-chhngok-cave-temple",
    nameEn: "Phnom Chhngok Cave Temple",
    nameKm: "ប្រាសាទរូងភ្នំឆ្ងោក",
    taglineEn: "A small temple inside a cave",
    taglineKm: "ប្រាសាទតូចនៅក្នុងរូងភ្នំ",
    descriptionEn: "A small brick temple from the pre-Angkor period, built inside a limestone cave near Kampot.",
    descriptionKm: "ប្រាសាទឥដ្ឋតូចមួយពីសម័យមុនអង្គរ សង់នៅក្នុងរូងភ្នំថ្មកំបោរក្បែរខេត្តកំពត។",
    province: "kampot",
    category: "temples",
    lat: 10.6425,
    lng: 104.1218,
    bestMonths: [11, 12, 1, 2],
    avoidMonths: [],
    likesCount: 412,
    addedBy: "dara",
    hoursAgo: 2,
    details: {
      whatToBring: { en: "A torch, shoes with grip", km: "ពិលអគ្គិសនី ស្បែកជើងមានកៅស៊ូតោង" },
      timeNeeded: { en: "About 1 hour", km: "ប្រហែល ១ ម៉ោង" },
    },
  },
  {
    slug: "kep-crab-market",
    nameEn: "Kep Crab Market",
    nameKm: "ផ្សារក្តាមកែប",
    taglineEn: "Fresh crab by the sea",
    taglineKm: "ក្តាមស្រស់ក្បែរមាត់សមុទ្រ",
    descriptionEn: "Seafood stalls on the waterfront where crabs are cooked fresh. Try the Kampot pepper crab.",
    descriptionKm: "តូបអាហារសមុទ្រនៅមាត់សមុទ្រ ដែលចម្អិនក្តាមស្រស់ៗ។ សូមសាកល្បងក្តាមឆាម្រេចកំពត។",
    province: "kep",
    category: "food",
    lat: 10.483,
    lng: 104.318,
    bestMonths: [11, 12, 1, 2, 3],
    avoidMonths: [],
    likesCount: 880,
    addedBy: "lina",
    hoursAgo: 5,
    details: {
      openingHours: { en: "Morning to evening", km: "ពីព្រឹកដល់ល្ងាច" },
      facilities: { en: "Tables by the sea, toilets", km: "តុអង្គុយមាត់សមុទ្រ បន្ទប់ទឹក" },
    },
  },
  {
    slug: "chambok-waterfall",
    nameEn: "Chambok Waterfall",
    nameKm: "ទឹកធ្លាក់ចំបក់",
    taglineEn: "A community-run forest trail",
    taglineKm: "ផ្លូវព្រៃដែលគ្រប់គ្រងដោយសហគមន៍",
    descriptionEn: "A waterfall at the end of a forest walk, run by the local community in Kampong Speu.",
    descriptionKm: "ទឹកធ្លាក់នៅចុងផ្លូវដើរព្រៃ គ្រប់គ្រងដោយសហគមន៍មូលដ្ឋាននៅខេត្តកំពង់ស្ពឺ។",
    province: "kampong-speu",
    category: "waterfalls",
    lat: 11.4108,
    lng: 104.1195,
    bestMonths: [7, 8, 9, 10, 11],
    avoidMonths: [3, 4],
    likesCount: 384,
    addedBy: "sokha",
    hoursAgo: 24,
    details: {
      transport: { en: "Car or motorbike from Phnom Penh", km: "ឡាន ឬម៉ូតូពីភ្នំពេញ" },
      timeNeeded: { en: "Half a day", km: "កន្លះថ្ងៃ" },
    },
  },
  {
    slug: "lazy-beach-koh-rong-sanloem",
    nameEn: "Lazy Beach, Koh Rong Sanloem",
    nameKm: "ឆ្នេរឡេស៊ី កោះរ៉ុងសន្លឹម",
    taglineEn: "Quiet sand and clear water",
    taglineKm: "ខ្សាច់ស្ងប់ និងទឹកថ្លា",
    descriptionEn: "A small, quiet beach on the west side of Koh Rong Sanloem with calm, clear water.",
    descriptionKm: "ឆ្នេរតូចស្ងប់ស្ងាត់នៅខាងលិចកោះរ៉ុងសន្លឹម មានទឹកស្ងប់ និងថ្លា។",
    province: "preah-sihanouk",
    category: "beaches",
    lat: 10.5886,
    lng: 103.2639,
    bestMonths: [11, 12, 1, 2, 3, 4],
    avoidMonths: [8, 9],
    likesCount: 297,
    addedBy: "tom",
    hoursAgo: 24,
    details: {
      transport: { en: "Boat from Sihanoukville", km: "ទូកពីក្រុងព្រះសីហនុ" },
    },
  },
  {
    slug: "phnom-kulen",
    nameEn: "Phnom Kulen",
    nameKm: "ភ្នំគូលែន",
    taglineEn: "A holy mountain with a river of carvings",
    taglineKm: "ភ្នំពិសិដ្ឋ ដែលមានទន្លេឆ្លាក់រូប",
    descriptionEn: "A sacred mountain north of Siem Reap with waterfalls, a giant reclining Buddha and carvings in the riverbed.",
    descriptionKm: "ភ្នំពិសិដ្ឋនៅខាងជើងខេត្តសៀមរាប មានទឹកធ្លាក់ ព្រះពុទ្ធសម្ងំដ៏ធំ និងរូបឆ្លាក់នៅបាតទន្លេ។",
    province: "siem-reap",
    category: "mountains",
    lat: 13.5686,
    lng: 104.0286,
    bestMonths: [11, 12, 1, 2],
    avoidMonths: [],
    likesCount: 620,
    addedBy: "dara",
    hoursAgo: 24 * 3,
    details: {
      dressCode: { en: "Cover shoulders and knees at the temple", km: "ត្រូវគ្របស្មា និងជង្គង់នៅប្រាសាទ" },
      transport: { en: "Hired car or motorbike from Siem Reap", km: "ជួលឡាន ឬម៉ូតូពីក្រុងសៀមរាប" },
    },
  },
];

export const seedComments = [
  { place: "bou-sra-waterfall", user: "vanna", hoursAgo: 24 * 4, body: "Went last weekend, the water is very strong now. The steps to the lower tier are slippery, go slowly." },
  { place: "bou-sra-waterfall", user: "emma", hoursAgo: 24 * 14, body: "Road from Sen Monorom was fine on a scooter. Arrive before 9 to have it almost to yourself." },
];

// Demo guides, clearly not real people. Replace with real, verified guides before launch.
export const seedGuides = [
  { place: "bou-sra-waterfall", name: "Demo guide A", tourEn: "Day trip with transport", tourKm: "ដំណើរមួយថ្ងៃ រួមទាំងការដឹកជញ្ជូន", priceText: null, contactType: "telegram" as const, contactValue: "demo_guide_tostov" },
  { place: "bou-sra-waterfall", name: "Demo guide B", tourEn: "Forest walk and falls", tourKm: "ដើរព្រៃ និងទឹកធ្លាក់", priceText: null, contactType: "phone" as const, contactValue: "+855000000000" },
];
