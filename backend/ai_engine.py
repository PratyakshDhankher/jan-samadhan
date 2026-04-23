import os
import json
from typing import Optional

from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field

import ocr_engine

# ------------------- MODEL -------------------
class GrievanceAnalysis(BaseModel):
    category: str = Field(description="Category of grievance")
    urgency: int = Field(description="Urgency from 1 to 10")
    english_summary: str = Field(description="2-line summary in English")
    department: str = Field(description="Responsible department")

# ------------------- DEPT MAP -------------------
DEPARTMENT_MAP = {
    "Water": "Municipal Water Department",
    "Roads": "Public Works Department",
    "Electricity": "State Electricity Board",
    "Sanitation": "Health & Sanitation Department",
    "Education": "Education Department",
    "Health": "Health Department",
    "Police": "City Police",
    "Transport": "Transport Corporation",
    "Other": "General Administration"
}

# ------------------- DEPT CONTACT INFO -------------------
DEPARTMENT_CONTACT_INFO = {
    "Municipal Water Department": {
        "portal_name": "Local PHED / Jal Board",
        "website": "https://water.rajasthan.gov.in/",
        "helpline": "1800-180-6088",
        "sla": "48 Hours",
        "next_step": "A local engineer will inspect the site and update the ticket status."
    },
    "Public Works Department": {
        "portal_name": "State PWD Portal",
        "website": "https://pwd.rajasthan.gov.in/",
        "helpline": "1800-180-1848",
        "sla": "3-5 Working Days",
        "next_step": "Road inspection teams have been notified for surveying."
    },
    "State Electricity Board": {
        "portal_name": "State Electricity Board",
        "website": "https://energy.rajasthan.gov.in/",
        "helpline": "1912",
        "sla": "24 Hours",
        "next_step": "Dispatched to the emergency grid repair team."
    },
    "Health & Sanitation Department": {
        "portal_name": "Local Municipal Corp (LSG)",
        "website": "https://lsg.urban.rajasthan.gov.in/",
        "helpline": "14420",
        "sla": "48 Hours",
        "next_step": "A sanitation officer will be assigned for cleanup scheduling."
    },
    "Education Department": {
        "portal_name": "Shala Darpan (Education)",
        "website": "https://rajshaladarpan.nic.in/",
        "helpline": "14417",
        "sla": "5 Working Days",
        "next_step": "Forwarded to the district education officer."
    },
    "Health Department": {
        "portal_name": "State Health Dept",
        "website": "https://rajswasthya.nic.in/",
        "helpline": "104",
        "sla": "24 Hours",
        "next_step": "Routed to the Chief Medical Officer."
    },
    "City Police": {
        "portal_name": "State Police Portal",
        "website": "https://police.rajasthan.gov.in/",
        "helpline": "112",
        "sla": "Immediate",
        "next_step": "Transferred to the local police station control room."
    },
    "Transport Corporation": {
        "portal_name": "State Transport Dept",
        "website": "https://transport.rajasthan.gov.in/",
        "helpline": "1073",
        "sla": "3 Working Days",
        "next_step": "Logged with the regional transport office."
    },
    "General Administration": {
        "portal_name": "Jan Sampark Portal",
        "website": "https://sampark.rajasthan.gov.in/",
        "helpline": "181",
        "sla": "7 Working Days",
        "next_step": "Your grievance is being routed to the appropriate local official."
    }
}

# ------------------- MAIN FUNCTION -------------------
def analyze_grievance(
    text: Optional[str] = None,
    image_bytes: Optional[bytes] = None
) -> Optional[GrievanceAnalysis]:

    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        print("⚠️ GROQ_API_KEY missing")
        return None

    # 🟢 Switch to Groq
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        groq_api_key=api_key,
        temperature=0
    )

    parser = PydanticOutputParser(pydantic_object=GrievanceAnalysis)

    base_instructions = (
        "You are an expert AI for Jan Samadhan.\n"
        "Analyze the grievance and extract the required fields.\n"
        "Assign the correct department using this map: {dept_map}\n"
        "{format_instructions}"
    )

    try:
        combined_text = text or ""
        
        if image_bytes:
            print("📷 Using OCR fallback")
            ocr_text = ocr_engine.extract_text(image_bytes)
            if ocr_text and ocr_text.strip():
                combined_text += f"\n[Extracted from Image]: {ocr_text}"

        if combined_text.strip():
            prompt = ChatPromptTemplate.from_messages([
                ("system", base_instructions),
                ("human", "{content}")
            ])

            formatted = prompt.format_messages(
                format_instructions=parser.get_format_instructions(),
                content=combined_text,
                dept_map=json.dumps(DEPARTMENT_MAP) 
            )

            # Groq is much faster than Gemini for this call
            response = llm.invoke(formatted)

            try:
                return parser.parse(response.content)
            except Exception as parse_err:
                print("❌ PARSE ERROR:", parse_err)
                return GrievanceAnalysis(
                    category="Other",
                    urgency=5,
                    english_summary=combined_text[:100],
                    department="General Administration"
                )

    except Exception as e:
        print("❌ AI ERROR:", e)
        return None

    return None