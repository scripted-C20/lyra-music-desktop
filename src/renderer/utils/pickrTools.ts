import { throttle } from '@common/utils/common'
import Pickr from '@simonwep/pickr'
import '@simonwep/pickr/dist/themes/classic.min.css'

export interface PickrTools {
  pickr: Pickr | null
  create: (dom: HTMLElement, color: string, swatches: string[] | null, change: (color: string) => void, reset?: () => void, show?: () => void) => PickrTools
  destroy: () => void
  setColor: (color: string) => void
}

export const pickrTools: PickrTools = {
  pickr: null,
  create(dom, color, swatches, change, reset, show) {
    let pickr: Pickr | null = Pickr.create({
      el: dom,
      default: color,
      theme: 'classic', // or 'monolith', or 'nano'
      defaultRepresentation: 'RGBA',
      autoReposition: false,
      closeWithKey: '',
      appClass: 'color-picker',
      comparison: false,
      useAsButton: true,

      swatches,

      components: {

        // Main components
        preview: true,
        opacity: true,
        hue: true,

        // Input / output Options
        interaction: {
          hex: true,
          rgba: true,
          input: true,
          cancel: true,
          // save: true,
        },
      },

      i18n: {
        // Strings visible in the UI
        'ui:dialog': ' ',
        'btn:toggle': window.i18n.t('theme_edit_modal__pick_color'),
        'btn:swatch': ' ',
        'btn:last-color': window.i18n.t('theme_edit_modal__pick_last_color'),
        'btn:save': window.i18n.t('theme_edit_modal__pick_save'),
        'btn:cancel': window.i18n.t('theme_edit_modal__pick_cancel'),

        // Strings used for aria-labels
        'aria:btn:save': ' ',
        'aria:btn:cancel': ' ',
        'aria:input': ' ',
        'aria:palette': ' ',
        'aria:hue': '',
        'aria:opacity': ' ',
      },
    })
    let currentColor = color
    let previousColor = color
    const tools: PickrTools = {
      pickr,
      create: this.create,
      destroy() {
        if (!pickr) return
        pickr.destroyAndRemove()
        pickr = null
        tools.pickr = null
      },
      setColor(color) {
        currentColor = color
        pickr?.setColor(color)
      },
    }

    let swatchselectColor: any

    const throttleChange = throttle((color: any, source: string) => {
      if (source == 'swatch' && swatchselectColor !== color) return
      currentColor = color.toRGBA().toString()
      change(currentColor)
    })
    pickr.on('show', () => {
      previousColor = currentColor
      show?.()
    }).on('swatchselect', (color: any) => {
      swatchselectColor = color
    }).on('change', throttleChange).on('cancel', () => {
      currentColor = previousColor
      change(previousColor)
      reset?.()
    })

    return tools
  },
  destroy() {
    if (!this.pickr) return
    this.pickr.destroyAndRemove()
    this.pickr = null
  },
  setColor(color) {
    this.pickr?.setColor(color)
  },
}
