/* Open Stall — content data. Pure data, no DOM. window.OS_DATA in the browser, module.exports in Node. */
(function (root) {
'use strict';

const FAMILIES = { produce: 'Produce', baked: 'Baked goods', preserves: 'Preserves', flowers: 'Flowers', crafts: 'Crafts', curios: 'Curios' };
const WEATHER = {
  sun: { id: 'sun', name: 'Sunny', icon: '☀', desc: 'Warm and bright. Produce and drinks move; candles do not.' },
  rain: { id: 'rain', name: 'Rain', icon: '☂', desc: 'Umbrellas up. Flowers and warm things sell; paper curls.' },
  wind: { id: 'wind', name: 'Windy', icon: '≋', desc: 'Awnings flap. Heavy goods stay put; light things fly.' },
  fog: { id: 'fog', name: 'Fog', icon: '☁', desc: 'Nobody can see the stall from the gate. Lights and bells carry.' },
  frost: { id: 'frost', name: 'Frost', icon: '❄', desc: 'Breath in the air. Anything warm sells; greens wilt.' }
};
const WEATHER_ORDER = ['sun', 'rain', 'wind', 'fog', 'frost'];

/* Locations: difficulty tiers. rent[w] is the stall fee due at the end of week w (1-based). shop = price of the shop on the square. */
const LOCATIONS = [
  { id: 'green', name: 'Village Green', tier: 0, free: true, spins: 5, offers: 3, rent: [22, 34, 50, 70, 92, 120, 152, 190, 235, 290, 355, 430], shop: 1300, start: 15,
    desc: 'A trestle table by the war memorial. Twelve Saturdays, a shop with a bell over the door for sale on the square.' },
  { id: 'harbour', name: 'Harbour Market', tier: 1, free: false, spins: 5, offers: 3, rent: [25, 39, 58, 80, 106, 138, 175, 218, 270, 334, 408, 495], shop: 1450, start: 15, weatherBias: { rain: 2, wind: 2, fog: 1.5 }, feature: 'quay',
    desc: 'Fish crates and gulls. Rain more days than not. The bottom row of the stall is on the quayside: it pays double on a dry day and half in the wet, so the forecast decides your layout. The chandlery on the quay is for sale.' },
  { id: 'square', name: 'City Square', tier: 2, free: false, spins: 4, offers: 3, rent: [22, 34, 50, 70, 92, 120, 152, 190, 235, 290, 355, 430], shop: 1150, start: 25, weatherBias: { sun: 1.5, frost: 1.5 }, feature: 'orders',
    desc: 'Four browses a day instead of five: the city is in a hurry. Every morning a customer leaves an order for two kinds of stock side by side, and pays extra each browse it stands. The corner shop with the green tiles is for sale, and so is everything else.' }
];

/* Symbols. [id, name, family, pay, tags, rule]   rule = { k: kind, ...args }
   Rule kinds (one per symbol, shown in plain words on tap):
   adj {t,n}: +n per adjacent symbol with tag t      adjx {t,m}: ×m if next to tag t      boost {t,n}: adjacent tag-t symbols pay +n
   wx {w,n}: +n (or n<0) in weather w                count {t,n}: +n per tag t anywhere on the stall (not itself)
   eat {t,n}: sells through adjacent tag t (removes them from stock), +n each        age {n}: +n per browse it has been out
   sellout {n,k}: after k browses out it sells for n and leaves stock                 empty {n}: +n per adjacent empty space
   row {t,n}: +n if its row holds 3+ of tag t        week {n}: +n per three weeks of the season        spawn {s,p}: chance p each browse to add symbol s to stock
   turn {t,s}: adjacent tag t become s               lone {n}: +n if nothing of its own family is adjacent
   Tiers: 0 starting pool, 1 unlocks at week 6 reached, 2 at first season clear, 3 at Harbour clear. */
const SYMBOLS = [
  // produce
  ['apple', 'Apples', 'produce', 2, ['fruit', 'red', 'sun'], { k: 'wx', w: 'sun', n: 2 }, 0],
  ['pear', 'Pears', 'produce', 2, ['fruit', 'green'], { k: 'adj', t: 'green', n: 2 }, 0],
  ['plum', 'Plums', 'produce', 2, ['fruit'], { k: 'adj', t: 'jar', n: 2 }, 0],
  ['strawberry', 'Strawberries', 'produce', 2, ['fruit', 'red', 'sweet'], { k: 'count', t: 'red', n: 1 }, 0],
  ['blackberry', 'Blackberries', 'produce', 2, ['fruit', 'sweet'], { k: 'adj', t: 'baked', n: 1 }, 1],
  ['cherry', 'Cherries', 'produce', 2, ['fruit', 'red'], { k: 'adj', t: 'red', n: 2 }, 1],
  ['lemon', 'Lemons', 'produce', 1, ['fruit'], { k: 'boost', t: 'drink', n: 2 }, 0],
  ['rhubarb', 'Rhubarb', 'produce', 1, ['veg', 'red'], { k: 'boost', t: 'sweet', n: 1 }, 1],
  ['carrot', 'Carrots', 'produce', 1, ['veg'], { k: 'count', t: 'veg', n: 1 }, 0],
  ['potato', 'Potatoes', 'produce', 1, ['veg', 'heavy'], { k: 'wx', w: 'wind', n: 2 }, 0],
  ['onion', 'Onions', 'produce', 1, ['veg'], { k: 'lone', n: 4 }, 0],
  ['pumpkin', 'Pumpkin', 'produce', 2, ['veg', 'heavy'], { k: 'week', n: 1 }, 1],
  ['tomato', 'Tomatoes', 'produce', 2, ['veg', 'red', 'sun'], { k: 'adj', t: 'herb', n: 2 }, 0],
  ['lettuce', 'Lettuce', 'produce', 1, ['veg', 'green'], { k: 'count', t: 'green', n: 1 }, 0],
  ['mushroom', 'Mushrooms', 'produce', 2, ['veg'], { k: 'wx', w: 'fog', n: 4 }, 1],
  ['garlic', 'Garlic', 'produce', 1, ['veg'], { k: 'boost', t: 'warm', n: 1 }, 2],
  ['basil', 'Basil', 'produce', 1, ['herb', 'green'], { k: 'boost', t: 'veg', n: 1 }, 0],
  ['mint', 'Mint', 'produce', 1, ['herb', 'green'], { k: 'boost', t: 'tea', n: 2 }, 1],
  ['chilli', 'Chillies', 'produce', 2, ['veg', 'red', 'warm'], { k: 'adjx', t: 'warm', m: 2 }, 2],
  ['beetroot', 'Beetroot', 'produce', 1, ['veg', 'red', 'heavy'], { k: 'row', t: 'red', n: 4 }, 3],
  // baked goods
  ['loaf', 'Tin loaf', 'baked', 2, ['bread'], { k: 'row', t: 'bread', n: 3 }, 0],
  ['sourdough', 'Sourdough', 'baked', 3, ['bread'], { k: 'age', n: 1 }, 1],
  ['scone', 'Scones', 'baked', 2, ['sweet'], { k: 'adj', t: 'jar', n: 2 }, 0],
  ['pie', 'Meat pie', 'baked', 3, ['warm'], { k: 'wx', w: 'frost', n: 3 }, 0],
  ['sausageroll', 'Sausage rolls', 'baked', 2, ['warm'], { k: 'wx', w: 'rain', n: 2 }, 0],
  ['croissant', 'Croissants', 'baked', 2, ['bread'], { k: 'adj', t: 'drink', n: 1 }, 1],
  ['cake', 'Victoria sponge', 'baked', 3, ['sweet'], { k: 'count', t: 'sweet', n: 1 }, 1],
  ['brownie', 'Brownies', 'baked', 2, ['sweet'], { k: 'sellout', n: 16, kk: 2 }, 1],
  ['flapjack', 'Flapjacks', 'baked', 2, ['sweet'], { k: 'adj', t: 'honey', n: 3 }, 0],
  ['bun', 'Sticky buns', 'baked', 2, ['sweet', 'bread'], { k: 'adj', t: 'sweet', n: 1 }, 0],
  ['pasty', 'Pasties', 'baked', 2, ['warm'], { k: 'adj', t: 'veg', n: 1 }, 0],
  ['pretzel', 'Pretzels', 'baked', 1, ['bread'], { k: 'adj', t: 'drink', n: 2 }, 2],
  ['gingerbread', 'Gingerbread', 'baked', 2, ['sweet', 'warm'], { k: 'week', n: 1 }, 2],
  ['biscuit', 'Shortbread', 'baked', 1, ['sweet'], { k: 'adj', t: 'tea', n: 3 }, 0],
  ['muffin', 'Muffins', 'baked', 2, ['sweet'], { k: 'adj', t: 'fruit', n: 1 }, 1],
  ['baguette', 'Baguettes', 'baked', 1, ['bread'], { k: 'empty', n: 2 }, 1],
  ['tart', 'Fruit tart', 'baked', 1, ['sweet'], { k: 'eat', t: 'fruit', n: 6 }, 2],
  ['cheesestraw', 'Cheese straws', 'baked', 1, ['warm'], { k: 'count', t: 'warm', n: 1 }, 3],
  ['focaccia', 'Focaccia', 'baked', 2, ['bread'], { k: 'adj', t: 'herb', n: 2 }, 3],
  ['crumpet', 'Crumpets', 'baked', 1, ['bread', 'warm'], { k: 'boost', t: 'jar', n: 2 }, 3],
  // preserves
  ['jam', 'Strawberry jam', 'preserves', 2, ['jar', 'sweet'], { k: 'eat', t: 'fruit', n: 5 }, 0],
  ['marmalade', 'Marmalade', 'preserves', 2, ['jar', 'sweet'], { k: 'adj', t: 'bread', n: 2 }, 0],
  ['honey', 'Honey', 'preserves', 2, ['jar', 'honey', 'sweet'], { k: 'adj', t: 'tea', n: 4 }, 0],
  ['chutney', 'Chutney', 'preserves', 2, ['jar'], { k: 'eat', t: 'veg', n: 4 }, 1],
  ['pickles', 'Pickled onions', 'preserves', 1, ['jar'], { k: 'age', n: 1 }, 0],
  ['curd', 'Lemon curd', 'preserves', 2, ['jar', 'sweet'], { k: 'adj', t: 'lemon', n: 5 }, 1],
  ['cider', 'Cider', 'preserves', 3, ['drink'], { k: 'adj', t: 'apple', n: 3 }, 0],
  ['juice', 'Apple juice', 'preserves', 2, ['drink'], { k: 'wx', w: 'sun', n: 2 }, 0],
  ['tea', 'Tea tin', 'preserves', 2, ['tea', 'drink'], { k: 'adj', t: 'honey', n: 4 }, 0],
  ['coffee', 'Coffee beans', 'preserves', 3, ['drink', 'warm'], { k: 'wx', w: 'fog', n: 4 }, 1],
  ['cordial', 'Elderflower cordial', 'preserves', 2, ['drink'], { k: 'adj', t: 'flowers', n: 1 }, 1],
  ['hotsauce', 'Hot sauce', 'preserves', 2, ['jar', 'warm', 'red'], { k: 'adj', t: 'warm', n: 2 }, 2],
  ['mustard', 'Mustard', 'preserves', 1, ['jar'], { k: 'boost', t: 'warm', n: 1 }, 2],
  ['oil', 'Olive oil', 'preserves', 2, ['jar'], { k: 'boost', t: 'bread', n: 1 }, 2],
  ['vinegar', 'Cider vinegar', 'preserves', 1, ['jar'], { k: 'turn', t: 'fruit', s: 'cider' }, 2],
  ['jelly', 'Bramble jelly', 'preserves', 2, ['jar', 'sweet'], { k: 'count', t: 'jar', n: 1 }, 1],
  ['relish', 'Tomato relish', 'preserves', 2, ['jar', 'red'], { k: 'adj', t: 'red', n: 1 }, 3],
  ['driedapple', 'Dried apple rings', 'preserves', 1, ['sweet'], { k: 'spawn', s: 'apple', p: 0.25 }, 3],
  ['syrup', 'Birch syrup', 'preserves', 3, ['jar', 'sweet', 'wood'], { k: 'adj', t: 'wood', n: 2 }, 3],
  ['kombucha', 'Kombucha', 'preserves', 1, ['drink'], { k: 'age', n: 2 }, 3],
  // flowers
  ['rose', 'Roses', 'flowers', 2, ['red'], { k: 'wx', w: 'rain', n: 2 }, 0],
  ['tulip', 'Tulips', 'flowers', 2, [], { k: 'wx', w: 'rain', n: 3 }, 0],
  ['daffodil', 'Daffodils', 'flowers', 1, [], { k: 'count', t: 'flowers', n: 1 }, 0],
  ['sunflower', 'Sunflowers', 'flowers', 2, ['sun'], { k: 'wx', w: 'sun', n: 3 }, 0],
  ['lavender', 'Lavender', 'flowers', 2, ['herb'], { k: 'boost', t: 'crafts', n: 1 }, 1],
  ['daisy', 'Daisies', 'flowers', 1, [], { k: 'spawn', s: 'daisy', p: 0.25 }, 0],
  ['peony', 'Peonies', 'flowers', 3, [], { k: 'sellout', n: 20, kk: 2 }, 1],
  ['posy', 'Wildflower posy', 'flowers', 1, [], { k: 'adj', t: 'flowers', n: 1 }, 0],
  ['wreath', 'Wreath', 'flowers', 3, ['wood'], { k: 'week', n: 1 }, 2],
  ['dried', 'Dried flowers', 'flowers', 2, ['old'], { k: 'wx', w: 'rain', n: -1 }, 1],
  ['poppy', 'Poppies', 'flowers', 2, ['red'], { k: 'wx', w: 'wind', n: 2 }, 1],
  ['bluebell', 'Bluebells', 'flowers', 1, ['light'], { k: 'wx', w: 'fog', n: 5 }, 1],
  ['lily', 'Lilies', 'flowers', 3, [], { k: 'lone', n: 6 }, 2],
  ['orchid', 'Orchid', 'flowers', 4, [], { k: 'wx', w: 'frost', n: -3 }, 2],
  ['seedlings', 'Seedlings', 'flowers', 0, ['green'], { k: 'spawn', s: 'tulip', p: 0.3 }, 0],
  ['herbpot', 'Herb pot', 'flowers', 1, ['herb', 'green'], { k: 'boost', t: 'produce', n: 1 }, 1],
  ['fern', 'Fern', 'flowers', 1, ['green'], { k: 'adj', t: 'green', n: 2 }, 2],
  ['cactus', 'Cactus', 'flowers', 2, ['green'], { k: 'empty', n: 3 }, 1],
  ['bouquet', 'Bouquet', 'flowers', 2, [], { k: 'eat', t: 'flowers', n: 4 }, 3],
  ['sweetpea', 'Sweet peas', 'flowers', 1, ['sweet'], { k: 'boost', t: 'flowers', n: 1 }, 3],
  // crafts
  ['spoon', 'Wooden spoons', 'crafts', 1, ['wood'], { k: 'count', t: 'wood', n: 1 }, 0],
  ['board', 'Chopping board', 'crafts', 2, ['wood', 'heavy'], { k: 'adj', t: 'bread', n: 2 }, 0],
  ['scarf', 'Knitted scarf', 'crafts', 2, ['cloth', 'warm'], { k: 'wx', w: 'frost', n: 3 }, 0],
  ['candle', 'Beeswax candle', 'crafts', 2, ['light', 'honey'], { k: 'wx', w: 'fog', n: 5 }, 0],
  ['soap', 'Lavender soap', 'crafts', 2, ['herb'], { k: 'adj', t: 'flowers', n: 1 }, 0],
  ['mug', 'Pottery mug', 'crafts', 2, ['heavy'], { k: 'adj', t: 'drink', n: 2 }, 0],
  ['basket', 'Willow basket', 'crafts', 1, ['wood'], { k: 'boost', t: 'produce', n: 1 }, 0],
  ['tote', 'Tote bag', 'crafts', 1, ['cloth'], { k: 'count', t: 'cloth', n: 1 }, 1],
  ['birdhouse', 'Birdhouse', 'crafts', 2, ['wood'], { k: 'adj', t: 'wood', n: 1 }, 1],
  ['quilt', 'Patchwork quilt', 'crafts', 4, ['cloth', 'warm', 'heavy'], { k: 'wx', w: 'wind', n: 2 }, 1],
  ['earrings', 'Silver earrings', 'crafts', 3, ['metal', 'light'], { k: 'wx', w: 'wind', n: -2 }, 1],
  ['wallet', 'Leather wallet', 'crafts', 2, [], { k: 'lone', n: 5 }, 1],
  ['owl', 'Carved owl', 'crafts', 2, ['wood'], { k: 'age', n: 1 }, 2],
  ['teacosy', 'Tea cosy', 'crafts', 1, ['cloth', 'tea'], { k: 'boost', t: 'tea', n: 3 }, 1],
  ['apron', 'Apron', 'crafts', 1, ['cloth'], { k: 'boost', t: 'baked', n: 1 }, 2],
  ['bowl', 'Turned bowl', 'crafts', 2, ['wood', 'heavy'], { k: 'adj', t: 'fruit', n: 1 }, 2],
  ['chime', 'Wind chime', 'crafts', 2, ['metal', 'light'], { k: 'wx', w: 'wind', n: 4 }, 0],
  ['lantern', 'Tin lantern', 'crafts', 2, ['metal', 'light'], { k: 'adj', t: 'light', n: 2 }, 2],
  ['rug', 'Rag rug', 'crafts', 3, ['cloth', 'heavy'], { k: 'adjx', t: 'cloth', m: 2 }, 3],
  ['bookmark', 'Pressed-flower bookmark', 'crafts', 1, ['light'], { k: 'adj', t: 'old', n: 2 }, 3],
  // curios
  ['map', 'Old map', 'curios', 2, ['old', 'light'], { k: 'wx', w: 'fog', n: 3 }, 0],
  ['compass', 'Brass compass', 'curios', 2, ['metal', 'old'], { k: 'empty', n: 2 }, 0],
  ['record', 'Vinyl record', 'curios', 2, ['old'], { k: 'count', t: 'old', n: 1 }, 0],
  ['typewriter', 'Typewriter', 'curios', 3, ['old', 'heavy', 'metal'], { k: 'lone', n: 6 }, 1],
  ['postcard', 'Postcards', 'curios', 1, ['old', 'light'], { k: 'spawn', s: 'postcard', p: 0.2 }, 0],
  ['fossil', 'Fossil', 'curios', 3, ['old', 'heavy'], { k: 'age', n: 1 }, 1],
  ['watch', 'Pocket watch', 'curios', 3, ['metal', 'old'], { k: 'week', n: 1 }, 1],
  ['snowglobe', 'Snow globe', 'curios', 1, ['odd'], { k: 'empty', n: 2 }, 0],
  ['telescope', 'Telescope', 'curios', 3, ['metal', 'old'], { k: 'wx', w: 'fog', n: -2 }, 1],
  ['bottle', 'Glass bottles', 'curios', 1, ['light'], { k: 'adj', t: 'drink', n: 2 }, 0],
  ['marbles', 'Marbles', 'curios', 1, ['odd'], { k: 'count', t: 'odd', n: 2 }, 1],
  ['train', 'Toy train', 'curios', 3, ['old', 'metal'], { k: 'row', t: 'old', n: 5 }, 2],
  ['horseshoe', 'Horseshoe', 'curios', 2, ['metal', 'heavy'], { k: 'boost', t: 'curios', n: 1 }, 2],
  ['feather', 'Peacock feather', 'curios', 1, ['light'], { k: 'adj', t: 'light', n: 2 }, 0],
  ['geode', 'Geode', 'curios', 2, ['heavy'], { k: 'empty', n: 3 }, 2],
  ['glass', 'Magnifying glass', 'curios', 2, ['metal'], { k: 'adjx', t: 'old', m: 2 }, 2],
  ['key', 'Old keys', 'curios', 1, ['metal', 'old'], { k: 'adj', t: 'metal', n: 2 }, 1],
  ['musicbox', 'Music box', 'curios', 3, ['odd', 'old'], { k: 'wx', w: 'fog', n: 3 }, 2],
  ['ship', 'Ship in a bottle', 'curios', 4, ['odd', 'old'], { k: 'wx', w: 'wind', n: 3 }, 3],
  ['vane', 'Weather vane', 'curios', 2, ['metal'], { k: 'adj', t: 'light', n: 2 }, 3]
].map(a => ({ id: a[0], name: a[1], fam: a[2], pay: a[3], tags: a[4], rule: a[5], tier: a[6], price: Math.max(2, a[3] * 3) }));

/* Charms: passive run modifiers. kinds:
   tagpay {t,n}  tagmult {t,m}  wxmult {w,m}  spins {n}  rent {p}  sell {p}  offers {n}  reroll {n}  emptypay {n}
   adjmult {m} (all adjacency bonuses ×m)  eatmult {m}  first {m}  last {m}  flat {n}  min {n}  countpay {t,n}  refund {n}
   weatherlock {w}  interest {p}  agemult {m}  spawnmult {m}  rowmult {m}  lonemult {m}  weekmult {m}  selloutmult {m} */
const CHARMS = [
  ['beehive', 'Beehive', { k: 'tagpay', t: 'honey', n: 2 }, 0], ['teapot', 'Brown teapot', { k: 'tagpay', t: 'tea', n: 2 }, 0],
  ['orchardkey', 'Orchard key', { k: 'tagpay', t: 'fruit', n: 1 }, 0], ['trowel', 'Trowel', { k: 'tagpay', t: 'veg', n: 1 }, 0],
  ['ovenglove', 'Oven glove', { k: 'tagpay', t: 'baked', n: 1 }, 0], ['jarlabels', 'Jar labels', { k: 'tagpay', t: 'jar', n: 1 }, 0],
  ['vase', 'Enamel vase', { k: 'tagpay', t: 'flowers', n: 1 }, 0], ['chisel', 'Chisel', { k: 'tagpay', t: 'wood', n: 1 }, 0],
  ['thimble', 'Thimble', { k: 'tagpay', t: 'cloth', n: 1 }, 0], ['loupe', "Jeweller's loupe", { k: 'tagpay', t: 'old', n: 1 }, 0],
  ['polish', 'Brass polish', { k: 'tagpay', t: 'metal', n: 1 }, 1], ['kettle', 'Camp kettle', { k: 'tagpay', t: 'warm', n: 1 }, 0],
  ['sugartin', 'Sugar tin', { k: 'tagpay', t: 'sweet', n: 1 }, 0], ['pitcher', 'Water pitcher', { k: 'tagpay', t: 'drink', n: 1 }, 0],
  ['greenhouse', 'Greenhouse key', { k: 'tagpay', t: 'green', n: 1 }, 1], ['redribbon', 'Red ribbon', { k: 'tagpay', t: 'red', n: 1 }, 1],
  ['parasol', 'Parasol', { k: 'wxmult', w: 'sun', m: 1.5 }, 0], ['umbrella', 'Big umbrella', { k: 'wxmult', w: 'rain', m: 1.5 }, 0],
  ['guyropes', 'Guy ropes', { k: 'wxmult', w: 'wind', m: 1.5 }, 0], ['foglamp', 'Fog lamp', { k: 'wxmult', w: 'fog', m: 1.5 }, 0],
  ['brazier', 'Brazier', { k: 'wxmult', w: 'frost', m: 1.5 }, 0], ['almanac', "Farmer's almanac", { k: 'weatherlock', w: 'sun' }, 2],
  ['raindance', 'Rain barrel', { k: 'weatherlock', w: 'rain' }, 2], ['stove', 'Paraffin stove', { k: 'weatherlock', w: 'frost' }, 3],
  ['bell', 'Stall bell', { k: 'spins', n: 1 }, 1], ['secondtable', 'Second trestle', { k: 'spins', n: 1 }, 2],
  ['lease', 'Fair lease', { k: 'rent', p: 15 }, 0], ['handshake', "Landlord's handshake", { k: 'rent', p: 25 }, 2],
  ['scales', 'Honest scales', { k: 'sell', p: 50 }, 0], ['pricegun', 'Price gun', { k: 'sell', p: 100 }, 1],
  ['van', 'Wholesaler van', { k: 'offers', n: 1 }, 0], ['catalogue', 'Trade catalogue', { k: 'offers', n: 2 }, 2],
  ['coupon', 'Coupon book', { k: 'reroll', n: 1 }, 0], ['cousin', 'Cousin at the wholesaler', { k: 'reroll', n: 3 }, 2],
  ['tablecloth', 'Gingham tablecloth', { k: 'emptypay', n: 1 }, 0], ['minimalist', 'Minimalist sign', { k: 'emptypay', n: 2 }, 2],
  ['neighbourly', 'Neighbourly sign', { k: 'adjmult', m: 1.5 }, 1], ['layout', 'Layout plan', { k: 'adjmult', m: 2 }, 3],
  ['tastingspoon', 'Tasting spoons', { k: 'eatmult', m: 1.5 }, 1], ['sampler', 'Sampler tray', { k: 'eatmult', m: 2 }, 2],
  ['earlybird', 'Early bird sign', { k: 'first', m: 2 }, 0], ['lastcall', 'Last-call bell', { k: 'last', m: 2 }, 1],
  ['tipjar', 'Tip jar', { k: 'flat', n: 2 }, 0], ['busker', 'Friendly busker', { k: 'flat', n: 4 }, 1],
  ['floor', 'Price floor', { k: 'min', n: 2 }, 1], ['floor2', 'Firm price floor', { k: 'min', n: 3 }, 3],
  ['crates', 'Spare crates', { k: 'countpay', t: 'produce', n: 1 }, 1], ['breadbin', 'Bread bin', { k: 'countpay', t: 'bread', n: 1 }, 1],
  ['pantry', 'Pantry shelf', { k: 'countpay', t: 'jar', n: 1 }, 1], ['bucket', 'Flower bucket', { k: 'countpay', t: 'flowers', n: 1 }, 1],
  ['toolroll', 'Tool roll', { k: 'countpay', t: 'crafts', n: 1 }, 1], ['cabinet', 'Curio cabinet', { k: 'countpay', t: 'curios', n: 1 }, 1],
  ['receipts', 'Receipt book', { k: 'refund', n: 3 }, 1], ['returns', 'Returns policy', { k: 'refund', n: 6 }, 2],
  ['savings', 'Savings tin', { k: 'interest', p: 5 }, 1], ['bank', 'Village bank', { k: 'interest', p: 10 }, 3],
  ['cellar', 'Cool cellar', { k: 'agemult', m: 2 }, 1], ['seedbox', 'Seed box', { k: 'spawnmult', m: 2 }, 1],
  ['shelf', 'Long shelf', { k: 'rowmult', m: 2 }, 1], ['spotlight', 'Spotlight', { k: 'lonemult', m: 2 }, 1],
  ['calendar', 'Season calendar', { k: 'weekmult', m: 2 }, 2], ['queue', 'Queue rope', { k: 'selloutmult', m: 1.5 }, 1],
  ['hamper', 'Gift hamper', { k: 'tagpay', t: 'preserves', n: 1 }, 1], ['toolbox', 'Toolbox', { k: 'tagpay', t: 'crafts', n: 1 }, 1],
  ['dustcloth', 'Dust cloth', { k: 'tagpay', t: 'curios', n: 1 }, 1], ['sieve', 'Flour sieve', { k: 'tagpay', t: 'bread', n: 1 }, 1],
  ['featherduster', 'Feather duster', { k: 'tagpay', t: 'light', n: 1 }, 2], ['sacktruck', 'Sack truck', { k: 'tagpay', t: 'heavy', n: 1 }, 2],
  ['herbscissors', 'Herb scissors', { k: 'tagpay', t: 'herb', n: 2 }, 2], ['oddbox', 'Box of oddments', { k: 'tagpay', t: 'odd', n: 2 }, 2],
  ['rainhat', 'Rain hat', { k: 'tagmult', t: 'flowers', m: 1.5 }, 2], ['sunhat', 'Sun hat', { k: 'tagmult', t: 'produce', m: 1.5 }, 2],
  ['apronpocket', 'Apron pocket', { k: 'tagmult', t: 'baked', m: 1.5 }, 2], ['cellarkey', 'Cellar key', { k: 'tagmult', t: 'preserves', m: 1.5 }, 2],
  ['workbench', 'Workbench', { k: 'tagmult', t: 'crafts', m: 1.5 }, 2], ['glasscase', 'Glass case', { k: 'tagmult', t: 'curios', m: 1.5 }, 2],
  ['goldenspoon', 'Golden spoon', { k: 'flat', n: 8 }, 3], ['regulars', 'The regulars', { k: 'min', n: 4 }, 3],
  ['marketclock', 'Market clock', { k: 'spins', n: 2 }, 3], ['patron', 'A patron', { k: 'rent', p: 40 }, 3]
].map(a => ({ id: a[0], name: a[1], eff: a[2], tier: a[3] }));
CHARMS.forEach(c => { const t = c.tier; c.price = [25, 45, 70, 110][t] + (c.eff.k === 'spins' ? 60 : c.eff.k === 'weatherlock' ? 40 : 0); });

/* Day events: drawn at dawn, last the day. Same modifier kinds as charms, plus 'nothing'. */
const EVENTS = [
  ['schooltrip', 'School trip', 'Forty children with a pound each. Sweet things pay +2 today.', { k: 'tagpay', t: 'sweet', n: 2 }],
  ['critic', 'The food critic', 'A man with a notebook stands at the stall for the first browse. First browse pays double.', { k: 'first', m: 2 }],
  ['inspector', 'Trading standards', 'A woman with a clipboard. Curios pay nothing today; she wants provenance.', { k: 'tagmult', t: 'curios', m: 0 }],
  ['wedding', 'A wedding in the church', 'Flowers pay +3 today. Everyone is in a hurry.', { k: 'tagpay', t: 'flowers', n: 3 }],
  ['harvest', 'Harvest festival', 'Produce pays +2 and the vicar buys a marrow.', { k: 'tagpay', t: 'produce', n: 2 }],
  ['bakeoff', 'The bake-off', 'Baked goods pay +2 as everyone pretends to judge.', { k: 'tagpay', t: 'baked', n: 2 }],
  ['jamjudge', 'The jam judge', 'Preserves pay +2. She tastes with a clean spoon each time.', { k: 'tagpay', t: 'preserves', n: 2 }],
  ['craftfair', 'Craft fair', 'Crafts pay +2. Someone brings a lathe.', { k: 'tagpay', t: 'crafts', n: 2 }],
  ['antiques', 'The antiques programme', 'A television van. Curios pay +3 today.', { k: 'tagpay', t: 'curios', n: 3 }],
  ['busker', 'A busker', 'Every browse pays +3. He knows four songs.', { k: 'flat', n: 3 }],
  ['halfday', 'Half-day closing', 'One fewer browse today. The council is sorry.', { k: 'spins', n: -1 }],
  ['latebus', 'The late bus', 'An extra browse: the last bus is late and so is everyone else.', { k: 'spins', n: 1 }],
  ['rentholiday', 'Rent holiday', 'The landlord is in a good mood. This week\'s fee is halved.', { k: 'rent', p: 50 }],
  ['surcharge', 'Market surcharge', 'A new levy. This week\'s fee is a quarter higher.', { k: 'rent', p: -25 }],
  ['tourists', 'Coach party', 'Tourists buy anything light enough to carry. Light things pay +2.', { k: 'tagpay', t: 'light', n: 2 }],
  ['removal', 'Removals day', 'Someone is furnishing a house. Heavy things pay +2.', { k: 'tagpay', t: 'heavy', n: 2 }],
  ['hotdrinks', 'Tea urn broke', 'The WI tea urn is broken. Drinks pay +2.', { k: 'tagpay', t: 'drink', n: 2 }],
  ['gardenclub', 'Garden club visit', 'Green things pay +2 and get argued about.', { k: 'tagpay', t: 'green', n: 2 }],
  ['chilli', 'Chilli festival', 'Warm things pay +2. There is a man crying happily.', { k: 'tagpay', t: 'warm', n: 2 }],
  ['neighbours', 'The stall next door is empty', 'Adjacency bonuses are worth half again today; people linger.', { k: 'adjmult', m: 1.5 }],
  ['sampling', 'Sampling day', 'Selling-through pays half again. Everyone wants a taste.', { k: 'eatmult', m: 1.5 }],
  ['quiet', 'A quiet morning', 'Empty spaces on the stall look tidy today: each pays +1.', { k: 'emptypay', n: 1 }],
  ['bargain', 'Bargain hunters', 'Sell prices are halved today. Do not sell today.', { k: 'sell', p: -50 }],
  ['collector', 'A collector', 'Sell prices are doubled today. Clear the back of the stall.', { k: 'sell', p: 100 }],
  ['freesample', 'Wholesaler sample', 'The wholesaler offers one more choice each browse.', { k: 'offers', n: 1 }],
  ['shortage', 'Delivery shortage', 'One fewer choice each browse; the van broke down.', { k: 'offers', n: -1 }],
  ['localpaper', 'In the local paper', 'Every symbol pays at least 2 today.', { k: 'min', n: 2 }],
  ['oldfriends', 'Old friends', 'Old things pay +2. Someone recognises the typewriter.', { k: 'tagpay', t: 'old', n: 2 }],
  ['nothing', 'An ordinary Saturday', 'Nothing special. The bells ring at nine.', { k: 'nothing' }],
  ['lastcall', 'Closing early', 'The last browse pays double; everyone grabs something on the way out.', { k: 'last', m: 2 }]
].map(a => ({ id: a[0], name: a[1], text: a[2], eff: a[3] }));

/* Combo archetypes the balance harness tests: a name, the tags a focused player prefers, and the rule firings that count as the combo. */
const ARCHETYPES = [
  { id: 'teahoney', name: 'Tea & honey', tags: ['tea', 'honey'] },
  { id: 'jamfruit', name: 'Jam sells through fruit', tags: ['jar', 'fruit'], symbols: ['jam', 'tart', 'plum'] },
  { id: 'rainflowers', name: 'Flowers in the rain', tags: ['flowers'], weather: 'rain' },
  { id: 'breadrow', name: 'A row of bread', tags: ['bread'] },
  { id: 'frostwarm', name: 'Warm things in frost', tags: ['warm'], weather: 'frost' },
  { id: 'emptycurios', name: 'Room to breathe', symbols: ['compass', 'geode', 'cactus', 'baguette', 'snowglobe'], charms: ['tablecloth', 'minimalist'], sparse: true },
  { id: 'woodcount', name: 'Woodwork', tags: ['wood'] },
  { id: 'clothwarm', name: 'Cloth and warmth', tags: ['cloth'] },
  { id: 'herbveg', name: 'Herbs boost vegetables', tags: ['herb', 'veg'] },
  { id: 'drinks', name: 'Drinks and vessels', tags: ['drink'], symbols: ['mug', 'bottle', 'lemon', 'pretzel', 'croissant'] },
  { id: 'aged', name: 'Things that improve with age', symbols: ['sourdough', 'pickles', 'fossil', 'owl', 'kombucha'], charms: ['cellar'] },
  { id: 'sweet', name: 'Sweet stall', tags: ['sweet'] },
  { id: 'metal', name: 'Metalwork', tags: ['metal'] },
  { id: 'lone', name: 'One of everything', symbols: ['onion', 'lily', 'wallet', 'typewriter'], charms: ['spotlight'], spread: true },
  { id: 'red', name: 'Everything red', tags: ['red'] },
  { id: 'green', name: 'Everything green', tags: ['green'] },
  { id: 'spawn', name: 'Things that multiply', symbols: ['daisy', 'seedlings', 'postcard', 'daffodil', 'record', 'posy', 'driedapple'], charms: ['seedbox', 'bucket'] },
  { id: 'foglight', name: 'Lights in the fog', tags: ['light'], weather: 'fog' },
  { id: 'wind', name: 'Chimes in the wind', tags: ['metal'], symbols: ['chime', 'poppy', 'potato', 'quilt', 'ship'], weather: 'wind' },
  { id: 'sunproduce', name: 'Produce in the sun', tags: ['produce', 'sun'], weather: 'sun' },
  { id: 'sellout', name: 'Sell-outs', symbols: ['brownie', 'peony'], charms: ['queue'] },
  { id: 'weekly', name: 'Slow burners', symbols: ['pumpkin', 'gingerbread', 'wreath', 'watch'], charms: ['calendar'] }
];

const DATA = { FAMILIES, WEATHER, WEATHER_ORDER, LOCATIONS, SYMBOLS, CHARMS, EVENTS, ARCHETYPES, GRID: { cols: 5, rows: 3 }, WEEKS: 12 };
if (typeof module !== 'undefined' && module.exports) module.exports = DATA; else root.OS_DATA = DATA;
})(typeof window !== 'undefined' ? window : globalThis);
