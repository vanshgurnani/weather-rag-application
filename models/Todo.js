const mongoose = require('mongoose');

const PRIORITY_LEVELS = ['low', 'medium', 'high'];

const todoSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true
    },
    completed: {
        type: Boolean,
        default: false
    },
    priority: {
        type: String,
        enum: PRIORITY_LEVELS,
        default: 'medium',
        lowercase: true
    },
    assignee: {
        type: String,
        trim: true,
        default: 'Unassigned'
    }
}, {
    timestamps: true // This automatically adds createdAt and updatedAt fields
});

// Add a method to format the todo for display
todoSchema.methods.formatForDisplay = function() {
    const prioritySymbol = {
        high: '🔴',
        medium: '🟡',
        low: '🟢'
    };
    return `[${this._id}] ${prioritySymbol[this.priority]} ${this.title} (${this.completed ? 'Completed' : 'Pending'}) - Assigned to: ${this.assignee}`;
};

module.exports = {
    Todo: mongoose.model('Todo', todoSchema),
    PRIORITY_LEVELS
}; 