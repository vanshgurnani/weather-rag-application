const readlineSync = require('readline-sync');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const connectDB = require('./config/database');
const todoController = require('./controllers/todoController');
const weatherController = require('./controllers/weatherController');
const githubController = require('./controllers/githubController');
const socialController = require('./controllers/socialController');
const countryController = require('./controllers/countryController');
const mongoose = require('mongoose');
require('dotenv').config();

// Configure Gemini with retry logic
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // Changed to gemini-pro which is more stable

// Available functions that can be called by the AI
const availableFunctions = {
    getCurrentWeather: weatherController.getCurrentWeather,
    getGithubProfile: githubController.getGithubProfile,
    getTwitterProfile: socialController.getTwitterProfile,
    getCountryInfo: countryController.getCountryInfo,
    createTodo: todoController.createTodo,
    getAllTodos: todoController.getAllTodos,
    searchTodos: todoController.searchTodos,
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
    
    // Check for specific error types
    if (error.name === 'MongooseServerSelectionError' || error.message?.includes('503')) {
        return "I'm having trouble connecting to the database. Please try again in a few moments. If the problem persists, check your internet connection or contact support.";
    }
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        return "The service is temporarily unavailable. Please try again in a few moments.";
    }
    
    // Return user-friendly message
    return "I couldn't process that request. Please try again or rephrase your command.";
};

// Add retry logic for AI calls
async function retryAICall(fn, maxRetries = 3, delay = 2000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (attempt === maxRetries) throw error;
            
            console.log(`AI service attempt ${attempt} failed. Retrying in ${delay/1000} seconds...`);
            if (error.message?.includes('503')) {
                console.log('Google AI service temporarily unavailable (503 error). Retrying...');
            }
            
            await new Promise(resolve => setTimeout(resolve, delay));
            // Increase delay for next attempt
            delay *= 2;
        }
    }
}

