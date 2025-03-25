import React from 'react';

const Header = ({ instance1, instance2, lastUpdated }) => {
    return (
        <header style={{ padding: '20px', textAlign: 'center', backgroundColor: '#f5f5f5' }}>
            <h1>Weather Dashboard</h1>
            <p>Instance Number {instance1} vs Instance Number {instance2}</p>
            <p>Last updated: {new Date(lastUpdated).toLocaleString()}</p>
        </header>
    );
};

export default Header;
