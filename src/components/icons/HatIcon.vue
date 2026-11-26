<script setup lang="ts">
// Hut im Lucide-Strichstil (Lucide hat kein passendes Icon).
withDefaults(defineProps<{ size?: number | string; strokeWidth?: number | string }>(), { size: 24, strokeWidth: 2 })
</script>

<template>
  <svg xmlns="http://www.w3.org/2000/svg" :width="size" :height="size" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M2 17c0 1.7 4.5 3 10 3s10-1.3 10-3c0-1-1.5-1.9-4-2.4" />
    <path d="M6 14.6c-2.5.5-4 1.4-4 2.4" />
    <path d="M6 15V8.5C6 6.6 8.7 5 12 5s6 1.6 6 3.5V15c0 1.1-2.7 2-6 2s-6-.9-6-2Z" />
    <path d="M6 12.5c0 1.1 2.7 2 6 2s6-.9 6-2" />
  </svg>
</template>