// Unified Assistant
async function aiAssistant(userQuery) {
    try {
        // Check database connection before processing
        if (mongoose.connection.readyState !== 1) {
            return "The system is currently reconnecting to the database. Please try again in a few moments.";
        }
        
        const SYSTEM_PROMPT = `
You are an AI Assistant that helps manage tasks, weather info, and other useful information. 
Understand natural language and convert it into appropriate function calls.
If you're not sure about something, respond with a conversation message.
If a tool fails, respond naturally based on context.

When users express appreciation (e.g., "thanks", "good job", "nice", "ok", "perfect"), respond warmly and provide a helpful suggestion:
{
    "type": "conversation",
    "message": "I'm glad I could help! 😊 Here's something else you might find useful: [relevant suggestion]. Would you like to try that?"
}

Examples of appreciation responses:
User: "ok great"
Response: {
    "type": "conversation",
    "message": "Excellent! 😊 Since you're working with todos, you might want to try searching for specific priorities. For example, try asking 'show me all high priority tasks'."
}

User: "thanks"
Response: {
    "type": "conversation",
    "message": "You're welcome! 💫 Did you know you can also get weather updates? Try asking 'what's the weather in [your city]'."
}

User: "nice work"
Response: {
    "type": "conversation",
    "message": "Thank you! 🌟 Here's a pro tip: You can update task priorities by saying 'change [task] to high priority'. Would you like to try that?"
}

RESPONSE FORMAT:
You must respond with a JSON object in one of these two formats:

1. For tool calls:
{
    "type": "tool_calling",
    "function": "functionName",
    "parameters": {
        "param1": "value1",
        "param2": "value2"
    }
}

2. For conversations:
{
    "type": "conversation",
    "message": "Your helpful response here"
}

When users ask about your capabilities (e.g., "what can you do?", "help", "show me features"), respond with a conversation message explaining your features:
{
    "type": "conversation",
    "message": "I can help you with several things:\\n\\n1. Todo Management:\\n- Create todos with priorities (high/medium/low)\\n- Search and filter todos\\n- Update and delete todos\\n- Mark todos as complete/incomplete\\n\\n2. Information Services:\\n- Get weather information for any city\\n- Look up GitHub profiles\\n- Check Twitter profiles\\n- Get information about countries\\n\\nWhat would you like help with?"
}

Available Tools:

1. Todo Management:
- createTodo(title, priority?) 
  → Create todo with optional priority (low/medium/high)
  → Examples: "add a high priority task to buy groceries", "create todo: call mom"

- searchTodos(searchTerm?, priority?)
  → Search by text and/or priority
  → Examples: "show high priority todos", "find tasks about shopping"

- getAllTodos()
  → List all todos sorted by priority
  → Examples: "show all tasks", "list my todos"

- updateTodo(oldTitle, newTitle, priority?)
  → Update todo title and optional priority
  → Examples: "change buy milk to buy cheese", "update homework to math homework with high priority"

- toggleComplete(id)
  → Mark todo as done/undone
  → Examples: "mark task 123 as done", "complete todo 456"

- deleteTodo(id)
  → Remove a todo
  → Examples: "delete task 123", "remove todo 456"

2. Information Services:
- getCurrentWeather(city)
  → Get weather for a city
  → Examples: "weather in London", "what's the temperature in Paris"

- getGithubProfile(username)
  → Get GitHub user info
  → Examples: "show github profile for torvalds", "github info for microsoft"

- getTwitterProfile(username)
  → Get Twitter user info
  → Examples: "show twitter profile for elonmusk", "twitter info for jack"

- getCountryInfo(country)
  → Get country information
  → Examples: "tell me about Japan", "info about France"

Example Queries and Responses:

User: "what can you help me with?"
Response: {
    "type": "conversation",
    "message": "I can help you with several things:\\n\\n1. Todo Management:\\n- Create todos with priorities (high/medium/low)\\n- Search and filter todos\\n- Update and delete todos\\n- Mark todos as complete/incomplete\\n\\n2. Information Services:\\n- Get weather information for any city\\n- Look up GitHub profiles\\n- Check Twitter profiles\\n- Get information about countries\\n\\nWhat would you like help with?"
}

User: "how do I use priorities?"
Response: {
    "type": "conversation",
    "message": "You can set priorities (high/medium/low) when creating or updating todos. For example:\\n- 'add high priority todo buy groceries'\\n- 'create low priority task read book'\\n- 'update homework to math homework with high priority'\\n\\nWould you like to create a todo with a priority now?"
}

User: "add a high priority todo to buy groceries"
Response: {
    "type": "tool_calling",
    "function": "createTodo",
    "parameters": {
        "title": "buy groceries",
        "priority": "high"
    }
}

Remember:
1. Always return a valid JSON object
2. Use "type": "conversation" for help, explanations, and dialogue
3. Use "type": "tool_calling" when performing actions
4. Be helpful and provide examples when users ask for help
5. Understand variations of help queries like:
   - "what can you do?"
   - "help me"
   - "show me features"
   - "what are my options?"
   - "how does this work?"`;

        const fullPrompt = `${SYSTEM_PROMPT}\nUser query: "${userQuery}"`;
        
        // Use retry logic for AI generation
        const result = await retryAICall(async () => {
            try {
                return await model.generateContent(fullPrompt);
            } catch (error) {
                if (error.message?.includes('503')) {
                    throw new Error('Google AI service temporarily unavailable (503). Please try again in a moment.');
                }
                throw error;
            }
        });

        let response = result.response.text().trim();
        
        // Clean the response of any markdown or code block indicators
        response = response.replace(/\`\`\`json|\`\`\`/g, '').trim();
        
        try {
            // Basic validation that response starts with { and ends with }
            if (!response.startsWith('{') || !response.endsWith('}')) {
                console.error('Invalid response format from AI service');
                return "I'm having trouble processing your request. Please try again in a moment.";
            }
            
            const action = JSON.parse(response);
            
            // Handle conversation type responses
            if (action.type === "conversation") {
                return action.message;
            }
            
            // Handle tool calling type responses
            if (action.type === "tool_calling" && action.function && action.parameters) {
                if (availableFunctions[action.function]) {
                    const result = await availableFunctions[action.function](...Object.values(action.parameters));
                    
                    // Special handling for getAllTodos and searchTodos
                    if ((action.function === 'getAllTodos' || action.function === 'searchTodos') && result.success && result.data) {
                        if (result.data.length === 0) {
                            return result.message;
                        }
                        const formattedTodos = result.data.map(formatTodo).join('\n');
                        return `${result.message}\n${formattedTodos}`;
                    }
                    
                    // Special handling for getTodoById
                    if (action.function === 'getTodoById' && result.success && result.data) {
                        return formatTodo(result.data);
                    }
                    
                    return result.message;
                } else {
                    return "I understand what you want to do, but I don't have the right tool for that. Is there something else I can help with?";
                }
            }
            
            return "I'm not sure how to help with that. Could you rephrase your request?";
        } catch (parseError) {
            console.error('Error parsing AI response:', parseError);
            return "I'm having trouble understanding my own response. Please try again.";
        }
    } catch (error) {
        console.error('AI Service Error:', error);
        if (error.message?.includes('503')) {
            return "The AI service is temporarily unavailable. Please try again in a few moments.";
        }
        return handleError(error, 'AI processing');
    }
}

// Main CLI loop
async function main() {
    let isConnected = false;
    
    try {
        // Connect to MongoDB with retry logic
        console.log("Connecting to database...");
        await connectDB();
        isConnected = true;
        
        console.log("Welcome to the Information Assistant!");

        while (true) {
            // Check connection status
            if (!isConnected && mongoose.connection.readyState !== 1) {
                console.log("Reconnecting to database...");
                await connectDB();
                isConnected = true;
            }
            
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
        if (!isConnected) {
            console.error('Could not establish database connection. Please check your connection and try again.');
        }
        process.exit(1);
    }
}

// Start the CLI
main().catch(console.error); 