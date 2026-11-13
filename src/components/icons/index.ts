import type { Component } from 'vue'
import {
  Ambulance, Anchor, Apple, Beer, Car, Caravan, Drill, Flag, Flashlight, Forklift, Guitar, Hammer, Megaphone, Moon, Pencil, Plane, Rocket, Sailboat, Telescope, ThumbsUp, Tractor, Truck, ArrowLeftRight, Bell, Bike, Bird, Book, Brain, Calculator, Camera, Cat, CircleDot, Clock, Coffee,
  Feather, Fish, Flame, FlipHorizontal2, FlipVertical2, Origami, Rabbit, Rat, Shrimp, Snail, Squirrel, Turtle, Worm, Flower2, Footprints, Glasses, Heart, Key, Lamp, Mail, Paintbrush, Palette, Phone, Quote,
  Scissors, Search, Shapes, ShoppingCart, Star, Sun, Umbrella, Undo2, Utensils,
} from 'lucide-vue-next'
import HatIcon from './HatIcon.vue'

/** Nur die Icons, die Inhalte und Übungen per Namen verwenden (hält das Paket klein). */
const ICONS: Record<string, Component> = {
  Ambulance, Anchor, Apple, Beer, Car, Caravan, Drill, Flag, Flashlight, Forklift, Guitar, Hammer, Megaphone, Moon, Pencil, Plane, Rocket, Sailboat, Telescope, ThumbsUp, Tractor, Truck, ArrowLeftRight, Bell, Bike, Bird, Book, Brain, Calculator, Camera, Cat, CircleDot, Clock, Coffee,
  Feather, Fish, Flame, FlipHorizontal2, FlipVertical2, Origami, Rabbit, Rat, Shrimp, Snail, Squirrel, Turtle, Worm, Flower2, Footprints, Glasses, Heart, Key, Lamp, Mail, Paintbrush, Palette, Phone, Quote,
  Scissors, Search, Shapes, ShoppingCart, Star, Sun, Umbrella, Undo2, Utensils, TopHat: HatIcon,
}

export function iconByName(name?: string): Component | undefined {
  return name ? ICONS[name] : undefined
}

export const PROFILE_ICONS: Record<string, Component> = {
  flower: Flower2, sun: Sun, bird: Bird, cat: Cat, anchor: Anchor, coffee: Coffee,
}
