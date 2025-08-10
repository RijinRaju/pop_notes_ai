import React from 'react';
import { createRoot } from 'react-dom/client';

const Options = () => {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">AI Note Extension Settings</h1>
      <p className="text-gray-600">Settings page coming soon...</p>
    </div>
  );
};

const root = createRoot(document.getElementById('root'));
root.render(<Options />); 