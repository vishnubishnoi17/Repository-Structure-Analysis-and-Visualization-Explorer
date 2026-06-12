import { create } from 'zustand'

export const useGraphStore = create((set, get) => ({
  nodes: [],
  edges: [],
  basePath: null,
  isLoading: false,
  scanError: null,
  selectedNode: null,
  aiSummary: null,
  aiLoading: false,
  aiError: null,

  setGraph: (nodes, edges, basePath) =>
    set({ nodes, edges, basePath, scanError: null }),

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
