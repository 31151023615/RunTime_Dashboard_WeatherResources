import axios from 'axios';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

// Fetch data from JSON files
export const getWeatherData = async () => {
    try {
        const response = await axios.get('http://localhost:5000/api/weather');
        return response.data;
    } catch (error) {
        console.error('Error fetching weather data:', error.message);
        throw error;
    }
};

