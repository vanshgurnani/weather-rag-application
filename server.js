const readlineSync = require('readline-sync');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Configure environment variables
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

// Configure Gemini
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Tool: Get weather info
async function getCurrentWeather(city) {
    try {
        const url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHER_API_KEY}&units=metric`;
        const response = await axios.get(url);
        const data = response.data;
        return `Current weather in ${city}: Temperature: ${data.main.temp}°C, Condition: ${data.weather[0].description}, Humidity: ${data.main.humidity}%`;
    } catch (error) {
        return null;
    }
}

// Tool: Get GitHub profile summary
async function getGithubProfile(username) {
    try {
        const url = `https://api.github.com/users/${username}`;
        const response = await axios.get(url);
        const data = response.data;
        return `${data.name} (@${data.login}) has ${data.public_repos} public repos and ${data.followers} followers. Bio: ${data.bio || 'No bio'}.`;
    } catch (error) {
        return null;
    }
}

// Tool: Mock Twitter profile summary
function getTwitterProfile(username) {
    const fakeProfiles = {
        "elonmusk": {
            name: "Elon Musk",
            followers: "180M",
            tweets: "25K",
            bio: "Technoking of Tesla, CEO of SpaceX"
        },
        "jack": {
            name: "Jack Dorsey",
            followers: "6M",
            tweets: "28K",
            bio: "Block Head"
        }
    };

    const data = fakeProfiles[username.toLowerCase()];
    if (!data) {
        return `Sorry, we don't have mock data for @${username}.`;
    }
    
    return `${data.name} (@${username}) has ${data.followers} followers and ${data.tweets} tweets. Bio: ${data.bio}`;
}

// Tool: Mock Country Info
function getCountryInfo(country) {
    const countries = {
        "india": {
            capital: "New Delhi",
            population: "1.4 billion",
            language: "Hindi & English",
            currency: "Indian Rupee (INR)"
        },
        "japan": {
            capital: "Tokyo",
            population: "125 million",
            language: "Japanese",
            currency: "Japanese Yen (JPY)"
        },
        "france": {
            capital: "Paris",
            population: "67 million",
            language: "French",
            currency: "Euro (EUR)"
        }
    };

    const data = countries[country.toLowerCase()];
    if (!data) {
        return `Sorry, no info available for '${country}'.`;
    }
    
    return `${country.charAt(0).toUpperCase() + country.slice(1)} - Capital: ${data.capital}, Population: ${data.population}, Language: ${data.language}, Currency: ${data.currency}`;
}

// Unified Assistant
async function aiAssistant(userQuery) {
    const SYSTEM_PROMPT = `
You are an intelligent assistant. Based on the user's query, decide what the intent is and respond accordingly.
- If it's a weather-related question, extract the city and say: ACTION:weather:<city>
- If it's about GitHub, extract the username and say: ACTION:github:<username>
- If it's about Twitter, extract the username and say: ACTION:twitter:<username>
- If it's about a country, extract the country name and say: ACTION:country:<country>
- If it's anything else, respond with ACTION:freeform
`;

    const fullPrompt = `${SYSTEM_PROMPT}\nUser query: "${userQuery}"`;

    try {
        const result = await model.generateContent(fullPrompt);
        const actionLine = result.response.text().trim();

        if (actionLine.startsWith('ACTION:weather:')) {
            const city = actionLine.split(':', 3)[2];
            const weatherInfo = await getCurrentWeather(city);
            return weatherInfo || `Sorry, couldn't fetch weather data for ${city}.`;
        }
        else if (actionLine.startsWith('ACTION:github:')) {
            const username = actionLine.split(':', 3)[2];
            const profileInfo = await getGithubProfile(username);
            return profileInfo || `Sorry, couldn't fetch GitHub data for ${username}.`;
        }
        else if (actionLine.startsWith('ACTION:twitter:')) {
            const username = actionLine.split(':', 3)[2];
            return getTwitterProfile(username);
        }
        else if (actionLine.startsWith('ACTION:country:')) {
            const country = actionLine.split(':', 3)[2];
            return getCountryInfo(country);
        }
        else if (actionLine.startsWith('ACTION:freeform')) {
            const freeFormResponse = await model.generateContent(userQuery);
            return freeFormResponse.response.text().trim();
        }
        else {
            return "Sorry, I didn't understand your request.";
        }
    } catch (error) {
        console.error('Error in AI assistant:', error);
        return "Sorry, there was an error processing your request.";
    }
}

// Main CLI loop
async function main() {
    console.log("Welcome to the Weather & Information Assistant!");
    console.log("(Type 'exit', 'quit', or 'bye' to end the program)\n");

    while (true) {
        const query = readlineSync.question('You: ').trim();
        
        if (query.toLowerCase() === 'exit' || query.toLowerCase() === 'quit' || query.toLowerCase() === 'bye') {
            console.log('\nGoodbye!');
            break;
        }

        if (query) {
            console.log('\nAssistant:', await aiAssistant(query), '\n');
        }
    }
}

// Start the CLI
main().catch(console.error); 