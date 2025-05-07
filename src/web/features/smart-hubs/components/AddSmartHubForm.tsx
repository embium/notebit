import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { observer } from '@legendapp/state/react';

// UI Components
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// State
import {
  addSmartHub,
  updateSmartHub,
} from '@/features/smart-hubs/state/smartHubsState';
import {
  availableEmbeddingModels,
  aiMemorySettings$,
} from '@/features/settings/state/aiSettings/aiMemorySettings';

// Types
import { SmartHub } from '@src/shared/types/smartHubs';

interface AddSmartHubFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  smartHub?: SmartHub;
}

export const AddSmartHubForm: React.FC<AddSmartHubFormProps> = observer(
  ({ open, onOpenChange, smartHub }) => {
    const [name, setName] = useState('');
    const [embeddingModel, setEmbeddingModel] = useState('');
    const isEditing = !!smartHub;

    // Get available embedding models
    const models = availableEmbeddingModels.get();
    const currentEmbeddingModel = aiMemorySettings$.embeddingModel.get();

    // Ensure embedding model is initialized
    // useEffect(() => {
    //  initializeEmbeddingModel();
    // }, []);

    // Reset form when smartHub changes
    useEffect(() => {
      if (smartHub) {
        setName(smartHub.name);
        // Use the smartHub's embedding model or the current selected one
        // setEmbeddingModel(
        // smartHub.embeddingModel || currentEmbeddingModel || ''
        //);
      } else {
        setName('');
        // Default to current embedding model
        // setEmbeddingModel(currentEmbeddingModel || '');
      }
    }, [smartHub, open, currentEmbeddingModel]);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();

      if (!name.trim()) {
        alert('Name is required');
        return;
      }

      {
        /*
      if (!embeddingModel) {
        alert('Please select an embedding model');
        return;
      }
      */
      }

      const submittedSmartHub: SmartHub = {
        id: smartHub?.id || uuidv4(),
        name: name.trim(),
        // embeddingModel: embeddingModel,
        status: 'draft',
        files: smartHub?.files || [],
        folders: smartHub?.folders || [],
        notes: smartHub?.notes || [],
        bookmarked: smartHub?.bookmarked || false,
      };

      if (isEditing) {
        updateSmartHub(submittedSmartHub);
      } else {
        addSmartHub(submittedSmartHub);
      }

      onOpenChange(false);
    };

    return (
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {isEditing ? 'Edit Smart Hub' : 'New Smart Hub'}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div className="space-y-2">
              <Label
                htmlFor="name"
                className="text-sm font-medium"
              >
                Title
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter a title for this Knowledge Stack"
                className="bg-background"
                required
              />
            </div>
            {/*
            <div className="space-y-2">
              <Label
                htmlFor="embeddingModel"
                className="text-sm font-medium flex justify-between"
              >
                <span>Preferred Embedding Model</span>
                <span className="text-xs text-muted-foreground">
                  Can be changed later
                </span>
              </Label>
              
              <Select
                value={embeddingModel}
                onValueChange={setEmbeddingModel}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select an embedding model">
                    {embeddingModel
                      ? models.find((m) => m.id === embeddingModel)?.name ||
                        embeddingModel
                      : 'Select an embedding model'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {models.length === 0 ? (
                    <SelectItem
                      value=""
                      disabled
                    >
                      <div className="text-muted-foreground">
                        No embedding models available
                      </div>
                    </SelectItem>
                  ) : (
                    models.map((model) => (
                      <SelectItem
                        key={model.id}
                        value={model.id}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-block h-4 w-4 rounded-full ${
                              model.provider === 'OpenAI'
                                ? 'bg-green-500'
                                : model.provider === 'Google Gemini'
                                  ? 'bg-blue-500'
                                  : model.provider === 'Cohere'
                                    ? 'bg-amber-500'
                                    : model.provider === 'Ollama'
                                      ? 'bg-purple-500'
                                      : 'bg-gray-500'
                            }`}
                          ></span>
                          {model.name}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              
            </div>
            */}

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="ml-2"
                disabled={
                  !name.trim() // || !embeddingModel
                }
              >
                {isEditing ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }
);
