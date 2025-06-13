import React from 'react';
import { observer } from '@legendapp/state/react';
import { Progress } from '@/components/ui/progress';
import { useUpdateSubscription } from '@src/renderer/hooks/useUpdateSubscription';
import { updateState } from '@/app/state/updateState';
import { Button } from '@/components/ui/button';
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { FiDownload, FiRefreshCw } from 'react-icons/fi';

interface UpdateProgressIndicatorProps {
  className?: string;
}

const UpdateProgressIndicator: React.FC<UpdateProgressIndicatorProps> =
  observer(({ className }) => {
    const { downloadUpdate, installUpdate } = useUpdateSubscription();

    const isAvailable = updateState.available.get();
    const isDownloading = updateState.downloading.get();
    const isDownloaded = updateState.downloaded.get();
    const progress = updateState.progress.get();

    // Don't render anything if no update is available or in progress
    if (!isAvailable && !isDownloading && !isDownloaded) {
      return null;
    }

    // Calculate a user-friendly downloaded size if available
    const formatSize = (bytes: number): string => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Format the download speed
    const formatSpeed = (bytesPerSecond: number): string => {
      if (bytesPerSecond < 1024) return `${bytesPerSecond} B/s`;
      if (bytesPerSecond < 1024 * 1024)
        return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
      return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
    };

    const getTooltipContent = () => {
      if (isDownloaded) {
        return 'Update downloaded. Click to install.';
      }

      if (isDownloading && progress) {
        const { percent, transferred, total, bytesPerSecond } = progress;
        return (
          <div className="text-xs">
            <p>Downloading update: {percent.toFixed(1)}%</p>
            <p>
              {formatSize(transferred)} / {formatSize(total)} (
              {formatSpeed(bytesPerSecond)})
            </p>
          </div>
        );
      }

      if (isAvailable) {
        return 'Update available. Click to download.';
      }

      return '';
    };

    const handleClick = () => {
      if (isDownloaded) {
        installUpdate();
      } else if (isAvailable && !isDownloading) {
        downloadUpdate();
      }
    };

    return (
      <div className={`mb-2 ${className}`}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="flex flex-col items-center"
                onClick={handleClick}
                role="button"
                tabIndex={0}
              >
                {isDownloading && progress ? (
                  <div className="w-full px-1">
                    <Progress
                      value={progress.percent}
                      className="h-1 w-full mb-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                    >
                      <FiDownload className="animate-pulse" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                  >
                    {isDownloaded ? (
                      <FiRefreshCw className="text-green-500" />
                    ) : (
                      <FiDownload />
                    )}
                  </Button>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              align="center"
            >
              {getTooltipContent()}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  });

export default UpdateProgressIndicator;
