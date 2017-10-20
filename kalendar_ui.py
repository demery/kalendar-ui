from flask import Flask
from flask import jsonify, request, render_template
import os

BASE_URL = "http://0.0.0.0:8080"
# os.path.join(os.path.dirname(os.path.abspath(__file__)), '../static/app')
ASSETS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public')

app = Flask(__name__, template_folder=ASSETS_DIR, static_folder=ASSETS_DIR)

@app.route('/')
def root():
  # return app.send_static_file(os.path.join('public', 'index.html'))
  return render_template('index.html')

@app.route('/js/<path:path>')
def js_proxy(path):
    # send_static_file will guess the correct MIME type
    return app.send_static_file(os.path.join('js', path))

@app.route('/lib/<path:path>')
def lib_proxy(path):
    # send_static_file will guess the correct MIME type
    return app.send_static_file(os.path.join('lib', path))

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=8080)
