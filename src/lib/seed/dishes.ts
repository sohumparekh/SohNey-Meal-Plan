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
}

const MACROS: Record<string, string> = {
  TADKA: "oil 15, jeera 2, rai 2, haldi 2, hing 0.5, red_chilli_powder 3, dhania_jeera 5, salt 5",
  ROTI: "atta 150, ghee 10",
};

function parseIngredients(spec: string): DishIngredient[] {
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

const SOAK = (what: string, whatCook: string, hours = 10): PrepAhead => ({
  en: `Soak ${what} tonight after dinner`,
  cook: `Aaj raat dinner ke baad ${whatCook} paani mein bhigo dena`,
  leadHours: hours,
});
const BATTER: PrepAhead = {
  en: "Soak idli rice + urad dal in the morning, grind at night, leave batter to ferment overnight",
  cook: "Subah idli chawal aur urad dal bhigo dena, raat ko pees ke batter rakh dena (khameer ke liye)",
  leadHours: 24,
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
];

// prettier-ignore
const ROWS: Row[] = [
  // ======================= BREAKFAST =======================
  ["kanda_poha", "Kanda Poha", "Kanda pohe", "b", "Maharashtrian", "q", "ot",
    "poha 150, onion 1, potato 1, green_chilli 2, peanuts 30, curry_leaves 1, lemon 1, sugar 5, oil 20, coriander? 0.25", "upma"],
  ["batata_poha", "Batata Poha", "Batata pohe", "b", "Gujarati", "q", "ot",
    "poha 150, potato 2, green_chilli 2, peanuts 30, curry_leaves 1, lemon 1, sugar 10, oil 20, coriander? 0.25", "upma"],
  ["upma", "Rava Upma", "Upma", "b", "South Indian", "q", "ot",
    "rava 120, onion 1, green_chilli 2, ginger 5, curry_leaves 1, frozen_peas 50, urad_dal 5, lemon 0.5, ghee 15, coriander? 0.25", "kanda_poha"],
  ["vermicelli_upma", "Vermicelli Upma", "Sevai upma", "b", "South Indian", "q", "ot",
    "vermicelli 120, onion 1, frozen_peas 50, green_chilli 2, curry_leaves 1, lemon 0.5, oil 15", "upma"],
  ["sheera", "Rava Sheera", "Sheera", "b", "Gujarati", "q", "ot",
    "rava 80, ghee 40, sugar 60, milk 250, cashews 10, cardamom 1", "upma"],
  ["khichu", "Khichu", "Khichu", "b", "Gujarati", "q", "ot",
    "rice_flour 150, green_chilli 2, ajwain 2, jeera 2, oil 20", "besan_chilla"],
  ["besan_chilla", "Besan Chilla (Pudla)", "Besan chilla", "bd", "Gujarati", "q", "ot",
    "besan 120, onion 1, tomato 1, green_chilli 2, ajwain 1, oil 20, curd 100, coriander? 0.25", "upma"],
  ["moong_chilla", "Moong Dal Chilla", "Moong dal chilla", "bd", "Punjabi", "q", "ot",
    "moong_dal 120, ginger 5, green_chilli 2, onion 1, oil 20, curd 100, coriander? 0.25", "besan_chilla",
    SOAK("1 cup moong dal", "1 katori moong dal", 8)],
  ["rava_uttapam", "Rava Uttapam", "Rava uttapam", "bd", "South Indian", "q", "ot",
    "rava 120, curd 100, onion 1, tomato 1, capsicum 0.5, green_chilli 2, oil 20, coriander? 0.25", "besan_chilla"],
  ["uttapam", "Onion Tomato Uttapam + Chutney", "Uttapam, chutney", "bd", "South Indian", "m", "ot",
    "idli_rice 150, urad_dal 50, methi_seeds 2, onion 1, tomato 1, capsicum 0.5, desiccated_coconut 30, chana_dalia 20, oil 25, coriander? 0.25", "besan_chilla", BATTER],
  ["idli_sambar", "Idli Sambar + Chutney", "Idli sambar", "b", "South Indian", "m", "ot",
    "idli_rice 150, urad_dal 50, toor_dal 60, dudhi 150, onion 1, tomato 1, tamarind 10, sambar_masala 10, curry_leaves 1, desiccated_coconut 30, chana_dalia 20", "upma", BATTER],
  ["masala_dosa", "Masala Dosa + Chutney", "Masala dosa", "bd", "South Indian", "l", "ot",
    "idli_rice 150, urad_dal 50, methi_seeds 2, potato 3, onion 1, green_chilli 2, curry_leaves 1, chana_dal 10, desiccated_coconut 30, chana_dalia 20, oil 30", "besan_chilla", BATTER],
  ["methi_thepla", "Methi Thepla + Curd", "Methi thepla, dahi", "bd", "Gujarati", "m", "ot",
    "atta 200, besan 30, methi 0.5, curd 150, sesame 5, ajwain 1, oil 30", "masala_bhakri"],
  ["dudhi_thepla", "Dudhi Thepla + Curd", "Dudhi thepla, dahi", "bd", "Gujarati", "m", "ot",
    "atta 200, besan 30, dudhi 150, curd 150, sesame 5, oil 30", "masala_bhakri"],
  ["masala_bhakri", "Masala Bhakri + Tea", "Bhakri", "b", "Gujarati", "q", "ot",
    "atta 200, ghee 20, ajwain 1, jeera 2, curd 100", "upma"],
  ["aloo_paratha", "Aloo Paratha + Curd", "Aloo paratha, dahi", "bl", "Punjabi", "m", "ot",
    "atta 200, potato 3, green_chilli 2, curd 200, butter 20, coriander? 0.25", "masala_bhakri"],
  ["gobi_paratha", "Gobi Paratha + Curd", "Gobi paratha, dahi", "bl", "Punjabi", "m", "ot",
    "atta 200, cauliflower 300, green_chilli 2, ginger 5, curd 200, butter 20, coriander? 0.25", "aloo_paratha"],
  ["paneer_paratha", "Paneer Paratha + Curd", "Paneer paratha, dahi", "bl", "Punjabi", "m", "ot",
    "atta 200, paneer 150, onion 1, green_chilli 2, curd 200, butter 20, coriander? 0.25", "aloo_paratha"],
  ["puri_bhaji", "Puri Bhaji", "Puri bhaji", "bl", "Maharashtrian", "l", "ot",
    "atta 200, potato 4, onion 1, green_chilli 2, curry_leaves 1, oil 250, TADKA, coriander? 0.25", "masala_bhakri"],
  ["sabudana_khichdi", "Sabudana Khichdi", "Sabudana khichdi", "b", "Maharashtrian", "m", "ot",
    "sabudana 150, potato 1, peanuts 60, green_chilli 2, lemon 1, ghee 20, coriander? 0.25", "batata_poha",
    SOAK("1 cup sabudana (just enough water to cover)", "1 katori sabudana (thoda hi paani)", 8)],
  ["khaman", "Khaman Dhokla", "Khaman", "b", "Gujarati", "m", "ot",
    "besan 150, lemon 1, eno 5, green_chilli 2, curry_leaves 1, sesame 5, sugar 15, oil 20, coriander? 0.25", "besan_chilla"],
  ["handvo", "Dudhi Handvo", "Handvo", "bd", "Gujarati", "l", "ot",
    "handvo_flour 200, curd 150, dudhi 150, sesame 10, green_chilli 2, ginger 5, oil 30", "besan_chilla",
    { en: "Mix handvo flour with curd and leave covered overnight to ferment", cook: "Raat ko handvo ka atta dahi mein mila ke dhak ke rakh dena", leadHours: 10 }],
  ["avocado_toast", "Avocado Toast", "Avocado toast", "b", "Continental", "q", "ot",
    "protein_bread 4, avocado 1, lemon 0.5, tomato 1, chilli_flakes 1, olive_oil 5", "besan_chilla"],
  ["pb_banana_toast", "Peanut Butter Banana Toast", "Peanut butter toast", "b", "Continental", "q", "ot",
    "protein_bread 4, peanut_butter 40, banana 2, honey 10", "upma"],
  ["paneer_bhurji_toast", "Paneer Bhurji on Toast", "Paneer bhurji toast", "b", "Punjabi", "q", "ot",
    "paneer 150, onion 1, tomato 1, capsicum 0.5, green_chilli 1, protein_bread 4, butter 15, coriander? 0.25", "besan_chilla"],
  ["veg_sandwich", "Bombay Veg Sandwich", "Veg sandwich", "bd", "Chaat & street", "q", "ot",
    "sandwich_bread 8, butter 30, coriander 0.5, mint 0.25, green_chilli 2, cucumber 1, tomato 1, potato 1, onion 1, sandwich_masala 3, beetroot? 0.5", "kanda_poha"],
  ["masala_toast", "Bombay Masala Toast (Aloo Cheese)", "Masala toast", "bd", "Chaat & street", "q", "ot",
    "sandwich_bread 8, potato 3, onion 1, cheese_slice 4, butter 30, coriander 0.5, green_chilli 2", "kanda_poha"],
  ["bread_upma", "Bread Upma", "Bread upma", "b", "South Indian", "q", "ot",
    "sandwich_bread 6, onion 1, tomato 1, green_chilli 2, curry_leaves 1, lemon 0.5, oil 15", "upma"],
  ["masala_oats", "Masala Oats", "Masala oats", "b", "Continental", "q", "ot",
    "oats 100, onion 1, tomato 1, carrot 80, frozen_peas 40, green_chilli 1, oil 10", "upma"],
  ["overnight_oats", "Overnight Oats with Banana", "Overnight oats", "b", "Continental", "q", "ot",
    "oats 100, milk 300, banana 2, chia 15, honey 10", "upma",
    { en: "Mix oats + milk + chia in a jar tonight and keep in the fridge", cook: "Raat ko oats, doodh aur chia ek dabbe mein mila ke fridge mein rakh dena", leadHours: 8 }],

  // ======================= ROTI + SABZI =======================
  ["palak_paneer", "Palak Paneer + Roti", "Palak paneer, roti", "ld", "Punjabi", "m", "rs",
    "palak 2, paneer 200, onion 1, tomato 1, ginger 10, garlic 10, green_chilli 2, garam_masala 2, TADKA, ROTI, cream? 25", "aloo_matar"],
  ["aloo_matar", "Aloo Matar + Roti", "Aloo matar, roti", "ld", "Punjabi", "q", "rs",
    "potato 3, frozen_peas 150, onion 1, tomato 2, ginger 5, TADKA, ROTI, coriander? 0.25", "jeera_aloo"],
  ["jeera_aloo", "Jeera Aloo + Roti", "Jeera aloo, roti", "l", "Punjabi", "q", "rs",
    "potato 4, jeera 5, green_chilli 2, lemon 0.5, TADKA, ROTI, coriander? 0.25", "aloo_matar"],
  ["batata_shaak", "Batata nu Shaak + Rotli", "Aloo ki sukhi sabzi, roti", "l", "Gujarati", "q", "rs",
    "potato 4, tomato 1, green_chilli 2, sugar 5, lemon 0.5, TADKA, ROTI", "jeera_aloo"],
  ["sev_tameta", "Sev Tameta + Rotli", "Sev tamatar, roti", "ld", "Gujarati", "q", "rs",
    "tomato 5, sev 80, onion 1, garlic 5, sugar 10, TADKA, ROTI, coriander? 0.25", "batata_shaak"],
  ["kobi_shaak", "Kobi nu Shaak + Rotli", "Kobi matar ki sabzi, roti", "l", "Gujarati", "q", "rs",
    "cabbage 400, frozen_peas 60, green_chilli 2, TADKA, ROTI", "batata_shaak"],
  ["kobi_bateta", "Kobi Bateta + Rotli", "Kobi aloo, roti", "l", "Gujarati", "q", "rs",
    "cabbage 300, potato 2, green_chilli 2, TADKA, ROTI", "batata_shaak"],
  ["bhinda_shaak", "Bhinda nu Shaak + Rotli", "Bhindi ki sabzi, roti", "l", "Gujarati", "q", "rs",
    "bhindi 300, onion 1, TADKA, ROTI", "jeera_aloo"],
  ["bhindi_masala", "Bhindi Masala + Roti", "Bhindi masala, roti", "ld", "Punjabi", "m", "rs",
    "bhindi 300, onion 2, tomato 2, amchur 3, TADKA, ROTI", "aloo_matar"],
  ["tindora_shaak", "Tindora nu Shaak + Rotli", "Tondli ki sabzi, roti", "l", "Gujarati", "q", "rs",
    "tindora 300, potato 1, TADKA, ROTI", "batata_shaak"],
  ["dudhi_chana", "Dudhi Chana Dal + Rotli", "Dudhi chana dal, roti", "l", "Gujarati", "q", "rs",
    "dudhi 400, chana_dal 50, tomato 1, TADKA, ROTI", "batata_shaak"],
  ["ringan_bateta", "Ringan Bateta + Rotli", "Baingan aloo, roti", "l", "Gujarati", "q", "rs",
    "brinjal 300, potato 1, tomato 1, TADKA, ROTI", "batata_shaak"],
  ["bharela_ringan", "Bharela Ringan + Rotli", "Bharwa baingan, roti", "ld", "Gujarati", "m", "rs",
    "baby_brinjal 300, peanuts 40, besan 20, sesame 5, jaggery 10, TADKA, ROTI", "batata_shaak"],
  ["baingan_bharta", "Baingan Bharta + Roti", "Baingan bharta, roti", "ld", "Punjabi", "m", "rs",
    "bharta_brinjal 1, onion 2, tomato 2, garlic 10, green_chilli 2, frozen_peas 50, TADKA, ROTI, coriander? 0.25", "aloo_matar"],
  ["gawar_shaak", "Gavar nu Shaak + Rotli", "Gavar ki sabzi, roti", "l", "Gujarati", "q", "rs",
    "gawar 250, ajwain 1, garlic 5, TADKA, ROTI", "batata_shaak"],
  ["fansi_shaak", "Fansi nu Shaak + Rotli", "Beans ki sabzi, roti", "l", "Gujarati", "q", "rs",
    "beans 250, potato 1, TADKA, ROTI", "batata_shaak"],
  ["papdi_shaak", "Surti Papdi nu Shaak + Rotli", "Papdi ki sabzi, roti", "l", "Gujarati", "m", "rs",
    "papdi 300, potato 1, ajwain 1, garlic 5, TADKA, ROTI", "batata_shaak"],
  ["turiya_shaak", "Turiya nu Shaak + Rotli", "Turai ki sabzi, roti", "l", "Gujarati", "q", "rs",
    "turai 400, tomato 1, TADKA, ROTI", "batata_shaak"],
  ["kolu_shaak", "Kolu nu Khatu-Mithu Shaak + Rotli", "Kaddu ki khatti-meethi sabzi, roti", "l", "Gujarati", "q", "rs",
    "pumpkin 400, jaggery 15, amchur 3, methi_seeds 1, TADKA, ROTI", "batata_shaak"],
  ["aloo_gobi", "Flower Bateta (Aloo Gobi) + Rotli", "Gobi aloo, roti", "ld", "Gujarati", "q", "rs",
    "cauliflower 400, potato 1, tomato 1, ginger 5, TADKA, ROTI, coriander? 0.25", "aloo_matar"],
  ["mix_veg", "Mixed Veg + Roti", "Mix veg, roti", "ld", "Punjabi", "m", "rs",
    "carrot 100, beans 100, cauliflower 200, capsicum 1, frozen_peas 60, onion 1, tomato 2, ginger 5, garlic 5, TADKA, ROTI, cream? 20", "aloo_matar"],
  ["aloo_methi", "Aloo Methi + Roti", "Aloo methi, roti", "l", "Punjabi", "q", "rs",
    "methi 1, potato 3, garlic 5, green_chilli 2, TADKA, ROTI", "jeera_aloo"],
  ["gajar_matar", "Gajar Matar + Roti", "Gajar matar, roti", "l", "Punjabi", "q", "rs",
    "carrot 300, frozen_peas 100, TADKA, ROTI", "aloo_matar"],
  ["capsicum_besan", "Shimla Mirch Besan + Rotli", "Shimla mirch besan, roti", "l", "Maharashtrian", "q", "rs",
    "capsicum 3, besan 40, TADKA, ROTI", "batata_shaak"],
  ["matar_paneer", "Matar Paneer + Roti", "Matar paneer, roti", "ld", "Punjabi", "m", "rs",
    "paneer 200, frozen_peas 120, onion 2, tomato 2, ginger 5, garlic 5, cashews 10, garam_masala 2, TADKA, ROTI", "aloo_matar"],
  ["kadhai_paneer", "Kadhai Paneer + Roti", "Kadhai paneer, roti", "ld", "Punjabi", "m", "rs",
    "paneer 200, capsicum 2, onion 2, tomato 2, ginger 5, garlic 5, kasuri_methi 2, TADKA, ROTI", "aloo_matar"],
  ["paneer_bhurji", "Paneer Bhurji + Roti", "Paneer bhurji, roti", "ld", "Punjabi", "q", "rs",
    "paneer 200, onion 1, tomato 2, capsicum 1, green_chilli 2, TADKA, ROTI, coriander? 0.25", "aloo_matar"],
  ["paneer_butter_masala", "Paneer Butter Masala + Butter Roti", "Paneer butter masala, roti", "d", "Punjabi", "l", "rs",
    "paneer 200, tomato 4, onion 1, cashews 25, butter 40, cream 50, kasuri_methi 2, ginger 10, garlic 10, garam_masala 3, ROTI", "aloo_matar"],
  ["soya_curry", "Soya Chunks Curry + Roti", "Soya chunks sabzi, roti", "ld", "Punjabi", "q", "rs",
    "soya_chunks 80, onion 2, tomato 2, ginger 5, garlic 5, garam_masala 2, TADKA, ROTI", "aloo_matar"],
  ["moong_shaak", "Mag nu Shaak + Rotli", "Sabut moong ki sabzi, roti", "l", "Gujarati", "q", "rs",
    "whole_moong 120, tomato 1, garlic 5, TADKA, ROTI", "batata_shaak", SOAK("1/2 cup whole moong", "aadhi katori sabut moong", 8)],
  ["matki_usal", "Matki Usal + Chapati", "Matki usal, chapati", "l", "Maharashtrian", "m", "rs",
    "matki 120, onion 1, tomato 1, goda_masala 8, desiccated_coconut 15, TADKA, ROTI, coriander? 0.25", "batata_shaak",
    { en: "Soak matki tonight; tomorrow morning drain and keep covered to sprout (ready day after)", cook: "Aaj raat matki bhigo dena, kal subah paani nikaal ke dhak ke rakh dena (ankur aane ke liye)", leadHours: 36 }],
  ["pithla_bhakri", "Pithla Bhakri", "Pithla bhakri", "ld", "Maharashtrian", "q", "rs",
    "besan 100, onion 1, garlic 10, green_chilli 3, jowar_atta 200, TADKA, coriander? 0.25", "kadhi_khichdi"],
  ["thalipeeth_pithla", "Thalipeeth + Pithla", "Thalipeeth, pithla", "d", "Maharashtrian", "m", "rs",
    "thalipeeth_bhajani 200, onion 2, besan 80, garlic 10, green_chilli 3, curd 100, butter 20, TADKA, coriander? 0.25", "pithla_bhakri"],

  // ======================= DAL / RICE =======================
  ["tadka_dal_rice", "Tadka Dal + Rice", "Dal tadka, chawal", "ld", "Punjabi", "q", "dr",
    "toor_dal 100, rice 150, onion 1, tomato 1, garlic 10, ghee 15, TADKA", "dal_khichdi"],
  ["gujarati_dal_bhaat", "Gujarati Dal Bhaat + Rotli", "Gujarati dal, chawal, roti", "l", "Gujarati", "q", "dr",
    "toor_dal 100, rice 120, atta 100, jaggery 20, kokum 4, peanuts 20, tomato 1, curry_leaves 1, TADKA", "tadka_dal_rice"],
  ["dal_khichdi", "Dal Khichdi + Papad", "Dal khichdi, papad", "ld", "Gujarati", "q", "dr",
    "rice 100, moong_dal 70, ghee 20, papad 4, TADKA", "kadhi_khichdi"],
  ["kadhi_khichdi", "Kadhi Khichdi", "Kadhi khichdi", "ld", "Gujarati", "q", "dr",
    "rice 100, moong_dal 60, curd 300, besan 30, ginger 5, green_chilli 2, curry_leaves 1, sugar 10, ghee 20, TADKA", "dal_khichdi"],
  ["masala_khichdi", "Vegetable Masala Khichdi + Curd", "Masala khichdi, dahi", "d", "Gujarati", "q", "dr",
    "rice 100, moong_dal 60, potato 1, onion 1, tomato 1, frozen_peas 60, ghee 20, curd 150, TADKA", "dal_khichdi"],
  ["dal_dhokli", "Dal Dhokli", "Dal dhokli", "ld", "Gujarati", "m", "dr",
    "toor_dal 100, atta 120, besan 20, jaggery 20, peanuts 30, tamarind 10, tomato 1, curry_leaves 1, TADKA", "tadka_dal_rice"],
  ["masoor_dal_rice", "Masoor Dal + Jeera Rice", "Masoor dal, jeera rice", "ld", "Punjabi", "q", "dr",
    "masoor_dal 100, rice 150, onion 1, tomato 1, garlic 10, ghee 15, TADKA", "tadka_dal_rice"],
  ["dal_palak_rice", "Dal Palak + Rice", "Palak dal, chawal", "l", "Punjabi", "q", "dr",
    "toor_dal 100, palak 1, garlic 10, tomato 1, rice 150, TADKA", "tadka_dal_rice"],
  ["rajma_chawal", "Rajma Chawal", "Rajma chawal", "ld", "Punjabi", "l", "dr",
    "rajma 150, rice 150, onion 2, tomato 3, ginger 10, garlic 10, garam_masala 2, TADKA", "tadka_dal_rice", SOAK("1 cup rajma", "1 katori rajma")],
  ["chole", "Chole + Roti", "Chole, roti", "ld", "Punjabi", "l", "dr",
    "kabuli_chana 150, onion 2, tomato 2, ginger 10, garlic 10, chole_masala 10, tea_bag 1, TADKA, ROTI", "aloo_matar", SOAK("1 cup chole", "1 katori chole")],
  ["sambar_rice", "Sambar Rice + Aloo Fry", "Sambar chawal, aloo fry", "l", "South Indian", "m", "dr",
    "toor_dal 100, rice 150, dudhi 150, onion 1, tomato 1, tamarind 10, sambar_masala 10, curry_leaves 1, potato 2, TADKA", "tadka_dal_rice"],
  ["curd_rice", "Curd Rice + Pickle", "Dahi chawal", "ld", "South Indian", "q", "dr",
    "rice 150, curd 300, milk 50, ginger 5, green_chilli 1, curry_leaves 1, urad_dal 5, TADKA, cucumber? 0.5", "dal_khichdi"],
  ["masale_bhaat", "Masale Bhaat + Curd", "Masale bhaat, dahi", "ld", "Maharashtrian", "m", "dr",
    "rice 150, tindora 150, frozen_peas 50, goda_masala 10, cashews 10, curd 150, TADKA", "tadka_dal_rice"],
  ["dal_makhani", "Dal Makhani + Jeera Rice", "Dal makhani, jeera rice", "d", "Punjabi", "l", "dr",
    "whole_urad 120, rajma 30, butter 30, cream 50, tomato 3, ginger 10, garlic 10, rice 150, TADKA", "tadka_dal_rice",
    SOAK("3/4 cup whole urad + a handful of rajma", "3/4 katori sabut urad aur thoda rajma")],
  ["veg_pulao", "Veg Pulao + Raita", "Veg pulao, raita", "ld", "Punjabi", "m", "dr",
    "basmati 180, carrot 100, beans 80, frozen_peas 60, potato 1, onion 1, whole_spices 3, curd 200, ghee 20, cucumber? 0.5", "tadka_dal_rice"],
  ["veg_biryani", "Veg Biryani + Raita", "Veg biryani, raita", "d", "Punjabi", "l", "dr",
    "basmati 200, carrot 100, beans 80, cauliflower 150, potato 1, onion 3, curd 250, mint 0.5, coriander 0.25, biryani_masala 10, ghee 30", "masala_khichdi"],

  // ======================= DINNER: Indo-Chinese, noodles, continental =======================
  ["tawa_pulao", "Tawa Pulao + Raita", "Tawa pulao", "d", "Chaat & street", "q", "ot",
    "rice 150, capsicum 1, onion 1, tomato 2, frozen_peas 50, pav_bhaji_masala 10, butter 20, lemon 0.5, curd 150, coriander? 0.25", "masala_khichdi"],
  ["mushroom_rice", "Mushroom Garlic Rice", "Mushroom rice", "d", "Indo-Chinese", "q", "ot",
    "basmati 150, mushroom 200, onion 1, garlic 15, soy_sauce 15, black_pepper 2, butter 15, spring_onion? 0.5", "masala_khichdi"],
  ["veg_fried_rice", "Veg Fried Rice", "Fried rice", "d", "Indo-Chinese", "q", "ot",
    "rice 150, cabbage 100, carrot 100, capsicum 1, beans 50, spring_onion 0.5, garlic 10, soy_sauce 15, vinegar 10, oil 25", "masala_khichdi"],
  ["schezwan_rice", "Schezwan Fried Rice", "Schezwan fried rice", "d", "Indo-Chinese", "q", "ot",
    "rice 150, cabbage 100, carrot 100, capsicum 1, garlic 10, schezwan_sauce 40, soy_sauce 10, oil 25, spring_onion? 0.5", "masala_khichdi"],
  ["hakka_noodles", "Veg Hakka Noodles", "Hakka noodles", "d", "Indo-Chinese", "q", "ot",
    "hakka_noodles 150, cabbage 100, carrot 100, capsicum 1, garlic 10, soy_sauce 15, vinegar 10, green_chilli_sauce 15, oil 25, spring_onion? 0.5", "masala_khichdi"],
  ["manchurian_rice", "Veg Manchurian + Fried Rice", "Manchurian, fried rice", "d", "Indo-Chinese", "l", "ot",
    "cabbage 250, carrot 200, capsicum 1, spring_onion 1, garlic 15, ginger 10, maida 40, cornflour 30, soy_sauce 20, vinegar 10, green_chilli_sauce 15, rice 150, oil 200", "masala_khichdi"],
  ["chilli_paneer", "Chilli Paneer + Fried Rice", "Chilli paneer, fried rice", "d", "Indo-Chinese", "m", "ot",
    "paneer 200, capsicum 2, onion 1, garlic 15, cornflour 25, soy_sauce 20, green_chilli_sauce 15, vinegar 10, rice 150, oil 60, spring_onion? 0.5", "masala_khichdi"],
  ["flat_noodles", "Flat Noodles with Broccoli", "Flat noodles", "d", "Asian noodles", "q", "ot",
    "flat_noodles 200, broccoli 150, capsicum 1, garlic 15, dark_soy 20, soy_sauce 10, sugar 5, oil 25, spring_onion? 0.5", "masala_khichdi"],
  ["korean_noodles", "Korean-style Spicy Noodles", "Korean noodles", "d", "Asian noodles", "q", "ot",
    "ramen_noodles 2, gochujang 30, soy_sauce 15, garlic 10, sesame_oil 10, sesame 5, cabbage 100, cheese_slice? 2, spring_onion? 0.5", "masala_khichdi"],
  ["peanut_noodles", "Peanut Sesame Noodles", "Peanut noodles", "d", "Asian noodles", "q", "ot",
    "hakka_noodles 150, peanut_butter 50, soy_sauce 20, garlic 10, chilli_flakes 2, cucumber 1, carrot 100, sesame 5, lemon 0.5, spring_onion? 0.5", "masala_khichdi"],
  ["pasta_arrabbiata", "Penne Arrabbiata", "Red sauce pasta", "d", "Continental", "q", "ot",
    "penne 200, tomato 5, garlic 15, olive_oil 25, chilli_flakes 2, oregano 2, capsicum 1, cheese 30", "masala_khichdi"],
  ["white_pasta", "White Sauce Pasta", "White sauce pasta", "d", "Continental", "q", "ot",
    "penne 200, milk 350, butter 30, maida 25, cheese 50, frozen_corn 80, capsicum 1, oregano 2, chilli_flakes 1", "masala_khichdi"],
  ["burrito_bowl", "Burrito Bowl (Rajma, Rice, Salsa, Guac)", "Burrito bowl", "d", "Continental", "l", "ot",
    "rajma 120, rice 150, frozen_corn 80, capsicum 1, onion 2, tomato 3, avocado 1, lemon 1, curd 100, garlic 10, coriander 0.25", "masala_khichdi",
    SOAK("3/4 cup rajma", "3/4 katori rajma")],
  ["quesadilla", "Bean & Corn Quesadilla", "Quesadilla", "d", "Continental", "q", "ot",
    "tortilla 6, cheese 120, baked_beans 1, frozen_corn 80, capsicum 1, onion 1, tomato 1", "masala_khichdi"],
  ["tomato_soup_sandwich", "Tomato Soup + Grilled Cheese Sandwich", "Tomato soup, cheese sandwich", "d", "Continental", "q", "ot",
    "tomato 6, onion 1, garlic 10, butter 30, sandwich_bread 6, cheese_slice 4, cream? 25", "masala_khichdi"],

  // ======================= DINNER: chaat & street food =======================
  ["vada_pav", "Vada Pav", "Vada pav", "d", "Chaat & street", "m", "ot",
    "potato 4, pav 6, besan 120, garlic 15, green_chilli 4, ginger 10, curry_leaves 1, coriander 0.5, dry_garlic_chutney 30, oil 300", "pithla_bhakri"],
  ["pav_bhaji", "Pav Bhaji", "Pav bhaji", "d", "Chaat & street", "m", "ot",
    "potato 3, cauliflower 150, capsicum 1, frozen_peas 100, tomato 4, onion 2, garlic 10, pav_bhaji_masala 15, butter 60, pav 8, lemon 1, coriander 0.5", "masala_khichdi"],
  ["misal_pav", "Misal Pav", "Misal pav", "d", "Maharashtrian", "m", "ot",
    "matki 150, onion 2, tomato 2, garlic 10, ginger 10, misal_masala 15, desiccated_coconut 20, farsan 120, pav 6, lemon 1, coriander 0.5", "pithla_bhakri",
    { en: "Soak matki tonight; tomorrow morning drain and keep covered to sprout (misal is the day after)", cook: "Aaj raat matki bhigo dena, kal subah paani nikaal ke dhak ke rakh dena (parso misal hai)", leadHours: 36 }],
  ["sev_puri", "Sev Puri", "Sev puri", "d", "Chaat & street", "q", "ot",
    "papdi_puri 24, potato 2, onion 1, sev 80, coriander 0.5, mint 0.25, green_chilli 2, imli_chutney 60, chaat_masala 3", "masala_khichdi"],
  ["pani_puri", "Pani Puri", "Pani puri", "d", "Chaat & street", "m", "ot",
    "panipuri_puri 40, potato 2, white_peas 80, mint 1, coriander 0.5, green_chilli 3, ginger 10, tamarind 30, jaggery 30, pani_puri_masala 10", "masala_khichdi",
    SOAK("1/2 cup white vatana", "aadhi katori safed vatana")],
  ["bhel_puri", "Bhel Puri", "Bhel", "d", "Chaat & street", "q", "ot",
    "mamra 150, sev 60, papdi_puri 6, onion 1, tomato 1, potato 1, coriander 0.5, imli_chutney 60, green_chilli 2, lemon 0.5, mint? 0.25", "masala_khichdi"],
  ["ragda_pattice", "Ragda Pattice", "Ragda pattice", "d", "Chaat & street", "m", "ot",
    "white_peas 120, potato 4, onion 1, sev 50, imli_chutney 60, coriander 0.5, mint 0.25, green_chilli 2, cornflour 10", "masala_khichdi",
    SOAK("3/4 cup white vatana", "3/4 katori safed vatana")],
  ["dahi_puri", "Dahi Puri", "Dahi puri", "d", "Chaat & street", "q", "ot",
    "panipuri_puri 30, potato 2, curd 250, sev 50, imli_chutney 60, coriander 0.5, mint 0.25, green_chilli 2, chaat_masala 3, sugar 10", "masala_khichdi"],
  ["aloo_tikki_chaat", "Aloo Tikki Chaat", "Aloo tikki chaat", "d", "Chaat & street", "m", "ot",
    "potato 4, frozen_peas 50, cornflour 15, curd 200, imli_chutney 60, sev 40, onion 1, coriander 0.5, mint 0.25, chaat_masala 3", "masala_khichdi"],
  ["dabeli", "Kutchi Dabeli", "Dabeli", "d", "Chaat & street", "m", "ot",
    "dabeli_pav 6, potato 3, dabeli_masala 15, masala_peanuts 50, pomegranate 0.5, sev 50, onion 1, imli_chutney 60, butter 20, garlic 5", "masala_khichdi"],
  ["paneer_frankie", "Paneer Frankie", "Paneer frankie", "d", "Chaat & street", "m", "ot",
    "atta 150, maida 50, paneer 200, onion 2, capsicum 1, cabbage 80, chaat_masala 5, coriander 0.5, mint 0.25, green_chilli 2, oil 30", "masala_khichdi"],
];

export const DISHES: Dish[] = ROWS.map(([id, nameEn, nameCook, slots, cuisine, effort, kind, ings, planBId, prep]) => ({
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
}));

export const DISH_BY_ID: Record<string, Dish> = Object.fromEntries(DISHES.map((d) => [d.id, d]));
