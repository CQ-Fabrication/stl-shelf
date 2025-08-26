import { Suspense, useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, Box } from "@react-three/drei";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import * as THREE from "three";
import { Button } from "../ui/button";
import { RotateCcw, Grid3X3, Eye, EyeOff, Play, Pause } from "lucide-react";
import { Skeleton } from "../ui/skeleton";

interface STLViewerProps {
	modelId: string;
	version: string;
	filename: string;
	className?: string;
}

interface ModelMeshProps {
	url: string;
	filename: string;
	autoRotate: boolean;
}

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
		console.error(`Unsupported file format: ${extension}`);
		return null;
	}

	// Auto-rotate the model (only if enabled)
	useFrame(() => {
		if (meshRef.current && autoRotate) {
			meshRef.current.rotation.y += 0.005;
		}
	});

	if (!geometry) {
		console.warn('No geometry loaded for', filename);
		return null;
	}

	// Prepare geometry
	useEffect(() => {
		if (geometry) {
			geometry.center();
			geometry.computeBoundingBox();
			geometry.computeVertexNormals();
			console.log('Geometry loaded:', {
				vertices: geometry.attributes.position?.count,
				boundingBox: geometry.boundingBox
			});
		}
	}, [geometry]);

	// Center and scale the geometry
	const boundingBox = geometry.boundingBox;
	if (!boundingBox) {
		geometry.computeBoundingBox();
	}
	
	const size = new THREE.Vector3();
	geometry.boundingBox!.getSize(size);
	const maxDimension = Math.max(size.x, size.y, size.z);
	const scale = maxDimension > 0 ? 2 / maxDimension : 1; // Scale to fit in a 2-unit cube

	console.log('Rendering mesh with scale:', scale, 'size:', size);

	return (
		<mesh ref={meshRef} geometry={geometry} scale={[scale, scale, scale]}>
			<meshPhongMaterial 
				color="#4f46e5" 
				transparent 
				opacity={0.9}
				shininess={100}
				side={THREE.DoubleSide}
			/>
		</mesh>
	);
}

function ViewerControls({ 
	onResetCamera, 
	onToggleGrid, 
	showGrid, 
	onToggleWireframe,
	showWireframe,
	autoRotate,
	onToggleAutoRotate
}: {
	onResetCamera: () => void;
	onToggleGrid: () => void;
	showGrid: boolean;
	onToggleWireframe: () => void;
	showWireframe: boolean;
	autoRotate: boolean;
	onToggleAutoRotate: () => void;
}) {
	return (
		<div className="absolute top-4 right-4 flex flex-col gap-2">
			<Button
				size="sm"
				variant="secondary"
				onClick={onResetCamera}
				className="bg-background/80 backdrop-blur-sm"
				title="Reset Camera"
			>
				<RotateCcw className="h-4 w-4" />
			</Button>
			<Button
				size="sm"
				variant="secondary"
				onClick={onToggleAutoRotate}
				className="bg-background/80 backdrop-blur-sm"
				title={autoRotate ? "Stop Auto-Rotation" : "Start Auto-Rotation"}
			>
				{autoRotate ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
			</Button>
			<Button
				size="sm"
				variant="secondary"
				onClick={onToggleGrid}
				className="bg-background/80 backdrop-blur-sm"
				title={showGrid ? "Hide Grid" : "Show Grid"}
			>
				{showGrid ? <EyeOff className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
			</Button>
			<Button
				size="sm"
				variant="secondary"
				onClick={onToggleWireframe}
				className="bg-background/80 backdrop-blur-sm"
				title={showWireframe ? "Solid View" : "Wireframe View"}
			>
				{showWireframe ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
			</Button>
		</div>
	);
}

function ModelInfo({ filename, modelId, version }: { filename: string; modelId: string; version: string }) {
	return (
		<div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-sm rounded-md px-3 py-2 text-sm">
			<div className="font-medium">{filename}</div>
			<div className="text-muted-foreground">{modelId} • {version}</div>
		</div>
	);
}

function LoadingFallback() {
	return (
		<div className="w-full h-full flex items-center justify-center bg-muted">
			<div className="text-center space-y-2">
				<Skeleton className="h-12 w-12 rounded-full mx-auto" />
				<div className="text-sm text-muted-foreground">Loading 3D model...</div>
			</div>
		</div>
	);
}

function ErrorFallback({ error }: { error: Error }) {
	return (
		<div className="w-full h-full flex items-center justify-center bg-muted">
			<div className="text-center space-y-2">
				<div className="text-destructive">Failed to load model</div>
				<div className="text-sm text-muted-foreground">{error.message}</div>
			</div>
		</div>
	);
}

export function STLViewer({ modelId, version, filename, className = "" }: STLViewerProps) {
	const controlsRef = useRef<any>(null);
	const [showGrid, setShowGrid] = useState(true);
	const [showWireframe, setShowWireframe] = useState(false);
	const [autoRotate, setAutoRotate] = useState(false); // Start with auto-rotation off
	const [error, setError] = useState<Error | null>(null);

	const modelUrl = `${import.meta.env.VITE_SERVER_URL}/files/${modelId}/${version}/${filename}`;

	const handleResetCamera = () => {
		if (controlsRef.current) {
			controlsRef.current.reset();
		}
	};

	const handleToggleGrid = () => {
		setShowGrid(prev => !prev);
	};

	const handleToggleWireframe = () => {
		setShowWireframe(prev => !prev);
	};

	const handleToggleAutoRotate = () => {
		setAutoRotate(prev => !prev);
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
					far: 1000
				}}
				style={{ background: '#fafafa' }}
			>
				{/* Lighting */}
				<ambientLight intensity={0.4} />
				<directionalLight 
					position={[10, 10, 5]} 
					intensity={1}
					castShadow
					shadow-mapSize-width={1024}
					shadow-mapSize-height={1024}
				/>
				<directionalLight 
					position={[-10, -10, -5]} 
					intensity={0.3}
				/>

				{/* Grid */}
				{showGrid && (
					<Grid 
						args={[10, 10]} 
						cellSize={0.5}
						cellThickness={0.5}
						sectionSize={2}
						sectionThickness={1}
						fadeDistance={25}
						fadeStrength={1}
					/>
				)}

				{/* Controls */}
				<OrbitControls 
					ref={controlsRef}
					enablePan={true}
					enableZoom={true}
					enableRotate={true}
					minDistance={1}
					maxDistance={20}
					autoRotate={false}
					target={[0, 0, 0]}
				/>

				{/* Model */}
				<Suspense fallback={null}>
					<ModelMesh url={modelUrl} filename={filename} autoRotate={autoRotate} />
				</Suspense>
			</Canvas>

			{/* Overlay controls */}
			<ViewerControls 
				onResetCamera={handleResetCamera}
				onToggleGrid={handleToggleGrid}
				showGrid={showGrid}
				onToggleWireframe={handleToggleWireframe}
				showWireframe={showWireframe}
				autoRotate={autoRotate}
				onToggleAutoRotate={handleToggleAutoRotate}
			/>

			{/* Model info */}
			<ModelInfo 
				filename={filename}
				modelId={modelId}
				version={version}
			/>
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