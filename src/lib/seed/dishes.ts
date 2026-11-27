// Seed dish library. All quantities are for 2 people, in the ingredient's recipe unit
// (see ingredients.ts). An ingredient written as `coriander?` is optional (garnish):
// it goes on the shopping list when it is fresh enough, but a dish is never "blocked"
// by it and Plan B checks ignore it.
//
// Shorthands inside ingredient strings:
//   TADKA -> the everyday tempering staples (oil, jeera, rai, haldi, hing, chilli, dhania-jeera, salt)
//   ROTI  -> 6 rotis worth of atta + ghee

export type Slot = "breakfast" | "lunch" | "dinner";
export type Cuisine =
  | "Gujarati"
  | "Maharashtrian"
  | "Punjabi"
  | "South Indian"
  | "Indo-Chinese"
  | "Asian noodles"
  | "Chaat & street"
  | "Continental";
export type Effort = "quick" | "medium" | "long";
/** Lunch habit grouping: roti+sabzi, dal/rice style, or anything else. */
export type MealKind = "roti_sabzi" | "dal_rice" | "other";

export interface DishIngredient {
  ingredientId: string;
  qty: number;
  optional: boolean;
}

export interface PrepAhead {
  en: string;
  cook: string;
  leadHours: number;
}

export interface Dish {
  id: string;
  nameEn: string;
  nameCook: string;
  slots: Slot[];
  cuisine: Cuisine;
  effort: Effort;
  kind: MealKind;
  ingredients: DishIngredient[];
  prepAhead?: PrepAhead;
  planBId: string;
  /** Short recipe in the cook's language, sent with the menu until she has made it once. */
  recipeCook?: string;
  /**
   * Egg dishes are for Sohum only (Neyomi doesn't eat eggs): quantities are for one
   * person, they are breakfast-only, and Neyomi gets `neyomiAltId` (egg-free) alongside.
   */
  forOne?: boolean;
  neyomiAltId?: string;
  /** Devanagari name for dishes added in the app (seed dishes use seed/hindi.ts). */
  nameCookHi?: string;
  active?: boolean;
  rating?: number;
  lastCookedAt?: string | null;
}

const MACROS: Record<string, string> = {
  TADKA: "oil 15, jeera 2, rai 2, haldi 2, hing 0.5, red_chilli_powder 3, dhania_jeera 5, salt 5",
  ROTI: "atta 150, ghee 10",
};

export function parseIngredients(spec: string): DishIngredient[] {
  const expanded = spec.replace(/\b(TADKA|ROTI)\b/g, (m) => MACROS[m]);
  return expanded
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((tok) => {
      const m = tok.match(/^([a-z_]+)(\?)?\s+([\d.]+)$/);
      if (!m) throw new Error(`Bad ingredient token: "${tok}"`);
      return { ingredientId: m[1], optional: m[2] === "?", qty: Number(m[3]) };
    });
}

const SLOT: Record<string, Slot> = { b: "breakfast", l: "lunch", d: "dinner" };
const EFFORT: Record<string, Effort> = { q: "quick", m: "medium", l: "long" };
const KIND: Record<string, MealKind> = { rs: "roti_sabzi", dr: "dal_rice", ot: "other" };

// Prep texts are plain actions. The message builder adds "Aaj raat" / "Kal subah" and
// which meal it is for, based on leadHours and the meal time.
const SOAK = (what: string, whatCook: string, hours = 10): PrepAhead => ({
  en: `Soak ${what} in water`,
  cook: `${whatCook} paani mein bhigo dena`,
  leadHours: hours,
});
const BATTER: PrepAhead = {
  en: "Soak idli rice + urad dal; grind in the evening and leave the batter to ferment overnight",
  cook: "idli chawal aur urad dal bhigo dena, shaam ko pees ke batter khameer ke liye rakh dena",
  leadHours: 24,
};
const SPROUT_MATKI: PrepAhead = {
  en: "Soak matki; next morning drain and keep covered to sprout",
  cook: "matki bhigo dena, agle din subah paani nikaal ke dhak ke rakhna (ankur ke liye)",
  leadHours: 36,
};

type Row = [
  id: string,
  nameEn: string,
  nameCook: string,
  slots: string,
  cuisine: Cuisine,
  effort: string,
  kind: string,
  ingredients: string,
  planBId: string,
  prep?: PrepAhead,
  extra?: Pick<Dish, "forOne" | "neyomiAltId">,
];

