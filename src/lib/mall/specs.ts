/**
 * Data that drives the generated ShopNGo Mall catalogue (2,230 products).
 * Brands and stores are invented, so no real company is described.
 */

export type StoreSpec = { key: string; name: string; description: string; brands: string[] };

export type ParentSpec = {
  id: string;
  name: string;
  slug: string;
  /** Existing parent from the starter catalogue: do not recreate it. */
  existing?: boolean;
  stores: StoreSpec[];
};

export type SubSpec = {
  id: string;
  parent: string;
  name: string;
  slug: string;
  existing?: boolean;
  quota: number;
  icon: string;
  /** Short sentence fragments that follow "<Brand> <Series> <Noun>" */
  nouns: string[];
  variants: string[];
  features: string[];
  uses: string[];
  price: [number, number];
  stock: [number, number];
};

export const MALL_PARENTS: ParentSpec[] = [
  {
    id: "cat-fashion",
    name: "Fashion",
    slug: "fashion",
    stores: [
      { key: "urbanloom", name: "Urbanloom Fashion House", description: "Everyday clothing, footwear and bags for the whole family.", brands: ["Urbanloom", "Kesar & Co", "Threadwell", "Indigo Lane"] },
      { key: "stridewise", name: "Stridewise Style Studio", description: "Shoes, watches and accessories chosen for comfort.", brands: ["Stridewise", "Moda Nest", "Tanvi Trends", "Roamer"] },
    ],
  },
  {
    id: "cat-electronics",
    name: "Electronics",
    slug: "electronics",
    existing: true,
    stores: [
      { key: "voltedge", name: "VoltEdge Electronics", description: "Phones, laptops and everyday gadgets.", brands: ["VoltEdge", "Nexora", "Pixelon", "Zenbyte"] },
      { key: "soundhive", name: "SoundHive Tech", description: "Audio, wearables, cameras and gaming gear.", brands: ["SoundHive", "Aurion", "Tekvia", "Glyph"] },
    ],
  },
  {
    id: "cat-home",
    name: "Home & Living",
    slug: "home-living",
    existing: true,
    stores: [
      { key: "hearthstone", name: "Hearthstone Home", description: "Kitchenware, furniture and home decor.", brands: ["Hearthstone", "Casa Verde", "Maple & Mason", "Nivaas"] },
      { key: "cozynest", name: "CozyNest Living", description: "Bedding, bath, lighting and appliances.", brands: ["CozyNest", "Lumina Home", "Aangan", "PureHaus"] },
    ],
  },
  {
    id: "cat-beauty",
    name: "Beauty & Personal Care",
    slug: "beauty-personal-care",
    stores: [
      { key: "glowleaf", name: "GlowLeaf Beauty", description: "Skincare, haircare and makeup for every day.", brands: ["GlowLeaf", "Rosewater", "Veda Naturals", "Lakshya"] },
      { key: "freshmark", name: "Freshmark Grooming", description: "Fragrance and grooming essentials.", brands: ["Freshmark", "Oud & Oak", "Cedar Crest", "Zest"] },
    ],
  },
  {
    id: "cat-grocery",
    name: "Grocery & Gourmet",
    slug: "grocery-gourmet",
    stores: [
      { key: "farmfresh", name: "Farmfresh Pantry", description: "Staples, spices and dry fruits.", brands: ["Farmfresh", "Annapurna Select", "Golden Harvest", "Desi Roots"] },
      { key: "snackshala", name: "Snackshala", description: "Snacks, beverages and breakfast favourites.", brands: ["Snackshala", "Chai Tales", "Crunchy Corner", "Morning Mill"] },
    ],
  },
  {
    id: "cat-sports",
    name: "Sports & Fitness",
    slug: "sports-fitness",
    stores: [
      { key: "fitforge", name: "FitForge Sports", description: "Training, yoga, team sports and outdoor kit.", brands: ["FitForge", "Pacer", "Summit Peak", "Rally"] },
    ],
  },
  {
    id: "cat-toys",
    name: "Toys, Kids & Baby",
    slug: "toys-kids-baby",
    stores: [
      { key: "tinytrail", name: "TinyTrail Toys", description: "Toys, games and baby care.", brands: ["TinyTrail", "Playnest", "Little Sprout", "Brainbox"] },
    ],
  },
  {
    id: "cat-books",
    name: "Books & Notes",
    slug: "books-notes",
    existing: true,
    stores: [
      { key: "pageturner", name: "Pageturner Books & Stationery", description: "Printed books and stationery.", brands: ["Pageturner", "Inkwell", "Folio", "Sutra Press"] },
    ],
  },
  {
    id: "cat-health",
    name: "Health & Wellness",
    slug: "health-wellness",
    stores: [
      { key: "wellspring", name: "Wellspring Health", description: "Everyday wellness and care.", brands: ["Wellspring", "Ayuvita", "Vital Leaf", "Calmora"] },
    ],
  },
  {
    id: "cat-auto-pets-garden",
    name: "Auto, Pets & Garden",
    slug: "auto-pets-garden",
    stores: [
      { key: "roadpaws", name: "RoadPaws & Garden", description: "Car care, pet supplies and gardening.", brands: ["RoadPaws", "Torque", "Pawsome", "Greenthumb"] },
    ],
  },
];

