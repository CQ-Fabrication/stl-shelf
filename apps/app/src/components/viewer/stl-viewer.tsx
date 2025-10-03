import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { RotateCcw } from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";
import { type BufferGeometry, DoubleSide, type Mesh, Vector3 } from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useTheme } from "../theme-provider";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";

type STLViewerProps = {
  modelId: string;
  version: string;
  filename: string;
  className?: string;
  url: string; // Presigned URL from server
};

type ModelMeshProps = {
  url: string;
  filename: string;
  autoRotate: boolean;
  color: string;
};

function ModelMesh({ url, filename, autoRotate, color }: ModelMeshProps) {
  const meshRef = useRef<Mesh>(null);
  const extension = filename.split(".").pop()?.toLowerCase();

  // Always call both loaders to satisfy React hooks rules
  const stlGeometry = useLoader(STLLoader, url);
  const objObject = useLoader(OBJLoader, url);

  // Select the appropriate geometry based on file extension
  let geometry: BufferGeometry | undefined;
  if (extension === "stl") {
    geometry = stlGeometry;
  } else if (extension === "obj") {
    // Extract geometry from the first mesh in the OBJ
    const firstChild = objObject.children[0];
    if (firstChild && "geometry" in firstChild) {
      geometry = (firstChild as Mesh).geometry;
    }
  }

  // Auto-rotate the model (only if enabled)
  useFrame(() => {
    if (meshRef.current && autoRotate) {
      meshRef.current.rotation.y += 0.005;
    }
  });

  // Prepare geometry - always call useEffect
  useEffect(() => {
    if (geometry) {
      geometry.center();
      geometry.computeBoundingBox();
      geometry.computeVertexNormals();
    }
  }, [geometry]);

  if (!geometry) {
    return null;
  }

  // Center and scale the geometry
  const boundingBox = geometry.boundingBox;
  if (!boundingBox) {
    geometry.computeBoundingBox();
  }

  const size = new Vector3();
  geometry.boundingBox?.getSize(size);
  const maxDimension = Math.max(size.x, size.y, size.z);
  const scale = maxDimension > 0 ? 2 / maxDimension : 1; // Scale to fit in a 2-unit cube

  return (
    <mesh geometry={geometry} ref={meshRef} scale={[scale, scale, scale]}>
      <meshPhongMaterial
        color={color}
        opacity={0.9}
        shininess={100}
        side={DoubleSide}
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
  className = "",
  url,
}: STLViewerProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [error, _setError] = useState<Error | null>(null);
  const { theme } = useTheme();

  // Use the presigned URL from server
  const modelUrl = url;

  // Theme-aware colors
  const isDark = theme === "dark";
  const modelColor = isDark ? "#9ca3af" : "#e5e7eb"; // gray-400 : gray-200
  const canvasBackground = isDark ? "#0a0a0a" : "#fafafa";

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
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
        style={{ background: canvasBackground }}
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
            autoRotate={false}
            color={modelColor}
            filename={filename}
            url={modelUrl}
          />
        </Suspense>
      </Canvas>

      {/* Overlay controls */}
      <ViewerControls onResetCamera={handleResetCamera} />
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
