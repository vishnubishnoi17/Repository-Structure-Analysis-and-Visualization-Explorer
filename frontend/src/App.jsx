import React from 'react'
import Canvas from './components/Canvas'
import SidePanel from './components/SidePanel'
import Toolbar from './components/Toolbar'
import EmptyState from './components/EmptyState'
import { useGraphStore } from './store/graphStore'
import './styles/globals.css'

export default function App() {
  const { selectedNode, nodes, edges, repoLabel, sourceType } = useGraphStore()
  const visible = nodes.length > 0

  const sourceCopy = sourceType === 'github'
    ? 'GitHub snapshot'
    : sourceType === 'upload'
    ? 'Uploaded project'
    : 'Local workspace'

  return (
    <div className="app-layout">
      <Toolbar />
      <div className="app-body">
        {visible ? (
          <div className="workspace-shell">
            <div className="workspace-shell__intro">
              <div>
                <p className="workspace-shell__eyebrow">{sourceCopy}</p>
                <h1 className="workspace-shell__title">{repoLabel || 'Repository graph'}</h1>
              </div>
              <div className="workspace-shell__stats">
                <div className="workspace-shell__stat">
                  <span className="workspace-shell__stat-value">{nodes.length}</span>
                  <span className="workspace-shell__stat-label">Files</span>
                </div>
                <div className="workspace-shell__stat">
                  <span className="workspace-shell__stat-value">{edges.length}</span>
                  <span className="workspace-shell__stat-label">Links</span>
                </div>
              </div>
            </div>
            <Canvas />
          </div>
        ) : (
          <EmptyState />
        )}
        {selectedNode && <SidePanel node={selectedNode} />}
      </div>
    </div>
  )
}
