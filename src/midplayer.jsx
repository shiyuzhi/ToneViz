// src/midiplayer.jsx

import React, { useState, useRef, useEffect } from "react";
import { Midi } from "@tonejs/midi";
import * as Tone from "tone";

export default function MidiPlayer({ synthsRef }) {
  const builtInSongs = [
    { id: 1001, name: "Canon in D", fileUrl: "/midi/canon.mid" },
    { id: 1002, name: "Twinkle Twinkle", fileUrl: "/midi/twinkle.mid" },
  ];

  const [uploadedSongs, setUploadedSongs] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const partRef = useRef(null);
  const durationRef = useRef(0);
  const volumeRef = useRef(new Tone.Volume(-12).toDestination());

  const songs = [...builtInSongs, ...uploadedSongs];

  // 更新進度條
  useEffect(() => {
    let raf;
    const updateProgress = () => {
      if (isPlaying && durationRef.current > 0) {
        setProgress(Tone.Transport.seconds);
        raf = requestAnimationFrame(updateProgress);
      }
    };
    if (isPlaying) raf = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying]);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const newSong = { id: Date.now(), name: file.name, file };
    setUploadedSongs((prev) => [...prev, newSong]);
  };

  const handlePlayPause = async (song) => {
    if (!song) return;

    if (currentSong?.id !== song.id) {
      setCurrentSong(song);
      if (partRef.current) {
        partRef.current.stop();
        partRef.current.dispose();
        partRef.current = null;
      }

      let arrayBuffer;
      if (song.file) {
        arrayBuffer = await song.file.arrayBuffer();
      } else if (song.fileUrl) {
        const res = await fetch(song.fileUrl);
        arrayBuffer = await res.arrayBuffer();
      }

      const midi = new Midi(arrayBuffer);
      durationRef.current = midi.duration;

      const synth = synthsRef?.current?.piano || new Tone.PolySynth().toDestination();
      synth.disconnect();
      synth.connect(volumeRef.current);

      const events = [];
      midi.tracks.forEach(track =>
        track.notes.forEach(note =>
          events.push({ time: note.time, note: note.name, duration: note.duration, velocity: note.velocity })
        )
      );

      const part = new Tone.Part((time, value) => {
        synth.triggerAttackRelease(value.note, value.duration, time, value.velocity);
      }, events).start(0);

      partRef.current = part;
      if (Tone.Transport.state !== "started") Tone.Transport.start();
      setIsPlaying(true);
    } else {
      if (isPlaying) {
        Tone.Transport.pause();
        setIsPlaying(false);
      } else {
        Tone.Transport.start();
        setIsPlaying(true);
      }
    }
  };

  const handleStop = () => {
  if (partRef.current) {
    Tone.Transport.pause();   // 暫停 Transport
    Tone.Transport.seconds = 0; // 回到開頭
  }
  setIsPlaying(false);
  setProgress(0);
 };

  const handleSeek = (e) => {
    const rect = e.target.getBoundingClientRect();
    const pct = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    if (durationRef.current > 0) {
      Tone.Transport.seconds = durationRef.current * pct;
      setProgress(durationRef.current * pct);
    }
  };

  // ---- Styles ----
  const styles = {
    wrapper: { maxWidth: "400px", margin: "2rem auto", padding: "1rem", backgroundColor: "#111", borderRadius: "12px", color: "#eee", fontFamily: "Segoe UI, sans-serif", boxShadow: "0 4px 20px rgba(0,0,0,0.5)" },
    songList: { display: "flex", gap: "0.5rem", overflowX: "auto", padding: "0.5rem 0" },
    songCard: { flex: "0 0 200px", padding: "0.6rem", borderRadius: "10px", background: "#222", textAlign: "center", transition: "transform 0.2s", cursor: "pointer" },
    songCardActive: { background: "#333", transform: "scale(1.05)" },
    button: { padding: "0.3rem 0.6rem", margin: "0.2rem", border: "none", borderRadius: "6px", background: "#4a90e2", color: "#fff", cursor: "pointer", transition: "background 0.2s" },
    buttonHover: { background: "#357ab8" },
    progressBar: { height: "6px", background: "#333", borderRadius: "3px", marginTop: "0.5rem", cursor: "pointer" },
    progressFilled: { height: "100%", background: "#4a90e2", borderRadius: "3px", width: durationRef.current ? `${(progress / durationRef.current) * 100}%` : "0%" },
    timeText: { fontSize: "0.75rem", color: "#888", textAlign: "right", marginTop: "0.2rem" },
  };

  return (
    <div style={styles.wrapper}>
      <h3 style={{ marginBottom: "0.5rem" }}>MIDI Player</h3>
      <input type="file" accept=".mid" onChange={handleUpload} style={{ width: "100%", marginBottom: "0.5rem" }} />

      <div style={styles.songList}>
        {songs.map(song => (
          <div key={song.id} style={{ ...styles.songCard, ...(currentSong?.id === song.id ? styles.songCardActive : {}) }} onClick={() => handlePlayPause(song)}>
            {song.name}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
        <button style={styles.button} onClick={() => currentSong && handlePlayPause(currentSong)}>{isPlaying ? "暫停" : "播放"}</button>
        <button style={styles.button} onClick={handleStop}>停止</button>
      </div>

      <div style={styles.progressBar} onClick={handleSeek}>
        <div style={styles.progressFilled}></div>
      </div>

      {durationRef.current > 0 && (
        <div style={styles.timeText}>
          {Math.floor(progress / 60)}:{("0" + Math.floor(progress % 60)).slice(-2)} / {Math.floor(durationRef.current / 60)}:{("0" + Math.floor(durationRef.current % 60)).slice(-2)}
        </div>
      )}
    </div>
  );
}
