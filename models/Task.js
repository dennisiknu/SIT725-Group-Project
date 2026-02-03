const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },

  description: {
    type: String,
    default: ''
  },

  status: {
    type: String,
    default: 'To Do'
  },

  priority: {
    type: String,
    default: 'Medium'
  },

  dueDate: {
    type: Date
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Task', taskSchema);
