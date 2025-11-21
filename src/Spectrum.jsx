// src/Spectrum.jsx
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export default function VisualSpectrumWithEvents({ notes = [], currentTime = 0 }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState("bar"); // bar, wave, circle
  const canvasRef = useRef();

  const notesRef = useRef(notes);
  const currentTimeRef = useRef(currentTime);
  const modeRef = useRef(mode);

  useEffect(() => {
    console.log("Spectrum 收到的 notes:", notes);
    console.log("Spectrum 收到的 currentTime:", currentTime);
  },[notes,currentTime]);

  // 同步 refs
  useEffect(() => { notesRef.current = notes; }, [notes]);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      c.width = c.clientWidth;
      c.height = c.clientHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const pitchMap = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    const noteWidth = 4;
    const noteHeight = 8;

    const draw = () => {
      requestAnimationFrame(draw);

      ctx.clearRect(0, 0, c.width, c.height);
      const n = notesRef.current;
      const t = currentTimeRef.current;
      const m = modeRef.current;
      if (!n.length) return;

      // 固定每秒像素，避免自動縮放太小
      const pixelsPerSecond = 100;

      switch (m) {
        case "bar":
          n.forEach(note => {
            const x = (note.time - t) * pixelsPerSecond + c.width / 2;
            if (x + noteWidth < 0 || x > c.width) return;

            const noteName = note.note[0];
            const octave = parseInt(note.note.slice(1)) || 4;
            const pitch = octave * 12 + (pitchMap[noteName] ?? 0);
            const y = Math.max(0, Math.min(c.height - noteHeight, c.height - ((pitch - 24) * 4)));
            ctx.fillStyle = "lime";
            ctx.fillRect(x, y, noteWidth, noteHeight);
          });
          break;

        case "wave":
          ctx.beginPath();
          ctx.moveTo(0, c.height / 2);
          n.forEach(note => {
            const x = (note.time - t) * pixelsPerSecond + c.width / 2;
            if (x < 0 || x > c.width) return;

            const noteName = note.note[0];
            const octave = parseInt(note.note.slice(1)) || 4;
            const pitch = octave * 12 + (pitchMap[noteName] ?? 0);
            const y = Math.max(0, Math.min(c.height, c.height - ((pitch - 24) * 4)));
            ctx.lineTo(x, y);
          });
          ctx.strokeStyle = "#4a90e2";
          ctx.lineWidth = 2;
          ctx.stroke();
          break;

        case "circle":
          const cx = c.width / 2;
          const cy = c.height / 2;
          const radiusBase = 50;
          const angleStep = (Math.PI * 2) / n.length;
          n.forEach((note, i) => {
            const noteName = note.note[0];
            const octave = parseInt(note.note.slice(1)) || 4;
            const pitch = octave * 12 + (pitchMap[noteName] ?? 0);
            const mag = (pitch - 24) * 0.5;
            const angle = i * angleStep;
            const x = cx + Math.cos(angle) * (radiusBase + mag);
            const y = cy + Math.sin(angle) * (radiusBase + mag);
            ctx.fillStyle = `hsl(${(i / n.length) * 360}, 100%, 50%)`;
            ctx.fillRect(x, y, 2, 2);
          });
          break;
      }
    };

    draw();
    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", gap: "8px", marginBottom: 8 }}>
        <button onClick={() => setMode("bar")}>{t("spectrumModeBar")}</button>
        <button onClick={() => setMode("wave")}>{t("spectrumModeWave")}</button>
        <button onClick={() => setMode("circle")}>{t("spectrumModeCircle")}</button>
      </div>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "150px", background: "#111", borderRadius: 5 }}
      />
    </div>
  );
}

