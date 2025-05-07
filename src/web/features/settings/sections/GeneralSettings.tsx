import React from 'react';

// Components
import { ThemeSelector } from '@/features/settings/components/GeneralSettings/ThemeSelector';
import { AccentColorSelector } from '@/features/settings/components/GeneralSettings/AccentColorSelector';
import { FontStyleSelector } from '@/features/settings/components/GeneralSettings/FontStyleSelector';
import { FontSizeControl } from '@/features/settings/components/GeneralSettings/FontSizeControl';
import { NotesLocationSelector } from '@/features/settings/components/GeneralSettings/NotesLocationSelector';
import { GeneralSettingsOptions } from '@/features/settings/components/GeneralSettings/GeneralSettingsOptions';

/**
 * Theme settings component
 */
const ThemeSettings: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="p-3.5 border border-border rounded-lg mb-5">
          <div className="space-y-4">
            <GeneralSettingsOptions />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Notes Location</h3>
        <div className="p-3.5 border border-border rounded-lg mb-5">
          <div className="space-y-4">
            <NotesLocationSelector />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Appearance</h3>
        <div className="p-3.5 border border-border rounded-lg mb-5">
          <ThemeSelector />
          <AccentColorSelector />
          <FontStyleSelector />
          <FontSizeControl />
        </div>
      </div>
    </div>
  );
};

/**
 * General settings component
 *
 * Contains all general application settings including theme and file storage
 */
export const GeneralSettings = React.memo(() => {
  return <ThemeSettings />;
});

export default GeneralSettings;
