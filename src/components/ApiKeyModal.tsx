import React, { useState, useEffect } from 'react';
import { X, Key, ExternalLink, Plus, Trash2, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { Button } from './ui/Button';
import { parseApiKeys, maskApiKey } from '../utils/env';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentApiKeys: string[];
  onSave: (apiKeys: string[]) => void;
}

export function ApiKeyModal({
  isOpen,
  onClose,
  currentApiKeys,
  onSave,
}: ApiKeyModalProps) {
  const [apiKeysText, setApiKeysText] = useState('');
  const [showKeys, setShowKeys] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [actualApiKeys, setActualApiKeys] = useState<string[]>([]); // Store the actual keys separately

  // Initialize with comma-separated keys when modal opens
  useEffect(() => {
    if (isOpen) {
      setActualApiKeys(currentApiKeys);
      const keysToDisplay = showKeys 
        ? currentApiKeys.join(', ')
        : currentApiKeys.map(maskApiKey).join(', ');
      setApiKeysText(keysToDisplay);
    }
  }, [isOpen, currentApiKeys, showKeys]);

  const handleSave = () => {
    // If showing masked keys, use the actual keys; otherwise parse the text
    const keys = showKeys ? parseApiKeys(apiKeysText) : actualApiKeys;
    onSave(keys);
    onClose();
  };

  const handleToggleShowKeys = () => {
    const newShowKeys = !showKeys;
    setShowKeys(newShowKeys);
    
    if (newShowKeys) {
      // Switch to showing actual keys
      setApiKeysText(actualApiKeys.join(', '));
    } else {
      // Switch to showing masked keys
      setApiKeysText(actualApiKeys.map(maskApiKey).join(', '));
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setApiKeysText(newText);
    
    // If we're showing actual keys, update the actual keys array
    if (showKeys) {
      setActualApiKeys(parseApiKeys(newText));
    }
  };

  const handleAddKey = () => {
    if (showKeys) {
      setApiKeysText(prev => prev + ', ');
    } else {
      // Show a message or automatically switch to show mode for editing
      setShowKeys(true);
      setApiKeysText(actualApiKeys.join(', ') + ', ');
    }
  };

  const handleClearKeys = () => {
    setApiKeysText('');
    setActualApiKeys([]);
  };

  const handleCopyKey = async (key: string, index: number) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy key:', err);
    }
  };

  const validKeys = showKeys ? parseApiKeys(apiKeysText) : actualApiKeys;

  const displayKeys = showKeys ? validKeys : validKeys.map(maskApiKey);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <Key className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">API Key Configuration</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              You need Google AI Studio API keys to use Gemini. Get yours for free:
            </p>
            <a
              href="https://makersuite.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm font-medium mt-2"
            >
              <span>Get API Key</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Gemini API Keys (comma-separated)
              </label>
              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleShowKeys}
                  className="text-xs"
                >
                  {showKeys ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                  {showKeys ? 'Hide' : 'Show'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddKey}
                  className="text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Key
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearKeys}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </div>
            </div>
            
            <textarea
              value={apiKeysText}
              onChange={handleTextChange}
              placeholder="Enter your Gemini API keys (comma-separated)..."
              className="w-full h-24 p-3 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              style={!showKeys ? {userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none'} : {}}
              readOnly={!showKeys}
            />
            
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                {validKeys.length} valid key{validKeys.length !== 1 ? 's' : ''} detected
              </span>
              <span>
                Keys will be used in round-robin mode for better reliability
              </span>
            </div>
          </div>

          {/* Display masked keys */}
          {validKeys.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Current API Keys:
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {displayKeys.map((displayKey, index) => (
                  <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded border">
                    <code className="flex-1 font-mono text-sm select-none user-select-none" style={{userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none'}}>
                      {displayKey}
                    </code>
                    {showKeys && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyKey(validKeys[index], index)}
                        className="text-xs"
                        title="Copy API key"
                      >
                        {copiedIndex === index ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Round-robin functionality:</strong> If one API key fails, the system will automatically try the next key. 
              This provides better reliability and helps manage rate limits.
            </p>
          </div>

          <div className="text-xs text-gray-500">
            Your API keys are stored locally in your browser and never sent to our servers.
          </div>
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={validKeys.length === 0}>
            Save API Keys ({validKeys.length})
          </Button>
        </div>
      </div>
    </div>
  );
}