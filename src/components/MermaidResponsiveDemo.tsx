import React, { useState } from 'react';
import { MermaidDiagram } from '../components/MermaidDiagram';

const testDiagrams = {
  flowchart: `flowchart TD
    A[Start] --> B{Logged in?}
    B -->|Yes| C[Show main page]
    B -->|No| D[Show login page]
    C --> E[User actions]
    D --> F[User login]
    F --> C
    E --> G{Need more actions?}
    G -->|Yes| E
    G -->|No| H[End]`,
    
  horizontalFlowchart: `flowchart LR
    A[User Request] --> B[API Gateway]
    B --> C[Authentication]
    C --> D[Business Logic]
    D --> E[Database]
    E --> F[Return Result]
    F --> G[Response Processing]
    G --> H[Return to User]`,
    
  sequence: `sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API Server
    participant D as Database
    
    U->>F: Login request
    F->>A: Verify credentials
    A->>D: Query user info
    D-->>A: Return user data
    A-->>F: Return JWT token
    F-->>U: Login successful`,
    
  gantt: `gantt
    title Project Development Plan
    dateFormat  YYYY-MM-DD
    section Design Phase
    Requirements Analysis  :a1, 2024-01-01, 30d
    UI/UX Design          :a2, after a1, 20d
    section Development Phase
    Frontend Development  :b1, 2024-02-01, 45d
    Backend Development   :b2, 2024-02-01, 45d
    section Testing Phase
    Unit Testing         :c1, after b1, 15d
    Integration Testing  :c2, after b2, 15d`,
    
  pie: `pie title Technology Stack Usage
    "React" : 35
    "Node.js" : 25
    "Python" : 20
    "TypeScript" : 15
    "Others" : 5`
};

export function MermaidResponsiveDemo() {
  const [selectedDiagram, setSelectedDiagram] = useState<keyof typeof testDiagrams>('flowchart');
  const [containerWidth, setContainerWidth] = useState('100%');

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Mermaid Responsive Chart Demo</h1>
      
      {/* 控制面板 */}
      <div className="mb-8 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Select chart type:</label>
          <select 
            value={selectedDiagram}
            onChange={(e) => setSelectedDiagram(e.target.value as keyof typeof testDiagrams)}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="flowchart">Vertical Flowchart</option>
            <option value="horizontalFlowchart">Horizontal Flowchart</option>
            <option value="sequence">Sequence Diagram</option>
            <option value="gantt">Gantt Chart</option>
            <option value="pie">Pie Chart</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Container width test:</label>
          <div className="flex space-x-2">
            {['100%', '80%', '60%', '40%'].map(width => (
              <button
                key={width}
                onClick={() => setContainerWidth(width)}
                className={`px-4 py-2 rounded-md border ${
                  containerWidth === width 
                    ? 'bg-blue-500 text-white border-blue-500' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {width}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 图表展示区域 */}
      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">MermaidDiagram Component</h2>
          <div 
            className="border border-gray-200 rounded-lg p-4 transition-all duration-300"
            style={{ width: containerWidth }}
          >
            <MermaidDiagram
              code={testDiagrams[selectedDiagram]}
              title={`${selectedDiagram} Example`}
              enableExport={true}
            />
          </div>
        </div>

        {/* 代码展示 */}
        <div>
          <h3 className="text-lg font-medium mb-2">Mermaid Code:</h3>
          <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
            <code>{testDiagrams[selectedDiagram]}</code>
          </pre>
        </div>

        {/* 响应式说明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium mb-3">Responsive Features:</h3>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong>Smart Size Adjustment:</strong> Charts automatically adjust size and font based on container size</li>
            <li><strong>Responsive Design:</strong> Supports automatic re-rendering on window size changes</li>
            <li><strong>Type Optimization:</strong> Different chart types have specialized size optimization strategies</li>
            <li><strong>Zoom Functionality:</strong> Users can manually adjust chart zoom ratio</li>
            <li><strong>Mobile Adaptation:</strong> Special font and spacing optimization on small screen devices</li>
            <li><strong>Performance Optimization:</strong> Uses useLayoutEffect and debouncing to avoid frequent re-rendering</li>
          </ul>
        </div>
      </div>
    </div>
  );
}