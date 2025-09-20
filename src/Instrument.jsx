// Instrument.jsx
import React from "react";

export default function Instrument({ current, onChange, toggleKeyboard, toggleSpectrum }) {
  return (
    <div style={{
      padding: "1rem",
      background: "#222",
      borderRadius: "12px",
      color: "#fff"
    }}>
      <div>
        <label>選擇樂器:</label>
        <select value={current} onChange={e => onChange(e.target.value)}>
          <option value="piano">Piano</option>
          <option value="guitar">Guitar</option>
          <option value="violin">Violin</option>
          <option value="bass">Bass</option>
          <option value="melodica">Melodica</option>
        </select>
      </div>
      <div style={{ marginTop: "0.5rem" }}>
        <button onClick={toggleKeyboard}>收起鍵盤</button>
      </div>
    </div>
  );
}
