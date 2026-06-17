'use client'
import { useEffect, useRef } from 'react'
import * as Blockly from 'blockly'
import { javascriptGenerator } from 'blockly/javascript'
import * as Es from 'blockly/msg/es'
import { TOOLBOX } from '@/lib/engine/blocks/toolbox'

Blockly.setLocale(Es as unknown as Record<string, string>)

// El bloque "imprimir" de Blockly genera window.alert; lo redefinimos a print().
javascriptGenerator.forBlock['text_print'] = function (block, generator) {
  const msg = generator.valueToCode(block, 'TEXT', 0) || "''"
  return `print(${msg});\n`
}

export function BlocklyEditor({ onCodeChange }: { onCodeChange: (code: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const workspace = Blockly.inject(ref.current, { toolbox: TOOLBOX as unknown as Blockly.utils.toolbox.ToolboxDefinition })
    const update = () => onCodeChange(javascriptGenerator.workspaceToCode(workspace))
    workspace.addChangeListener(update)
    return () => workspace.dispose()
  }, [onCodeChange])

  return <div ref={ref} style={{ height: 360, width: '100%' }} />
}
