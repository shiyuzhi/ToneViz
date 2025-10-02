// src/spectrum.jsx
import React, { useEffect, useRef } from "react";

export default function Spectrum({ analyserRef }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!analyserRef?.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const analyser = analyserRef.current;
    const dataArray = new Float32Array(analyser.size);

    analyser.smoothing = 0.8;

    const resize = () => {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = 150;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      requestAnimationFrame(draw);

      analyser.getValue(dataArray);

      
      ctx.fillStyle = "rgba(17,17,17,0.3)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = canvas.width / dataArray.length;
      for (let i = 0; i < dataArray.length; i++) {
        const v = (dataArray[i] + 1) / 2;
        const y = v * canvas.height * 5; // 放大

        ctx.fillStyle = `hsl(${(i / dataArray.length) * 360}, 100%, ${40 + v * 50}%)`;
        ctx.fillRect(i * barWidth, canvas.height - y, barWidth, y);
      }
    };

    draw();

    return () => window.removeEventListener("resize", resize);
  }, [analyserRef]);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "180px", background: "#111", display: "block" }} />;
}
