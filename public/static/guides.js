let guides = [];
let filterCountry = "";

/* ---------- Knowledge base: attractions + cheapest eats per city ---------- */

const KB = {
  "Japan": {
    currency: "JPY",
    cities: {
      "Tokyo": {
        attractions: ["Senso-ji Temple & Nakamise street", "Shibuya Crossing & Hachiko statue", "Meiji Shrine", "Tsukiji Outer Market", "teamLab Planets (book online)", "Akihabara electronics town", "Odaiba seaside day view"],
        cheapEats: ["Ichiran ramen (portable booth eating)", "7-Eleven/FamilyMart onigiri & karaage bento", "Sukiya / Yoshinoya gyudon bowl", "Nakamise dori street snacks (senbei, taiyaki)", "Conveyor-belt sushi at kaiten-zushi (plates from P50)"],
        tips: ["Get an IC card (Suica/Pasmo) for trains - tap in/out simply", "Taxis are mahal - trains are the cheapest way around", "Vending machine drinks are cheap (100-160 yen)"]
      },
      "Osaka": {
        attractions: ["Dotonbori neon street & Glico sign", "Osaka Castle grounds", "Shinsaibashi shopping arcade", "Kuromon Ichiba Market", "USJ (Universal Studios, book ahead)", "Sumiyoshi Taisha shrine"],
        cheapEats: ["Takoyaki stalls in Dotonbori", "Okonomiyaki at places like Chibo", "Kuromon market skewers & fresh seafood", "Kushikatsu fried skewers area", "Supermarket bento for dinner"] ,
        tips: ["Osaka locals say 'kuidaore' - eat till you drop, food is the cheapest attraction", "Day pass for Osaka Metro saves if riding 3+ times"]
      },
      "Kyoto": {
        attractions: ["Fushimi Inari Shrine (torii gates)", "Arashiyama Bamboo Grove", "Kinkaku-ji (Golden Pavilion)", "Higashiyama walking district", "Kiyomizu-dera temple", "Gion geisha district"],
        cheapEats: ["Yudofu (tofu hotpot) at simple ryokan restaurants", "Nishiki Market street food stalls", "Ramen at tiny standing shops", "Matcha sweets & soft serve", "Obanzai home-style set meals"],
        tips: ["Rent a bicycle - flat city, temples are spread out", "Fushimi Inari is free and empty early morning (6am)"]
      }
    }
  },
  "South Korea": {
    currency: "KRW",
    cities: {
      "Seoul": {
        attractions: ["Gyeongbokgung Palace & guard change", "Myeongdong shopping street", "N Seoul Tower (night view)", "Bukchon Hanok Village", "Hongdae street performers area", "Gwangjang Market"],
        cheapEats: ["Gwangjang Market bindaetteok & mayak kimbap", "Tteokbokki street carts (P80-150)", "Toilet-restaurant gimbap chains (PB&J style)", "Korean fried chicken + beer sets", "Convenience store ramyun with cheese"],
        tips: ["Use T-money card for metro", "Free palace admission if you rent hanbok outfit"]
      },
      "Busan": {
        attractions: ["Gamcheon Culture Village", "Haeundae Beach", "Jagalchi Fish Market", "Taejongdae cliffs", "BIFF Square (Busan Tower nearby)"],
        cheapEats: ["Jagalchi raw fish + hoejoomak", "Dwaeji gukbap (pork soup rice) spot", "BIFF Square ssiat hotteok", "Eomuk (fish cake) skewers", "Millak town seafood bbq"],
        tips: ["Sunset at Haeundae is free and the best show", "Coastal train between stations is cheap and scenic"]
      }
    }
  },
  "Thailand": {
    currency: "THB",
    cities: {
      "Bangkok": {
        attractions: ["Grand Palace & Wat Phra Kaew", "Wat Arun at sunset", "Chatuchak Weekend Market", "Chao Phraya river boat ride", "Khao San Road", "Bangkok Art & Culture Centre (free)"],
        cheapEats: ["Street pad thai (P80-120 per plate)", "Som tam + sticky rice carts", "Mango sticky rice stalls", " boat noodles (kuay teow rua) - P50!", "7-Eleven toasties & drinks"],
        tips: ["Street food is safe & cheapest - eat where locals queue", "BTS Skytrain over taxis - no traffic jam", "Always carry small bills for street stalls"]
      },
      "Phuket": {
        attractions: ["Old Town Sino-Portuguese streets", "Patong Beach sunset", "Big Buddha viewpoint", "Phi Phi island day tour", "Chalong temple"],
        cheapEats: ["Local pad kra pao (holy basil) plates", "Sea gypsy village fresh seafood", "Rotee (Thai pancake) stalls", "Som tam + grilled chicken joints", "Fresh fruit smoothies (P60-90)"],
        tips: ["Rent a scooter only if confident - driving is wild", "Day tours to Phi Phi - book 1-2 days ahead"]
      },
      "Chiang Mai": {
        attractions: ["Old City temples", "Doi Suthep mountain temple", "Night Bazaar", "Sunday Walking Street market", "Elephant sanctuary (ethical ones only)"],
        cheapEats: ["Khao soi (creamy curry noodles) - P60", "Sai ua (spicy sausage) stalls", "Night bazaar fruit skewers", "Northern Thai set meal places", "Fresh soy milk + donuts breakfast"],
        tips: ["Sunday Walking Street is the best market", "Songthaew (shared red truck) = cheap rides"]
      }
    }
  },
  "Hong Kong": {
    currency: "HKD",
    cities: {
      "Hong Kong": {
        attractions: ["Victoria Peak (Tram + night view)", "Star Ferry across the harbour", "Temple Street Night Market", "Nan Lian Garden (free)", "Tai O fishing village", "Dragon's Back hike (free)"],
        cheapEats: ["Cha chaan teng (HK-style diner) set meals", "Dim sum at Kam's-style tea houses (a la carte)", "Street egg waffles (egg gai zai)", "Milk tea + pineapple bun bakery", "Wonton noodle shops - P150-250"],
        tips: ["Octopus card for MTR - tap on everything", "Star Ferry is cheaper than any cruise view", "7-Eleven pineapple bun + milk tea = classic budget breakfast"]
      }
    }
  },
  "Singapore": {
    currency: "SGD",
    cities: {
      "Singapore": {
        attractions: ["Gardens by the Bay (Supertrees at night)", "Marina Bay Sands light show (free)", "Sentosa Island beaches", "Chinatown & Little India streets", "Haw Par Villa (free & quirky)", "East Coast Park cycling"],
        cheapEats: ["Hawker centres - chicken rice from P200", "Satay street at Lau Pa Sat", "Chilli crab (splurge) but coconut curry fish head is cheaper", "Kaya toast + kopi breakfast sets", "Laksa & carrot cake hawker stalls"],
        tips: ["Food courts (hawker centres) are the cheapest way to eat", "MRT + bus day pass for transport", "No chewing gum jokes aside - fines are real, don't litter"]
      }
    }
  },
  "Taiwan": {
    currency: "TWD",
    cities: {
      "Taipei": {
        attractions: ["Taipei 101 observatory", "Shilin Night Market", "Jiufen old street (day trip)", "Chiang Kai-shek Memorial (free)", "Longshan Temple", "Beitou hot springs"],
        cheapEats: ["Night market stinky tofu + oyster omelet (P100-150)", "Beef noodle soup shops", "Shilin fried giant chicken cutlet", "Boba milk tea - original is Taipei - P80-120", "Xiao long bao at condensed Din Tai Fung"],
        tips: ["EasyCard for metro + convenience stores", "Night markets rotate - Shilin daily, others weekly", "Free hot spring foot baths in Beitou"]
      }
    }
  },
  "Vietnam": {
    currency: "VND",
    cities: {
      "Hanoi": {
        attractions: ["Old Quarter walking streets", "Hoan Kiem Lake & bridge", "Train Street (behind tracks cafe)", "Ho Chi Minh Mausoleum area", "Temple of Literature (free-ish)", "Ho Tay lake sunset"],
        cheapEats: ["Pho bo at street-level (P60-100!)", "Banh mi stalls - P40-60", "Bun cha Obama-style sets", "Egg coffee cafes (P60)", "Che (sweet dessert) stalls"],
        tips: ["Cross streets like a local - steady pace", "Street pho is breakfast perfection around 7am", "Xe om (motorbike taxi) - haggle first"]
      },
      "Da Nang": {
        attractions: ["My Khe Beach", "Marble Mountains", "Son Tra peninsula (Monkey Mountain)", "Hoi An lantern town (30min away)", "Ba Na Hills - Golden Bridge"],
        cheapEats: ["Mi Quang noodles at local stalls", "Seafood beachfront bbq", "Banh xeo (crispy pancake)", "Hoi An cao lau + banh mi", "Fresh coconut drinks on the beach"],
        tips: ["Rent a motorbike for Hoi An day trip", "Ba Na Hills tickets are pricey - skip if on budget, the views around Son Tra are free"]
      },
      "Ho Chi Minh City": {
        attractions: ["Ben Thanh Market", "Notre Dame & Post Office (free)", "War Remnants Museum", "Bui Vien walking street", "Cao Dai temple day trip", "Cu Chi tunnels"],
        cheapEats: ["Com tam (broken rice) plates - P80", "Pho 24-style street pho", "Banh mi carts everywhere", "Fruit smoothies & coffee", "Night market skewers"],
        tips: ["Grab app for safe cheap rides", "Museum is heavy but essential - go early"]
      }
    }
  },
  "Indonesia": {
    currency: "IDR",
    cities: {
      "Bali": {
        attractions: ["Uluwatu temple cliff sunset", "Tegallalang rice terraces", "Ubud monkey forest", "Kuta beach surf lessons", "Tanah Lot temple", "Nusa Penida day trip"],
        cheapEats: ["Warungs - nasi campur from P60-90", "Babi guling (suckling pig) sets", "Street satay", "Fresh fruit bowls & smoothies", "Local noodle & mie goreng stalls"],
        tips: ["Rent a scooter (P300-400/day) - traffic is negotiable", "Warung = local family eatery = cheapest & best", "Cash is king outside tourist hubs"]
      },
      "Jakarta": {
        attractions: ["Monas monument", "Kota Tua old town", "Ancol beach & dunia fantasi", "Istiqlal Mosque", "Grand Indonesia mall"],
        cheapEats: ["Soto Betawi or soto ayam bowls", "Nasi uduk street stalls", "Kerak telor at Kota Tua weekends", "Bakso (meatball soup) carts", "Cold cendol desserts"],
        tips: ["MRT + Transjakarta buses avoid the famous traffic", "Kota Tua is free to wander on weekends"]
      }
    }
  },
  "Malaysia": {
    currency: "MYR",
    cities: {
      "Kuala Lumpur": {
        attractions: ["Petronas Towers & KLCC park", "Batu Caves (free)", "Merdeka Square", "Central Market", "Bukit Bintang street food zone"],
        cheapEats: ["Nasi lemak from RM2-4 (P25-50!)", "KL hawker food courts - char kway teow", "Jalan Alor night street", "Roti canai + teh tarik breakfast", "Durian stalls (seasonal)"],
        tips: ["LRT/MRT + Gojek beats taxis", "Suria KLCC mall AC is free aircon - rest there"]
      },
      "Penang": {
        attractions: ["George Town street art walk", "Penang Hill funicular", "Kek Lok Si temple", "Batu Ferringhi beach", "Cheong Fatt Tze mansion"],
        cheapEats: ["Char kway teow at Chulia Street", "Assam laksa - world famous & cheap", "Cendol desserts", "Nasi kandar night stalls", "Wantan mee breakfast"],
        tips: ["Georgetown is walkable - wear good shoes", "Try the ferry to the mainland - scenic & cheap"]
      }
    }
  },
  "Cambodia": {
    currency: "USD",
    cities: {
      "Siem Reap": {
        attractions: ["Angkor Wat sunrise", "Angkor Thom & Bayon faces", "Ta Prohm (Tomb Raider temple)", "Old market & night market", "Tonle Sap floating village"],
        cheapEats: ["Amok curry at local shops", "Street lok lak (beef) sets", "Night market bbq skewers", "Fried noodles & fried rice stalls", "Coconut ice cream from shells"],
        tips: ["Angkor pass for temples - 1 day is enough for the big 3", "Hire a tuk-tuk for the whole day - cheapest touring option", "Sunrise at Angkor Wat = arrive by 5am"]
      }
    }
  },
  "China": {
    currency: "CNY",
    cities: {
      "Shanghai": {
        attractions: ["The Bund skyline walk", "Yu Garden & old city", "Shanghai Tower observation deck", "French Concession streets", "Tianzifang arts alleys"],
        cheapEats: ["Xiaolongbao at Din Tai Fung-style shops", "Shengjianbao (pan-fried buns) street", "Noodle shops - P100-200", "Street skewers at night markets", "Bakery goods & milk tea"],
        tips: ["Metro is super cheap & fast", "The Bund is free & stunning at night"]
      },
      "Beijing": {
        attractions: ["Great Wall - Mutianyu section (day trip)", "Forbidden City", "Temple of Heaven park", "Hutongs (old lanes) walking", "Summer Palace"],
        cheapEats: ["Peking duck - cheaper at locals' spots", "Jianbing (savory crepe) breakfast", "Hot pot at budget chains", "Noodle shops in hutongs", "Street candied hawthorn"],
        tips: ["Book Forbidden City tickets in advance - strict entry", "Great Wall: go on a weekday, take the cable car option if knees hurt"]
      }
    }
  },
  "Philippines": {
    currency: "PHP",
    cities: {
      "Manila": {
        attractions: ["Intramuros walled city walking tour", "Rizal Park & National Museum (free)", "Binondo - oldest Chinatown", "Fort Santiago", "Manila Bay sunset at Baywalk"],
        cheapEats: ["Binondo: siopao, lumpia, wanton mami - P150-250", "Carsadang Bago noodle shops", "Kanto-style tapsilog breakfast P150", "Quiapo church street snacks", "Escolta cafes"],
        tips: ["Binondo food trip is best in the morning", "LRT/MRT beats traffic for tourists", "Try kwek-kwek & fishballs near any school"]
      },
      "Cebu": {
        attractions: ["Kawasan Falls", "Moalboal sardine run", "Magellan's Cross & Basilica", "Osmeña Peak", "Bohol day trip - Chocolate Hills, tarsiers"],
        cheapEats: ["Lechon - Zubuchon style (cebu lechon is the famous one!)", "Pungko-pungko fried street eats (P30-60)", "Sutukil seafood by the sea", "Barbeque place - pork bbq + puso", "Dried mango pasalubong"],
        tips: ["Pungko-pungko = sit & eat fried street food, super local experience", "Kawasan canyoneering needs water shoes"]
      },
      "Siargao": {
        attractions: ["Cloud 9 boardwalk & waves", "Naked, Daku & Guyam island hopping", "Magpupungko tide pools", "Sugba Lagoon", "Barefoot Bar sunset"],
        cheapEats: ["Inasal & fresh seafood on Cloud 9 strip", "Local turo-turo near Dapa", "Ceviche & kinilaw joints", "Fruit shakes", "Street grilled corn & banana cue"],
        tips: ["Rent a scooter - island is small and sandy", "Check tides for Magpupungko pools"]
      },
      "Boracay": {
        attractions: ["White Beach 4.5km stroll", "Bulabog Beach kitesurf season", "Puka Shell Beach", "Hagdan viewpoint", "Sunset paraw sailing"],
        cheapEats: ["D'Talipapa seafood - buy from wet market, have it cooked", "Andok's & local bbq spots", "Krua Thai street-level night food", "Mango shakes everywhere", "Halohalo stalls"],
        tips: ["Station 2 food is pricier - Station 3 is budget zone", "Environmental fee is collected at port - keep receipt"]
      },
      "El Nido": {
        attractions: ["Tour A lagoons & Secret Lagoon", "Nacpan Beach", "Las Cabanas sunset + zipline", "Taraw cliff (for fit hikers)", "Dumaluan beach emptiness"],
        cheapEats: ["Squid sizzlers at local eateries", "Street chicharon bulaklak & beer places", "Island-hopping packed lunch markets", "Fresh fruit & smoothie stops", "Night market bbq rows"],
        tips: ["Book island tours a day ahead", "Nacpan = 30min trike, rent the whole day"]
      }
    }
  },
  "France": {
    currency: "EUR",
    cities: {
      "Paris": {
        attractions: ["Eiffel Tower (view from Trocadero is free)", "Louvre (free first Sunday!)", "Montmartre & Sacre-Coeur", "Seine river walk", "Marais district", "Pantheon area streets"],
        cheapEats: ["Baguette + cheese + wine picnics", "Boulangerie croissants P150", "Falafel street in Marais", "Crepes stands - P200", "Supermarket ready meals (Monoprix)"],
        tips: ["Museums are free first Sunday of month - plan around it", "Bike (Velib) or walk - metro tickets add up", "Picnic by the Seine at sunset is free magic"]
      }
    }
  },
  "Italy": {
    currency: "EUR",
    cities: {
      "Rome": {
        attractions: ["Colosseum & Roman Forum", "Trevi Fountain (night is magical)", "Pantheon (free)", "Trastevere evening streets", "Vatican & St Peter's", "Villa Borghese park"],
        cheapEats: ["Pizza al taglio (by the slice) - P200", "Gelato shops - P150-250", "Pasta at family trattorias lunch specials", "Panino spots near Vatican", "Frascati food trucks"],
        tips: ["Colosseum: book tickets online to skip lines", "Drink from public water fountains (nasoni) - free & safe"]
      }
    }
  },
  "United Kingdom": {
    currency: "GBP",
    cities: {
      "London": {
        attractions: ["British Museum (free!)", "Buckingham Palace changing guard", "Tower Bridge & South Bank walk", "Camden Market", "Greenwich meridian (free views)", "Hyde Park"],
        cheapEats: ["Sainsbury's meal deals (main+snack+drink)", "Brick Lane curry houses lunch specials", "Camden street food stalls", "Fish & chips classic spots", "Pret & Greggs budget bites"],
        tips: ["Most big museums are FREE - cull the paid ones", "Oyster/card contactless pay-as-you-go beats day passes if 1-2 rides"]
      }
    }
  },
  "Australia": {
    currency: "AUD",
    cities: {
      "Sydney": {
        attractions: ["Opera House & Circular Quay walk", "Bondi to Coogee coastal walk (free)", "Darling Harbour", "Royal Botanic Garden", "Manly ferry ride"],
        cheapEats: ["Meat pie shops - P300", "Asian food courts (Thai town)", "Fish & chips at Bondi", "Sushi rolls from malls", "Breakfast acai bowls"],
        tips: ["Opal card caps daily fare - cap the system", "Coastal walks are the free highlights"]
      }
    }
  }
};

