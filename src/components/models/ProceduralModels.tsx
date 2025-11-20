"use client";
import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

const Label = ({ text }: { text: string }) => (
  <Html distanceFactor={10} zIndexRange={[100, 0]}>
    <div className="bg-white/90 px-2 py-1 rounded-lg border border-green-800 shadow-md text-xs font-bold">
      {text}
    </div>
  </Html>
);

export function SkeletonModel({ onClick, labels = [] }: { onClick: (part: string) => void, labels?: string[] }) {
  return (
    <group position={[0, -1.5, 0]}>
      <mesh position={[0, 3, 0]} onClick={(e) => { e.stopPropagation(); onClick("Skull"); }}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial color="#F0EAD6" />
        {labels.includes("Skull") && <Label text="Skull" />}
      </mesh>
      <mesh position={[0, 2, 0]} onClick={(e) => { e.stopPropagation(); onClick("Ribcage"); }}>
        <cylinderGeometry args={[0.35, 0.4, 0.8, 8]} />
        <meshStandardMaterial color="#F0EAD6" transparent opacity={0.6} />
        {labels.includes("Ribcage") && <Label text="Ribcage" />}
      </mesh>
    </group>
  );
}

export function HeartModel({ onClick, labels = [] }: { onClick: (part: string) => void, labels?: string[] }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.05;
      ref.current.scale.set(s, s, s);
    }
  });

  const Part = ({ pos, color, name, scale }: any) => (
    <mesh position={pos} scale={scale} onClick={(e) => { e.stopPropagation(); onClick(name); }}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial color={color} roughness={0.3} />
      {labels.includes(name) && <Label text={name} />}
    </mesh>
  );

  return (
    <group ref={ref}>
      <Part name="Left Ventricle" pos={[0.5, -0.5, 0]} scale={[0.6, 0.8, 0.6]} color="#C53030" />
      <Part name="Right Ventricle" pos={[-0.5, -0.5, 0]} scale={[0.6, 0.8, 0.6]} color="#E53E3E" />
      <mesh position={[0, 0.8, 0]} onClick={(e) => { e.stopPropagation(); onClick("Aorta"); }}>
        <torusGeometry args={[0.4, 0.15, 16, 100, Math.PI]} />
        <meshStandardMaterial color="#FC8181" />
        {labels.includes("Aorta") && <Label text="Aorta" />}
      </mesh>
    </group>
  );
}
