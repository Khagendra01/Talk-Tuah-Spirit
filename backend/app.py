from flask import Flask, request, jsonify
from flask_cors import CORS
from storefigure import insertfigure, getfigures
from langur import query_rag_system
from mongidb import insert_embed, insert_tribute, get_tributes_by_memorial_id
from datetime import datetime

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Route to handle the POST request
@app.route('/api/addmemorials', methods=['POST'])
def create_memorial():

    data = request.get_json()
    name = data.get('name')
    birth = data.get('birth')
    death = data.get('death')
    image = data.get('image')
    bio = data.get('bio')
    is_alive = data.get('isAlive')
    voice = data.get('voice')

    i_data = {
                "name": name,
                "birth": birth,
                "death": death,
                "image": image,
                "bio": bio,
                "is_alive": is_alive,
                "voice": voice
            }
    res = insertfigure(i_data)
    sid = str(res.inserted_id)
    insert_embed(bio, sid)
    # Return a success response
    return jsonify({
        'status': 'success',
        'message': 'Memorial created successfully'
    }), 201


@app.route('/api/getmemorials', methods=['GET'])
def get_memorials():

    data = getfigures()
    # Return a success response
    return jsonify({
        'data': data
    }), 201

@app.route('/api/getamemorials', methods=['POST'])
def get_a_memorials():

    data = request.get_json()
    figure_id = data.get('id')
    if figure_id:
        data = getfigures(figure_id)   # Fetch all figures
    return jsonify({
        'data': data
    }), 201

@app.route('/api/sendmsg', methods=['POST'])
def send_ai_msg():

    data = request.get_json()

    did = data.get('did')
    question = data.get('question')
    past_convo = data.get('past_convo')
    name = data.get('name')

    reply = query_rag_system(did, question, past_convo, name)
    return jsonify({
        'data': reply
    }), 201

@app.route('/api/tribute', methods=['POST'])
def create_tribute():
    data = request.get_json()
    memorial_id = data.get('memorialId')
    name = data.get('name')
    message = data.get('message')
    has_candle = data.get('hasCandle')
    has_love = data.get('hasLove')

    # Create tribute data structure
    tribute_data = {
        "memorial_id": memorial_id,
        "name": name,
        "message": message,
        "has_candle": has_candle,
        "has_love": has_love,
        "created_at": datetime.utcnow()  # Add timestamp
    }

    # Insert into database (you'll need to create a new function in your database module)
    try:
        insert_tribute(tribute_data)
        return jsonify({
            'status': 'success',
            'message': 'Tribute posted successfully'
        }), 201
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/tributes/<memorial_id>', methods=['GET'])
def get_tributes(memorial_id):
    try:
        tributes = get_tributes_by_memorial_id(memorial_id)
        
        # Convert datetime objects to string format
        for tribute in tributes:
            tribute['created_at'] = tribute['created_at'].strftime("%Y-%m-%d %H:%M:%S")
            
        return jsonify({
            'status': 'success',
            'tributes': tributes
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=5000)