// Ingredient master list.
//
// Two buckets (see brief section 3.2):
//   - "staple": never computed from recipes. Bought on a restock cycle or when the
//     cook reports "running low".
//   - "fresh" / "specialty": computed exactly from the approved weekly menu.
//
// Units: every ingredient has ONE recipe unit (g, ml, pc, bunch). Dish quantities are
// always in that unit. `pack` is how many recipe units one purchasable unit holds,
// and `packLabel` is what we write on the shopping list.
//
// shelfLife: realistic days in a Mumbai home fridge from the day it reaches home.
// Source: "grocer" = Shubham Vegetable (opposite office), "blinkit", "either".

export type IngredientCategory = "staple" | "fresh" | "specialty";
export type IngredientSource = "grocer" | "blinkit" | "either";
export type RecipeUnit = "g" | "ml" | "pc" | "bunch";

export interface Ingredient {
  id: string;
  nameEn: string;
  nameCook: string; // Hindi/Marathi word the cook uses, Roman script
  category: IngredientCategory;
  source: IngredientSource;
  unit: RecipeUnit;
  pack: number; // recipe units per purchasable unit
  packLabel: string; // e.g. "250 g", "1 bunch", "1 packet (200 g)"
  shelfLifeDays: number;
  restockDays?: number; // staples only
  restockQty?: string; // staples only, what to buy each cycle
}

type Row = [
  id: string,
  nameEn: string,
  nameCook: string,
  category: IngredientCategory,
  source: IngredientSource,
  unit: RecipeUnit,
  pack: number,
  packLabel: string,
  shelfLifeDays: number,
  restockDays?: number,
  restockQty?: string,
];

