// This file acts as a mock database for the loyalty point conversion rate.
// In a real application, this data would be stored in a database
// and fetched dynamically.

type PointSettings = {
    pointValueInRp: number;
};

export let pointSettings: PointSettings = {
    pointValueInRp: 25, // Default value: 1 point = Rp 25
};

// In a real app, you'd have a function connected to a database.
// This is a simulation for demonstration purposes.
export function updatePointValue(newValue: number) {
    if (newValue >= 0) {
        pointSettings.pointValueInRp = newValue;
        console.log("Point value updated (simulation):", pointSettings);
    }
    return pointSettings;
}
