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

// Get all todos with optional filters
const getAllTodos = async (searchTerm = '', priority = '', dateFilter = '', assignee = '') => {
    try {
        // Build query object
        const query = {};
        
        // Add title/search term if provided (optional)
        if (searchTerm && searchTerm.trim().length > 0) {
            // Make the title search flexible by searching for words within the title
            query.title = new RegExp(searchTerm.trim().split(/\s+/).join('|'), 'i');
        }
        
        // Add priority filter if provided (optional)
        if (priority && priority.trim().length > 0) {
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

        // Add assignee filter if provided (optional)
        if (assignee && assignee.trim().length > 0) {
            // Case-insensitive match for assignee
            query.assignee = new RegExp(`^${assignee.trim()}$`, 'i');
        }

        // Add date filter if provided (optional)
        if (dateFilter && dateFilter.trim().length > 0) {
            const now = new Date();
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

            switch(dateFilter.toLowerCase().trim()) {
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
                default:
                    // If dateFilter is provided but invalid, ignore it instead of returning error
                    console.log(`Invalid date filter '${dateFilter}' provided, showing all dates`);
                    break;
            }
        }

        // Sort by priority (high → medium → low) and then by creation date
        const todos = await Todo.find(query).sort({ 
            priority: -1, // This will sort high → medium → low
            createdAt: -1 
        });
        
        if (todos.length === 0) {
            let message = "No todos found";
            if (searchTerm && searchTerm.trim()) message += ` matching '${searchTerm}'`;
            if (priority && priority.trim()) message += ` with ${priority} priority`;
            if (assignee && assignee.trim()) message += ` assigned to ${assignee}`;
            if (dateFilter && dateFilter.trim()) message += ` for ${dateFilter}`;
            return {
                success: true,
                data: [],
                message: message
            };
        }

        let message = `Found ${todos.length} ${todos.length === 1 ? 'todo' : 'todos'}`;
        if (searchTerm && searchTerm.trim()) message += ` matching '${searchTerm}'`;
        if (priority && priority.trim()) message += ` with ${priority} priority`;
        if (assignee && assignee.trim()) message += ` assigned to ${assignee}`;
        if (dateFilter && dateFilter.trim()) message += ` for ${dateFilter}`;

        return {
            success: true,
            data: todos,
            message: message
        };
    } catch (error) {
        return handleControllerError(error, 'getAll');
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

// Update todo by title or ID
const updateTodo = async (identifier, newTitle, priority, assignee) => {
    try {
        if (!identifier || !newTitle || identifier.trim().length === 0 || newTitle.trim().length === 0) {
            return {
                success: false,
                message: "Please provide both the identifier (title or ID) and new title."
            };
        }

        let todo;
        // Check if identifier is a valid MongoDB ObjectId
        if (/^[0-9a-fA-F]{24}$/.test(identifier)) {
            todo = await Todo.findById(identifier);
        } else {
            // Find by title if not an ObjectId
            const titleRegex = new RegExp(`^${identifier.trim()}$`, 'i');
            todo = await Todo.findOne({ title: titleRegex }).sort({ createdAt: -1 });
        }

        if (!todo) {
            return {
                success: false,
                message: `No todo found with ${/^[0-9a-fA-F]{24}$/.test(identifier) ? 'ID' : 'title'} '${identifier}'`
            };
        }

        const oldTitle = todo.title;
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

// Toggle todo completion status by title or ID
const toggleComplete = async (identifier) => {
    try {
        let todo;
        // Check if identifier is a valid MongoDB ObjectId
        if (/^[0-9a-fA-F]{24}$/.test(identifier)) {
            todo = await Todo.findById(identifier);
        } else {
            // Find by title if not an ObjectId
            const titleRegex = new RegExp(`^${identifier.trim()}$`, 'i');
            todo = await Todo.findOne({ title: titleRegex }).sort({ createdAt: -1 });
        }

        if (!todo) {
            return {
                success: false,
                message: `No todo found with ${/^[0-9a-fA-F]{24}$/.test(identifier) ? 'ID' : 'title'} '${identifier}'`
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

// Delete todo by title or ID
const deleteTodo = async (identifier) => {
    try {
        let todo;
        // Check if identifier is a valid MongoDB ObjectId
        if (/^[0-9a-fA-F]{24}$/.test(identifier)) {
            todo = await Todo.findByIdAndDelete(identifier);
        } else {
            // Find and delete by title if not an ObjectId
            const titleRegex = new RegExp(`^${identifier.trim()}$`, 'i');
            todo = await Todo.findOneAndDelete({ title: titleRegex }).sort({ createdAt: -1 });
        }

        if (!todo) {
            return {
                success: false,
                message: `No todo found with ${/^[0-9a-fA-F]{24}$/.test(identifier) ? 'ID' : 'title'} '${identifier}'`
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

// Bulk update assignee for all or filtered todos
const bulkUpdateAssignee = async (newAssignee, filter = {}) => {
    try {
        const result = await Todo.updateMany(
            filter,
            { $set: { assignee: newAssignee.trim() } }
        );

        return {
            success: true,
            message: `Updated ${result.modifiedCount} todos to be assigned to ${newAssignee}`
        };
    } catch (error) {
        return handleControllerError(error, 'bulkUpdate');
    }
};

module.exports = {
    createTodo,
    getAllTodos,
    getTodoById,
    updateTodo,
    toggleComplete,
    deleteTodo,
    reassignTodo,
    bulkUpdateAssignee
}; 