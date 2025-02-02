from langchain.vectorstores import MongoDBAtlasVectorSearch
from pymongo.server_api import ServerApi
import requests
from pymongo import MongoClient
from bson.objectid import ObjectId

uri = "mongodb+srv://kgen4295:JGPJK8hezcBuv281@hackru.aj4m8.mongodb.net/?retryWrites=true&w=majority&appName=hackru"
client = MongoClient(uri, server_api=ServerApi('1'))
dbName = "talktuah"
collectionName = "figures"
figurescollection = client[dbName][collectionName]

def insertfigure(data):
    return figurescollection.insert_one(data)

def getfigures(figure_id=None):
    if figure_id:
        try:
            object_id = ObjectId(figure_id)
            figure = figurescollection.find_one({"_id": object_id})
            if figure:
                figure['_id'] = str(figure['_id'])
                return figure
            else:
                return {"error": "Document not found"}
        except Exception as e:
            return {"error": f"Invalid ID format: {str(e)}"}
    else:
        figures_data = list(figurescollection.find({}))
        for figure in figures_data:
            figure['_id'] = str(figure['_id'])
        return figures_data
