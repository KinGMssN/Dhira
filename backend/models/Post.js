/**
 * models/Post.js
 * Mongoose schema for blog posts
 */

'use strict';

const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [300, 'Title cannot exceed 300 characters'],
    },
    body: {
      type: String,
      required: [true, 'Body content is required'],
    },
    excerpt: {
      type: String,
      trim: true,
      maxlength: [500, 'Excerpt cannot exceed 500 characters'],
      default: '',
    },
    tag: {
      type: String,
      trim: true,
      maxlength: [80, 'Tag cannot exceed 80 characters'],
      default: '',
    },
    category: {
      type: String,
      required: true,
      enum: {
        values: ['personal', 'thoughts', 'book'],
        message: 'Category must be personal, thoughts, or book',
      },
      default: 'personal',
    },
    published: {
      type: Boolean,
      default: false,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // adds createdAt + updatedAt automatically
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Index for fast public queries (published posts by category)
PostSchema.index({ category: 1, published: 1, date: -1 });
// Index for fast admin queries (all posts sorted by date)
PostSchema.index({ date: -1 });

module.exports = mongoose.model('Post', PostSchema);
