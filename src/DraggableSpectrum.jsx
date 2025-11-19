import React, { useState, useRef } from "react";
import Spectrum from "./Spectrum.jsx";

export default function DraggableSpectrum({ audioNode}) {
  const panelRef = useRef(null);
  const [position, setPosition] = useState({ top: 50, left: 20 });
  const offsetRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);

  const handleMouseDown = (e) => {
    draggingRef.current = true;
    offsetRef.current = {
      x: e.clientX - position.left,
      y: e.clientY - position.top,
    };
  };

  const handleMouseMove = (e) => {
    if (!draggingRef.current) return;
    setPosition({
      left: e.clientX - offsetRef.current.x,
      top: e.clientY - offsetRef.current.y,
    });
  };

  const handleMouseUp = () => {
    draggingRef.current = false;
  };

  return (
    <div
      ref={panelRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        position: "absolute",
        top: position.top,
        left: position.left,
        width: 300,
        height: 200,
        backgroundColor: "#111",
        borderRadius: 8,
        padding: "0.5rem",
        zIndex: 30,
        cursor: "move",
        overflow: "hidden",
      }}
    >
        <Spectrum audioNode={audioNode} />
    </div>
  );
}
