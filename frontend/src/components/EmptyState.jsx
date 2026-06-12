import React from 'react'
import { useGraphStore } from '../store/graphStore'

const EXAMPLES = [
  'https://github.com/tiangolo/fastapi',
  'https://github.com/vitejs/vite',
  'https://github.com/vuejs/vue',
]

export default function EmptyState() {
  // We can't directly set path from here — so we'll use a custom event
  function fillInput(path) {
    // Find the input and fill it
    const input = document.querySelector('.toolbar__path-input')
    if (input) {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      nativeSetter.call(input, path)
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.focus()
    }
  }

  return (
    <div className="empty-state">
      <div className="empty-state__grid" />
      <div className="empty-state__content">
        <div className="empty-state__icon">⬡</div>
        <h1 className="empty-state__title">Visualize any codebase</h1>
        <p className="empty-state__sub">
          Enter a GitHub URL or local directory path above to map out file structure and dependencies.
        </p>
        <div className="empty-state__examples">
          <div className="empty-state__example-label">Try an example</div>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              className="empty-state__example"
              onClick={() => fillInput(ex)}
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
