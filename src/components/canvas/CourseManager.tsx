import { useCourseStore } from '../../stores/useCourseStore';
import Buoy from './Buoy';
import Laylines from './Laylines';


export default function CourseManager() {
    const { course, activeLegIndex } = useCourseStore();

    if (!course) return null;
    const showStart = activeLegIndex === 0;

    return (
        <group>
            <Laylines />

            {/* Start Line */}
            {showStart && course.startLine.map(p => <Buoy key={p.id} mark={p} />)}

            {/* Finish Line */}
            {course.finishLine.map(p => <Buoy key={p.id} mark={p} />)}
            
            {/* Marks - Progressive Hiding */}
            {course.marks.map((mark, index) => {
                // Show mark if it's the current target OR the immediately previous one
                const isVisible = index >= activeLegIndex - 1;
                // It is a gate if type is 'gate'
                const isGate = mark.type === 'gate';

                return isVisible && <Buoy key={mark.id} mark={mark} isGate={isGate} />;
            })}

            {/* Course Path (Active Legs) - Removed */}
            {/* <CourseLegs course={course} activeIdx={activeLegIndex} /> */}
        </group>
    );
}

/*
function GateLines({ marks }: { marks: CoursePoint[] }) {
    const lines = useMemo(() => {
        const segments: THREE.Vector3[][] = [];
        
        for (let i = 0; i < marks.length - 1; i++) {
            const m1 = marks[i];
            const m2 = marks[i + 1];

            // Check if both are gates
            // Logic: adjacent gates are treated as a pair (e.g. 3S -> 3P)
            if (m1.type === 'gate' && m2.type === 'gate') {
                 const p1 = latLonToXZ(m1.lat, m1.lon, DEFAULT_ORIGIN.lat, DEFAULT_ORIGIN.lon);
                 const p2 = latLonToXZ(m2.lat, m2.lon, DEFAULT_ORIGIN.lat, DEFAULT_ORIGIN.lon);
                 
                 segments.push([
                     new THREE.Vector3(p1.x, 2, p1.z), // Raised slightly
                     new THREE.Vector3(p2.x, 2, p2.z)
                 ]);
                 
                 // Skip next mark to prevent chaining if multiple gate pairs existed
                 i++; 
            }
        }
        return segments;
    }, [marks]);

    return (
        <>
            {lines.map((segment, idx) => (
                 <Line
                    key={idx}
                    points={segment}
                    color="#22c55e" // Green for gates (standard?) or white
                    lineWidth={2}
                    dashed
                    dashScale={2}
                    gapSize={1}
                    opacity={0.6}
                    transparent
                />
            ))}
        </>
    );
}

function CourseLegs({ course, activeIdx }: { course: any, activeIdx: number }) {
    const points = useMemo(() => {
        const getPos = (data: { lat: number, lon: number }) => {
            const p = latLonToXZ(data.lat, data.lon, DEFAULT_ORIGIN.lat, DEFAULT_ORIGIN.lon);
            return new THREE.Vector3(p.x, 2, p.z);
        };

        const getGateMid = (idx: number): THREE.Vector3 | null => {
            if (idx < 0 || idx >= course.marks.length) return null;
            if (course.marks[idx]?.type !== 'gate') return null;

            const gates = [getPos(course.marks[idx])];
            if (course.marks[idx + 1]?.type === 'gate') gates.push(getPos(course.marks[idx + 1]));
            else if (course.marks[idx - 1]?.type === 'gate') gates.push(getPos(course.marks[idx - 1]));

            const mid = new THREE.Vector3();
            gates.forEach(v => mid.add(v));
            mid.multiplyScalar(1 / gates.length);
            return mid;
        };

        const getMarkPos = (idx: number): THREE.Vector3 => {
            if (!course.marks[idx]) return new THREE.Vector3(0, 0, 0); // Crash safety

            if (course.marks[idx]?.type === 'gate') {
                const mid = getGateMid(idx);
                if (mid) return mid;
            }
            return getPos(course.marks[idx]);
        };

        const path: THREE.Vector3[] = [];

        let p0: THREE.Vector3;
        let p1: THREE.Vector3;

        // Start Leg
        if (activeIdx === 0) {
            // ROBUST FIND: Find 'start-boat' or 'green' one
            const startBoat = course.startLine.find((p: any) => p.color === 'green' || p.type === 'boat')
                || course.startLine[1]; // Fallback
            p0 = getPos(startBoat);

            // Safety check for next mark
            if (course.marks.length > 0) {
                p1 = getMarkPos(0);
            } else {
                return []; // No marks to go to
            }
        }
        else if (activeIdx >= course.marks.length) {
            // Finish
            if (course.marks.length > 0) {
                p0 = getMarkPos(course.marks.length - 1);
            } else {
                // Fallback if no marks but somehow at finish?
                p0 = getPos(course.startLine[0]);
            }

            const f1 = getPos(course.finishLine[0]);
            const f2 = getPos(course.finishLine[1]);
            p1 = f1.add(f2).multiplyScalar(0.5);
        }
        else {
            if (!course.marks[activeIdx - 1] || !course.marks[activeIdx]) return [];
            p0 = getMarkPos(activeIdx - 1);
            p1 = getMarkPos(activeIdx);
        }

        path.push(p0);
        path.push(p1);

        // Next Leg Preview
        if (activeIdx < course.marks.length) {
            let p2: THREE.Vector3 | null = null;
            const nextIdx = activeIdx + 1;

            if (nextIdx < course.marks.length) {
                const nextPos = getMarkPos(nextIdx);
                if (nextPos.distanceTo(p1) > 1) p2 = nextPos;
            } else {
                const f1 = getPos(course.finishLine[0]);
                const f2 = getPos(course.finishLine[1]);
                p2 = f1.add(f2).multiplyScalar(0.5);
            }

            if (p2) path.push(p2);
        }

        return path;
    }, [course, activeIdx]);

    if (!points || points.length < 2) return null;

    return (
        <Line
            points={points}
            color="white"
            lineWidth={3}
            dashed
            dashScale={1}
            gapSize={0.5}
            opacity={0.6}
            transparent
        />
    );
}

function CourseLine({ points, color }: { points: [CoursePoint, CoursePoint], color: string }) {
    const linePoints = useMemo(() => {
        const p1 = latLonToXZ(points[0].lat, points[0].lon, DEFAULT_ORIGIN.lat, DEFAULT_ORIGIN.lon);
        const p2 = latLonToXZ(points[1].lat, points[1].lon, DEFAULT_ORIGIN.lat, DEFAULT_ORIGIN.lon);
        return [
            new THREE.Vector3(p1.x, 2, p1.z),
            new THREE.Vector3(p2.x, 2, p2.z)
        ];
    }, [points]);

    return (
        <Line
            points={linePoints}
            color={color}
            lineWidth={2}
            dashed={true}
            dashScale={1}
            gapSize={0.5}
            opacity={0.8}
            transparent
        />
    );
}

// Visualization of the centerline from Start Midpoint to First Mark
function StartCenterLine({ startLine, marks }: { startLine: [CoursePoint, CoursePoint], marks: CoursePoint[] }) {
    if (marks.length === 0) return null;
    const mark1 = marks[0];

    // Calculate Start Midpoint
    const startMid = {
        lat: (startLine[0].lat + startLine[1].lat) / 2,
        lon: (startLine[0].lon + startLine[1].lon) / 2
    };

    // Calculate Bearing & Distance
    const bearing = calculateBearing(startMid, mark1);
    const distMeters = haversineDistance(startMid, mark1);
    const distKm = (distMeters / 1000).toFixed(2); // e.g. 2.40

    // 3D Points
    const linePoints = useMemo(() => {
        const pStart = latLonToXZ(startMid.lat, startMid.lon, DEFAULT_ORIGIN.lat, DEFAULT_ORIGIN.lon);
        const pM1 = latLonToXZ(mark1.lat, mark1.lon, DEFAULT_ORIGIN.lat, DEFAULT_ORIGIN.lon);
        return [
            new THREE.Vector3(pStart.x, 2, pStart.z),
            new THREE.Vector3(pM1.x, 2, pM1.z)
        ];
    }, [startMid.lat, startMid.lon, mark1.lat, mark1.lon]);

    // Text Position (Midpoint of the line)
    const textPos = new THREE.Vector3().addVectors(linePoints[0], linePoints[1]).multiplyScalar(0.5);

    return (
        <group>
            <Line
                points={linePoints}
                color="white"
                lineWidth={1}
                dashed
                dashScale={5}
                gapSize={3}
                opacity={0.5}
                transparent
            />
            <Html position={textPos} center>
                <div className="bg-slate-900/80 text-white px-2 py-1 rounded text-xs whitespace-nowrap border border-slate-600 shadow-sm pointer-events-none transform -rotate-45" style={{ fontSize: '10px' }}>
                    <span className="font-bold text-yellow-400">{Math.round(bearing)}°</span>
                    <span className="mx-1 text-slate-400">|</span>
                    <span>{distKm}km</span>
                </div>
            </Html>
        </group>
    );
}
*/

// GateLines removed as per request (replaced by Buoy rings)
