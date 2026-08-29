import { useTimeSpeed } from '../../hooks/useSimulationClock';
import { Sun } from './Sun';
import { Planet } from './Planet';
import { Moon } from './Moon';
import { AsteroidBelt } from './AsteroidBelt';
import { KuiperBelt } from './KuiperBelt';
import { Comet } from './Comet';
import { OrbitLine } from './OrbitLine';
import { ALL_PLANETS } from '../../data';
import { CelestialBodyData } from '../../types/orbitalElements';
import * as THREE from 'three';
import { NOTABLE_COMETS } from '../../data/comets';

interface SolarSystemProps {
  julianDate: number;
  onObjectClick: (object: {
    id: string;
    name: string;
    type: string;
    position: THREE.Vector3;
    data: CelestialBodyData;
  }) => void;
}

export function SolarSystem({ julianDate, onObjectClick }: SolarSystemProps) {
  const timeSpeed = useTimeSpeed();
  const timeScale = timeSpeed;

  return (
    <group name="solar-system">
      {/* Sun */}
      <Sun
        onClick={onObjectClick}
      />

      {/* Planets with orbit lines */}
      {ALL_PLANETS.filter(p => p.type === 'planet').map((planet) => (
        <PlanetGroup
          key={planet.id}
          planet={planet}
          julianDate={julianDate}
          timeScale={timeScale}
          onObjectClick={onObjectClick}
        />
      ))}

      {/* Dwarf planets */}
      {ALL_PLANETS.filter(p => p.type === 'dwarf_planet').map((planet) => (
        <PlanetGroup
          key={planet.id}
          planet={planet}
          julianDate={julianDate}
          timeScale={timeScale}
          onObjectClick={onObjectClick}
        />
      ))}

      {/* Asteroid Belt */}
      <AsteroidBelt julianDate={julianDate} />

      {/* Kuiper Belt */}
      <KuiperBelt julianDate={julianDate} />

      {/* Comets */}
      <CometGroup julianDate={julianDate} onObjectClick={onObjectClick} />
    </group>
  );
}

interface PlanetGroupProps {
  planet: CelestialBodyData;
  julianDate: number;
  timeScale: number;
  onObjectClick: (object: {
    id: string;
    name: string;
    type: string;
    position: THREE.Vector3;
    data: CelestialBodyData;
  }) => void;
}

function PlanetGroup({ planet, julianDate, timeScale, onObjectClick }: PlanetGroupProps) {
  return (
    <group name={`planet-${planet.id}`}>
      {/* Orbit line */}
      <OrbitLine
        elements={planet.orbital!}
        color={planet.visual?.orbitColor || '#444466'}
        opacity={0.3}
      />

      {/* Planet */}
      <Planet
        body={planet}
        julianDate={julianDate}
        timeScale={timeScale}
        onClick={onObjectClick}
      />

      {/* Moons */}
      {planet.visual?.moons?.map((moon) => (
        <MoonGroup
          key={moon.id}
          moon={moon}
          planet={planet}
          julianDate={julianDate}
          timeScale={timeScale}
          onObjectClick={onObjectClick}
        />
      ))}
    </group>
  );
}

interface MoonGroupProps {
  moon: CelestialBodyData;
  planet: CelestialBodyData;
  julianDate: number;
  timeScale: number;
  onObjectClick: (object: {
    id: string;
    name: string;
    type: string;
    position: THREE.Vector3;
    data: CelestialBodyData;
  }) => void;
}

function MoonGroup({ moon, planet, julianDate, timeScale, onObjectClick }: MoonGroupProps) {
  return (
    <group name={`moon-${moon.id}`}>
      {/* Moon orbit line relative to planet */}
      <OrbitLine
        elements={moon.orbital!}
        color="#666688"
        opacity={0.2}
      />

      {/* Moon */}
      <Moon
        body={moon}
        planet={planet}
        julianDate={julianDate}
        timeScale={timeScale}
        onClick={onObjectClick}
      />
    </group>
  );
}

interface CometGroupProps {
  julianDate: number;
  onObjectClick: (object: {
    id: string;
    name: string;
    type: string;
    position: THREE.Vector3;
    data: CelestialBodyData;
    distance?: number;
  }) => void;
}

function CometGroup({ julianDate, onObjectClick }: CometGroupProps) {
  return (
    <group name="comets">
      {NOTABLE_COMETS.map((comet) => (
        <Comet
          key={comet.id}
          comet={comet}
          julianDate={julianDate}
          onClick={onObjectClick}
        />
      ))}
    </group>
  );
}