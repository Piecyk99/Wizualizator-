import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Html } from '@react-three/drei';
import * as THREE from 'three';
import './App.css';

// 1 unit = 1 meter. Plan based on the user's floor plan (top-down meters).
// X = right, Z = forward (so Y is up). Each room: x,z = top-left in meters; w = width (X), d = depth (Z).
const ROOMS = [
  { id: 'SALON',      name: 'Salon',      area: 21.79, icon: '🛋️', x: 0.7,  z: 0.8,  w: 1.6, d: 2.0 },
  { id: 'SYPIALNIA',  name: 'Sypialnia',  area: 9.04,  icon: '🛏️', x: 0.7,  z: 2.9,  w: 1.6, d: 1.2 },
  { id: 'KUCHNIA',    name: 'Kuchnia',    area: 4.86,  icon: '🍳', x: 3.8,  z: 0.8,  w: 1.5, d: 1.4 },
  { id: 'POKOJ',      name: 'Pokój',      area: 8.10,  icon: '🪑', x: 2.4,  z: 1.9,  w: 1.3, d: 1.6 },
  { id: 'POKOJ_2',    name: 'Pokój 2',    area: 21.79, icon: '🛋️', x: 0.7,  z: 4.2,  w: 2.4, d: 3.0 },
  { id: 'TV_ROOM',    name: 'TV Room',    area: 25.0,  icon: '📺', x: 3.1,  z: 4.2,  w: 2.2, d: 3.0 },
  { id: 'PRZEDPOKOJ', name: 'Przedpokój', area: 3.77,  icon: '🚪', x: 3.8,  z: 2.3,  w: 1.5, d: 0.9 },
  { id: 'LAZIENKA',   name: 'Łazienka',   area: 3.61,  icon: '🛁', x: 3.8,  z: 3.3,  w: 1.5, d: 0.8 },
];

const PLAN_W = 6;   // meters total
const PLAN_D = 7.5; // meters total
const WALL_H = 2.7; // meters
const WALL_T = 0.08;

const DEFAULT_WALL = '#f0f0f0';
const DEFAULT_FURN = '#1a1a1a';

const FLOORS = {
  drewno:   { label: 'Drewno',   color: '#d4a574' },
  terakota: { label: 'Terakota', color: '#b96a4d' },
  beton:    { label: 'Beton',    color: '#8a8a8a' },
};

const PRESETS = {
  Nowoczesny: { floor: 'drewno',   walls: '#f0f0f0', furniture: '#1a1a1a' },
  Klasyk:     { floor: 'drewno',   walls: '#ede6da', furniture: '#5a4a3a' },
  Minimalizm: { floor: 'beton',    walls: '#f5f5f5', furniture: '#888888' },
  Luksus:     { floor: 'beton',    walls: '#0a0a0a', furniture: '#1a1a1a' },
};

const DEFAULT_STATE = () => ({
  rooms: ROOMS.reduce((acc, r) => {
    acc[r.id] = { walls: DEFAULT_WALL, furniture: DEFAULT_FURN };
    return acc;
  }, {}),
  light: 0.85,
  floor: 'drewno',
  preset: 'Nowoczesny',
  showRoof: false,
  view: 'orbit',
});

// Convert plan coords (origin top-left) to world coords (centered).
function toWorld(x, z) {
  return [x - PLAN_W / 2, 0, z - PLAN_D / 2];
}

