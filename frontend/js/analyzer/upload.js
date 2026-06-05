import { analyze } from '../core/flight-analyzer.js';
import { parseTrackFile } from '../core/igc-parser.js';
import {
    fetchTextResource,
    fileNameFromPath,
    readTextFile
} from '../core/file-loader.js';

async function loadAnalyzerSampleTrack(sampleUrl) {
    const content = await fetchTextResource(sampleUrl);
    return analyzeAnalyzerTrackContent(content, fileNameFromPath(sampleUrl));
}

async function loadAnalyzerUploadedFile(file) {
    const content = await readTextFile(file);
    return analyzeAnalyzerTrackContent(content, file.name);
}

function analyzeAnalyzerTrackContent(content, fileName) {
    const points = parseTrackFile(content, fileName);
    return {
        analysis: analyze(points),
        fileName,
        points
    };
}

export {
    loadAnalyzerSampleTrack,
    loadAnalyzerUploadedFile,
    analyzeAnalyzerTrackContent
};
