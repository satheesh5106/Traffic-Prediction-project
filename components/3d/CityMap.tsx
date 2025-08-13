'use client';
import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, Text3D, Environment } from '@react-three/drei';
import * as THREE from 'three';

const Building = ({ position, height, color }: { position: [number, number, number], height: number, color: string }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.01;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.2}>
      <group position={position}>
        <mesh ref={meshRef} castShadow receiveShadow>
          <boxGeometry args={[0.8, height, 0.8]} />
          <meshStandardMaterial 
            color={color} 
            metalness={0.3} 
            roughness={0.2}
            emissive={color}
            emissiveIntensity={0.1}
          />
        </mesh>
        <mesh position={[0, height + 0.1, 0]} castShadow>
          <boxGeometry args={[0.9, 0.2, 0.9]} />
          <meshStandardMaterial 
            color="#87ceeb" 
            metalness={0.8} 
            roughness={0.1}
            emissive="#87ceeb"
            emissiveIntensity={0.3}
          />
        </mesh>
      </group>
    </Float>
  );
};

const Road = ({ start, end }: { start: [number, number, number], end: [number, number, number] }) => {
  const points = useMemo(() => [
    new THREE.Vector3(...start),
    new THREE.Vector3(...end)
  ], [start, end]);

  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points);
    return new THREE.TubeGeometry(curve, 20, 0.1, 8, false);
  }, [points]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#404040" />
    </mesh>
  );
};

const TrafficLight = ({ position }: { position: [number, number, number] }) => {
  const lightRef = useRef<THREE.PointLight>(null);
  
  useFrame((state) => {
    if (lightRef.current) {
      const time = state.clock.elapsedTime;
      lightRef.current.intensity = 2 + Math.sin(time * 2) * 0.5;
      lightRef.current.color.setHSL((time * 0.1) % 1, 1, 0.5);
    }
  });

  return (
    <group position={position}>
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 4]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh position={[0, 3.5, 0]}>
        <boxGeometry args={[0.3, 0.8, 0.1]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
      <pointLight ref={lightRef} position={[0, 3.5, 0.1]} intensity={2} />
    </group>
  );
};

const CityScene = () => {
  const buildings = useMemo(() => [
    // Central district - taller buildings
    { position: [-3, 2, -3], height: 4, color: '#1e40af' },
    { position: [-1, 2.5, -3], height: 5, color: '#1e3a8a' },
    { position: [1, 2, -3], height: 4, color: '#3730a3' },
    { position: [3, 3, -3], height: 6, color: '#312e81' },
    { position: [-3, 2.5, -1], height: 5, color: '#1d4ed8' },
    { position: [3, 2, -1], height: 4, color: '#2563eb' },
    { position: [-3, 3, 1], height: 6, color: '#3b82f6' },
    { position: [-1, 2, 1], height: 4, color: '#60a5fa' },
    { position: [1, 2.5, 1], height: 5, color: '#1e40af' },
    { position: [3, 2, 1], height: 4, color: '#3b82f6' },
    { position: [-3, 2, 3], height: 4, color: '#60a5fa' },
    { position: [-1, 3, 3], height: 6, color: '#2563eb' },
    { position: [1, 2.5, 3], height: 5, color: '#1d4ed8' },
    { position: [3, 2, 3], height: 4, color: '#1e3a8a' },
    // Outer district - smaller buildings
    { position: [-5, 1.5, -5], height: 3, color: '#4f46e5' },
    { position: [-5, 1, -3], height: 2, color: '#6366f1' },
    { position: [-5, 1.5, -1], height: 3, color: '#4f46e5' },
    { position: [-5, 1, 1], height: 2, color: '#6366f1' },
    { position: [-5, 1.5, 3], height: 3, color: '#4f46e5' },
    { position: [-5, 1, 5], height: 2, color: '#6366f1' },
    { position: [5, 1.5, -5], height: 3, color: '#4f46e5' },
    { position: [5, 1, -3], height: 2, color: '#6366f1' },
    { position: [5, 1.5, -1], height: 3, color: '#4f46e5' },
    { position: [5, 1, 1], height: 2, color: '#6366f1' },
    { position: [5, 1.5, 3], height: 3, color: '#4f46e5' },
    { position: [5, 1, 5], height: 2, color: '#6366f1' },
    { position: [-3, 1, 5], height: 2, color: '#6366f1' },
    { position: [-1, 1.5, 5], height: 3, color: '#4f46e5' },
    { position: [1, 1, 5], height: 2, color: '#6366f1' },
    { position: [3, 1.5, 5], height: 3, color: '#4f46e5' },
  ], []);

  const roads = useMemo(() => [
    { start: [-6, 0.1, 0], end: [6, 0.1, 0] },
    { start: [0, 0.1, -6], end: [0, 0.1, 6] },
    { start: [-6, 0.1, -3], end: [6, 0.1, -3] },
    { start: [-6, 0.1, 3], end: [6, 0.1, 3] },
    { start: [-3, 0.1, -6], end: [-3, 0.1, 6] },
    { start: [3, 0.1, -6], end: [3, 0.1, 6] },
    { start: [-6, 0.1, -1.5], end: [6, 0.1, -1.5] },
    { start: [-6, 0.1, 1.5], end: [6, 0.1, 1.5] },
    { start: [-1.5, 0.1, -6], end: [-1.5, 0.1, 6] },
    { start: [1.5, 0.1, -6], end: [1.5, 0.1, 6] },
  ], []);

  const trafficLights = useMemo(() => [
    [2, 0, 0], [-2, 0, 0], [0, 0, 2], [0, 0, -2],
    [4, 0, 0], [-4, 0, 0], [0, 0, 4], [0, 0, -4],
    [2, 0, 3], [-2, 0, 3], [2, 0, -3], [-2, 0, -3],
    [3, 0, 2], [3, 0, -2], [-3, 0, 2], [-3, 0, -2]
  ] as [number, number, number][], []);

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight 
        position={[15, 15, 15]} 
        intensity={1.2} 
        castShadow 
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <pointLight position={[0, 10, 0]} intensity={0.5} color="#87ceeb" />
      <pointLight position={[5, 8, 5]} intensity={0.3} color="#ff6b6b" />
      <pointLight position={[-5, 8, -5]} intensity={0.3} color="#4ecdc4" />
      
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[24, 24]} />
        <meshStandardMaterial color="#2d5a27" roughness={0.8} />
      </mesh>

      {buildings.map((building, index) => (
        <Building 
          key={index} 
          position={building.position as [number, number, number]}
          height={building.height}
          color={building.color}
        />
      ))}

      {roads.map((road, index) => (
        <Road 
          key={index} 
          start={road.start as [number, number, number]}
          end={road.end as [number, number, number]}
        />
      ))}

      {trafficLights.map((position, index) => (
        <TrafficLight key={index} position={position} />
      ))}

      <fog attach="fog" args={['#87ceeb', 10, 50]} />
      <Environment preset="city" />
    </>
  );
};

export const CityMap = () => {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas
        camera={{ position: [10, 8, 10], fov: 50 }}
        shadows
        gl={{ antialias: true, alpha: true }}
      >
        <CityScene />
        <OrbitControls 
          enablePan={false} 
          enableZoom={false}
          autoRotate
          autoRotateSpeed={0.5}
          maxPolarAngle={Math.PI / 2.2}
          minPolarAngle={Math.PI / 4}
        />
      </Canvas>
    </div>
  );
};