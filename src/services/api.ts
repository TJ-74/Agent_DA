const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface NumericColumnStats {
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
  q1: number;
  q3: number;
  missing: number;
  missing_percentage: number;
  outliers?: {
    total_outliers: number;
    percentage_outliers: number;
    lower_bound: number;
    upper_bound: number;
  };
}

interface CategoricalColumnStats {
  unique_values: number;
  top_values: Record<string, number>;
  missing: number;
  missing_percentage: number;
}

export interface AnalysisResult {
  filename: string;
  file_key?: string;
  total_rows: number;
  total_columns: number;
  numeric_columns?: Record<string, NumericColumnStats>;
  categorical_columns?: Record<string, CategoricalColumnStats>;
  correlations?: {
    correlation_matrix?: Record<string, Record<string, number>>;
    top_correlations?: Array<{
      column1: string;
      column2: string;
      correlation: number;
    }>;
  };
  sample_data?: any[];
}

export const uploadCSV = async (file: File): Promise<AnalysisResult> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to upload file');
  }

  return response.json();
};

export const getFileDownloadUrl = async (fileKey: string): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}/files/${fileKey}`);
  
  if (!response.ok) {
    throw new Error('Failed to get file download URL');
  }

  const data = await response.json();
  return data.download_url;
};

export const analyzeStoredFile = async (fileKey: string): Promise<AnalysisResult> => {
  const response = await fetch(`${API_BASE_URL}/analyze/${fileKey}`);
  
  if (!response.ok) {
    throw new Error('Failed to analyze file');
  }

  return response.json();
};

export const deleteStoredFile = async (fileKey: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/files/${fileKey}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete file');
  }
};

export async function checkHealth(): Promise<{ status: string; message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
      throw new Error('Health check failed');
    }
    return await response.json();
  } catch (error) {
    console.error('Health check error:', error);
    throw error;
  }
} 