// SpectrumTest.jsx
import { useEffect, useRef } from "react";

export default function SpectrumTest() {
  const canvas = useRef();

  useEffect(() => {
    const c = canvas.current;
    const ctx = c.getContext("2d");

    const resize = () => {
      c.width = c.parentElement.clientWidth;
      c.height = 150;
    };
    resize();
    window.addEventListener("resize", resize);

    const fftLength = 256; // 模擬 FFT 長度

    const draw = () => {
      requestAnimationFrame(draw);

      // 模擬資料，-1 ~ 1
      const data = Array.from({ length: fftLength }, () => Math.random() * 2 - 1);

      ctx.fillStyle = "rgba(0,0,0,0.1)";
      ctx.fillRect(0, 0, c.width, c.height);

      const w = c.width / data.length;
      const midY = c.height / 2;

      for (let i = 0; i < data.length; i++) {
        const magnitude = Math.abs(data[i]); 
        const y = magnitude * (c.height / 4);  
        ctx.fillStyle = "lime";
        ctx.fillRect(i * w, midY - y, w * 0.9, y * 2); 
      }
    };

    draw();

    return () => window.removeEventListener("resize", resize);
  }, []);

  return <canvas ref={canvas} style={{ width: "100%", height: "150px", background: "#111" }} />;
}
