import { create } from 'zustand';
import type { CourseData, CoursePoint } from '../lib/courseGenerator'; // Keep for UI compat
import type { RaceData, Mark } from '../lib/raceTypes';
import { generateWindwardLeewardCourse } from '../lib/raceLogic';
import { DEFAULT_ORIGIN } from '../lib/coordinates';

interface CourseStore {
    course: CourseData | null; // Legacy UI support
    raceData: RaceData | null; // New Logical Structure
    activeLegIndex: number;
    raceName: string | null;
    generate: (windDir: number) => void; // Legacy
    generateRaceCourse: (windDir: number, laps?: number) => void; // New
    setCourse: (course: CourseData | null) => void;
    setRaceName: (name: string) => void;
    nextLeg: () => void;
    prevLeg: () => void;
    setLeg: (index: number) => void;
}

export const useCourseStore = create<CourseStore>((set, get) => ({
    course: null,
    raceData: null,
    activeLegIndex: 0,
    raceName: null,
    /**
     * Legacy generator
     */
    generate: (windDir: number) => {
        console.warn('Using new generateRaceCourse instead');
        get().generateRaceCourse(windDir);
    },
    generateRaceCourse: (windDir: number, laps: number = 2, options = { useOffset: true, useGate: true }) => {
        const startPoint = { lat: DEFAULT_ORIGIN.lat, lng: DEFAULT_ORIGIN.lon };
        const layout = generateWindwardLeewardCourse(startPoint, windDir, 1.0, 40, options);
        
        const raceData: RaceData = {
            course_layout: layout,
            race_config: { laps, total_legs: laps * 2 } // Approximation
        };

        // Mapper to adapt RaceData -> CourseData (for UI)
        const mapMarkToCoursePoint = (m: Mark, color: string, type: CoursePoint['type']): CoursePoint => ({
            id: m.id,
            label: m.name,
            lat: m.pos.lat,
            lon: m.pos.lng,
            type: type,
            color: color
        });

        const marks: CoursePoint[] = layout.marks.map(m => {
            let color = 'yellow';
            let type: CoursePoint['type'] = 'mark';
            if (m.role === 'gate') { color = 'green'; type = 'gate'; }
            if (m.role === 'mark1a') { color = 'orange'; }
            return mapMarkToCoursePoint(m, color, type);
        });

        const startLine: [CoursePoint, CoursePoint] = [
            { ...mapMarkToCoursePoint({ id: 'S1', name: 'Start Pin', pos: layout.start_line.p1, radius: 0 } as Mark, 'orange', 'pin'), label: 'Pin' },
            { ...mapMarkToCoursePoint({ id: 'S2', name: 'Start Boat', pos: layout.start_line.p2, radius: 0 } as Mark, 'green', 'boat'), label: 'Boat' }
        ];

        const finishLine: [CoursePoint, CoursePoint] = [
            { ...mapMarkToCoursePoint({ id: 'F1', name: 'Finish Pin', pos: layout.finish_line.p1, radius: 0 } as Mark, 'blue', 'pin'), label: 'Pin' },
            { ...mapMarkToCoursePoint({ id: 'F2', name: 'Finish Boat', pos: layout.finish_line.p2, radius: 0 } as Mark, 'blue', 'boat'), label: 'Boat' }
        ];

        // Generate Sequence: Start -> M1 -> M1A -> Gate -> (repeat) -> Finish
        const sequence: string[] = [];
        const m1id = 'M1';
        const m1aid = 'M1A';
        const gateId = 'GATE'; // Generic Gate Target
        
        for(let i=0; i<laps; i++) {
             sequence.push(m1id);
             sequence.push(m1aid);
             if (i < laps - 1) {
                 sequence.push(gateId); 
             } else {
                 // Last Lap -> Finish
                 sequence.push('Finish Line');
             }
        }

        const courseData: CourseData = {
            startLine,
            finishLine,
            marks,
            sequence
        };

        set({ raceData, course: courseData, activeLegIndex: 0 });
    },
    setCourse: (course) => set({ course }),
    setRaceName: (name) => set({ raceName: name }),
    nextLeg: () => set((state) => {
        const max = state.course?.marks.length || 0;
        return { activeLegIndex: Math.min(state.activeLegIndex + 1, max) };
    }),
    prevLeg: () => set((state) => ({ activeLegIndex: Math.max(state.activeLegIndex - 1, 0) })),
    setLeg: (index) => set({ activeLegIndex: index })
}));
