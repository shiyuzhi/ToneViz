// src/DraggableSpectrum.jsx
import React, { useState, useRef, useEffect } from "react";
import Spectrum from "./Spectrum.jsx";

export default function DraggableSpectrum({ notes = [], currentTime = 0 }) {
  const panelRef = useRef(null);
  const [position, setPosition] = useState({ top: 50, left: 20 });
  const offsetRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);

  useEffect(() => {
    console.log("DraggableSpectrum收到的notes",notes);
    console.log("DraggableSpectrum收到的currenttime",currentTime);
  },[notes,currentTime]);

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
      <Spectrum notes={notes} currentTime={currentTime} />
    </div>
  );
}
