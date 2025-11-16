import React, { useState, useRef } from "react";
import { Midi } from "@tonejs/midi";
import * as Tone from "tone";
import MidiParser from "midi-parser-js";
import Encoding from "encoding-japanese";

import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Upload,
  Music,
  Music2,
  Radio,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Toaster, toast } from "react-hot-toast";

export default function App() {
  const [songs, setSongs] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [lyrics, setLyrics] = useState([]);
  const [currentLyric, setCurrentLyric] = useState("");

  const playbackTimerRef = useRef(null);
  const partRef = useRef(null);
  const lyricPartRef = useRef(null);
  const volumeNodeRef = useRef(new Tone.Volume(-12).toDestination());

  const stopPlayback = () => {
    if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    Tone.Transport.stop();
    if (partRef.current) {
      partRef.current.stop();
      partRef.current.dispose();
    }
    if (lyricPartRef.current) {
      lyricPartRef.current.stop();
      lyricPartRef.current.dispose();
    }
  };

  const handleFileUpload = async (files) => {
    const midiFiles = Array.from(files).filter(f => f.name.endsWith(".mid") || f.name.endsWith(".midi"));
    if (!midiFiles.length) {
      toast.error("請上傳有效的 MIDI 檔案");
      return;
    }

    const newSongs = await Promise.all(
      midiFiles.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const midiObj = new Midi(arrayBuffer);

        // Tone.js 用音符事件
        const events = [];
        midiObj.tracks.forEach(track =>
          track.notes.forEach(note => {
            events.push({
              time: note.time,
              note: note.name,
              duration: note.duration,
              velocity: note.velocity,
            });
          })
        );

        // midi-parser-js 解析歌詞
        const reader = new FileReader();
        const lyrics = await new Promise((resolve) => {
          reader.onload = (e) => {
            const bytes = new Uint8Array(e.target.result);
            const midiData = MidiParser.parse(bytes);
            const lyricsSet = new Set();
            const parsedLyrics = [];
            midiData.track.forEach(track =>
              track.event.forEach(ev => {
                if ((ev.type === 5 || ev.type === 1) && ev.data) {
                  const text = Encoding.convert(ev.data, { to: "UNICODE", type: "string" });
                  if (!lyricsSet.has(ev.startTime + text)) {
                    parsedLyrics.push({ time: ev.startTime / 1000, text }); // 秒為單位
                    lyricsSet.add(ev.startTime + text);
                  }
                }
              })
            );
            parsedLyrics.sort((a, b) => a.time - b.time);
            resolve(parsedLyrics);
          };
          reader.readAsArrayBuffer(file);
        });

        return {
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          name: file.name.replace(/\.(mid|midi)$/, ""),
          file,
          duration: midiObj.duration || 180,
          midi: midiObj,
          events,
          lyrics,
        };
      })
    );

    setSongs(prev => [...prev, ...newSongs]);
    toast.success(`已新增 ${newSongs.length} 首`);

    if (!currentSong) handleSongSelect(newSongs[0]);
  };

  const handleSongSelect = async (song) => {
    if (currentSong?.id === song.id) return;
    stopPlayback();
    setCurrentSong(song);
    setCurrentTime(0);
    setDuration(song.duration || 180);
    setIsPlaying(false);
    setLyrics(song.lyrics || []);
    setCurrentLyric("");
    setupTone(song);
  };

  const setupTone = (song) => {
    const synth = new Tone.PolySynth().connect(volumeNodeRef.current);

    // 建立音符 Part
    const part = new Tone.Part((time, value) => {
      synth.triggerAttackRelease(value.note, value.duration, time, value.velocity);
    }, song.events);
    part.start(0);
    partRef.current = part;

    // 建立歌詞 Part
    const lyricPart = new Tone.Part((time, value) => setCurrentLyric(value.text), song.lyrics.map(l => ({ time: l.time, text: l.text })));
    lyricPart.start(0);
    lyricPartRef.current = lyricPart;
  };

  const handlePlayPause = async () => {
    if (!currentSong) {
      toast.error("請先選擇歌曲");
      return;
    }

    await Tone.start();
    if (Tone.Transport.state === "started") {
      Tone.Transport.pause();
      setIsPlaying(false);
    } else {
      Tone.Transport.start();
      setIsPlaying(true);

      playbackTimerRef.current = setInterval(() => setCurrentTime(Tone.Transport.seconds), 100);
    }
  };

  const handlePrevious = () => {
    const idx = songs.findIndex(s => s.id === currentSong?.id);
    if (idx > 0) handleSongSelect(songs[idx - 1]);
    else if (songs.length > 0) handleSongSelect(songs[songs.length - 1]);
  };

  const handleNext = () => {
    const idx = songs.findIndex(s => s.id === currentSong?.id);
    if (idx < songs.length - 1) handleSongSelect(songs[idx + 1]);
    else if (songs.length > 0) handleSongSelect(songs[0]);
  };

  const formatTime = (seconds) => {
    if (!isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "linear-gradient(135deg, #2c1810 0%, #1a0f08 50%, #2c1810 100%)", padding: "1rem", fontFamily: "serif", color: "#ffd700" }}>
      <Toaster />
      <div style={{ width: "100%", maxWidth: "960px" }}>
        {/* 標題 */}
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <div style={{ display: "inline-flex", gap: "0.75rem", alignItems: "center", marginBottom: "0.5rem" }}>
            <Radio />
            <h1 style={{ fontSize: "2.5rem", color: "#ffbf00", textShadow: "2px 2px 4px rgba(0,0,0,0.5)" }}>RETRO MIDI PLAYER</h1>
            <Radio />
          </div>
          <p style={{ fontSize: "0.875rem", color: "#ffa500aa", letterSpacing: "0.15em" }}>VINTAGE EDITION</p>
        </div>

        {/* Card */}
        <div style={{ display: "flex", border: "8px solid #8B4513", background: "linear-gradient(135deg, #3d2817 0%, #2a1810 100%)", boxShadow: "0 20px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)", overflow: "hidden" }}>
          {/* 左面板 */}
          <div style={{ flex: 1, padding: "2rem", position: "relative" }}>
            {/* Display */}
            <div style={{ padding: "1rem", marginBottom: "1rem", borderRadius: "0.5rem", border: "4px solid #4a3428", background: "linear-gradient(180deg, #1a1410 0%, #0d0805 100%)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ width: "64px", height: "64px", borderRadius: "0.5rem", display: "flex", justifyContent: "center", alignItems: "center", background: "radial-gradient(circle at 30% 30%, #ff8c00, #ff6000)" }}>
                  <Music />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {currentSong ? currentSong.name.toUpperCase() : "NO TRACK SELECTED"}
                  </p>
                  <p style={{ fontSize: "0.75rem", color: "#ff8000" }}>MIDI FORMAT</p>
                  {currentLyric && <p style={{ fontSize: "0.75rem", color: "#ffa500" }}>{currentLyric}</p>}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginBottom: "1rem" }}>
              <button onClick={handlePrevious}><SkipBack /></button>
              <button onClick={handlePlayPause}>{isPlaying ? <Pause /> : <Play />}</button>
              <button onClick={handleNext}><SkipForward /></button>
            </div>
            
            {/*上傳*/}
            <input
              type="file"
              accept=".mid,.midi"
              onChange={e => e.target.files && handleFileUpload(e.target.files)}
              style={{ width: "100%", marginTop: "0.5rem" }}
            />

            

          </div>

          {/* 右面板 */}
          <div style={{ width: "250px", borderLeft: "8px solid #8B4513", background: "linear-gradient(180deg, #2a1810 0%, #1a0f08 100%)" }}>
            <div style={{ display: "flex", gap: "0.5rem", padding: "0.5rem", borderBottom: "4px solid #8B4513" }}>
              <button onClick={() => {}}>列表 ({songs.length})</button>
              <button disabled={!currentSong}>歌詞</button>
            </div>
            <div style={{ padding: "1rem", maxHeight: "300px", overflowY: "auto" }}>
              {songs.map(song => (
                <div key={song.id} onClick={() => handleSongSelect(song)} style={{ cursor: "pointer", margin: "0.25rem 0", padding: "0.25rem" }}>
                  {song.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
