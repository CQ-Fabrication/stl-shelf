import { Grid, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { Eye, EyeOff, Grid3X3, Pause, Play, RotateCcw } from 'lucide-react';
import { Suspense, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';

type STLViewerProps = {
  modelId: string;
  version: string;
  filename: string;
  className?: string;
};

type ModelMeshProps = {
  url: string;
  filename: string;
  autoRotate: boolean;
};

function ModelMesh({ url, filename, autoRotate }: ModelMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const extension = filename.split('.').pop()?.toLowerCase();

  // Load geometry based on file type - useLoader handles errors internally
  let geometry;
  if (extension === 'stl') {
    geometry = useLoader(STLLoader, url);
  } else if (extension === 'obj') {
    const object = useLoader(OBJLoader, url);
    // Extract geometry from the first mesh in the OBJ
    geometry = object.children[0]?.geometry;
  } else {
    return null;
  }

  // Auto-rotate the model (only if enabled)
  useFrame(() => {
    if (meshRef.current && autoRotate) {
      meshRef.current.rotation.y += 0.005;
    }
  });

  if (!geometry) {
    return null;
  }

  // Prepare geometry
  useEffect(() => {
    if (geometry) {
      geometry.center();
      geometry.computeBoundingBox();
      geometry.computeVertexNormals();
    }
  }, [geometry]);

  // Center and scale the geometry
  const boundingBox = geometry.boundingBox;
  if (!boundingBox) {
    geometry.computeBoundingBox();
  }

  const size = new THREE.Vector3();
  geometry.boundingBox?.getSize(size);
  const maxDimension = Math.max(size.x, size.y, size.z);
  const scale = maxDimension > 0 ? 2 / maxDimension : 1; // Scale to fit in a 2-unit cube

  return (
    <mesh geometry={geometry} ref={meshRef} scale={[scale, scale, scale]}>
      <meshPhongMaterial
        color="#e5e7eb"
        opacity={0.9}
        shininess={100}
        side={THREE.DoubleSide}
        transparent
      />
    </mesh>
  );
}

function ViewerControls({ onResetCamera }: { onResetCamera: () => void }) {
  return (
    <div className="absolute top-4 right-4 flex flex-col gap-2">
      <Button
        className="bg-background/80 backdrop-blur-sm"
        onClick={onResetCamera}
        size="sm"
        title="Reset Camera"
        variant="secondary"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ModelInfo({
  filename,
  modelId,
  version,
}: {
  filename: string;
  modelId: string;
  version: string;
}) {
  return (
    <div className="absolute bottom-4 left-4 rounded-md bg-background/80 px-3 py-2 text-sm backdrop-blur-sm">
      <div className="font-medium">{filename}</div>
      <div className="text-muted-foreground">
        {modelId} • {version}
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted">
      <div className="space-y-2 text-center">
        <Skeleton className="mx-auto h-12 w-12 rounded-full" />
        <div className="text-muted-foreground text-sm">Loading 3D model...</div>
      </div>
    </div>
  );
}

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted">
      <div className="space-y-2 text-center">
        <div className="text-destructive">Failed to load model</div>
        <div className="text-muted-foreground text-sm">{error.message}</div>
      </div>
    </div>
  );
}

export function STLViewer({
  modelId,
  version,
  filename,
  className = '',
}: STLViewerProps) {
  const controlsRef = useRef<any>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [showWireframe, setShowWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false); // Start with auto-rotation off
  const [error, _setError] = useState<Error | null>(null);

  const modelUrl = `${import.meta.env.VITE_SERVER_URL}/files/${modelId}/${version}/${filename}`;

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const handleToggleGrid = () => {
    setShowGrid((prev) => !prev);
  };

  const handleToggleWireframe = () => {
    setShowWireframe((prev) => !prev);
  };

  const handleToggleAutoRotate = () => {
    setAutoRotate((prev) => !prev);
  };

  if (error) {
    return (
      <div className={`relative ${className}`}>
        <ErrorFallback error={error} />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <Canvas
        camera={{
          position: [3, 3, 3],
          fov: 45,
          near: 0.1,
          far: 1000,
        }}
        style={{ background: '#fafafa' }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight
          castShadow
          intensity={1}
          position={[10, 10, 5]}
          shadow-mapSize-height={1024}
          shadow-mapSize-width={1024}
        />
        <directionalLight intensity={0.3} position={[-10, -10, -5]} />

        {/* Grid */}
        {showGrid && (
          <Grid
            args={[10, 10]}
            cellSize={0.5}
            cellThickness={0.5}
            fadeDistance={25}
            fadeStrength={1}
            sectionSize={2}
            sectionThickness={1}
          />
        )}

        {/* Controls */}
        <OrbitControls
          autoRotate={false}
          enablePan={true}
          enableRotate={true}
          enableZoom={true}
          maxDistance={20}
          minDistance={1}
          ref={controlsRef}
          target={[0, 0, 0]}
        />

        {/* Model */}
        <Suspense fallback={null}>
          <ModelMesh
            autoRotate={autoRotate}
            filename={filename}
            url={modelUrl}
          />
        </Suspense>
      </Canvas>

      {/* Overlay controls */}
      <ViewerControls onResetCamera={handleResetCamera} />

      {/* Model info */}
      <ModelInfo filename={filename} modelId={modelId} version={version} />
    </div>
  );
}

// Wrapper component to handle Suspense at the component level
export function STLViewerWithSuspense(props: STLViewerProps) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <STLViewer {...props} />
    </Suspense>
  );
}
