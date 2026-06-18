export interface ToolboxCategory {
  kind: 'category'
  name: string
  categorystyle?: string
  colour?: string
  /** Para categorías dinámicas de Blockly (p. ej. 'PROCEDURE' rellena las funciones). */
  custom?: string
  contents?: { kind: 'block'; type: string }[]
}

export interface Toolbox {
  kind: 'categoryToolbox'
  contents: ToolboxCategory[]
}

/** Toolbox en español, apto para 7-12 años. Cubre fundamentos, condicionales y funciones. */
export const TOOLBOX: Toolbox = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: 'Imprimir',
      categorystyle: 'text_category',
      contents: [
        { kind: 'block', type: 'text_print' },
        { kind: 'block', type: 'text' },
        { kind: 'block', type: 'text_join' },
      ],
    },
    {
      kind: 'category',
      name: 'Datos',
      colour: '#ec4899',
      contents: [{ kind: 'block', type: 'input_get' }],
    },
    {
      kind: 'category',
      name: 'Matemáticas',
      categorystyle: 'math_category',
      contents: [
        { kind: 'block', type: 'math_number' },
        { kind: 'block', type: 'math_arithmetic' },
        { kind: 'block', type: 'math_modulo' },
      ],
    },
    {
      kind: 'category',
      name: 'Lógica',
      categorystyle: 'logic_category',
      contents: [
        { kind: 'block', type: 'controls_if' },
        { kind: 'block', type: 'logic_compare' },
        { kind: 'block', type: 'logic_operation' },
        { kind: 'block', type: 'logic_boolean' },
      ],
    },
    {
      kind: 'category',
      name: 'Bucles',
      categorystyle: 'loop_category',
      contents: [
        { kind: 'block', type: 'controls_repeat_ext' },
        { kind: 'block', type: 'controls_for' },
      ],
    },
    {
      kind: 'category',
      name: 'Variables',
      categorystyle: 'variable_category',
      contents: [
        { kind: 'block', type: 'variables_get' },
        { kind: 'block', type: 'variables_set' },
      ],
    },
    {
      kind: 'category',
      name: 'Funciones',
      categorystyle: 'procedure_category',
      custom: 'PROCEDURE',
    },
  ],
}
