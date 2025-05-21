import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface VisualizationProps {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'table' | 'heatmap';
  data: any;
  title?: string;
  description?: string;
}

const Visualization: React.FC<VisualizationProps> = ({
  type,
  data,
  title,
  description,
}) => {
  const getPlotlyConfig = () => {
    switch (type) {
      case 'bar':
        return {
          data: [{
            type: 'bar',
            x: data.map((d: any) => d.x),
            y: data.map((d: any) => d.y),
          }],
          layout: {
            title,
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: { color: '#fff' },
          }
        };

      case 'line':
        return {
          data: [{
            type: 'scatter',
            mode: 'lines+markers',
            x: data.map((d: any) => d.x),
            y: data.map((d: any) => d.y),
          }],
          layout: {
            title,
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: { color: '#fff' },
          }
        };

      case 'pie':
        return {
          data: [{
            type: 'pie',
            labels: data.map((d: any) => d.label),
            values: data.map((d: any) => d.value),
          }],
          layout: {
            title,
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: { color: '#fff' },
          }
        };

      case 'scatter':
        return {
          data: [{
            type: 'scatter',
            mode: 'markers',
            x: data.map((d: any) => d.x),
            y: data.map((d: any) => d.y),
          }],
          layout: {
            title,
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: { color: '#fff' },
          }
        };

      case 'heatmap':
        return {
          data: [{
            type: 'heatmap',
            z: data,
            colorscale: 'Viridis',
          }],
          layout: {
            title,
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: { color: '#fff' },
          }
        };

      case 'table':
        return {
          data: [{
            type: 'table',
            header: {
              values: Object.keys(data[0]),
              align: 'center',
              line: { width: 1, color: '#506784' },
              fill: { color: '#119DFF' },
              font: { color: 'white', size: 12 }
            },
            cells: {
              values: Object.keys(data[0]).map(key => data.map(item => item[key])),
              align: 'center',
              line: { width: 1, color: '#506784' },
              fill: { color: ['#25FEFD', '#272B30'] },
              font: { color: 'white', size: 11 }
            }
          }],
          layout: {
            title,
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: { color: '#fff' },
          }
        };

      default:
        return {
          data: [],
          layout: { title: 'Unsupported visualization type' }
        };
    }
  };

  const config = getPlotlyConfig();

  return (
    <div className="bg-gray-700 rounded-lg p-4">
      {title && (
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      )}
      {description && (
        <p className="text-gray-300 text-sm mb-4">{description}</p>
      )}
      <Plot
        data={config.data}
        layout={{
          ...config.layout,
          width: undefined,
          height: 400,
          margin: { t: 30, r: 10, l: 40, b: 30 },
          showlegend: true,
        }}
        config={{
          responsive: true,
          displayModeBar: true,
          displaylogo: false,
        }}
        className="w-full"
      />
    </div>
  );
};

export default Visualization; 