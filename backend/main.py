from fastapi import FastAPI, UploadFile, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io
from typing import List, Optional, Dict
from utils.data_analysis import generate_summary_stats
from utils.r2_storage import R2Storage
from utils.data_loader import DataLoader
import numpy as np
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()
r2_storage = R2Storage()
data_loader = DataLoader()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/upload")
async def upload_file(file: UploadFile):
    try:
        # Read the file content
        content = await file.read()
        
        # Upload to R2
        file_key = r2_storage.upload_file(io.BytesIO(content), file.filename)
        
        # Read CSV for analysis
        df = pd.read_csv(io.BytesIO(content))
        
        # Perform analysis
        analysis_result = generate_summary_stats(df)
        
        # Add file information
        analysis_result["filename"] = file.filename
        analysis_result["file_key"] = file_key
        
        return analysis_result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/files/{file_key}")
async def get_file(file_key: str):
    try:
        # Generate a presigned URL for file download
        url = r2_storage.get_file_url(file_key)
        return {"download_url": url}
    except Exception as e:
        raise HTTPException(status_code=404, detail="File not found")

@app.get("/api/analyze/{file_key}")
async def analyze_stored_file(file_key: str):
    try:
        # Download file from R2
        file_obj = r2_storage.download_file(file_key)
        if not file_obj:
            raise HTTPException(status_code=404, detail="File not found")
            
        # Read CSV and analyze
        df = pd.read_csv(file_obj)
        analysis_result = generate_summary_stats(df)
        analysis_result["file_key"] = file_key
        
        return analysis_result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/files/{file_key}")
async def delete_file(file_key: str):
    success = r2_storage.delete_file(file_key)
    if not success:
        raise HTTPException(status_code=404, detail="File not found or could not be deleted")
    return {"message": "File deleted successfully"}

@app.post("/api/chat/analyze/{file_key}")
async def analyze_for_chat(
    file_key: str,
    request: Dict = Body(...),
):
    try:
        logger.info(f"Starting analysis for file: {file_key}")
        
        # Download file from R2
        file_obj = r2_storage.download_file(file_key)
        if not file_obj:
            logger.error(f"File not found: {file_key}")
            raise HTTPException(status_code=404, detail=f"File not found: {file_key}")
            
        try:
            # Use DataLoader to load and preprocess the data
            logger.info("Loading and preprocessing data")
            df = data_loader.load_data(file_obj, source_type='csv')
            
            # Handle missing values and normalize formats
            logger.info("Handling missing values and normalizing formats")
            df = data_loader.handle_missing_values(strategy='auto')
            df = data_loader.normalize_formats()
            
            # Store the cleaned dataset
            cleaned_file_key = f"cleaned_{file_key}"
            cleaned_buffer = io.BytesIO()
            df.to_csv(cleaned_buffer, index=False)
            cleaned_buffer.seek(0)
            r2_storage.upload_file(cleaned_buffer, cleaned_file_key)
            logger.info(f"Stored cleaned dataset with key: {cleaned_file_key}")
            
            # Get the query from the request
            query = request.get("query", "").lower()
            logger.info(f"Processing query: {query}")
            
            # Perform the requested analysis based on the query
            result = {}
            
            try:
                # Get basic data info using DataLoader
                logger.info("Getting basic data info")
                data_info = data_loader.get_data_info()
                
                # Convert dtypes to strings for JSON serialization
                dtypes_dict = {col: str(dtype) for col, dtype in data_info['dtypes'].items()}
                
                result["file_info"] = {
                    "total_rows": int(data_info['shape'][0]),
                    "total_columns": int(data_info['shape'][1]),
                    "column_names": list(data_info['dtypes'].keys()),
                    "column_types": dtypes_dict,
                    "missing_values": {k: int(v) for k, v in data_info['missing_values'].items()},
                    "cleaned_file_key": cleaned_file_key  # Add the cleaned file key to the response
                }
                
                if "summary" in query:
                    logger.info("Generating summary statistics")
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
                
                if "correlation" in query or "relationship" in query:
                    logger.info("Calculating correlations")
                    numeric_cols = data_info['numeric_columns']
                    if len(numeric_cols) > 1:
                        correlations = df[numeric_cols].corr()
                        result["correlations"] = {
                            col: {other_col: float(corr) for other_col, corr in row.items()}
                            for col, row in correlations.to_dict().items()
                        }
                
                if "distribution" in query:
                    logger.info("Calculating distributions")
                    distributions = {}
                    for col, stats in data_info['numeric_stats'].items():
                        distributions[col] = {
                            k: float(v) if isinstance(v, (np.float32, np.float64)) else v
                            for k, v in stats.items()
                        }
                    result["distributions"] = distributions
                
                if "unique" in query or "categories" in query:
                    logger.info("Analyzing categories")
                    categories = {}
                    for col in data_info['categorical_columns']:
                        value_counts = df[col].value_counts()
                        categories[col] = {
                            "unique_values": {str(k): int(v) for k, v in value_counts.to_dict().items()},
                            "total_unique": int(len(value_counts))
                        }
                    result["categories"] = categories
                    
                if "missing" in query:
                    logger.info("Analyzing missing values")
                    result["missing_values_analysis"] = {
                        "missing_counts": {k: int(v) for k, v in data_info['missing_values'].items()},
                        "missing_percentages": {
                            col: float((count / data_info['shape'][0]) * 100)
                            for col, count in data_info['missing_values'].items()
                        }
                    }
                    
                if "types" in query or "schema" in query:
                    logger.info("Getting data types")
                    result["data_types"] = {
                        "numeric_columns": data_info['numeric_columns'],
                        "categorical_columns": data_info['categorical_columns'],
                        "datetime_columns": data_info['datetime_columns']
                    }
                
                logger.info("Analysis completed successfully")
                return result
                
            except Exception as e:
                logger.error(f"Error during data analysis: {str(e)}")
                raise HTTPException(
                    status_code=400,
                    detail=f"Error during data analysis: {str(e)}"
                )
                
        except Exception as e:
            logger.error(f"Error during data preprocessing: {str(e)}")
            raise HTTPException(
                status_code=400,
                detail=f"Error during data preprocessing: {str(e)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in chat analysis: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )

@app.post("/api/load-data")
async def load_data(
    file: Optional[UploadFile] = None,
    source_type: str = 'csv',
    connection_string: Optional[str] = None,
    s3_path: Optional[str] = None,
    missing_values_strategy: str = 'auto',
    normalize: bool = True
):
    try:
        if file:
            content = await file.read()
            df = data_loader.load_data(content, source_type=source_type)
        elif connection_string:
            df = data_loader.load_data(connection_string, source_type='sql')
        elif s3_path:
            df = data_loader.load_data(s3_path, source_type='s3')
        else:
            raise HTTPException(status_code=400, detail="No data source provided")

        # Handle missing values
        df = data_loader.handle_missing_values(strategy=missing_values_strategy)
        
        # Normalize formats if requested
        if normalize:
            df = data_loader.normalize_formats()
            
        # Get data information
        data_info = data_loader.get_data_info()
        
        # Upload to R2 if it was a file upload
        if file:
            file_key = r2_storage.upload_file(io.BytesIO(content), file.filename)
            data_info['file_key'] = file_key
            
        return data_info
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 