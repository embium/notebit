import React from 'react';
import { observer } from '@legendapp/state/react';
import { Settings, Info } from 'lucide-react';

// UI Components
import { Label } from '@/components/ui/label';
import { CustomSlider } from '@/components/ui/custom-slider';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Utils
import { cn } from '@/shared/utils';

interface ModelAdvancedParamsProps {
  topP: number;
  setTopP: (value: number) => void;
  frequencyPenalty: number;
  setFrequencyPenalty: (value: number) => void;
  presencePenalty: number;
  setPresencePenalty: (value: number) => void;
  extraParams: string;
  setExtraParams: (value: string) => void;
  extraParamsError: string | null;
  setExtraParamsError: (error: string | null) => void;
}

/**
 * Component for advanced model parameters configuration
 */
const ModelAdvancedParamsComponent: React.FC<ModelAdvancedParamsProps> = ({
  topP,
  setTopP,
  frequencyPenalty,
  setFrequencyPenalty,
  presencePenalty,
  setPresencePenalty,
  extraParams,
  setExtraParams,
  extraParamsError,
  setExtraParamsError,
}) => {
  return (
    <>
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-primary">Advanced Parameters</h4>
        <Settings className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Top P slider */}
      <div className="grid grid-cols-4 items-center gap-4">
        <Label
          htmlFor="top-p"
          className="col-span-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span>Top P</span>
            <ParameterTooltip content="Controls diversity via nucleus sampling: 0.5 means half of all likelihood-weighted options are considered. Range 0-1." />
          </div>
          <span className="text-sm text-muted-foreground">
            {topP.toFixed(2)}
          </span>
        </Label>
        <CustomSlider
          id="top-p"
          className="col-span-4"
          min={0.01}
          max={1}
          step={0.01}
          value={[topP]}
          onValueChange={(value) => setTopP(value[0])}
          aria-label="Top P"
        />
      </div>

      {/* Frequency Penalty slider */}
      <div className="grid grid-cols-4 items-center gap-4">
        <Label
          htmlFor="frequency-penalty"
          className="col-span-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span>Frequency Penalty</span>
            <ParameterTooltip content="Penalizes repeated tokens: higher values reduce repetition. Range 0-1." />
          </div>
          <span className="text-sm text-muted-foreground">
            {frequencyPenalty.toFixed(2)}
          </span>
        </Label>
        <CustomSlider
          id="frequency-penalty"
          className="col-span-4"
          min={0}
          max={1}
          step={0.01}
          value={[frequencyPenalty]}
          onValueChange={(value) => setFrequencyPenalty(value[0])}
          aria-label="Frequency Penalty"
        />
      </div>

      {/* Presence Penalty slider */}
      <div className="grid grid-cols-4 items-center gap-4">
        <Label
          htmlFor="presence-penalty"
          className="col-span-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span>Presence Penalty</span>
            <ParameterTooltip content="Penalizes new tokens based on whether they appear in the existing text: higher values encourage new topics. Range 0-1." />
          </div>
          <span className="text-sm text-muted-foreground">
            {presencePenalty.toFixed(2)}
          </span>
        </Label>
        <CustomSlider
          id="presence-penalty"
          className="col-span-4"
          min={0}
          max={1}
          step={0.01}
          value={[presencePenalty]}
          onValueChange={(value) => setPresencePenalty(value[0])}
          aria-label="Presence Penalty"
        />
      </div>

      {/* Extra Parameters textarea */}
      <div className="grid grid-cols-4 items-start gap-4 mt-2">
        <div className="flex items-center gap-2 col-span-4">
          <Label htmlFor="extra-params">Extra Model Parameters</Label>
          <ParameterTooltip content="Additional parameters in JSON format to send to the model. These will override any other settings configured above." />
        </div>
        <div className="col-span-4">
          <Textarea
            id="extra-params"
            placeholder='{
  "top_k": 40,
  "min_p": 0.05,
  "mirostat_mode": 2
}'
            value={extraParams}
            onChange={(e) => {
              setExtraParams(e.target.value);
              setExtraParamsError(null);
            }}
            className={cn(
              'font-mono text-xs',
              extraParamsError && 'border-destructive'
            )}
            rows={5}
          />
          {extraParamsError && (
            <p className="text-xs text-destructive mt-1">{extraParamsError}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Enter valid JSON. These parameters override all others.
          </p>
        </div>
      </div>
    </>
  );
};

/**
 * Reusable tooltip component for parameter descriptions
 */
const ParameterTooltip: React.FC<{ content: string }> = ({ content }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
      </TooltipTrigger>
      <TooltipContent className="max-w-[300px]">
        <p>{content}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export const ModelAdvancedParams = observer(ModelAdvancedParamsComponent);
