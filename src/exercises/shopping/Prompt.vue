<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, ClipboardList, ShoppingBasket, X } from 'lucide-vue-next'
import { useTrainingStore } from '@/stores/training'
import { euro } from '../math/generator'
import type { Task } from '../types'
import { parseShopId, shopId, type ShoppingData } from './generator'
import { amount, productByKey } from './products'
import { productImage } from './images'

const props = defineProps<{ task: Task<ShoppingData>; phase: string }>()
const training = useTrainingStore()

const shop = computed(() => !!props.task.data.shelf)
const printing = computed(() => props.phase === 'print')
const done = computed(() => props.phase === 'correct' || props.phase === 'solution')
const listOpen = ref(false)
const picking = ref<string | null>(null) // Ware, deren Anzahl gerade gewählt wird

watch(() => props.task, () => { listOpen.value = false; picking.value = null })
watch(done, (d) => { if (d) { listOpen.value = true; picking.value = null } })

/** Im Korb: Ware → Anzahl (aus der Auswahl im Trainings-Store). */
const basket = computed(() => {
  const m = new Map<string, number>()
  if (printing.value) return m
  for (const id of training.selected) { const { key, count } = parseShopId(id); m.set(key, count) }
  return m
})
const name = (key: string) => productByKey(key)?.name ?? key
const pickProduct = computed(() => (picking.value ? productByKey(picking.value) : undefined))
const counts = computed(() => Array.from({ length: props.task.data.maxCount ?? 0 }, (_, i) => i + 1))

function openProduct(key: string) {
  if (done.value || printing.value) return
  picking.value = picking.value === key ? null : key
}

/** Anzahl festlegen; 0 nimmt die Ware wieder aus dem Korb. */
function setCount(key: string, n: number) {
  const old = basket.value.get(key)
  if (old) training.answer(shopId(key, old))
  if (n && n !== old) training.answer(shopId(key, n))
  picking.value = null
}

const blocked = (key: string, n: number) => training.eliminated.includes(shopId(key, n))
const lineOk = (key: string, n: number) => props.task.correctIds.includes(shopId(key, n))
</script>

