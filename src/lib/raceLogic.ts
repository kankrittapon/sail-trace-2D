import type { Coordinate, CourseLayout, Mark } from './raceTypes';
import { computeDestinationPoint, getAngleDiff, getDistance, isLineIntersection } from './geoUtils';

/**
 * Logic Class for Sailing Race Calculations
 */

// Logic 1 & 3: Start/Finish Line Check
export function checkLineCrossing(
    prevPos: Coordinate,
    currPos: Coordinate,
    lineP1: Coordinate,
    lineP2: Coordinate
): boolean {
    return isLineIntersection(prevPos, currPos, lineP1, lineP2);
}

// Logic 5: Geofencing / Mark Rounding Check
export function checkMarkRounding(
    boatPos: Coordinate,
    mark: Mark,
    entryHeading: number,
    exitHeading: number
): boolean {
    // 1. Distance Check
    const dist = getDistance(boatPos, mark.pos);
    if (dist > mark.radius) return false;

    // 2. Angle Change Check (Course Over Ground change > 90 degrees)
    // Theoretically, we should track the boat's cumulative angle change while in the zone.
    // For simplicity as per user request: check entry vs exit heading (or current heading vs entry).
    const angleChange = getAngleDiff(entryHeading, exitHeading);
    return angleChange > 90;
}

// Logic 2: Marks Placement (Course Setting)
// Logic 2: Marks Placement (Course Setting)
export function generateWindwardLeewardCourse(
    startMidpoint: Coordinate,
    windDirection: number,
    legDistanceNM: number = 1.0, 
    gateWidthMeters: number = 40,
    options: { useOffset: boolean; useGate: boolean } = { useOffset: true, useGate: true }
): CourseLayout {
    const legDistanceMeters = legDistanceNM * 1852;

    // 1. Calculate Start Line (Perpendicular to wind)
    const startHalfWidth = 100;
    const startP1 = computeDestinationPoint(startMidpoint, startHalfWidth, windDirection - 90);
    const startP2 = computeDestinationPoint(startMidpoint, startHalfWidth, windDirection + 90);

    // 2. Calculate Mark 1 (Windward)
    const mark1Pos = computeDestinationPoint(startMidpoint, legDistanceMeters, windDirection);
    
    const marks: Mark[] = [
        { id: "M1", name: "Mark 1", pos: mark1Pos, radius: 24, role: 'mark1', rounding: 'port' }
    ];

    // 3. Optional Mark 1A
    if (options.useOffset) {
        const mark1APos = computeDestinationPoint(mark1Pos, 80, windDirection - 90);
        marks.push({ id: "M1A", name: "Mark 1A", pos: mark1APos, radius: 24, role: 'mark1a', rounding: 'port' });
    }

    // 4. Optional Gate (4S/4P) or simple Leeward Mark
    // For MVO, if useGate is false, we might just use Start Pin as Leeward? Or a specific Mark 2?
    // User request: "Minimum Viable Object ... Start Line -> Mark 1 -> Finish Line"
    // So if NO GATE, we just don't add leeward marks? Or do we need a Leeward Mark?
    // "Finish Line ... (usually same as Start)".
    // If laps > 1, need to return to Leeward. If MVO, maybe use Start Line as Gate?
    // Let's stick to: If useGate is true, add gates. If false, rely on Start/Finish or just up/down.
    
    if (options.useGate) {
        const gateCenter = computeDestinationPoint(startMidpoint, 50, windDirection);
        const gateHalfWidth = gateWidthMeters / 2;
        const gate4S_Pos = computeDestinationPoint(gateCenter, gateHalfWidth, windDirection + 90);
        const gate4P_Pos = computeDestinationPoint(gateCenter, gateHalfWidth, windDirection - 90);
        
        marks.push({ id: "G4S", name: "Gate 4S", pos: gate4S_Pos, radius: 24, role: 'gate', rounding: 'starboard' });
        marks.push({ id: "G4P", name: "Gate 4P", pos: gate4P_Pos, radius: 24, role: 'gate', rounding: 'port' });
    }

    // Finish Line
    const finishMidpoint = computeDestinationPoint(startMidpoint, 50, windDirection + 180); 
    const finishP1 = computeDestinationPoint(finishMidpoint, startHalfWidth, windDirection - 90);
    const finishP2 = computeDestinationPoint(finishMidpoint, startHalfWidth, windDirection + 90);

    return {
        start_line: { p1: startP1, p2: startP2 },
        finish_line: { p1: finishP1, p2: finishP2 },
        marks: marks
    };
}

// Logic 6: Laylines Calculation
export function calculateLaylinePoints(
    markPos: Coordinate,
    windDirection: number,
    lengthMeters: number = 2000,
    tackingAngle: number = 45
) {
    // Starboard Layline: Wind + 180 + Angle
    const starboardAngle = (windDirection + 180 + tackingAngle) % 360;
    const pStarboard = computeDestinationPoint(markPos, lengthMeters, starboardAngle);

    // Port Layline: Wind + 180 - Angle
    // Handle negative angle result from subtraction
    let portAngle = (windDirection + 180 - tackingAngle) % 360;
    if (portAngle < 0) portAngle += 360;
    
    const pPort = computeDestinationPoint(markPos, lengthMeters, portAngle);

    return { pStarboard, pPort };
}