const clothingFeatures = [
  "is cut from a soft cotton-blend fabric that stays comfortable after repeated washes",
  "has reinforced stitching at the seams so it keeps its shape through daily wear",
  "uses a breathable fabric that feels light even on warm days",
  "has a relaxed, easy fit with a clean finish that looks neat without ironing",
  "is made from a durable, colour-fast fabric that resists fading",
  "comes with a tag-free inner neckline and smooth seams for all-day comfort",
];
const clothingUses = ["office days and weekend outings", "travel and everyday errands", "casual get-togethers and festive visits", "layering through the changing seasons", "college, work and relaxed evenings"];
const colours = ["Navy Blue", "Charcoal Grey", "Olive Green", "Maroon", "Mustard Yellow", "Teal", "Black", "Off White", "Sky Blue", "Brick Red"];

const electronicsUses = ["daily use at home and at work", "travel, study and entertainment", "busy schedules where reliability matters", "families who share one device", "anyone upgrading from an older model"];

export const MALL_SUBCATEGORIES: SubSpec[] = [
  // ---------------------------------------------------------------- Fashion
  { id: "mall-cat-mens-clothing", parent: "cat-fashion", name: "Men's Clothing", slug: "mens-clothing", quota: 70, icon: "Shirt", nouns: ["Cotton T-Shirt", "Casual Shirt", "Slim Fit Chinos", "Denim Jeans", "Pullover Hoodie", "Polo T-Shirt", "Cargo Shorts", "Kurta", "Track Pants", "Zip Jacket"], variants: colours, features: clothingFeatures, uses: clothingUses, price: [399, 3499], stock: [20, 260] },
  { id: "mall-cat-womens-clothing", parent: "cat-fashion", name: "Women's Clothing", slug: "womens-clothing", quota: 80, icon: "Shirt", nouns: ["Printed Kurti", "Cotton Palazzo", "A-Line Dress", "Straight Fit Jeans", "Cotton Saree", "Casual Top", "Cardigan", "Leggings", "Anarkali Suit", "Denim Jacket"], variants: colours, features: clothingFeatures, uses: clothingUses, price: [349, 4999], stock: [20, 260] },
  { id: "mall-cat-kids-wear", parent: "cat-fashion", name: "Kids' Clothing", slug: "kids-clothing", quota: 40, icon: "Baby", nouns: ["Cotton Frock", "Graphic T-Shirt", "Jogger Pants", "Hooded Sweatshirt", "Pyjama Set", "Denim Dungarees", "School Shorts"], variants: ["Age 2-3 Years", "Age 4-5 Years", "Age 6-7 Years", "Age 8-9 Years", "Age 10-11 Years", "Age 12-13 Years"], features: ["is made from gentle, skin-friendly cotton that is safe for sensitive skin", "has soft elastic and flat seams so little ones can move freely", "uses colour-fast fabric that survives rough play and frequent washing"], uses: ["school days and playdates", "birthday parties and family trips", "everyday play at home"], price: [249, 1799], stock: [20, 200] },
  { id: "mall-cat-footwear", parent: "cat-fashion", name: "Footwear", slug: "footwear", quota: 70, icon: "Footprints", nouns: ["Running Shoes", "Canvas Sneakers", "Leather Formal Shoes", "Sports Sandals", "Flip Flops", "Loafers", "Walking Shoes", "Ethnic Juttis", "Ankle Boots"], variants: ["Black, UK 7", "Black, UK 8", "Brown, UK 8", "Brown, UK 9", "White, UK 6", "White, UK 7", "Navy, UK 9", "Grey, UK 10", "Tan, UK 6", "Beige, UK 7"], features: ["has a cushioned insole and flexible sole that stay comfortable on long walks", "uses a lightweight, breathable upper with a grippy outsole for steady footing", "is finished with durable stitching and a padded collar to prevent rubbing"], uses: ["daily commutes and long walking days", "workouts, errands and weekend plans", "office wear and special occasions"], price: [299, 6499], stock: [10, 150] },
  { id: "mall-cat-watches", parent: "cat-fashion", name: "Watches & Accessories", slug: "watches-accessories", quota: 40, icon: "Watch", nouns: ["Analog Watch", "Leather Wallet", "Canvas Belt", "Polarised Sunglasses", "Silk Scarf", "Woollen Cap", "Steel Bracelet", "Digital Watch"], variants: ["Black", "Brown", "Silver", "Gold Tone", "Navy", "Tan"], features: ["has a scratch-resistant finish and a comfortable strap or band", "is built from sturdy materials that keep their look with regular use", "pairs a clean, minimal design with careful finishing"], uses: ["gifting and special occasions", "office and daily wear", "completing a casual outfit"], price: [199, 4999], stock: [15, 180] },
  { id: "mall-cat-bags", parent: "cat-fashion", name: "Bags & Luggage", slug: "bags-luggage", quota: 45, icon: "Backpack", nouns: ["Laptop Backpack", "Sling Bag", "Tote Bag", "Hardshell Trolley", "Duffel Bag", "School Bag", "Handbag", "Travel Pouch Set"], variants: ["Black", "Navy Blue", "Olive", "Maroon", "Grey", "Tan"], features: ["is made from tear-resistant fabric with smooth zips and padded straps", "has several organised compartments so everything has its place", "uses water-resistant material that protects belongings in light rain"], uses: ["college, office and daily travel", "weekend trips and short holidays", "carrying a laptop and everyday essentials"], price: [349, 5999], stock: [10, 140] },

  // ------------------------------------------------------------ Electronics
  { id: "cat-phones", parent: "cat-electronics", name: "Phones", slug: "phones", existing: true, quota: 60, icon: "Smartphone", nouns: ["5G Smartphone", "Smartphone with AMOLED Display", "Budget Smartphone", "Camera Smartphone", "Gaming Smartphone", "Rugged Smartphone"], variants: ["6 GB RAM, 128 GB", "8 GB RAM, 128 GB", "8 GB RAM, 256 GB", "12 GB RAM, 256 GB", "4 GB RAM, 64 GB", "6 GB RAM, 256 GB"], features: ["has a bright, smooth display and a battery that comfortably lasts a full day", "pairs a responsive processor with a clear camera for photos and video calls", "supports fast charging and includes the essential sensors and connectivity"], uses: electronicsUses, price: [6999, 69999], stock: [5, 120] },
  { id: "cat-laptops", parent: "cat-electronics", name: "Laptops", slug: "laptops", existing: true, quota: 40, icon: "Laptop", nouns: ["Everyday Laptop", "Thin and Light Laptop", "Student Laptop", "Business Laptop", "Creator Laptop", "Convertible Laptop"], variants: ["8 GB RAM, 256 GB SSD", "8 GB RAM, 512 GB SSD", "16 GB RAM, 512 GB SSD", "16 GB RAM, 1 TB SSD", "4 GB RAM, 128 GB SSD"], features: ["has a full HD display, a backlit keyboard and a battery built for a long working day", "runs quickly thanks to a solid-state drive and an efficient processor", "has a sturdy body with a comfortable keyboard and a clear webcam for online classes"], uses: ["online classes, office work and streaming", "coding, design and light editing", "students and professionals on the move"], price: [24999, 129999], stock: [3, 60] },
  { id: "mall-cat-audio", parent: "cat-electronics", name: "Headphones & Speakers", slug: "headphones-speakers", quota: 70, icon: "Headphones", nouns: ["Wireless Earbuds", "Over-Ear Headphones", "Neckband Earphones", "Bluetooth Speaker", "Soundbar", "Wired Earphones", "Gaming Headset", "Party Speaker"], variants: colours.slice(0, 6).concat(["Pearl White", "Midnight Blue"]), features: ["delivers clear vocals and punchy bass with a stable Bluetooth connection", "has a built-in microphone for calls and controls that are easy to find by touch", "offers long battery life and fast charging so it is ready when you are"], uses: ["music, podcasts and calls on the move", "movie nights and gaming sessions", "workouts and long commutes"], price: [399, 14999], stock: [10, 250] },
  { id: "mall-cat-cameras", parent: "cat-electronics", name: "Cameras", slug: "cameras", quota: 30, icon: "Camera", nouns: ["Mirrorless Camera", "Action Camera", "Home Security Camera", "Instant Camera", "Dash Camera", "Tripod Stand", "Camera Bag"], variants: ["Black","Silver","Graphite","Standard","Value Bundle"], features: ["captures sharp, natural-looking images and video in everyday light", "is compact and easy to set up, with a simple companion app", "records reliably with clear footage and straightforward controls"], uses: ["travel, family events and vlogging", "keeping an eye on home or car", "hobby photography"], price: [799, 59999], stock: [5, 80] },
  { id: "mall-cat-wearables", parent: "cat-electronics", name: "Smartwatches & Wearables", slug: "smartwatches-wearables", quota: 50, icon: "Watch", nouns: ["Smartwatch", "Fitness Band", "Kids Smartwatch", "Smart Ring Tracker", "Rugged Sports Watch"], variants: ["Black Strap", "Blue Strap", "Pink Strap", "Green Strap", "Silver Case", "Grey Strap"], features: ["tracks steps, sleep and heart rate and shows call and message alerts", "has a bright touchscreen and a battery that lasts several days", "is water resistant and comes with many sport modes for workouts"], uses: ["staying on top of daily fitness goals", "checking notifications without the phone", "walks, runs and gym sessions"], price: [999, 19999], stock: [10, 200] },
  { id: "mall-cat-mobile-accessories", parent: "cat-electronics", name: "Mobile Accessories", slug: "mobile-accessories", quota: 70, icon: "Cable", nouns: ["Fast Charger", "Braided USB-C Cable", "Power Bank 10000 mAh", "Tempered Glass Guard", "Protective Phone Case", "Wireless Charging Pad", "Car Phone Holder", "Memory Card", "Laptop Stand"], variants: ["Black","White","Blue","Grey","Pack of 2","Standard"], features: ["is tested for safe charging and built to handle daily bending and plugging", "has a slim, sturdy build and fits securely without getting in the way", "works with most current phones and comes with a simple, no-fuss design"], uses: ["keeping devices charged and protected", "travel bags and office desks", "a reliable spare at home or in the car"], price: [149, 3499], stock: [30, 400] },
  { id: "mall-cat-tvs", parent: "cat-electronics", name: "Televisions", slug: "televisions", quota: 30, icon: "Tv", nouns: ["Smart LED TV", "4K Smart TV", "QLED Smart TV", "HD Ready TV", "Full HD Smart TV"], variants: ["32 inch", "40 inch", "43 inch", "50 inch", "55 inch", "65 inch"], features: ["has sharp colours, built-in streaming apps and a slim bezel", "includes a voice remote, multiple HDMI ports and built-in Wi-Fi", "delivers clear sound through box speakers with several picture modes"], uses: ["family movie nights and sport", "streaming shows and video calls", "bedrooms and living rooms"], price: [8999, 89999], stock: [3, 50] },
  { id: "mall-cat-gaming", parent: "cat-electronics", name: "Gaming", slug: "gaming", quota: 40, icon: "Gamepad2", nouns: ["Wireless Game Controller", "Mechanical Keyboard", "Gaming Mouse", "Mouse Pad XL", "Gaming Chair", "Capture Card", "Console Stand"], variants: ["Black", "White", "Red Accent", "Blue Accent", "RGB Edition"], features: ["responds quickly with comfortable controls designed for long sessions", "has a solid build with customisable buttons or lighting", "connects easily to PC and consoles and needs no complicated setup"], uses: ["long gaming sessions", "competitive play with friends", "setting up a tidy desk"], price: [499, 14999], stock: [10, 120] },

  // ------------------------------------------------------------------- Home
  { id: "mall-cat-kitchen", parent: "cat-home", name: "Kitchen & Dining", slug: "kitchen-dining", quota: 80, icon: "CookingPot", nouns: ["Non-Stick Frying Pan", "Pressure Cooker", "Steel Lunch Box", "Chef's Knife Set", "Glass Storage Jars", "Dinner Set", "Tawa", "Mixing Bowl Set", "Insulated Water Bottle", "Cutting Board"], variants: ["Small","Medium","Large","Family Size","Premium Edition"], features: ["is made from food-safe material that heats evenly and is easy to clean", "has a sturdy build and comfortable handles for everyday cooking", "is designed to save space in the cupboard while handling daily use"], uses: ["everyday home cooking", "packing meals for work and school", "gifting to a new home"], price: [149, 4999], stock: [15, 250] },
  { id: "mall-cat-furniture", parent: "cat-home", name: "Furniture", slug: "furniture", quota: 60, icon: "Armchair", nouns: ["Study Table", "Bookshelf", "Shoe Rack", "Office Chair", "Bedside Table", "Folding Dining Table", "Recliner Chair", "TV Unit", "Wardrobe"], variants: ["Walnut Finish", "Oak Finish", "White Finish", "Wenge Finish", "Black Frame", "Natural Teak"], features: ["is built from engineered wood with a scratch-resistant finish and easy assembly", "has a stable frame tested to carry everyday loads", "combines a clean modern look with practical storage"], uses: ["small apartments and bedrooms", "work-from-home corners", "living rooms that need smart storage"], price: [999, 24999], stock: [3, 70] },
  { id: "mall-cat-decor", parent: "cat-home", name: "Home Decor", slug: "home-decor", quota: 70, icon: "Frame", nouns: ["Wall Clock", "Framed Wall Art", "Ceramic Vase", "Cushion Cover Set", "Table Planter", "Scented Candle Set", "Wall Mirror", "Curtain Pair", "Door Mat"], variants: ["Earthy Tones", "Pastel Shades", "Monochrome", "Floral", "Geometric", "Traditional"], features: ["adds colour and warmth to a room with careful, hand-finished detailing", "is made from durable material that keeps its look over time", "has a simple design that blends with most living spaces"], uses: ["refreshing a living room or bedroom", "festive decorating and gifting", "housewarming presents"], price: [149, 3999], stock: [15, 220] },
  { id: "mall-cat-bedding", parent: "cat-home", name: "Bedding", slug: "bedding", quota: 60, icon: "BedDouble", nouns: ["Cotton Bedsheet Set", "Quilted Comforter", "Memory Foam Pillow", "Mattress Protector", "Dohar Blanket", "Fitted Sheet", "Orthopaedic Mattress"], variants: ["Single", "Double", "Queen", "King", "Pack of 2", "Pack of 4"], features: ["is woven from soft, breathable cotton that feels cool and gentle on the skin", "keeps its colour and softness after many washes", "has a smooth finish and neat stitching for restful sleep"], uses: ["restful nights in every season", "guest rooms and hostels", "refreshing the bedroom"], price: [299, 14999], stock: [10, 200] },
  { id: "mall-cat-bath", parent: "cat-home", name: "Bath & Laundry", slug: "bath-laundry", quota: 40, icon: "Bath", nouns: ["Bath Towel Set", "Soap Dispenser", "Laundry Basket", "Shower Curtain", "Bathroom Mat", "Hand Towel Pair", "Clothes Drying Stand"], variants: ["White", "Grey", "Blue", "Beige", "Pack of 2", "Pack of 3"], features: ["is quick-drying and absorbent, and stays soft after washing", "is made from rust-proof and easy-to-wipe material", "keeps the bathroom tidy with a practical, simple design"], uses: ["everyday bathroom use", "guest bathrooms and hostels", "busy family laundry days"], price: [129, 3499], stock: [15, 250] },
  { id: "mall-cat-lighting", parent: "cat-home", name: "Lighting", slug: "lighting", quota: 40, icon: "Lamp", nouns: ["LED Bulb Pack", "Table Lamp", "Smart Light Strip", "Ceiling Light", "Rechargeable Emergency Lamp", "String Lights", "Study Lamp"], variants: ["Warm White", "Cool White", "Daylight", "Multicolour", "Pack of 4"], features: ["uses efficient LED lighting that stays cool and saves electricity", "gives even, glare-free light that is gentle on the eyes", "is simple to install and built for years of regular use"], uses: ["study desks and bedside tables", "festive decorating", "lighting up living rooms and balconies"], price: [99, 4999], stock: [20, 300] },
  { id: "mall-cat-appliances", parent: "cat-home", name: "Home Appliances", slug: "home-appliances", quota: 60, icon: "Microwave", nouns: ["Mixer Grinder", "Air Fryer", "Electric Kettle", "Induction Cooktop", "Room Heater", "Table Fan", "Vacuum Cleaner", "Steam Iron", "Water Purifier"], variants: ["White", "Black", "Silver", "Standard", "Large Capacity"], features: ["has a powerful motor and simple controls with built-in safety protection", "is energy efficient and easy to clean after use", "comes with a sturdy body and a clear instruction guide"], uses: ["busy family kitchens", "saving time on daily chores", "small homes and hostels"], price: [699, 19999], stock: [5, 100] },
  { id: "mall-cat-storage", parent: "cat-home", name: "Storage & Organisers", slug: "storage-organisers", quota: 40, icon: "Archive", nouns: ["Storage Boxes", "Drawer Organiser", "Hanging Organiser", "Shelf Rack", "Vacuum Storage Bags", "Wardrobe Cubes", "Spice Rack"], variants: ["Small", "Medium", "Large", "Set of 3", "Set of 6"], features: ["is made from sturdy, easy-to-wipe material that stacks neatly", "frees up space and keeps small items in sight", "folds flat when not in use"], uses: ["tidy wardrobes and kitchens", "moving house and seasonal storage", "kids' rooms and study corners"], price: [149, 2499], stock: [20, 300] },

  // ----------------------------------------------------------------- Beauty
  { id: "mall-cat-skincare", parent: "cat-beauty", name: "Skincare", slug: "skincare", quota: 60, icon: "Droplets", nouns: ["Vitamin C Face Serum", "Gentle Face Wash", "Sunscreen SPF 50", "Moisturising Cream", "Aloe Vera Gel", "Clay Face Mask", "Night Repair Cream", "Lip Balm"], variants: ["50 ml", "100 ml", "200 ml", "Sensitive Skin", "Oily Skin", "Dry Skin"], features: ["has a light, non-sticky texture that absorbs quickly", "is formulated without harsh sulphates and with plant-based ingredients", "is dermatologically tested and gentle enough for daily use"], uses: ["a simple morning and night routine", "dry weather or humid summers", "all-day freshness"], price: [99, 1999], stock: [20, 300] },
  { id: "mall-cat-haircare", parent: "cat-beauty", name: "Haircare", slug: "haircare", quota: 50, icon: "Sparkles", nouns: ["Onion Hair Oil", "Anti-Dandruff Shampoo", "Argan Conditioner", "Hair Mask", "Hair Serum"], variants: ["100 ml", "250 ml", "400 ml", "Family Pack", "Travel Size"], features: ["nourishes from root to tip and leaves hair soft and manageable", "is made with natural oils and a mild, pleasant fragrance", "is easy to apply and rinses out cleanly"], uses: ["dry, frizzy or damaged hair", "regular weekly care", "keeping hair healthy through every season"], price: [99, 2999], stock: [20, 300] },
  { id: "mall-cat-makeup", parent: "cat-beauty", name: "Makeup", slug: "makeup", quota: 60, icon: "Palette", nouns: ["Matte Lipstick", "Kajal Pencil", "Compact Powder", "Eyeshadow Palette", "Liquid Foundation", "Mascara", "Nail Polish Set", "Makeup Brush Set"], variants: ["Rose Pink", "Berry Red", "Nude Beige", "Coral", "Plum", "Natural Brown", "Shade 01", "Shade 02"], features: ["glides on smoothly and stays put through a long day", "has rich colour with a comfortable, lightweight feel", "is cruelty-free and easy to blend for a natural finish"], uses: ["office looks and festive evenings", "quick touch-ups on the go", "weddings and celebrations"], price: [99, 2499], stock: [20, 300] },
  { id: "mall-cat-fragrance", parent: "cat-beauty", name: "Fragrance", slug: "fragrance", quota: 30, icon: "SprayCan", nouns: ["Eau de Parfum", "Body Mist", "Deodorant Spray", "Perfume Gift Set", "Roll-On Attar"], variants: ["Woody", "Floral", "Citrus Fresh", "Musk", "Ocean Breeze"], features: ["opens with a bright note and settles into a warm, lasting base", "is long lasting and light enough for daily wear", "comes in a travel-friendly bottle with a fine mist"], uses: ["everyday freshness", "gifting on birthdays and festivals", "evenings out"], price: [149, 3999], stock: [15, 200] },
  { id: "mall-cat-grooming", parent: "cat-beauty", name: "Grooming", slug: "grooming", quota: 40, icon: "Scissors", nouns: ["Beard Trimmer", "Shaving Kit", "Beard Oil", "Body Wash", "Electric Shaver", "Face Razor Set", "Grooming Kit"], variants: ["Standard","Gift Pack","Travel Pack","Value Pack"], features: ["gives a close, comfortable result with a skin-friendly design", "is easy to hold and to clean, with a long-lasting battery or blade", "is built for quick, no-fuss routines"], uses: ["a neat daily routine", "travel and gym bags", "gifting"], price: [99, 3999], stock: [15, 250] },

  // ---------------------------------------------------------------- Grocery
  { id: "mall-cat-staples", parent: "cat-grocery", name: "Staples & Grains", slug: "staples-grains", quota: 50, icon: "Wheat", nouns: ["Basmati Rice", "Whole Wheat Atta", "Toor Dal", "Chana Dal", "Rolled Oats", "Cold Pressed Mustard Oil", "Poha", "Sugar", "Moong Dal", "Quinoa"], variants: ["500 g", "1 kg", "2 kg", "5 kg"], features: ["is carefully cleaned and sorted, and sealed in a food-safe pack", "is sourced from trusted farms and stored away from moisture", "cooks evenly and tastes just as it should"], uses: ["everyday home cooking", "stocking the monthly pantry", "healthy family meals"], price: [49, 999], stock: [30, 500] },
  { id: "mall-cat-snacks", parent: "cat-grocery", name: "Snacks & Sweets", slug: "snacks-sweets", quota: 60, icon: "Cookie", nouns: ["Masala Peanuts", "Namkeen Mix", "Dark Chocolate Bar", "Baked Chips", "Oat Cookies", "Roasted Makhana", "Gulab Jamun Mix", "Soan Papdi", "Protein Bar"], variants: ["Pack of 1", "Pack of 3", "Pack of 6", "Family Pack", "Party Pack"], features: ["is made with simple ingredients and sealed fresh for a crisp, tasty bite", "has a balanced flavour with no artificial colours", "is packed in a resealable pouch to stay fresh"], uses: ["tea time and movie nights", "lunch boxes and travel", "sharing at festivals and parties"], price: [30, 799], stock: [30, 500] },
  { id: "mall-cat-beverages", parent: "cat-grocery", name: "Tea, Coffee & Drinks", slug: "tea-coffee-drinks", quota: 50, icon: "Coffee", nouns: ["Assam Tea", "Masala Chai Mix", "Filter Coffee Powder", "Green Tea Bags", "Instant Coffee", "Herbal Infusion", "Cold Coffee Mix"], variants: ["100 g","250 g","500 g","Pack of 2"], features: ["has a rich aroma and a smooth, balanced taste", "is sourced from selected estates and packed to keep its freshness", "brews quickly and tastes great hot or cold"], uses: ["morning and evening cups", "guests and office pantry", "refreshing summer drinks"], price: [49, 999], stock: [30, 400] },
  { id: "mall-cat-spices", parent: "cat-grocery", name: "Spices & Masalas", slug: "spices-masalas", quota: 40, icon: "Flame", nouns: ["Turmeric Powder", "Garam Masala", "Red Chilli Powder", "Cumin Seeds", "Coriander Powder", "Chaat Masala", "Biryani Masala", "Black Pepper", "Cardamom"], variants: ["50 g", "100 g", "200 g", "500 g"], features: ["is freshly ground and sealed to hold its aroma and colour", "has a strong, true flavour with no added colour", "is packed in an airtight pouch that is easy to reseal"], uses: ["curries, rice and snacks", "everyday Indian cooking", "gifting a pantry set"], price: [29, 599], stock: [30, 500] },
  { id: "mall-cat-dry-fruits", parent: "cat-grocery", name: "Dry Fruits & Nuts", slug: "dry-fruits-nuts", quota: 30, icon: "Nut", nouns: ["Californian Almonds", "Cashew Nuts", "Walnut Kernels", "Raisins", "Dates", "Pistachios", "Mixed Dry Fruits", "Dried Figs"], variants: ["250 g", "500 g", "1 kg", "Gift Box"], features: ["is hand-picked, crunchy and fresh, and packed in a sealed pouch", "is rich in natural flavour with no added sugar", "stays fresh in the resealable pack"], uses: ["healthy snacking", "festive gifting", "sweets and desserts"], price: [149, 1999], stock: [20, 300] },
  { id: "mall-cat-breakfast", parent: "cat-grocery", name: "Breakfast & Spreads", slug: "breakfast-spreads", quota: 30, icon: "Egg", nouns: ["Muesli", "Peanut Butter", "Honey", "Corn Flakes", "Mixed Fruit Jam", "Idli Dosa Batter Mix", "Chocolate Spread", "Granola"], variants: ["250 g", "400 g", "500 g", "1 kg", "Pack of 2"], features: ["is made with simple ingredients and tastes great from the first spoon", "has a smooth, natural taste without artificial flavours", "is quick to prepare for busy mornings"], uses: ["quick breakfasts", "school tiffin", "weekend brunch"], price: [79, 899], stock: [25, 400] },

  // ----------------------------------------------------------------- Sports
  { id: "mall-cat-fitness", parent: "cat-sports", name: "Fitness Equipment", slug: "fitness-equipment", quota: 50, icon: "Dumbbell", nouns: ["Adjustable Dumbbell Set", "Resistance Band Set", "Skipping Rope", "Ab Roller", "Push-Up Stand", "Hand Grip", "Gym Gloves", "Weight Bench", "Kettlebell"], variants: ["Black","Blue","Red","Standard","Pro Grade"], features: ["is built from solid, rubber-coated material that is tough but comfortable to hold", "is designed for home workouts and takes little space", "keeps a firm grip and stays stable through intense sets"], uses: ["home workouts", "strength and cardio routines", "beginners starting a fitness journey"], price: [199, 8999], stock: [10, 200] },
  { id: "mall-cat-yoga", parent: "cat-sports", name: "Yoga & Wellness", slug: "yoga-wellness", quota: 30, icon: "Flower2", nouns: ["Yoga Mat", "Yoga Block Pair", "Foam Roller", "Meditation Cushion", "Yoga Strap", "Massage Ball Set"], variants: ["Purple", "Teal", "Grey", "Pink", "6 mm", "10 mm"], features: ["has a non-slip surface and cushioning that is kind to joints", "is lightweight, easy to clean and simple to carry", "is made from eco-friendly material with no strong odour"], uses: ["yoga and stretching", "meditation at home", "cool-downs after workouts"], price: [199, 2999], stock: [15, 200] },
  { id: "mall-cat-team-sports", parent: "cat-sports", name: "Cricket & Team Sports", slug: "cricket-team-sports", quota: 40, icon: "Trophy", nouns: ["Kashmir Willow Cricket Bat", "Leather Cricket Ball", "Football", "Badminton Racket Pair", "Shuttlecock Tube", "Volleyball", "Basketball", "Batting Gloves", "Table Tennis Bat"], variants: ["Standard","Junior","Senior","Pro Grade","Pack of 2"], features: ["is made from durable material that holds its shape through hard play", "gives a comfortable grip and reliable control", "is tested for regular practice sessions"], uses: ["weekend matches with friends", "school and club practice", "gifting a young player"], price: [149, 5999], stock: [10, 200] },
  { id: "mall-cat-outdoor", parent: "cat-sports", name: "Outdoor & Cycling", slug: "outdoor-cycling", quota: 40, icon: "Bike", nouns: ["Mountain Bike", "Cycling Helmet", "Camping Tent", "Trekking Backpack", "Sleeping Bag", "LED Headlamp", "Hydration Bottle", "Trekking Pole Pair"], variants: ["Green","Black","Orange","Blue","Grey"], features: ["is weather-tough and built for rough trails and early starts", "is lightweight yet strong, with simple set-up", "has sturdy zips, reflective details and comfortable straps"], uses: ["weekend treks and camping trips", "cycling to work or on trails", "adventure holidays"], price: [249, 19999], stock: [5, 120] },

  // ------------------------------------------------------------- Toys / baby
  { id: "mall-cat-toys", parent: "cat-toys", name: "Toys & Games", slug: "toys-games", quota: 70, icon: "Puzzle", nouns: ["Building Blocks Set", "Remote Control Car", "Jigsaw Puzzle", "Board Game", "Soft Toy", "Art and Craft Kit", "Doctor Play Set", "Science Experiment Kit", "Wooden Train Set", "Chess Set"], variants: ["Ages 3 and up", "Ages 5 and up", "Ages 8 and up", "Ages 12 and up", "Deluxe Edition"], features: ["is made from child-safe, non-toxic material with smooth edges", "encourages creativity, problem solving and play together", "is sturdy enough for energetic play and simple to pack away"], uses: ["rainy afternoons and holidays", "birthday gifts", "learning through play"], price: [149, 3999], stock: [10, 200] },
  { id: "mall-cat-baby", parent: "cat-toys", name: "Baby Care", slug: "baby-care", quota: 40, icon: "Baby", nouns: ["Baby Diapers", "Baby Wipes", "Feeding Bottle", "Baby Lotion", "Baby Carrier", "Muslin Swaddle Set", "Teether Set", "Baby Shampoo"], variants: ["Newborn", "Small", "Medium", "Large", "Pack of 2", "Pack of 4"], features: ["is soft and gentle on delicate skin, and tested for sensitivity", "is made from BPA-free, baby-safe material", "is designed with parents in mind for easy everyday use"], uses: ["the first years of baby care", "baby shower gifts", "travel and day-care bags"], price: [99, 2999], stock: [15, 250] },

  // ----------------------------------------------------------------- Books
  { id: "mall-cat-print-books", parent: "cat-books", name: "Printed Books", slug: "printed-books", quota: 70, icon: "BookOpen", nouns: ["Novel", "Self-Help Guide", "Cookbook", "Children's Story Collection", "Biography", "Mathematics Workbook", "Science Reference Guide", "General Knowledge Almanac", "Poetry Collection", "History Book"], variants: ["Paperback", "Hardcover", "Collector's Edition", "Pocket Edition"], features: ["is printed on good-quality paper with clear, readable type", "is written in simple language that is easy to follow", "has a well-bound spine that holds up to repeated reading"], uses: ["weekend reading", "gifting to a book lover", "exam preparation and school projects"], price: [99, 1299], stock: [15, 250] },
  { id: "mall-cat-stationery", parent: "cat-books", name: "Stationery", slug: "stationery", quota: 50, icon: "PenLine", nouns: ["Ruled Notebook Pack", "Gel Pen Set", "Spiral Planner", "Highlighter Set", "Sketchbook", "Geometry Box", "Desk Organiser", "Sticky Notes Pack", "Colour Pencil Set"], variants: ["Pack of 5", "Pack of 10", "A4", "A5", "Assorted Colours"], features: ["writes smoothly, with paper and ink that do not bleed through", "is made from good-quality material and priced for everyday use", "is neatly finished and easy to carry in a school or office bag"], uses: ["school, college and office", "journaling and note-taking", "art and craft projects"], price: [29, 899], stock: [30, 500] },

  // ----------------------------------------------------------------- Health
  { id: "mall-cat-wellness", parent: "cat-health", name: "Health Care", slug: "health-care", quota: 50, icon: "HeartPulse", nouns: ["Digital Thermometer", "Blood Pressure Monitor", "Pulse Oximeter", "Multivitamin Tablets", "Protein Powder", "First Aid Kit", "Hot Water Bag", "Knee Support Brace", "Face Masks Pack", "Hand Sanitiser"], variants: ["Standard","Pack of 2","Pack of 3","Family Pack","Value Pack"], features: ["is easy to use with a clear display and simple instructions", "is made to good quality standards and sealed for safety", "is designed for regular home use"], uses: ["daily wellness at home", "caring for family elders", "staying prepared for small emergencies"], price: [99, 3499], stock: [15, 300] },

  // ----------------------------------------------------- Auto, pets, garden
  { id: "mall-cat-auto", parent: "cat-auto-pets-garden", name: "Car & Bike Care", slug: "car-bike-care", quota: 40, icon: "Car", nouns: ["Microfibre Cleaning Cloth Pack", "Car Seat Cover", "Tyre Inflator", "Bike Helmet", "Car Vacuum Cleaner", "Car Polish", "Phone Mount", "Jump Starter", "Bike Cover"], variants: ["Black", "Grey", "Universal Fit", "Pack of 3", "Large"], features: ["is made from tough material that stands up to sun, dust and rain", "is easy to fit and works with most cars and bikes", "is designed for regular use on city roads and long drives"], uses: ["keeping the vehicle clean and safe", "long drives and city commutes", "weekend washing"], price: [99, 5999], stock: [10, 200] },
  { id: "mall-cat-pets", parent: "cat-auto-pets-garden", name: "Pet Supplies", slug: "pet-supplies", quota: 40, icon: "PawPrint", nouns: ["Dry Dog Food", "Cat Litter", "Dog Leash and Harness", "Pet Bed", "Chew Toy Set", "Cat Scratcher", "Pet Shampoo", "Water Fountain"], variants: ["Small Pets","Medium Pets","Large Pets","Pack of 2","Standard"], features: ["is made with pet-safe material and tested for comfort and durability", "is easy to clean and designed for everyday use", "keeps pets happy, clean and active"], uses: ["daily feeding and care", "walks and play", "keeping the home tidy"], price: [149, 4999], stock: [10, 250] },
  { id: "mall-cat-garden", parent: "cat-auto-pets-garden", name: "Garden & Plants", slug: "garden-plants", quota: 25, icon: "Sprout", nouns: ["Ceramic Planter", "Garden Tool Set", "Organic Potting Mix", "Vegetable Seed Pack", "Watering Can", "Hanging Planter", "Grow Bag Pack"], variants: ["Small", "Medium", "Large", "Pack of 3", "Pack of 5"], features: ["is made from weather-tough material that suits balconies and terraces", "is simple to use even for first-time gardeners", "supports healthy growth with good drainage"], uses: ["balcony and terrace gardens", "growing herbs and vegetables", "gifting a plant lover"], price: [49, 1999], stock: [15, 250] },
];

export const SERIES = ["Classic", "Essential", "Prime", "Everyday", "Studio", "Elite", "Neo", "Aero", "Nova", "Urban", "Eco", "Signature", "Select", "Ultra", "Core", "Lite", "Max", "Vista", "Pure", "Smart"];

export const MALL_TOTAL = MALL_SUBCATEGORIES.reduce((s, c) => s + c.quota, 0);
