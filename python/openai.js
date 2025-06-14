const readlineSync = require('readline-sync');
const axios = require('axios');
const OpenAI = require('openai');
require('dotenv').config();

// Configure OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Configure environment variables
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

// Maintain conversation history
let conversationHistory = [
    {
        role: "system",
        content: `You are an intelligent assistant that helps users get information about weather, GitHub profiles, Twitter profiles, and countries.
You should analyze user queries and respond appropriately based on their intent.
For specific data queries, use one of these action codes:
- Weather queries: ACTION:weather:<city>
- GitHub profiles: ACTION:github:<username>
- Twitter profiles: ACTION:twitter:<username>
- Country information: ACTION:country:<country>
- General questions: ACTION:freeform

Respond ONLY with the action code for data queries.`
    }
];

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

// Unified Assistant using OpenAI with conversation history
async function aiAssistant(userQuery) {
    try {
        // Add user's query to conversation history
        conversationHistory.push({
            role: "user",
            content: userQuery
        });

        // Get the action from OpenAI
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: conversationHistory,
            temperature: 0.7,
            max_tokens: 50
        });

        const actionLine = completion.choices[0].message.content.trim();
        
        // Add assistant's action decision to history
        conversationHistory.push({
            role: "assistant",
            content: actionLine
        });

        let response;
        if (actionLine.startsWith('ACTION:weather:')) {
            const city = actionLine.split(':', 3)[2];
            response = await getCurrentWeather(city);
            response = response || `Sorry, couldn't fetch weather data for ${city}.`;
        }
        else if (actionLine.startsWith('ACTION:github:')) {
            const username = actionLine.split(':', 3)[2];
            response = await getGithubProfile(username);
            response = response || `Sorry, couldn't fetch GitHub data for ${username}.`;
        }
        else if (actionLine.startsWith('ACTION:twitter:')) {
            const username = actionLine.split(':', 3)[2];
            response = getTwitterProfile(username);
        }
        else if (actionLine.startsWith('ACTION:country:')) {
            const country = actionLine.split(':', 3)[2];
            response = getCountryInfo(country);
        }
        else if (actionLine.startsWith('ACTION:freeform')) {
            // For general questions, get a direct response from OpenAI with full context
            const freeformResponse = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    ...conversationHistory,
                    {
                        role: "system",
                        content: "Provide a clear, concise, and helpful response to the user's question."
                    }
                ],
                temperature: 0.7,
                max_tokens: 150
            });
            response = freeformResponse.choices[0].message.content.trim();
        }
        else {
            response = "Sorry, I didn't understand your request.";
        }

        // Add the final response to conversation history
        conversationHistory.push({
            role: "assistant",
            content: response
        });

        // Keep conversation history manageable (last 10 messages)
        if (conversationHistory.length > 10) {
            // Always keep the system message
            conversationHistory = [
                conversationHistory[0],
                ...conversationHistory.slice(-9)
            ];
        }

        return response;
    } catch (error) {
        console.error('Error in AI assistant:', error);
        return "Sorry, there was an error processing your request.";
    }
}

// Main CLI loop
async function main() {
    console.log("Welcome to the OpenAI Weather & Information Assistant!");
    console.log("(Type 'exit', 'quit', or 'bye' to end the program)\n");
    console.log("Type 'clear' to reset conversation history\n");

    while (true) {
        const query = readlineSync.question('You: ').trim();
        
        if (query.toLowerCase() === 'exit' || query.toLowerCase() === 'quit' || query.toLowerCase() === 'bye') {
            console.log('\nGoodbye!');
            break;
        }

        if (query.toLowerCase() === 'clear') {
            // Reset conversation history to initial state
            conversationHistory = [conversationHistory[0]];
            console.log('\nConversation history cleared.\n');
            continue;
        }

        if (query) {
            console.log('\nAssistant:', await aiAssistant(query), '\n');
        }
    }
}

// Start the CLI
main().catch(console.error); 