const axios = require('axios');

const getCurrentWeather = async (city) => {
    try {
        const url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`;
        const response = await axios.get(url);
        const data = response.data;
        
        return {
            success: true,
            data: {
                city: city,
                temperature: data.main.temp,
                condition: data.weather[0].description,
                humidity: data.main.humidity
            },
            message: `Current weather in ${city}: Temperature: ${data.main.temp}°C, Condition: ${data.weather[0].description}, Humidity: ${data.main.humidity}%`
        };
    } catch (error) {
        console.error('Error fetching weather:', error);
        return {
            success: false,
            error: error.message,
            message: `Sorry, couldn't fetch weather data for ${city}.`
        };
    }
};

module.exports = {
    getCurrentWeather
}; 