// src/home.jsx
import React, { useState } from "react";
import Start from "./start.jsx";
import Instrument from "./Instrument.jsx";
import MidiPlayer from "./midplayer.jsx";
import Spectrum from "./Spectrum.jsx";
import Keyboard from "./Keyboard.jsx";
import * as Tone from "tone";

export default function Home() {
  const [started, setStarted] = useState(false);
  const [currentInstrument, setCurrentInstrument] = useState("piano");
  const [octaveOffset, setOctaveOffset] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(true);

  // 左上三個模組收合狀態
  const [instrumentVisible, setInstrumentVisible] = useState(true);
  const [midiVisible, setMidiVisible] = useState(true);
  const [spectrumVisible, setSpectrumVisible] = useState(true);

  const handleStart = async () => {
    await Tone.start();
    setStarted(true);
  };

  return (
    <>
      {!started && <Start onStart={handleStart} />}

      {started && (
        <div
          style={{
            width: "100vw",
            height: "100vh",
            background: "#0a0a0a",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* 左上水平排列區塊 */}
          <div
            style={{
              position: "absolute",
              top: "1rem",
              left: "1rem",
              display: "flex",
              gap: "0.5rem",
              alignItems: "flex-start",
              zIndex: 100,
            }}
          >
            {/* Instrument */}
            <div style={{ display: "flex", flexDirection: "column", minWidth: "180px" }}>
              <button onClick={() => setInstrumentVisible(!instrumentVisible)}>
                {instrumentVisible ? "▼" : "▶"} instrument
              </button>
              {instrumentVisible && (
                <Instrument
                  current={currentInstrument}
                  onChange={setCurrentInstrument}
                  toggleKeyboard={() => setKeyboardVisible(!keyboardVisible)}
                  toggleSpectrum={() => setSpectrumVisible(!spectrumVisible)}
                />
              )}
            </div>

            {/* MidiPlayer */}
            <div style={{ display: "flex", flexDirection: "column", minWidth: "200px" }}>
              <button onClick={() => setMidiVisible(!midiVisible)}>
                {midiVisible ? "▼" : "▶"} MIDIplayer
              </button>
              {midiVisible && <MidiPlayer />}
            </div>

            {/* Spectrum */}
            <div style={{ display: "flex", flexDirection: "column", minWidth: "200px" }}>
              <button onClick={() => setSpectrumVisible(!spectrumVisible)}>
              {spectrumVisible ? "▼" : "▶"} spectrum
              </button>
              {spectrumVisible && <Spectrum />}
            </div>
          </div>

          {/* 下方鍵盤 */}
          {keyboardVisible && (
            <div style={{ position: "absolute", bottom: 0, width: "100%" }}>
              <Keyboard
                currentInstrument={currentInstrument}
                octaveOffset={octaveOffset}
                setOctaveOffset={setOctaveOffset}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}
