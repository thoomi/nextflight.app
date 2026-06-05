async function fetchTextResource(path, fetchImpl = fetch) {
    const response = await fetchImpl(path);
    if (!response.ok) {
        throw new Error(`Could not load sample (${response.status})`);
    }
    return response.text();
}

function readTextFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

function fileNameFromPath(path) {
    return path.split('/').pop() || 'flight.igc';
}

function titleFromFileName(fileName) {
    const base = fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
    return base.replace(/\s+/g, ' ').trim().replace(/\b\w/g, (char) => char.toUpperCase());
}

function slugify(value) {
    const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return slug || 'flight';
}

export {
    fetchTextResource,
    readTextFile,
    fileNameFromPath,
    titleFromFileName,
    slugify
};
