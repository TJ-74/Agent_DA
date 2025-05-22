import pandas as pd
import numpy as np
from typing import Union, Dict, List, Optional
import io
import sqlite3
import boto3
from sqlalchemy import create_engine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DataLoader:
    def __init__(self):
        self.df = None
        self.original_dtypes = None
        
    def load_data(self, source: Union[str, bytes, pd.DataFrame], source_type: str = 'csv', **kwargs) -> pd.DataFrame:
        """
        Load data from various sources
        
        Args:
            source: Data source (file path, bytes, DataFrame, etc.)
            source_type: Type of data source ('csv', 'sql', 's3', 'excel', 'json')
            **kwargs: Additional arguments for specific loaders
        """
        try:
            if source_type == 'csv':
                if isinstance(source, bytes):
                    self.df = pd.read_csv(io.BytesIO(source), **kwargs)
                else:
                    self.df = pd.read_csv(source, **kwargs)
                    
            elif source_type == 'sql':
                if isinstance(source, str):
                    # SQL connection string
                    engine = create_engine(source)
                    query = kwargs.get('query', 'SELECT * FROM data')
                    self.df = pd.read_sql(query, engine)
                else:
                    raise ValueError("SQL source must be a connection string")
                    
            elif source_type == 's3':
                if isinstance(source, str):
                    # S3 path (s3://bucket/key)
                    s3 = boto3.client('s3')
                    bucket = source.split('/')[2]
                    key = '/'.join(source.split('/')[3:])
                    obj = s3.get_object(Bucket=bucket, Key=key)
                    self.df = pd.read_csv(io.BytesIO(obj['Body'].read()), **kwargs)
                else:
                    raise ValueError("S3 source must be a path string")
                    
            elif source_type == 'excel':
                if isinstance(source, bytes):
                    self.df = pd.read_excel(io.BytesIO(source), **kwargs)
                else:
                    self.df = pd.read_excel(source, **kwargs)
                    
            elif source_type == 'json':
                if isinstance(source, bytes):
                    self.df = pd.read_json(io.BytesIO(source), **kwargs)
                else:
                    self.df = pd.read_json(source, **kwargs)
                    
            else:
                raise ValueError(f"Unsupported source type: {source_type}")
                
            # Store original dtypes
            self.original_dtypes = self.df.dtypes.copy()
            
            return self.df
            
        except Exception as e:
            logger.error(f"Error loading data: {str(e)}")
            raise
            
    def handle_missing_values(self, strategy: str = 'auto', fill_value: Optional[Union[str, int, float]] = None) -> pd.DataFrame:
        """
        Handle missing values in the dataset
        
        Args:
            strategy: Strategy to handle missing values ('auto', 'drop', 'fill', 'interpolate')
            fill_value: Value to fill missing values with (for 'fill' strategy)
        """
        if self.df is None:
            raise ValueError("No data loaded. Call load_data() first.")
            
        try:
            if strategy == 'auto':
                # For numeric columns: fill with median
                # For categorical columns: fill with mode
                # For datetime columns: fill with forward fill
                for col in self.df.columns:
                    if pd.api.types.is_numeric_dtype(self.df[col]):
                        self.df[col] = self.df[col].fillna(self.df[col].median())
                    elif pd.api.types.is_datetime64_dtype(self.df[col]):
                        self.df[col] = self.df[col].fillna(method='ffill')
                    else:
                        self.df[col] = self.df[col].fillna(self.df[col].mode()[0])
                        
            elif strategy == 'drop':
                self.df = self.df.dropna()
                
            elif strategy == 'fill':
                if fill_value is None:
                    raise ValueError("fill_value must be provided for 'fill' strategy")
                self.df = self.df.fillna(fill_value)
                
            elif strategy == 'interpolate':
                self.df = self.df.interpolate()
                
            else:
                raise ValueError(f"Unsupported strategy: {strategy}")
                
            return self.df
            
        except Exception as e:
            logger.error(f"Error handling missing values: {str(e)}")
            raise
            
    def normalize_formats(self) -> pd.DataFrame:
        """
        Normalize data formats and types
        """
        if self.df is None:
            raise ValueError("No data loaded. Call load_data() first.")
            
        try:
            # Convert date-like strings to datetime
            for col in self.df.columns:
                if self.df[col].dtype == 'object':
                    try:
                        self.df[col] = pd.to_datetime(self.df[col])
                    except:
                        pass
                        
            # Convert numeric strings to numbers
            for col in self.df.columns:
                if self.df[col].dtype == 'object':
                    try:
                        self.df[col] = pd.to_numeric(self.df[col])
                    except:
                        pass
                        
            # Standardize string formats
            for col in self.df.columns:
                if self.df[col].dtype == 'object':
                    self.df[col] = self.df[col].str.strip()
                    
            return self.df
            
        except Exception as e:
            logger.error(f"Error normalizing formats: {str(e)}")
            raise
            
    def get_data_info(self) -> Dict:
        """
        Get information about the loaded dataset
        """
        if self.df is None:
            raise ValueError("No data loaded. Call load_data() first.")
            
        try:
            info = {
                'shape': self.df.shape,
                'dtypes': self.df.dtypes.to_dict(),
                'missing_values': self.df.isnull().sum().to_dict(),
                'numeric_columns': self.df.select_dtypes(include=['int64', 'float64']).columns.tolist(),
                'categorical_columns': self.df.select_dtypes(include=['object']).columns.tolist(),
                'datetime_columns': self.df.select_dtypes(include=['datetime64']).columns.tolist(),
            }
            
            # Add basic statistics for numeric columns
            numeric_stats = {}
            for col in info['numeric_columns']:
                numeric_stats[col] = {
                    'mean': self.df[col].mean(),
                    'std': self.df[col].std(),
                    'min': self.df[col].min(),
                    'max': self.df[col].max(),
                    'median': self.df[col].median()
                }
            info['numeric_stats'] = numeric_stats
            
            return info
            
        except Exception as e:
            logger.error(f"Error getting data info: {str(e)}")
            raise 