from pymongo import MongoClient
from langchain_openai import OpenAIEmbeddings
from langchain.vectorstores import MongoDBAtlasVectorSearch
from pymongo.server_api import ServerApi
import requests
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

uri = os.getenv('MONGODB_URI')
client = MongoClient(uri, server_api=ServerApi('1'))
dbName = os.getenv('MONGODB_DB_NAME')
collectionName = "vecty"
collection = client[dbName][collectionName]

hf_token = os.getenv('HF_TOKEN')
embedding_url = os.getenv('HF_EMBEDDING_URL')

embeddings = OpenAIEmbeddings()

# Sample documents with unique IDs
# documents = [
#     {"id": "doc1", "text": "This is the first document."},
#     {"id": "doc2", "text": "This is the second document."},
#     {"id": "doc3", "text": "This is the third document."},
# ]

# # Generate embeddings and insert into MongoDB
# for doc in documents:
#     # Generate embedding for the text
#     embedding = embeddings.embed_query(doc["text"])
    
#     # Create a document with id, text, and embedding
#     document_to_insert = {
#         "id": doc["id"],
#         "text": doc["text"],
#         "embedding": embedding
#     }
    
#     # Insert the document into the collection
#     collection.insert_one(document_to_insert)

# print("Documents inserted successfully.")

# Define a function to query data with filtering by id
def query_data_with_id(query, doc_id):
    # Convert question to vector using OpenAI embeddings
    query_embedding = embeddings.embed_query(query)
    
    # Perform Atlas Vector Search with filtering by id
    results = collection.aggregate([
        {
            "$vectorSearch": {
                "queryVector": query_embedding,
                "path": "embedding",
                "numCandidates": 100,
                "limit": 1,
                "index": "default",  # Ensure this matches your index name
                "filter": {"id": doc_id}  # Filter by id
            }
        },
        {
            "$match": {
                "id": doc_id  # Filter by the specified id
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
    
    # Return the results
    return list(results)

# Example usage
query = "Cristiano Ronaldo dos Santos Aveiro GOIH ComM (Portuguese pronunciation: [kɾiʃˈtjɐnu ʁɔˈnaldu] ⓘ; born 5 February 1985) is a Portuguese professional footballer who plays as a forward for and captains both the Saudi Pro League club Al Nassr and the Portugal national team. Widely regarded as one of the greatest players of all time, Ronaldo has won numerous individual accolades throughout his career, such as five Ballon d'Or awards, a record three UEFA Men's Player of the Year Awards, four European Golden Shoes, and was named five times the world's best player by FIFA,[note 3] the most by a European player. He has won 33 trophies in his career, including seven league titles, five UEFA Champions Leagues, the UEFA European Championship and the UEFA Nations League."
doc_id = "doc1"
results = query_data_with_id(query, doc_id)
print(results)