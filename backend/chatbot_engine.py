import os
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate

def get_chatbot_response(user_message: str, grievance_context: str) -> str:
    # 🟢 Use the same Groq API Key
    api_key = os.getenv("GROQ_API_KEY")
    
    if not api_key:
        return "⚠️ Chat service is currently unavailable (API Key missing)."

    # 🟢 Initialize the Groq Chat Model
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        groq_api_key=api_key,
        temperature=0.7
    )

    # 🟢 Define the system instructions for the chatbot
    system_prompt = (
        "You are 'Jan Samadhan AI', a helpful government grievance assistant.\n"
        "Your goal is to help citizens with their complaints and provide updates.\n"
        "Use the following context about the user's grievances to answer their questions:\n\n"
        "{context}"
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{input}")
    ])

    try:
        # Create the chain and invoke the model
        chain = prompt | llm
        response = chain.invoke({
            "context": grievance_context,
            "input": user_message
        })
        
        return response.content

    except Exception as e:
        print(f"❌ Chatbot Error: {e}")
        return "I'm having trouble connecting to my brain right now. Please try again in a moment!"