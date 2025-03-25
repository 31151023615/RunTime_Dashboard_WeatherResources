import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SelectInstance from './components/SelectInstance';
import InstanceDetails from './components/InstanceDetails';
import Dashboard from './components/Dashboard';

import { SSEProvider } from './components/SSEProvider'; // Import SSE Context Provider

function App() {
    return (
        <Router basename="/ports/16068"> {/* Set base path for routing */}
            <Routes>
                {/* SelectInstance is the home page (No SSE) */}
                <Route path="/" element={<SelectInstance />} />

                {/* Dashboard uses SSE data, wrapped inside SSEProvider */}
                <Route 
                    path="/dashboard" 
                    element={
                        <SSEProvider> 
                            <Dashboard />
                        </SSEProvider>
                    } 
                />

                {/* Redirect unknown routes to home */}
                <Route path="/instance/:urlInstanceId" element={<InstanceDetails />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
