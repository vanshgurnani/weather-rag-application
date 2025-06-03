const readlineSync = require('readline-sync');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const connectDB = require('./config/database');
const todoController = require('./controllers/todoController');
const weatherController = require('./controllers/weatherController');
const githubController = require('./controllers/githubController');
const socialController = require('./controllers/socialController');
const countryController = require('./controllers/countryController');
require('dotenv').config();

// Configure Gemini
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Available functions that can be called by the AI
const availableFunctions = {
    getCurrentWeather: weatherController.getCurrentWeather,
    getGithubProfile: githubController.getGithubProfile,
    getTwitterProfile: socialController.getTwitterProfile,
    getCountryInfo: countryController.getCountryInfo,
    createTodo: todoController.createTodo,
    getAllTodos: todoController.getAllTodos,
    getTodoById: todoController.getTodoById,
    updateTodo: todoController.updateTodo,
    deleteTodo: todoController.deleteTodo
};

// Unified Assistant
async function aiAssistant(userQuery) {
    const SYSTEM_PROMPT = `
IMPORTANT: You are a JSON-only response system. DO NOT use markdown, code blocks, or any other formatting.
DO NOT include \`\`\`json or \`\`\` or any other markers.
ONLY return a raw JSON object.

Available functions:
getCurrentWeather(city: string) - Get weather information for a city
getGithubProfile(username: string) - Get GitHub profile information
getTwitterProfile(username: string) - Get Twitter profile information
getCountryInfo(country: string) - Get information about a country
createTodo(title: string) - Create a new todo
getAllTodos() - List all todos
getTodoById(id: string) - Get a specific todo
updateTodo(id: string, title: string) - Update a todo
deleteTodo(id: string) - Delete a todo

Your response must ONLY be a raw JSON object like this:
{"function":"functionName","parameters":{"paramName":"value"}}

Examples:
{"function":"getCurrentWeather","parameters":{"city":"London"}}
{"function":"createTodo","parameters":{"title":"Buy groceries"}}
{"function":"conversation","parameters":{"response":"I understand you want to..."}}

NO OTHER TEXT OR FORMATTING - JUST THE JSON OBJECT.`;

    try {
        const fullPrompt = `${SYSTEM_PROMPT}\nUser query: "${userQuery}"`;
        const result = await model.generateContent(fullPrompt);
        let response = result.response.text().trim();
        
        // Clean the response of any markdown or code block indicators
        response = response.replace(/\`\`\`json|\`\`\`/g, '').trim();
        
        try {
            // Log the cleaned response for debugging
            console.debug('Raw AI Response:', response);
            
            // Basic validation that response starts with { and ends with }
            if (!response.startsWith('{') || !response.endsWith('}')) {
                throw new Error('Response is not a valid JSON object');
            }
            
            const action = JSON.parse(response);
            
            // Validate the response structure
            if (!action.function || !action.parameters) {
                throw new Error('Invalid response structure: missing function or parameters');
            }
            
            if (action.function === "conversation") {
                return action.parameters.response;
            }
            
            if (availableFunctions[action.function]) {
                const result = await availableFunctions[action.function](...Object.values(action.parameters));
                return result.message;
            } else {
                return `Sorry, I couldn't process that request. Function '${action.function}' not found.`;
            }
        } catch (parseError) {
            console.error('Error parsing AI response:', parseError);
            console.error('Cleaned response:', response);
            return "Sorry, I had trouble processing that request. Please try rephrasing your query.";
        }
    } catch (error) {
        console.error('Error in AI assistant:', error);
        return "Sorry, there was an error processing your request.";
    }
}

// Main CLI loop
async function main() {
    try {
        // Connect to MongoDB
        await connectDB();
        
        console.log("Welcome to the Information Assistant!");

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
    } catch (error) {
        console.error('Application error:', error);
        process.exit(1);
    }
}

// Start the CLI
main().catch(console.error); 