const GENERIC_ATTRACTIONS = [
  "Old town or city center walking tour",
  "Main market / bazaar (best people-watching + cheap food)",
  "Local museum or historical district",
  "Scenic viewpoint (sunset is free)",
  "Temple / church / mosque of the area",
  "Neighborhood park or waterfront stroll",
  "Night market or street-food quarter"
];

const GENERIC_EATS = [
  "Street food stalls near the main square",
  "Local family-run eatery (ask hotel for their fave)",
  "Supermarket or 7-Eleven-style quick bites",
  "Night market skewers and snacks",
  "Famous local noodle/rice/soup shop",
  "Coffee or tea house with local pastry"
];

/* ---------- Transport knowledge base: station / bus / route per spot ----------
   Index-aligned with each city's `attractions` list (first 4 entries).
   Falls back to a generic tip for spots without a route. */

const TRANSPORT = {
  "Japan": {
    "Tokyo": [
      "JR Yamanote Line to Ueno Station, 5-min walk (Senso-ji/Asakusa)",
      "Tokyo Metro Ginza Line to Shibuya Station, Hachiko Exit",
      "JR Yamanote Line to Harajuku Station, Meiji Shrine entrance",
      "Hibiya Line to Tsukiji Station, 2-min walk (Tsukiji Outer Market)"
    ],
    "Osaka": [
      "Subway Midosuji Line to Namba Station, 10-min walk to Dotonbori",
      "JR Loop Line to Osakajokoen Station for Osaka Castle",
      "Midosuji Line to Shinsaibashi Station, 1-min walk",
      "Sakaisuji Line to Nipponbashi Station for Kuromon Ichiba"
    ],
    "Kyoto": [
      "JR Nara Line to Inari Station (Fushimi Inari gates)",
      "JR Sagano Line to Saga-Arashiyama Station",
      "City bus 101 or 205 from Kyoto Station to Kinkaku-ji",
      "City bus 86/100/206 to Kiyomizu-michi stop, or taxi"
    ]
  },
  "South Korea": {
    "Seoul": [
      "Subway Line 3 to Gyeongbokgung Station, Exit 5",
      "Subway Line 4 to Myeongdong Station, Exit 6",
      "Line 4 to Myeongdong, then cable car from Namsan, or bus 02/03/05",
      "Subway Line 3 to Anguk Station, Exit 2 (Bukchon Hanok Village)"
    ],
    "Busan": [
      "Subway Line 1 to Toseong Station, Exit 6, then Saha-gu village bus 2/2-2",
      "Subway Line 2 to Haeundae Station, Exit 5 or 7",
      "Subway Line 1 to Jagalchi Station, Exit 10",
      "Bus 8, 30, 88 or 101 from Nampo-dong to Taejongdae"
    ]
  },
  "Thailand": {
    "Bangkok": [
      "BTS to Saphan Taksin, then Chao Phraya Express boat to Tha Chang pier",
      "Chao Phraya boat to Tha Tien pier, then 3-baht ferry across to Wat Arun",
      "BTS Mo Chit or MRT Chatuchak Park Station (Chatuchak Market)",
      "Bus 15 or river boat to Tha Phra Athit pier (Khao San Road)"
    ],
    "Phuket": [
      "Local bus route 2 from Phuket Town bus station to Old Town (~30 baht)",
      "Phuket Town bus route 2 to Patong Beach (~40 baht)",
      "Songthaew or motorbike taxi from Chalong Circle to Big Buddha",
      "Ferry from Rassada Pier, Phuket Town to Phi Phi (~2 hrs)"
    ],
    "Chiang Mai": [
      "Walk or red songthaew (shared truck) from anywhere in Old City",
      "Red songthaew from Pratu Chiang Mai gate to Doi Suthep (~60-80 baht)",
      "Walk from Tha Phae Gate to Night Bazaar",
      "Sunday Walking Street: walk to Tha Phae Gate"
    ]
  },
  "Hong Kong": {
    "Hong Kong": [
      "MTR Admiralty Station Exit C, then Peak Tram up to Victoria Peak",
      "MTR Tsim Sha Tsui Station Exit E/F, walk to Star Ferry Pier",
      "MTR Yau Ma Tei Station Exit C, Temple Street Night Market",
      "MTR Diamond Hill Station Exit C2, 5-min walk (Nan Lian Garden)"
    ]
  },
  "Singapore": {
    "Singapore": [
      "MRT Downtown Line to Bayfront Station, Exit B (Gardens by the Bay)",
      "MRT to Bayfront Station, Marina Bay Sands light show by 8pm",
      "MRT to HarbourFront Station, then Sentosa Express monorail",
      "MRT Downtown/North East Line to Chinatown Station or Telok Ayer"
    ]
  },
  "Taiwan": {
    "Taipei": [
      "MRT Red Line to Taipei 101/World Trade Center Station, Exit 4",
      "MRT Red Line to Jiantan Station, Exit 1 (Shilin Night Market)",
      "Train to Ruifang Station, then bus 788 or train to Jiufen",
      "MRT Green Line to Chiang Kai-shek Memorial Hall Station, Exit 5"
    ]
  },
  "Vietnam": {
    "Hanoi": [
      "Walk from Hoan Kiem Lake - Old Quarter is walkable",
      "Walk - Hoan Kiem Lake is the Old Quarter center",
      "Walk to Train Street (enter via 5 Phung Hung or around Le Duan)",
      "Walk 20 min or taxi from Old Quarter (Ba Dinh area)"
    ],
    "Da Nang": [
      "Grab/taxi from city center (~5 min) or rent a scooter",
      "Bus 1 or 2 from Da Nang center to Marble Mountains",
      "Motorbike or Grab to Son Tra Peninsula (Monkey Mountain)",
      "Bus 1 from Da Nang bus station to Hoi An (~1 hr), or Grab ~300k VND"
    ],
    "Ho Chi Minh City": [
      "MRT Line 1 to Ben Thanh Station (2026) or Grab/taxi",
      "Walk from Ben Thanh Market (5 min)",
      "Walk or Grab to War Remnants Museum (10 min)",
      "Walk from Ben Thanh or Grab to Bui Vien"
    ]
  },
  "Indonesia": {
    "Bali": [
      "Scooter or taxi from Kuta (~1 hr) to Uluwatu",
      "Scooter from Ubud center (15 min) to Tegallalang terraces",
      "Walk from Ubud center to Monkey Forest",
      "Walk - Kuta Beach is right at Kuta center"
    ],
    "Jakarta": [
      "Transjakarta Busway to Monas halt, or MRT to Bundaran HI + walk",
      "KRL Commuter Line to Jakarta Kota Station (Kota Tua)",
      "Transjakarta bus to Ancol",
      "KRL to Juanda Station, 10-min walk to Istiqlal"
    ]
  },
  "Malaysia": {
    "Kuala Lumpur": [
      "LRT Kelana Jaya Line to KLCC Station (Petronas Towers)",
      "KTM Komuter to Batu Caves Station, or MRT to Batu Caves",
      "LRT to Masjid Jamek Station (Merdeka Square)",
      "LRT to Pasar Seni Station (Central Market)"
    ],
    "Penang": [
      "CAT free shuttle bus around George Town, or walk",
      "Rapid Penang bus 204 from Komtar to Penang Hill station",
      "Rapid Penang bus 204 to Kek Lok Si (Air Itam)",
      "Rapid Penang bus 101 from George Town to Batu Ferringhi"
    ]
  },
  "Cambodia": {
    "Siem Reap": [
      "Tuk-tuk from town (~$10-15 for a full day of temples)",
      "Tuk-tuk (Angkor Thom is 2 km from Angkor Wat)",
      "Tuk-tuk (Ta Prohm is on the same temple loop)",
      "Walk from Pub Street to Old Market"
    ]
  },
  "China": {
    "Shanghai": [
      "Metro Line 2 or 10 to East Nanjing Road Station, Exit 6 (The Bund)",
      "Metro Line 10 to Yuyuan Garden Station",
      "Metro Line 2 to Lujiazui Station (Shanghai Tower)",
      "Metro Line 1 to Hengshan Road Station (French Concession)"
    ],
    "Beijing": [
      "Tourist bus from Dongzhimen, or metro to Huairou + shuttle (Mutianyu)",
      "Metro Line 1 to Tian'anmen East/West Station (Forbidden City)",
      "Metro Line 5 to Tiantan East Gate Station (Temple of Heaven)",
      "Metro Line 2 to Jishuitan Station (Shichahai hutongs)"
    ]
  },
  "Philippines": {
    "Manila": [
      "LRT-1 to Central Terminal Station (Intramuros)",
      "LRT-1 to United Nations Avenue Station (Rizal Park)",
      "LRT-1 to Carriedo Station, then walk to Binondo via Jones Bridge",
      "Walk from Intramuros entrance (Fort Santiago)"
    ],
    "Cebu": [
      "Bus from Cebu South Bus Terminal to Badian (~3-4 hrs), then tricycle",
      "Bus from Cebu South Bus Terminal to Moalboal (~4 hrs)",
      "Walk - Magellan's Cross is in downtown Cebu (near Basilica)",
      "Motorbike from Moalboal/Dalaguete to Osmeña Peak"
    ],
    "Siargao": [
      "Rent a scooter or trike from General Luna to Cloud 9",
      "Boat tour from General Luna pier (island hopping)",
      "Trike from General Luna (~30 min) to Magpupungko",
      "Boat from Del Carmen to Sugba Lagoon"
    ],
    "Boracay": [
      "Caticlan ferry, then trike/e-trike along White Beach",
      "Walk from Station 2 to Bulabog (5 min across the island)",
      "Trike from Station 2 to Puka Shell Beach (~P200)",
      "Scooter rental to Hagdan viewpoint"
    ],
    "El Nido": [
      "Boat tour from El Nido town pier (Tour A lagoons)",
      "Trike from town to Nacpan Beach (~30-45 min)",
      "Trike to Las Cabanas Beach (~10 min)",
      "Hike from town center (Taraw cliff trailhead)"
    ]
  },
  "France": {
    "Paris": [
      "Metro Line 6 to Bir-Hakeim or Trocadero Station (Eiffel Tower)",
      "Metro Line 1 to Palais Royal - Musee du Louvre",
      "Metro Line 12 to Abbesses Station (Montmartre)",
      "Walk along the Seine from the Louvre to the Eiffel Tower"
    ]
  },
  "Italy": {
    "Rome": [
      "Metro Line B to Colosseo Station (Colosseum)",
      "Metro Line A to Barberini Station, 10-min walk (Trevi)",
      "Bus 30/70/81 or walk to Pantheon",
      "Tram 8 from Largo Argentina to Trastevere"
    ]
  },
  "United Kingdom": {
    "London": [
      "Tube Central/Northern Line to Tottenham Court Road, 5-min walk",
      "Tube Victoria Line to Green Park or Jubilee to Westminster (Buckingham)",
      "Tube District/Circle Line to Tower Hill (Tower Bridge)",
      "Tube Northern Line to Camden Town (Camden Market)"
    ]
  },
  "Australia": {
    "Sydney": [
      "Train to Circular Quay Station (Opera House)",
      "Train to Bondi Junction, then bus 333 to Bondi Beach",
      "Train to Town Hall, then walk or tram L1 (Darling Harbour)",
      "Walk from Circular Quay to the Royal Botanic Garden"
    ]
  }
};

