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
    toggleComplete: todoController.toggleComplete,
    deleteTodo: todoController.deleteTodo
};

// Format todo for display
const formatTodo = (todo) => {
    return `[${todo._id}] ${todo.title} (${todo.completed ? 'Completed' : 'Pending'})`;
};

// Handle errors in a user-friendly way
const handleError = (error, context) => {
    // Log the technical error for debugging
    console.error(`Error in ${context}:`, error);
    
    // Return user-friendly message
    return "I couldn't process that request. Please try again or rephrase your command.";
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
updateTodo(id: string, title: string) - Update a todo title
toggleComplete(id: string) - Toggle completion status of a todo
deleteTodo(id: string) - Delete a todo

Your response must ONLY be a raw JSON object like this:
{"function":"functionName","parameters":{"paramName":"value"}}

Examples:
{"function":"getCurrentWeather","parameters":{"city":"London"}}
{"function":"createTodo","parameters":{"title":"Buy groceries"}}
{"function":"toggleComplete","parameters":{"id":"123"}}
{"function":"conversation","parameters":{"response":"I understand you want to..."}}

For todo completion commands, understand variations like:
- "mark todo 123 as done"
- "complete task 123"
- "finish todo 123"
- "toggle todo 123"
- "mark 123 as pending"
- "uncomplete todo 123"

NO OTHER TEXT OR FORMATTING - JUST THE JSON OBJECT.`;

    try {
        const fullPrompt = `${SYSTEM_PROMPT}\nUser query: "${userQuery}"`;
        const result = await model.generateContent(fullPrompt);
        let response = result.response.text().trim();
        
        // Clean the response of any markdown or code block indicators
        response = response.replace(/\`\`\`json|\`\`\`/g, '').trim();
        
        try {
            // Basic validation that response starts with { and ends with }
            if (!response.startsWith('{') || !response.endsWith('}')) {
                return handleError(new Error('Invalid response format'), 'response validation');
            }
            
            const action = JSON.parse(response);
            
            // Validate the response structure
            if (!action.function || !action.parameters) {
                return handleError(new Error('Invalid action structure'), 'action validation');
            }
            
            if (action.function === "conversation") {
                return action.parameters.response;
            }
            
            if (availableFunctions[action.function]) {
                const result = await availableFunctions[action.function](...Object.values(action.parameters));
                
                // Special handling for getAllTodos
                if (action.function === 'getAllTodos' && result.success && result.data) {
                    if (result.data.length === 0) {
                        return "You don't have any todos yet. Try adding some!";
                    }
                    const formattedTodos = result.data.map(formatTodo).join('\n');
                    return `Your todos:\n${formattedTodos}`;
                }
                
                // Special handling for getTodoById
                if (action.function === 'getTodoById' && result.success && result.data) {
                    return formatTodo(result.data);
                }
                
                return result.message;
            } else {
                return "I'm not sure how to help with that. Could you try rephrasing your request?";
            }
        } catch (parseError) {
            return handleError(parseError, 'command processing');
        }
    } catch (error) {
        return handleError(error, 'AI processing');
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