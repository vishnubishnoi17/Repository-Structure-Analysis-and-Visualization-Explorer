import React, { useCallback, useEffect, useMemo } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useGraphStore } from '../store/graphStore'
import FileNode from './FileNode'

const nodeTypes = { fileNode: FileNode }

const defaultEdgeOptions = {
  animated: false,
  style: { stroke: '#38506b', strokeWidth: 1.4, strokeOpacity: 0.32 },
}

const GROUP_COLORS = {
  python: '#5d8cff',
  javascript: '#f2a93b',
  typescript: '#18b8d7',
  style: '#ec7db8',
  markup: '#41c28a',
  config: '#7d8ca4',
  c_cpp: '#f26d6d',
  go: '#45c6e8',
  rust: '#ff8f4d',
  java: '#ff6ca8',
  docs: '#7f8b9b',
  other: '#59708a',
}

function getVisibleEdges(edges, nodeCount) {
  if (nodeCount > 160) {
    return edges.filter((_, index) => index % 2 === 0)
  }
  return edges
}

export default function Canvas() {
  const { nodes: storeNodes, edges: storeEdges, selectNode } = useGraphStore()
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  useEffect(() => {
    setNodes(storeNodes)
  }, [setNodes, storeNodes])

  const visibleEdges = useMemo(
    () => getVisibleEdges(storeEdges, storeNodes.length),
    [storeEdges, storeNodes.length]
  )

  useEffect(() => {
    setEdges(visibleEdges)
  }, [setEdges, visibleEdges])

  const onNodeClick = useCallback((_, node) => {
    selectNode(node)
  }, [selectNode])

  return (
    <div className="canvas-wrapper">
      <div className="canvas-wrapper__hint">
        <span>Drag to explore</span>
        <span>Click a node for metrics and Gemini</span>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.18, duration: 700 }}
        minZoom={0.2}
        maxZoom={2}
        defaultEdgeOptions={defaultEdgeOptions}
        elevateNodesOnSelect
        nodesDraggable
        panOnDrag
        panOnScroll={false}
        zoomOnScroll
        deleteKeyCode={null}
        selectionOnDrag={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          color="#213145"
          gap={24}
          size={1.2}
        />
        <Controls showInteractive={false} position="bottom-left" />
        <MiniMap
          nodeColor={(n) => GROUP_COLORS[n.data?.group] ?? '#59708a'}
          maskColor="#061018b8"
          style={{
            background: 'rgba(7, 16, 24, 0.92)',
            border: '1px solid rgba(114, 145, 178, 0.22)',
            borderRadius: 16,
          }}
          nodeStrokeWidth={2}
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  )
}
