import { Schema } from 'effect'

// Available Claude models with their display names and API identifiers
export const CLAUDE_MODELS = {
  'claude-opus-4-20250514': {
    displayName: 'Opus 4',
    description: 'Most capable model for complex tasks',
    category: 'premium',
    apiId: 'claude-opus-4-20250514'
  },
  'claude-sonnet-4-20250514': {
    displayName: 'Sonnet 4',
    description: 'Balanced performance and speed',
    category: 'premium',
    apiId: 'claude-sonnet-4-20250514'
  },
  'claude-3-7-sonnet-20250219': {
    displayName: '3.7',
    description: 'Enhanced reasoning and analysis',
    category: 'standard',
    apiId: 'claude-3-7-sonnet-20250219'
  },
  'claude-3-5-sonnet-20241022': {
    displayName: '3.5',
    description: 'Reliable coding assistant',
    category: 'standard',
    apiId: 'claude-3-5-sonnet-20241022'
  }
} as const

// Type for model IDs
export type ClaudeModelId = keyof typeof CLAUDE_MODELS

// Type for model configuration
export type ClaudeModelConfig = (typeof CLAUDE_MODELS)[ClaudeModelId]

// Model categories for organizing the picker
export const MODEL_CATEGORIES = {
  premium: {
    label: 'Premium Models',
    description: 'Latest and most capable'
  },
  standard: {
    label: 'Standard Models',
    description: 'Reliable and proven'
  }
} as const

// Default model for new tasks
export const DEFAULT_MODEL: ClaudeModelId = 'claude-sonnet-4-20250514'

// Schema for model selection
export const ClaudeModelSchema = Schema.Union(
  ...Object.keys(CLAUDE_MODELS).map((id) => Schema.Literal(id as ClaudeModelId))
)

// Helper function to get model configuration
export const getModelConfig = (modelId: ClaudeModelId): ClaudeModelConfig => {
  return CLAUDE_MODELS[modelId]
}

// Helper function to get models by category
export const getModelsByCategory = (category: keyof typeof MODEL_CATEGORIES): ClaudeModelId[] => {
  return Object.keys(CLAUDE_MODELS).filter(
    (id) => CLAUDE_MODELS[id as ClaudeModelId].category === category
  ) as ClaudeModelId[]
}

// Helper function to get all models as array
export const getAllModels = (): Array<{ id: ClaudeModelId; config: ClaudeModelConfig }> => {
  return Object.entries(CLAUDE_MODELS).map(([id, config]) => ({
    id: id as ClaudeModelId,
    config
  }))
}

// Helper function to get recommended models (most commonly used)
export const getRecommendedModels = (): ClaudeModelId[] => {
  return ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022']
}
