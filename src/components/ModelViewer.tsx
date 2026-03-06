import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage } from '@react-three/drei';
import { STLLoader } from 'three-stdlib';
import { useLoader } from '@react-three/fiber';
import { Suspense } from 'react';

function STLModel({ url }: { url: string }) {
  const geometry = useLoader(STLLoader, url);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#9ca3af" roughness={0.3} metalness={0.8} />
    </mesh>
  );
}

export default function ModelViewer({ stlUrl }: { stlUrl: string }) {
  return (
    <div className="w-full h-96 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
      <Canvas shadows camera={{ position: [0, 0, 100], fov: 50 }}>
        <color attach="background" args={['#f3f4f6']} />
        <Suspense fallback={null}>
          <Stage environment="city" intensity={0.6}>
            <STLModel url={stlUrl} />
          </Stage>
        </Suspense>
        <OrbitControls makeDefault autoRotate autoRotateSpeed={1} />
      </Canvas>
    </div>
  );
}