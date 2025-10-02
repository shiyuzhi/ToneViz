// src/Keyboard.jsx
import React, { useState, useEffect, useCallback } from "react";
import * as Tone from "tone";

export default function Keyboard({
  currentInstrument,
  setCurrentInstrument,
  octaveOffset,
  setOctaveOffset,
  synthsRef,
  instruments = ["piano", "organ", "guitar", "violin", "bass", "melodica"],
}) {
  const [pressedKey, setPressedKey] = useState(null);

  const keyMap = {
    z: "C4", s: "C#4", x: "D4", d: "D#4",
    c: "E4", v: "F4", g: "F#4", b: "G4",
    h: "G#4", n: "A4", j: "A#4", m: "B4",
  };


  // 播放音符
  const playNote = async (note) => {
  const ctx = Tone.getContext();  
  if (ctx.state !== "running") {
    await ctx.resume();
  }

  const noteName = note.slice(0, -1);
  let noteOctave = parseInt(note.slice(-1), 10) + octaveOffset;
  noteOctave = Math.max(0, Math.min(8, noteOctave));
  const newNote = noteName + noteOctave;

  const synth = synthsRef.current[currentInstrument];
  synth.triggerAttackRelease(newNote, "8n");
};

  const handleKeyDown = useCallback(
    (e) => {
      const key = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        e.preventDefault();
      }

      if (key === "arrowright") {
        setOctaveOffset((o) => Math.min(o + 1, 6));
        return;
      }
      if (key === "arrowleft") {
        setOctaveOffset((o) => Math.max(o - 1, -2));
        return;
      }

      if (key === "arrowup") {
        const idx = instruments.indexOf(currentInstrument);
        setCurrentInstrument(instruments[(idx - 1 + instruments.length) % instruments.length]);
        return;
      }
      if (key === "arrowdown") {
        const idx = instruments.indexOf(currentInstrument);
        setCurrentInstrument(instruments[(idx + 1) % instruments.length]);
        return;
      }

      if (keyMap[key]) {
        playNote(keyMap[key]);
        setPressedKey(key);
      }
    },
    [currentInstrument, octaveOffset, instruments]
  );

  const handleKeyUp = useCallback(() => {
    setPressedKey(null);
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  const whiteKeys = Object.entries(keyMap).filter(([_, note]) => !note.includes("#"));
  const blackKeys = Object.entries(keyMap).filter(([_, note]) => note.includes("#"));

  return (
    <div style={{ position: "relative", textAlign: "center", marginTop: "1rem" }}>
      <div style={{ color: "#fff", marginBottom: "0.5rem" }}>
        Instrument: <b>{currentInstrument}</b> | Octave Offset: <b>{octaveOffset}</b>
      </div>

      <div
        style={{
          position: "relative",
          display: "flex",
          justifyContent: "center",
          width: "95vw",
          maxWidth: "900px",
          margin: "auto",
          height: "220px",
        }}
      >
        {whiteKeys.map(([key, note]) => (
          <div
            key={key}
            onMouseDown={() => { playNote(note); setPressedKey(key); }}
            onMouseUp={() => setPressedKey(null)}
            onMouseLeave={() => setPressedKey(null)}
            style={{
              flex: 1,
              margin: "1px",
              background: pressedKey === key ? "#ffcc88" : "#fff",
              border: "1px solid #555",
              borderRadius: "6px",
              transform: pressedKey === key ? "translateY(2px)" : "none",
              transition: "all 0.1s ease",
              display: "flex",
              justifyContent: "center",
              alignItems: "flex-end",
              fontWeight: "bold",
              color: "#000",
              userSelect: "none",
              cursor: "pointer",
            }}
          >
            {key.toUpperCase()}
          </div>
        ))}

        {blackKeys.map(([key, note]) => {
          const positionMap = { s: 0.7, d: 1.7, g: 3.7, h: 4.7, j: 5.7 };
          return (
            <div
              key={key}
              onMouseDown={() => { playNote(note); setPressedKey(key); }}
              onMouseUp={() => setPressedKey(null)}
              onMouseLeave={() => setPressedKey(null)}
              style={{
                position: "absolute",
                left: `${(positionMap[key] / whiteKeys.length) * 100}%`,
                width: "6%",
                height: "60%",
                background: pressedKey === key ? "#882222" : "#333",
                border: "1px solid #222",
                borderRadius: "4px",
                transform: pressedKey === key ? "translateY(2px)" : "none",
                transition: "all 0.1s ease",
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-end",
                color: "#fff",
                fontWeight: "bold",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              {key.toUpperCase()}
            </div>
          );
        })}
      </div>
    </div>
  );
}

