import React from 'react';
import { useOllamaModels } from '../../hooks/useOllama';
import { useUIStore } from '../../stores/uiStore';

export const AIPanel: React.FC = () => {
  const { data: modelsData, isLoading, error } = useOllamaModels();
  const { selectedAIModel, setSelectedAIModel } = useUIStore();

  // Extract models array from the response
  const models = modelsData?.models || [];

  // Set default model when models are loaded
  React.useEffect(() => {
    if (models.length > 0 && !selectedAIModel) {
      setSelectedAIModel(models[0].name);
    }
  }, [models, selectedAIModel, setSelectedAIModel]);

  const handleModelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedAIModel(event.target.value);
  };

  return (
    <div className="ai-panel">
      <div className="ai-header">
        <h3>AI Analysis</h3>
      </div>

      <div className="ai-model-selector">
        <label htmlFor="model-select">Select AI Model:</label>
        <select
          id="model-select"
          value={selectedAIModel || ''}
          onChange={handleModelChange}
          disabled={isLoading}
        >
          {isLoading && <option>Loading models...</option>}
          {error && <option>Error loading models</option>}
          {!isLoading && !error && models.length === 0 && (
            <option>No models available</option>
          )}
          {models.map((model) => (
            <option key={model.name} value={model.name}>
              {model.name} ({model.size})
            </option>
          ))}
        </select>
      </div>

      <div className="ai-content">
        <div className="ai-info">
          <div className="info-icon">🤖</div>
          <h4>AI-Powered Stock Analysis</h4>
          <p className="selected-model">
            {selectedAIModel ? `Using model: ${selectedAIModel}` : 'Select a model to begin'}
          </p>
          <p className="description">
            Get AI-powered insights, predictions, and analysis for your selected stock.
            This feature uses Ollama to provide intelligent market analysis.
          </p>
        </div>
      </div>
    </div>
  );
};
