import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { RotateCcw } from "lucide-react";
import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  type BufferGeometry,
  type Camera,
  DoubleSide,
  type Mesh,
  PerspectiveCamera,
  Vector3,
} from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { computeCameraDistance, FRAME_DIRECTION } from "./camera-framing";
import { useTheme } from "../theme-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getFileExtension } from "@/lib/files/limits";
import { errorContextActions } from "@/stores/error-context.store";

// Error boundary to catch Three.js/Canvas errors and prevent page crashes
type ErrorBoundaryProps = {
  children: ReactNode;
  renderFallback: (error: Error | null) => ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

class ViewerErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("3D Viewer error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.renderFallback(this.state.error);
    }
    return this.props.children;
  }
}

type STLViewerProps = {
  modelId?: string;
  version?: string;
  filename: string;
  className?: string;
  url: string; // Presigned URL from server
  posterUrl?: string | null; // Thumbnail shown while the mesh downloads/parses
  onSnapshot?: (blob: Blob) => void;
};

type ModelMeshProps = {
  autoRotate: boolean;
  color: string;
};

type ControlsRef = RefObject<OrbitControlsImpl | null>;

// MeshGeometry scales every model to fit a 2-unit cube (see below).
const NORMALIZED_CUBE_SIZE = 2;

// Factor that maps the raw geometry to the normalized 2-unit cube.
function computeNormalizationScale(geometry: BufferGeometry): number {
  const size = new Vector3();
  geometry.boundingBox?.getSize(size);
  const maxDimension = Math.max(size.x, size.y, size.z);
  return maxDimension > 0 ? NORMALIZED_CUBE_SIZE / maxDimension : 1;
}

// Position the camera along the diagonal 3/4 view at a distance that fits the
// normalized model, and store that pose so OrbitControls.reset() returns to it.
function frameCameraToGeometry({
  geometry,
  camera,
  canvas,
  controls,
}: {
  geometry: BufferGeometry;
  camera: Camera;
  canvas: HTMLCanvasElement;
  controls: OrbitControlsImpl | null;
}) {
  if (!(camera instanceof PerspectiveCamera) || !geometry.boundingSphere) {
    return;
  }

  const radiusScaled = geometry.boundingSphere.radius * computeNormalizationScale(geometry);
  const aspect = canvas.clientHeight > 0 ? canvas.clientWidth / canvas.clientHeight : 1;
  const distance = computeCameraDistance(radiusScaled, camera.fov, aspect);
  if (!(distance > 0)) {
    return;
  }

  const direction = new Vector3(...FRAME_DIRECTION).normalize();
  camera.position.copy(direction.multiplyScalar(distance));
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();

  if (controls) {
    controls.target.set(0, 0, 0);
    controls.update();
    controls.saveState();
  }
}

type MeshGeometryProps = ModelMeshProps & {
  geometry: BufferGeometry | undefined;
  controlsRef: ControlsRef;
  onReady?: () => void;
};

type LoaderMeshProps = ModelMeshProps & {
  url: string;
  controlsRef: ControlsRef;
  onSnapshot?: (blob: Blob) => void;
  onReady?: () => void;
};

