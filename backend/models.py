from pydantic import BaseModel, Field, EmailStr, BeforeValidator
from typing import Optional, Annotated
from datetime import datetime

# Helper for MongoDB ObjectId
PyObjectId = Annotated[str, BeforeValidator(str)]

class User(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    email: EmailStr
    full_name: str
    hashed_password: Optional[str] = None  # None for Google-OAuth-only users
    role: str = "citizen"  # citizen, admin

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "email": "citizen@example.com",
                "full_name": "Rajesh Kumar",
                "role": "citizen"
            }
        }

class Grievance(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    citizen_id: str
    image_id: Optional[str] = None  # GridFS ID reference
    original_text: Optional[str] = None
    english_summary: Optional[str] = None
    category: Optional[str] = "Uncategorized"
    department: Optional[str] = "General Administration"
    urgency: int = Field(default=5, ge=1, le=10)
    status: str = "Pending"  # Pending, In-Progress, Resolved
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # 🟢 NEW LOCATION FIELDS
    address: Optional[str] = None
    locality: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    lat: Optional[str] = None
    lng: Optional[str] = None

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "citizen_id": "user_123",
                "department": "Municipal Water Dept",
                "urgency": 8,
                "status": "Pending"
            }
        }