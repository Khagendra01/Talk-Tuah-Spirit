from flask import Flask, request, jsonify
from flask_cors import CORS
from storefigure import insertfigure, getfigures
from langur import query_rag_system
from mongidb import insert_embed, insert_tribute, get_tributes_by_memorial_id
from datetime import datetime
import os

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Create uploads directory if it doesn't exist
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

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
    try:
        # Get form data
        did = request.form.get('did')
        question = request.form.get('question')
        past_convo = request.form.get('past_convo')
        name = request.form.get('name')
        
        # Handle screenshot file
        if 'screenshot' in request.files:
            screenshot = request.files['screenshot']
            if screenshot:
                # Generate unique filename using timestamp
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                filename = f'screenshot_{timestamp}.png'
                filepath = os.path.join(UPLOAD_FOLDER, filename)
                screenshot.save(filepath)
                print(f'Screenshot saved to: {filepath}')

        reply = query_rag_system(did, question, past_convo, name, filepath)
        return jsonify({
            'data': reply
        }), 201
    except Exception as e:
        print(f'Error processing request: {str(e)}')
        return jsonify({
            'error': str(e)
        }), 500

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