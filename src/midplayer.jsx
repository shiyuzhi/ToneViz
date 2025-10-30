// MidiPlayer.jsx
import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { Midi } from "@tonejs/midi";
import * as Tone from "tone";

const MidiPlayer = forwardRef(function MidiPlayer({ synthsRef, songs = [], onSongLoaded, onSongUploaded }, ref) {
  const [uploadedSongs, setUploadedSongs] = useState([]);
  const allSongs = [...(songs || []), ...uploadedSongs];
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const partRef = useRef(null);
  const lyricPartRef = useRef(null);
  const durationRef = useRef(0);
  const rafRef = useRef(null);
  const volumeRef = useRef(new Tone.Volume(-12).toDestination());

  // 建立固定 synth，只做一次
  if (!volumeRef.current.synth) {
    volumeRef.current.synth = synthsRef?.current?.piano || new Tone.PolySynth().toDestination();
    volumeRef.current.synth.connect(volumeRef.current);
  }

  useImperativeHandle(ref, () => ({
    playSong: (song) => handleLoadSong(song),
    stop: () => handleStop(),
    getCurrentSong: () => currentSong
  }), [currentSong]);

  const updateProgress = () => {
    setProgress(Tone.Transport.seconds);
    if (isPlaying) rafRef.current = requestAnimationFrame(updateProgress);
  };

  useEffect(() => {
    if (isPlaying) rafRef.current = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    const midi = new Midi(arrayBuffer);
    durationRef.current = midi.duration || 0;

    const lyricsSet = new Set();
    const lyrics = [];
    midi.tracks.forEach(track => {
      track.events?.forEach(ev => {
        if ((ev.subtype === "lyric" || ev.subtype === "text") && ev.text && !lyricsSet.has(ev.text + ev.time)) {
          lyrics.push({ time: ev.time, text: ev.text });
          lyricsSet.add(ev.text + ev.time);
        }
      });
    });
    lyrics.sort((a, b) => a.time - b.time);

    const songObj = { id: Date.now(), name: file.name, file, lyricsJson: lyrics };
    setUploadedSongs(prev => [...prev, songObj]);
    onSongUploaded?.([...uploadedSongs, songObj]);
    onSongLoaded?.(songObj);
    setCurrentSong(songObj);
  };

  const handleLoadSong = async (song) => {
    if (!song) return;

    // 停掉舊 Part
    if (partRef.current) { partRef.current.stop(); partRef.current.dispose(); partRef.current = null; }
    if (lyricPartRef.current) { lyricPartRef.current.stop(); lyricPartRef.current.dispose(); lyricPartRef.current = null; }
    Tone.Transport.stop();
    Tone.Transport.seconds = 0;
    setProgress(0);
    setIsPlaying(false);
    if (currentSong) setCurrentSong(prev => ({ ...prev, lyricsText: "" }));

    setCurrentSong(song);

    let arrayBuffer;
    if (song.file) arrayBuffer = await song.file.arrayBuffer();
    else if (song.fileUrl) {
      const res = await fetch(song.fileUrl);
      arrayBuffer = await res.arrayBuffer();
    }

    const midi = new Midi(arrayBuffer);
    durationRef.current = midi.duration || 0;

    // 解析歌詞
    const lyricsSet = new Set();
    const lyrics = [];
    midi.tracks.forEach(track => {
      track.events?.forEach(ev => {
        if ((ev.subtype === "lyric" || ev.subtype === "text") && ev.text && !lyricsSet.has(ev.text + ev.time)) {
          lyrics.push({ time: ev.time, text: ev.text });
          lyricsSet.add(ev.text + ev.time);
        }
      });
    });
    lyrics.sort((a, b) => a.time - b.time);

    const songWithLyrics = { ...song, lyricsJson: lyrics };
    setCurrentSong(songWithLyrics);
    onSongLoaded?.(songWithLyrics);

    const synth = volumeRef.current.synth;

    // 解析音符
    const events = [];
    midi.tracks.forEach(track =>
      track.notes.forEach(note =>
        events.push({ time: note.time, note: note.name, duration: note.duration, velocity: note.velocity })
      )
    );

    const part = new Tone.Part((time, value) => {
      synth.triggerAttackRelease(value.note, value.duration, time, value.velocity);
    }, events);
    part.start(0);
    partRef.current = part;

    const lyricPart = new Tone.Part((time, value) => {
      setCurrentSong(prev => ({ ...prev, lyricsText: (prev.lyricsText || "") + value.text }));
    }, lyrics.map(l => ({ time: l.time, text: l.text })));
    lyricPart.start(0);
    lyricPartRef.current = lyricPart;
  };

  const handlePlayPause = async () => {
    await Tone.start();
    if (Tone.Transport.state === "started") {
      Tone.Transport.pause();
      setIsPlaying(false);
    } else {
      Tone.Transport.start();
      setIsPlaying(true);
      rafRef.current = requestAnimationFrame(updateProgress);
    }
  };

  const handleStop = () => {
    if (partRef.current) partRef.current.stop();
    if (lyricPartRef.current) lyricPartRef.current.stop();
    Tone.Transport.stop();
    Tone.Transport.seconds = 0;
    setProgress(0);
    setIsPlaying(false);
    if (currentSong) setCurrentSong(prev => ({ ...prev, lyricsText: "" }));
  };

  const handleSeek = (e) => {
    const rect = e.target.getBoundingClientRect();
    const pct = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    const newTime = durationRef.current * pct;
    Tone.Transport.seconds = newTime;
    if (partRef.current) partRef.current.start(0, newTime);
    if (lyricPartRef.current) lyricPartRef.current.start(0, newTime);
    setProgress(newTime);
    if (currentSong) setCurrentSong(prev => ({ ...prev, lyricsText: "" }));
  };

  const styles = {
    wrapper: { maxWidth: "1000px", margin: "2rem auto", padding: "1rem", backgroundColor: "#111", borderRadius: "12px", color: "#eee", fontFamily: "Segoe UI, sans-serif", boxShadow: "0 4px 20px rgba(0,0,0,0.5)", display: "flex", gap: "1rem", alignItems: "flex-start" },
    songList: { display: "flex", flexDirection: "row", gap: "0.5rem", overflowX: "auto" },
    songCard: { flex: "0 0 150px", padding: "0.6rem", borderRadius: "10px", background: "#222", textAlign: "center", transition: "transform 0.2s", cursor: "pointer" },
    songCardActive: { background: "#333", transform: "scale(1.05)" },
    button: { padding: "0.3rem 0.6rem", margin: "0.2rem", border: "none", borderRadius: "6px", background: "#4a90e2", color: "#fff", cursor: "pointer", transition: "background 0.2s" },
    controlArea: { display: "flex", flexDirection: "column", gap: "0.5rem", flexGrow: 1 },
    progressBar: { height: "6px", background: "#333", borderRadius: "3px", marginTop: "0.5rem", cursor: "pointer" },
    progressFilled: { height: "100%", background: "#4a90e2", borderRadius: "3px", width: durationRef.current ? `${(progress / durationRef.current) * 100}%` : "0%" },
    timeText: { fontSize: "0.75rem", color: "#888", textAlign: "right", marginTop: "0.2rem" },
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.songList}>
        {allSongs.map(song => (
          <div
            key={song.id}
            style={{ ...styles.songCard, ...(currentSong?.id === song.id ? styles.songCardActive : {}) }}
            onClick={() => handleLoadSong(song)}
          >
            {song.name}
          </div>
        ))}
      </div>
      <div style={styles.controlArea}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button style={styles.button} onClick={handlePlayPause}>{isPlaying ? "暫停" : "播放"}</button>
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
        <input type="file" accept=".mid" onChange={handleUpload} style={{ width: "100%", marginTop: "0.5rem" }} />
      </div>
    </div>
  );
});

export default MidiPlayer;
