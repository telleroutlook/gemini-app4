import React, { useState, useEffect } from 'react';
import { X, Settings, Brain, Sliders, Image, Search, Link, Globe } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import type { ConversationConfig, ThinkingConfig, GenerationConfig, ImageGenerationConfig, GroundingConfig, UrlContextConfig } from '../types/chat';

interface AdvancedSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationConfig: ConversationConfig;
  onSave: (config: ConversationConfig) => void;
  imageConfig: ImageGenerationConfig;
  onImageConfigSave: (config: ImageGenerationConfig) => void;
}

export function AdvancedSettingsModal({
  isOpen,
  onClose,
  conversationConfig,
  onSave,
  imageConfig,
  onImageConfigSave,
}: AdvancedSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'thinking' | 'generation' | 'image' | 'grounding' | 'urlcontext' | 'system' | 'interface'>('thinking');
  const [localConfig, setLocalConfig] = useState<ConversationConfig>(conversationConfig);
  const [localImageConfig, setLocalImageConfig] = useState<ImageGenerationConfig>(imageConfig);

  useEffect(() => {
    setLocalConfig(conversationConfig);
    setLocalImageConfig(imageConfig);
  }, [conversationConfig, imageConfig, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localConfig);
    onImageConfigSave(localImageConfig);
    onClose();
  };

  const updateThinkingConfig = (updates: Partial<ThinkingConfig>) => {
    setLocalConfig(prev => ({
      ...prev,
      thinkingConfig: {
        ...prev.thinkingConfig,
        enabled: prev.thinkingConfig?.enabled ?? true,
        budget: prev.thinkingConfig?.budget ?? 10000,
        showThinkingProcess: prev.thinkingConfig?.showThinkingProcess ?? false,
        ...updates,
      },
    }));
  };

  const updateGenerationConfig = (updates: Partial<GenerationConfig>) => {
    setLocalConfig(prev => ({
      ...prev,
      generationConfig: {
        ...prev.generationConfig,
        temperature: prev.generationConfig?.temperature ?? 0.7,
        topK: prev.generationConfig?.topK ?? 40,
        topP: prev.generationConfig?.topP ?? 0.95,
        maxOutputTokens: prev.generationConfig?.maxOutputTokens ?? 1000000,
        ...updates,
      },
    }));
  };

  const updateImageConfig = (updates: Partial<ImageGenerationConfig>) => {
    setLocalImageConfig(prev => ({
      ...prev,
      ...updates,
    }));
  };

  const updateGroundingConfig = (updates: Partial<GroundingConfig>) => {
    setLocalConfig(prev => ({
      ...prev,
      groundingConfig: {
        ...prev.groundingConfig,
        enabled: prev.groundingConfig?.enabled ?? false,
        useGoogleSearch: prev.groundingConfig?.useGoogleSearch ?? true,
        maxResults: prev.groundingConfig?.maxResults ?? 5,
        ...updates,
      },
    }));
  };

  const updateUrlContextConfig = (updates: Partial<UrlContextConfig>) => {
    setLocalConfig(prev => ({
      ...prev,
      urlContextConfig: {
        ...prev.urlContextConfig,
        enabled: prev.urlContextConfig?.enabled ?? false,
        maxUrls: prev.urlContextConfig?.maxUrls ?? 3,
        urls: prev.urlContextConfig?.urls ?? [],
        ...updates,
      },
    }));
  };

  const tabs = [
    { id: 'thinking' as const, label: 'Thinking Config', icon: Brain },
    { id: 'generation' as const, label: 'Generation Parameters', icon: Sliders },
    { id: 'grounding' as const, label: 'Search Enhancement', icon: Search },
    { id: 'urlcontext' as const, label: 'URL Analysis', icon: Globe },
    { id: 'system' as const, label: 'System Instructions', icon: Settings },
    { id: 'interface' as const, label: 'Interface Settings', icon: Settings },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Advanced Settings</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex">
          {/* Tab Navigation */}
          <div className="w-48 border-r border-gray-200 bg-gray-50">
            <nav className="p-4 space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {activeTab === 'thinking' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Thinking Function Configuration</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Gemini 2.5 models support thinking function, which can improve response quality but will increase response time and token consumption.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Enable Thinking Function</label>
                    <Button
                      variant={localConfig.thinkingConfig?.enabled ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => updateThinkingConfig({ enabled: !localConfig.thinkingConfig?.enabled })}
                    >
                      {localConfig.thinkingConfig?.enabled ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>

                  {localConfig.thinkingConfig?.enabled && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Thinking Budget (Token Count)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          max="50000"
                          step="1000"
                          value={localConfig.thinkingConfig?.budget || 10000}
                          onChange={(e) => updateThinkingConfig({ budget: parseInt(e.target.value) || 10000 })}
                          placeholder="10000"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Set to 0 to completely disable thinking function. Recommended: 10000-20000
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">Show Thinking Process</label>
                        <Button
                          variant={localConfig.thinkingConfig?.showThinkingProcess ? 'primary' : 'outline'}
                          size="sm"
                          onClick={() => updateThinkingConfig({ 
                            showThinkingProcess: !localConfig.thinkingConfig?.showThinkingProcess 
                          })}
                        >
                          {localConfig.thinkingConfig?.showThinkingProcess ? 'Show' : 'Hide'}
                        </Button>
                      </div>
                    </>
                  )}
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Quick Presets</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateThinkingConfig({ enabled: false, budget: 0 })}
                    >
                      🚀 Speed Mode
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateThinkingConfig({ enabled: true, budget: 5000 })}
                    >
                      ⚡ Balanced Mode
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateThinkingConfig({ enabled: true, budget: 15000 })}
                    >
                      🧠 Deep Thinking
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateThinkingConfig({ enabled: true, budget: 30000 })}
                    >
                      🎯 Expert Mode
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'generation' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Generation Parameters</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Adjust these parameters to control AI response creativity and consistency.
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Temperature: {localConfig.generationConfig?.temperature || 0.7}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={localConfig.generationConfig?.temperature || 0.7}
                      onChange={(e) => updateGenerationConfig({ temperature: parseFloat(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Lower values are more conservative and consistent, higher values are more creative
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Top-K: {localConfig.generationConfig?.topK || 40}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      step="1"
                      value={localConfig.generationConfig?.topK || 40}
                      onChange={(e) => updateGenerationConfig({ topK: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Consider the top K most likely tokens
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Top-P: {localConfig.generationConfig?.topP || 0.95}
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={localConfig.generationConfig?.topP || 0.95}
                      onChange={(e) => updateGenerationConfig({ topP: parseFloat(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Nucleus sampling probability threshold
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Output Tokens
                    </label>
                    <Select
                      value={localConfig.generationConfig?.maxOutputTokens?.toString() || '1000000'}
                      onChange={(value) => updateGenerationConfig({ maxOutputTokens: parseInt(value) })}
                      options={[
                        { value: '1024', label: '1,024 (Short Response)' },
                        { value: '2048', label: '2,048 (Medium Response)' },
                        { value: '4096', label: '4,096 (Long Response)' },
                        { value: '8192', label: '8,192 (Detailed Response)' },
                        { value: '16384', label: '16,384 (Very Long Response)' },
                        { value: '32768', label: '32,768 (Extra Long Response)' },
                        { value: '100000', label: '100,000 (Unlimited Level)' },
                        { value: '1000000', label: '1,000,000 (Maximum Unlimited)' },
                      ]}
                    />
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Preset Configurations</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateGenerationConfig({ 
                        temperature: 0.3, topK: 20, topP: 0.8, maxOutputTokens: 4096 
                      })}
                    >
                      📚 Precise Mode
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateGenerationConfig({ 
                        temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 1000000 
                      })}
                    >
⚖️ Balanced Mode
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateGenerationConfig({ 
                        temperature: 0.9, topK: 60, topP: 0.98, maxOutputTokens: 8192 
                      })}
                    >
                      🎨 Creative Mode
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateGenerationConfig({ 
                        temperature: 0.1, topK: 10, topP: 0.7, maxOutputTokens: 2048 
                      })}
                    >
                      🔒 Conservative Mode
                    </Button>
                  </div>
                </div>
              </div>
            )}


            {activeTab === 'grounding' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Google Search Enhancement</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    When enabled, AI can obtain the latest information through Google search to enhance response quality.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-700">Enable Search Enhancement</label>
                      <p className="text-xs text-gray-500 mt-1">
                        Automatically detect questions that need latest information and use Google search
                      </p>
                    </div>
                    <Button
                      variant={localConfig.groundingConfig?.enabled ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => updateGroundingConfig({ enabled: !localConfig.groundingConfig?.enabled })}
                    >
                      {localConfig.groundingConfig?.enabled ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>

                  {localConfig.groundingConfig?.enabled && (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <label className="text-sm font-medium text-gray-700">Use Google Search</label>
                          <p className="text-xs text-gray-500 mt-1">
                            Obtain web content through Google search
                          </p>
                        </div>
                        <Button
                          variant={localConfig.groundingConfig?.useGoogleSearch ? 'primary' : 'outline'}
                          size="sm"
                          onClick={() => updateGroundingConfig({ useGoogleSearch: !localConfig.groundingConfig?.useGoogleSearch })}
                        >
                          {localConfig.groundingConfig?.useGoogleSearch ? 'Enabled' : 'Disabled'}
                        </Button>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Maximum Search Results
                        </label>
                        <Select
                          value={localConfig.groundingConfig?.maxResults?.toString() || '5'}
                          onChange={(value) => updateGroundingConfig({ maxResults: parseInt(value) })}
                          options={[
                            { value: '3', label: '3 Results (Fast)' },
                            { value: '5', label: '5 Results (Recommended)' },
                            { value: '8', label: '8 Results (Detailed)' },
                            { value: '10', label: '10 Results (Comprehensive)' },
                          ]}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Search Enhancement Tips</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Automatically enabled when asking for latest news, events or data</li>
                    <li>• Triggered by keywords like "latest", "current", "today"</li>
                    <li>• Search results will show source links for reference</li>
                    <li>• Enabling will increase response time and token consumption</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'urlcontext' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">URL Content Analysis</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Configure AI's ability to analyze web page content from URLs directly.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-700">Enable URL Analysis</label>
                      <p className="text-xs text-gray-500 mt-1">
                        Allow AI to directly read and analyze web page content
                      </p>
                    </div>
                    <Button
                      variant={localConfig.urlContextConfig?.enabled ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => updateUrlContextConfig({ enabled: !localConfig.urlContextConfig?.enabled })}
                    >
                      {localConfig.urlContextConfig?.enabled ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>

                  {localConfig.urlContextConfig?.enabled && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Maximum URL Count
                        </label>
                        <Select
                          value={localConfig.urlContextConfig?.maxUrls?.toString() || '3'}
                          onChange={(value) => updateUrlContextConfig({ maxUrls: parseInt(value) })}
                          options={[
                            { value: '1', label: '1 URL (Single Page Analysis)' },
                            { value: '3', label: '3 URLs (Recommended)' },
                            { value: '5', label: '5 URLs (Multi-page Comparison)' },
                            { value: '10', label: '10 URLs (Deep Analysis)' },
                          ]}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Preset URL List
                        </label>
                        <div className="space-y-2">
                          {(localConfig.urlContextConfig?.urls || []).map((url, index) => (
                            <div key={index} className="flex gap-2">
                              <Input
                                type="url"
                                value={url}
                                onChange={(e) => {
                                  const newUrls = [...(localConfig.urlContextConfig?.urls || [])];
                                  newUrls[index] = e.target.value;
                                  updateUrlContextConfig({ urls: newUrls });
                                }}
                                placeholder="https://example.com"
                                className="flex-1"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newUrls = (localConfig.urlContextConfig?.urls || []).filter((_, i) => i !== index);
                                  updateUrlContextConfig({ urls: newUrls });
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const currentUrls = localConfig.urlContextConfig?.urls || [];
                              if (currentUrls.length < (localConfig.urlContextConfig?.maxUrls || 3)) {
                                updateUrlContextConfig({ urls: [...currentUrls, ''] });
                              }
                            }}
                            disabled={(localConfig.urlContextConfig?.urls?.length || 0) >= (localConfig.urlContextConfig?.maxUrls || 3)}
                          >
                            <Link className="h-4 w-4 mr-2" />
                            Add URL
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">URL Analysis Features</h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• Support analysis of web page text content, structure and data</li>
                    <li>• Compare information differences between multiple web pages</li>
                    <li>• Automatically extract key information and summaries</li>
                    <li>• Support news, documents, blogs and various web pages</li>
                    <li>• Display URL retrieval status and source information</li>
                  </ul>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-medium text-yellow-900 mb-2">Usage Instructions</h4>
                  <div className="text-sm text-yellow-800 space-y-2">
                    <p>To use URL analysis feature, in the conversation:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Send messages containing URLs directly</li>
                      <li>Or ask "Analyze this webpage: [URL]"</li>
                      <li>Or use "Compare these websites: [URL1], [URL2]"</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'interface' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Interface Settings</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Configure application interface behavior and user experience settings.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-700">Streaming Response</label>
                      <p className="text-xs text-gray-500 mt-1">
                        When enabled, responses will display word by word, providing better feedback experience but may increase latency
                      </p>
                    </div>
                    <Button
                      variant={localConfig.streamingEnabled !== false ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setLocalConfig(prev => ({ ...prev, streamingEnabled: !prev.streamingEnabled }))}
                    >
                      {localConfig.streamingEnabled !== false ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-700">Typewriter Effect</label>
                      <p className="text-xs text-gray-500 mt-1">
                        Add typewriter effect to streaming responses for more natural display
                      </p>
                    </div>
                    <Button
                      variant={localConfig.typewriterEffect !== false ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setLocalConfig(prev => ({ ...prev, typewriterEffect: !prev.typewriterEffect }))}
                    >
                      {localConfig.typewriterEffect !== false ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-700">Smart Loading Indicators</label>
                      <p className="text-xs text-gray-500 mt-1">
                        Display different loading messages based on request type
                      </p>
                    </div>
                    <Button
                      variant={localConfig.smartLoadingIndicators !== false ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setLocalConfig(prev => ({ ...prev, smartLoadingIndicators: !prev.smartLoadingIndicators }))}
                    >
                      {localConfig.smartLoadingIndicators !== false ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-700">Real-time Feedback</label>
                      <p className="text-xs text-gray-500 mt-1">
                        Display detailed status information and progress hints during processing
                      </p>
                    </div>
                    <Button
                      variant={localConfig.realtimeFeedback !== false ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setLocalConfig(prev => ({ ...prev, realtimeFeedback: !prev.realtimeFeedback }))}
                    >
                      {localConfig.realtimeFeedback !== false ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">User Experience Presets</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocalConfig(prev => ({ 
                        ...prev, 
                        streamingEnabled: true,
                        typewriterEffect: true,
                        smartLoadingIndicators: true,
                        realtimeFeedback: true
                      }))}
                    >
                      ✨ Best Experience
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocalConfig(prev => ({ 
                        ...prev, 
                        streamingEnabled: false,
                        typewriterEffect: false,
                        smartLoadingIndicators: false,
                        realtimeFeedback: false
                      }))}
                    >
                      ⚡ Speed Mode
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocalConfig(prev => ({ 
                        ...prev, 
                        streamingEnabled: true,
                        typewriterEffect: false,
                        smartLoadingIndicators: true,
                        realtimeFeedback: true
                      }))}
                    >
⚖️ Balanced Mode
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocalConfig(prev => ({ 
                        ...prev, 
                        streamingEnabled: true,
                        typewriterEffect: true,
                        smartLoadingIndicators: false,
                        realtimeFeedback: false
                      }))}
                    >
                      🎯 Focus Mode
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">System Instructions</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    System instructions can define AI's role and behavior style, applied at the beginning of each conversation.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom System Instructions
                  </label>
                  <textarea
                    value={localConfig.systemInstruction || ''}
                    onChange={(e) => setLocalConfig(prev => ({ ...prev, systemInstruction: e.target.value }))}
                    placeholder="For example: You are a professional programming assistant, skilled at explaining complex technical concepts..."
                    className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave blank to use default general assistant instructions
                  </p>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-medium text-yellow-900 mb-3">Preset Roles</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocalConfig(prev => ({ 
                        ...prev, 
                        systemInstruction: 'You are a professional programming assistant, skilled at explaining complex technical concepts, providing code examples, and helping debug issues. Please answer in a clear, structured manner with specific code examples.' 
                      }))}
                      className="text-left justify-start"
                    >
                      👨‍💻 Programming Assistant
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocalConfig(prev => ({ 
                        ...prev, 
                        systemInstruction: 'You are a professional writing assistant, skilled at helping users improve article structure, language expression and content organization. Please provide specific modification suggestions and explanations.' 
                      }))}
                      className="text-left justify-start"
                    >
                      ✍️ Writing Assistant
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocalConfig(prev => ({ 
                        ...prev, 
                        systemInstruction: 'You are a data analysis expert, skilled at interpreting data, creating charts and providing insights. Please answer questions in a data-driven manner and provide visualization suggestions.' 
                      }))}
                      className="text-left justify-start"
                    >
                      📊 Data Analyst
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocalConfig(prev => ({ 
                        ...prev, 
                        systemInstruction: 'You are a patient teacher, skilled at explaining complex concepts in simple and understandable ways. Please guide learning step by step and provide practice suggestions.' 
                      }))}
                      className="text-left justify-start"
                    >
                      🎓 Teacher
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocalConfig(prev => ({ 
                        ...prev, 
                        systemInstruction: 'You are a creative assistant, skilled at brainstorming, creative design and content creation. Please provide multiple innovative ideas and implementation solutions.' 
                      }))}
                      className="text-left justify-start"
                    >
                      💡 Creative Assistant
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocalConfig(prev => ({ 
                        ...prev, 
                        systemInstruction: '' 
                      }))}
                      className="text-left justify-start"
                    >
                      🤖 Default Assistant
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}