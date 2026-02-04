const mongoose = require('mongoose');

const TemplateSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },

    // Thesewill just mirror task fields
    title: { type: String, trim: true, maxlength: 120 },
    category: { type: String, trim: true, default: 'General', maxlength: 40 },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },
    dueDate: { type: Date }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Template', TemplateSchema);
