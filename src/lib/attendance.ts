/**
 * Attendance Security Logic
 */

export const SHOP_LOCATION = {
    lat: 13.125842281329202,
    lng: 79.96529379598987,
};

export const MAX_DISTANCE_METERS = 50;

export const QR_VALID_WINDOW = {
    start: "08:45",
    end: "09:30",
};

/**
 * Parse time string like "09:00 AM", "8:30AM", or "08:30" into minutes from midnight
 */
export function parseTimeMinutes(timeStr: string): number {
    if (!timeStr) return 0;

    // Normalize string: trim, uppercase, and match pattern
    const cleanStr = timeStr.trim().toUpperCase();
    const matches = cleanStr.match(/(\d+):(\d+)\s*(AM|PM)?/);

    if (!matches) return 0;

    let hours = parseInt(matches[1]);
    const minutes = parseInt(matches[2]);
    const ampm = matches[3];

    // Handle 12-hour format if AM/PM is present
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;

    return hours * 60 + minutes;
}

/**
 * Calculate late duration in hours and minutes
 */
export function calculateLateDuration(checkInTime: Date, shiftStartTimeStr: string): string | null {
    if (!shiftStartTimeStr) return null;

    const checkInMinutes = checkInTime.getHours() * 60 + checkInTime.getMinutes();
    const shiftMinutes = parseTimeMinutes(shiftStartTimeStr);

    // If parsing failed or check-in is before/exactly at shift start
    if (isNaN(shiftMinutes) || shiftMinutes === 0 || checkInMinutes <= shiftMinutes) {
        return null;
    }

    const diff = checkInMinutes - shiftMinutes;
    const h = Math.floor(diff / 60);
    const m = diff % 60;

    return `${h}h ${String(m).padStart(2, '0')}m`;
}

/**
 * Sum multiple duration strings (e.g., ["1h 30m", "0h 45m"])
 */
export function sumDurations(durations: (string | null)[]): string {
    let totalMinutes = 0;
    durations.forEach(d => {
        if (!d) return;
        const [hPart, mPart] = d.split(' ');
        const h = parseInt(hPart.replace('h', '')) || 0;
        const m = parseInt(mPart.replace('m', '')) || 0;
        totalMinutes += h * 60 + m;
    });

    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${String(m).padStart(2, '0')}m`;
}

/**
 * Calculate distance between two points in meters using Haversine formula
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * Check if the current time is within the QR valid window
 */
export function isWithinTimeWindow(): boolean {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    return currentTime >= QR_VALID_WINDOW.start && currentTime <= QR_VALID_WINDOW.end;
}

/**
 * Check if the current time is within the staff's specific shift window.
 */
export function isWithinStaffTimeWindow(shiftStr: string | null): boolean {
    if (!shiftStr || !shiftStr.includes(' - ')) {
        return true; // Allow if no shift defined
    }

    const [startStr, endStr] = shiftStr.split(' - ');
    const startMinutes = parseTimeMinutes(startStr);
    const endMinutes = parseTimeMinutes(endStr);
    
    if (isNaN(startMinutes) || isNaN(endMinutes) || startMinutes === 0) {
        return true;
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Allow checking in up to 120 minutes before the shift starts, and anytime before shift ends.
    return currentMinutes >= (startMinutes - 120) && currentMinutes <= endMinutes;
}

/**
 * Mock function to check if staff already marked attendance today
 */
export async function hasMarkedToday(staffId: number): Promise<boolean> {
    // In a real app, this would query the database
    return false;
}

/**
 * Mock function to check if device already marked attendance today
 */
export async function isDeviceUsedToday(deviceId: string): Promise<boolean> {
    // In a real app, this would query the database
    return false;
}
