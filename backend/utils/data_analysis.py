import pandas as pd
import numpy as np
from typing import Dict, Any, List, Tuple

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