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
collectionName = "hf"
collection = client[dbName][collectionName]

hf_token = os.getenv('HF_TOKEN')
embedding_url = os.getenv('HF_EMBEDDING_URL')

def generate_embedding(text: str) -> list[float]:
	response = requests.post(
		embedding_url,
		headers={"Authorization": f"Bearer {hf_token}"},
		json={"inputs": text})
	if response.status_code != 200:
		raise ValueError(f"Request failed with status code {response.status_code}: {response.text}")
	return response.json()

# txt = "Ronaldo began his senior career with Sporting CP, before signing with Manchester United in 2003, winning the FA Cup in his first season. He went on to win three consecutive Premier League titles, the Champions League and the FIFA Club World Cup; at age 23, he won his first Ballon d'Or. Ronaldo was the subject of the then-most expensive association football transfer when he signed for Real Madrid in 2009 in a transfer worth €94 million (£80 million"
# embd = generate_embedding(txt)
# document_to_insert = {
#         "id": 1,
#         "text": txt,
#         "embedding": embd
#     }
    
#     # Insert the document into the collection
# collection.insert_one(document_to_insert)

def query_data_with_id(query, doc_id):
    # Convert question to vector using OpenAI embeddings
    query_embedding = generate_embedding(query)
    
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

# # Example usage
# query = "33 trophies"
# doc_id = 1
# results = query_data_with_id(query, doc_id)
# tmp=""
# for d in results:
# 	tmp += d['text']
# print(tmp)