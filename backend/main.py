import requests
import urllib.parse
from datetime import datetime
from flask import Flask, redirect, request, session, jsonify, render_template, render_template_string
from flask_cors import CORS
from dotenv import load_dotenv
import os

load_dotenv()  # Loads variables from .env into environment

app = Flask(__name__)
CORS(app, supports_credentials=True)
app.secret_key = os.environ.get('SECRET_KEY')
CLIENT_ID = os.environ.get('CLIENT_ID')
CLIENT_SECRET = os.environ.get('CLIENT_SECRET')
REDIRECT_URI = os.environ.get('REDIRECT_URI')


AUTH_URL = 'https://accounts.spotify.com/authorize'
TOKEN_URL = 'https://accounts.spotify.com/api/token'
API_BASE_URL = 'https://api.spotify.com/v1/'

def extract_playlist_id(link):
    # Accepts URLs like https://open.spotify.com/playlist/ID or spotify:playlist:ID
    if "open.spotify.com/playlist/" in link:
        return link.split("playlist/")[1].split("?")[0]
    if link.startswith("spotify:playlist:"):
        return link.split(":")[-1]
    return None

@app.route('/', methods=['GET', 'POST'])
def index():
    error = None
    if request.method == 'POST':
        playlist_link = request.form.get('playlist_link', '').strip()
        playlist_id = extract_playlist_id(playlist_link)
        if not playlist_id:
            error = "Invalid Spotify playlist link."
        else:
            session['playlist_id'] = playlist_id
            return redirect('/fetch_tracks')
    return render_template_string('''
        <h1>Spotify Web Player</h1>
        <form method="post">
            <input type="text" name="playlist_link" placeholder="Paste Spotify playlist link" size="60" required>
            <input type="submit" value="Load Playlist">
        </form>
        {% if error %}<p style="color:red">{{ error }}</p>{% endif %}
        <p><a href="/login">Login with Spotify</a></p>
    ''', error=error)

@app.route('/login')
def login():
    scope = 'streaming user-read-email user-read-private user-modify-playback-state playlist-read-private user-read-currently-playing'
    params = {
        'client_id': CLIENT_ID,
        'response_type': 'code',
        'scope': scope,
        'redirect_uri': REDIRECT_URI,
        'show_dialog': True
    }
    auth_url = f"{AUTH_URL}?{urllib.parse.urlencode(params)}"
    return redirect(auth_url)

@app.route('/callback')
def callback():
    if 'error' in request.args:
        return f"Error: {request.args['error']}"
    if 'code' in request.args:
        req_body = {
            'code': request.args['code'],
            'grant_type': 'authorization_code',
            'redirect_uri': REDIRECT_URI,
            'client_id': CLIENT_ID,
            'client_secret': CLIENT_SECRET
        }
        response = requests.post(TOKEN_URL, data=req_body)
        token_info = response.json()
        session['access_token'] = token_info['access_token']
        session['refresh_token'] = token_info['refresh_token']
        session['expires_at'] = datetime.now().timestamp() + token_info['expires_in']
    return redirect('/')

@app.route('/fetch_tracks')
def fetch_tracks():
    if 'access_token' not in session:
        return redirect('/login')
    playlist_id = session.get('playlist_id')
    if not playlist_id:
        return redirect('/')
    headers = {'Authorization': f"Bearer {session['access_token']}"}
    response = requests.get(f"https://api.spotify.com/v1/playlists/{playlist_id}/tracks", headers=headers, params={'limit': 100})
    data = response.json()
    uris = []
    images = []
    for item in data['items']:
        track = item.get('track')
        if track and track.get('uri') and 'spotify:track:' in track['uri']:
            uris.append(track['uri'])
            # Get the largest album image available
            if track.get('album') and track['album'].get('images'):
                images.append(track['album']['images'][0]['url'])
            else:
                images.append(None)
    session['uris'] = uris
    session['images'] = images
    return redirect('/player')

@app.route('/player')
def player():
    if 'access_token' not in session:
        return redirect('/login')
    if not session.get('uris'):
        return '<h2>No available tracks. Please load a playlist first.</h2><p><a href="/">Go back</a></p>'
    return render_template(
        "player.html",
        token=session['access_token'],
        uris=session.get('uris', [])
    )

@app.route('/player_data')
def player_data():
    if 'access_token' not in session or not session.get('uris'):
        return jsonify({'error': 'Not authenticated'}), 401
    return jsonify({
        'token': session['access_token'],
        'uris': session.get('uris', []),
        'images': session.get('images', [])
    })

if __name__ == '__main__':
    app.run(host='127.0.0.1', debug=True)
