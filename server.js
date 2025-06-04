const readline = require('readline');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { connectDB, isConnected } = require('./config/database');
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
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const SYSTEM_PROMPT = `You are a versatile AI assistant capable of handling a wide range of tasks and queries. You should maintain conversation context and provide helpful follow-ups.

CONVERSATION STYLE:
1. Always maintain context from previous messages
2. Provide helpful follow-up suggestions
3. Ask clarifying questions when needed
4. Acknowledge user's input before proceeding
5. Use natural, conversational language
6. Offer relevant suggestions based on previous interactions

For example:
User: "show me tasks for vansh"
Assistant: "I found 5 tasks assigned to Vansh. Would you like to see them filtered by priority or date? Or shall I show them all?"

User: "show high priority ones"
Assistant: "Here are Vansh's high priority tasks. I can also show you tasks due today or help you add new tasks for Vansh. What would you prefer?"

CORE CAPABILITIES:
1. General Knowledge & Assistance
   Answer questions on any topic
   Provide explanations and tutorials
   Help with problem-solving
   Give recommendations and advice
   Assist with planning and organization

2. Technical Support
   Programming help and code review
   System troubleshooting
   Technology recommendations
   Best practices and patterns
   Architecture discussions

3. Data Analysis & Research
   Data interpretation
   Trend analysis
   Research summaries
   Pattern recognition
   Statistical insights

4. Creative Tasks
   Brainstorming ideas
   Content suggestions
   Creative writing
   Design thinking
   Problem-solving approaches

NATURAL LANGUAGE UNDERSTANDING:
Understand and respond to commands like:
- "add a new task to buy groceries"
- "mark the shopping task as done"
- "show me all high priority tasks"
- "show tasks from yesterday"
- "delete the shopping task"
- "update the grocery task to high priority"
- "what tasks do I have today"

AVAILABLE TOOLS (Use when relevant):
1. Task Management:
   createTodo: Create new tasks with priorities
   getAllTodos: List and search todos (supports filtering by keywords, priority, and dateFilter)
   updateTodo: Modify existing tasks (can use either id or title to identify the task)
   deleteTodo: Remove tasks (can use either id or title to identify the task)
   toggleComplete: Mark tasks as done (can use either id or title)

2. Information Services:
   getCurrentWeather: Get weather updates
   getGithubProfile: GitHub user information
   getTwitterProfile: Twitter user details
   getCountryInfo: Country data and facts

RESPONSE FORMAT:
You must respond with a raw JSON object (no code blocks, no markdown) in one of these formats:

For tool usage with conversation:
{
    "type": "tool_calling",
    "function": "functionName",
    "parameters": {
        // Parameters as needed
    },
    "followUp": "A natural follow-up question or suggestion based on the context"
}

For conversational responses:
{
    "type": "conversation",
    "message": "Your detailed response here",
    "followUp": "A natural follow-up question or suggestion based on the context"
}

EXAMPLES:
User: "show tasks for vansh"
Response: {
    "type": "tool_calling",
    "function": "getAllTodos",
    "parameters": {
        "assignee": "vansh"
    },
    "followUp": "Would you like to see these filtered by priority or date? I can also help you add new tasks for Vansh."
}

User: "show high priority tasks"
Response: {
    "type": "tool_calling",
    "function": "getAllTodos",
    "parameters": {
        "priority": "high"
    },
    "followUp": "I can also show you tasks due today or help you create new high-priority tasks. What would you prefer?"
}

IMPORTANT: DO NOT wrap your response in code blocks or markdown. Return only the raw JSON object.

Remember: While you have specific tools available, you're not limited to them. Use your broad knowledge base to provide comprehensive assistance, and integrate tools when they enhance your response.`;

