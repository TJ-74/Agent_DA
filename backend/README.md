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

### Local Development
Start the development server:
```bash
uvicorn main:app --reload
```

The server will start at `http://localhost:8000`

### Production Deployment (Render)
For production deployment on Render, the service will automatically:
1. Use the `render.yaml` configuration in the root directory
2. Install dependencies from requirements.txt
3. Start the server using:
```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

Key differences in production:
- No `--reload` flag (not needed in production)
- `--host 0.0.0.0` to accept external connections
- `$PORT` environment variable used instead of hardcoded port

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