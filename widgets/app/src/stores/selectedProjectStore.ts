import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface SelectedProjectState {
  selectedProjectId: string | null
  setSelectedProjectId: (projectId: string) => void
}

export const useSelectedProjectStore = create<SelectedProjectState>()(
  persist(
    (set) => ({
      selectedProjectId: null,
      setSelectedProjectId: (projectId: string) => set({ selectedProjectId: projectId })
    }),
    {
      name: 'slide-code-selected-project', // unique name for localStorage
      storage: createJSONStorage(() => localStorage)
    }
  )
)