function getTransport(country, city, index) {
    try {
        const routes = TRANSPORT[country] && TRANSPORT[country][city];
        if (routes && routes[index]) return routes[index];
    } catch (_) { /* fall through */ }
    return "Ask your host or use a taxi/ride-hailing app from your hotel - or check Google Maps transit directions.";
}

/* ---------- Food guides CRUD ---------- */

function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function loadGuides() {
    try {
        const url = filterCountry ? `/api/guides?country=${encodeURIComponent(filterCountry)}` : "/api/guides";
        const res = await fetch(url);
        const data = await res.json();
        guides = data.guides || [];
        renderGuides();
        const countryList = document.getElementById("countryList");
        if (countryList) {
            const countries = new Set([...data.countries, ...Object.keys(KB)]);
            countryList.innerHTML = [...countries].map(c => `<option value="${escapeHtml(c)}"></option>`).join("");
        }
    } catch (err) {
        console.error("Guides error:", err);
    }
}

function priceLabel(p) {
    if (!p) return "";
    if (p === "Budget") return "Budget \u00B7 mura";
    if (p === "Mid") return "Mid \u00B7 katamtaman";
    return "Splurge \u00B7 mahal";
}

function renderGuides() {
    const list = document.getElementById("guidesList");
    if (guides.length === 0) {
        list.innerHTML = '<p class="muted">No food guides yet. Add your first one above!</p>';
        return;
    }
    list.innerHTML = guides.map(g => `
        <div class="guide-card">
            <div class="guide-top">
                <span class="guide-city">${escapeHtml(g.city)}</span>
                <span class="guide-country">${escapeHtml(g.country)}</span>
                <button class="del-btn" data-id="${g.id}" title="Delete guide">&#128465;</button>
            </div>
            <strong class="guide-place">${escapeHtml(g.place)}</strong>
            <div class="guide-food">${escapeHtml(g.food)}</div>
            <div class="guide-meta">
                <span class="price-tag">${escapeHtml(priceLabel(g.price))}</span>
            </div>
            ${g.note ? `<p class="guide-note">${escapeHtml(g.note)}</p>` : ""}
        </div>
    `).join("");

    list.querySelectorAll(".del-btn").forEach(btn => {
        btn.addEventListener("click", () => deleteGuide(btn.dataset.id));
    });
}

