const mongoose = require('mongoose');

const todoSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true
    },
    completed: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true // This automatically adds createdAt and updatedAt fields
});

// Add a method to format the todo for display
todoSchema.methods.formatForDisplay = function() {
    return `[${this._id}] ${this.title} (${this.completed ? 'Completed' : 'Pending'})`;
};

module.exports = mongoose.model('Todo', todoSchema); 