<template>
  <!-- Laden: Regal oben, Korb, Einkaufszettel zum Aufklappen -->
  <div v-if="shop" class="shop">
    <div class="shelf" :style="{ '--cols': Math.min(task.data.shelf!.length, printing ? 3 : 5) }" role="group" aria-label="Regal">
      <button
        v-for="key in task.data.shelf"
        :key="key"
        type="button"
        class="product"
        :class="{ chosen: basket.has(key), active: picking === key }"
        :disabled="done || printing"
        :data-testid="`product-${key}`"
        @click="openProduct(key)"
      >
        <img :src="productImage(key)" alt="" />
        <span class="pname">{{ name(key) }}</span>
        <span v-if="basket.has(key)" class="badge">{{ basket.get(key) }}</span>
        <span v-if="printing" class="write">Anzahl: ____</span>
      </button>
    </div>

    <div v-if="pickProduct" class="picker" role="dialog" :aria-label="`Wie viele ${pickProduct.plural}?`">
      <p class="ask">Wie viele {{ pickProduct.plural }}?</p>
      <div class="counts">
        <button
          v-for="n in counts"
          :key="n"
          type="button"
          class="count"
          :class="{ current: basket.get(pickProduct.key) === n }"
          :disabled="blocked(pickProduct.key, n)"
          :data-testid="`count-${n}`"
          @click="setCount(pickProduct.key, n)"
        >{{ n }}</button>
        <button v-if="basket.has(pickProduct.key)" type="button" class="count remove" data-testid="count-0" @click="setCount(pickProduct.key, 0)">
          <X :size="28" aria-hidden="true" /> Keine
        </button>
      </div>
    </div>

    <div v-if="!printing" class="basket" aria-label="Korb">
      <ShoppingBasket :size="32" aria-hidden="true" />
      <span v-if="!basket.size" class="empty-basket">Der Korb ist noch leer.</span>
      <span v-for="[key, n] in basket" :key="key" class="in-basket" :class="{ ok: done && lineOk(key, n), wrong: done && !lineOk(key, n) }">
        {{ amount(productByKey(key)!, n) }}
      </span>
    </div>

    <button v-if="!printing" type="button" class="list-toggle" :aria-expanded="listOpen" data-testid="toggle-list" @click="listOpen = !listOpen">
      <ClipboardList :size="32" aria-hidden="true" />
      {{ listOpen ? 'Einkaufszettel zuklappen' : 'Einkaufszettel ansehen' }}
    </button>
    <div v-if="listOpen || printing" class="note" aria-label="Einkaufszettel">
      <p class="title">Einkaufszettel</p>
      <ul>
        <li v-for="l in task.data.list" :key="l.key">
          <Check v-if="done && basket.get(l.key) === l.count" :size="28" class="tick" aria-hidden="true" />
          {{ l.label }}
        </li>
      </ul>
    </div>
  </div>

  <!-- Rechnen: Zettel mit Preisen -->
  <div v-else class="note" aria-label="Einkaufszettel">
    <p class="title">Einkaufszettel</p>
    <ul>
      <li v-for="l in task.data.list" :key="l.key">
        <img :src="productImage(l.key)" alt="" />
        <span>{{ l.label }}</span>
        <span v-if="l.cents !== undefined" class="price">je {{ euro(l.cents) }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.shop { display: flex; flex-direction: column; align-items: center; gap: var(--space-2); width: 100%; max-height: 100%; overflow-y: auto; }
.shelf { display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); gap: var(--space-2); width: min(100%, 64rem); }
.product {
  position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: var(--space-1); min-height: 120px;
  border: 3px solid var(--color-control-border); border-radius: var(--radius);
  background: var(--color-surface); color: var(--color-text);
  font-size: var(--text-help); font-weight: 700; cursor: pointer;
}
.product:disabled { cursor: default; }
.product img { width: 72px; height: 72px; object-fit: contain; }
.product.chosen { border-color: var(--color-accent); background: var(--color-accent-soft); }
.product.active { border-width: 5px; border-color: var(--color-accent); }
.badge {
  position: absolute; top: 6px; right: 6px; min-width: 40px; height: 40px; border-radius: 20px;
  display: grid; place-items: center; background: var(--color-accent); color: var(--color-on-accent); font-size: 1.4rem;
}
.write { font-weight: 400; }
.picker { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; justify-content: center; padding: var(--space-2); border-radius: var(--radius); background: var(--color-accent-soft); }
.ask { margin: 0; font-size: var(--text-answer); font-weight: 700; }
.counts { display: flex; gap: var(--space-1); flex-wrap: wrap; }
.count {
  min-width: 80px; min-height: 80px; display: inline-flex; align-items: center; justify-content: center; gap: 4px;
  border: 3px solid var(--color-control-border); border-radius: var(--radius);
  background: var(--color-surface); color: var(--color-text); font-size: var(--text-answer); font-weight: 700; cursor: pointer;
}
.count.current { border-color: var(--color-accent); border-width: 5px; }
.count:disabled { opacity: 0.35; text-decoration: line-through; cursor: default; }
.count.remove { padding: 0 var(--space-2); font-size: var(--text-help); }
.basket { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; font-size: var(--text-help); }
.basket :deep(svg) { color: var(--color-accent-text); }
.empty-basket { color: var(--color-text-muted); }
.in-basket { padding: 4px 12px; border-radius: 999px; background: var(--color-surface); border: 2px solid var(--color-line); font-weight: 700; }
.in-basket.ok { border-color: var(--color-success-border); background: var(--color-success-bg); }
.in-basket.wrong { text-decoration: line-through; color: var(--color-text-muted); }
.list-toggle {
  display: inline-flex; align-items: center; gap: var(--space-1); min-height: 64px; padding: 0 var(--space-3);
  border: 3px solid var(--color-control-border); border-radius: var(--radius);
  background: #fffbe6; color: #222; font-size: var(--text-help); font-weight: 700; cursor: pointer;
}

.note {
  min-width: min(100%, 26rem);
  padding: var(--space-3) var(--space-5);
  background: #fffbe6;
  color: #222;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 0.15);
}
.title { margin: 0 0 var(--space-1); font-weight: 700; font-size: var(--text-help); text-decoration: underline; }
ul { list-style: none; margin: 0; padding: 0; }
li {
  display: flex; align-items: center; gap: var(--space-2); min-height: 3rem;
  border-bottom: 2px solid #c9d8ef;
  font-size: clamp(1.5rem, 4vh, 2.25rem);
  font-family: 'Segoe Print', 'Comic Sans MS', cursive;
}
li img { width: 2.5rem; height: 2.5rem; object-fit: contain; }
.tick { color: #2a7a33; }
.price { margin-left: auto; padding-left: var(--space-3); font-size: 0.8em; color: #555; }
</style>
