from flask import Flask, send_file
from api import api_bp
import os

app = Flask(__name__, static_folder='static', static_url_path='/static')
app.register_blueprint(api_bp)

@app.route('/')
def index():
    return send_file('index.html')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
