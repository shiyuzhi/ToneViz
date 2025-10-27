// src/MouthControl.jsx
import React, { useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";

export default function MouthControl({
  synthsRef,
  currentInstrument,
  songs = [],
  onSelectSong,
  currentSong // object with .lyrics = [{time, text}, ...]
}) {
  const videoRef = useRef();
  const [selectedSongId, setSelectedSongId] = useState(null);
  const [currentLyric, setCurrentLyric] = useState("");
  const mouthHistory = useRef([]);

  // MediaPipe + 嘴巴偵測 (控制 Transport start/pause)
  useEffect(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const synth = synthsRef?.current?.[currentInstrument];
    // 不阻塞：如果 synth 不存在，仍要啟動 faceMesh（只是嘴巴不會觸發 synth）
    let active = true;

    const faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5 });

    let isTransportRunning = false; // 狀態快取，避免頻繁呼叫 start/pause

    faceMesh.onResults((results) => {
      if (!results.multiFaceLandmarks?.[0]) return;
      const lm = results.multiFaceLandmarks[0];
      const upperLip = lm[13];
      const lowerLip = lm[14];
      let mouthOpen = Math.max(0, lowerLip.y - upperLip.y);
      // 簡單平滑
      mouthHistory.current.push(mouthOpen);
      if (mouthHistory.current.length > 6) mouthHistory.current.shift();
      const avg = mouthHistory.current.reduce((a,b)=>a+b,0)/mouthHistory.current.length;

      // threshold 控制播放/暫停
      if (avg > 0.05 && !isTransportRunning) {
        if (Tone.Transport.state !== "started") Tone.Transport.start();
        isTransportRunning = true;
      } else if (avg <= 0.05 && isTransportRunning) {
        Tone.Transport.pause();
        isTransportRunning = false;
      }

    });

    const camera = new Camera(video, { onFrame: async () => await faceMesh.send({ image: video }) });
    camera.start();

    return () => {
      active = false;
      camera.stop();
      try { faceMesh.close(); } catch(e) {}
    };
  }, [synthsRef, currentInstrument]);

  // 選歌處理
  const handleSongClick = (song) => {
    setSelectedSongId(song.id);
    if (onSelectSong) onSelectSong(song);
  };

  // 同步歌詞（靠 Tone.Transport.seconds）
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
      // 找最後一個 time <= t
      let idx = -1;
      for (let i = 0; i < cs.lyrics.length; i++) {
        if (cs.lyrics[i].time <= t) idx = i;
        else break;
      }
      if (idx >= 0) {
        const text = cs.lyrics[idx].text;
        setCurrentLyric(text);
      } else {
        setCurrentLyric("");
      }
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [currentSong]);

  return (
    <div style={{ width: "100%", maxWidth: 600, borderRadius: 8, color: "#eee" }}>
      <video ref={videoRef} autoPlay style={{ width: "100%", borderRadius: 8, marginBottom: "0.5rem" }} />

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

      <div style={{ marginTop: 12, minHeight: 36, textAlign: "center", fontSize: 18, color: "#dcdcdc" }}>
        {currentLyric || "♪"}
      </div>
    </div>
  );
}
