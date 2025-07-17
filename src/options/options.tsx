import { createRoot } from 'react-dom/client';

const Options = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold mb-4">AI Note Taker - Settings</h1>
      <p className="text-gray-700">Advanced settings and customization will appear here.</p>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Options />);
} 