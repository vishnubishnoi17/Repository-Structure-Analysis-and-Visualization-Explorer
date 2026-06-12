import React, { useCallback, useEffect, useRef } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  useReactFlow,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useGraphStore } from '../store/graphStore'
import FileNode from './FileNode'

const nodeTypes = { fileNode: FileNode }

const defaultEdgeOptions = {
  animated: false,
  style: { stroke: '#3a4460', strokeWidth: 1.5 },
}

const GROUP_COLORS = {
  python: '#3b82f6', javascript: '#f59e0b', typescript: '#06b6d4',
  style: '#a78bfa', markup: '#34d399', config: '#6b7280',
  c_cpp: '#ef4444', go: '#00ADD8', rust: '#f97316',
  java: '#ec4899', docs: '#64748b', other: '#475569',
}

// Performance: only render edges when zoomed in enough
function useAdaptiveEdges(edges, zoom) {
  if (zoom < 0.3 && edges.length > 100) return []
  return edges
}

export default function Canvas() {
  const { nodes: storeNodes, edges: storeEdges, selectNode } = useGraphStore()
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  useEffect(() => {
    setNodes(storeNodes)
    setEdges(storeEdges)
  }, [storeNodes, storeEdges])

  const onNodeClick = useCallback((_, node) => {
    selectNode(node)
  }, [selectNode])

  const onPaneClick = useCallback(() => {
    // Don't clear selection on pane click — user may want to keep panel open
  }, [])

  return (
    <div className="canvas-wrapper">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        minZoom={0.03}
        maxZoom={2.5}
        defaultEdgeOptions={defaultEdgeOptions}
        elevateNodesOnSelect
        nodesDraggable
        panOnScroll={false}
        zoomOnScroll
        deleteKeyCode={null}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          color="#1e2330"
          gap={28}
          size={1}
        />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(n) => GROUP_COLORS[n.data?.group] ?? '#475569'}
          maskColor="#0a0b0f99"
          style={{ background: '#0f1117', border: '1px solid #252c3e', borderRadius: 10 }}
          nodeStrokeWidth={2}
          nodeBorderRadius={2}
        />
      </ReactFlow>
    </div>
  )
}
