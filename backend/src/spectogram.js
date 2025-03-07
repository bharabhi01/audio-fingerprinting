const { FFT } = require('fft-js');

/**
 * Creates a spectrogram from audio data using Fast Fourier Transform
 * 
 * PURPOSE:
 * This function is a critical component of audio fingerprinting systems.
 * Spectrograms convert audio from time domain to frequency domain, revealing
 * frequency patterns over time that are more distinctive and robust for matching
 * than raw waveforms. These spectrograms will later be used to:
 * 1. Generate audio fingerprints for database storage
 * 2. Create query fingerprints for matching against the database
 * 3. Enable identification of songs even with background noise or distortion
 * 
 * The resulting spectrogram highlights frequency patterns unique to each audio
 * sample, making it ideal for creating distinctive fingerprints.
 * 
 * @param {Float32Array} audioData - Normalized audio samples (-1.0 to 1.0)
 * @param {number} sampleRate - Sample rate of the audio in Hz
 * @param {number} windowSize - Size of the FFT window (default: 1024)
 * @param {number} hopSize - Number of samples to advance between windows (default: 512)
 * @returns {Array<Float32Array>} - Array of magnitude spectra, each representing one time frame
 */
function createSpectogram(audioData, sampleRate, windowSize = 1024, hopSize = 512) {
    // Array to store the spectrogram data (collection of spectra)
    // A spectrogram is a visual representation of frequencies changing over time
    const spectogram = [];

    // Initialize the FFT processor with the specified window size
    // FFT (Fast Fourier Transform) converts time-domain signals to frequency-domain
    const fft = new FFT(windowSize);

    // Create a Hamming window function to reduce spectral leakage
    // Windowing reduces artifacts caused by analyzing finite segments of audio
    // by tapering the signal at the edges of each window
    const hammingWindow = new Float32Array(windowSize);
    for (let i = 0; i < windowSize; i++) {
        // Hamming window formula: 0.54 - 0.46 * cos(2π * i / (N-1))
        hammingWindow[i] = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (windowSize - 1));
    }

    // Process the audio data in overlapping windows
    // We use overlapping windows (controlled by hopSize) to capture transitions
    // that might occur at window boundaries
    for (let i = 0; i < audioData.length - windowSize; i += hopSize) {
        // Extract a window of audio data and apply the Hamming window
        // This multiplication attenuates samples at the edges of the window
        const windowData = new Float32Array(windowSize);
        for (let j = 0; j < windowSize; j++) {
            windowData[j] = audioData[i + j] * hammingWindow[j];
        }

        // Prepare an array for the FFT output (complex numbers)
        // FFT produces complex numbers with real and imaginary parts
        const spectrum = fft.createComplexArray();

        // Perform the FFT on the windowed data
        // This transforms the time-domain signal to frequency-domain
        fft.realTransform(spectrum, windowData);

        // Calculate magnitude spectrum (only need first half due to symmetry)
        // For real signals, the FFT output is symmetric, so we only need N/2 values
        // The magnitudes represent the strength of each frequency component
        const magnitudes = new Float32Array(windowSize / 2);
        for (let j = 0; j < windowSize / 2; j++) {
            // Extract real and imaginary components from the complex array
            // FFT-js stores complex numbers as alternating real and imaginary values
            const real = spectrum[2 * j];
            const imag = spectrum[2 * j + 1];

            // Calculate magnitude using Pythagorean theorem: |z| = √(a² + b²)
            // This gives us the amplitude of each frequency component
            magnitudes[j] = Math.sqrt(real * real + imag * imag);
        }

        // Add this time frame's spectrum to the spectrogram
        // Each entry represents the frequency content at a specific time window
        spectogram.push(magnitudes);
    }

    // Return the complete spectrogram - a 2D representation of frequency vs. time
    // This will be used in the next stage of fingerprinting to:
    // 1. Extract peak frequencies (landmarks)
    // 2. Create hash values from these landmarks
    // 3. Store or match these hashes in the fingerprint database
    return spectogram;
}

module.exports = {
    createSpectogram,
};