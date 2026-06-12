import { create } from 'zustand'

export const useGraphStore = create((set, get) => ({
  nodes: [],
  edges: [],
  basePath: null,
  repoLabel: null,
  sourceType: null,
  sessionId: null,
  isLoading: false,
  scanError: null,
  selectedNode: null,
  aiSummary: null,
  aiLoading: false,
  aiError: null,

  setGraph: (nodes, edges, metadata = {}) =>
    set({
      nodes: nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          sessionId: node.data.session_id ?? metadata.sessionId ?? null,
          sourceType: node.data.source_type ?? metadata.sourceType ?? 'local',
        },
      })),
      edges,
      basePath: metadata.basePath ?? null,
      repoLabel: metadata.repoLabel ?? null,
      sourceType: metadata.sourceType ?? null,
      sessionId: metadata.sessionId ?? null,
      scanError: null,
      selectedNode: null,
      aiSummary: null,
      aiError: null,
    }),

  setLoading: (v) => set({ isLoading: v }),
  setScanError: (e) => set({ scanError: e }),

  selectNode: (node) =>
    set({ selectedNode: node, aiSummary: null, aiError: null }),

  clearSelection: () =>
    set({ selectedNode: null, aiSummary: null, aiError: null }),

  setAiSummary: (summary) => set({ aiSummary: summary, aiLoading: false }),
  setAiLoading: (v) => set({ aiLoading: v }),
  setAiError: (e) => set({ aiError: e, aiLoading: false }),
}))
