/** Waren im Laden. file: Bild in src/assets/Store; countable: sinnvoll in Stückzahl (2 Äpfel). */
export interface Product {
  key: string
  name: string // Einzahl
  plural: string
  cents: number // Stückpreis
  file: string
  countable: boolean
}

const p = (key: string, name: string, plural: string, cents: number, file: string, countable = true): Product =>
  ({ key, name, plural, cents, file, countable })

export const PRODUCTS: readonly Product[] = [
  p('apple', 'Apfel', 'Äpfel', 45, '9-apple-png-image.webp'),
  p('banana', 'Banane', 'Bananen', 30, '13-banana-png-image-bananas-picture-download.webp'),
  p('lemon', 'Zitrone', 'Zitronen', 50, '11-lemon-png-image.webp'),
  p('orange', 'Orange', 'Orangen', 60, '12-orange-png-image-download.webp'),
  p('carrot', 'Karotte', 'Karotten', 30, '1-carrot-png-image.webp'),
  p('broccoli', 'Brokkoli', 'Brokkoli', 149, '1-2-broccoli-picture.webp'),
  p('cauliflower', 'Blumenkohl', 'Blumenkohl', 199, '24867-7-cauliflower.webp'),
  p('cabbage', 'Kohlkopf', 'Kohlköpfe', 149, '6-cabbage-png-image.webp'),
  p('cucumber', 'Gurke', 'Gurken', 79, '23-green-cucumber-png-image.webp'),
  p('onion', 'Zwiebel', 'Zwiebeln', 20, '3-onion-png-image.webp'),
  p('pepper', 'Paprika', 'Paprika', 99, '3-pepper-png-image.webp'),
  p('tomato', 'Tomate', 'Tomaten', 40, '3-tomato-png-image-picture-download.webp'),
  p('potato', 'Kartoffel', 'Kartoffeln', 25, '7-potato-png-images-pictures-download.webp'),
  p('watermelon', 'Wassermelone', 'Wassermelonen', 399, '4-watermelon-png-image.webp'),
  p('grapes', 'Weintrauben', 'Weintrauben', 249, '15-green-grape-png-image.webp', false),
  p('bread', 'Brot', 'Brote', 279, '47-bread-png-image.webp'),
  p('sausage', 'Wurst', 'Würste', 249, '3-sausage-png-image.webp'),
  p('yogurt', 'Joghurt', 'Joghurts', 59, '41221-yogurt.webp'),
  p('ketchup', 'Ketchup', 'Ketchup', 199, '170987-sauce-red-free-download-png-hd.webp', false),
  p('oil', 'Sonnenblumenöl', 'Sonnenblumenöl', 229, '43988-sunflower-oil.webp', false),
  p('coffee', 'Kaffee', 'Kaffee', 599, '98572-coffee-jar.webp', false),
  p('sweets', 'Bonbons', 'Bonbons', 129, '38160-bonbone.webp', false),
  p('gummies', 'Gummibärchen', 'Gummibärchen', 149, '76425-jelly-candies.webp', false),
  p('flowers', 'Blumenstrauß', 'Blumensträuße', 799, '44684-bouquet-flowers.webp', false),
  p('book', 'Buch', 'Bücher', 999, '8-2-book-png-9.webp', false),
  p('cap', 'Mütze', 'Mützen', 1499, '8-baseball-cap-png-image.webp', false),
  p('partyhat', 'Partyhut', 'Partyhüte', 199, '5-2-birthday-hat-png-clipart.webp', false),
  p('pan', 'Pfanne', 'Pfannen', 1999, '5-2-cooking-pan-free-png-image.webp', false),
  p('cushion', 'Kissen', 'Kissen', 1299, '45254-9-cushion-image-free-transparent-image-hq.webp', false),
  p('iron', 'Bügeleisen', 'Bügeleisen', 2499, '38377-iron.webp', false),
  p('hairdryer', 'Föhn', 'Föhne', 1999, '122334-hair-dryer.webp', false),
  p('backpack', 'Rucksack', 'Rucksäcke', 2999, '4-sport-backpack-png-image.webp', false),
]

export const productByKey = (key: string) => PRODUCTS.find((x) => x.key === key)

/** „2 Äpfel“, „1 Brot“ */
export const amount = (pr: Product, n: number) => `${n} ${n === 1 ? pr.name : pr.plural}`
