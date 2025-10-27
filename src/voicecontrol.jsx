// src/VoiceControl.jsx
import React, { useEffect, useRef, useState } from "react";
import * as Tone from "tone";

export default function VoiceControl({
  synthsRef,
  currentInstrument,
  songs = [],
  onSelectSong,
  currentSong
}) {
  const micRef = useRef(null);
  const meterRef = useRef(null);
  const pitchAnalyserRef = useRef(null);
  const [selectedSongId, setSelectedSongId] = useState(null);
  const [currentLyric, setCurrentLyric] = useState("");
  const [volumeLevel, setVolumeLevel] = useState(0);
  const volumeHistory = useRef([]);

  // 啟用麥克風
  useEffect(() => {
    let mic, meter, analyser;
    let isTransportRunning = false;

    const setupMic = async () => {
      await Tone.start();
      mic = new Tone.UserMedia();
      meter = new Tone.Meter();
      analyser = new Tone.FFT(256);

      mic.connect(meter);
      mic.connect(analyser);
      mic.open();

      micRef.current = mic;
      meterRef.current = meter;
      pitchAnalyserRef.current = analyser;

      const loop = () => {
        const level = meter.getValue();
        if (typeof level === "number") {
          // 線性轉換成 0~1
          const normalized = Math.max(0, Math.min(1, (level + 60) / 60));
          volumeHistory.current.push(normalized);
          if (volumeHistory.current.length > 8) volumeHistory.current.shift();
          const avg = volumeHistory.current.reduce((a, b) => a + b, 0) / volumeHistory.current.length;
          setVolumeLevel(avg);

          // 用音量開關播放
          if (avg > 0.3 && !isTransportRunning) {
            Tone.Transport.start();
            isTransportRunning = true;
          } else if (avg <= 0.2 && isTransportRunning) {
            Tone.Transport.pause();
            isTransportRunning = false;
          }
        }
        requestAnimationFrame(loop);
      };
      loop();
    };

    setupMic();

    return () => {
      try {
        micRef.current?.close();
      } catch (e) {}
    };
  }, []);

  // 選歌處理
  const handleSongClick = (song) => {
    setSelectedSongId(song.id);
    if (onSelectSong) onSelectSong(song);
  };

  // 同步歌詞
  useEffect(() => {
    let raf;
    const update = () => {
      raf = requestAnimationFrame(update);
      const cs = currentSong;
      if (!cs || !cs.lyrics || cs.lyrics.length === 0) {
        setCurrentLyric("");
        return;
      }
      const t = Tone.Transport.seconds;
      let idx = -1;
      for (let i = 0; i < cs.lyrics.length; i++) {
        if (cs.lyrics[i].time <= t) idx = i;
        else break;
      }
      if (idx >= 0) setCurrentLyric(cs.lyrics[idx].text);
      else setCurrentLyric("");
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [currentSong]);

  return (
    <div style={{ width: "100%", maxWidth: 600, borderRadius: 8, color: "#eee" }}>
      {/* 音量視覺化條 */}
      <div
        style={{
          width: "100%",
          height: 10,
          background: "#333",
          borderRadius: 5,
          marginBottom: "0.5rem",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            width: `${volumeLevel * 100}%`,
            height: "100%",
            background: volumeLevel > 0.3 ? "#4a90e2" : "#777",
            transition: "width 0.1s linear"
          }}
        />
      </div>

      {/* 歌曲列表 */}
      <div
        style={{
          display: "flex",
          overflowX: "auto",
          gap: "0.5rem",
          padding: "0.3rem",
          background: "#222",
          borderRadius: "8px"
        }}
      >
        {(songs || []).map(song => (
          <div
            key={song.id}
            onClick={() => handleSongClick(song)}
            style={{
              flex: "0 0 auto",
              padding: "0.4rem 0.6rem",
              borderRadius: "6px",
              background: song.id === selectedSongId ? "#4a90e2" : "#333",
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}
          >
            {song.name}
          </div>
        ))}
      </div>

      {/* 歌詞區 */}
      <div style={{ marginTop: 12, minHeight: 36, textAlign: "center", fontSize: 18, color: "#dcdcdc" }}>
        {currentLyric || "🎤"}
      </div>
    </div>
  );
}
