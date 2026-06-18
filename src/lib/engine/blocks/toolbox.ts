export interface ToolboxCategory {
  kind: 'category'
  name: string
  categorystyle?: string
  contents: { kind: 'block'; type: string }[]
}

export interface Toolbox {
  kind: 'categoryToolbox'
  contents: ToolboxCategory[]
}

/** Toolbox mínimo de Hito B, en español, apto para 7-12 años. */
export const TOOLBOX: Toolbox = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: 'Imprimir',
      categorystyle: 'text_category',
      contents: [{ kind: 'block', type: 'text_print' }, { kind: 'block', type: 'text' }],
    },
    {
      kind: 'category',
      name: 'Bucles',
      categorystyle: 'loop_category',
      contents: [{ kind: 'block', type: 'controls_repeat_ext' }, { kind: 'block', type: 'controls_for' }],
    },
    {
      kind: 'category',
      name: 'Variables',
      categorystyle: 'variable_category',
      contents: [{ kind: 'block', type: 'variables_get' }, { kind: 'block', type: 'variables_set' }],
    },
    {
      kind: 'category',
      name: 'Matemáticas',
      categorystyle: 'math_category',
      contents: [{ kind: 'block', type: 'math_number' }, { kind: 'block', type: 'math_arithmetic' }],
    },
  ],
}
