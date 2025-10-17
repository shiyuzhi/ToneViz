// src/Home.jsx
import React, { useState, useRef, useEffect } from "react";
import Start from "./start.jsx";
import Instrument from "./Instrument.jsx";
import MidiPlayer from "./midplayer.jsx";
import Spectrum from "./Spectrum.jsx";
import Keyboard from "./Keyboard.jsx";
import * as Tone from "tone";
import "bootstrap/dist/css/bootstrap.min.css";
import MouthControl from "./MouthControl.jsx"; 

export default function Home() {
  const [started, setStarted] = useState(false);
  const [currentInstrument, setCurrentInstrument] = useState("piano");
  const [octaveOffset, setOctaveOffset] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(true);

  const [instrumentVisible, setInstrumentVisible] = useState(false);
  const [midiVisible, setMidiVisible] = useState(false);
  const [spectrumVisible, setSpectrumVisible] = useState(false);
  const [mouthVisible, setMouthVisible] = useState(false);


  
  // ⚡ 延後建立 Analyser 和 Synths
  const analyserRef = useRef(null);
  const synthsRef = useRef(null);

  // 點 Start 後初始化
  const handleStart = async () => {
    await Tone.start(); // 確保 AudioContext 由使用者互動觸發
    console.log("AudioContext 已啟動");

    // 建立 analyser
    analyserRef.current = new Tone.Analyser("fft", 256);

    // 建立 synths
    synthsRef.current = {
      piano: new Tone.PolySynth(Tone.Synth, {
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.5, release: 1.5 },
      }),
      guitar: new Tone.DuoSynth({
        voice0: { volume: -10 },
        voice1: { volume: -10 },
        harmonicity: 1.5,
        envelope: { attack: 0.02, decay: 0.3, sustain: 0.5, release: 1.5 },
        filterEnvelope: { attack: 0.01, decay: 0.3, sustain: 0.5, release: 1.5 },
      }),
      violin: new Tone.AMSynth({
        oscillator: { type: "sawtooth" },
        envelope: { attack: 0.05, decay: 0.3, sustain: 0.5, release: 1.5 },
      }),
      bass: new Tone.MonoSynth({
        oscillator: { type: "square" },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.8, release: 1.2 },
      }),
      melodica: new Tone.FMSynth({
        modulationIndex: 10,
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.5, release: 1.5 },
        modulationEnvelope: { attack: 0.01, decay: 0.3, sustain: 0.5, release: 1.5 },
      }),
    };

    // 連接 analyser 並送到 Destination
    Object.values(synthsRef.current).forEach((synth) => {
      synth.disconnect();
      synth.connect(analyserRef.current);
    });
    analyserRef.current.connect(Tone.getDestination());

    // piano polyphony 限制
    if (synthsRef.current.piano.maxPolyphony !== undefined) {
      synthsRef.current.piano.maxPolyphony = 15;
    }

    setStarted(true); // 切換到主畫面
  };
  return (
    <>
      {!started && <Start onStart={handleStart} />}

      {started && (
        <div className="vh-100 vw-100 bg-dark text-light position-relative overflow-hidden">
          {/* 左上角控制區 */}
          <div className="position-absolute top-0 start-0 p-3" style={{ zIndex: 20 }}>
            <div className="container-fluid">
              <div className="row g-3 align-items-start">
                {/* Instrument */}
                <div className="col-auto">
                  <div className="card bg-secondary text-light shadow">
                    <div className="card-header p-2">
                      <button
                        className="btn btn-sm btn-outline-light"
                        onClick={() => setInstrumentVisible(!instrumentVisible)}
                      >
                        {instrumentVisible ? "▼" : "▶"} 樂器
                      </button>
                    </div>
                    {instrumentVisible && (
                      <div className="card-body p-2">
                        <Instrument
                          current={currentInstrument}
                          onChange={setCurrentInstrument}
                          toggleKeyboard={() => setKeyboardVisible(!keyboardVisible)}
                          toggleSpectrum={() => setSpectrumVisible(!spectrumVisible)}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* MIDI Player */}
                <div className="col-auto">
                  <div className="card bg-secondary text-light shadow" style={{ zIndex: 15 }}>
                    <div className="card-header p-2">
                      <button
                        className="btn btn-sm btn-outline-light"
                        onClick={() => setMidiVisible(!midiVisible)}
                      >
                        {midiVisible ? "▼" : "▶"} MIDI 播放器
                      </button>
                    </div>
                    {midiVisible && (
                      <div className="card-body p-2">
                        <MidiPlayer
                          synthsRef={synthsRef}
                          currentInstrument={currentInstrument}
                          setCurrentInstrument={setCurrentInstrument}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Spectrum */}
                <div className="col-auto">
                  <div className="card bg-secondary text-light shadow">
                    <div className="card-header p-2">
                      <button
                        className="btn btn-sm btn-outline-light"
                        onClick={() => setSpectrumVisible(!spectrumVisible)}
                      >
                        {spectrumVisible ? "▼" : "▶"} 頻譜
                      </button>
                    </div>
                    {spectrumVisible && (
                      <div className="card-body p-2">
                        <Spectrum analyserRef={analyserRef} />
                      </div>
                    )}
                  </div>
                </div>

                 {/* Mouth Control 新增 */}
                <div className="col-auto">
                  <div className="card bg-secondary text-light shadow">
                    <div className="card-header p-2">
                      <button
                        className="btn btn-sm btn-outline-light"
                        onClick={() => setMouthVisible(!mouthVisible)}
                      >
                        {mouthVisible ? "▼" : "▶"} Mouth Control
                      </button>
                    </div>
                    {mouthVisible && (
                      <div className="card-body p-2">
                        <MouthControl synthsRef={synthsRef} currentInstrument={currentInstrument} />
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* 下方鍵盤 */}
          {keyboardVisible && (
            <div className="position-absolute bottom-0 start-0 w-100" style={{ zIndex: 10, backgroundColor: "#111" }}>
              <Keyboard
                synthsRef={synthsRef}
                analyserRef={analyserRef}  //給 Keyboard
                currentInstrument={currentInstrument}
                setCurrentInstrument={setCurrentInstrument}
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
