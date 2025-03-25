import React, { createContext, useContext, useEffect, useState } from "react";

const SSEContext = createContext(null);

export const SSEProvider = ({ children }) => {
    const [sseData, setSseData] = useState(null); // Keep the latest SSE event as it is

    useEffect(() => {
        console.log("?? Connecting to SSE...");
        // const eventSource = new EventSource("https://lehre.bpm.in.tum.de/ports/16067/api/mockEvents");
        const eventSource = new EventSource("https://lehre.bpm.in.tum.de/ports/16067/api/events");

        eventSource.onmessage = (event) => {
            try {
                const newData = JSON.parse(event.data);
                console.log("?? SSE Data Received:", newData);
                setSseData(newData); // ? Directly store the latest event
            } catch (error) {
                console.error("? Error parsing SSE data:", error);
            }
        };

        eventSource.onerror = (error) => {
            console.error("? SSE Error:", error);
            eventSource.close();
        };

        return () => {
            console.log("?? Closing SSE Connection...");
            eventSource.close();
        };
    }, []);

    return <SSEContext.Provider value={sseData}>{children}</SSEContext.Provider>;
};

export const useSSEData = () => useContext(SSEContext);
