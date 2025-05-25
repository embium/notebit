import React, { useState } from 'react';
import { Database, Eye, EyeOff, RefreshCw, GitMerge } from 'lucide-react';
import { observer } from '@legendapp/state/react';

// UI Components
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { toast } from 'sonner';

// State
import { aiMemorySettings$ } from '@/features/settings/state/aiSettings/aiMemorySettings';

// TRPC
import { trpcProxyClient } from '@shared/config';

// Hooks
import { useSmartHubKnowledgeGraph } from '@/features/chats/hooks/useSmartHubKnowledgeGraph';

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
  const saveSettings = () => {
    aiMemorySettings$.neo4jUri.set(uri);
    aiMemorySettings$.neo4jUsername.set(username);
    aiMemorySettings$.neo4jPassword.set(password);

    toast.success('Knowledge graph settings saved');
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
      const isConnected = await trpcProxyClient.smartHubs.configureNeo4j.mutate(
        {
          uri,
          username,
          password,
        }
      );

      if (isConnected) {
        toast.success('Successfully connected to Neo4j database');
        // Save settings after successful connection
        saveSettings();
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
    <div className="space-y-4 pt-2">
      <Accordion
        type="single"
        collapsible
        defaultValue="knowledge-graph"
      >
        <AccordionItem value="knowledge-graph">
          <AccordionTrigger className="py-2">
            <span className="flex items-center">
              <Database className="h-4 w-4 mr-2" />
              Knowledge Graph (Neo4j)
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                Connect to a Neo4j database to enable knowledge graph
                capabilities for enhanced document relationships.
              </p>

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

              <Separator className="my-2" />

              <div>
                <p className="text-sm mb-2 text-amber-600">
                  Your smart hubs will have to be recomposed after adding a
                  knowledge graph connection.
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export const KnowledgeGraphSettings = observer(KnowledgeGraphSettingsComponent);
