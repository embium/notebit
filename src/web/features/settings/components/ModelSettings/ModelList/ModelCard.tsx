import React from 'react';
import {
  Copy,
  Settings,
  Trash2,
  InfoIcon,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { observer } from '@legendapp/state/react';

// Types
import { ModelConfig } from '@shared/types/ai';

// UI Components
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import CustomSwitch from '@src/web/components/ui/custom-switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Utils
import { cn } from '@/shared/utils';

// State
import { getModelById } from '@/features/settings/state/aiSettings/aiSettingsState';

/**
 * Props for the ModelCard component
 */
export interface ModelCardProps {
  modelId: string;
  onToggle: (modelId: string, enabled: boolean) => void;
  onDelete?: (modelId: string) => void;
  onClone: (model: ModelConfig) => void;
  onEdit?: (model: ModelConfig) => void;
  isCustom?: boolean;
}

/**
 * Component for displaying a model's configuration in a card UI
 */
const ModelCardComponent: React.FC<ModelCardProps> = ({
  modelId,
  onToggle,
  onDelete,
  onClone,
  onEdit,
  isCustom = false,
}) => {
  const model = getModelById(modelId);

  const [expanded, setExpanded] = React.useState(false);

  if (!model) {
    return null;
  }

  // If we have advanced params, prepare them for display
  const advancedParams = [
    { name: 'topP', value: model.topP },
    { name: 'frequencyPenalty', value: model.frequencyPenalty },
    { name: 'presencePenalty', value: model.presencePenalty },
  ].filter((param) => param.value !== undefined);

  const hasAdvancedParams = advancedParams.length > 0 || model.extraParams;

  // Toggle expanded state
  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  return (
    <Card className="overflow-hidden p-2 gap-2">
      {/* Model header with name and toggle */}
      <div className="px-2 py-2 bg-secondary/10 flex items-center justify-between">
        <div className="flex-1 min-w-0 pr-2">
          <h3
            className="text-sm font-medium truncate"
            title={model.name}
          >
            {model.name}
          </h3>
          <div className="text-xs text-muted-foreground truncate">
            Base: {model.providerId}
          </div>
        </div>

        <CustomSwitch
          checked={model.enabled}
          onChange={(checked) => onToggle(model.id, checked)}
          className="flex-shrink-0"
        />
      </div>

      {/* Model details */}
      <CardContent className="p-3 pt-2">
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant="secondary"
            className="text-xs whitespace-nowrap"
          >
            Temp: {model.temperature ?? '0.7'}
          </Badge>

          <Badge
            variant="secondary"
            className="text-xs whitespace-nowrap"
          >
            Tokens: {model.maxOutputTokens ?? '2048'}
          </Badge>

          {model.contextMessageLimit && (
            <Badge
              variant="secondary"
              className="text-xs whitespace-nowrap"
            >
              Context: {model.contextMessageLimit}
            </Badge>
          )}
        </div>

        {/* Advanced parameters toggle button */}
        {hasAdvancedParams && (
          <div className="mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleExpand}
              className="h-7 text-xs px-2 w-full flex justify-between"
            >
              <span>Advanced Params</span>
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </Button>

            {/* Expanded advanced parameters */}
            {expanded && (
              <div className="mt-2 p-2 border rounded-md bg-muted/20 text-xs space-y-2">
                {advancedParams.length > 0 && (
                  <div className="space-y-1.5">
                    {advancedParams.map((param) => (
                      <div
                        key={param.name}
                        className="flex justify-between items-center py-0.5"
                      >
                        <span className="text-muted-foreground">
                          {param.name}:
                        </span>
                        <span>{param.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {model.extraParams && (
                  <div
                    className={cn(
                      advancedParams.length > 0 && 'mt-3 pt-2 border-t'
                    )}
                  >
                    <span className="text-muted-foreground flex items-center gap-1">
                      Extra Parameters:
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <InfoIcon className="h-3 w-3 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">
                              Custom parameters passed directly to the model API
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </span>
                    <pre className="mt-1 bg-muted p-1.5 rounded text-[10px] overflow-x-auto max-h-[100px] overflow-y-auto">
                      {JSON.stringify(model.extraParams, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Action buttons */}
      <CardFooter className="px-3 py-2 border-t bg-card flex justify-end gap-0.5">
        {isCustom && onEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onEdit(model)}
            title="Edit model"
          >
            <Settings className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onClone(model)}
          title="Clone model"
        >
          <Copy className="h-4 w-4" />
          <span className="sr-only">Clone</span>
        </Button>

        {isCustom && onDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            onClick={() => onDelete(model.id)}
            title="Delete model"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export const ModelCard = observer(ModelCardComponent);
