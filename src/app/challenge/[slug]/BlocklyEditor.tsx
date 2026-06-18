'use client'
import { useEffect, useRef } from 'react'
import * as Blockly from 'blockly'
import { javascriptGenerator, Order } from 'blockly/javascript'
import * as Es from 'blockly/msg/es'
import { TOOLBOX } from '@/lib/engine/blocks/toolbox'

Blockly.setLocale(Es as unknown as Record<string, string>)

// El bloque "imprimir" de Blockly genera window.alert; lo redefinimos a print().
javascriptGenerator.forBlock['text_print'] = function (block, generator) {
  const msg = generator.valueToCode(block, 'TEXT', Order.NONE) || "''"
  return `print(${msg});\n`
}

// Bloque personalizado "dato [campo]": lee un valor de los datos de entrada (input).
// Permite resolver retos con entradas (input.n, input.a, …) desde el modo bloques.
Blockly.defineBlocksWithJsonArray([
  {
    type: 'input_get',
    message0: 'dato %1',
    args0: [{ type: 'field_input', name: 'KEY', text: 'n' }],
    output: null,
    colour: '#ec4899',
    tooltip: 'Lee un valor de los datos de entrada. Escribe el nombre del dato, p. ej. n, a o hasta.',
    helpUrl: '',
  },
])
javascriptGenerator.forBlock['input_get'] = function (block) {
  const key = block.getFieldValue('KEY')
  return [`input[${JSON.stringify(key)}]`, Order.MEMBER]
}

export function BlocklyEditor({ onCodeChange }: { onCodeChange: (code: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    // Define custom Fab Lab theme with warm palette and Scratch-style colors
    const theme = Blockly.Theme.defineTheme('fablab', {
      name: 'fablab',
      base: Blockly.Themes.Classic,
      blockStyles: {
        text_blocks: { colourPrimary: '#7c3aed', colourSecondary: '#a78bfa', colourTertiary: '#5b27b0' },
        loop_blocks: { colourPrimary: '#f59e0b', colourSecondary: '#fbbf24', colourTertiary: '#c97e08' },
        variable_blocks: { colourPrimary: '#10b981', colourSecondary: '#34d399', colourTertiary: '#0a8a61' },
        math_blocks: { colourPrimary: '#0ea5e9', colourSecondary: '#7dd3fc', colourTertiary: '#0369a1' },
        logic_blocks: { colourPrimary: '#ef4444', colourSecondary: '#fca5a5', colourTertiary: '#b91c1c' },
        procedure_blocks: { colourPrimary: '#d946ef', colourSecondary: '#f0abfc', colourTertiary: '#a21caf' },
      },
      categoryStyles: {
        text_category: { colour: '#7c3aed' },
        loop_category: { colour: '#f59e0b' },
        variable_category: { colour: '#10b981' },
        math_category: { colour: '#0ea5e9' },
        logic_category: { colour: '#ef4444' },
        procedure_category: { colour: '#d946ef' },
      },
      componentStyles: {
        workspaceBackgroundColour: '#fbf8f2',
        toolboxBackgroundColour: '#f3eee6',
        flyoutBackgroundColour: '#faf6ef',
      },
      fontStyle: { family: 'inherit', size: 13, weight: '500' },
    })

    const workspace = Blockly.inject(ref.current, {
      toolbox: TOOLBOX as unknown as Blockly.utils.toolbox.ToolboxDefinition,
      renderer: 'zelos',
      theme,
      grid: { spacing: 22, length: 3, colour: '#ece6db', snap: true },
      zoom: { controls: true, wheel: true, startScale: 1 },
      trashcan: true,
    })

    const update = () => onCodeChange(javascriptGenerator.workspaceToCode(workspace))
    workspace.addChangeListener(update)
    return () => workspace.dispose()
  }, [onCodeChange])

  return <div ref={ref} className="blockly-wrap" style={{ height: 360, width: '100%' }} />
}
