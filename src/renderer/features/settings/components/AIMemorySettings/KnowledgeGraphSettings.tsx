import React, { useState } from 'react';
import { Database, Eye, EyeOff, RefreshCw, GitMerge } from 'lucide-react';
import { observer } from '@legendapp/state/react';

// UI Components
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

// State
import {
  aiMemorySettings$,
  availableKnowledgeGraphModels,
  currentEmbeddingModelDetails,
} from '@/features/settings/state/aiSettings/aiMemorySettings';

// TRPC
import { trpcProxyClient } from '@shared/config/index';

// Hooks
import { useSmartHubKnowledgeGraph } from '@/features/chats/hooks/useSmartHubKnowledgeGraph';
import { KnowledgeGraphModelSelector } from './KnowledgeGraphModelSelector';
import { useKnowledgeGraphModels } from '../../hooks/useKnowledegeGraphModels';

// Constants
import { PROVIDER_EMBEDDING_MODELS } from '@shared/constants';
import { smartHubsState$ } from '@/features/smart-hubs/state/smartHubsState';
import { LuGitMerge } from 'react-icons/lu';
import CustomSwitch from '@src/renderer/components/ui/custom-switch';

interface KnowledgeGraphSettingsProps {
  // Add any props if needed
}

/**
 * Component for Neo4j knowledge graph connection settings
 */
const KnowledgeGraphSettingsComponent: React.FC<
  KnowledgeGraphSettingsProps
> = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const {
    modelsByProvider,
    providers,
    knowledgeGraphModel,
    currentModel,
    allAvailableModels,
    isRefreshing,
    setKnowledgeGraphModel,
    handleRefreshStatus,
  } = useKnowledgeGraphModels();

  // Get the current embedding model dimensions
  const currentEmbeddingModel = currentEmbeddingModelDetails.get();
  const embeddingDimensions = currentEmbeddingModel?.dimensions || 1536; // Default to 1536 if not found

  // Get knowledge graph enabled state
  const enableKnowledgeGraph = aiMemorySettings$.enableKnowledgeGraph.get();

  // Local form state for immediate feedback
  const [uri, setUri] = useState<string>(
    aiMemorySettings$.neo4jUri.get() || ''
  );
  const [username, setUsername] = useState<string>(
    aiMemorySettings$.neo4jUsername.get() || ''
  );
  const [password, setPassword] = useState<string>(
    aiMemorySettings$.neo4jPassword.get() || ''
  );

  /**
   * Save Neo4j connection settings
   */
  const saveSettings = async () => {
    if (!currentEmbeddingModel) {
      toast.error('No embedding model selected');
      return;
    }

    aiMemorySettings$.neo4jUri.set(uri);
    aiMemorySettings$.neo4jUsername.set(username);
    aiMemorySettings$.neo4jPassword.set(password);

    const isConnected = await trpcProxyClient.smartHubs.connectToNeo4j.query({
      uri,
      username,
      password,
    });

    if (isConnected) {
      await trpcProxyClient.smartHubs.createVectorIndexes.mutate({
        dimension: embeddingDimensions,
      });
      smartHubsState$.knowledgeGraphEnabled.set(true);
      toast.success('Knowledge graph settings saved');
    } else {
      toast.error('Failed to connect to Neo4j database');
    }
  };

  /**
   * Test the Neo4j connection with current settings
   */
  const testConnection = async () => {
    if (!uri || !username || !password) {
      toast.error('Please fill in all connection fields');
      return;
    }

    setIsTestingConnection(true);

    try {
      const isConnected = await trpcProxyClient.smartHubs.connectToNeo4j.query({
        uri,
        username,
        password,
      });

      if (isConnected) {
        toast.success('Successfully connected to Neo4j database');
      } else {
        toast.error('Failed to connect to Neo4j database');
      }
    } catch (error) {
      console.error('Error testing Neo4j connection:', error);
      toast.error(
        'Error connecting to Neo4j: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      );
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Replaces vector embeddings for Smart Hubs only.
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitMerge className="h-4 w-4 text-primary" />
            <h3 className="text-md font-medium">Enable Knowledge Graph</h3>
          </div>
          <div className="flex items-center space-x-2">
            <CustomSwitch
              id="enable-knowledge-graph"
              checked={enableKnowledgeGraph}
              onChange={(checked: boolean) => {
                aiMemorySettings$.enableKnowledgeGraph.set(checked);
              }}
            />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Enable knowledge graph capabilities for enhanced document
          relationships and multi-hop reasoning.
        </p>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <LuGitMerge className="h-4 w-4 text-primary" />
        <h3 className="text-md font-medium">Knowledge Graph Model</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Select the model for extracting knowledge graphs from your documents.
        For local machines, a smaller model is recommended for better
        performance.
      </p>
      <div className="space-y-4">
        <KnowledgeGraphModelSelector
          knowledgeGraphModel={knowledgeGraphModel}
          currentModel={currentModel}
          providers={providers}
          modelsByProvider={modelsByProvider}
          allAvailableModels={allAvailableModels}
          onSelectModel={setKnowledgeGraphModel}
          handleRefreshStatus={handleRefreshStatus}
          isRefreshing={isRefreshing}
        />
      </div>
      <Separator />
      <Separator />

      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Database className="h-4 w-4 text-primary" />
          <h3 className="text-md font-medium">Neo4j Connection</h3>
        </div>

        <p className="text-sm text-muted-foreground">
          Connect to a Neo4j database to enable knowledge graph capabilities for
          enhanced document relationships.
        </p>

        <Card className="border-dashed">
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="neo4j-uri">Neo4j URI</Label>
              <Input
                id="neo4j-uri"
                value={uri}
                onChange={(e) => setUri(e.target.value)}
                placeholder="neo4j://localhost:7687"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="neo4j-username">Username</Label>
              <Input
                id="neo4j-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="neo4j"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="neo4j-password">Password</Label>
              <div className="relative">
                <Input
                  id="neo4j-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter database password"
                  className="pr-9"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <Button
                onClick={testConnection}
                disabled={isTestingConnection}
                className="w-1/2"
              >
                {isTestingConnection && (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                )}
                Test Connection
              </Button>
              <Button
                onClick={saveSettings}
                variant="outline"
                className="w-1/2"
              >
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <div>
        <p className="text-sm text-amber-600 flex items-center gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-alert-triangle"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
          Your smart hubs will have to be recomposed after adding a knowledge
          graph connection.
        </p>
      </div>
    </div>
  );
};

export const KnowledgeGraphSettings = observer(KnowledgeGraphSettingsComponent);
