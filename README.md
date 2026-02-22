# Jan Samadhan - AI Grievance Redressal System

## Overview
Jan Samadhan is a full-stack AI-powered grievance redressal system. It uses **Google Gemini 3 Flash** for checking grievance urgency and category, and **Tesseract OCR** for processing images with text in Indian languages.

## Tech Stack
- **Backend**: FastAPI, MongoDB (Motor), LangChain, Google Gemini, Tesseract OCR.
- **Frontend**: React 19, TailwindCSS, Recharts.
- **Containerization**: Docker, Docker Compose.

## Project Structure
```
/jan-samadhan
├── backend/            # FastAPI Application
│   ├── main.py         # Entry point & API Routes
│   ├── ai_engine.py    # Gemini & LangChain Logic
│   ├── ocr_engine.py   # Tesseract Logic
│   └── models.py       # Pydantic/MongoDB Models
├── frontend/           # React Application
│   ├── src/components  # GrievanceForm, AdminDashboard
│   └── src/App.jsx     # Routing
└── docker-compose.yml  # Orchestration
```

## Setup & Run

### Prerequisites
- Docker Desktop installed and running.
- Google Cloud API Key (for Gemini).
- Google OAuth Client ID (for Login - Optional if testing via API/mock).

### Environment Variables
For security, you should create a `.env` file in the root `jan-samadhan` directory or export them in your shell. The `docker-compose.yml` expects:
- `GOOGLE_API_KEY`
- `GOOGLE_CLIENT_ID`

### Running the Application
1. Open a terminal in the project root:
   ```powershell
   cd jan-samadhan
   ```

2. Build and start services:
   ```powershell
   # Set your keys first if not in .env
   $env:GOOGLE_API_KEY="your-key-here"
   $env:GOOGLE_CLIENT_ID="your-client-id-here"
   
   docker-compose up --build
   ```

3. Access the Application:
   - **Frontend**: [http://localhost:3000](http://localhost:3000)
   - **Backend API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

## Features
- **Multilingual Support**: Submit grievances in Indian languages (Hindi, Marathi, Tamil, etc.).
- **AI Analysis**: Automatic categorization, urgency scoring (1-10), and translation.
- **Multimodal**: Upload images of handwritten complaints.
- **Admin Dashboard**: Visual analytics of grievances.
