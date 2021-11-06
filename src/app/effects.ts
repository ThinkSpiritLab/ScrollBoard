import { useState, useEffect } from "react";

export function useWindowResize(): { width: number } {
    const [windowWidth, setWindowWidth] = useState<number>(window.innerWidth);
    useEffect(() => {
        window.onresize = () => setWindowWidth(window.innerWidth);
        return () => { window.onresize = null; };
    }, []);
    return { width: windowWidth };
}

export function useEventListener<K extends keyof DocumentEventMap>(type: K, f: (ev: DocumentEventMap[K]) => void): void {
    useEffect(() => {
        document.addEventListener(type, f);
        return () => document.removeEventListener(type, f);
    }, [type, f]);
}