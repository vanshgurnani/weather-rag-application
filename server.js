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

// Unified Assistant
async function aiAssistant(userQuery) {
    const SYSTEM_PROMPT = `
You are an intelligent assistant. Based on the user's query, decide what the intent is and respond accordingly.
- If it's a weather-related question, extract the city and say: ACTION:weather:<city>
- If it's about GitHub, extract the username and say: ACTION:github:<username>
- If it's about Twitter, extract the username and say: ACTION:twitter:<username>
- If it's about a country, extract the country name and say: ACTION:country:<country>
- If it's about adding a todo, say: ACTION:todo_add:<title>
- If it's about listing todos, say: ACTION:todo_list
- If it's about updating a todo, say: ACTION:todo_update:<id>:<title>
- If it's about getting a specific todo, say: ACTION:todo_get:<id>
- If it's about deleting a todo, say: ACTION:todo_delete:<id>
- If it's anything else, respond with ACTION:freeform
`;

    const fullPrompt = `${SYSTEM_PROMPT}\nUser query: "${userQuery}"`;

    try {
        const result = await model.generateContent(fullPrompt);
        const actionLine = result.response.text().trim();

        if (actionLine.startsWith('ACTION:todo_add:')) {
            const title = actionLine.split(':', 3)[2];
            const response = await todoController.createTodo(title);
            return response.message;
        } else if (actionLine.startsWith('ACTION:todo_list')) {
            const response = await todoController.getAllTodos();
            if (response.success && response.data.length > 0) {
                return response.data.map(todo => todo.formatForDisplay()).join('\n');
            }
            return response.message;
        } else if (actionLine.startsWith('ACTION:todo_update:')) {
            const [_, __, id, title] = actionLine.split(':');
            const response = await todoController.updateTodo(id, title);
            return response.message;
        } else if (actionLine.startsWith('ACTION:todo_get:')) {
            const id = actionLine.split(':')[2];
            const response = await todoController.getTodoById(id);
            if (response.success) {
                return response.data.formatForDisplay();
            }
            return response.message;
        } else if (actionLine.startsWith('ACTION:todo_delete:')) {
            const id = actionLine.split(':')[2];
            const response = await todoController.deleteTodo(id);
            return response.message;
        } else if (actionLine.startsWith('ACTION:weather:')) {
            const city = actionLine.split(':', 3)[2];
            const response = await weatherController.getCurrentWeather(city);
            return response.message;
        } else if (actionLine.startsWith('ACTION:github:')) {
            const username = actionLine.split(':', 3)[2];
            const response = await githubController.getGithubProfile(username);
            return response.message;
        } else if (actionLine.startsWith('ACTION:twitter:')) {
            const username = actionLine.split(':', 3)[2];
            const response = socialController.getTwitterProfile(username);
            return response.message;
        } else if (actionLine.startsWith('ACTION:country:')) {
            const country = actionLine.split(':', 3)[2];
            const response = countryController.getCountryInfo(country);
            return response.message;
        } else if (actionLine.startsWith('ACTION:freeform')) {
            const freeFormResponse = await model.generateContent(userQuery);
            return freeFormResponse.response.text().trim();
        } else {
            return "Sorry, I didn't understand your request.";
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
        console.log("\nAvailable Commands:");
        console.log("\nTodo Management:");
        console.log("- Add todo: 'add todo: [title]'");
        console.log("- List todos: 'show todos'");
        console.log("- Get todo: 'show todo [id]'");
        console.log("- Update todo: 'update todo [id] to [new title]'");
        console.log("- Delete todo: 'delete todo [id]'");
        console.log("\nInformation Queries:");
        console.log("- Weather: 'what's the weather in [city]'");
        console.log("- GitHub: 'show github profile for [username]'");
        console.log("- Twitter: 'show twitter profile for [username]'");
        console.log("- Country: 'tell me about [country]'");
        console.log("\n(Type 'exit', 'quit', or 'bye' to end the program)\n");

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