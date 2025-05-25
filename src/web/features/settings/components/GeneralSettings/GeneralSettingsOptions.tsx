// UI Components
import CustomSwitch from '@/components/ui/custom-switch';

// State
import { generalSettingsState$ } from '@/features/settings/state/generalSettingsState';
import { observer } from '@legendapp/state/react';

const GeneralSettingsOptionsComponent: React.FC = () => {
  const enableLinks = generalSettingsState$.enableLinks.get();
  console.log(enableLinks);
  generalSettingsState$.enableLinks.get();
  const generateChatTitles =
    generalSettingsState$.shouldGenerateChatTitles.get();

  const handleGenerateChatTitles = (checked: boolean) => {
    generalSettingsState$.shouldGenerateChatTitles.set(checked);
  };

  const handleEnableLinks = (checked: boolean) => {
    generalSettingsState$.enableLinks.set(checked);
  };

  return (
    <div className="flex items-center w-full">
      <div className="flex flex-col gap-4 w-full">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex flex-col">
            <span className="mr-2">Enable Links</span>
            <span className="text-sm text-muted-foreground max-w-sm">
              Enable links to allow them to open in your default browser.
            </span>
          </div>
          <div className="flex">
            <CustomSwitch
              checked={enableLinks}
              onChange={handleEnableLinks}
              aria-label="Enable link clicking"
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="mr-2">Automatically Generate Chat Titles</span>
            <span className="text-sm text-muted-foreground max-w-sm">
              Enable automatic title generation to create chat titles based on
              initial message content.
            </span>
          </div>
          <div className="flex">
            <CustomSwitch
              checked={generateChatTitles}
              onChange={handleGenerateChatTitles}
              aria-label="Automatically generate chat titles"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export const GeneralSettingsOptions = observer(GeneralSettingsOptionsComponent);
