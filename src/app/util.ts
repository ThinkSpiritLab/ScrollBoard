export function readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>): void => {
            resolve(e.target?.result?.toString());
        };

        reader.onerror = ((e): void => reject(e));

        reader.readAsText(file);
    });
}

export function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => resolve(), ms);
    });
}