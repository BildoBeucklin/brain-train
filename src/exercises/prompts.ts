import type { Component } from 'vue'
import type { ExerciseId } from '@/db/database'
import Stroop from './stroop/Prompt.vue'
import Mirror from './mirror/Prompt.vue'
import Shopping from './shopping/Prompt.vue'
import UpsideDown from './upside-down/Prompt.vue'
import Reverse from './reverse/Prompt.vue'
import Proverbs from './proverbs/Prompt.vue'
import OddOneOut from './odd-one-out/Prompt.vue'
import Opposites from './opposites/Prompt.vue'
import WordFinding from './word-finding/Prompt.vue'
import Memory from './memory/Prompt.vue'
import MathPrompt from './math/Prompt.vue'

/** Darstellung je Übung (Props: task, phase). Getrennt von der Registry, damit die Engine ohne Vue testbar bleibt. */
export const prompts: Record<ExerciseId, Component> = {
  stroop: Stroop, upsideDown: UpsideDown, reverse: Reverse, proverbs: Proverbs, oddOneOut: OddOneOut,
  opposites: Opposites, wordFinding: WordFinding, memory: Memory, math: MathPrompt, mirror: Mirror, shopping: Shopping,
}