// prettier-ignore
const ROWS: Row[] = [
  // ======================= BREAKFAST =======================
  ["kanda_poha", "Poha", "Kanda pohe", "b", "Maharashtrian", "q", "ot",
    "poha 150, onion 1, potato 1, green_chilli 2, peanuts 30, curry_leaves 1, lemon 1, sugar 5, oil 20, coriander? 0.25", "upma"],
  ["upma", "Upma", "Upma", "b", "South Indian", "q", "ot",
    "rava 120, onion 1, green_chilli 2, ginger 5, curry_leaves 1, frozen_peas 50, urad_dal 5, lemon 0.5, ghee 15, coriander? 0.25", "kanda_poha"],
  ["uttapam", "Onion Tomato Uttapam + Chutney", "Onion tamatar uttapam, chutney", "b", "South Indian", "m", "ot",
    "idli_rice 150, urad_dal 50, methi_seeds 2, onion 1, tomato 1, capsicum 0.5, desiccated_coconut 30, chana_dalia 20, oil 25, coriander? 0.25", "masala_paratha", BATTER],
  ["avocado_toast", "Avocado Toast (Sliced or Guacamole)", "Avocado toast", "b", "Continental", "q", "ot",
    "protein_bread 4, avocado 1, lemon 0.5, tomato 1, onion 0.5, chilli_flakes 1, olive_oil 5", "kanda_poha"],
  ["butter_toast", "Butter Toast + Chai", "Butter toast, chai", "b", "Continental", "q", "ot",
    "sandwich_bread 6, butter 20, milk 200, tea 4, sugar 10", "chai_khakhra"],
  ["masala_paratha", "Masala Paratha + Curd", "Masala paratha, dahi", "b", "Gujarati", "q", "ot",
    "atta 200, besan 20, ajwain 1, red_chilli_powder 3, haldi 1, oil 30, curd 150", "upma"],
  ["kakdi_thepla", "Kakdi (Cucumber) Thepla + Curd", "Kakdi thepla, dahi", "b", "Gujarati", "m", "ot",
    "atta 200, besan 30, cucumber 1, curd 150, sesame 5, green_chilli 1, oil 30", "masala_paratha"],
  ["paneer_sandwich", "Paneer Sandwich", "Paneer sandwich", "b", "Continental", "q", "ot",
    "sandwich_bread 8, paneer 150, capsicum 0.5, onion 1, green_chilli 1, butter 20, sandwich_masala 3, coriander? 0.25", "kanda_poha"],
  ["paneer_saute", "Paneer Sauté with Capsicum & Broccoli", "Paneer saute (shimla mirch, broccoli)", "b", "Continental", "q", "ot",
    "paneer 200, capsicum 1, broccoli 150, garlic 5, black_pepper 1, chilli_flakes 1, olive_oil 10", "upma"],
  ["aloo_paneer_tikki", "Aloo Paneer Tikki", "Aloo paneer tikki", "b", "Chaat & street", "m", "ot",
    "potato 3, paneer 100, cornflour 15, green_chilli 2, chaat_masala 2, oil 40, coriander? 0.25", "kanda_poha"],
  ["rava_dhokla", "Rava Dhokla (Vagharela)", "Rava dhokla, vaghar wala", "b", "Gujarati", "m", "ot",
    "rava 150, curd 150, eno 5, green_chilli 2, ginger 5, rai 2, curry_leaves 1, sesame 5, oil 15, coriander? 0.25", "upma"],
  ["moong_chilla", "Moong Dal Chilla with Paneer", "Moong dal chilla, paneer", "b", "Punjabi", "q", "ot",
    "moong_dal 120, paneer 100, ginger 5, green_chilli 2, onion 1, oil 20, coriander? 0.25", "masala_paratha",
    SOAK("1 cup moong dal", "1 katori moong dal", 8)],
  ["masala_bhakri", "Bhakri + Chai", "Bhakri, chai", "b", "Gujarati", "q", "ot",
    "atta 200, ghee 20, ajwain 1, jeera 2, milk 200, tea 4, sugar 10", "upma"],
  ["chai_khakhra", "Chai + Khakhra", "Chai, khakhra", "b", "Gujarati", "q", "ot",
    "khakhra 6, milk 200, tea 4, sugar 10", "upma"],
  ["omelette", "Omelette (Sohum)", "Omelette (2 ande)", "b", "Continental", "q", "ot",
    "eggs 2, onion 0.5, tomato 0.5, green_chilli 1, butter 10, sandwich_bread 2, coriander? 0.1", "masala_paratha", undefined,
    { forOne: true, neyomiAltId: "masala_paratha" }],
  ["boiled_eggs", "Boiled Eggs (Sohum)", "Boiled eggs (2 ande)", "b", "Continental", "q", "ot",
    "eggs 2, black_pepper 1, salt 1", "masala_paratha", undefined,
    { forOne: true, neyomiAltId: "masala_paratha" }],
  ["egg_bhurji_toast", "Egg Bhurji on Toast (Sohum)", "Anda bhurji, toast (2 ande)", "b", "Punjabi", "q", "ot",
    "eggs 2, onion 0.5, tomato 0.5, green_chilli 1, butter 10, sandwich_bread 2, coriander? 0.1", "masala_paratha", undefined,
    { forOne: true, neyomiAltId: "kakdi_thepla" }],
  ["paneer_bhurji_toast", "Paneer Bhurji on Toast", "Paneer bhurji toast", "b", "Punjabi", "q", "ot",
    "paneer 150, onion 1, tomato 1, capsicum 0.5, green_chilli 1, sandwich_bread 4, butter 15, coriander? 0.25", "kanda_poha"],

  // ======================= LUNCH: dal & rice =======================
  ["maharashtrian_dal_chawal", "Maharashtrian Dal Chawal (Amti Bhaat)", "Amti, chawal", "l", "Maharashtrian", "q", "dr",
    "toor_dal 100, rice 150, goda_masala 8, tamarind 5, jaggery 10, curry_leaves 1, TADKA, coriander? 0.25", "varan_bhaat"],
  ["moong_dal_chawal", "Moong Dal Chawal", "Moong dal, chawal", "ld", "Gujarati", "q", "dr",
    "moong_dal 100, rice 150, tomato 1, garlic 5, ghee 10, TADKA", "varan_bhaat"],
  ["brown_dal_chawal", "Brown Dal (Sabut Masoor) Chawal", "Sabut masoor dal, chawal", "l", "Punjabi", "m", "dr",
    "whole_masoor 100, rice 150, onion 1, tomato 1, ginger 5, garlic 10, TADKA, coriander? 0.25", "moong_dal_chawal"],
  ["varan_bhaat", "Varan Bhaat + Ghee", "Varan bhaat, ghee", "ld", "Maharashtrian", "q", "dr",
    "toor_dal 100, rice 150, haldi 2, hing 0.5, ghee 15, lemon 0.5, salt 5", "dal_khichdi"],
  ["dal_khichdi", "Dal Khichdi + Papad", "Dal khichdi, papad", "ld", "Gujarati", "q", "dr",
    "rice 100, moong_dal 70, ghee 20, papad 4, TADKA", "kadhi_khichdi"],
  ["kadhi_khichdi", "Kadhi Khichdi", "Kadhi khichdi", "ld", "Gujarati", "q", "dr",
    "rice 100, moong_dal 60, curd 300, besan 30, ginger 5, green_chilli 2, curry_leaves 1, sugar 10, ghee 20, TADKA", "dal_khichdi"],
  ["rajma_chawal", "Rajma Chawal", "Rajma chawal", "ld", "Punjabi", "l", "dr",
    "rajma 150, rice 150, onion 2, tomato 3, ginger 10, garlic 10, garam_masala 2, TADKA", "varan_bhaat", SOAK("1 cup rajma", "1 katori rajma")],
  ["chole_chawal", "Chole Chawal", "Chole, chawal", "ld", "Punjabi", "l", "dr",
    "kabuli_chana 150, rice 150, onion 2, tomato 2, ginger 10, garlic 10, chole_masala 10, tea_bag 1, TADKA", "varan_bhaat", SOAK("1 cup chole", "1 katori chole")],
  ["sol_kadhi_rice", "Sol Kadhi + Jeera Rice", "Sol kadhi, jeera rice", "l", "Maharashtrian", "q", "dr",
    "kokum 8, coconut_milk 200, garlic 5, green_chilli 1, rice 150, jeera 3, ghee 10, coriander? 0.25", "varan_bhaat"],
  ["tawa_pulao", "Tawa Pulao + Raita", "Tawa pulao, raita", "ld", "Chaat & street", "q", "dr",
    "rice 150, capsicum 1, onion 1, tomato 2, frozen_peas 50, pav_bhaji_masala 10, butter 20, lemon 0.5, curd 150, cucumber? 0.5, coriander? 0.25", "vagharela_rice"],
  ["vagharela_rice", "Vagharela Rice + Curd", "Vagharela chawal, dahi", "ld", "Gujarati", "q", "dr",
    "rice 150, onion 1, potato 1, frozen_peas 50, curd 150, curry_leaves 1, TADKA", "dal_khichdi"],
  ["lemon_rice", "Lemon Rice + Curd", "Lemon rice, dahi", "l", "South Indian", "q", "dr",
    "rice 150, lemon 1, peanuts 30, curry_leaves 1, chana_dal 10, urad_dal 5, green_chilli 2, curd 150, TADKA", "curd_rice"],
  ["curd_rice", "Curd Rice + Achar", "Dahi chawal, achar", "ld", "South Indian", "q", "dr",
    "rice 150, curd 300, milk 50, ginger 5, green_chilli 1, curry_leaves 1, urad_dal 5, achar 20, TADKA", "lemon_rice"],
  ["palak_soup_curd_rice", "Palak Soup + Curd Rice", "Palak soup, dahi chawal", "ld", "South Indian", "q", "dr",
    "palak 2, onion 1, garlic 5, butter 15, black_pepper 1, rice 150, curd 250, curry_leaves 1, TADKA, cream? 25", "curd_rice"],
  ["watery_moong_rice", "Watery Moong + Rice", "Patla moong, chawal", "l", "Gujarati", "q", "dr",
    "whole_moong 100, rice 150, garlic 5, ginger 5, lemon 0.5, TADKA", "varan_bhaat", SOAK("1/2 cup whole moong", "aadhi katori sabut moong", 8)],
  ["gujarati_thali", "Gujarati Dal, Bhaat, Shaak, Rotli", "Gujarati dal, bhaat, shaak, rotli", "l", "Gujarati", "m", "dr",
    "toor_dal 80, rice 100, jaggery 15, kokum 3, peanuts 15, potato 2, tomato 1, TADKA, ROTI", "varan_bhaat"],

  // ======================= LUNCH: roti + sabzi =======================
  ["batata_shaak", "Yellow Aloo Sabzi + Rotli", "Peeli aloo sabzi, roti", "l", "Gujarati", "q", "rs",
    "potato 4, tomato 1, green_chilli 2, sugar 5, lemon 0.5, TADKA, ROTI", "jeera_aloo"],
  ["jeera_aloo", "Jeera Garlic Aloo + Roti", "Jeera lasun aloo, roti", "l", "Punjabi", "q", "rs",
    "potato 4, jeera 5, garlic 10, green_chilli 2, TADKA, ROTI, coriander? 0.25", "batata_shaak"],
  ["aloo_gravy", "Aloo Rassa (Gravy) + Roti", "Aloo rassa, roti", "ld", "Gujarati", "q", "rs",
    "potato 3, tomato 2, onion 1, ginger 5, garam_masala 2, TADKA, ROTI, coriander? 0.25", "batata_shaak"],
  ["aloo_methi", "Aloo Methi + Roti", "Aloo methi, roti", "l", "Punjabi", "q", "rs",
    "methi 1, potato 3, garlic 5, green_chilli 2, TADKA, ROTI", "jeera_aloo"],
  ["aloo_palak", "Aloo Palak + Roti", "Aloo palak, roti", "l", "Punjabi", "q", "rs",
    "palak 2, potato 2, garlic 10, onion 1, green_chilli 2, TADKA, ROTI", "jeera_aloo"],
  ["aloo_gobi", "Gobi Aloo (Flower Bateta) + Roti", "Gobi aloo, roti", "ld", "Gujarati", "q", "rs",
    "cauliflower 400, potato 1, tomato 1, ginger 5, TADKA, ROTI, coriander? 0.25", "aloo_gravy"],
  ["cauliflower_gravy", "Cauliflower Masala (Gravy) + Roti", "Gobi masala (rassa), roti", "ld", "Punjabi", "m", "rs",
    "cauliflower 400, onion 2, tomato 2, cashews 10, ginger 5, garlic 5, garam_masala 2, TADKA, ROTI", "aloo_gravy"],
  ["kobi_shaak", "Kobi Sabzi + Rotli", "Kobi matar ki sabzi, roti", "l", "Gujarati", "q", "rs",
    "cabbage 400, frozen_peas 60, green_chilli 2, TADKA, ROTI", "batata_shaak"],
  ["bhinda_shaak", "Bhindi Sabzi + Rotli", "Bhindi ki sabzi, roti", "l", "Gujarati", "q", "rs",
    "bhindi 300, onion 1, TADKA, ROTI", "jeera_aloo"],
  ["moong_shaak", "Moong & Onion Sabzi + Roti", "Moong kanda sabzi, roti", "l", "Gujarati", "q", "rs",
    "whole_moong 120, onion 1, tomato 1, garlic 5, TADKA, ROTI", "batata_shaak", SOAK("1/2 cup whole moong", "aadhi katori sabut moong", 8)],
  ["dudhi_shaak", "Dudhi Sabzi + Rotli", "Dudhi ki sabzi, roti", "l", "Gujarati", "q", "rs",
    "dudhi 400, tomato 1, TADKA, ROTI", "batata_shaak"],
  ["dudhi_chana", "Dudhi Chana Dal + Rotli", "Dudhi chana dal, roti", "l", "Gujarati", "q", "rs",
    "dudhi 400, chana_dal 50, tomato 1, TADKA, ROTI", "batata_shaak"],
  ["tindora_shaak", "Tondli Sabzi + Rotli", "Tondli ki sabzi, roti", "l", "Gujarati", "q", "rs",
    "tindora 300, potato 1, TADKA, ROTI", "batata_shaak"],
  ["turiya_shaak", "Turai Sabzi + Rotli", "Turai ki sabzi, roti", "l", "Gujarati", "q", "rs",
    "turai 400, tomato 1, TADKA, ROTI", "batata_shaak"],
  ["chawli_shaak", "Chawli Sabzi with Coconut + Rotli", "Chawli ki sabzi (nariyal wali), roti", "l", "Maharashtrian", "q", "rs",
    "chawli 250, desiccated_coconut 20, garlic 5, TADKA, ROTI", "batata_shaak"],
  ["fansi_shaak", "Fansi Sabzi + Rotli", "Beans ki sabzi, roti", "l", "Gujarati", "q", "rs",
    "beans 250, potato 1, TADKA, ROTI", "batata_shaak"],
  ["matki_usal", "Matki Usal + Chapati", "Matki usal, chapati", "l", "Maharashtrian", "m", "rs",
    "matki 120, onion 1, tomato 1, goda_masala 8, desiccated_coconut 15, TADKA, ROTI, coriander? 0.25", "batata_shaak", SPROUT_MATKI],
  ["paneer_gravy", "Paneer Gravy Sabzi + Roti", "Paneer ki sabzi (gravy), roti", "ld", "Punjabi", "m", "rs",
    "paneer 200, onion 2, tomato 3, ginger 5, garlic 5, cashews 15, kasuri_methi 2, garam_masala 2, TADKA, ROTI, cream? 25", "aloo_gravy"],
  ["jain_paneer", "Jain Paneer Sabzi + Roti", "Jain paneer sabzi (bina kanda-lasun), roti", "ld", "Gujarati", "m", "rs",
    "paneer 200, tomato 4, cashews 20, capsicum 1, kasuri_methi 2, TADKA, ROTI", "dal_khichdi"],
  ["mix_veg", "Mixed Veg (Punjabi) + Roti", "Mix veg, roti", "ld", "Punjabi", "m", "rs",
    "carrot 100, beans 100, cauliflower 200, capsicum 1, frozen_peas 60, onion 1, tomato 2, ginger 5, garlic 5, TADKA, ROTI, cream? 20", "aloo_gravy"],
  ["methi_mutter_malai", "Methi Matar Malai + Roti", "Methi matar malai, roti", "ld", "Punjabi", "m", "rs",
    "methi 1, frozen_peas 120, cream 100, onion 1, cashews 15, ginger 5, green_chilli 1, TADKA, ROTI", "aloo_gravy"],
  ["brinjal_rotla", "Ringan nu Shaak + Bajra Rotla", "Baingan ki sabzi, bajre ka rotla", "l", "Gujarati", "m", "rs",
    "brinjal 300, onion 1, tomato 1, garlic 10, bajra_atta 200, ghee 20, TADKA", "pithla_bhakri"],

  // ======================= LUNCH: paratha meals =======================
  ["palak_paneer_paratha", "Palak Paneer + Paratha", "Palak paneer, paratha", "ld", "Punjabi", "m", "rs",
    "palak 2, paneer 200, onion 1, tomato 1, ginger 10, garlic 10, green_chilli 2, garam_masala 2, atta 200, ghee 25, TADKA, cream? 25", "aloo_gravy"],
  ["paneer_bhurji_paratha", "Paneer Bhurji + Paratha", "Paneer bhurji, paratha", "ld", "Punjabi", "q", "rs",
    "paneer 200, onion 1, tomato 2, capsicum 1, green_chilli 2, atta 200, ghee 25, TADKA, coriander? 0.25", "aloo_gravy"],
  ["chole_paratha", "Chole + Paratha", "Chole, paratha", "ld", "Punjabi", "l", "rs",
    "kabuli_chana 150, onion 2, tomato 2, ginger 10, garlic 10, chole_masala 10, tea_bag 1, atta 200, ghee 25, TADKA", "aloo_gravy", SOAK("1 cup chole", "1 katori chole")],
  ["misal_paratha", "Misal + Paratha", "Misal, paratha", "l", "Maharashtrian", "m", "rs",
    "matki 150, onion 2, tomato 2, garlic 10, ginger 10, misal_masala 15, desiccated_coconut 20, farsan 100, atta 200, ghee 20, lemon 1, coriander 0.5", "pithla_bhakri", SPROUT_MATKI],
  ["paneer_paratha", "Paneer Paratha + Curd", "Paneer paratha, dahi", "bl", "Punjabi", "m", "ot",
    "atta 200, paneer 150, onion 1, green_chilli 2, curd 200, butter 20, coriander? 0.25", "masala_paratha"],
  ["aloo_paratha", "Aloo Paratha + Curd", "Aloo paratha, dahi", "bl", "Punjabi", "m", "ot",
    "atta 200, potato 3, green_chilli 2, curd 200, butter 20, coriander? 0.25", "masala_paratha"],
  ["aloo_paneer_paratha", "Aloo Paneer Paratha + Curd", "Aloo paneer paratha, dahi", "bl", "Punjabi", "m", "ot",
    "atta 200, potato 2, paneer 100, green_chilli 2, curd 200, butter 20, coriander? 0.25", "masala_paratha"],

  // ======================= LUNCH: Maharashtrian & others =======================
  ["thalipeeth_pithla", "Thalipeeth + Pithla & Achar", "Thalipeeth, pithla, achar", "ld", "Maharashtrian", "m", "rs",
    "thalipeeth_bhajani 200, onion 2, besan 80, garlic 10, green_chilli 3, curd 100, butter 20, achar 20, TADKA, coriander? 0.25", "pithla_bhakri"],
  ["pithla_bhakri", "Pithla Bhakri", "Pithla bhakri", "ld", "Maharashtrian", "q", "rs",
    "besan 100, onion 1, garlic 10, green_chilli 3, jowar_atta 200, TADKA, coriander? 0.25", "kadhi_khichdi"],
  ["puri_bhaji", "Puri + Aloo Bhaji", "Puri, aloo bhaji", "bl", "Maharashtrian", "l", "ot",
    "atta 200, potato 4, onion 1, green_chilli 2, curry_leaves 1, oil 250, TADKA, coriander? 0.25", "masala_paratha"],
  ["rava_dhokla_aamras", "Rava Dhokla + Aam Ras", "Rava dhokla, aam ras", "l", "Gujarati", "m", "ot",
    "rava 150, curd 150, eno 5, green_chilli 2, ginger 5, mango_pulp 400, TADKA", "dal_khichdi"],
  ["veg_sandwich", "Toasted Veg Sandwich", "Veg sandwich (toast)", "bl", "Chaat & street", "q", "ot",
    "sandwich_bread 8, butter 30, coriander 0.5, mint 0.25, green_chilli 2, cucumber 1, tomato 1, potato 1, onion 1, capsicum 0.5, sandwich_masala 3", "kanda_poha"],

  // ======================= DINNER: rice =======================
  ["herbed_rice_mushroom", "Herbed Rice + Creamy Mushroom", "Herbed rice, creamy mushroom", "d", "Continental", "m", "ot",
    "basmati 150, butter 25, garlic 15, oregano 2, mushroom 200, cream 100, onion 1, black_pepper 2, chilli_flakes 1, coriander? 0.25", "masala_khichdi"],
  ["fried_rice_gravy", "Veg Fried Rice + Gravy", "Fried rice, gravy", "d", "Indo-Chinese", "m", "ot",
    "rice 150, cabbage 150, carrot 150, capsicum 1, spring_onion 1, garlic 15, ginger 10, soy_sauce 25, vinegar 10, green_chilli_sauce 15, cornflour 15, oil 30", "masala_khichdi"],
  ["manchurian_rice", "Fried Rice + Manchurian", "Fried rice, manchurian", "d", "Indo-Chinese", "l", "ot",
    "cabbage 250, carrot 200, capsicum 1, spring_onion 1, garlic 15, ginger 10, maida 40, cornflour 30, soy_sauce 20, vinegar 10, green_chilli_sauce 15, rice 150, oil 200", "masala_khichdi"],
  ["veg_biryani", "Veg Biryani + Raita", "Veg biryani, raita", "d", "Punjabi", "l", "dr",
    "basmati 200, carrot 100, beans 80, cauliflower 150, potato 1, onion 3, curd 250, mint 0.5, coriander 0.25, biryani_masala 10, ghee 30", "masala_khichdi"],
  ["masala_khichdi", "Masala Khichdi + Curd", "Masala khichdi, dahi", "d", "Gujarati", "q", "dr",
    "rice 100, moong_dal 60, potato 1, onion 1, tomato 1, frozen_peas 60, ghee 20, curd 150, TADKA", "dal_khichdi"],
  ["rice_soup", "Jeera Rice + Tomato Soup", "Jeera rice, tamatar soup", "d", "Continental", "q", "dr",
    "rice 150, jeera 3, ghee 10, tomato 6, onion 1, garlic 10, butter 20, black_pepper 1, cream? 25", "masala_khichdi"],
  ["mexican_bowl", "Mexican Rice Bowl + Guacamole", "Mexican rice bowl, guacamole", "d", "Continental", "m", "ot",
    "rice 150, rajma 100, frozen_corn 80, capsicum 1, onion 2, tomato 3, avocado 2, lemon 1, garlic 10, oregano 2, chilli_flakes 1, coriander 0.25", "masala_khichdi",
    SOAK("3/4 cup rajma", "3/4 katori rajma")],
  ["dal_palak_rice", "Dal Palak + Jeera Rice", "Palak dal, jeera rice", "ld", "Punjabi", "q", "dr",
    "toor_dal 100, palak 1, garlic 10, tomato 1, rice 150, jeera 3, TADKA", "moong_dal_chawal"],
  ["veg_pulao_kadhi", "Veg Pulao + Kadhi", "Veg pulao, kadhi", "d", "Gujarati", "m", "dr",
    "basmati 180, carrot 100, beans 80, frozen_peas 60, potato 1, onion 1, whole_spices 3, ghee 20, curd 300, besan 30, ginger 5, green_chilli 2, curry_leaves 1, sugar 10", "masala_khichdi"],

  // ======================= DINNER: pasta & noodles =======================
  ["pesto_pasta", "Basil Pesto Pasta", "Pesto pasta", "d", "Continental", "q", "ot",
    "penne 200, basil 1, cashews 30, garlic 10, olive_oil 40, cheese 40, lemon 0.5, cherry_tomato? 100", "masala_khichdi"],
  ["spinach_spaghetti", "Spinach & Cherry Tomato Spaghetti", "Palak cherry tamatar spaghetti", "d", "Continental", "q", "ot",
    "spaghetti 200, palak 1, cherry_tomato 200, garlic 15, olive_oil 30, chilli_flakes 2, cheese 30", "masala_khichdi"],
  ["pasta_arrabbiata", "Arrabbiata (Tomato) Pasta", "Red sauce pasta", "d", "Continental", "q", "ot",
    "penne 200, tomato 5, garlic 15, olive_oil 25, chilli_flakes 2, oregano 2, capsicum 1, cheese 30", "masala_khichdi"],
  ["pad_thai", "Pad Thai-style Noodles", "Pad thai noodles", "d", "Asian noodles", "m", "ot",
    "flat_noodles 200, peanuts 40, tamarind 15, jaggery 15, soy_sauce 20, garlic 10, spring_onion 1, cabbage 100, carrot 100, paneer 100, lemon 1, chilli_flakes 2", "masala_khichdi"],
  ["flat_noodles", "Stir-fried Rice Noodles", "Rice noodles", "d", "Asian noodles", "q", "ot",
    "flat_noodles 200, broccoli 150, capsicum 1, garlic 15, dark_soy 20, soy_sauce 10, sugar 5, oil 25, spring_onion? 0.5", "masala_khichdi"],
  ["hakka_noodles", "Veg Hakka Noodles", "Hakka noodles", "d", "Indo-Chinese", "q", "ot",
    "hakka_noodles 150, cabbage 100, carrot 100, capsicum 1, garlic 10, soy_sauce 15, vinegar 10, green_chilli_sauce 15, oil 25, spring_onion? 0.5", "masala_khichdi"],

  // ======================= DINNER: parathas =======================
  ["thepla_aloo", "Thepla + Yellow Aloo Sabzi", "Thepla, peeli aloo sabzi", "d", "Gujarati", "m", "rs",
    "atta 200, besan 30, curd 50, ajwain 1, sesame 5, oil 30, potato 4, tomato 1, TADKA, methi? 0.5", "pithla_bhakri"],
  ["kobi_vatana_paratha", "Kobi Vatana Paratha + Curd", "Kobi matar paratha, dahi", "d", "Gujarati", "m", "ot",
    "atta 200, cabbage 250, frozen_peas 80, green_chilli 2, ginger 5, curd 200, ghee 20", "vatana_paratha"],
  ["vatana_paratha", "Vatana (Green Peas) Paratha + Curd", "Matar paratha, dahi", "d", "Gujarati", "m", "ot",
    "atta 200, frozen_peas 200, green_chilli 2, ginger 5, curd 200, ghee 20", "thepla_aloo"],
  ["kela_paratha", "Kele (Raw Banana) Paratha + Curd", "Kacche kele ka paratha, dahi", "d", "Gujarati", "m", "ot",
    "atta 200, raw_banana 2, green_chilli 2, ginger 5, curd 200, ghee 20, coriander? 0.25", "vatana_paratha"],
  ["lachha_paratha", "Lachha Paratha + Paneer Gravy", "Lachha paratha, paneer gravy", "d", "Punjabi", "l", "rs",
    "atta 200, maida 50, ghee 40, paneer 200, onion 2, tomato 3, cashews 15, kasuri_methi 2, garam_masala 2, TADKA, cream? 25", "vatana_paratha"],
  ["paneer_lifafa", "Paneer Lifafa", "Paneer lifafa", "d", "Punjabi", "l", "ot",
    "maida 200, paneer 200, capsicum 1, onion 1, tomato 1, kasuri_methi 2, butter 20, chaat_masala 3, TADKA", "vatana_paratha"],

  // ======================= DINNER: street food & snacks =======================
  ["pav_bhaji", "Pav Bhaji + Kanda Tomato Salad", "Pav bhaji, kanda tamatar salad", "d", "Chaat & street", "m", "ot",
    "potato 3, cauliflower 150, capsicum 1, frozen_peas 100, tomato 5, onion 3, garlic 10, pav_bhaji_masala 15, butter 60, pav 8, lemon 1, coriander 0.5", "masala_khichdi"],
  ["ragda_pattice", "Ragda Pattice", "Ragda pattice", "d", "Chaat & street", "m", "ot",
    "white_peas 120, potato 4, onion 1, sev 50, imli_chutney 60, coriander 0.5, mint 0.25, green_chilli 2, cornflour 10", "masala_khichdi",
    SOAK("3/4 cup white vatana", "3/4 katori safed vatana")],
  ["frankie", "Frankie (Aloo / Paneer)", "Frankie", "d", "Chaat & street", "m", "ot",
    "atta 150, maida 50, potato 2, paneer 100, onion 2, cabbage 80, capsicum 1, chaat_masala 5, coriander 0.5, mint 0.25, green_chilli 2, oil 30", "masala_khichdi"],
  ["paneer_tikka_wrap", "Paneer Tikka Wrap", "Paneer tikka roll", "d", "Punjabi", "m", "ot",
    "paneer 250, capsicum 1, onion 2, curd 100, ginger 5, garlic 5, kasuri_methi 2, chaat_masala 2, atta 150, mint 0.5, lemon 1", "masala_khichdi"],
  ["cheese_grill_sandwich", "Cheese Grill Sandwich", "Cheese grill sandwich", "d", "Chaat & street", "q", "ot",
    "sandwich_bread 8, cheese 80, capsicum 1, onion 1, tomato 1, butter 30, coriander 0.5, green_chilli 2, sandwich_masala 3", "masala_khichdi"],
  ["tomato_soup_sandwich", "Tomato Soup + Grilled Sandwich", "Tamatar soup, grilled sandwich", "d", "Continental", "q", "ot",
    "tomato 6, onion 1, garlic 10, butter 30, sandwich_bread 6, cheese_slice 4, cream? 25", "masala_khichdi"],
  ["masala_dosa", "Masala Dosa + Chutney", "Masala dosa, chutney", "bd", "South Indian", "l", "ot",
    "idli_rice 150, urad_dal 50, methi_seeds 2, potato 3, onion 1, green_chilli 2, curry_leaves 1, chana_dal 10, desiccated_coconut 30, chana_dalia 20, oil 30", "masala_paratha", BATTER],
  ["mushroom_white_sauce", "Mushroom in White Sauce + Toast", "Mushroom white sauce, toast", "d", "Continental", "q", "ot",
    "mushroom 200, milk 300, butter 30, maida 25, cheese 40, garlic 10, oregano 2, black_pepper 1, sandwich_bread 6, capsicum? 0.5", "masala_khichdi"],
];

export const DISHES: Dish[] = ROWS.map(([id, nameEn, nameCook, slots, cuisine, effort, kind, ings, planBId, prep, extra]) => ({
  id,
  nameEn,
  nameCook,
  slots: slots.split("").map((c) => SLOT[c]),
  cuisine,
  effort: EFFORT[effort],
  kind: KIND[kind],
  ingredients: parseIngredients(ings),
  prepAhead: prep,
  planBId,
  ...(extra ?? {}),
}));

export const DISH_BY_ID: Record<string, Dish> = Object.fromEntries(DISHES.map((d) => [d.id, d]));