function Room({ room, colors, floorColor, light }) {
  const [wx, , wz] = toWorld(room.x, room.z);
  const cx = wx + room.w / 2;
  const cz = wz + room.d / 2;

  return (
    <group>
      {/* floor */}
      <mesh position={[cx, 0, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[room.w, room.d]} />
        <meshStandardMaterial color={floorColor} roughness={0.85} metalness={0.05} />
      </mesh>
      {/* walls: 4 thin boxes around room perimeter */}
      <mesh position={[cx, WALL_H / 2, wz]} castShadow receiveShadow>
        <boxGeometry args={[room.w, WALL_H, WALL_T]} />
        <meshStandardMaterial color={colors.walls} roughness={0.95} />
      </mesh>
      <mesh position={[cx, WALL_H / 2, wz + room.d]} castShadow receiveShadow>
        <boxGeometry args={[room.w, WALL_H, WALL_T]} />
        <meshStandardMaterial color={colors.walls} roughness={0.95} />
      </mesh>
      <mesh position={[wx, WALL_H / 2, cz]} castShadow receiveShadow>
        <boxGeometry args={[WALL_T, WALL_H, room.d]} />
        <meshStandardMaterial color={colors.walls} roughness={0.95} />
      </mesh>
      <mesh position={[wx + room.w, WALL_H / 2, cz]} castShadow receiveShadow>
        <boxGeometry args={[WALL_T, WALL_H, room.d]} />
        <meshStandardMaterial color={colors.walls} roughness={0.95} />
      </mesh>

      <Furniture room={room} center={[cx, cz]} color={colors.furniture} />

      <Html position={[cx, 0.02, cz]} center distanceFactor={8} occlude={false}>
        <div className="room-label">
          <span>{room.icon} {room.name}</span>
          <small>{room.area} m²</small>
        </div>
      </Html>
    </group>
  );
}

function Furniture({ room, center, color }) {
  const [cx, cz] = center;
  const mat = (
    <meshStandardMaterial color={color} roughness={0.6} metalness={0.1} />
  );
  switch (room.id) {
    case 'SALON':
      return (
        <group>
          <mesh position={[cx, 0.4, cz + room.d / 2 - 0.45]} castShadow>
            <boxGeometry args={[room.w - 0.4, 0.8, 0.7]} />
            {mat}
          </mesh>
          <mesh position={[cx, 0.25, cz]} castShadow>
            <boxGeometry args={[0.9, 0.5, 0.5]} />
            {mat}
          </mesh>
          <mesh position={[cx, 0.7, cz - room.d / 2 + 0.1]} castShadow>
            <boxGeometry args={[1.0, 0.6, 0.05]} />
            {mat}
          </mesh>
        </group>
      );
    case 'SYPIALNIA':
      return (
        <group>
          <mesh position={[cx, 0.3, cz]} castShadow>
            <boxGeometry args={[room.w - 0.3, 0.6, room.d - 0.5]} />
            {mat}
          </mesh>
        </group>
      );
    case 'KUCHNIA':
      return (
        <group>
          <mesh position={[cx, 0.45, cz - room.d / 2 + 0.3]} castShadow>
            <boxGeometry args={[room.w - 0.2, 0.9, 0.5]} />
            {mat}
          </mesh>
          <mesh position={[cx, 0.45, cz + room.d / 2 - 0.4]} castShadow>
            <boxGeometry args={[room.w - 0.6, 0.9, 0.6]} />
            {mat}
          </mesh>
        </group>
      );
    case 'POKOJ':
      return (
        <group>
          <mesh position={[cx, 0.4, cz - room.d / 2 + 0.3]} castShadow>
            <boxGeometry args={[room.w - 0.3, 0.8, 0.5]} />
            {mat}
          </mesh>
          <mesh position={[cx, 0.25, cz]} castShadow>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            {mat}
          </mesh>
        </group>
      );
    case 'POKOJ_2':
      return (
        <group>
          <mesh position={[cx, 0.3, cz - room.d / 2 + 1.0]} castShadow>
            <boxGeometry args={[room.w - 0.3, 0.6, 1.6]} />
            {mat}
          </mesh>
          <mesh position={[cx, 1.1, cz + room.d / 2 - 0.3]} castShadow>
            <boxGeometry args={[room.w - 0.4, 2.2, 0.55]} />
            {mat}
          </mesh>
        </group>
      );
    case 'TV_ROOM':
      return (
        <group>
          <mesh position={[cx, 0.4, cz + room.d / 2 - 0.5]} castShadow>
            <boxGeometry args={[room.w - 0.4, 0.8, 0.8]} />
            {mat}
          </mesh>
          <mesh position={[cx, 1.1, cz - room.d / 2 + 0.1]} castShadow>
            <boxGeometry args={[1.6, 0.9, 0.06]} />
            {mat}
          </mesh>
          <mesh position={[cx, 0.05, cz]} castShadow>
            <boxGeometry args={[room.w - 0.6, 0.05, room.d - 1.2]} />
            <meshStandardMaterial color={color} roughness={1} metalness={0} opacity={0.6} transparent />
          </mesh>
        </group>
      );
    case 'PRZEDPOKOJ':
      return (
        <mesh position={[cx, 1.0, cz - room.d / 2 + 0.15]} castShadow>
          <boxGeometry args={[room.w - 0.4, 1.8, 0.25]} />
          {mat}
        </mesh>
      );
    case 'LAZIENKA':
      return (
        <group>
          <mesh position={[cx - room.w / 2 + 0.4, 0.3, cz]} castShadow>
            <boxGeometry args={[0.7, 0.55, room.d - 0.2]} />
            {mat}
          </mesh>
          <mesh position={[cx + room.w / 2 - 0.25, 0.5, cz - room.d / 2 + 0.2]} castShadow>
            <boxGeometry args={[0.4, 0.15, 0.3]} />
            {mat}
          </mesh>
        </group>
      );
    default:
      return null;
  }
}

function Scene({ state, floorColor }) {
  return (
    <>
      <ambientLight intensity={0.4 * state.light} />
      <directionalLight
        castShadow
        position={[5, 8, 4]}
        intensity={1.4 * state.light}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <hemisphereLight args={['#ffffff', '#222', 0.35 * state.light]} />

      {/* ground / outside */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#0d0d0d" roughness={1} />
      </mesh>

      {ROOMS.map((r) => (
        <Room
          key={r.id}
          room={r}
          colors={state.rooms[r.id]}
          floorColor={floorColor}
          light={state.light}
        />
      ))}

      {state.showRoof && (
        <mesh
          position={[0, WALL_H + 0.04, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[PLAN_W + 0.5, PLAN_D + 0.5]} />
          <meshStandardMaterial color="#1f1f1f" roughness={1} side={THREE.DoubleSide} />
        </mesh>
      )}

      <ContactShadows position={[0, 0.001, 0]} opacity={0.45} scale={20} blur={2.4} far={4} />
      <Environment preset="apartment" />
    </>
  );
}

function CameraRig({ view }) {
  const { camera } = useThree();
  useEffect(() => {
    if (view === 'top') {
      camera.position.set(0, 12, 0.001);
      camera.lookAt(0, 0, 0);
    } else if (view === 'orbit') {
      camera.position.set(8, 7, 8);
      camera.lookAt(0, 0, 0);
    } else if (view === 'fp') {
      camera.position.set(0, 1.6, 2);
      camera.lookAt(0, 1.6, 0);
    }
  }, [view, camera]);
  return null;
}

export default function App() {
  const [state, setState] = useState(DEFAULT_STATE);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [copied, setCopied] = useState(false);
  const glRef = useRef(null);

  useEffect(() => {
    if (window.location.hash.startsWith('#cfg=')) {
      try {
        const raw = decodeURIComponent(window.location.hash.slice(5));
        const decoded = JSON.parse(atob(raw));
        if (decoded && decoded.rooms) setState({ ...DEFAULT_STATE(), ...decoded });
      } catch (e) { /* ignore */ }
    }
  }, []);

  const pushHistory = (prev) => {
    setHistory((h) => [...h.slice(-49), prev]);
    setFuture([]);
  };

  const update = (mutator) => {
    setState((prev) => {
      pushHistory(prev);
      return typeof mutator === 'function' ? mutator(prev) : mutator;
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

  const setRoomColor = (roomId, key, color) =>
    update((prev) => ({
      ...prev,
      rooms: { ...prev.rooms, [roomId]: { ...prev.rooms[roomId], [key]: color } },
    }));

  const setLight = (v) => update((prev) => ({ ...prev, light: parseFloat(v) }));
  const setFloor = (v) => update((prev) => ({ ...prev, floor: v }));
  const setView = (v) => update((prev) => ({ ...prev, view: v }));
  const toggleRoof = () => update((prev) => ({ ...prev, showRoof: !prev.showRoof }));

  const applyPreset = (name) => {
    const p = PRESETS[name];
    if (!p) return;
    update((prev) => ({
      ...prev,
      preset: name,
      floor: p.floor,
      rooms: ROOMS.reduce((acc, r) => {
        acc[r.id] = { walls: p.walls, furniture: p.furniture };
        return acc;
      }, {}),
    }));
  };

  const reset = () => {
    pushHistory(state);
    setState(DEFAULT_STATE());
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(state, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      alert('Nie można skopiować');
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
      prompt('Skopiuj URL:', url);
    }
  };

  const downloadPng = () => {
    const gl = glRef.current;
    if (!gl) return;
    // Force a render to capture latest frame
    gl.render(gl.scene, gl.camera);
    const url = gl.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `mieszkanie-3d-${Date.now()}.png`;
    a.click();
  };

  const floorColor = useMemo(
    () => FLOORS[state.floor]?.color || '#d4a574',
    [state.floor]
  );

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="dot" />
          <strong>Wizualizator Mieszkania 3D</strong>
          <span className="muted">· interaktywny edytor</span>
        </div>
        <div className="topbar-actions">
          <button onClick={() => setView('orbit')} className={state.view === 'orbit' ? 'active' : ''}>🔄 Orbita</button>
          <button onClick={() => setView('top')} className={state.view === 'top' ? 'active' : ''}>⬇ Z góry</button>
          <button onClick={() => setView('fp')} className={state.view === 'fp' ? 'active' : ''}>👁 1. osoba</button>
          <button onClick={toggleRoof}>{state.showRoof ? '🏠 Bez sufitu' : '🏠 Sufit'}</button>
          <button onClick={undo} disabled={history.length === 0}>↶</button>
          <button onClick={redo} disabled={future.length === 0}>↷</button>
        </div>
      </header>

      <div className="layout">
        <section className="left">
          <div className="canvas-wrap">
            <Canvas
              shadows
              camera={{ position: [8, 7, 8], fov: 45 }}
              gl={{ preserveDrawingBuffer: true, antialias: true }}
              onCreated={({ gl, scene, camera }) => {
                glRef.current = gl;
                glRef.current.scene = scene;
                glRef.current.camera = camera;
                gl.setClearColor('#0e0e0e');
              }}
            >
              <CameraRig view={state.view} />
              <Scene state={state} floorColor={floorColor} />
              <OrbitControls
                makeDefault
                enableDamping
                target={[0, 0.8, 0]}
                maxPolarAngle={Math.PI / 2 - 0.05}
                minDistance={2}
                maxDistance={25}
              />
            </Canvas>
          </div>
        </section>

        <aside className="right">
          <div className="section">
            <h3>Styl</h3>
            <label className="row">
              <span>Preset</span>
              <select value={state.preset} onChange={(e) => applyPreset(e.target.value)}>
                {Object.keys(PRESETS).map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </label>
            <label className="row">
              <span>Podłoga</span>
              <select value={state.floor} onChange={(e) => setFloor(e.target.value)}>
                {Object.entries(FLOORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
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
                <span className="muted small">{Math.round(state.light * 100)}%</span>
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
                        <input type="color" value={c.walls} onChange={(e) => setRoomColor(room.id, 'walls', e.target.value)} />
                        <input type="text" value={c.walls} onChange={(e) => setRoomColor(room.id, 'walls', e.target.value)} />
                      </div>
                    </label>
                    <label>
                      <span>Meble</span>
                      <div className="color-pair">
                        <input type="color" value={c.furniture} onChange={(e) => setRoomColor(room.id, 'furniture', e.target.value)} />
                        <input type="text" value={c.furniture} onChange={(e) => setRoomColor(room.id, 'furniture', e.target.value)} />
                      </div>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="section actions">
            <button onClick={reset}>Reset</button>
            <button className="primary" onClick={downloadPng}>⬇ Pobierz PNG</button>
            <button onClick={copyJson}>{copied ? '✓ Skopiowano' : '⧉ Kopiuj JSON'}</button>
            <button onClick={shareUrl}>🔗 Link</button>
          </div>

          <div className="section hint">
            <h3>Sterowanie</h3>
            <p className="muted small">
              <strong>Lewy myszka</strong> — obrót · <strong>Prawy</strong> — przesuń · <strong>Scroll</strong> — zoom
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
