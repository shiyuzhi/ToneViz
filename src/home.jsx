import React, { useState, useRef } from "react";
import Start from "./start.jsx";
import Instrument from "./Instrument.jsx";
import MidiPlayer from "./midplayer.jsx";
import Spectrum from "./Spectrum.jsx";
import Keyboard from "./Keyboard.jsx";
import MouthControl from "./MouthControl.jsx";
import VoiceControl from "./VoiceControl.jsx";
import MidiLyricsDemo  from "./MidiLyricsDemo.jsx";
import DraggableSpectrum from "./DraggableSpectrum.jsx";
import * as Tone from "tone";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './Home.css';

export default function Home() {
  const [started, setStarted] = useState(false);
  const [currentInstrument, setCurrentInstrument] = useState("piano");
  const [octaveOffset, setOctaveOffset] = useState(0);

  const [keyboardVisible, setKeyboardVisible] = useState(true);
  const [instrumentVisible, setInstrumentVisible] = useState(false);
  const [midiVisible, setMidiVisible] = useState(false);
  const [mouthVisible, setMouthVisible] = useState(false);
  const [voiceVisible, setVoiceVisible] = useState(false);
  const [spectrumVisible, setSpectrumVisible] = useState(false);
  const [lyricsForDemo, setLyricsForDemo] = useState([]);

  const analyserRef = useRef(null);
  const synthsRef = useRef(null);
  const midiPlayerRef = useRef(null);

  const [currentSong, setCurrentSong] = useState(null);
  const [allSongs, setAllSongs] = useState([
      { id: 1001, name: "孤女的願望", fileUrl: "/midi/孤女的願望.mid" },
      { id: 1002, name: "甜蜜蜜", fileUrl: "/midi/甜蜜蜜.mid" },
  ]);

  const [currentTime, setCurrentTime] = useState(0);

  const handleProgress = (progress) => {
    setCurrentTime(progress);
  };
  const handleStart = async () => {
    await Tone.start();
    analyserRef.current = new Tone.Analyser("fft", 256);

    synthsRef.current = {
      piano: new Tone.PolySynth(Tone.Synth, { envelope: { attack: 0.01, decay: 0.3, sustain: 0.5, release: 1.5 } }),
      guitar: new Tone.DuoSynth({
        voice0: { volume: -10 }, voice1: { volume: -10 }, harmonicity: 1.5,
        envelope: { attack: 0.02, decay: 0.3, sustain: 0.5, release: 1.5 },
        filterEnvelope: { attack: 0.01, decay: 0.3, sustain: 0.5, release: 1.5 },
      }),
      violin: new Tone.AMSynth({ oscillator: { type: "sawtooth" }, envelope: { attack: 0.05, decay: 0.3, sustain: 0.5, release: 1.5 } }),
      bass: new Tone.MonoSynth({ oscillator: { type: "square" }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.8, release: 1.2 } }),
      melodica: new Tone.FMSynth({
        modulationIndex: 10,
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.5, release: 1.5 },
        modulationEnvelope: { attack: 0.01, decay: 0.3, sustain: 0.5, release: 1.5 },
      }),
    };

    Object.values(synthsRef.current).forEach((synth) => {
      synth.disconnect();
      synth.connect(analyserRef.current);
    });
    analyserRef.current.connect(Tone.getDestination());

    setStarted(true);
  };

  const handleSongLoaded = (songWithLyrics) => {
    setCurrentSong(songWithLyrics);
    setAllSongs(prev => prev.find(s => s.id === songWithLyrics.id) ? prev : [...prev, songWithLyrics]);
  };

  return (
    <>
      {!started && <Start onStart={handleStart} />}

      {started && (
        <div className="vh-100 vw-100 bg-dark text-light position-relative overflow-hidden">

          {/* Navbar */}
          <nav className="navbar navbar-expand-lg navbar-dark bg-dark position-absolute top-0 w-100" style={{ zIndex: 50 }}>
            <div className="container-fluid">
              <a className="navbar-brand" href="#">音樂系統</a>

              <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarContent" aria-controls="navbarContent" aria-expanded="false" aria-label="Toggle navigation">
                <span className="navbar-toggler-icon"></span>
              </button>

              <div className="collapse navbar-collapse" id="navbarContent">
                <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                  <li className="nav-item dropdown">
                    <a className="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                      功能選單
                    </a>
                    <ul className="dropdown-menu">
                      <li><button className="dropdown-item" onClick={() => setKeyboardVisible(!keyboardVisible)}>鍵盤 {keyboardVisible ? "▼" : "▶"}</button></li>
                      <li><button className="dropdown-item" onClick={() => setSpectrumVisible(!spectrumVisible)}>頻譜 {spectrumVisible ? "▼" : "▶"}</button></li>
                      <li><button className="dropdown-item" onClick={() => setMidiVisible(!midiVisible)}>MIDI 播放器 {midiVisible ? "▼" : "▶"}</button></li>
                      <li><button className="dropdown-item" onClick={() => setMouthVisible(!mouthVisible)}>Mouth Control {mouthVisible ? "▼" : "▶"}</button></li>
                      <li><button className="dropdown-item" onClick={() => setVoiceVisible(!voiceVisible)}>Voice Control {voiceVisible ? "▼" : "▶"}</button></li>
                    </ul>
                  </li>
                </ul>
              </div>
            </div>
          </nav>

          {/* 選單區改成三欄布局 */}
          <div className="position-absolute top-0 start-0 end-0" style={{ zIndex: 20, paddingTop: "40px", paddingBottom: "120px", display: "flex", gap: "1rem" }}>
            
            {/* MIDI 播放器區 */}
            <div style={{ flex: 1, backgroundColor: "#222", borderRadius: "8px", padding: "0.1rem", overflowY: "auto" }}>
              {midiVisible && <MidiPlayer
              ref={midiPlayerRef}
              synthsRef={synthsRef}
              songs={allSongs}
              onLyricsUpdate={(lyrics) => setLyricsForDemo(lyrics)}
            />}
            </div>

            {/* 辨識區 */}
            <div style={{ flex: 1, backgroundColor: "#333", borderRadius: "8px", padding: "0.1rem", overflowY: "auto" }}>
              {mouthVisible && <MouthControl synthsRef={synthsRef} currentInstrument={currentInstrument} midiPlayerRef={midiPlayerRef} currentSong={currentSong} setCurrentSong={setCurrentSong} songs={allSongs} onSelectSong={setCurrentSong} />}
              {voiceVisible && <VoiceControl synthsRef={synthsRef} currentInstrument={currentInstrument} midiPlayerRef={midiPlayerRef} currentSong={currentSong} setCurrentSong={setCurrentSong} songs={allSongs} />}
            </div>

            {/* 歌詞區 */}
            <div style={{ flex: 1, backgroundColor: "#111", borderRadius: "8px", padding: "0.1rem", overflowY: "auto" }}>
             <MidiLyricsDemo lyrics={lyricsForDemo} />
            </div>

          </div>
           
           {/*頻譜顯示區*/}
           {spectrumVisible && (
              <DraggableSpectrum analyserRef={analyserRef} />
           )}


          {/* 下方鍵盤 */}
          {keyboardVisible && (
            <div className="position-absolute bottom-0 start-0 w-100" style={{ zIndex: 10, backgroundColor: "#111" }}>
              <Keyboard synthsRef={synthsRef} analyserRef={analyserRef} currentInstrument={currentInstrument} setCurrentInstrument={setCurrentInstrument} octaveOffset={octaveOffset} setOctaveOffset={setOctaveOffset} />
            </div>
          )}
        </div>
      )}
    </>
  );
}
