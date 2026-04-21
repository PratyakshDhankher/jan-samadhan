from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate
import os

def get_chatbot_response(user_message: str, grievance_context: str = ""):
    api_key = os.getenv("GOOGLE_API_KEY")

    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
        google_api_key=api_key,
        temperature=0.3
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", """
You are an AI assistant for Jan Samadhan.

- Help users with grievances
- Answer queries
- Be short and clear
- Support Hindi + English
"""),
        ("human", "User: {query}\nContext: {context}")
    ])

    formatted_prompt = prompt.format_messages(
        query=user_message,
        context=grievance_context
    )

    response = llm.invoke(formatted_prompt)
    return response.content
    