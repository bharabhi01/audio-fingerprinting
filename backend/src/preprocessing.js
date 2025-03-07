const fs = require('fs');
const wav = require('wav');
const { spawn } = require('child_process');
const ffmpeg = require('ffmpeg-static');

/**
 * Audio Preprocessing Module
 * 
 * PURPOSE:
 * This module handles the initial processing of audio files for the fingerprinting system.
 * Before we can analyze audio content, we need to:
 * 1. Ensure all audio is in a consistent format (WAV)
 * 2. Convert the raw audio data into a normalized format suitable for analysis
 * 
 * These preprocessing steps are critical because:
 * - Audio fingerprinting requires consistent input formats
 * - Different audio sources (MP3, OGG, etc.) need conversion to a standard format
 * - Raw audio data needs normalization for reliable feature extraction
 * - The spectral analysis that follows requires floating-point samples
 * 
 * This module serves as the first stage in the audio fingerprinting pipeline,
 * preparing raw audio for the subsequent spectral analysis and feature extraction.
 */

/**
 * Converts an audio file to WAV format using FFmpeg
 * 
 * PURPOSE:
 * Audio files come in many formats (MP3, AAC, OGG, etc.), but our analysis
 * requires a consistent format. WAV is chosen because:
 * - It's uncompressed, avoiding compression artifacts
 * - It has a simple structure that's easy to parse
 * - It preserves audio quality needed for accurate fingerprinting
 * 
 * @param {string} inputFile - Path to the source audio file
 * @param {string} outputFile - Path where the converted WAV file will be saved
 * @returns {Promise<string>} - Promise that resolves with the output file path when conversion is successful
 */
function convertToWav(inputFile, outputFile) {
    return new Promise((resolve, reject) => {
        // Spawn a new FFmpeg process to handle the conversion
        // FFmpeg is an industry-standard tool for audio/video conversion
        const process = spawn(ffmpeg, [
            '-i', inputFile,     // Input file path
            '-f', 'wav',         // Output format: WAV
            '-ar', '44100',      // Audio sample rate: 44.1kHz (CD quality)
            '-ac', '1',          // Audio channels: 1 (mono) - simplifies analysis
            outputFile           // Output file path
        ]);

        // Listen for process completion
        process.on('close', code => {
            if (code === 0)
                // Success: resolve the promise with the output file path
                resolve(outputFile);
            else
                // Error: reject the promise with the error code
                reject(new Error(`ffmpeg failed with code ${code}`));
        });
    });
}

/**
 * Reads a WAV audio file and converts it to a normalized Float32Array format
 * 
 * PURPOSE:
 * Raw WAV data is typically stored as integer PCM samples, but our signal
 * processing algorithms work better with floating-point values. This function:
 * - Reads the WAV file and extracts its raw PCM data
 * - Converts integer samples to normalized floating-point values (-1.0 to 1.0)
 * - Provides the sample rate needed for frequency calculations
 * 
 * The resulting normalized data is ideal for:
 * - Spectral analysis (FFT operations)
 * - Feature extraction
 * - Consistent processing regardless of recording volume
 * 
 * @param {string} filePath - Path to the WAV audio file to read
 * @returns {Promise<Object>} 
 *      - Promise that resolves with an object containing:
 *      - sampleRate: the audio sample rate (needed for frequency calculations)
 *      - data: audio samples as normalized Float32Array (-1.0 to 1.0)
 */
function readAudioFile(filePath) {
    return new Promise((resolve, reject) => {
        // Create a WAV file reader
        const reader = new wav.Reader();
        // Array to collect audio data chunks
        const audioData = [];

        // When format information is available from the WAV header
        reader.on('format', format => {
            // For each chunk of audio data received
            reader.on('data', buffer => {
                // Collect the data chunks
                audioData.push(buffer);
            });

            // When all data has been read
            reader.on('end', () => {
                // Combine all data chunks into a single buffer
                const buffer = Buffer.concat(audioData);
                // Create a Float32Array to hold the converted audio samples
                // (divide by 2 because each sample is 16 bits = 2 bytes)
                const floatData = new Float32Array(buffer.length / 2);

                // Convert each 16-bit integer sample to a normalized float value
                for (let i = 0; i < floatData.length; i++) {
                    // Read 16-bit sample and normalize to range -1.0 to 1.0
                    // (32768 is 2^15, the max value of a signed 16-bit integer)
                    floatData[i] = buffer.readInt16LE(i * 2) / 32768.0;
                }

                // Return the audio data and sample rate
                resolve({
                    sampleRate: format.sampleRate,
                    data: floatData,
                });
            });
        });

        // Create a read stream from the file and pipe it to the WAV reader
        fs.createReadStream(filePath).pipe(reader);
    });
}

// Export functions for use in other modules of the fingerprinting system
// These functions will be used in the fingerprinting pipeline to:
// 1. Convert uploaded or recorded audio to WAV format
// 2. Read and normalize the audio data for spectral analysis
module.exports = {
    convertToWav,
    readAudioFile,
};