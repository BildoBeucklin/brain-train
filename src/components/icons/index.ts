import type { Component } from 'vue'
import {
  Anchor, Apple, ArrowLeftRight, Bell, Bike, Bird, Book, Brain, Calculator, Camera, Cat, CircleDot, Clock, Coffee,
  Flame, FlipVertical2, Flower2, Footprints, Glasses, Heart, Key, Lamp, Mail, Paintbrush, Palette, Phone, Quote,
  Scissors, Search, Shapes, Star, Sun, Umbrella, Undo2, Utensils,
} from 'lucide-vue-next'
import HatIcon from './HatIcon.vue'

/** Nur die Icons, die Inhalte und Übungen per Namen verwenden (hält das Paket klein). */
const ICONS: Record<string, Component> = {
  Anchor, Apple, ArrowLeftRight, Bell, Bike, Bird, Book, Brain, Calculator, Camera, Cat, CircleDot, Clock, Coffee,
  Flame, FlipVertical2, Flower2, Footprints, Glasses, Heart, Key, Lamp, Mail, Paintbrush, Palette, Phone, Quote,
  Scissors, Search, Shapes, Star, Sun, Umbrella, Undo2, Utensils, TopHat: HatIcon,
}

export function iconByName(name?: string): Component | undefined {
  return name ? ICONS[name] : undefined
}

export const PROFILE_ICONS: Record<string, Component> = {
  flower: Flower2, sun: Sun, bird: Bird, cat: Cat, anchor: Anchor, coffee: Coffee,
}
