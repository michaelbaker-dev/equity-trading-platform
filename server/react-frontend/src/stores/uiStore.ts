// UI state management store using Zustand
// Manages panel widths, active tabs, modals, and other UI state

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UIStore, PanelWidths, TabType } from '../types';

// Calculate default panel widths based on window size
const getDefaultPanelWidths = (): PanelWidths => {
  const totalWidth = window.innerWidth;
  const handleSpace = 16; // 2 handles × 8px each
  const availableWidth = totalWidth - handleSpace;
  
  // Default distribution: 25% - 50% - 25%
  const leftWidth = Math.max(300, Math.floor(availableWidth * 0.25));
  const rightWidth = Math.max(300, Math.floor(availableWidth * 0.25));
  const middleWidth = availableWidth - leftWidth - rightWidth;
  
  return {
    left: leftWidth,
    middle: Math.max(400, middleWidth),
    right: rightWidth
  };
};

const DEFAULT_PANEL_WIDTHS: PanelWidths = getDefaultPanelWidths();

export const useUIStore = create<UIStore>()(
  persist(
    (set, _get) => ({
      // Panel layout state
      panelWidths: DEFAULT_PANEL_WIDTHS,

      // Active tab state
      activeTab: 'chart' as TabType,

      // AI model selection state
      selectedAIModel: null,

      // Modal state
      modals: {
        addStock: false
      },

      // Actions
      setPanelWidths: (widths: PanelWidths) => {
        console.log('📐 Updating panel widths:', widths);
        set({ panelWidths: widths });
      },

      setActiveTab: (tab: TabType) => {
        console.log(`🗂️  Switching to tab: ${tab}`);
        set({ activeTab: tab });
      },

      setSelectedAIModel: (model: string) => {
        console.log(`🤖 Setting AI model: ${model}`);
        set({ selectedAIModel: model });
      },

      openModal: (modal: string) => {
        console.log(`🪟 Opening modal: ${modal}`);
        set((state) => ({
          modals: {
            ...state.modals,
            [modal]: true
          }
        }));
      },

      closeModal: (modal: string) => {
        console.log(`❌ Closing modal: ${modal}`);
        set((state) => ({
          modals: {
            ...state.modals,
            [modal]: false
          }
        }));
      }
    }),
    {
      name: 'equity-ui-state', // localStorage key
      version: 2, // Increment version to reset old data
      // Persist panel widths, activeTab, and selectedAIModel
      partialize: (state) => ({
        panelWidths: state.panelWidths,
        activeTab: state.activeTab,
        selectedAIModel: state.selectedAIModel
      }),
      // Storage options
      storage: createJSONStorage(() => localStorage),
      // Migration for version updates
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          // Reset to default panel widths for version 2
          return {
            ...persistedState,
            panelWidths: getDefaultPanelWidths()
          };
        }
        return persistedState;
      }
    }
  )
);

// Selector functions
export const usePanelWidths = () => useUIStore(state => state.panelWidths);
export const useActiveTab = () => useUIStore(state => state.activeTab);
export const useModalState = (modal: string) => 
  useUIStore(state => state.modals[modal] || false);

// Helper functions for panel calculations
export const useWindowWidth = () => {
  const { panelWidths } = useUIStore();
  return panelWidths.left + panelWidths.middle + panelWidths.right + 16; // Include resize handles
};

export const useIsMobileView = () => {
  const windowWidth = useWindowWidth();
  return windowWidth > window.innerWidth;
};