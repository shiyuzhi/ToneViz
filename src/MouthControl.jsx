import React, { useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";
import { Midi } from "@tonejs/midi";

export default function MouthControl({
  synthsRef,
  currentInstrument,
  midiFileUrl, // 直接給 MIDI 檔案 URL
}) {
  const videoRef = useRef();
  const [lyrics, setLyrics] = useState([]);
  const [currentLyric, setCurrentLyric] = useState("");
  const mouthHistory = useRef([]);

  // 讀取 MIDI 歌詞
  useEffect(() => {
    if (!midiFileUrl) return;

    async function loadLyrics() {
      const res = await fetch(midiFileUrl);
      const arrayBuffer = await res.arrayBuffer();
      const midi = new Midi(arrayBuffer);

      const allLyrics = [];
      midi.tracks.forEach(track => {
        track.meta.forEach(event => {
          if (event.type === "lyrics" || event.type === "text") {
            allLyrics.push({ time: event.time, text: event.text });
          }
        });
      });

      setLyrics(allLyrics);
    }

    loadLyrics();
  }, [midiFileUrl]);

  // 嘴巴偵測控制 Transport
  useEffect(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const synth = synthsRef?.current?.[currentInstrument];

    const faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });
    faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5 });

    let isTransportRunning = false;

    faceMesh.onResults((results) => {
      if (!results.multiFaceLandmarks?.[0]) return;
      const lm = results.multiFaceLandmarks[0];
      const upperLip = lm[13];
      const lowerLip = lm[14];
      let mouthOpen = Math.max(0, lowerLip.y - upperLip.y);

      mouthHistory.current.push(mouthOpen);
      if (mouthHistory.current.length > 6) mouthHistory.current.shift();
      const avg = mouthHistory.current.reduce((a,b)=>a+b,0)/mouthHistory.current.length;

      const transport = Tone.Transport;
      if (!transport) return;

      if (avg > 0.02 && !isTransportRunning) {
        if (transport.state !== "started") Tone.start();
        transport.start();
        isTransportRunning = true;
      } else if (avg <= 0.01 && isTransportRunning) {
        transport.pause();
        isTransportRunning = false;
      }
    });

    const camera = new Camera(video, { onFrame: async () => await faceMesh.send({ image: video }) });
    camera.start();

    return () => {
      camera.stop();
      try { faceMesh.close(); } catch(e) {}
    };
  }, [synthsRef, currentInstrument]);

  // 顯示當前歌詞
  useEffect(() => {
    let raf;
    const update = () => {
      raf = requestAnimationFrame(update);
      if (!lyrics || lyrics.length === 0) {
        setCurrentLyric("♪");
        return;
      }

      const t = Tone.Transport.seconds;

      // 找到目前時間前最近的一個歌詞
      const current = lyrics.filter(l => l.time <= t).pop();
      setCurrentLyric(current?.text || "♪");
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [lyrics]);

  return (
    <div style={{ width: "100%", maxWidth: 600, borderRadius: 8, color: "#eee" }}>
      <video ref={videoRef} autoPlay style={{ width: "100%", borderRadius: 8, marginBottom: "0.5rem" }} />
      <div style={{ marginTop: 12, minHeight: 36, textAlign: "center", fontSize: 18, color: "#dcdcdc" }}>
        {currentLyric}
      </div>
    </div>
  );
}
