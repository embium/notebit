import React from 'react';
import { observer } from '@legendapp/state/react';

// Types
import { ModelConfig } from '@src/types/ai';

// Components
import { ModelCard } from './ModelCard';
import { ModelListSection } from './ModelListSection';

interface ModelListProps {
  defaultModelIds: string[];
  customModelIds: string[];
  updateCounter: number;
  handleToggleModel: (modelId: string, enabled: boolean) => void;
  handleDeleteModel: (modelId: string) => void;
  handleCloneModel: (model: ModelConfig) => void;
  handleEditModel: (model: ModelConfig) => void;
}

/**
 * Component that renders both default and custom model lists
 */
const ModelListComponent: React.FC<ModelListProps> = ({
  defaultModelIds,
  customModelIds,
  updateCounter,
  handleToggleModel,
  handleDeleteModel,
  handleCloneModel,
  handleEditModel,
}) => {
  return (
    <>
      {/* Default models section */}
      {defaultModelIds.length > 0 && (
        <ModelListSection
          title="Default Models"
          titleClassName="text-muted-foreground"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {defaultModelIds.map((modelId) => (
              <ModelCard
                key={`${modelId}-${updateCounter}`}
                modelId={modelId}
                onToggle={handleToggleModel}
                onClone={handleCloneModel}
              />
            ))}
          </div>
        </ModelListSection>
      )}

      {/* Custom models section */}
      {customModelIds.length > 0 && (
        <ModelListSection
          title="Custom Models"
          titleClassName="text-primary"
          className="mt-8"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3">
            {customModelIds.map((modelId) => (
              <ModelCard
                key={`${modelId}-${updateCounter}`}
                modelId={modelId}
                onToggle={handleToggleModel}
                onDelete={handleDeleteModel}
                onClone={handleCloneModel}
                onEdit={handleEditModel}
                isCustom
              />
            ))}
          </div>
        </ModelListSection>
      )}
    </>
  );
};

export const ModelList = observer(ModelListComponent);
