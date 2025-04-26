import React from 'react';
import * as Switch from '@radix-ui/react-switch';

const SettingsPanel = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-secondary mb-4">Notifications</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700">Email notifications</label>
            <Switch.Root
              className="w-10 h-6 bg-gray-200 rounded-full relative data-[state=checked]:bg-primary transition-colors"
            >
              <Switch.Thumb className="block w-4 h-4 bg-white rounded-full transition-transform duration-100 translate-x-1 will-change-transform data-[state=checked]:translate-x-5" />
            </Switch.Root>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700">Sound effects</label>
            <Switch.Root
              className="w-10 h-6 bg-gray-200 rounded-full relative data-[state=checked]:bg-primary transition-colors"
            >
              <Switch.Thumb className="block w-4 h-4 bg-white rounded-full transition-transform duration-100 translate-x-1 will-change-transform data-[state=checked]:translate-x-5" />
            </Switch.Root>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-secondary mb-4">Appearance</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700">Dark mode</label>
            <Switch.Root
              className="w-10 h-6 bg-gray-200 rounded-full relative data-[state=checked]:bg-primary transition-colors"
            >
              <Switch.Thumb className="block w-4 h-4 bg-white rounded-full transition-transform duration-100 translate-x-1 will-change-transform data-[state=checked]:translate-x-5" />
            </Switch.Root>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-secondary mb-4">Account</h3>
        <div className="space-y-4">
          <button className="w-full px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;