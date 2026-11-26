import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AnswerButton from '@/components/training/AnswerButton.vue'
import { resetTap, TAP_DEBOUNCE_MS } from '@/composables/useTap'

describe('AnswerButton', () => {
  beforeEach(() => resetTap())

  it('Richtig: Häkchen + Text „Richtig!“ (nicht nur Farbe)', () => {
    const w = mount(AnswerButton, { props: { label: 'BROT', state: 'correct' } })
    expect(w.text()).toContain('Richtig!')
    expect(w.find('svg').exists()).toBe(true)
    expect(w.attributes('disabled')).toBeDefined()
  })

  it('Lösung: „Das ist die richtige Antwort“', () => {
    const w = mount(AnswerButton, { props: { label: 'Hammer', state: 'solution' } })
    expect(w.text()).toContain('Das ist die richtige Antwort')
  })

  it('Ausgegraut ist nicht klickbar und ohne Kreuz oder Warnsymbol', async () => {
    const w = mount(AnswerButton, { props: { label: 'BOOT', state: 'eliminated' } })
    await w.trigger('click')
    expect(w.emitted('press')).toBeUndefined()
    expect(w.find('svg').exists()).toBe(false)
  })

  it('Mehrfachauswahl zeigt den Zustand über aria-pressed', () => {
    const w = mount(AnswerButton, { props: { label: 'Hut', state: 'selected', multi: true } })
    expect(w.attributes('aria-pressed')).toBe('true')
  })

  it('entprellt Doppelklicks innerhalb von 400 ms', async () => {
    const now = vi.spyOn(performance, 'now')
    const w = mount(AnswerButton, { props: { label: 'ROT', state: 'default' } })
    now.mockReturnValue(1000); await w.trigger('click')
    now.mockReturnValue(1000 + TAP_DEBOUNCE_MS - 1); await w.trigger('click')
    expect(w.emitted('press')).toHaveLength(1)
    now.mockReturnValue(1000 + TAP_DEBOUNCE_MS); await w.trigger('click')
    expect(w.emitted('press')).toHaveLength(2)
    now.mockRestore()
  })
})
