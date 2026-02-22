import os
import io
import json
import base64
from typing import Union, Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage
from langchain.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field
import ocr_engine

# Define Pydantic model for structured output
class GrievanceAnalysis(BaseModel):
    category: str = Field(description="The category of the grievance (e.g., Water, Roads, Electricity, Sanitation)")
    urgency: int = Field(description="Urgency score from 1 to 10")
    english_summary: str = Field(description="A 2-line summary of the grievance in English")
    department: str = Field(description="The department responsible for addressing the grievance")

# Department Routing Map
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

def analyze_grievance(text: Optional[str] = None, image_bytes: Optional[bytes] = None) -> Optional[GrievanceAnalysis]:
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("Warning: GOOGLE_API_KEY not found.")
        # For dev/test without key, return mock? Or fail.
        # Failing gracefully is better.
        return None

    # Using gemini-1.5-flash which is current equivalent/precursor to 3 Flash in some contexts, 
    # or sticking to 'gemini-pro-vision' if older libs, but 1.5 flash is best for this.
    # Assuming 'gemini-1.5-flash' is the target model string.
    llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=api_key, temperature=0, convert_system_message_to_human=True)
    
    parser = PydanticOutputParser(pydantic_object=GrievanceAnalysis)
    
    base_instructions = (
        "You are an expert grievance analysis AI for 'Jan Samadhan'.\n"
        "Analyze the input and extract the Category, Urgency (1-10), Summary, and Department.\n"
        "Translate the summary to English if the input is in another language.\n"
        "Use the following mapping for Departments if applicable:\n"
        f"{json.dumps(DEPARTMENT_MAP)}\n"
        "{format_instructions}"
    )

    try:
        if image_bytes:
            print("Attempting Gemini Multimodal analysis...")
            image_b64 = base64.b64encode(image_bytes).decode("utf-8")
            
            # Construct Multimodal Message
            # Note: The exact format for image_url in LangChain's ChatGoogleGenerativeAI can be tricky.
            # Using the standard message content list format.
            human_message = HumanMessage(
                content=[
                    {
                        "type": "text", 
                        "text": base_instructions.format(format_instructions=parser.get_format_instructions()) + "\nAnalyze this grievance image."
                    },
                    {
                        "type": "image_url", 
                        "image_url": f"data:image/jpeg;base64,{image_b64}"
                    }
                ]
            )
            
            try:
                response = llm.invoke([human_message])
                return parser.parse(response.content)
            except Exception as e:
                print(f"Gemini Multimodal failed: {e}. Falling back to OCR.")
                # Fallback to OCR
                text = ocr_engine.extract_text(image_bytes)
                if not text.strip():
                    print("OCR extracted no text.")
                    return None
                
                # Proceed to text analysis with extracted text
                print(f"OCR Extracted: {text[:50]}...")

        if text:
            prompt = ChatPromptTemplate.from_messages([
                ("system", base_instructions),
                ("human", "{content}")
            ])
            formatted_prompt = prompt.format_messages(format_instructions=parser.get_format_instructions(), content=text)
            response = llm.invoke(formatted_prompt)
            return parser.parse(response.content)

    except Exception as e:
        print(f"AI Analysis Error: {e}")
        return None

    return None
