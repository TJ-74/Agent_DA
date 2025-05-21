from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io
from utils.data_analysis import generate_summary_stats
from utils.r2_storage import R2Storage

app = FastAPI()
r2_storage = R2Storage()

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 