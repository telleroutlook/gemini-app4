import React from 'react';
import { MermaidDiagram } from './MermaidDiagram';
import { EnhancedTable } from './EnhancedTable';

export function DemoContent() {
  const sampleMermaidCode = `
graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> E[Fix the issue]
    E --> B
    C --> F[End]
  `;

  const sampleTableData = {
    headers: ['Name', 'Age', 'City', 'Salary'],
    data: [
      ['John Doe', 30, 'New York', '$75,000'],
      ['Jane Smith', 25, 'Los Angeles', '$65,000'],
      ['Bob Johnson', 35, 'Chicago', '$85,000'],
      ['Alice Brown', 28, 'Houston', '$70,000'],
      ['Charlie Wilson', 32, 'Phoenix', '$80,000'],
      ['Diana Davis', 27, 'Philadelphia', '$72,000'],
      ['Edward Miller', 29, 'San Antonio', '$68,000'],
      ['Fiona Garcia', 31, 'San Diego', '$78,000'],
    ]
  };


  return (
    <div className="space-y-6 p-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Enhanced AI Response Features
        </h2>
        <p className="text-gray-600">
          Your AI responses now support rich content including flowcharts, tables, and more!
        </p>
      </div>

      {/* Mermaid Diagram Demo */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Flowchart Example</h3>
        <MermaidDiagram code={sampleMermaidCode} title="Sample Flowchart" />
      </div>

      {/* Table Demo */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Interactive Table Example</h3>
        <EnhancedTable 
          data={sampleTableData.data} 
          headers={sampleTableData.headers} 
          title="Employee Data"
        />
      </div>


      {/* Usage Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">How to Use</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p><strong>Flowcharts:</strong> Use <code>```mermaid</code> blocks in your AI responses</p>
          <p><strong>Tables:</strong> Use <code>```table</code> blocks with JSON data</p>
          <p><strong>Math:</strong> Use <code>$inline$</code> or <code>$$block$$</code> for mathematical expressions</p>
        </div>
      </div>
    </div>
  );
} 