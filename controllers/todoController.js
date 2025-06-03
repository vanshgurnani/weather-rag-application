const Todo = require('../models/Todo');

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
const createTodo = async (title) => {
    try {
        if (!title || title.trim().length === 0) {
            return {
                success: false,
                message: "Please provide a title for your todo."
            };
        }

        const todo = new Todo({
            title: title.trim(),
            completed: false
        });
        await todo.save();
        return {
            success: true,
            data: todo,
            message: `Added: ${title}`
        };
    } catch (error) {
        return handleControllerError(error, 'create');
    }
};

// Get all todos
const getAllTodos = async () => {
    try {
        const todos = await Todo.find({}).sort({ createdAt: -1 });
        
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

// Update todo
const updateTodo = async (id, title) => {
    try {
        if (!title || title.trim().length === 0) {
            return {
                success: false,
                message: "Please provide a new title for the todo."
            };
        }

        const todo = await Todo.findByIdAndUpdate(
            id,
            { title: title.trim() },
            { new: true }
        );
        if (!todo) {
            return {
                success: false,
                message: "That todo doesn't exist. Please check the ID and try again."
            };
        }
        return {
            success: true,
            data: todo,
            message: `Updated to: ${title}`
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

module.exports = {
    createTodo,
    getAllTodos,
    getTodoById,
    updateTodo,
    toggleComplete,
    deleteTodo
}; 