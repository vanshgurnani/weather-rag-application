const { Todo, PRIORITY_LEVELS } = require('../models/Todo');

// Helper function for error handling
const handleControllerError = (error, context) => {
    // Log technical error for debugging
    console.error(`Todo error (${context}):`, error);
    
    // Return user-friendly error
    if (error.name === 'CastError' && error.kind === 'ObjectId') {
        return {
            success: false,
            message: "That todo doesn't exist. Please check the ID and try again."
        };
    }
    
    if (error.name === 'ValidationError') {
        if (error.errors.priority) {
            return {
                success: false,
                message: `Invalid priority. Please use one of: ${PRIORITY_LEVELS.join(', ')}`
            };
        }
        return {
            success: false,
            message: "Please provide a valid title for the todo."
        };
    }
    
    return {
        success: false,
        message: "Something went wrong. Please try again."
    };
};

// Create a new todo
const createTodo = async (title, priority = 'medium', assignee = 'Unassigned') => {
    try {
        if (!title || title.trim().length === 0) {
            return {
                success: false,
                message: "Please provide a title for your todo."
            };
        }

        // Validate priority - handle null/undefined case
        const normalizedPriority = (priority || 'medium').toLowerCase();
        if (!PRIORITY_LEVELS.includes(normalizedPriority)) {
            return {
                success: false,
                message: `Invalid priority. Please use one of: ${PRIORITY_LEVELS.join(', ')}`
            };
        }

        const todo = new Todo({
            title: title.trim(),
            priority: normalizedPriority,
            completed: false,
            assignee: assignee.trim()
        });
        await todo.save();
        return {
            success: true,
            data: todo,
            message: `Added: ${title} (${normalizedPriority} priority) - Assigned to: ${assignee}`
        };
    } catch (error) {
        return handleControllerError(error, 'create');
    }
};

// Get all todos
const getAllTodos = async () => {
    try {
        // Sort by priority (high → medium → low) and then by creation date
        const todos = await Todo.find({}).sort({ 
            priority: -1, // This will sort high → medium → low
            createdAt: -1 
        });
        
        if (todos.length === 0) {
            return {
                success: true,
                data: [],
                message: "You don't have any todos yet. Try adding some!"
            };
        }

        return {
            success: true,
            data: todos,
            message: `Found ${todos.length} ${todos.length === 1 ? 'todo' : 'todos'}`
        };
    } catch (error) {
        return handleControllerError(error, 'getAll');
    }
};

// Search todos by title, priority, and/or date
const searchTodos = async (searchTerm, priority, dateFilter) => {
    try {
        // Build search query
        const query = {};
        
        // Add title search if provided
        if (searchTerm && searchTerm.trim().length > 0) {
            // Make the title search more flexible by searching for words within the title
            query.title = new RegExp(searchTerm.trim().split(/\s+/).join('|'), 'i');
        }
        
        // Add priority filter if provided
        if (priority) {
            // Normalize priority input by removing extra words and spaces
            const normalizedPriority = priority.toLowerCase().trim().replace(/\s+priority$/, '');
            if (!PRIORITY_LEVELS.includes(normalizedPriority)) {
                return {
                    success: false,
                    message: `Invalid priority. Please use one of: ${PRIORITY_LEVELS.join(', ')}`
                };
            }
            query.priority = normalizedPriority;
        }

        // Add date filter if provided
        if (dateFilter) {
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

            switch(dateFilter.toLowerCase()) {
                case 'today':
                    query.createdAt = {
                        $gte: startOfToday,
                        $lt: startOfTomorrow
                    };
                    break;
                case 'yesterday':
                    query.createdAt = {
                        $gte: startOfYesterday,
                        $lt: startOfToday
                    };
                    break;
                // Add more date filters as needed
            }
        }

        // If no search criteria provided, return all todos
        if (Object.keys(query).length === 0) {
            return getAllTodos();
        }

        const todos = await Todo.find(query).sort({ 
            priority: -1,
            createdAt: -1 
        });
        
        if (todos.length === 0) {
            let message = "No todos found";
            if (searchTerm) message += ` matching '${searchTerm}'`;
            if (priority) message += ` with ${priority} priority`;
            if (dateFilter) message += ` for ${dateFilter}`;
            return {
                success: true,
                data: [],
                message: message
            };
        }

        let message = `Found ${todos.length} ${todos.length === 1 ? 'todo' : 'todos'}`;
        if (searchTerm) message += ` matching '${searchTerm}'`;
        if (priority) message += ` with ${priority} priority`;
        if (dateFilter) message += ` for ${dateFilter}`;

        return {
            success: true,
            data: todos,
            message: message
        };
    } catch (error) {
        return handleControllerError(error, 'search');
    }
};

