from fastapi import FastAPI, HTTPException, Depends, Form, File, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from typing import Optional, List
import os
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from starlette.concurrency import run_in_threadpool
from chatbot_engine import get_chatbot_response

# Internal modules
from models import User, Grievance
from auth import verify_google_token, create_access_token, get_current_user, hash_password, verify_password
import ai_engine

# ------------------- APP CONFIG -------------------
app = FastAPI(title="Jan Samadhan API")

MONGO_URI = os.getenv("MONGO_URI", "mongodb://db:27017")
DB_NAME = "jan_samadhan"

# ------------------- CORS -------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------- DATABASE -------------------
client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]
fs = AsyncIOMotorGridFSBucket(db)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# ------------------- GLOBAL ERROR HANDLING -------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": "Internal Server Error", "detail": str(exc)}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"error": "Validation Error", "detail": exc.errors()}
    )

# ------------------- AUTH ROUTES -------------------
@app.post("/auth/google")
async def google_login(token: str = Form(...)):
    try:
        user_info = await verify_google_token(token)
        email = user_info.get("email")
        name = user_info.get("name")

        user = await db.users.find_one({"email": email})
        if not user:
            user_data = User(email=email, full_name=name, role="citizen")
            await db.users.insert_one(user_data.model_dump(by_alias=True, exclude={"id"}))
            role = "citizen"
        else:
            role = user.get("role", "citizen")

        access_token = create_access_token(data={"sub": email, "role": role})
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "role": role,
            "user_name": name
        }

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

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": "citizen",
        "user_name": full_name
    }


@app.post("/auth/login")
async def login(email: str = Form(...), password: str = Form(...)):
    user = await db.users.find_one({"email": email})

    if not user or not user.get("hashed_password"):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    role = user.get("role", "citizen")
    access_token = create_access_token(data={"sub": email, "role": role})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": role,
        "user_name": user.get("full_name", "")
    }

# ------------------- GRIEVANCE SUBMIT -------------------
@app.post("/submit", status_code=201)
async def submit_grievance(
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

    # FILE UPLOAD
    if file and file.filename:
        file_content = await file.read()
        image_bytes = file_content

        grid_in = fs.open_upload_stream(
            file.filename,
            metadata={"contentType": file.content_type, "citizen_id": citizen_id}
        )
        await grid_in.write(file_content)
        await grid_in.close()

        image_id = str(grid_in._id)

    # AI ANALYSIS
    analysis_result = None
    try:
        analysis_result = await run_in_threadpool(
            ai_engine.analyze_grievance,
            text=text,
            image_bytes=image_bytes
        )
    except Exception as e:
        print("AI failed:", e)

    # SAVE DATA
    grievance_data = Grievance(
        citizen_id=citizen_id,
        image_id=image_id,
        raw_text=text,
        status="pending",
        category=analysis_result.category if analysis_result else "general",
        urgency=analysis_result.urgency if analysis_result else 5,
        ai_summary=analysis_result.english_summary if analysis_result else "",
        department=analysis_result.department if analysis_result else "unassigned"
    )

    result = await db.grievances.insert_one(
        grievance_data.model_dump(by_alias=True, exclude={"id"})
    )

    return {
        "id": str(result.inserted_id),
        "message": "Grievance submitted successfully",
        "ai_analysis": analysis_result.dict() if analysis_result else None
    }
# ------------------- GET GRIEVANCES -------------------
@app.get("/grievances")
async def get_grievances(
    current_user_email: str = Depends(get_current_user)
):
    user = await db.users.find_one({"email": current_user_email})

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    query = {}
    if user.get("role") != "admin":
        query = {"citizen_id": str(user["_id"])}

    cursor = db.grievances.find(query).sort("created_at", -1)
    return await cursor.to_list(length=100)

# ------------------- ADMIN VIEW -------------------
@app.get("/admin/view")
async def admin_view(current_user_email: str = Depends(get_current_user)):
    user = await db.users.find_one({"email": current_user_email})

    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    cursor = db.grievances.find().sort("created_at", -1)
    return await cursor.to_list(length=200)

# ------------------- UPDATE STATUS -------------------
@app.patch("/grievances/{grievance_id}")
async def update_status(
    grievance_id: str,
    status: str = Form(...),
    current_user_email: str = Depends(get_current_user)
):
    user = await db.users.find_one({"email": current_user_email})

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.get("role") not in ["admin", "department"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await db.grievances.update_one(
        {"_id": ObjectId(grievance_id)},
        {"$set": {"status": status}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Grievance not found")

    return {"message": "Status updated successfully"}

# ------------------- STATS -------------------
@app.get("/stats")
async def get_stats(current_user_email: str = Depends(get_current_user)):
    pipeline = [
        {"$group": {"_id": "$category", "count": {"$sum": 1}}}
    ]

    stats = await db.grievances.aggregate(pipeline).to_list(length=None)

    return [
        {"name": s["_id"] or "Uncategorized", "value": s["count"]}
        for s in stats
    ]

# ------------------- HEALTH -------------------
@app.get("/health")
def health():
    return {"status": "ok"}

# ------------------- ROOT -------------------
@app.get("/")
def root():
    return {"message": "Jan Samadhan API is running"}


@app.post("/chat")
async def chat(
    message: str = Form(...),
    current_user_email: str = Depends(get_current_user)
):
    user = await db.users.find_one({"email": current_user_email})

    grievances = await db.grievances.find(
        {"citizen_id": str(user["_id"])}
    ).to_list(length=5)

    context = "\n".join([
        g.get("ai_summary", "") for g in grievances
    ])

    response = get_chatbot_response(message, context)

    return {"response": response}
