// src/keyboard.jsx
import React from "react";

export default function Keyboard({ currentInstrument, octaveOffset }) {
  return (
    <div style={{
      position: "fixed",
      bottom: 50,
      left: "50%",
      transform: "translateX(-50%)",
      width: "80%",
      height: "150px",
      background: "#333",
      borderRadius: "12px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "1rem",
      color: "#fff"
    }}>
      <p>鍵盤區（{currentInstrument}，八度偏移 {octaveOffset}）</p>
      <p>Z–M 鍵位顯示 placeholder</p>
    </div>
  );
}