async function deleteGuide(id) {
    if (!confirm("Delete this food guide?")) return;
    try {
        const res = await fetch(`/api/guides/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (data.status === "success") {
            await loadGuides();
        } else {
            alert("Error: " + data.message);
        }
    } catch (err) {
        console.error("Delete guide error:", err);
        alert("Connection error while deleting guide.");
    }
}

document.getElementById("guideForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
        country: document.getElementById("gCountry").value.trim(),
        city: document.getElementById("gCity").value.trim(),
        place: document.getElementById("gPlace").value.trim(),
        food: document.getElementById("gFood").value.trim(),
        price: document.getElementById("gPrice").value,
        note: document.getElementById("gNote").value.trim()
    };
    if (!payload.country || !payload.city || !payload.place || !payload.food) {
        alert("Fill in country, city, place and food.");
        return;
    }
    try {
        const res = await fetch("/api/guides", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.status === "success") {
            e.target.reset();
            await loadGuides();
        } else {
            alert("Error: " + data.message);
        }
    } catch (err) {
        console.error("Add guide error:", err);
        alert("Error saving guide: " + err.message);
    }
});

document.getElementById("guideFilter").addEventListener("input", (e) => {
    filterCountry = e.target.value.trim();
    document.getElementById("clearFilter").classList.toggle("hide", !filterCountry);
    loadGuides();
});

document.getElementById("clearFilter").addEventListener("click", () => {
    filterCountry = "";
    document.getElementById("guideFilter").value = "";
    document.getElementById("clearFilter").classList.add("hide");
    loadGuides();
});

(function populateCityList() {
    const datalist = document.getElementById("cityList");
    if (!datalist) return;
    const cities = new Set();
    Object.values(KB).forEach(c => Object.keys(c.cities).forEach(ci => cities.add(ci)));
    datalist.innerHTML = [...cities].map(c => `<option value="${escapeHtml(c)}"></option>`).join("");
})();

/* ---------- Itinerary generator ---------- */

function pick(arr, offset) {
    return arr[offset % arr.length];
}

function findCity(country, city) {
    const c = Object.entries(KB).find(([k]) => k.toLowerCase() === country.toLowerCase());
    if (!c) return null;
    const cityEntry = Object.entries(c[1].cities).find(([k]) => k.toLowerCase() === city.toLowerCase());
    if (!cityEntry) return null;
    return { country: c[0], city: cityEntry[0], data: cityEntry[1], currency: c[1].currency };
}

function generateItinerary() {
    const country = document.getElementById("iCountry").value.trim();
    const city = document.getElementById("iCity").value.trim();
    const days = Math.min(14, Math.max(1, parseInt(document.getElementById("iDays").value) || 3));
    const budget = document.getElementById("iBudget").value || "Budget";
    const result = document.getElementById("itineraryResult");
    const found = findCity(country, city);
    const known = !!found;
    const tCountry = known ? found.country : country;
    const tCity = known ? found.city : city;

    const userGuides = guides.filter(g => g.country.toLowerCase() === country.toLowerCase());
    const knownGuides = found ? guides.filter(g => g.city.toLowerCase() === found.city.toLowerCase()) : [];

    const attrs = known ? found.data.attractions : GENERIC_ATTRACTIONS;
    const eats = known ? [...found.data.cheapEats, ...knownGuides.map(g => `${g.food} @ ${g.place}`)] : GENERIC_EATS;
    const tips = known ? found.data.tips : ["Eat where the locals queue - that's where it's cheapest", "Ask your hotel/host for their personal favorite spot", "Use public transport - taxis are the biggest budget killer"];

    const budgetRanges = { "Budget": "P1,200-2,000/day", "Mid": "P2,500-4,500/day", "Splurge": "P5,000+/day" };

    let html = "";
    if (!known) {
        html += `<div class="itin-warning">No detailed guide yet for <strong>${escapeHtml(city)}, ${escapeHtml(country)}</strong> - showing a general plan. Add the country data below in guides.js to make it specific!</div>`;
    } else {
        html += `<div class="itin-header">
            <span class="itin-title">${escapeHtml(found.city)}, ${escapeHtml(found.country)}</span>
            <span class="itin-days">${days} day${days > 1 ? "s" : ""} plan</span>
        </div>`;
    }

    if (userGuides.length > 0) {
        html += `<div class="itin-cheatsheet"><strong>Your saved food guides for ${escapeHtml(country)}:</strong> ${userGuides.map(g => `${escapeHtml(g.food)} @ ${escapeHtml(g.place)} (${escapeHtml(g.city)})`).join(" \u00B7 ")}</div>`;
    }

    /* Best places to visit - ranked, with how to get there */
    html += `<div class="best-spots"><h3>Best places to visit</h3>`;
    attrs.slice(0, 5).forEach((a, i) => {
        html += `<div class="spot-row">
            <span class="spot-rank">${i + 1}</span>
            <div class="spot-info">
                <strong>${escapeHtml(a)}</strong>
                <div class="transport-line">\uD83D\uDE87 ${escapeHtml(getTransport(tCountry, tCity, i))}</div>
            </div>
        </div>`;
    });
    html += `</div>`;

    for (let d = 1; d <= days; d++) {
        const offset = d - 1;
        const attrs1 = pick(attrs, offset);
        const attrs2 = pick(attrs, offset + Math.ceil(attrs.length / 2));
        const eat1 = pick(eats, offset);
        const eat2 = pick(eats, offset + 1);
        const eat3 = pick(eats, offset + 2);
        const attrs3 = pick(attrs, offset + 3);
        const idx1 = offset % attrs.length;
        const idx2 = (offset + Math.ceil(attrs.length / 2)) % attrs.length;
        const idx3 = (offset + 3) % attrs.length;

        html += `
        <div class="itin-day">
            <div class="day-title">Day ${d}</div>
            <div class="day-items">
                <div class="day-item">
                    <span class="time-badge">\u2600\uFE0E Morning</span>
                    <div class="day-desc"><strong>${escapeHtml(eat1)}</strong> <span class="dim">- breakfast</span></div>
                    <div class="day-desc">Visit <strong>${escapeHtml(attrs1)}</strong> <span class="dim">(go early, libre ang ganda)</span></div>
                    <div class="transport-line">\uD83D\uDE87 ${escapeHtml(getTransport(tCountry, tCity, idx1))}</div>
                </div>
                <div class="day-item">
                    <span class="time-badge">\u2615\uFE0E Lunch</span>
                    <div class="day-desc"><strong>${escapeHtml(eat2)}</strong> <span class="dim">- cheapest local lunch</span></div>
                    <div class="day-desc">Explore <strong>${escapeHtml(attrs2)}</strong></div>
                    <div class="transport-line">\uD83D\uDE87 ${escapeHtml(getTransport(tCountry, tCity, idx2))}</div>
                </div>
                <div class="day-item">
                    <span class="time-badge">\uD83C\uDF19 Evening</span>
                    <div class="day-desc"><strong>${escapeHtml(eat3)}</strong> <span class="dim">- dinner</span></div>
                    <div class="day-desc">Wind down at <strong>${escapeHtml(attrs3)}</strong> <span class="dim">(night market or sunset spot)</span></div>
                    <div class="transport-line">\uD83D\uDE87 ${escapeHtml(getTransport(tCountry, tCity, idx3))}</div>
                </div>
            </div>
        </div>`;
    }

    html += `<div class="itin-tips"><strong>Tips (from locals & budget travelers):</strong>
        <ul>${tips.map(t => `<li>${escapeHtml(t)}</li>`).join("")}</ul>
    </div>`;

    html += `<div class="itin-note"><strong>Budget math for ${escapeHtml(country)}:</strong> on a <strong>${escapeHtml(budget)}</strong> budget, plan roughly ${escapeHtml(budgetRanges[budget] || budgetRanges.Budget)} for food (street stalls), plus transport & activities. Street food = pinakamura at pinaka-masarap!</div>`;

    result.innerHTML = html;
}

document.getElementById("itinForm").addEventListener("submit", (e) => {
    e.preventDefault();
    generateItinerary();
});

/* ---------- AI detailed itinerary (Google Gemini, free tier, needs a free API key) ---------- */

function getAIKey() {
    try { return localStorage.getItem("tp_ai_key") || ""; } catch (_) { return ""; }
}

function showAIKeyForm() {
    const result = document.getElementById("aiResult");
    result.innerHTML = `
        <div class="ai-card">
            <div class="ai-title">Free AI setup needed</div>
            <div class="ai-overview">The AI itinerary uses Google Gemini's free tier. Get a free API key (no card needed):
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" style="color:#4dabf7">aistudio.google.com/apikey</a>
            - click "Create API key", copy it, paste below. Stored only in this browser.</div>
            <input id="aiKeyInput" type="password" placeholder="AIzaSy..." style="width:100%;box-sizing:border-box;margin:.6rem 0;padding:.6rem;border-radius:8px;border:1px solid #3a7bd5;background:#25446a;color:#e8f0f7;font-size:.9rem">
            <button id="aiKeySave" class="primary-btn" style="width:100%">Save &amp; Test API Key</button>
            <p id="aiKeyErr" style="color:#ff6b6b;font-size:.8rem;margin:.5rem 0 0;display:none">Please paste a valid key (starts with AIza).</p>
            <p id="aiKeyMsg" style="color:#e8f0f7;font-size:.8rem;margin:.5rem 0 0;display:none"></p>
        </div>`;
    result.querySelector("#aiKeySave").addEventListener("click", async () => {
        const key = result.querySelector("#aiKeyInput").value.trim();
        if (!key.startsWith("AIza")) {
            result.querySelector("#aiKeyErr").style.display = "block";
            return;
        }
        const msg = result.querySelector("#aiKeyMsg");
        msg.style.display = "block";
        msg.style.color = "#e8f0f7";
        msg.textContent = "Testing your key...";
        try {
            await testAIKey(key);
            localStorage.setItem("tp_ai_key", key);
            msg.style.color = "#51cf66";
            msg.textContent = "Key works! Click \"Generate Detailed AI Itinerary\" to create your plan.";
        } catch (e) {
            msg.style.color = "#ff6b6b";
            msg.textContent = "Key failed: " + e.message;
        }
    });
}

async function testAIKey(key) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: "Reply with the single word OK" }] }],
            generationConfig: { responseMimeType: "application/json" },
        }),
    });
    if (!res.ok) throw new Error(await apiErrorDetail(res) + " (HTTP " + res.status + ")");
    const data = await res.json();
    const text = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0].text;
    if (!text) throw new Error("Gemini returned no reply");
}

async function apiErrorDetail(res) {
    try {
        const e = await res.json();
        const m = e && e.error && e.error.message;
        if (m) {
            if (/API key not valid/i.test(m)) return "API key is invalid - check for typos or extra spaces, or create a new key";
            if (/API key expired/i.test(m)) return "API key has expired - create a new key";
            if (/not enabled|permission/i.test(m)) return "API key is not enabled for the Generative Language API - enable it in Google Cloud";
            if (/quota|rate limit|429/i.test(m)) return "Free daily quota reached - try again tomorrow";
            return m;
        }
    } catch (_) { /* not json */ }
    return "Unknown error";
}

function buildAIPrompt() {
    const country = document.getElementById("iCountry").value.trim();
    const city = document.getElementById("iCity").value.trim();
    const days = Math.min(14, Math.max(1, parseInt(document.getElementById("iDays").value) || 3));
    const budget = document.getElementById("iBudget").value || "Budget";

    const found = findCity(country, city);
    const userGuides = guides.filter(g => g.country.toLowerCase() === country.toLowerCase());
    const knownSpots = found ? found.data.attractions.join("; ") : "none in built-in data";
    const savedFoods = userGuides.length > 0
        ? userGuides.map(g => `${g.food} at ${g.place}, ${g.city} (${g.price || "no price range"})`).join("; ")
        : "none";

    return `Create a detailed ${days}-day travel itinerary for ${city}, ${country} on a ${budget} budget.
Also recommend the best 5 places to visit and, for EVERY recommended place, include exact how-to-get-there directions: the nearest train/metro/MRT/bus station or line and its exit, or the specific bus/ferry number, with rough fare if known.
Known good spots in my data: ${knownSpots}.
My personal saved food places (include them in the meal plan if reasonable): ${savedFoods}.

Respond ONLY with JSON matching EXACTLY this structure (no markdown, no comments):
{
  "overview": "2-3 sentence summary of the trip",
  "daily_budget": "rough daily food+transport+activities budget in USD and PHP",
  "best_spots": [{"name": "place", "why": "short reason", "transport": "station/line/exit/bus + fare if known", "cost": "approx entry cost"}],
  "days": [{"day": 1, "theme": "short theme", "places": [{"name": "place", "time": "e.g. morning", "transport": "exact directions", "cost": "entry cost"}], "meals": [{"meal": "breakfast/lunch/dinner", "place": "eatery", "cost": "approx price"}], "notes": "1 short tip"}],
  "tips": ["3-5 local budget tips"]
}`;
}

async function fetchAI(prompt) {
    const key = getAIKey();
    if (!key) throw new Error("AI_NOT_CONFIGURED");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90000);
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
            }),
            signal: controller.signal,
        });
        if (!res.ok) throw new Error(await apiErrorDetail(res) + " (HTTP " + res.status + ")");
        const data = await res.json();
        const text = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0].text;
        if (!text) throw new Error("AI returned no content");
        return text;
    } finally {
        clearTimeout(timer);
    }
}

function parseAIReply(text) {
    const trimmed = String(text || "").trim();
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonText = fence ? fence[1].trim() : trimmed;
    return JSON.parse(jsonText);
}

function renderAIResult(data) {
    const d = data || {};
    let html = `<div class="ai-card">
        <div class="ai-title">AI Detailed Itinerary</div>`;

    if (d.overview) html += `<div class="ai-overview">${escapeHtml(d.overview)}</div>`;
    if (d.daily_budget) html += `<div class="ai-budget-line">\uD83D\uDCB0 ${escapeHtml(d.daily_budget)}</div>`;

    if (Array.isArray(d.best_spots) && d.best_spots.length) {
        html += `<div class="best-spots"><h3>Best places to visit (AI-ranked)</h3>`;
        d.best_spots.forEach((s, i) => {
            html += `<div class="spot-row">
                <span class="spot-rank">${i + 1}</span>
                <div class="spot-info">
                    <strong>${escapeHtml(s.name)}</strong> ${s.cost ? `<span class="cost-tag">${escapeHtml(s.cost)}</span>` : ""}
                    <div class="spot-why">${escapeHtml(s.why || "")}</div>
                    <div class="transport-line">\uD83D\uDE87 ${escapeHtml(s.transport || "")}</div>
                </div>
            </div>`;
        });
        html += `</div>`;
    }

    if (Array.isArray(d.days)) {
        d.days.forEach((day) => {
            html += `<div class="itin-day"><div class="day-title">Day ${escapeHtml(day.day)} \u00B7 ${escapeHtml(day.theme || "")}</div><div class="day-items">`;
            (day.places || []).forEach((p) => {
                html += `<div class="day-item">
                    <span class="time-badge">${escapeHtml(p.time || "Visit")}</span>
                    <div class="day-desc"><strong>${escapeHtml(p.name)}</strong> ${p.cost ? `<span class="cost-tag">${escapeHtml(p.cost)}</span>` : ""}</div>
                    <div class="transport-line">\uD83D\uDE87 ${escapeHtml(p.transport || "")}</div>
                </div>`;
            });
            if (Array.isArray(day.meals) && day.meals.length) {
                html += `<div class="day-item ai-meals"><span class="time-badge">\uD83C\uDF7D\uFE0E Meals</span>`;
                day.meals.forEach((m) => {
                    html += `<div class="day-desc"><strong>${escapeHtml(m.meal)}:</strong> ${escapeHtml(m.place)} ${m.cost ? `<span class="cost-tag">${escapeHtml(m.cost)}</span>` : ""}</div>`;
                });
                html += `</div>`;
            }
            if (day.notes) html += `<div class="day-item"><span class="time-badge">\uD83D\uDCA1 Note</span><div class="day-desc dim">${escapeHtml(day.notes)}</div></div>`;
            html += `</div></div>`;
        });
    }

    if (Array.isArray(d.tips) && d.tips.length) {
        html += `<div class="itin-tips"><strong>AI budget tips:</strong><ul>${d.tips.map(t => `<li>${escapeHtml(t)}</li>`).join("")}</ul></div>`;
    }
    html += `</div>`;
    return html;
}

async function generateAIItinerary() {
    const country = document.getElementById("iCountry").value.trim();
    const city = document.getElementById("iCity").value.trim();
    const result = document.getElementById("aiResult");
    const btn = document.getElementById("aiBtn");
    if (!country || !city) {
        alert("Fill in country and city first.");
        return;
    }
    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = "Generating... (takes 20-60s)";
    result.innerHTML = `<div class="ai-loading"><div class="spinner"></div>AI is planning your trip... this can take up to a minute.</div>`;
    try {
        const reply = await fetchAI(buildAIPrompt());
        const data = parseAIReply(reply);
        result.innerHTML = renderAIResult(data);
    } catch (err) {
        if (err.message === "AI_NOT_CONFIGURED") {
            showAIKeyForm();
        } else {
            console.error("AI error:", err);
            result.innerHTML = `<div class="itin-warning"><strong>AI is not available right now.</strong> ${escapeHtml(err.message)} The offline itinerary above still works with built-in data and transport info.</div>`;
        }
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

document.getElementById("aiBtn").addEventListener("click", generateAIItinerary);

/* ---------- Init ---------- */

window.addEventListener("load", () => {
    loadGuides();
});