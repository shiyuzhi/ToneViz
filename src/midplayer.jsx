// src/MidiPlayer.jsx
import React, { useState } from "react";

export default function MidiPlayer() {
  const [songs, setSongs] = useState([
    { id: 1, name: "Song A", file: null },
    { id: 2, name: "Song B", file: null },
  ]);
  const [currentSong, setCurrentSong] = useState(null);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const newSong = { id: Date.now(), name: file.name, file };
    setSongs((prev) => [...prev, newSong]);
  };

  const handlePlay = (song) => {
    setCurrentSong(song);
    alert(`播放 MIDI: ${song.name} (暫時模擬)`);
  };

  const handleDownload = (song) => {
    if (!song?.file) return;
    const url = URL.createObjectURL(song.file);
    const a = document.createElement("a");
    a.href = url;
    a.download = song.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        padding: "1rem",
        border: "1px solid #888",
        borderRadius: "8px",
        minWidth: "180px",
        overflow: "hidden",
        transition: "max-height 0.3s ease",
      }}
    >
      <h3>MIDI Player / 資料庫</h3>
      <input type="file" accept=".mid" onChange={handleUpload} />
      <ul style={{ marginTop: "1rem" }}>
        {songs.map((song) => (
          <li key={song.id} style={{ marginBottom: "0.5rem" }}>
            <span>{song.name}</span>
            <button onClick={() => handlePlay(song)} style={{ marginLeft: "0.5rem" }}>
              播放
            </button>
            <button onClick={() => handleDownload(song)} style={{ marginLeft: "0.5rem" }}>
              下載
            </button>
          </li>
        ))}
      </ul>

      {currentSong && <div style={{ marginTop: "1rem" }}>正在播放: {currentSong.name}</div>}
    </div>
  );
}
