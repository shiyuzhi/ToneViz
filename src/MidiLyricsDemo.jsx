// src/MidiLyricsDemoKaraokeScroll.jsx
import React, { useState, useRef } from "react";
import MidiParser from "midi-parser-js";
import Encoding from "encoding-japanese";

export default function MidiLyricsDemoKaraokeScroll() {
  const [currentSong, setCurrentSong] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const intervalRef = useRef(null);
  const startTimestamp = useRef(0);

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

        if (ev.metaType === 0x51 && ev.data && ev.data.length === 3) {
          const microsecondsPerBeat =
            (ev.data[0] << 16) + (ev.data[1] << 8) + ev.data[2];
          if (microsecondsPerBeat > 0) {
            bpmEvents.push({ tick: currentTick, bpm: 60000000 / microsecondsPerBeat });
          }
        }

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

    // 計算每個歌詞的時間（秒）
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
    setIsPlaying(false);
  };

  const handlePlay = () => {
    if (!currentSong) return;
    if (intervalRef.current) clearInterval(intervalRef.current);

    setIsPlaying(true);
    startTimestamp.current = Date.now() - currentTime * 1000;

    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimestamp.current) / 1000;
      const lastTime = currentSong.lyrics[currentSong.lyrics.length - 1]?.time || 0;

      if (elapsed > lastTime + 1) {
        startTimestamp.current = Date.now();
        setCurrentTime(0);
      } else {
        setCurrentTime(elapsed);
      }
    }, 50);
  };

  const handlePause = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsPlaying(false);
  };

  // 計算滾動距離
  const getScrollTransform = () => {
    if (!currentSong) return 0;
    const speed = 50; // px/s，可自行調整
    return currentTime * speed;
  };

  return (
    <div style={{ fontFamily: "sans-serif", width: "100%" }}>
      <input type="file" accept=".mid,.midi" onChange={handleUpload} />
      {currentSong && (
        <div style={{ marginTop: "12px" }}>
          <h3>{currentSong.name}</h3>
          <button onClick={handlePlay} disabled={isPlaying}>Play</button>
          <button onClick={handlePause} disabled={!isPlaying}>Pause</button>

          <div
            style={{
              width: "100%",
              height: "40px",
              overflow: "hidden",
              backgroundColor: "#fff",
              color: "#000",
              padding: "8px",
              marginTop: "12px",
              whiteSpace: "nowrap",
              border: "1px solid #ccc",
              fontSize: "18px"
            }}
          >
            <span
              style={{
                display: "inline-block",
                transform: `translateX(-${getScrollTransform()}px)`,
                transition: "transform 0.05s linear"
              }}
            >
              {currentSong.lyrics.map(l => l.text).join(" ")}
            </span>
          </div>

          <div style={{ marginTop: "6px" }}>Time: {currentTime.toFixed(2)}s</div>
        </div>
      )}
    </div>
  );
}
