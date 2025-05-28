import React, { useState, useEffect } from 'react';
import {
  Download,
  Check,
  Clock,
  Star,
  Award,
  ChevronDown,
  Trash2,
} from 'lucide-react';
import { observer } from '@legendapp/state/react';

// UI Components
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Types
import { ModelInfo } from '@shared/types/ai';

// State
import {
  modelHubState$,
  pullModel,
  deleteModel,
  cancelDownload,
} from '../state/modelHubState';

// Utils
import { cn } from '@/shared/utils';

interface ModelCardProps {
  model: ModelInfo;
}

/**
 * Card for the "Available Models" tab
 */
export const AvailableModelCardComponent: React.FC<ModelCardProps> = ({
  model,
}) => {
  const isPulling = modelHubState$.pullingModels[model.id]?.get() || false;
  const [selectedSize, setSelectedSize] = useState<string>('');
  const modelProgress =
    modelHubState$.modelProgress[`${model.id}:${selectedSize}`]?.get();
  const [installedSizes, setInstalledSizes] = useState<string[]>([]);

  // Check if the model has multiple sizes available
  const hasSizes = model.sizes && model.sizes.length > 0;

  // Simple check for any installation
  const isAnyModelInstalled =
    model.installed === true || installedSizes.length > 0;

  // Determine if a specific size is installed
  const isSizeInstalled = (size: string): boolean => {
    return installedSizes.includes(size);
  };

  // Check if current installed models have any of the sizes for this model
  useEffect(() => {
    const installedModels = modelHubState$.installedModels.get();

    // Collect all installed sizes for this model
    const sizes: string[] = [];
    installedModels.forEach((installedModel) => {
      // Check for exact model ID match first (base model)
      if (installedModel.name === model.id) {
        sizes.push('latest');
      }
      // Then check for size-specific variants (e.g., "llama3:8b")
      else if (installedModel.name.startsWith(model.id + ':')) {
        const size = installedModel.name.split(':')[1];
        if (size) {
          sizes.push(size);
        }
      }
    });

    setInstalledSizes(sizes);

    // If the currently selected size is now installed, reset it
    if (selectedSize && sizes.includes(selectedSize)) {
      setSelectedSize('');
    }

    // Find an available size to select by default if none is selected
    if (
      selectedSize === '' &&
      hasSizes &&
      sizes.length < (model.sizes?.length || 0)
    ) {
      const availableSize = model.sizes?.find((size) => !sizes.includes(size));
      if (availableSize) {
        setSelectedSize(availableSize);
      }
    }
  }, [
    model.id,
    model.sizes,
    selectedSize,
    hasSizes,
    modelHubState$.installedModels.get(),
  ]);

  const handlePullModel = async () => {
    await pullModel(model.id, selectedSize || undefined);
  };

  const handleCancelDownload = async () => {
    await cancelDownload(`${model.id}:${selectedSize}`);
  };

  const handleSizeSelect = (size: string) => {
    setSelectedSize(size);
  };

  // Check if install button should be disabled
  const isInstallButtonDisabled: boolean = Boolean(
    isPulling ||
      (hasSizes && !selectedSize) ||
      (selectedSize && isSizeInstalled(selectedSize))
  );

  return (
    <Card className="flex flex-col h-full overflow-hidden border shadow-sm hover:shadow transition-all duration-200 bg-card">
      <CardContent className="p-6 flex-1">
        <div className="flex flex-col h-full">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-lg font-semibold truncate">{model.name}</h3>
            {isAnyModelInstalled && (
              <Badge
                variant="outline"
                className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
              >
                <Check className="h-3 w-3 mr-1" />
                Installed
              </Badge>
            )}
          </div>

          {model.description && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
              {model.description}
            </p>
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            {model.capability && (
              <Badge
                variant="secondary"
                className="bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800"
              >
                {model.capability}
              </Badge>
            )}
            {model.sizes?.map((size, i) => {
              const sizeInstalled = isSizeInstalled(size);
              const isSelectable = !isPulling && !sizeInstalled;

              return (
                <Badge
                  key={i}
                  variant="outline"
                  className={cn(
                    'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
                    selectedSize === size && 'bg-blue-200 dark:bg-blue-800/50',
                    sizeInstalled && 'ring-1 ring-green-500 dark:ring-green-400'
                  )}
                  onClick={() => {
                    if (isSelectable) {
                      handleSizeSelect(size);
                    }
                  }}
                  style={{ cursor: isSelectable ? 'pointer' : 'default' }}
                >
                  {size}
                  {sizeInstalled && (
                    <Check className="h-3 w-3 ml-1 text-green-600 dark:text-green-400" />
                  )}
                </Badge>
              );
            })}
            {model.size && !model.sizes?.length && (
              <Badge
                variant="outline"
                className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
              >
                {model.size}
              </Badge>
            )}
          </div>

          <div className="mt-auto">
            <div className="flex items-center text-xs text-muted-foreground gap-4">
              {model.pullCount && (
                <div className="flex items-center gap-1">
                  <Download className="h-3 w-3" />
                  <span>{model.pullCount} pulls</span>
                </div>
              )}
              {model.modified && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{model.modified}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 border-t border-border pt-4">
        <div className="w-full">
          {isPulling && modelProgress && (
            <div className="mb-4">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">
                  {modelProgress.status}
                </span>
                <span className="font-medium">{modelProgress.progress}%</span>
              </div>
              <Progress
                value={modelProgress.progress}
                className="h-2"
              />
            </div>
          )}

          <div className="flex gap-2">
            {hasSizes ? (
              <>
                <Select
                  value={selectedSize || 'placeholder'}
                  onValueChange={(value) =>
                    value === 'placeholder'
                      ? setSelectedSize('')
                      : setSelectedSize(value)
                  }
                  disabled={isPulling}
                >
                  <SelectTrigger
                    className="flex-1"
                    size="sm"
                  >
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    {model.sizes?.map((size) => (
                      <SelectItem
                        key={size}
                        value={size}
                        disabled={isSizeInstalled(size)}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{size}</span>
                          {isSizeInstalled(size) && (
                            <Check className="ml-2 h-3 w-3 text-green-600 dark:text-green-400" />
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {isPulling ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleCancelDownload}
                          className="flex-1"
                        >
                          <span>Stop download</span>
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={handlePullModel}
                          disabled={isInstallButtonDisabled}
                          className="flex-1"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Install
                        </Button>
                      )}
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {isPulling
                          ? 'Cancel the current download'
                          : isInstallButtonDisabled &&
                              selectedSize &&
                              isSizeInstalled(selectedSize)
                            ? 'This size is already installed'
                            : 'Download and install this model to your local Ollama'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {isPulling ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleCancelDownload}
                        className="w-full"
                      >
                        Stop download
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handlePullModel}
                        disabled={isPulling || model.installed}
                        className="w-full"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Install Model
                      </Button>
                    )}
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {isPulling
                        ? 'Cancel the current download'
                        : model.installed
                          ? 'This model is already installed'
                          : 'Download and install this model to your local Ollama'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

/**
 * Card for the "Installed Models" tab - simpler version with just size and remove button
 */
export const InstalledModelCardComponent: React.FC<ModelCardProps> = ({
  model,
}) => {
  const isDeleting = modelHubState$.deletingModels[model.id]?.get() || false;
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDeleteModel = async () => {
    await deleteModel(model.id);
    setShowDeleteDialog(false);
  };

  const openDeleteDialog = () => {
    setShowDeleteDialog(true);
  };

  return (
    <Card className="flex flex-col h-full overflow-hidden border shadow-sm bg-card">
      <CardContent className="p-6 flex-1">
        <div className="flex flex-col h-full">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-lg font-semibold truncate">{model.name}</h3>
          </div>

          {model.size && (
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge
                variant="outline"
                className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
              >
                {model.size}
              </Badge>
            </div>
          )}

          {/* Optional description */}
          {model.description && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {model.description}
            </p>
          )}

          <div className="mt-auto">
            <div className="flex items-center text-xs text-muted-foreground gap-4">
              {model.modified && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{model.modified}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 border-t border-border pt-4">
        <div className="w-full">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={openDeleteDialog}
                  disabled={isDeleting}
                  className="w-full"
                >
                  {isDeleting ? (
                    <span className="animate-pulse">Removing...</span>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove Model
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete this model from your local Ollama installation</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Delete Confirmation Dialog */}
          <AlertDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Model</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove the model "{model.name}"? This
                  action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteModel}
                  className="bg-red-500 hover:bg-red-600"
                >
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardFooter>
    </Card>
  );
};

export const AvailableModelCard = observer(AvailableModelCardComponent);
export const InstalledModelCard = observer(InstalledModelCardComponent);
