import React, { useState } from "react";
import Start from "./start.jsx";
// import Keyboard from "./components/keyboard.jsx"; // 先空殼
// import Instrument from "./components/instrument.jsx";
// import Spectrum from "./components/spectrum.jsx";
import * as Tone from "tone";

export default function Home() {
  const [started, setStarted] = useState(false);

  const handleStart = async () => {
    await Tone.start();  // 啟動 AudioContext
    setStarted(true);
  }

  return (
    <>
      {!started && <Start onStart={handleStart} />}
      {started && (
        <div>
          <h2 style={{ textAlign: "center", marginTop: "20px", color: "#a44747ff" }}>
            Home 主畫面（鍵盤、樂器區、頻譜暫留）
          </h2>
        </div>
      )}
    </>
  );
}
