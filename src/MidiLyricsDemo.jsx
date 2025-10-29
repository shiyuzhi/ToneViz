// src/MidiLyricsDemo.jsx
import React, { useState, useRef, useEffect } from "react";
import MidiParser from "midi-parser-js";
import Encoding from "encoding-japanese";

export default function MidiLyricsDemo() {
  const [currentSong, setCurrentSong] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const intervalRef = useRef(null);
  const lyricsRefs = useRef([]);
  const lastScrolledIndex = useRef(-1);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const midi = MidiParser.parse(uint8Array);

    const ticksPerBeat = midi.timeDivision;
    if (!ticksPerBeat || ticksPerBeat <= 0) return;

    let lyrics = [];
    let bpmEvents = [{ tick: 0, bpm: 120 }];

    midi.track.forEach((track) => {
      let currentTick = 0;
      track.event.forEach((ev) => {
        currentTick += ev.deltaTime;

        // tempo event
        if (ev.metaType === 0x51 && ev.data && ev.data.length === 3) {
          const microsecondsPerBeat =
            (ev.data[0] << 16) + (ev.data[1] << 8) + ev.data[2];
          if (microsecondsPerBeat > 0) {
            bpmEvents.push({ tick: currentTick, bpm: 60000000 / microsecondsPerBeat });
          }
        }

        // lyric event
        if (ev.metaType === 0x05 && ev.data) {
          let byteArr = Array.isArray(ev.data)
            ? ev.data
            : typeof ev.data === "string"
            ? Encoding.stringToCode(ev.data)
            : [ev.data];

          let text = Encoding.convert(byteArr, { to: "UNICODE", type: "string", from: "AUTO" });
          lyrics.push({ tick: currentTick, text });
        }
      });
    });

    bpmEvents.sort((a, b) => a.tick - b.tick);
    lyrics.sort((a, b) => a.tick - b.tick);

    let seconds = 0;
    let lastTick = 0;
    let currentBpm = 120;
    let bpmIndex = 0;

    const lyricsWithTime = lyrics.map((l) => {
      while (bpmIndex + 1 < bpmEvents.length && l.tick >= bpmEvents[bpmIndex + 1].tick) {
        const nextBpmEvent = bpmEvents[bpmIndex + 1];
        const deltaTicks = nextBpmEvent.tick - lastTick;
        if (currentBpm > 0 && ticksPerBeat > 0)
          seconds += (deltaTicks * 60) / (currentBpm * ticksPerBeat);
        lastTick = nextBpmEvent.tick;
        currentBpm = nextBpmEvent.bpm;
        bpmIndex++;
      }
      const deltaTicks = l.tick - lastTick;
      const time =
        currentBpm > 0 && ticksPerBeat > 0
          ? seconds + (deltaTicks * 60) / (currentBpm * ticksPerBeat)
          : seconds;
      return { time, text: l.text };
    });

    setCurrentSong({ name: file.name, lyrics: lyricsWithTime });
    setCurrentTime(0);
    lyricsRefs.current = [];
    lastScrolledIndex.current = -1;
  };

  const handlePlay = () => {
    if (!currentSong) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    const startTime = Date.now() - currentTime * 1000;

    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed > currentSong.lyrics[currentSong.lyrics.length - 1].time + 0.5) {
        clearInterval(intervalRef.current);
      }
      setCurrentTime(elapsed);
    }, 50);
  };

  const handlePause = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  // 自動滾動到當前歌詞
  useEffect(() => {
    if (!currentSong) return;
    const currentIndex = currentSong.lyrics.findIndex(
      (l, i) =>
        currentTime >= l.time &&
        (i === currentSong.lyrics.length - 1 || currentTime < currentSong.lyrics[i + 1].time)
    );
    if (currentIndex >= 0 && currentIndex !== lastScrolledIndex.current) {
      const el = lyricsRefs.current[currentIndex];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      lastScrolledIndex.current = currentIndex;
    }
  }, [currentTime, currentSong]);

  return (
    <div style={{ maxHeight: "400px", overflowY: "auto" }}>
      <input type="file" accept=".mid,.midi" onChange={handleUpload} />
      {currentSong && (
        <div>
          <h3>{currentSong.name}</h3>
          <button onClick={handlePlay}>Play</button>
          <button onClick={handlePause}>Pause</button>
          <ul>
            {currentSong.lyrics.map((l, i) => {
              const isCurrent =
                currentTime >= l.time &&
                (i === currentSong.lyrics.length - 1 || currentTime < currentSong.lyrics[i + 1].time);
              return (
                <li
                  key={i}
                  ref={(el) => (lyricsRefs.current[i] = el)}
                  style={{ color: isCurrent ? "red" : "black" }}
                >
                  {l.time.toFixed(2)}s - {l.text}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