// prettier-ignore
const ROWS: Row[] = [
  // ---------- STAPLES: grains, flours, dals ----------
  ["atta", "Wheat atta", "Gehu ka atta", "staple", "blinkit", "g", 5000, "5 kg bag", 90, 21, "5 kg"],
  ["rice", "Rice (daily)", "Chawal", "staple", "blinkit", "g", 5000, "5 kg bag", 365, 30, "5 kg"],
  ["basmati", "Basmati rice", "Basmati chawal", "staple", "blinkit", "g", 1000, "1 kg", 365, 45, "1 kg"],
  ["idli_rice", "Idli rice", "Idli chawal", "staple", "blinkit", "g", 1000, "1 kg", 365, 45, "1 kg"],
  ["toor_dal", "Toor dal", "Toor dal", "staple", "blinkit", "g", 1000, "1 kg", 180, 30, "1 kg"],
  ["moong_dal", "Yellow moong dal", "Moong dal", "staple", "blinkit", "g", 1000, "1 kg", 180, 30, "1 kg"],
  ["masoor_dal", "Masoor dal", "Masoor dal", "staple", "blinkit", "g", 500, "500 g", 180, 45, "500 g"],
  ["chana_dal", "Chana dal", "Chana dal", "staple", "blinkit", "g", 500, "500 g", 180, 45, "500 g"],
  ["urad_dal", "Urad dal (white)", "Urad dal", "staple", "blinkit", "g", 500, "500 g", 180, 45, "500 g"],
  ["whole_urad", "Whole black urad", "Sabut urad", "staple", "blinkit", "g", 500, "500 g", 180, 60, "500 g"],
  ["whole_moong", "Whole green moong", "Sabut moong", "staple", "blinkit", "g", 500, "500 g", 180, 45, "500 g"],
  ["rajma", "Rajma", "Rajma", "staple", "blinkit", "g", 500, "500 g", 180, 45, "500 g"],
  ["kabuli_chana", "Kabuli chana", "Chole / Kabuli chana", "staple", "blinkit", "g", 500, "500 g", 180, 45, "500 g"],
  ["white_peas", "Dried white peas", "Safed vatana", "staple", "blinkit", "g", 500, "500 g", 180, 45, "500 g"],
  ["matki", "Matki (moth beans)", "Matki", "staple", "blinkit", "g", 500, "500 g", 180, 45, "500 g"],
  ["soya_chunks", "Soya chunks", "Soya chunks", "staple", "blinkit", "g", 200, "200 g", 180, 45, "200 g"],
  ["besan", "Besan", "Besan", "staple", "blinkit", "g", 1000, "1 kg", 120, 30, "1 kg"],
  ["poha", "Poha (thick)", "Pohe", "staple", "blinkit", "g", 500, "500 g", 90, 21, "500 g"],
  ["rava", "Rava / sooji", "Rava", "staple", "blinkit", "g", 500, "500 g", 90, 30, "500 g"],
  ["vermicelli", "Vermicelli", "Sevai", "staple", "blinkit", "g", 400, "400 g", 180, 45, "400 g"],
  ["sabudana", "Sabudana", "Sabudana", "staple", "blinkit", "g", 500, "500 g", 180, 45, "500 g"],
  ["jowar_atta", "Jowar atta", "Jowar ka atta", "staple", "blinkit", "g", 1000, "1 kg", 60, 45, "1 kg"],
  ["rice_flour", "Rice flour", "Chawal ka atta", "staple", "blinkit", "g", 500, "500 g", 90, 45, "500 g"],
  ["handvo_flour", "Handvo flour", "Handvo ka atta", "staple", "blinkit", "g", 500, "500 g", 90, 45, "500 g"],
  ["thalipeeth_bhajani", "Thalipeeth bhajani", "Thalipeeth bhajani", "staple", "blinkit", "g", 500, "500 g", 60, 45, "500 g"],
  ["maida", "Maida", "Maida", "staple", "blinkit", "g", 500, "500 g", 120, 60, "500 g"],
  ["cornflour", "Cornflour", "Cornflour", "staple", "blinkit", "g", 200, "200 g", 180, 60, "200 g"],
  ["oats", "Rolled oats", "Oats", "staple", "blinkit", "g", 1000, "1 kg", 180, 30, "1 kg"],
  ["papad", "Papad", "Papad", "staple", "blinkit", "pc", 20, "1 packet", 180, 45, "1 packet"],

  // ---------- STAPLES: oils, dairy, sweeteners ----------
  ["oil", "Cooking oil", "Tel", "staple", "blinkit", "ml", 1000, "1 L", 180, 21, "1 L"],
  ["ghee", "Ghee", "Ghee", "staple", "blinkit", "ml", 500, "500 ml", 180, 30, "500 ml"],
  ["olive_oil", "Olive oil", "Olive oil", "staple", "blinkit", "ml", 500, "500 ml", 365, 90, "500 ml"],
  ["sesame_oil", "Sesame oil", "Til ka tel", "staple", "blinkit", "ml", 250, "250 ml", 365, 120, "250 ml"],
  ["butter", "Butter", "Butter / makhan", "staple", "blinkit", "g", 100, "100 g", 60, 14, "100 g"],
  ["milk", "Milk", "Doodh", "staple", "either", "ml", 500, "500 ml", 2, 1, "daily milk"],
  ["curd", "Curd (set at home)", "Dahi", "staple", "either", "g", 400, "400 g", 3, 1, "set daily from milk"],
  ["sugar", "Sugar", "Cheeni", "staple", "blinkit", "g", 1000, "1 kg", 365, 45, "1 kg"],
  ["jaggery", "Jaggery", "Gud", "staple", "blinkit", "g", 500, "500 g", 180, 45, "500 g"],
  ["honey", "Honey", "Shahad", "staple", "blinkit", "g", 250, "250 g", 365, 90, "250 g"],
  ["salt", "Salt", "Namak", "staple", "blinkit", "g", 1000, "1 kg", 365, 60, "1 kg"],

  // ---------- STAPLES: everyday "kitchen basics" restocked weekly ----------
  ["onion", "Onion", "Kanda / pyaaz", "staple", "grocer", "pc", 1, "kg", 21, 7, "2 kg"],
  ["potato", "Potato", "Batata / aloo", "staple", "grocer", "pc", 1, "kg", 21, 7, "2 kg"],
  ["tomato", "Tomato", "Tamatar", "staple", "grocer", "pc", 1, "kg", 6, 7, "1.5 kg"],
  ["ginger", "Ginger", "Adrak", "staple", "grocer", "g", 100, "100 g", 14, 7, "100 g"],
  ["garlic", "Garlic", "Lasun", "staple", "grocer", "g", 100, "100 g", 21, 7, "150 g"],
  ["green_chilli", "Green chilli", "Hari mirchi", "staple", "grocer", "pc", 1, "100 g", 7, 7, "100 g"],
  ["lemon", "Lemon", "Nimbu", "staple", "grocer", "pc", 1, "pc", 10, 7, "6 pc"],
  ["curry_leaves", "Curry leaves", "Kadi patta", "staple", "grocer", "pc", 1, "1 bunch", 10, 7, "1 bunch"],
  ["frozen_peas", "Frozen green peas", "Frozen matar", "staple", "blinkit", "g", 500, "500 g", 90, 21, "500 g"],
  ["frozen_corn", "Frozen sweet corn", "Frozen makai", "staple", "blinkit", "g", 500, "500 g", 90, 30, "500 g"],

  // ---------- STAPLES: spices, nuts, condiments ----------
  ["jeera", "Cumin seeds", "Jeera", "staple", "blinkit", "g", 100, "100 g", 365, 60, "100 g"],
  ["rai", "Mustard seeds", "Rai", "staple", "blinkit", "g", 100, "100 g", 365, 90, "100 g"],
  ["haldi", "Turmeric", "Haldi", "staple", "blinkit", "g", 100, "100 g", 365, 60, "100 g"],
  ["hing", "Hing", "Hing", "staple", "blinkit", "g", 50, "50 g", 365, 120, "50 g"],
  ["red_chilli_powder", "Red chilli powder", "Lal mirchi powder", "staple", "blinkit", "g", 100, "100 g", 365, 60, "100 g"],
  ["dhania_jeera", "Dhania-jeera powder", "Dhania jeera powder", "staple", "blinkit", "g", 100, "100 g", 365, 60, "100 g"],
  ["garam_masala", "Garam masala", "Garam masala", "staple", "blinkit", "g", 100, "100 g", 365, 90, "100 g"],
  ["ajwain", "Ajwain", "Ajwain", "staple", "blinkit", "g", 50, "50 g", 365, 120, "50 g"],
  ["methi_seeds", "Fenugreek seeds", "Methi dana", "staple", "blinkit", "g", 100, "100 g", 365, 120, "100 g"],
  ["sesame", "Sesame seeds", "Til", "staple", "blinkit", "g", 100, "100 g", 365, 90, "100 g"],
  ["kasuri_methi", "Kasuri methi", "Kasuri methi", "staple", "blinkit", "g", 25, "25 g", 365, 120, "25 g"],
  ["amchur", "Amchur", "Amchur", "staple", "blinkit", "g", 100, "100 g", 365, 120, "100 g"],
  ["black_pepper", "Black pepper", "Kali mirch", "staple", "blinkit", "g", 50, "50 g", 365, 120, "50 g"],
  ["whole_spices", "Whole spices (bay, clove, cinnamon)", "Khada masala", "staple", "blinkit", "g", 50, "50 g", 365, 120, "50 g"],
  ["cardamom", "Cardamom", "Elaichi", "staple", "blinkit", "pc", 20, "small pack", 365, 120, "1 pack"],
  ["chaat_masala", "Chaat masala", "Chaat masala", "staple", "blinkit", "g", 100, "100 g", 365, 90, "100 g"],
  ["sambar_masala", "Sambar masala", "Sambar masala", "staple", "blinkit", "g", 100, "100 g", 365, 90, "100 g"],
  ["pav_bhaji_masala", "Pav bhaji masala", "Pav bhaji masala", "staple", "blinkit", "g", 100, "100 g", 365, 90, "100 g"],
  ["chole_masala", "Chole masala", "Chole masala", "staple", "blinkit", "g", 100, "100 g", 365, 90, "100 g"],
  ["goda_masala", "Goda masala", "Goda masala", "staple", "blinkit", "g", 100, "100 g", 365, 90, "100 g"],
  ["misal_masala", "Misal masala", "Misal masala", "staple", "blinkit", "g", 100, "100 g", 365, 90, "100 g"],
  ["biryani_masala", "Biryani masala", "Biryani masala", "staple", "blinkit", "g", 50, "50 g", 365, 120, "50 g"],
  ["dabeli_masala", "Dabeli masala", "Dabeli masala", "staple", "blinkit", "g", 100, "100 g", 365, 120, "100 g"],
  ["pani_puri_masala", "Pani puri masala", "Pani puri masala", "staple", "blinkit", "g", 100, "100 g", 365, 120, "100 g"],
  ["sandwich_masala", "Sandwich masala", "Sandwich masala", "staple", "blinkit", "g", 100, "100 g", 365, 120, "100 g"],
  ["chilli_flakes", "Chilli flakes", "Chilli flakes", "staple", "blinkit", "g", 50, "50 g", 365, 120, "50 g"],
  ["oregano", "Oregano", "Oregano", "staple", "blinkit", "g", 20, "20 g", 365, 120, "20 g"],
  ["tamarind", "Tamarind", "Imli", "staple", "blinkit", "g", 200, "200 g", 365, 90, "200 g"],
  ["kokum", "Kokum", "Kokum", "staple", "blinkit", "pc", 30, "100 g", 365, 120, "100 g"],
  ["eno", "Eno fruit salt", "Eno", "staple", "blinkit", "g", 100, "100 g", 365, 120, "1 pack"],
  ["tea_bag", "Tea bags (for chole colour)", "Chai patti", "staple", "blinkit", "pc", 25, "25 bags", 365, 120, "1 box"],
  ["peanuts", "Peanuts", "Shengdana / moongfali", "staple", "blinkit", "g", 500, "500 g", 120, 30, "500 g"],
  ["cashews", "Cashews", "Kaju", "staple", "blinkit", "g", 200, "200 g", 180, 60, "200 g"],
  ["chana_dalia", "Roasted chana (dalia)", "Dalia / phutana", "staple", "blinkit", "g", 200, "200 g", 120, 60, "200 g"],
  ["desiccated_coconut", "Desiccated coconut", "Sukha khobra", "staple", "blinkit", "g", 200, "200 g", 120, 60, "200 g"],
  ["chia", "Chia seeds", "Chia seeds", "staple", "blinkit", "g", 200, "200 g", 365, 90, "200 g"],
  ["soy_sauce", "Soy sauce", "Soy sauce", "staple", "blinkit", "ml", 200, "200 ml", 365, 60, "200 ml"],
  ["vinegar", "Vinegar", "Sirka", "staple", "blinkit", "ml", 200, "200 ml", 365, 90, "200 ml"],
  ["green_chilli_sauce", "Green chilli sauce", "Chilli sauce", "staple", "blinkit", "ml", 200, "200 ml", 365, 90, "200 ml"],
  ["dry_garlic_chutney", "Dry garlic chutney", "Sukhi lasun chutney", "staple", "blinkit", "g", 100, "100 g", 90, 60, "100 g"],
  ["masala_peanuts", "Masala peanuts", "Masala shengdana", "staple", "blinkit", "g", 200, "200 g", 60, 60, "200 g"],

  // ---------- FRESH: from Shubham Vegetable ----------
  ["coriander", "Coriander", "Kothimbir / dhaniya", "fresh", "grocer", "bunch", 1, "1 bunch", 3],
  ["mint", "Mint", "Pudina", "fresh", "grocer", "bunch", 1, "1 bunch", 3],
  ["spring_onion", "Spring onion", "Hara pyaaz", "fresh", "grocer", "bunch", 1, "1 bunch", 3],
  ["palak", "Palak", "Palak", "fresh", "grocer", "bunch", 1, "1 bunch", 2],
  ["methi", "Methi leaves", "Methi", "fresh", "grocer", "bunch", 1, "1 bunch", 2],
  ["mushroom", "Button mushrooms", "Mushroom", "fresh", "either", "g", 200, "200 g box", 2],
  ["bhindi", "Bhindi", "Bhindi", "fresh", "grocer", "g", 250, "250 g", 3],
  ["turai", "Ridge gourd", "Turai / dodka", "fresh", "grocer", "g", 250, "250 g", 3],
  ["broccoli", "Broccoli", "Broccoli", "fresh", "either", "g", 250, "1 head (~250 g)", 3],
  ["gawar", "Gavar (cluster beans)", "Gavar", "fresh", "grocer", "g", 250, "250 g", 4],
  ["beans", "French beans", "Fansi / farasbi", "fresh", "grocer", "g", 250, "250 g", 4],
  ["papdi", "Surti papdi", "Papdi", "fresh", "grocer", "g", 250, "250 g", 4],
  ["cauliflower", "Cauliflower", "Phool gobi", "fresh", "grocer", "g", 500, "1 small (~500 g)", 4],
  ["brinjal", "Brinjal (medium)", "Vangi / baingan", "fresh", "grocer", "g", 250, "250 g", 4],
  ["baby_brinjal", "Small brinjal (for stuffing)", "Chhote baingan", "fresh", "grocer", "g", 250, "250 g", 4],
  ["bharta_brinjal", "Large brinjal (bharta)", "Bharta wala bada baingan", "fresh", "grocer", "pc", 1, "1 large", 4],
  ["capsicum", "Capsicum", "Shimla mirch", "fresh", "grocer", "pc", 1, "1 pc", 5],
  ["tindora", "Tindora", "Tondli", "fresh", "grocer", "g", 250, "250 g", 5],
  ["cucumber", "Cucumber", "Kakdi", "fresh", "grocer", "pc", 1, "1 pc", 5],
  ["dudhi", "Dudhi", "Dudhi / lauki", "fresh", "grocer", "g", 500, "1 small (~500 g)", 6],
  ["cabbage", "Cabbage", "Kobi / patta gobi", "fresh", "grocer", "g", 500, "1 small (~500 g)", 7],
  ["pomegranate", "Pomegranate", "Anar", "fresh", "grocer", "pc", 1, "1 pc", 7],
  ["carrot", "Carrot", "Gajar", "fresh", "grocer", "g", 250, "250 g (~3 pc)", 10],
  ["pumpkin", "Red pumpkin", "Lal kaddu / bhopla", "fresh", "grocer", "g", 500, "500 g slice", 10],
  ["beetroot", "Beetroot", "Beetroot", "fresh", "grocer", "pc", 1, "1 pc", 10],
  ["banana", "Banana", "Kela", "fresh", "grocer", "pc", 1, "1 pc", 4],

  // ---------- FRESH: dairy & bakery (Blinkit, or either) ----------
  ["paneer", "Paneer", "Paneer", "fresh", "blinkit", "g", 200, "200 g pack", 4],
  ["cream", "Fresh cream", "Malai / cream", "fresh", "blinkit", "ml", 200, "200 ml", 5],
  ["pav", "Pav", "Pav", "fresh", "either", "pc", 6, "1 packet (6 pav)", 2],
  ["dabeli_pav", "Dabeli pav", "Dabeli pav", "fresh", "either", "pc", 6, "1 packet (6)", 2],
  ["sandwich_bread", "Sandwich bread", "Bread", "fresh", "either", "pc", 16, "1 loaf (~16 slices)", 4],
  ["protein_bread", "High-protein bread", "Protein bread", "specialty", "blinkit", "pc", 12, "1 loaf (~12 slices)", 5],
  ["avocado", "Avocado", "Avocado", "specialty", "blinkit", "pc", 1, "1 pc", 3],
  ["tortilla", "Wheat tortillas", "Tortilla", "specialty", "blinkit", "pc", 6, "1 pack (6)", 10],
  ["cheese", "Cheese block (veg)", "Cheese", "specialty", "blinkit", "g", 200, "200 g", 30],
  ["cheese_slice", "Cheese slices (veg)", "Cheese slice", "specialty", "blinkit", "pc", 10, "1 pack (10)", 30],

  // ---------- SPECIALTY: chaat & farsan (long-ish life, but dish-specific) ----------
  ["sev", "Nylon sev", "Sev", "fresh", "either", "g", 200, "200 g", 30],
  ["farsan", "Misal farsan", "Farsan", "fresh", "either", "g", 200, "200 g", 30],
  ["mamra", "Puffed rice", "Kurmura / mamra", "fresh", "either", "g", 200, "200 g", 14],
  ["papdi_puri", "Flat puris (sev puri papdi)", "Papdi", "fresh", "either", "pc", 30, "1 packet (~30)", 15],
  ["panipuri_puri", "Pani puri puris", "Pani puri ki puri", "fresh", "either", "pc", 50, "1 packet (~50)", 7],
  ["imli_chutney", "Sweet tamarind chutney", "Meethi chutney", "specialty", "blinkit", "g", 200, "200 g bottle", 30],

  // ---------- SPECIALTY: noodles, pasta, sauces (Blinkit) ----------
  ["hakka_noodles", "Hakka noodles (veg)", "Hakka noodles", "specialty", "blinkit", "g", 150, "150 g packet", 180],
  ["flat_noodles", "Flat rice noodles", "Flat noodles", "specialty", "blinkit", "g", 200, "200 g packet", 180],
  ["ramen_noodles", "Plain ramen noodles (veg)", "Ramen noodles", "specialty", "blinkit", "pc", 1, "1 block", 180],
  ["penne", "Penne pasta", "Pasta", "specialty", "blinkit", "g", 500, "500 g", 180],
  ["schezwan_sauce", "Schezwan sauce", "Schezwan chutney", "specialty", "blinkit", "g", 250, "250 g", 90],
  ["dark_soy", "Dark soy sauce", "Dark soy sauce", "specialty", "blinkit", "ml", 200, "200 ml", 180],
  ["gochujang", "Gochujang (veg)", "Gochujang", "specialty", "blinkit", "g", 200, "200 g tub", 180],
  ["peanut_butter", "Peanut butter", "Peanut butter", "specialty", "blinkit", "g", 350, "350 g jar", 90],
  ["baked_beans", "Baked beans (tin)", "Baked beans", "specialty", "blinkit", "pc", 1, "1 tin", 365],
];

export const INGREDIENTS: Ingredient[] = ROWS.map(
  ([id, nameEn, nameCook, category, source, unit, pack, packLabel, shelfLifeDays, restockDays, restockQty]) => ({
    id, nameEn, nameCook, category, source, unit, pack, packLabel, shelfLifeDays, restockDays, restockQty,
  }),
);

export const INGREDIENT_BY_ID: Record<string, Ingredient> = Object.fromEntries(
  INGREDIENTS.map((i) => [i.id, i]),
);
