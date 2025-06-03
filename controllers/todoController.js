const Todo = require('../models/Todo');

// Create a new todo
const createTodo = async (title) => {
    try {
        const todo = new Todo({ title });
        await todo.save();
        return {
            success: true,
            data: todo,
            message: `Added new todo: ${todo.title}`
        };
    } catch (error) {
        console.error('Error creating todo:', error);
        return {
            success: false,
            error: error.message,
            message: 'Failed to create todo'
        };
    }
};

// Read all todos
const getAllTodos = async () => {
    try {
        const todos = await Todo.find({}).sort({ createdAt: -1 });
        
        if (todos.length === 0) {
            return {
                success: true,
                data: [],
                message: "No todos found."
            };
        }

        return {
            success: true,
            data: todos,
            message: "Todos retrieved successfully"
        };
    } catch (error) {
        console.error('Error fetching todos:', error);
        return {
            success: false,
            error: error.message,
            message: 'Failed to fetch todos'
        };
    }
};

// Read a single todo by ID
const getTodoById = async (id) => {
    try {
        const todo = await Todo.findById(id);
        
        if (!todo) {
            return {
                success: false,
                message: 'Todo not found'
            };
        }

        return {
            success: true,
            data: todo,
            message: 'Todo retrieved successfully'
        };
    } catch (error) {
        console.error('Error fetching todo:', error);
        return {
            success: false,
            error: error.message,
            message: 'Failed to fetch todo'
        };
    }
};

// Update a todo
const updateTodo = async (id, title) => {
    try {
        const todo = await Todo.findByIdAndUpdate(
            id,
            { title },
            { new: true, runValidators: true }
        );

        if (!todo) {
            return {
                success: false,
                message: 'Todo not found'
            };
        }

        return {
            success: true,
            data: todo,
            message: `Updated todo: ${todo.title}`
        };
    } catch (error) {
        console.error('Error updating todo:', error);
        return {
            success: false,
            error: error.message,
            message: 'Failed to update todo'
        };
    }
};

// Delete a todo
const deleteTodo = async (id) => {
    try {
        const todo = await Todo.findByIdAndDelete(id);
        
        if (!todo) {
            return {
                success: false,
                message: 'Todo not found'
            };
        }

        return {
            success: true,
            message: `Deleted todo: ${todo.title}`
        };
    } catch (error) {
        console.error('Error deleting todo:', error);
        return {
            success: false,
            error: error.message,
            message: 'Failed to delete todo'
        };
    }
};

module.exports = {
    createTodo,
    getAllTodos,
    getTodoById,
    updateTodo,
    deleteTodo
}; 