// Available functions that can be called by the AI
const availableFunctions = {
    getCurrentWeather: weatherController.getCurrentWeather,
    getGithubProfile: githubController.getGithubProfile,
    getTwitterProfile: socialController.getTwitterProfile,
    getCountryInfo: countryController.getCountryInfo,
    createTodo: (params) => {
        // Ensure title is a string and has trim method
        const title = String(params.title || '');
        const priority = String(params.priority || 'medium');
        const assignee = String(params.assignee || 'Unassigned');
        return todoController.createTodo(title, priority, assignee);
    },
    getAllTodos: (params) => {
        const { searchTerm = '', priority = '', dateFilter = '', assignee = '' } = params;
        return todoController.getAllTodos(searchTerm, priority, dateFilter, assignee);
    },
    updateTodo: (params) => {
        const { identifier, newTitle, priority, assignee } = params;
        return todoController.updateTodo(identifier, newTitle, priority, assignee);
    },
    toggleComplete: (params) => {
        const { identifier } = params;
        return todoController.toggleComplete(identifier);
    },
    deleteTodo: (params) => {
        const { identifier } = params;
        return todoController.deleteTodo(identifier);
    },
    reassignTodo: (params) => {
        const { identifier, newAssignee } = params;
        return todoController.reassignTodo(identifier, newAssignee);
    },
    bulkUpdateAssignee: (params) => {
        const { newAssignee, filter = {} } = params;
        return todoController.bulkUpdateAssignee(newAssignee, filter);
    }
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

// Add this helper function at the top with other utility functions
const safeString = (value) => {
    return value ? String(value).trim() : '';
};

// Main function
async function aiAssistant(userQuery) {
    try {
        // Validate input
        if (!userQuery || typeof userQuery !== 'string') {
            return "Please provide a valid query.";
        }

        const cleanQuery = safeString(userQuery);
        if (!cleanQuery) {
            return "Please provide a non-empty query.";
        }

        // Check database connection before processing
        if (mongoose.connection.readyState !== 1) {
            // Try to reconnect if not connected
            await connectDB();
            if (mongoose.connection.readyState !== 1) {
                return "The database is currently unavailable. Please try again in a few moments.";
            }
        }
        
        const fullPrompt = `${SYSTEM_PROMPT}\nUser query: "${cleanQuery}"`;
        
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

        let response = result.response.text();
        response = safeString(response);
        console.log("response: ",response);

        // Clean any remaining markdown or code block indicators
        response = response.replace(/```json|```/g, '').trim();

        try {
            // Basic validation that response starts with { and ends with }
            if (!response.startsWith('{') || !response.endsWith('}')) {
                console.error('Invalid response format from AI service:', response);
                return "I'm having trouble processing your request. Please try again in a moment.";
            }
            
            const action = JSON.parse(response);
            
            // Handle the AI response
            const aiResponse = await handleAIResponse(action);
            return aiResponse;
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

const system_internal_print_prefix = '--------'

// Handle the AI response
const handleAIResponse = async (action) => {
    try {
        // Handle conversation type responses
        if (action.type === "conversation") {
            console.log(system_internal_print_prefix , 'BOT: fullow up question')
            return action.message + (action.followUp ? `\n\n${action.followUp}` : '');
        }
        
        // Handle tool calling type responses
        if (action.type === "tool_calling" && action.function && action.parameters) {
            console.log(system_internal_print_prefix , 'BOT: tool calling:', action.function, 'params:', action.parameters)
            if (availableFunctions[action.function]) {
                const result = await availableFunctions[action.function](action.parameters);
                
                // Handle special cases for todos display
                if (action.function === 'getAllTodos' && result.success && result.data) {
                    if (result.data.length === 0) {
                        return result.message + (action.followUp ? `\n\n${action.followUp}` : '');
                    }
                    const formattedTodos = result.data.map(formatTodo).join('\n');
                    return `${result.message}\n${formattedTodos}${action.followUp ? `\n\n${action.followUp}` : ''}`;
                }
                
                // Return regular response with follow-up
                return result.message + (action.followUp ? `\n\n${action.followUp}` : '');
            } else {
                return "I understand what you want to do, but I don't have the right tool for that. Is there something else I can help with?";
            }
        }

        return "I'm not sure how to help with that. Could you rephrase your request?";
    } catch (error) {
        console.error('Error handling AI response:', error);
        return "Something went wrong. Please try again.";
    }
};

// Main CLI loop
async function main() {
    let dbConnected = false;
    
    try {
        // Connect to MongoDB with retry logic
        console.log("Connecting to database...");
        await connectDB();
        dbConnected = true;
        
        console.log("Welcome to the Information Assistant!");

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const prompt = () => {
            rl.question('You: ', async (query) => {
                if (query.toLowerCase() === 'exit' || query.toLowerCase() === 'quit' || query.toLowerCase() === 'bye') {
                    console.log('\nGoodbye!');
                    rl.close();
                    process.exit(0);
                    return;
                }

                if (query) {
                    const response = await aiAssistant(query);
                    console.log('\nAssistant:', response, '\n');
                }
                prompt();
            });
        };

        prompt();
    } catch (error) {
        console.error('Application error:', error);
        if (!dbConnected) {
            console.error('Could not establish database connection. Please check your connection and try again.');
        }
        process.exit(1);
    }
}

// Start the CLI
main().catch(console.error); 