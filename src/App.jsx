import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

const CANVAS_W = 600;
const CANVAS_H = 800;

const ROOMS = [
  { id: 'SALON',      name: 'Salon',      area: 21.79, icon: '🛋️', x: 70,  y: 80,  w: 160, h: 200 },
  { id: 'SYPIALNIA',  name: 'Sypialnia',  area: 9.04,  icon: '🛏️', x: 70,  y: 290, w: 160, h: 120 },
  { id: 'KUCHNIA',    name: 'Kuchnia',    area: 4.86,  icon: '🍳', x: 380, y: 80,  w: 150, h: 140 },
  { id: 'POKOJ',      name: 'Pokój',      area: 8.10,  icon: '🪑', x: 240, y: 190, w: 130, h: 160 },
  { id: 'POKOJ_2',    name: 'Pokój 2',    area: 21.79, icon: '🛋️', x: 70,  y: 420, w: 240, h: 300 },
  { id: 'TV_ROOM',    name: 'TV Room',    area: 25.0,  icon: '📺', x: 310, y: 420, w: 220, h: 300 },
  { id: 'PRZEDPOKOJ', name: 'Przedpokój', area: 3.77,  icon: '🚪', x: 380, y: 230, w: 150, h: 90  },
  { id: 'LAZIENKA',   name: 'Łazienka',   area: 3.61,  icon: '🛁', x: 380, y: 330, w: 150, h: 80  },
];

const DEFAULT_WALL = '#f0f0f0';
const DEFAULT_FURN = '#1a1a1a';
const DEFAULT_FLOOR = '#d4a574';
const ACCENT = '#4a90e2';

const FLOORS = {
  drewno:   { label: 'Drewno',   color: '#d4a574', pattern: 'wood' },
  terakota: { label: 'Terakota', color: '#b96a4d', pattern: 'tile' },
  beton:    { label: 'Beton',    color: '#8a8a8a', pattern: 'plain' },
};

const PRESETS = {
  Nowoczesny: { floor: '#d4a574', walls: '#f0f0f0', furniture: '#1a1a1a' },
  Klasyk:     { floor: '#c9a876', walls: '#ede6da', furniture: '#5a4a3a' },
  Minimalizm: { floor: '#999999', walls: '#f5f5f5', furniture: '#888888' },
  Luksus:     { floor: '#2a2a2a', walls: '#0a0a0a', furniture: '#1a1a1a' },
};

const DEFAULT_STATE = () => ({
  rooms: ROOMS.reduce((acc, r) => {
    acc[r.id] = { walls: DEFAULT_WALL, furniture: DEFAULT_FURN };
    return acc;
  }, {}),
  light: 0.85,
  floor: 'drewno',
  preset: 'Nowoczesny',
});

function applyLight(hex, light) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const f = Math.max(0.3, Math.min(1, light));
  const tr = Math.round(r * f);
  const tg = Math.round(g * f);
  const tb = Math.round(b * f);
  return `rgb(${tr}, ${tg}, ${tb})`;
}

