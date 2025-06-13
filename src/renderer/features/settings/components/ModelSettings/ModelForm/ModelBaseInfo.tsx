import React from 'react';

// UI Components
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

// Types
import { ModelConfig } from '@src/types/ai';
import { GeminiModelInfo } from '@src/renderer/lib/ai/models/gemini';

// Utils
import { cn } from '@src/renderer/utils';

interface ModelBaseInfoProps {
  editingModel: ModelConfig | null;
  selectedModelId: string;
  setSelectedModelId: (id: string) => void;
  customName: string;
  setCustomName: (name: string) => void;
  sortedAvailableModels: (string | GeminiModelInfo)[];
}

/**
 * Component for base model selection and custom name input
 */
export const ModelBaseInfo: React.FC<ModelBaseInfoProps> = ({
  editingModel,
  selectedModelId,
  setSelectedModelId,
  customName,
  setCustomName,
  sortedAvailableModels,
}) => {
  return (
    <>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label
          htmlFor="base-model"
          className="col-span-4"
        >
          Base Model
        </Label>
        <Select
          value={selectedModelId}
          onValueChange={setSelectedModelId}
          disabled={!!editingModel}
        >
          <SelectTrigger
            className={cn('col-span-4', editingModel && 'opacity-70')}
          >
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent className="max-h-[200px]">
            {sortedAvailableModels.map((model) => (
              <SelectItem
                key={typeof model === 'string' ? model : model.name}
                value={typeof model === 'string' ? model : model.name}
              >
                {typeof model === 'string'
                  ? model
                  : model.displayName || model.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {editingModel && (
          <p className="col-span-4 text-xs text-amber-500">
            The base model cannot be changed when editing.
          </p>
        )}
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label
          htmlFor="custom-name"
          className="col-span-4"
        >
          Custom Name
        </Label>
        <Input
          id="custom-name"
          className="col-span-4"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          placeholder="My Custom Model"
        />
      </div>

      <Separator className="my-2" />
    </>
  );
};

export default ModelBaseInfo;
