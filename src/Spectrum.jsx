// src/Spectrum.jsx
import { useEffect, useRef, useState } from "react";
import * as Tone from "tone";

export default function VisualSpectrumWithVolume({ mode = "bar" }) {
  const canvasRef = useRef();
  const micRef = useRef();
  const fftRef = useRef();
  const meterRef = useRef();
  const [volumeLevel, setVolumeLevel] = useState(0);
  const volumeHistory = useRef([]);

  useEffect(() => {
    const c = canvasRef.current;
    const ctx = c.getContext("2d");

    const resize = () => {
      c.width = c.parentElement.clientWidth;
      c.height = 150;
    };
    resize();
    window.addEventListener("resize", resize);

    const setupMic = async () => {
      await Tone.start();
      const mic = new Tone.UserMedia();
      const fft = new Tone.FFT(256);
      const meter = new Tone.Meter();
      mic.connect(fft);
      mic.connect(meter);
      await mic.open();

      micRef.current = mic;
      fftRef.current = fft;
      meterRef.current = meter;
    };
    setupMic();

    const draw = () => {
      requestAnimationFrame(draw);
      if (!fftRef.current || !meterRef.current) return;

      const data = fftRef.current.getValue(); // -140 ~ 0 dB
      ctx.fillStyle = "rgba(0,0,0,0.1)";
      ctx.fillRect(0, 0, c.width, c.height);

      const w = c.width / data.length;
      const midY = c.height / 2;

      switch (mode) {
        case "bar":
          data.forEach((v, i) => {
            const mag = Math.max(0, (v + 140) / 140);
            const h = mag * c.height;
            ctx.fillStyle = "lime";
            ctx.fillRect(i * w, c.height - h, w * 0.9, h);
          });
          break;
        case "wave":
          ctx.beginPath();
          ctx.moveTo(0, midY);
          data.forEach((v, i) => {
            const y = midY + (v / 50) * midY;
            ctx.lineTo(i * w, y);
          });
          ctx.strokeStyle = "#4a90e2";
          ctx.lineWidth = 2;
          ctx.stroke();
          break;
        case "circle":
          const radius = 50;
          const cx = c.width / 2;
          const cy = c.height / 2;
          const angleStep = (Math.PI * 2) / data.length;
          data.forEach((v, i) => {
            const mag = Math.max(0, (v + 140) / 140);
            const r = radius + mag * 60;
            const angle = i * angleStep;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            ctx.fillStyle = `hsl(${(i / data.length) * 360}, 100%, 50%)`;
            ctx.fillRect(x, y, 2, 2);
          });
          break;
      }

      // 音量條
      const level = meterRef.current.getValue();
      const norm = Math.max(0, Math.min(1, (level + 60) / 60));
      volumeHistory.current.push(norm);
      if (volumeHistory.current.length > 8) volumeHistory.current.shift();
      const avg = volumeHistory.current.reduce((a, b) => a + b, 0) / volumeHistory.current.length;
      setVolumeLevel(avg);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      micRef.current?.close();
    };
  }, [mode]);

  return (
    <div style={{ width: "100%" }}>
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
      <canvas ref={canvasRef} style={{ width: "100%", height: "150px", background: "#111", borderRadius: 5 }} />
    </div>
  );
}