function FurnitureLayer({ room, color }) {
  const { id, x, y, w, h } = room;
  const pad = 10;
  const items = [];
  switch (id) {
    case 'SALON':
      items.push(<rect key="sofa" x={x + pad} y={y + h - 50} width={w - 2 * pad} height={28} rx={4} fill={color} />);
      items.push(<rect key="tv" x={x + w / 2 - 30} y={y + pad} width={60} height={10} fill={color} />);
      items.push(<rect key="table" x={x + w / 2 - 25} y={y + h / 2 - 12} width={50} height={24} rx={4} fill={color} opacity={0.85} />);
      break;
    case 'SYPIALNIA':
      items.push(<rect key="bed" x={x + pad} y={y + pad} width={w - 2 * pad} height={h - 2 * pad - 20} rx={6} fill={color} />);
      items.push(<rect key="ns1" x={x + pad} y={y + h - 30} width={28} height={20} fill={color} opacity={0.7} />);
      items.push(<rect key="ns2" x={x + w - pad - 28} y={y + h - 30} width={28} height={20} fill={color} opacity={0.7} />);
      break;
    case 'KUCHNIA':
      items.push(<rect key="counter" x={x + pad} y={y + pad} width={w - 2 * pad} height={22} fill={color} />);
      items.push(<rect key="island" x={x + pad} y={y + h - 40} width={w - 2 * pad} height={26} rx={3} fill={color} opacity={0.8} />);
      break;
    case 'POKOJ':
      items.push(<rect key="desk" x={x + pad} y={y + pad} width={w - 2 * pad} height={28} fill={color} />);
      items.push(<rect key="chair" x={x + w / 2 - 12} y={y + pad + 32} width={24} height={24} rx={4} fill={color} opacity={0.8} />);
      break;
    case 'POKOJ_2':
      items.push(<rect key="bed" x={x + pad} y={y + pad} width={w - 2 * pad} height={70} rx={6} fill={color} />);
      items.push(<rect key="ward" x={x + pad} y={y + h - 50} width={w - 2 * pad} height={36} fill={color} opacity={0.85} />);
      break;
    case 'TV_ROOM':
      items.push(<rect key="sofa" x={x + pad} y={y + h - 60} width={w - 2 * pad} height={36} rx={6} fill={color} />);
      items.push(<rect key="tv" x={x + w / 2 - 50} y={y + pad} width={100} height={12} fill={color} />);
      items.push(<rect key="rug" x={x + pad + 20} y={y + h / 2 - 30} width={w - 2 * pad - 40} height={50} rx={4} fill={color} opacity={0.4} />);
      break;
    case 'PRZEDPOKOJ':
      items.push(<rect key="rack" x={x + pad} y={y + pad} width={w - 2 * pad} height={14} fill={color} />);
      break;
    case 'LAZIENKA':
      items.push(<rect key="tub" x={x + pad} y={y + pad} width={70} height={h - 2 * pad} rx={8} fill={color} />);
      items.push(<rect key="sink" x={x + w - pad - 30} y={y + pad} width={30} height={24} fill={color} opacity={0.8} />);
      break;
    default:
      break;
  }
  return <g>{items}</g>;
}

