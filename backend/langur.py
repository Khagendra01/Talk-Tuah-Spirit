from langgraph.graph import StateGraph, START, END
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document
from typing import List, TypedDict, Tuple
import os
from pymongo import MongoClient
from langchain_openai import OpenAIEmbeddings
from pymongo.server_api import ServerApi
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set up OpenAI API key
os.environ["OPENAI_API_KEY"] = os.getenv('OPENAI_API_KEY')

uri = os.getenv('MONGODB_URI')
client = MongoClient(uri, server_api=ServerApi('1'))
dbName = os.getenv('MONGODB_DB_NAME')
collectionName = "vecty"
collection = client[dbName][collectionName]
embeddings = OpenAIEmbeddings()

hf_token = os.getenv('HF_TOKEN')
embedding_url = os.getenv('HF_EMBEDDING_URL')

llm = ChatOpenAI(model="gpt-4o")


class State(TypedDict):
    question: str
    context: str
    pastcon: str
    answer: str
    attempts: int
    can_answer: bool
    doc_id: int
    name: str

def retrieve(state: State) -> dict:
        # Convert question to vector using OpenAI embeddings
    query_embedding = embeddings.embed_query(state["question"])
    
    # Perform Atlas Vector Search with filtering by id
    results = collection.aggregate([
        {
            "$vectorSearch": {
                "queryVector": query_embedding,
                "path": "embedding",
                "numCandidates": 100,
                "limit": 4,
                "index": "vector_index",  # Ensure this matches your index name
            }
        },
		{
            "$match": {
                "id": state["doc_id"]  # Filter by the specified id
            }
        },
        {
            "$project": {
                "_id": 0,
                "text": 1,
                "score": {"$meta": "vectorSearchScore"}
            }
        }
    ])
    
    retrieved_docs=""
    for d in results:
        retrieved_docs += d['text'] + "\n"
    return {"context": retrieved_docs}

def check_answerable(state: State) -> dict:
    context = state["context"]
    messages = [
        {"role": "system", "content": "Determine if the given context or past conversation is sufficient to answer the question. Respond with 'Yes' or 'No'."},
        {"role": "user", "content": f"Question: {state['question']}\nContext: {context}\nPast Conversation: {state['pastcon']}"}
    ]
    response = llm.invoke(messages)
    can_answer = response.content.strip().lower() == "yes"
    return {"can_answer": can_answer}

def generate_answer(state: State) -> dict:
    context = state["context"]
    messages = [
        {"role": "system", "content": f"Act as {state['question']}. Respond in a conversational tone, keeping your answers brief and to the point, as if chatting or speaking casually."},
        {"role": "user", "content": f"Question: {state['question']}\nContext: {context}\nPast Conversation: {state['pastcon']}"}
    ]
    response = llm.invoke(messages)
    return {"answer": response.content}

def rephrase_question(state: State) -> dict:
    messages = [
        {"role": "system", "content": "Rephrase the given question to potentially yield better search results. Maintain the original intent."},
        {"role": "user", "content": f"Original question: {state['question']}"}
    ]
    response = llm.invoke(messages)
    return {"question": response.content}

def increment_attempts(state: State) -> dict:
    return {"attempts": state["attempts"] + 1}

def should_continue(state: State) -> str:
    if state["can_answer"]:
        return "generate_answer"
    elif state["attempts"] < 2:
        return "rephrase_question"
    else:
        return "end"


workflow = StateGraph(State)

# Add nodes
workflow.add_node("retrieve", retrieve)
workflow.add_node("check_answerable", check_answerable)
workflow.add_node("generate_answer", generate_answer)
workflow.add_node("rephrase_question", rephrase_question)
workflow.add_node("increment_attempts", increment_attempts)

# Define edges
workflow.add_edge(START, "retrieve")
workflow.add_edge("retrieve", "check_answerable")
workflow.add_conditional_edges(
    "check_answerable",
    should_continue,
    {
        "generate_answer": "generate_answer",
        "rephrase_question": "rephrase_question",
        "end": END
    }
)
workflow.add_edge("rephrase_question", "increment_attempts")
workflow.add_edge("increment_attempts", "retrieve")

# Compile the graph
graph = workflow.compile()

def query_rag_system(did: str, question: str, past_conv: str, name: str) -> str:
    initial_state = {
        "question": question,
        "context": "",
        "answer": "",
        "attempts": 0,
        "can_answer": False,
        "doc_id": did,
        "pastcon": past_conv,
        "name": name
    }
    result = graph.invoke(initial_state)
    return result["answer"] if result["can_answer"] else "I'm sorry, but I don't have enough information to answer that question."

# # Example usage
# question = "Who is ronaldo?"
# answer = query_rag_system(question)
# print(answer)

