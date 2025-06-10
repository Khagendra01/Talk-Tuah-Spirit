from langgraph.graph import StateGraph, START, END
from langchain_openai import ChatOpenAI
from langchain_core.documents import Document
from typing import TypedDict
import os
from pymongo import MongoClient
from langchain_openai import OpenAIEmbeddings
from pymongo.server_api import ServerApi
from dotenv import load_dotenv

# Note: The following import is the corrected version for the deprecation warning,
# though it is not used in this specific file, it's good practice to update it
# in your project (e.g., in your 'storefigure.py' file).
from langchain_community.vectorstores import MongoDBAtlasVectorSearch


# Load environment variables
load_dotenv()

# Set up OpenAI API key
os.environ["OPENAI_API_KEY"] = os.getenv('OPENAI_API_KEY')

# Initialize MongoDB client
uri = os.getenv('MONGODB_URI')
client = MongoClient(uri, server_api=ServerApi('1'))
dbName = os.getenv('MONGODB_DB_NAME')
collectionName = "vecty"
collection = client[dbName][collectionName]
embeddings = OpenAIEmbeddings()

# Initialize LLM
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
    is_famous: bool

def retrieve(state: State) -> dict:
    """
    Retrieve documents from MongoDB based on the question.
    """
    query_embedding = embeddings.embed_query(state["question"])
    
    results = collection.aggregate([
        {
            "$vectorSearch": {
                "queryVector": query_embedding,
                "path": "embedding",
                "numCandidates": 100,
                "limit": 4,
                "index": "vector_index",
            }
        },
        {
            "$match": {
                "id": state["doc_id"]
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
    
    retrieved_docs = "\n".join([d['text'] for d in results])
    return {"context": retrieved_docs}

# RENAMED the function and node to avoid conflict with the state key
def check_if_famous(state: State) -> dict:
    """
    Check if the person is a well-known public figure.
    """
    messages = [
        {"role": "system", "content": f"Is '{state['name']}' a famous person or a well-known public figure? Answer with 'Yes' or 'No'."},
        {"role": "user", "content": f"Is {state['name']} famous?"}
    ]
    response = llm.invoke(messages)
    is_famous_person = response.content.strip().lower() == "yes"
    return {"is_famous": is_famous_person}

def check_answerable(state: State) -> dict:
    """
    Check if the question can be answered from the context or past conversation.
    """
    context = state["context"]
    # If the context is empty and the person isn't famous, no need to ask the LLM
    if not context and not state.get("is_famous"):
        return {"can_answer": False}

    messages = [
        {"role": "system", "content": f"Determine if the given context or past conversation related to {state['name']} is sufficient to answer the question. Respond with 'Yes' or 'No'."},
        {"role": "user", "content": f"Question: {state['question']}\nContext: {context}\nPast Conversation: {state['pastcon']}"}
    ]
    response = llm.invoke(messages)
    can_answer = response.content.strip().lower() == "yes"
    return {"can_answer": can_answer}

def generate_answer(state: State) -> dict:
    """
    Generate an answer based on the context or general knowledge.
    """
    context = state["context"]
    system_message = (
        f"Act as {state['name']}. Respond in a conversational tone, keeping your answers brief and to the point. "
        "If the context below is not sufficient or empty, use your own general knowledge to answer the question about this person."
    )
    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": f"Question: {state['question']}\nContext: {context}\nPast Conversation: {state['pastcon']}"}
    ]
    response = llm.invoke(messages)
    # Ensure the final answer is tagged correctly for the graph to terminate
    return {"answer": response.content, "can_answer": True}


def rephrase_question(state: State) -> dict:
    """
    Rephrase the question to improve search results.
    """
    messages = [
        {"role": "system", "content": "Rephrase the given question to potentially yield better search results, maintaining the original intent."},
        {"role": "user", "content": f"Original question: {state['question']}"}
    ]
    response = llm.invoke(messages)
    return {"question": response.content}

def increment_attempts(state: State) -> dict:
    """
    Increment the attempts counter.
    """
    return {"attempts": state["attempts"] + 1}

def famous_or_not(state: State) -> str:
    """
    Conditional edge to check if the person is famous.
    """
    # If context is found OR the person is famous, we can potentially answer.
    if state["context"] or state["is_famous"]:
        return "check_answerable"
    # If no context and not famous, try rephrasing
    elif state["attempts"] < 2:
        return "rephrase_question"
    # Exhausted all options
    else:
        return END

def should_continue(state: State) -> str:
    """
    Conditional edge to decide the next step after checking answerability.
    """
    # If the LLM confirmed it can answer (either from context or because the person is famous)
    if state["can_answer"] or state["is_famous"]:
        return "generate_answer"
    elif state["attempts"] < 2:
        return "rephrase_question"
    else:
        return END

# Define the workflow graph
workflow = StateGraph(State)

# Add nodes to the graph
workflow.add_node("retrieve", retrieve)
# RENAMED the node name here
workflow.add_node("check_if_famous", check_if_famous)
workflow.add_node("check_answerable", check_answerable)
workflow.add_node("generate_answer", generate_answer)
workflow.add_node("rephrase_question", rephrase_question)
workflow.add_node("increment_attempts", increment_attempts)

# Define the edges
workflow.add_edge(START, "retrieve")
# UPDATED the edge to point to the renamed node
workflow.add_edge("retrieve", "check_if_famous")

# UPDATED the conditional edge to start from the renamed node
workflow.add_conditional_edges(
    "check_if_famous",
    famous_or_not,
    {
        "check_answerable": "check_answerable",
        "rephrase_question": "rephrase_question",
        "end": END
    }
)

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
workflow.add_edge("generate_answer", END)

# Compile the graph
graph = workflow.compile()


def query_rag_system(did: str, question: str, past_conv: str, name: str) -> str:
    """
    Query the RAG system.
    """
    initial_state = {
        "question": question,
        "context": "",
        "answer": "",
        "attempts": 0,
        "can_answer": False,
        "doc_id": did,
        "pastcon": past_conv,
        "name": name,
        "is_famous": False
    }
    
    result = graph.invoke(initial_state)
    
    # Check for an answer in the final state; otherwise, provide the default message.
    if result.get("answer"):
        return result["answer"]
    else:
        return "I'm sorry, but I don't have enough information to answer that question."

# Example usage:
if __name__ == '__main__':
    doc_id = "some_doc_id" 
    question = "Who is Steve Jobs?"
    past_conversation = ""
    name = "Steve Jobs"

    # Get the answer
    answer = query_rag_system(doc_id, question, past_conversation, name)
    print(f"Question: {question}")
    print(f"Answer: {answer}")

    print("\n" + "="*20 + "\n")

    question_no_context = "What is your favorite color?"
    name_no_context = "Some Random Person"
    answer_no_context = query_rag_system(doc_id, question_no_context, "", name_no_context)
    print(f"Question: {question_no_context}")
    print(f"Answer: {answer_no_context}")