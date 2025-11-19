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
  Music,
  Radio
} from "lucide-react";
import { Toaster, toast } from "react-hot-toast";

export default function App() {
  const [songs, setSongs] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentLyric, setCurrentLyric] = useState("");
  const [showLyrics, setShowLyrics] = useState(false);


  const playbackTimerRef = useRef(null);
  const partRef = useRef(null);
  const lyricPartRef = useRef(null);
  const volumeNodeRef = useRef(new Tone.Volume(-12).toDestination());

  // 跳轉到指定播放時間
  const handleSeek = (e) => {
    if (!currentSong || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;

    setCurrentTime(newTime);
    Tone.Transport.seconds = newTime;

    if (partRef.current) partRef.current.start(0, newTime);
    if (lyricPartRef.current) lyricPartRef.current.start(0, newTime);
  };


  // 停止播放
  const stopPlayback = () => {
    if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    if (Tone.Transport.state === "started") Tone.Transport.stop();

    if (partRef.current) {
      try { partRef.current.stop(); } catch(e) {}
      partRef.current.dispose();
      partRef.current = null;
    }

    if (lyricPartRef.current) {
      try { lyricPartRef.current.stop(); } catch(e) {}
      lyricPartRef.current.dispose();
      lyricPartRef.current = null;
    }

    setCurrentTime(0);
  };

  // 上傳 MIDI 檔案
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

        // Tone.js 音符事件
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

        // 解析歌詞（MidiParser + tick + BPM）
        const lyrics = await new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const bytes = new Uint8Array(e.target.result);
            const midiData = MidiParser.parse(bytes);

            const ticksPerBeat = midiData.timeDivision || 480;
            let bpmEvents = [{ tick: 0, bpm: 120 }];
            let lyricTicks = [];

            midiData.track.forEach(track => {
              let currentTick = 0;
              track.event.forEach(ev => {
                currentTick += ev.deltaTime;

                if (ev.metaType === 0x51 && ev.data && ev.data.length === 3) {
                  const microsecondsPerBeat = (ev.data[0] << 16) + (ev.data[1] << 8) + ev.data[2];
                  if (microsecondsPerBeat > 0) bpmEvents.push({ tick: currentTick, bpm: 60000000 / microsecondsPerBeat });
                }

                if (ev.metaType === 0x05 && ev.data) {
                  let byteArr = Array.isArray(ev.data) ? ev.data
                    : typeof ev.data === "string" ? Encoding.stringToCode(ev.data)
                    : [ev.data];
                  const text = Encoding.convert(byteArr, { to: "UNICODE", type: "string", from: "AUTO" });
                  lyricTicks.push({ tick: currentTick, text });
                }
              });
            });

            bpmEvents.sort((a, b) => a.tick - b.tick);
            lyricTicks.sort((a, b) => a.tick - b.tick);

            let seconds = 0, lastTick = 0, currentBpm = 60, bpmIndex = 0;
            const lyricsWithTime = lyricTicks.map(l => {
              while (bpmIndex + 1 < bpmEvents.length && l.tick >= bpmEvents[bpmIndex + 1].tick) {
                const nextBpm = bpmEvents[bpmIndex + 1];
                const deltaTicks = nextBpm.tick - lastTick;
                seconds += (deltaTicks * 60) / (currentBpm * ticksPerBeat);
                lastTick = nextBpm.tick;
                currentBpm = nextBpm.bpm;
                bpmIndex++;
              }
              const deltaTicks = l.tick - lastTick;
              const time = seconds + (deltaTicks * 60) / (currentBpm * ticksPerBeat);
              return { time, text: l.text };
            });

            resolve(lyricsWithTime);
          };
          reader.readAsArrayBuffer(file);
        });

        return {
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          name: file.name.replace(/\.(mid|midi)$/, ""),
          file,
          duration: midiObj.duration || 180,
          events,
          lyrics,
        };
      })
    );

    setSongs(prev => [...prev, ...newSongs]);
    toast.success(`已新增 ${newSongs.length} 首`);

    if (!currentSong) handleSongSelect(newSongs[0]);
  };

  // 選擇歌曲
  const handleSongSelect = (song) => {
    if (currentSong?.id === song.id) return;
    stopPlayback();
    setCurrentSong(song);
    setCurrentTime(0);
    setDuration(song.duration || 180);
    setIsPlaying(false);
    setCurrentLyric("");
    setupTone(song);
  };

  // Tone.js 播放設置
  const setupTone = (song) => {
    const synth = new Tone.PolySynth().connect(volumeNodeRef.current);

    const part = new Tone.Part((time, value) => {
      synth.triggerAttackRelease(value.note, value.duration, time, value.velocity);
    }, song.events);
    part.start(0);
    partRef.current = part;

    // 單字歌詞播放
    const lyricPart = new Tone.Part((time, value) => {
      // 只在時間到時更新 currentLyric
      setCurrentLyric(value.text);
    }, 
    // 把歌詞拆成單字事件
    song.lyrics.flatMap(l => l.text.split("").map((char, idx) => ({
      time: l.time + idx * 0.01, // 微小偏移，避免同時觸發重複
      text: char
    })))
    );

    lyricPart.start(0);
    lyricPartRef.current = lyricPart;
  };

  // 播放/暫停
  const handlePlayPause = async () => {
    if (!currentSong) { toast.error("請先選擇歌曲"); return; }
    await Tone.start();
    if (Tone.Transport.state === "started") {
      Tone.Transport.pause(); setIsPlaying(false);
    } else {
      Tone.Transport.start(); setIsPlaying(true);
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
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <div style={{ display: "inline-flex", gap: "0.75rem", alignItems: "center", marginBottom: "0.5rem" }}>
            <Radio />
            <h1 style={{ fontSize: "2.5rem", color: "#ffbf00", textShadow: "2px 2px 4px rgba(0,0,0,0.5)" }}>RETRO MIDI PLAYER</h1>
            <Radio />
          </div>
          <p style={{ fontSize: "0.875rem", color: "#ffa500aa", letterSpacing: "0.15em" }}>VINTAGE EDITION</p>
        </div>

        <div style={{ display: "flex", border: "8px solid #8B4513", background: "linear-gradient(135deg, #3d2817 0%, #2a1810 100%)", boxShadow: "0 20px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)", overflow: "hidden" }}>
          <div style={{ flex: 1, padding: "2rem", position: "relative" }}>
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

            <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginBottom: "1rem" }}>
              <button onClick={handlePrevious}><SkipBack /></button>
              <button onClick={handlePlayPause}>{isPlaying ? <Pause /> : <Play />}</button>
              <button onClick={handleNext}><SkipForward /></button>
            </div>
            
            <div style={{ marginBottom: "1rem" }}>
            {/* 進度條 */}
              <div
                style={{
                  width: "100%",
                  height: "6px",
                  background: "#4a3428",
                  borderRadius: "3px",
                  cursor: "pointer",
                  position: "relative"
                }}
                onClick={handleSeek} // 點擊跳轉
              >
              <div
                style={{
                  width: `${(currentTime / duration) * 100}%`,
                  height: "100%",
                  background: "#ffa500",
                  borderRadius: "3px",
                  position: "absolute",
                  top: 0,
                  left: 0
                }}
              ></div>
            </div>

            {/* 時間顯示 */}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#ffa500", marginTop: "0.25rem" }}>
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>


            

            <input
              type="file"
              accept=".mid,.midi"
              onChange={e => e.target.files && handleFileUpload(e.target.files)}
              style={{ width: "100%", marginTop: "0.5rem" }}
            />
          </div>

           
          <div style={{ width: "250px", borderLeft: "8px solid #8B4513", background: "linear-gradient(180deg, #2a1810 0%, #1a0f08 100%)", display: "flex", flexDirection: "column" }}>
            {/* 按鈕區 */}
            <div style={{ display: "flex", gap: "0.5rem", padding: "0.5rem", borderBottom: "4px solid #8B4513" }}>
              <button onClick={() => setShowLyrics(false)}>列表 ({songs.length})</button>
              <button disabled={!currentSong} onClick={() => setShowLyrics(true)}>歌詞</button>
            </div>

            {/* 列表或歌詞區 */}
            <div style={{ padding: "1rem", maxHeight: "300px", overflowY: "auto", display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
              {showLyrics ? (
                currentSong?.lyrics
                  .filter((l, i, arr) => i === 0 || l.text !== arr[i - 1].text) // 去掉連續重複
                  .map((l, idx, arr) => {
                    const nextTime = arr[idx + 1]?.time ?? duration;
                    const isActive = currentTime >= l.time && currentTime < nextTime;
                    return (
                      <span key={idx} style={{ color: isActive ? "#ffa500" : "#ffd700" }}>
                        {l.text}
                      </span>
                    );
                  })
              ) : (
                songs.map(song => (
                  <div key={song.id} onClick={() => handleSongSelect(song)} style={{ cursor: "pointer", margin: "0.25rem 0", padding: "0.25rem" }}>
                    {song.name}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}