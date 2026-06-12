import React from 'react'
import Canvas from './components/Canvas'
import SidePanel from './components/SidePanel'
import Toolbar from './components/Toolbar'
import EmptyState from './components/EmptyState'
import { useGraphStore } from './store/graphStore'
import './styles/globals.css'

export default function App() {
  const { selectedNode, nodes } = useGraphStore()

  return (
    <div className="app-layout">
      <Toolbar />
      <div className="app-body">
        {nodes.length === 0 ? (
          <EmptyState />
        ) : (
          <Canvas />
        )}
        {selectedNode && <SidePanel node={selectedNode} />}
      </div>
    </div>
  )
}
