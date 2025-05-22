import pandas as pd
import numpy as np
from typing import Dict, Any, List, Tuple, Optional, Callable
from langchain.tools import BaseTool
from pydantic import BaseModel, Field
from utils.data_loader import DataLoader
import plotly.express as px
import plotly.graph_objects as go
import base64
from io import BytesIO
import json
import logging

logger = logging.getLogger(__name__)

def analyze_numeric_column(series: pd.Series) -> Dict[str, float]:
    """
    Analyze a numeric column and return basic statistics
    """
    return {
        "mean": float(series.mean()),
        "median": float(series.median()),
        "std": float(series.std()),
        "min": float(series.min()),
        "max": float(series.max()),
        "q1": float(series.quantile(0.25)),
        "q3": float(series.quantile(0.75)),
        "missing": int(series.isna().sum()),
        "missing_percentage": float(series.isna().mean() * 100)
    }

def analyze_categorical_column(series: pd.Series) -> Dict[str, Any]:
    """
    Analyze a categorical column and return statistics
    """
    value_counts = series.value_counts()
    return {
        "unique_values": len(value_counts),
        "top_values": value_counts.head(5).to_dict(),
        "missing": int(series.isna().sum()),
        "missing_percentage": float(series.isna().mean() * 100)
    }

def detect_outliers(series: pd.Series) -> Dict[str, Any]:
    """
    Detect outliers using IQR method
    """
    Q1 = series.quantile(0.25)
    Q3 = series.quantile(0.75)
    IQR = Q3 - Q1
    lower_bound = Q1 - 1.5 * IQR
    upper_bound = Q3 + 1.5 * IQR
    outliers = series[(series < lower_bound) | (series > upper_bound)]
    
    return {
        "total_outliers": len(outliers),
        "percentage_outliers": (len(outliers) / len(series)) * 100,
        "lower_bound": float(lower_bound),
        "upper_bound": float(upper_bound)
    }

