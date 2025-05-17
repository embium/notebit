import {
  AlertCircle,
  ExternalLink,
  Key,
  Lock,
  RefreshCw,
  Server,
} from 'lucide-react';
import { observer } from '@legendapp/state/react';

// Types
import { ProviderType } from '@shared/types/ai';

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import CustomSwitch from '@/components/ui/custom-switch';

// Hooks
import { LoadingStatus } from '@/features/settings/hooks/useProviderConfig';

// Utils
import { cn } from '@/shared/utils';

// Components
import ProviderIcon from '@/components/custom/ProviderIcons';

interface ProviderSettingsCardProps {
  activeProvider: ProviderType;
  providerConfig: {
    name: string;
    description: string;
    apiHost: string;
    apiKey?: string;
    enabled: boolean;
  };
  currentProviderConfig: {
    needsApiKey: boolean;
    needsApiHost: boolean;
  };
  isProviderEnabled: (provider: ProviderType) => boolean;
  hasValidConfig: () => boolean;
  getProviderDocsUrl: (provider: ProviderType) => string;
  status: LoadingStatus;
  isLoading: boolean;
  isRefreshDisabled: () => boolean;
  handleProviderToggle: (enabled: boolean) => void;
  handleApiHostChange: (host: string) => void;
  handleApiKeyChange: (key: string) => void;
  loadAvailableModels: () => void;
}

/**
 * Card for displaying and editing provider settings
 */
const ProviderSettingsCardComponent = ({
  activeProvider,
  providerConfig,
  currentProviderConfig,
  isProviderEnabled,
  hasValidConfig,
  getProviderDocsUrl,
  status,
  isLoading,
  isRefreshDisabled,
  handleProviderToggle,
  handleApiHostChange,
  handleApiKeyChange,
  loadAvailableModels,
}: ProviderSettingsCardProps) => {
  return (
    <Card className="border-none shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="mr-2">
              <ProviderIcon provider={activeProvider} />
            </span>
            <CardTitle>{providerConfig.name}</CardTitle>
            <a
              href={getProviderDocsUrl(activeProvider)}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-muted-foreground hover:text-primary"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          <div className="flex items-center space-x-2">
            <Label htmlFor={`enable-${activeProvider}`}>
              {isProviderEnabled(activeProvider) ? 'Enabled' : 'Disabled'}
            </Label>
            <CustomSwitch
              checked={isProviderEnabled(activeProvider)}
              onChange={handleProviderToggle}
              id={`enable-${activeProvider}`}
            />
          </div>
        </div>
        <CardDescription>{providerConfig.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <Accordion
          type="single"
          collapsible
          defaultValue="connection"
        >
          <AccordionItem value="connection">
            <AccordionTrigger className="py-2">
              <span className="flex items-center">
                <Server className="h-4 w-4 mr-2" />
                Connection Settings
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                {currentProviderConfig.needsApiHost && (
                  <div className="space-y-2">
                    <Label htmlFor={`api-host-${activeProvider}`}>
                      API Host
                    </Label>
                    <Input
                      id={`api-host-${activeProvider}`}
                      value={providerConfig.apiHost}
                      onChange={(e) => handleApiHostChange(e.target.value)}
                      placeholder="Enter API host"
                    />
                  </div>
                )}

                {currentProviderConfig.needsApiKey && (
                  <div className="space-y-2">
                    <Label htmlFor={`api-key-${activeProvider}`}>API Key</Label>
                    <div className="relative">
                      <Input
                        id={`api-key-${activeProvider}`}
                        type="password"
                        value={providerConfig.apiKey || ''}
                        onChange={(e) => handleApiKeyChange(e.target.value)}
                        placeholder="Enter your API key"
                        className="pr-9"
                      />
                      <Key className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                )}

                {isProviderEnabled(activeProvider) && (
                  <div className="pt-2 flex flex-col gap-2">
                    <div className="flex items-center gap-4">
                      <Button
                        onClick={loadAvailableModels}
                        disabled={isRefreshDisabled()}
                        variant="outline"
                        size="sm"
                        className="flex items-center"
                      >
                        <RefreshCw
                          className={cn(
                            'h-3 w-3 mr-1',
                            isLoading && 'animate-spin'
                          )}
                        />
                        {isLoading ? 'Loading...' : 'Refresh Models'}
                      </Button>
                      {!hasValidConfig() && (
                        <div className="text-xs text-amber-500 flex items-center">
                          <Lock className="h-3 w-3 mr-1" />
                          {currentProviderConfig.needsApiKey &&
                          !providerConfig.apiKey
                            ? 'Please enter API key'
                            : currentProviderConfig.needsApiHost &&
                                !providerConfig.apiHost
                              ? 'Please enter API host'
                              : 'Missing required configuration'}
                        </div>
                      )}
                    </div>

                    {status.type && (
                      <div
                        className={cn(
                          'text-sm p-2 rounded border flex items-center',
                          status.type === 'success'
                            ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/25 dark:text-green-400 dark:border-green-900/40'
                            : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/40'
                        )}
                      >
                        {status.type === 'success' ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 mr-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : (
                          <AlertCircle className="h-4 w-4 mr-2" />
                        )}
                        {status.message}
                      </div>
                    )}

                    {isLoading && !status.type && (
                      <div className="text-sm p-2 rounded border border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/40 flex items-center">
                        <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                        Loading models, please wait...
                      </div>
                    )}
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
};

export const ProviderSettingsCard = observer(ProviderSettingsCardComponent);
