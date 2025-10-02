// start.jsx

import React from "react";
import * as Tone from "tone";

export default function Start({ onStart }) {
  const handleClick = async () => {
    await Tone.start(); // 啟動 AudioContext
    console.log("AudioContext 已啟動");

    
    const synth = new Tone.Synth().toDestination();
    //  測試音
    const melody = [
    { note: "A3", duration: "8n", time: 0, velocity: 0.2 },
    { note: "D4", duration: "8n", time: 0.5, velocity: 0.4 },
    { note: "F4", duration: "8n", time: 1, velocity: 0.6 },
    ];

    melody.forEach(({ note, duration, time, velocity }) => {
    synth.triggerAttackRelease(note, duration, Tone.now() + time, velocity);
    });
    onStart(); // 切換到 Home.jsx
  };

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      width: "100vw",
      background: "#0a0a0a",
      boxSizing: "border-box",
      padding: "1rem"
    }}>
      <button
        onClick={handleClick}
        style={{
          background: "linear-gradient(135deg, #5a00ff, #a100ff)",
          color: "white",
          fontSize: "clamp(1.2rem, 2vw, 2rem)",
          fontWeight: "bold",
          padding: "1rem 2rem",
          border: "none",
          borderRadius: "12px",
          boxShadow: "0 0 1rem #a100ff, 0 0 2rem #5a00ff",
          cursor: "pointer",
          transition: "transform 0.3s",
        }}
        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
      >
        Click to Start
      </button>
    </div>
  );
}