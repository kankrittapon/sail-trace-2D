import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { useCourseStore } from '../../stores/useCourseStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { calculateLaylinePoints } from '../../lib/raceLogic';
import { latLonToXZ, DEFAULT_ORIGIN } from '../../lib/coordinates';

export default function Laylines() {
    const { course } = useCourseStore();
    const laylineAngle = useSettingsStore(s => s.laylineAngle) || 45;
    const windDirection = useSettingsStore(s => s.windDirection) || 0; // Need to ensure this exists in store

    const laylineSegments = useMemo(() => {
        if (!course) return null;

        // Find Mark 1
        const m1 = course.marks.find(m => m.id === 'M1' || m.label === 'Mark 1');
        if (!m1) return null;

        const m1Pos = { lat: m1.lat, lng: m1.lon };
        
        // Calculate Laylines
        const { pStarboard, pPort } = calculateLaylinePoints(m1Pos, windDirection, 3000, laylineAngle);

        // Convert to 3D World Coordinates
        const m1World = latLonToXZ(m1.lat, m1.lon, DEFAULT_ORIGIN.lat, DEFAULT_ORIGIN.lon);
        const stbWorld = latLonToXZ(pStarboard.lat, pStarboard.lng, DEFAULT_ORIGIN.lat, DEFAULT_ORIGIN.lon);
        const portWorld = latLonToXZ(pPort.lat, pPort.lng, DEFAULT_ORIGIN.lat, DEFAULT_ORIGIN.lon);

        const yHeight = 1; // Slightly above water

        return {
            starboard: [
                new THREE.Vector3(m1World.x, yHeight, m1World.z),
                new THREE.Vector3(stbWorld.x, yHeight, stbWorld.z)
            ],
            port: [
                new THREE.Vector3(m1World.x, yHeight, m1World.z),
                new THREE.Vector3(portWorld.x, yHeight, portWorld.z)
            ]
        };
    }, [course, windDirection, laylineAngle]);

    if (!laylineSegments) return null;

    return (
        <group>
            {/* Starboard Layline (Green usually? Or Red for "Port Tack approaching"?) 
                Starboard Layline = The line you sail on Starboard Tack.
                Starboard Tack = Right of way = Green.
            */}
            <Line
                points={laylineSegments.starboard}
                color="#22c55e" // Green
                lineWidth={4}
                dashed
                dashScale={5}
                gapSize={2}
                opacity={0.4}
                transparent
            />
            {/* Port Layline = Sail on Port Tack (Give way) = Red */}
            <Line
                points={laylineSegments.port}
                color="#ef4444" // Red
                lineWidth={4}
                dashed
                dashScale={5}
                gapSize={2}
                opacity={0.4}
                transparent
            />
        </group>
    );
}
