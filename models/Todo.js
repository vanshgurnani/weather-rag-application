const mongoose = require('mongoose');

const todoSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    }
}, {
    timestamps: true // This automatically adds createdAt and updatedAt fields
});

// Add a method to format the todo for display
todoSchema.methods.formatForDisplay = function() {
    return `[${this._id}] ${this.title} (Created: ${new Date(this.createdAt).toLocaleString()})`;
};

module.exports = mongoose.model('Todo', todoSchema); 