export default function App() {
  const [state, setState] = useState(DEFAULT_STATE);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [bgImage, setBgImage] = useState(null);
  const [bgOpacity, setBgOpacity] = useState(0.15);
  const [copied, setCopied] = useState(false);
  const svgRef = useRef(null);

  // Load shared config from URL hash on mount
  useEffect(() => {
    if (window.location.hash.startsWith('#cfg=')) {
      try {
        const raw = decodeURIComponent(window.location.hash.slice(5));
        const decoded = JSON.parse(atob(raw));
        if (decoded && decoded.rooms) setState(decoded);
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const pushHistory = (prev) => {
    setHistory((h) => [...h.slice(-49), prev]);
    setFuture([]);
  };

  const update = (mutator) => {
    setState((prev) => {
      pushHistory(prev);
      const next = typeof mutator === 'function' ? mutator(prev) : mutator;
      return next;
    });
  };

  const undo = () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setFuture((f) => [state, ...f]);
      setState(prev);
      return h.slice(0, -1);
    });
  };

  const redo = () => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[0];
      setHistory((h) => [...h, state]);
      setState(next);
      return f.slice(1);
    });
  };

  const setRoomColor = (roomId, key, color) => {
    update((prev) => ({
      ...prev,
      rooms: { ...prev.rooms, [roomId]: { ...prev.rooms[roomId], [key]: color } },
    }));
  };

  const setLight = (v) =>
    update((prev) => ({ ...prev, light: parseFloat(v) }));

  const setFloor = (v) => update((prev) => ({ ...prev, floor: v }));

  const applyPreset = (name) => {
    const p = PRESETS[name];
    if (!p) return;
    update((prev) => ({
      ...prev,
      preset: name,
      rooms: ROOMS.reduce((acc, r) => {
        acc[r.id] = { walls: p.walls, furniture: p.furniture };
        return acc;
      }, {}),
      floor: name === 'Nowoczesny' ? 'drewno' : name === 'Klasyk' ? 'drewno' : name === 'Minimalizm' ? 'beton' : 'beton',
    }));
  };

  const reset = () => {
    pushHistory(state);
    setState(DEFAULT_STATE());
    setBgImage(null);
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(state, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      alert('Nie można skopiować do schowka');
    }
  };

  const shareUrl = async () => {
    const encoded = btoa(JSON.stringify(state));
    const url = `${window.location.origin}${window.location.pathname}#cfg=${encodeURIComponent(encoded)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      prompt('Skopiuj ten URL:', url);
    }
  };

  const downloadPng = async () => {
    const svg = svgRef.current;
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const svg64 = btoa(unescape(encodeURIComponent(xml)));
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_W * 2;
      canvas.height = CANVAS_H * 2;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `mieszkanie-${Date.now()}.png`;
      a.click();
    };
    img.src = `data:image/svg+xml;base64,${svg64}`;
  };

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBgImage(reader.result);
    reader.readAsDataURL(file);
  };

  const floorColor = useMemo(() => FLOORS[state.floor]?.color || DEFAULT_FLOOR, [state.floor]);
  const floorPattern = FLOORS[state.floor]?.pattern || 'wood';

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="dot" />
          <strong>Wizualizator Mieszkania</strong>
          <span className="muted">· interaktywny edytor</span>
        </div>
        <div className="topbar-actions">
          <button onClick={undo} disabled={history.length === 0} title="Cofnij (Ctrl+Z)">
            ↶ Cofnij
          </button>
          <button onClick={redo} disabled={future.length === 0} title="Ponów">
            ↷ Ponów
          </button>
        </div>
      </header>

      <div className="layout">
        <section className="left">
          <div className="canvas-wrap">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
              width="100%"
              height="100%"
              preserveAspectRatio="xMidYMid meet"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern id="wood" patternUnits="userSpaceOnUse" width="40" height="80">
                  <rect width="40" height="80" fill={applyLight(floorColor, state.light)} />
                  <line x1="0" y1="0" x2="40" y2="0" stroke="rgba(0,0,0,0.18)" strokeWidth="1" />
                  <line x1="0" y1="40" x2="40" y2="40" stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
                  <line x1="20" y1="0" x2="20" y2="40" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
                  <line x1="0" y1="40" x2="0" y2="80" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
                </pattern>
                <pattern id="tile" patternUnits="userSpaceOnUse" width="30" height="30">
                  <rect width="30" height="30" fill={applyLight(floorColor, state.light)} />
                  <rect width="30" height="30" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="1" />
                </pattern>
                <pattern id="plain" patternUnits="userSpaceOnUse" width="10" height="10">
                  <rect width="10" height="10" fill={applyLight(floorColor, state.light)} />
                </pattern>
                <filter id="soft">
                  <feGaussianBlur stdDeviation="0.4" />
                </filter>
              </defs>

              <rect x="0" y="0" width={CANVAS_W} height={CANVAS_H} fill="#111" />

              {bgImage && (
                <image
                  href={bgImage}
                  x="0"
                  y="0"
                  width={CANVAS_W}
                  height={CANVAS_H}
                  opacity={bgOpacity}
                  preserveAspectRatio="xMidYMid slice"
                />
              )}

              {ROOMS.map((room) => {
                const colors = state.rooms[room.id];
                const wallColor = applyLight(colors.walls, state.light);
                return (
                  <g key={room.id}>
                    <rect
                      x={room.x}
                      y={room.y}
                      width={room.w}
                      height={room.h}
                      fill={`url(#${floorPattern})`}
                      stroke="#000"
                      strokeWidth="2"
                    />
                    <rect
                      x={room.x}
                      y={room.y}
                      width={room.w}
                      height={room.h}
                      fill={wallColor}
                      opacity="0.35"
                    />
                    <rect
                      x={room.x}
                      y={room.y}
                      width={room.w}
                      height={room.h}
                      fill="none"
                      stroke={wallColor}
                      strokeWidth="6"
                      opacity="0.9"
                    />
                    <FurnitureLayer
                      room={room}
                      color={applyLight(colors.furniture, state.light)}
                    />
                    <text
                      x={room.x + room.w / 2}
                      y={room.y + room.h / 2 - 4}
                      textAnchor="middle"
                      fontSize="14"
                      fontWeight="700"
                      fill="#fff"
                      stroke="#000"
                      strokeWidth="3"
                      paintOrder="stroke"
                    >
                      {room.icon} {room.name}
                    </text>
                    <text
                      x={room.x + room.w / 2}
                      y={room.y + room.h / 2 + 12}
                      textAnchor="middle"
                      fontSize="11"
                      fill="#fff"
                      stroke="#000"
                      strokeWidth="2.5"
                      paintOrder="stroke"
                      opacity="0.95"
                    >
                      {room.area} m²
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </section>

        <aside className="right">
          <div className="section">
            <h3>Styl</h3>
            <label className="row">
              <span>Preset</span>
              <select
                value={state.preset}
                onChange={(e) => applyPreset(e.target.value)}
              >
                {Object.keys(PRESETS).map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <label className="row">
              <span>Podłoga</span>
              <select
                value={state.floor}
                onChange={(e) => setFloor(e.target.value)}
              >
                {Object.entries(FLOORS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="row">
              <span>Oświetlenie</span>
              <div className="slider-wrap">
                <input
                  type="range"
                  min="0.3"
                  max="1"
                  step="0.01"
                  value={state.light}
                  onChange={(e) => setLight(e.target.value)}
                />
                <span className="muted small">
                  {Math.round(state.light * 100)}%
                </span>
              </div>
            </label>
          </div>

          <div className="section">
            <h3>Pokoje</h3>
            {ROOMS.map((room) => {
              const c = state.rooms[room.id];
              return (
                <div key={room.id} className="room-card">
                  <div className="room-head">
                    <span className="room-icon">{room.icon}</span>
                    <strong>{room.name}</strong>
                    <span className="muted small">{room.area} m²</span>
                  </div>
                  <div className="room-row">
                    <label>
                      <span>Ściany</span>
                      <div className="color-pair">
                        <input
                          type="color"
                          value={c.walls}
                          onChange={(e) => setRoomColor(room.id, 'walls', e.target.value)}
                        />
                        <input
                          type="text"
                          value={c.walls}
                          onChange={(e) => setRoomColor(room.id, 'walls', e.target.value)}
                        />
                      </div>
                    </label>
                    <label>
                      <span>Meble</span>
                      <div className="color-pair">
                        <input
                          type="color"
                          value={c.furniture}
                          onChange={(e) => setRoomColor(room.id, 'furniture', e.target.value)}
                        />
                        <input
                          type="text"
                          value={c.furniture}
                          onChange={(e) => setRoomColor(room.id, 'furniture', e.target.value)}
                        />
                      </div>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="section">
            <h3>Plan w tle (opcjonalnie)</h3>
            <input type="file" accept="image/*" onChange={handleUpload} />
            {bgImage && (
              <label className="row">
                <span>Krycie</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={bgOpacity}
                  onChange={(e) => setBgOpacity(parseFloat(e.target.value))}
                />
              </label>
            )}
          </div>

          <div className="section actions">
            <button onClick={reset}>Reset</button>
            <button className="primary" onClick={downloadPng}>
              ⬇ Pobierz PNG
            </button>
            <button onClick={copyJson}>
              {copied ? '✓ Skopiowano' : '⧉ Kopiuj JSON'}
            </button>
            <button onClick={shareUrl}>🔗 Link</button>
          </div>
        </aside>
      </div>
    </div>
  );
}
