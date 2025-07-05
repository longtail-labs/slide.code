import React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  CLAUDE_MODELS,
  MODEL_CATEGORIES,
  DEFAULT_MODEL,
  getModelsByCategory,
  type ClaudeModelId
} from '@slide.code/schema'
import { Brain } from 'lucide-react'

interface ModelPickerProps {
  value?: ClaudeModelId
  onValueChange: (modelId: ClaudeModelId) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function ModelPicker({
  value,
  onValueChange,
  placeholder = 'Select model',
  className = '',
  disabled = false
}: ModelPickerProps) {
  const selectedModel = value ? CLAUDE_MODELS[value] : CLAUDE_MODELS[DEFAULT_MODEL]

  // Get model categories in a specific order
  const categoryOrder: (keyof typeof MODEL_CATEGORIES)[] = ['premium', 'standard']

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Select value={value || DEFAULT_MODEL} onValueChange={onValueChange} disabled={disabled}>
            <SelectTrigger className={`w-[100px] h-8 ${className}`}>
              <div className="flex items-center gap-2">
                <Brain className="h-3 w-3" />
                <span className="text-xs font-medium truncate">
                  {selectedModel?.displayName || placeholder}
                </span>
              </div>
            </SelectTrigger>
            <SelectContent className="w-[240px]">
              {categoryOrder.map((category) => {
                const models = getModelsByCategory(category)
                if (models.length === 0) return null

                return (
                  <SelectGroup key={category}>
                    <SelectLabel className="text-xs font-semibold text-gray-600 px-2 py-1">
                      {MODEL_CATEGORIES[category].label}
                    </SelectLabel>
                    {models.map((modelId) => {
                      const model = CLAUDE_MODELS[modelId]
                      const isDefault = modelId === DEFAULT_MODEL

                      return (
                        <SelectItem key={modelId} value={modelId} className="cursor-pointer">
                          <div className="flex items-center justify-between w-full">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{model.displayName}</span>
                                {isDefault && (
                                  <Badge variant="secondary" className="text-xs h-4 px-1">
                                    Default
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-gray-500 leading-tight">
                                {model.description}
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectGroup>
                )
              })}
            </SelectContent>
          </Select>
        </TooltipTrigger>
        <TooltipContent>
          <div className="max-w-[250px]">
            <p className="font-medium">{selectedModel?.displayName}</p>
            <p className="text-sm text-gray-400">{selectedModel?.description}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
