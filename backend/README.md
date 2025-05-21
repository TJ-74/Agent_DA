# Data Analyst Backend

A FastAPI-based backend service for analyzing CSV data files.

## Features

- CSV file upload and parsing
- Automatic data analysis for both numeric and categorical columns
- Basic statistical computations
- REST API endpoints
- CORS support for frontend integration

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
```

2. Activate the virtual environment:
- Windows:
```bash
.\venv\Scripts\activate
```
- Unix/MacOS:
```bash
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the Server

Start the development server:
```bash
uvicorn main:app --reload
```

The server will start at `http://localhost:8000`

## API Endpoints

### Upload CSV
- **URL**: `/api/upload-csv`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Parameter**: `file` (CSV file)

### Health Check
- **URL**: `/api/health`
- **Method**: `GET`

## API Documentation

Once the server is running, you can access:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc` 