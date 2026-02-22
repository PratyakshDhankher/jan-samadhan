from pydantic import BaseModel, Field, EmailStr, BeforeValidator
from typing import Optional, List, Annotated
from datetime import datetime

# Helper for MongoDB ObjectId
PyObjectId = Annotated[str, BeforeValidator(str)]

class User(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    email: EmailStr
    full_name: str
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
    raw_text: Optional[str] = None
    ai_summary: Optional[str] = None
    category: Optional[str] = None
    department: Optional[str] = None
    urgency: int = Field(default=1, ge=1, le=10)
    status: str = "Pending"  # Pending, Resolved
    created_at: datetime = Field(default_factory=datetime.utcnow)

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
