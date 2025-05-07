import React from 'react';
import { observer } from '@legendapp/state/react';
import { IoMdFolder } from 'react-icons/io';
import { useSmartHubIntegration } from '../../hooks/useSmartHubIntegration';

/**
 * SmartHubIndicator - Shows a visual indicator when smart hubs are selected
 */
const SmartHubIndicatorComponent: React.FC = () => {
  // Get the selected smart hubs
  const { selectedSmartHubIds, hasSelectedSmartHubs } =
    useSmartHubIntegration();

  // Don't render anything if no smart hubs are selected
  if (!hasSelectedSmartHubs) {
    return null;
  }

  return (
    <div className="flex items-center px-3 py-1.5 text-sm border border-dashed rounded-md w-fit mx-3 mb-2 mt-2 text-muted-foreground">
      <IoMdFolder className="w-4 h-4 mr-2 text-primary" />
      {selectedSmartHubIds.length}{' '}
      {selectedSmartHubIds.length === 1 ? 'Smart Hub' : 'Smart Hubs'}{' '}
      <span className="text-primary ml-1 font-medium">Providing Context</span>
    </div>
  );
};

export const SmartHubIndicator = observer(SmartHubIndicatorComponent);
