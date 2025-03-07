/**
 * Peak Finding Module
 * 
 * PURPOSE:
 * This module identifies significant peaks in a spectrogram, which are crucial for audio fingerprinting.
 * Peak points represent time-frequency landmarks that are:
 * 1. Distinctive and robust to noise and distortion
 * 2. Relatively sparse, making fingerprints compact
 * 3. Consistent across different recordings of the same audio
 * 
 * These peaks will form the basis of our audio fingerprints, serving as
 * anchor points for creating hash values that uniquely identify audio segments.
 */

/**
 * Finds local maxima (peaks) in a spectrogram that exceed a threshold value
 * 
 * PURPOSE:
 * Peak detection is a critical step in audio fingerprinting because:
 * - Peaks represent the most energetic and distinctive parts of the audio
 * - They persist even when audio is distorted or has background noise
 * - They create a sparse representation that's efficient for storage and matching
 * - The pattern of peaks forms a unique "constellation" for each audio segment
 * 
 * @param {Array<Float32Array>} spectrogram - 2D array of spectrogram data [time][frequency]
 * @param {number} minFreq - Minimum frequency bin to consider (default: 30Hz)
 * @param {number} maxFreq - Maximum frequency bin to consider (default: 300Hz)
 * @param {Array<number>} neighborhood - Size of neighborhood to check [time, frequency] (default: [3,3])
 * @param {number} threshold - Minimum amplitude to consider as peak (default: 0.5)
 * @returns {Array<Object>} - Array of peak objects with time, frequency, and amplitude
 */
function findPeaks(spectrogram, minFreq = 30, maxFreq = 300, neighborhood = [3, 3], threshold = 0.5) {
    // Array to store detected peaks
    const peaks = [];
    // Destructure neighborhood size parameters
    const [timeNeighborhood, freqNeighborhood] = neighborhood;

    // Iterate through each time frame in the spectrogram
    // Skip the edges to ensure we can check the full neighborhood
    for (let t = timeNeighborhood; t < spectrogram.length - timeNeighborhood; t++) {
        // Iterate through the frequency range of interest
        // This range is typically chosen to focus on the most informative
        // parts of the audio spectrum for the specific application
        for (let f = minFreq; f < Math.min(maxFreq, spectrogram[t].length - freqNeighborhood); f++) {
            // Get the amplitude value at this time-frequency point
            const value = spectrogram[t][f];

            // First check if this point exceeds the minimum threshold
            // This filters out low-energy points that are unlikely to be significant
            let isPeak = value > threshold;

            // If it passes the threshold test, check if it's a local maximum
            if (isPeak) {
                // Examine all points in the neighborhood around this point
                for (let dt = -timeNeighborhood; dt <= timeNeighborhood && isPeak; dt++) {
                    for (let df = -freqNeighborhood; df <= freqNeighborhood && isPeak; df++) {
                        // Skip comparing the point to itself
                        if (dt === 0 && df === 0) continue;

                        // If any neighboring point has a higher value, this is not a peak
                        if (spectrogram[t + dt][f + df] >= value) {
                            isPeak = false;
                        }
                    }
                }
            }

            // If the point passed all tests, it's a genuine peak
            if (isPeak) {
                // Store the peak with its coordinates and amplitude
                // These peaks will be used to generate fingerprint hashes
                peaks.push({ time: t, freq: f, amplitude: value });
            }
        }
    }

    // Return all detected peaks
    // These will be used in the next stage of fingerprinting to:
    // 1. Form pairs or constellations of peaks
    // 2. Generate hash values from these peak patterns
    // 3. Create the final audio fingerprint
    return peaks;
}

module.exports = { findPeaks };