def analyze_correlations(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Analyze correlations between numeric columns
    """
    numeric_cols = df.select_dtypes(include=['int64', 'float64']).columns
    if len(numeric_cols) < 2:
        return {"message": "Not enough numeric columns for correlation analysis"}
    
    corr_matrix = df[numeric_cols].corr()
    
    # Get top 5 correlations (excluding self-correlations)
    correlations = []
    for i in range(len(numeric_cols)):
        for j in range(i + 1, len(numeric_cols)):
            correlations.append({
                "column1": numeric_cols[i],
                "column2": numeric_cols[j],
                "correlation": float(corr_matrix.iloc[i, j])
            })
    
    correlations.sort(key=lambda x: abs(x["correlation"]), reverse=True)
    
    return {
        "top_correlations": correlations[:5],
        "correlation_matrix": corr_matrix.to_dict()
    }

def generate_summary_stats(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Generate comprehensive summary statistics for a DataFrame
    """
    summary = {
        "total_rows": len(df),
        "total_columns": len(df.columns),
        "numeric_columns": {},
        "categorical_columns": {},
        "correlations": analyze_correlations(df)
    }
    
    for column in df.columns:
        if df[column].dtype in ['int64', 'float64']:
            summary["numeric_columns"][column] = {
                **analyze_numeric_column(df[column]),
                "outliers": detect_outliers(df[column])
            }
        else:
            summary["categorical_columns"][column] = analyze_categorical_column(df[column])
    
    return summary

def generate_plot(df: pd.DataFrame, plot_type: str, columns: List[str], title: str = "") -> Dict[str, Any]:
    """
    Generate a plotly graph based on the specified type and columns
    """
    try:
        if plot_type == "histogram":
            fig = px.histogram(df, x=columns[0], title=title)
        elif plot_type == "scatter":
            if len(columns) < 2:
                raise ValueError("Scatter plot requires two columns")
            fig = px.scatter(df, x=columns[0], y=columns[1], title=title)
        elif plot_type == "line":
            if len(columns) < 2:
                raise ValueError("Line plot requires two columns")
            fig = px.line(df, x=columns[0], y=columns[1], title=title)
        elif plot_type == "bar":
            if len(columns) < 2:
                raise ValueError("Bar plot requires two columns")
            fig = px.bar(df, x=columns[0], y=columns[1], title=title)
        elif plot_type == "box":
            fig = px.box(df, y=columns[0], title=title)
        elif plot_type == "correlation":
            corr_matrix = df[columns].corr()
            fig = px.imshow(corr_matrix, 
                          title=title or "Correlation Matrix",
                          color_continuous_scale="RdBu")
        else:
            raise ValueError(f"Unsupported plot type: {plot_type}")

        # Convert plot to JSON
        plot_json = fig.to_json()
        return {
            "type": "plot",
            "data": plot_json,
            "plot_type": plot_type
        }
    except Exception as e:
        logger.error(f"Error generating plot: {str(e)}")
        return {
            "type": "error",
            "message": str(e)
        }

class DataAnalysisInput(BaseModel):
    """Input schema for DataAnalysisTool"""
    query: str = Field(description="The analysis query to process")
    df: Any = Field(description="The pandas DataFrame to analyze")

class DataCleaningInput(BaseModel):
    """Input schema for DataCleaningTool"""
    df: Any = Field(description="The pandas DataFrame to clean")
    strategy: str = Field(default="auto", description="Strategy for handling missing values")

class DataAnalysisTool(BaseTool):
    name: str = "data_analysis"
    description: str = "Analyzes data based on the specified query type"
    args_schema: type[BaseModel] = DataAnalysisInput
    data_loader: Optional[DataLoader] = None

    def __init__(self, data_loader: DataLoader):
        super().__init__()
        self.data_loader = data_loader

    def _run(self, query: str, df: pd.DataFrame) -> Dict[str, Any]:
        """Run the analysis based on the query type"""
        try:
            result = {}
            
            # Get basic data info
            data_info = self.data_loader.get_data_info()
            dtypes_dict = {col: str(dtype) for col, dtype in data_info['dtypes'].items()}
            
            # Basic file info
            result["file_info"] = {
                "total_rows": int(data_info['shape'][0]),
                "total_columns": int(data_info['shape'][1]),
                "column_names": list(data_info['dtypes'].keys()),
                "column_types": dtypes_dict,
                "missing_values": {k: int(v) for k, v in data_info['missing_values'].items()}
            }

            # Convert query to lowercase once
            query_lower = query.lower()
            logger.info(f"Processing query: {query_lower}")

            # Handle graph requests first
            plot_keywords = {
                "box": ["box plot", "boxplot", "box-plot"],
                "histogram": ["histogram", "distribution plot"],
                "scatter": ["scatter plot", "scatter-plot", "scatterplot"],
                "line": ["line plot", "line-plot", "lineplot", "trend"],
                "bar": ["bar plot", "bar-plot", "barplot", "bar chart"],
                "correlation": ["correlation plot", "correlation matrix", "correlogram"]
            }

            # Check for plot request
            plot_type = None
            for plot_key, keywords in plot_keywords.items():
                if any(keyword in query_lower for keyword in keywords):
                    plot_type = plot_key
                    break

            if plot_type:
                logger.info(f"Detected plot type: {plot_type}")
                numeric_cols = data_info['numeric_columns']
                if not numeric_cols:
                    raise ValueError("No numeric columns available for plotting")

                # Find mentioned column
                mentioned_col = None
                for col in numeric_cols:
                    if col.lower() in query_lower:
                        mentioned_col = col
                        break
                
                if not mentioned_col:
                    mentioned_col = numeric_cols[0]
                
                logger.info(f"Using column: {mentioned_col} for {plot_type} plot")

                if plot_type == "box":
                    result["plot"] = generate_plot(df, "box", [mentioned_col], f"Box plot of {mentioned_col}")
                elif plot_type == "histogram":
                    result["plot"] = generate_plot(df, "histogram", [mentioned_col], f"Histogram of {mentioned_col}")
                elif plot_type == "scatter" and len(numeric_cols) >= 2:
                    second_col = next((col for col in numeric_cols if col != mentioned_col), numeric_cols[1])
                    result["plot"] = generate_plot(df, "scatter", [mentioned_col, second_col], 
                                                f"Scatter plot of {mentioned_col} vs {second_col}")
                elif plot_type == "correlation" and len(numeric_cols) >= 2:
                    result["plot"] = generate_plot(df, "correlation", numeric_cols, "Correlation Matrix")
                elif plot_type == "line" and len(numeric_cols) >= 2:
                    second_col = next((col for col in numeric_cols if col != mentioned_col), numeric_cols[1])
                    result["plot"] = generate_plot(df, "line", [mentioned_col, second_col], 
                                                f"Line plot of {mentioned_col} vs {second_col}")
                elif plot_type == "bar":
                    categorical_cols = data_info['categorical_columns']
                    if categorical_cols:
                        result["plot"] = generate_plot(df, "bar", [categorical_cols[0], mentioned_col], 
                                                    f"Bar plot of {mentioned_col} by {categorical_cols[0]}")

                if "plot" in result:
                    logger.info("Successfully generated plot")
                else:
                    logger.warning("Failed to generate plot")

            # Process other query types
            if "summary" in query_lower:
                numeric_stats = {}
                for col, stats in data_info['numeric_stats'].items():
                    numeric_stats[col] = {
                        k: float(v) if isinstance(v, (np.float32, np.float64)) else v
                        for k, v in stats.items()
                    }
                result["summary"] = {
                    "shape": [int(x) for x in data_info['shape']],
                    "dtypes": dtypes_dict,
                    "missing_values": {k: int(v) for k, v in data_info['missing_values'].items()},
                    "numeric_stats": numeric_stats
                }
                
            if "correlation" in query_lower or "relationship" in query_lower:
                numeric_cols = data_info['numeric_columns']
                if len(numeric_cols) > 1:
                    correlations = df[numeric_cols].corr()
                    result["correlations"] = {
                        col: {other_col: float(corr) for other_col, corr in row.items()}
                        for col, row in correlations.to_dict().items()
                    }
                    
            if "distribution" in query_lower:
                distributions = {}
                for col, stats in data_info['numeric_stats'].items():
                    distributions[col] = {
                        k: float(v) if isinstance(v, (np.float32, np.float64)) else v
                        for k, v in stats.items()
                    }
                result["distributions"] = distributions
                
            if "unique" in query_lower or "categories" in query_lower:
                categories = {}
                for col in data_info['categorical_columns']:
                    value_counts = df[col].value_counts()
                    categories[col] = {
                        "unique_values": {str(k): int(v) for k, v in value_counts.to_dict().items()},
                        "total_unique": int(len(value_counts))
                    }
                result["categories"] = categories
                
            if "missing" in query_lower:
                result["missing_values_analysis"] = {
                    "missing_counts": {k: int(v) for k, v in data_info['missing_values'].items()},
                    "missing_percentages": {
                        col: float((count / data_info['shape'][0]) * 100)
                        for col, count in data_info['missing_values'].items()
                    }
                }
                
            if "types" in query_lower or "schema" in query_lower:
                result["data_types"] = {
                    "numeric_columns": data_info['numeric_columns'],
                    "categorical_columns": data_info['categorical_columns'],
                    "datetime_columns": data_info['datetime_columns']
                }
                
            return result
            
        except Exception as e:
            logger.error(f"Error in data analysis: {str(e)}")
            raise ValueError(f"Error during data analysis: {str(e)}")

class DataCleaningTool(BaseTool):
    name: str = "data_cleaning"
    description: str = "Cleans the dataset by handling missing values and normalizing formats"
    args_schema: type[BaseModel] = DataCleaningInput
    data_loader: Optional[DataLoader] = None

    def __init__(self, data_loader: DataLoader):
        super().__init__()
        self.data_loader = data_loader

    def _run(self, df: pd.DataFrame, strategy: str = "auto") -> pd.DataFrame:
        """Clean the dataset"""
        try:
            # Handle missing values
            df = self.data_loader.handle_missing_values(strategy=strategy)
            
            # Normalize formats
            df = self.data_loader.normalize_formats()
            
            return df
        except Exception as e:
            logger.error(f"Error in data cleaning: {str(e)}")
            raise ValueError(f"Error during data cleaning: {str(e)}") 