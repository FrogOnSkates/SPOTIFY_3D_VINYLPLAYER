import React, { useEffect, useState, useRef } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, Html, Stars } from "@react-three/drei";
import * as THREE from "three";

// Album disk that rotates while playing
function AlbumDisk({ imageUrl, isPlaying }) {
  const texture = useLoader(THREE.TextureLoader, imageUrl);
  const meshRef = useRef();

  useFrame(() => {
    if (isPlaying && meshRef.current) {
      meshRef.current.rotation.z += 0.01;
    }
  });

  return (
    <mesh ref={meshRef}>
      <circleGeometry args={[1.7, 64]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}

function SpotifyPlayer3D({ token, uris, images }) {
  const [player, setPlayer] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Load Spotify Web Playback SDK
  useEffect(() => {
    window.onSpotifyWebPlaybackSDKReady = () => {
      const _player = new window.Spotify.Player({
        name: "React 3D Player",
        getOAuthToken: cb => cb(token),
        volume: 0.5,
      });

      _player.addListener("ready", ({ device_id }) => setDeviceId(device_id));
      _player.addListener("player_state_changed", (state) => {
        setIsPlaying(state?.paused === false);
      });

      _player.connect();
      setPlayer(_player);
    };

    if (!window.Spotify) {
      const script = document.createElement("script");
      script.src = "https://sdk.scdn.co/spotify-player.js";
      document.body.appendChild(script);
    } else {
      window.onSpotifyWebPlaybackSDKReady();
    }
  }, [token]);

  // Playback functions
  const play = async () => {
    if (!deviceId || !uris.length) return;
    await fetch(
      `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uris: [uris[currentIndex]] }),
      }
    );
  };

  const pause = async () => {
    if (!deviceId) return;
    await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  };

  const togglePlayPause = () => {
    isPlaying ? pause() : play();
  };

  const next = () => setCurrentIndex((i) => (i + 1) % uris.length);
  const prev = () => setCurrentIndex((i) => (i - 1 + uris.length) % uris.length);

  useEffect(() => {
    if (deviceId) play();
    // eslint-disable-next-line
  }, [currentIndex, deviceId]);

  return (
    <Canvas
      style={{
        width: "100vw",
        height: "100vh",
        position: "fixed",
        top: 0,
        left: 0,
        background: "#000000",
        overflow: "hidden"
      }}
      camera={{ position: [0, 0, 7], fov: 50 }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <Stars radius={100} depth={50} count={5000} factor={4} fade />

      {/* Rotating Album Art Disk */}
      {images && images[currentIndex] && (
        <AlbumDisk imageUrl={images[currentIndex]} isPlaying={isPlaying} />
      )}

      <mesh position={[0, -0.6, -0.6]}>
      <boxGeometry args={[4, 4, 1]} />
      <meshStandardMaterial color="#8B4513" /> 
      </mesh>

      <mesh position={[1, -1.2, 0]}
      rotation={[0, 0, Math.PI / 4]}>
      <cylinderGeometry args={[0.1, 0.2, 2, 32]} />
      <meshStandardMaterial color="grey" />
      </mesh>
      <mesh position={[0, 0, 0]}>
       <sphereGeometry args={[0.2, 32, 32]} /> 
       <meshStandardMaterial color="black" /> 
      </mesh>
          <mesh position={[0, 0, -0.05]}
      rotation={[Math.PI/2, 0, 0 ]}>
      <cylinderGeometry args={[2, 2, 0.05, 32]} />
      <meshStandardMaterial attach="material-1" color="#111" metalness={0.8} roughness={0.3}  />
      </mesh>



      {/* UI Controls */}
      <Html center>
          <div
    style={{
      position: "fixed",
      top: "50%",
      right: "-700px",
      transform: "translateY(-50%)",
      background: "rgba(30, 30, 30, 0.85)",
      borderRadius: "18px",
      padding: "28px 36px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      minWidth: "220px",
      zIndex: 10,
    }}
        >
          <h2 style={{ color: "#fff", marginBottom: 16, fontWeight: 600, letterSpacing: 1 }}>
            Spotify 3D Player
          </h2>
          <div style={{ display: "flex", gap: "18px", marginBottom: 12 }}>
            <button
              onClick={prev}
              style={{
                background: "#222",
                color: "#fff",
                border: "none",
                borderRadius: "50%",
                width: 44,
                height: 44,
                fontSize: 18,
                cursor: "pointer",
              }}
            >
              ◀
            </button>
            <button
              onClick={togglePlayPause}
              style={{
                background: "#1db954",
                color: "#fff",
                border: "none",
                borderRadius: "50%",
                width: 54,
                height: 54,
                fontSize: 22,
                fontWeight: "bold",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(30,215,96,0.3)",
                margin: "0 8px",
              }}
            >
              {isPlaying ? "❚❚" : "▶"}
            </button>
            <button
              onClick={next}
              style={{
                background: "#222",
                color: "#fff",
                border: "none",
                borderRadius: "50%",
                width: 44,
                height: 44,
                fontSize: 18,
                cursor: "pointer",
              }}
            >
              ▶
            </button>
          </div>
          <div style={{ color: "#fff", fontSize: 16 }}>
            Track <b>{currentIndex + 1}</b> / {uris.length}
          </div>
        </div>
      </Html>

      <OrbitControls enablePan={false} enableZoom={false} />
    </Canvas>
  );
}

function App() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("http://127.0.0.1:5000/player_data", { credentials: "include" })
      .then((res) => res.json())
      .then(setData);
  }, []);

  if (!data) return <div>Loading...</div>;
  if (data.error) return <div>{data.error}</div>;

  return <SpotifyPlayer3D token={data.token} uris={data.uris} images={data.images} />;
}

export default App;
