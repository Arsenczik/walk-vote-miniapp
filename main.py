from flask import Flask
from api import api
import os

app = Flask(__name__, static_folder="static")
app.register_blueprint(api, url_prefix="/api")

@app.route("/")
def index():
    return app.send_static_file("index.html")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
    
