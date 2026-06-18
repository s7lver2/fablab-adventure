'use client'
import { useEffect, useRef } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, basicSetup } from 'codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language'
import { tags } from '@lezer/highlight'

// Catppuccin Mocha-based dark theme (matches existing .code-editor background)
const editorTheme = EditorView.theme(
  {
    '&': { height: '100%', backgroundColor: '#1e1e2e', color: '#cdd6f4' },
    '.cm-content': {
      fontFamily: "'Fira Code','Cascadia Code','Courier New',monospace",
      fontSize: '0.88rem',
      lineHeight: '1.6',
      caretColor: '#cdd6f4',
      padding: '0.75rem 0',
    },
    '.cm-line': { padding: '0 0.75rem' },
    '.cm-focused': { outline: 'none' },
    '.cm-scroller': { overflow: 'auto', height: '100%' },
    '.cm-gutters': {
      backgroundColor: '#181825',
      color: '#585b70',
      border: 'none',
      borderRight: '1px solid #313244',
    },
    '.cm-activeLineGutter': { backgroundColor: 'rgba(99,102,241,0.1)' },
    '.cm-activeLine': { backgroundColor: 'rgba(99,102,241,0.08)' },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: '#3d4059 !important',
    },
    '.cm-cursor': { borderLeftColor: '#cdd6f4' },
    '.cm-matchingBracket': { backgroundColor: 'rgba(99,102,241,0.3)', color: 'inherit !important' },
    '.cm-tooltip': {
      backgroundColor: '#24273a',
      border: '1px solid #45475a',
      borderRadius: '6px',
    },
    '.cm-tooltip-autocomplete': { backgroundColor: '#24273a' },
    '.cm-tooltip.cm-tooltip-autocomplete > ul': {
      fontFamily: "'Fira Code',monospace",
      fontSize: '0.82rem',
    },
    '.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]': {
      backgroundColor: '#313244',
      color: '#cdd6f4',
    },
    '.cm-completionIcon': { paddingRight: '0.4em' },
  },
  { dark: true },
)

const darkHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: '#cba6f7' },
  { tag: tags.operator, color: '#89dceb' },
  { tag: [tags.string, tags.special(tags.string)], color: '#a6e3a1' },
  { tag: tags.number, color: '#fab387' },
  { tag: [tags.bool, tags.null], color: '#fab387' },
  { tag: tags.comment, color: '#6c7086', fontStyle: 'italic' },
  { tag: tags.function(tags.variableName), color: '#89b4fa' },
  { tag: tags.definition(tags.variableName), color: '#89dceb' },
  { tag: tags.variableName, color: '#cdd6f4' },
  { tag: tags.propertyName, color: '#89b4fa' },
  { tag: [tags.typeName, tags.className], color: '#f38ba8' },
  { tag: tags.punctuation, color: '#cdd6f4' },
  { tag: tags.bracket, color: '#cdd6f4' },
])

interface Props {
  value: string
  onChange: (code: string) => void
  language: 'js' | 'python'
}

export function CodeEditor({ value, onChange, language }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return

    const langExt = language === 'python' ? python() : javascript()

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          langExt,
          editorTheme,
          syntaxHighlighting(darkHighlight),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) onChange(view.state.doc.toString())
          }),
        ],
      }),
      parent: el,
    })

    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
    }
    // value is only used as initial doc; language change forces a full remount via key prop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, onChange])

  return <div ref={wrapRef} style={{ flex: 1, minHeight: 0, overflow: 'hidden' }} />
}