function MeshGeometry({ geometry, autoRotate, color, controlsRef, onReady }: MeshGeometryProps) {
  const meshRef = useRef<Mesh>(null);
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);

  // Auto-rotate the model (only if enabled)
  useFrame(() => {
    if (meshRef.current && autoRotate) {
      meshRef.current.rotation.y += 0.005;
    }
  });

  // Prepare geometry, then frame the camera to fit it BEFORE reporting ready.
  // This runs as a passive effect on mount, i.e. before SnapshotOnce's first
  // useFrame (rAF) fires, so the warmup frames and the captured snapshot both
  // render with the framed camera. Reset restores this framing via saveState().
  useEffect(() => {
    if (!geometry) {
      return;
    }
    geometry.center();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    geometry.computeVertexNormals();

    frameCameraToGeometry({
      geometry,
      camera,
      canvas: gl.domElement,
      controls: controlsRef.current,
    });

    onReady?.();
  }, [geometry, camera, gl, controlsRef, onReady]);

  if (!geometry) {
    return null;
  }

  // Center and scale the geometry
  if (!geometry.boundingBox) {
    geometry.computeBoundingBox();
  }

  const scale = computeNormalizationScale(geometry); // Scale to fit in a 2-unit cube

  return (
    <mesh ref={meshRef} scale={[scale, scale, scale]}>
      <primitive attach="geometry" object={geometry} />
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

const SNAPSHOT_WARMUP_FRAMES = 4;

// Captures the canvas as a PNG once, a few frames after the mesh subtree mounts
// (mounting only happens after useLoader resolves, so the model is on screen).
function SnapshotOnce({ onSnapshot }: { onSnapshot: (blob: Blob) => void }) {
  const gl = useThree((state) => state.gl);
  const renderedFrames = useRef(0);
  const fired = useRef(false);

  useFrame(() => {
    if (fired.current) {
      return;
    }

    renderedFrames.current += 1;
    if (renderedFrames.current < SNAPSHOT_WARMUP_FRAMES) {
      return;
    }

    fired.current = true;
    gl.domElement.toBlob((blob) => {
      if (blob) {
        onSnapshot(blob);
      }
    }, "image/png");
  });

  return null;
}

function STLModelMesh({
  url,
  autoRotate,
  color,
  controlsRef,
  onSnapshot,
  onReady,
}: LoaderMeshProps) {
  const geometry = useLoader(STLLoader, url);
  return (
    <>
      <MeshGeometry
        autoRotate={autoRotate}
        color={color}
        controlsRef={controlsRef}
        geometry={geometry}
        onReady={onReady}
      />
      {onSnapshot ? <SnapshotOnce onSnapshot={onSnapshot} /> : null}
    </>
  );
}

function OBJModelMesh({
  url,
  autoRotate,
  color,
  controlsRef,
  onSnapshot,
  onReady,
}: LoaderMeshProps) {
  const objObject = useLoader(OBJLoader, url);
  const firstMesh = objObject.children.find((child): child is Mesh => "geometry" in child);
  const geometry = firstMesh?.geometry as BufferGeometry | undefined;

  return (
    <>
      <MeshGeometry
        autoRotate={autoRotate}
        color={color}
        controlsRef={controlsRef}
        geometry={geometry}
        onReady={onReady}
      />
      {/* Without a mesh the canvas stays empty: a snapshot would lock in a blank thumbnail */}
      {onSnapshot && geometry ? <SnapshotOnce onSnapshot={onSnapshot} /> : null}
    </>
  );
}

function ModelMesh({
  url,
  filename,
  autoRotate,
  color,
  controlsRef,
  onSnapshot,
  onReady,
}: LoaderMeshProps & { filename: string }) {
  const extension = getFileExtension(filename);

  if (extension === "stl") {
    return (
      <STLModelMesh
        autoRotate={autoRotate}
        color={color}
        controlsRef={controlsRef}
        onReady={onReady}
        onSnapshot={onSnapshot}
        url={url}
      />
    );
  }

  if (extension === "obj") {
    return (
      <OBJModelMesh
        autoRotate={autoRotate}
        color={color}
        controlsRef={controlsRef}
        onReady={onReady}
        onSnapshot={onSnapshot}
        url={url}
      />
    );
  }

  return null;
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
  const isAllocationError = /array buffer allocation failed/i.test(error.message);

  // Log full error for debugging
  console.error("STL Viewer error:", error);
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted">
      <div className="space-y-2 text-center">
        <div className="text-destructive">Failed to load model</div>
        <div className="text-muted-foreground text-sm">
          {isAllocationError
            ? "This file is too large for in-browser preview. Download the file to inspect it locally."
            : "Please try refreshing the page or select a different file."}
        </div>
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
  posterUrl,
  onSnapshot,
}: STLViewerProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { theme } = useTheme();
  // Poster stays up until the downloaded mesh is actually in the scene
  const [modelReady, setModelReady] = useState(false);
  const handleModelReady = useCallback(() => setModelReady(true), []);

  // Track 3D preview action for error context
  useEffect(() => {
    if (modelId) {
      errorContextActions.setLastAction({
        type: "preview_3d",
        modelId,
        metadata: { filename, version },
      });
    }
  }, [modelId, filename, version]);

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

  return (
    <div className={`relative ${className}`}>
      <Canvas
        camera={{
          position: [3, 3, 3],
          fov: 45,
          near: 0.1,
          far: 1000,
        }}
        gl={{ preserveDrawingBuffer: true }}
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
            controlsRef={controlsRef}
            filename={filename}
            onReady={handleModelReady}
            onSnapshot={onSnapshot}
            url={modelUrl}
          />
        </Suspense>
      </Canvas>

      {/* Poster overlay while the mesh downloads/parses (DOM-only: SnapshotOnce
          reads canvas pixels, so it can never capture the poster) */}
      {!modelReady && (
        <div
          className="pointer-events-none absolute inset-0"
          data-viewer-poster
          style={{ background: canvasBackground }}
        >
          {posterUrl ? (
            <img
              alt={`${filename} preview`}
              className="h-full w-full object-contain"
              src={posterUrl}
            />
          ) : (
            <LoadingFallback />
          )}
        </div>
      )}

      {/* Overlay controls */}
      <ViewerControls onResetCamera={handleResetCamera} />
    </div>
  );
}

// Wrapper component with error boundary and suspense
export function STLViewerWithSuspense(props: STLViewerProps) {
  return (
    <ViewerErrorBoundary
      renderFallback={(error) => (
        <ErrorFallback error={error ?? new Error("The 3D viewer encountered an error")} />
      )}
    >
      <Suspense fallback={<LoadingFallback />}>
        <STLViewer {...props} />
      </Suspense>
    </ViewerErrorBoundary>
  );
}
