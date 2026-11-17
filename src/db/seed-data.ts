// Fixed reference data, added by `npm run db:seed`.
// Order = sortOrder: popular travel provinces first (as on the Home design), then A–Z.

export type SeedItem = { slug: string; nameEn: string; nameKm: string };

export const provinceSeed: SeedItem[] = [
  { slug: "siem-reap", nameEn: "Siem Reap", nameKm: "សៀមរាប" },
  { slug: "kampot", nameEn: "Kampot", nameKm: "កំពត" },
  { slug: "mondulkiri", nameEn: "Mondulkiri", nameKm: "មណ្ឌលគិរី" },
  { slug: "koh-kong", nameEn: "Koh Kong", nameKm: "កោះកុង" },
  { slug: "battambang", nameEn: "Battambang", nameKm: "បាត់ដំបង" },
  { slug: "kep", nameEn: "Kep", nameKm: "កែប" },
  { slug: "preah-sihanouk", nameEn: "Preah Sihanouk", nameKm: "ព្រះសីហនុ" },
  { slug: "phnom-penh", nameEn: "Phnom Penh", nameKm: "ភ្នំពេញ" },
  { slug: "ratanakiri", nameEn: "Ratanakiri", nameKm: "រតនគិរី" },
  { slug: "kratie", nameEn: "Kratie", nameKm: "ក្រចេះ" },
  { slug: "banteay-meanchey", nameEn: "Banteay Meanchey", nameKm: "បន្ទាយមានជ័យ" },
  { slug: "kampong-cham", nameEn: "Kampong Cham", nameKm: "កំពង់ចាម" },
  { slug: "kampong-chhnang", nameEn: "Kampong Chhnang", nameKm: "កំពង់ឆ្នាំង" },
  { slug: "kampong-speu", nameEn: "Kampong Speu", nameKm: "កំពង់ស្ពឺ" },
  { slug: "kampong-thom", nameEn: "Kampong Thom", nameKm: "កំពង់ធំ" },
  { slug: "kandal", nameEn: "Kandal", nameKm: "កណ្ដាល" },
  { slug: "oddar-meanchey", nameEn: "Oddar Meanchey", nameKm: "ឧត្តរមានជ័យ" },
  { slug: "pailin", nameEn: "Pailin", nameKm: "ប៉ៃលិន" },
  { slug: "preah-vihear", nameEn: "Preah Vihear", nameKm: "ព្រះវិហារ" },
  { slug: "prey-veng", nameEn: "Prey Veng", nameKm: "ព្រៃវែង" },
  { slug: "pursat", nameEn: "Pursat", nameKm: "ពោធិ៍សាត់" },
  { slug: "stung-treng", nameEn: "Stung Treng", nameKm: "ស្ទឹងត្រែង" },
  { slug: "svay-rieng", nameEn: "Svay Rieng", nameKm: "ស្វាយរៀង" },
  { slug: "takeo", nameEn: "Takeo", nameKm: "តាកែវ" },
  { slug: "tbong-khmum", nameEn: "Tbong Khmum", nameKm: "ត្បូងឃ្មុំ" },
];

export const categorySeed: SeedItem[] = [
  { slug: "temples", nameEn: "Temples", nameKm: "ប្រាសាទ" },
  { slug: "waterfalls", nameEn: "Waterfalls", nameKm: "ទឹកធ្លាក់" },
  { slug: "beaches", nameEn: "Beaches", nameKm: "ឆ្នេរ" },
  { slug: "mountains", nameEn: "Mountains", nameKm: "ភ្នំ" },
  { slug: "food", nameEn: "Food", nameKm: "អាហារ" },
];
