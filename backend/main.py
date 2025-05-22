from fastapi import FastAPI, UploadFile, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io
from typing import List, Optional, Dict
from utils.data_analysis import generate_summary_stats, DataAnalysisTool, DataCleaningTool
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

# Initialize LangChain tools
data_analysis_tool = DataAnalysisTool(data_loader=data_loader)
data_cleaning_tool = DataCleaningTool(data_loader=data_loader)

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
            # Use DataLoader to load the data
            logger.info("Loading data")
            df = data_loader.load_data(file_obj, source_type='csv')
            
            # Clean the data using LangChain tool
            logger.info("Cleaning data")
            df = data_cleaning_tool._run(df, strategy='auto')
            
            # Store the cleaned dataset
            cleaned_buffer = io.BytesIO()
            df.to_csv(cleaned_buffer, index=False)
            cleaned_buffer.seek(0)
            cleaned_file_key = r2_storage.upload_cleaned_version(cleaned_buffer, file_key)
            logger.info(f"Stored cleaned dataset with key: {cleaned_file_key}")
            
            # Get the query from the request
            query = request.get("query", "").lower()
            logger.info(f"Processing query: {query}")
            
            # Perform analysis using LangChain tool
            try:
                logger.info("Performing analysis")
                result = data_analysis_tool._run(query, df)
                result["file_info"]["cleaned_file_key"] = cleaned_file_key
                
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