// Get todo by ID
const getTodoById = async (id) => {
    try {
        const todo = await Todo.findById(id);
        if (!todo) {
            return {
                success: false,
                message: "That todo doesn't exist. Please check the ID and try again."
            };
        }
        return {
            success: true,
            data: todo,
            message: todo.title
        };
    } catch (error) {
        return handleControllerError(error, 'getById');
    }
};

// Update todo by title
const updateTodo = async (oldTitle, newTitle, priority, assignee) => {
    try {
        if (!oldTitle || !newTitle || oldTitle.trim().length === 0 || newTitle.trim().length === 0) {
            return {
                success: false,
                message: "Please provide both the old and new title."
            };
        }

        // Find the most recent todo with the old title
        const oldTitleRegex = new RegExp(`^${oldTitle.trim()}$`, 'i');
        const todo = await Todo.findOne({ title: oldTitleRegex }).sort({ createdAt: -1 });

        if (!todo) {
            return {
                success: false,
                message: `No todo found with title '${oldTitle}'`
            };
        }

        // Update the title and priority if provided
        todo.title = newTitle.trim();
        if (priority) {
            if (!PRIORITY_LEVELS.includes(priority.toLowerCase())) {
                return {
                    success: false,
                    message: `Invalid priority. Please use one of: ${PRIORITY_LEVELS.join(', ')}`
                };
            }
            todo.priority = priority.toLowerCase();
        }
        if (assignee) {
            todo.assignee = assignee.trim();
        }
        await todo.save();

        return {
            success: true,
            data: todo,
            message: `Updated '${oldTitle}' to '${newTitle}'${priority ? ` with ${priority} priority` : ''}${assignee ? ` - Assigned to: ${assignee}` : ''}`
        };
    } catch (error) {
        return handleControllerError(error, 'update');
    }
};

// Toggle todo completion status
const toggleComplete = async (id) => {
    try {
        const todo = await Todo.findById(id);
        if (!todo) {
            return {
                success: false,
                message: "That todo doesn't exist. Please check the ID and try again."
            };
        }

        todo.completed = !todo.completed;
        await todo.save();

        return {
            success: true,
            data: todo,
            message: `${todo.title} is now ${todo.completed ? 'completed' : 'pending'}`
        };
    } catch (error) {
        return handleControllerError(error, 'toggle');
    }
};

// Delete todo
const deleteTodo = async (id) => {
    try {
        const todo = await Todo.findByIdAndDelete(id);
        if (!todo) {
            return {
                success: false,
                message: "That todo doesn't exist. Please check the ID and try again."
            };
        }
        return {
            success: true,
            data: todo,
            message: `Deleted: ${todo.title}`
        };
    } catch (error) {
        return handleControllerError(error, 'delete');
    }
};

// Add a new function to reassign todos
const reassignTodo = async (id, newAssignee) => {
    try {
        const todo = await Todo.findById(id);
        if (!todo) {
            return {
                success: false,
                message: "That todo doesn't exist. Please check the ID and try again."
            };
        }

        const oldAssignee = todo.assignee;
        todo.assignee = newAssignee.trim();
        await todo.save();

        return {
            success: true,
            data: todo,
            message: `Reassigned '${todo.title}' from ${oldAssignee} to ${newAssignee}`
        };
    } catch (error) {
        return handleControllerError(error, 'reassign');
    }
};

module.exports = {
    createTodo,
    getAllTodos,
    searchTodos,
    getTodoById,
    updateTodo,
    toggleComplete,
    deleteTodo,
    reassignTodo
}; 