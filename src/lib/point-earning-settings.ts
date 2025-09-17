// This file acts as a mock database for point earning settings.
// In a real application, this data would be stored in a database
// and fetched dynamically.

type PointEarningSettings = {
    rpPerPoint: number;
};

export let pointEarningSettings: PointEarningSettings = {
    rpPerPoint: 10000, // Default: 1 point for every Rp 10.000 spent
};

// In a real app, you'd have a function connected to a database.
// This is a simulation for demonstration purposes.
export function updatePointEarningSettings(newSettings: Partial<PointEarningSettings>) {
    pointEarningSettings = {
        ...pointEarningSettings,
        ...newSettings,
    };
    console.log("Point earning settings updated (simulation):", pointEarningSettings);
    return pointEarningSettings;
}
