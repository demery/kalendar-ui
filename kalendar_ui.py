from flask import Flask
from flask import jsonify, request, render_template
import os

BASE_URL = "http://localhost:6000"
# os.path.join(os.path.dirname(os.path.abspath(__file__)), '../static/app')
ASSETS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public')

app = Flask(__name__, template_folder=ASSETS_DIR, static_folder=ASSETS_DIR)

@app.route('/')
def root():
  # return app.send_static_file(os.path.join('public', 'index.html'))
  return render_template('index.html')

@app.route('/js/<path:path>')
def static_proxy(path):
    # send_static_file will guess the correct MIME type
    return app.send_static_file(os.path.join('js', path))

if __name__ == "__main__":
  app.run(debug=True)