from flask import Flask, request, jsonify
from flask_cors import CORS
from storefigure import insertfigure

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Route to handle the POST request
@app.route('/api/memorials', methods=['POST'])
def create_memorial():

    data = request.get_json()
    # name = data.get('name')
    # birth = data.get('birth')
    # death = data.get('death')
    # image = data.get('image')
    # bio = data.get('bio')
    # is_alive = data.get('isAlive')
    # voice = data.get('voice')

    # Here you can process the data, e.g., save it to a database
    # For now, we'll just print it to the console
    print(f"Received memorial data: {data}")

    # Return a success response
    return jsonify({
        'status': 'success',
        'message': 'Memorial created successfully',
        'data': data
    }), 201

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=5000)