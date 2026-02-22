import os
from fastapi import FastAPI, File, UploadFile, Form, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from typing import Optional, List
from pydantic import ValidationError
from fastapi.concurrency import run_in_threadpool
import json
from bson import ObjectId

# Internal modules
# Try-except block for local running vs docker structure if needed, but assuming standard structure
from models import User, Grievance
from auth import verify_google_token, create_access_token, get_current_user, hash_password, verify_password
import ai_engine

# App & Config
app = FastAPI(title="Jan Samadhan API")
MONGO_URI = os.getenv("MONGO_URI", "mongodb://db:27017")
DB_NAME = "jan_samadhan"

# Rate Limiter Configuration
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database
client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]
fs = AsyncIOMotorGridFSBucket(db)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Auth Routes
@app.post("/auth/google")
async def google_login(token: str = Form(...)):
    try:
        user_info = await verify_google_token(token)
        email = user_info.get("email")
        name = user_info.get("name")
        
        # Upsert user
        user = await db.users.find_one({"email": email})
        if not user:
            user_data = User(email=email, full_name=name, role="citizen")
            # model_dump for Pydantic v2
            result = await db.users.insert_one(user_data.model_dump(by_alias=True, exclude={"id"}))
            role = "citizen"
        else:
            role = user.get("role", "citizen")
            
        access_token = create_access_token(data={"sub": email, "role": role})
        return {"access_token": access_token, "token_type": "bearer", "role": role, "user_name": name}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/auth/register", status_code=201)
async def register(email: str = Form(...), password: str = Form(...), full_name: str = Form(...)):
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_data = User(
        email=email,
        full_name=full_name,
        hashed_password=hash_password(password),
        role="citizen"
    )
    await db.users.insert_one(user_data.model_dump(by_alias=True, exclude={"id"}))
    access_token = create_access_token(data={"sub": email, "role": "citizen"})
    return {"access_token": access_token, "token_type": "bearer", "role": "citizen", "user_name": full_name}

@app.post("/auth/login")
async def login(email: str = Form(...), password: str = Form(...)):
    user = await db.users.find_one({"email": email})
    if not user or not user.get("hashed_password"):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    role = user.get("role", "citizen")
    access_token = create_access_token(data={"sub": email, "role": role})
    return {"access_token": access_token, "token_type": "bearer", "role": role, "user_name": user.get("full_name", "")}


# Grievance Routes
@app.post("/submit", status_code=201)
@limiter.limit("5/minute")
async def submit_grievance(
    request: Request, # Required for limiter
    text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user_email: str = Depends(get_current_user)
):
    user = await db.users.find_one({"email": current_user_email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    citizen_id = str(user["_id"])
    image_id = None
    image_bytes = None

    # Handle File Upload (GridFS)
    if file and file.filename:
        file_content = await file.read()
        image_bytes = file_content
        # Open upload stream to GridFS
        grid_in = fs.open_upload_stream(
            file.filename, metadata={"contentType": file.content_type, "citizen_id": citizen_id}
        )
        await grid_in.write(file_content)
        await grid_in.close()
        image_id = str(grid_in._id)

    # AI Processing (Blocking - Run in Threadpool)
    analysis_result = None
    try:
        # Pass raw text and image bytes to AI engine
        analysis_result = await run_in_threadpool(
            ai_engine.analyze_grievance, text=text, image_bytes=image_bytes
        )
    except Exception as e:
        print(f"Analysis failed: {e}")
    
    # Construct Grievance Object
    grievance_data = Grievance(
        citizen_id=citizen_id,
        image_id=image_id,
        raw_text=text,
        status="Pending"
    )

    if analysis_result:
        grievance_data.category = analysis_result.category
        grievance_data.urgency = analysis_result.urgency
        grievance_data.ai_summary = analysis_result.english_summary
        grievance_data.department = analysis_result.department

    # Save to MongoDB
    result = await db.grievances.insert_one(grievance_data.model_dump(by_alias=True, exclude={"id"}))
    
    return {
        "id": str(result.inserted_id), 
        "message": "Grievance submitted successfully", 
        "ai_analysis": analysis_result.dict() if analysis_result else None
    }

@app.get("/grievances", response_model=List[Grievance])
async def get_grievances(current_user_email: str = Depends(get_current_user)):
    user = await db.users.find_one({"email": current_user_email})
    if not user:
         raise HTTPException(status_code=404, detail="User not found")
    
    # Admin sees all, Citizen sees own
    query = {}
    if user.get("role") != "admin":
        query = {"citizen_id": str(user["_id"])}

    cursor = db.grievances.find(query).sort("created_at", -1)
    grievances = await cursor.to_list(length=100)
    return grievances

@app.get("/stats")
async def get_stats(current_user_email: str = Depends(get_current_user)):
    # Aggregation for Admin Dashboard (Grievances by Category)
    pipeline = [
        {"$group": {"_id": "$category", "count": {"$sum": 1}}}
    ]
    stats = await db.grievances.aggregate(pipeline).to_list(length=None)
    # Format: [{name: 'Water', value: 10}, ...]
    return [{"name": s["_id"] or "Uncategorized", "value": s["count"]} for s in stats]

@app.get("/")
def read_root():
    return {"message": "Jan Samadhan API is running"}
