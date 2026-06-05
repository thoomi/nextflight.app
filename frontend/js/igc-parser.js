import {
    parseIGC,
    parseGPX,
    parseTrackFile
} from './core/igc-parser.js';

if (typeof window !== 'undefined') {
    window.parseIGC = parseIGC;
    window.parseGPX = parseGPX;
    window.parseTrackFile = parseTrackFile;
}

export {
    parseIGC,
    parseGPX,
    parseTrackFile
};
