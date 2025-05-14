let deviceId = null;
let player = null;
let currentIndex = 0;

window.onSpotifyWebPlaybackSDKReady = () => {
    player = new Spotify.Player({
        name: 'Flask Web Player',
        getOAuthToken: cb => { cb(token); },
        volume: 0.5
    });

    player.addListener('ready', ({ device_id }) => {
        deviceId = device_id;
        document.getElementById('status').innerText = "Player ready!";
        fetch('https://api.spotify.com/v1/me/player', {
            method: 'PUT',
            body: JSON.stringify({ device_ids: [device_id], play: false }),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
        });
    });

    player.connect();
};

function play() {
    if (!deviceId) {
        alert("Device not ready yet. Please wait.");
        return;
    }
    if (uris.length === 0) {
        alert("No tracks available to play.");
        return;
    }
    fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            uris: [uris[currentIndex]]
        })
    }).then(res => {
        if (res.status === 204) {
            document.getElementById('status').innerText = "Playing track " + (currentIndex + 1) + " of " + uris.length;
            document.getElementById('playPauseBtn').innerText = "Pause";
            setTimeout(updateAlbumArt, 1000);
        } else {
            res.json().then(data => {
                document.getElementById('status').innerText = "Error: " + JSON.stringify(data);
            });
        }
    });
}

function togglePlayPause() {
    if (!player || !deviceId) {
        alert("Device not ready yet. Please wait.");
        return;
    }

    player.getCurrentState().then(state => {
        if (!state) {
            play();
        } else if (state.paused) {
            player.resume().then(() => {
                document.getElementById('status').innerText = "Resumed playback";
                document.getElementById('playPauseBtn').innerText = "Pause";
                setTimeout(updateAlbumArt, 500);
            });
        } else {
            player.pause().then(() => {
                document.getElementById('status').innerText = "Paused playback";
                document.getElementById('playPauseBtn').innerText = "Play";
            });
        }
    });
}

function nextSong() {
    if (uris.length === 0) return;
    currentIndex = (currentIndex + 1) % uris.length;
    play();
}

function prevSong() {
    if (uris.length === 0) return;
    currentIndex = (currentIndex - 1 + uris.length) % uris.length;
    play();
}

function updateAlbumArt() {
    fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(res => {
        if (res.status === 204 || res.status === 202) {
            document.getElementById('albumArt').style.display = 'none';
            document.getElementById('trackInfo').innerText = "";
            return null;
        }
        return res.json();
    })
    .then(data => {
        if (!data || !data.item || !data.item.album || !data.item.album.images) return;

        const imageUrl = data.item.album.images[0].url;
        const albumArtImg = document.getElementById('albumArt');
        albumArtImg.src = imageUrl;
        albumArtImg.style.display = 'block';

        document.getElementById('trackInfo').innerText = `${data.item.name} — ${data.item.artists[0].name}`;
    });
}
