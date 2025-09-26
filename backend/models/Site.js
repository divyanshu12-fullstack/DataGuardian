import mongoose from "mongoose";

const aiSummarySchema = new mongoose.Schema({
  success: { type: Boolean, default: false },
  summary: {
    whatTheyCollect: [String],
    whoTheyShareWith: [String],
    howLongTheyKeep: String,
    keyRisks: [String],
    trackerBreakdown: [String]
  },
  trackerCount: { type: Number, default: 0 },
  trackerDetails: [{
    domain: String,
    name: String,
    category: String,
    company: String,
    dataTypes: [String],
    purpose: String
  }],
  note: String
}, { _id: false });

const siteSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true  // Only declare index once here
  },
  score: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  grade: {
    type: String,
    enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'],
    default: 'F'
  },
  simplifiedPolicy: {
    type: String,
    trim: true
  },
  trackers: {
    type: [String],
    default: []
  },
  category: {
    type: String,
    enum: ['Excellent', 'Good', 'Moderate', 'Poor', 'Very Poor'],
    default: 'Very Poor'
  },
  aiSummary: aiSummarySchema,
  lastAnalyzed: {
    type: Date,
    default: Date.now
  },
  analysisCount: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for getting domain from URL
siteSchema.virtual('domain').get(function () {
  try {
    return new URL(this.url).hostname;
  } catch {
    return this.url;
  }
});

// Virtual for getting tracker categories
siteSchema.virtual('trackerCategories').get(function () {
  if (!this.aiSummary || !this.aiSummary.trackerDetails) {
    return { analytics: 0, advertising: 0, social: 0, other: 0 };
  }

  const categories = { analytics: 0, advertising: 0, social: 0, other: 0 };

  this.aiSummary.trackerDetails.forEach(tracker => {
    const category = tracker.category.toLowerCase();
    if (category.includes('analytic')) categories.analytics++;
    else if (category.includes('advertising') || category.includes('ad')) categories.advertising++;
    else if (category.includes('social')) categories.social++;
    else categories.other++;
  });

  return categories;
});

// Method to check if analysis is stale (older than 24 hours)
siteSchema.methods.isStale = function () {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return this.lastAnalyzed < twentyFourHoursAgo;
};

// Method to increment analysis count
siteSchema.methods.incrementAnalysis = function () {
  this.analysisCount = (this.analysisCount || 0) + 1;
  this.lastAnalyzed = new Date();
  return this.save();
};

// Pre-save middleware to update lastAnalyzed
siteSchema.pre('save', function (next) {
  if (this.isModified('score') || this.isModified('trackers') || this.isModified('aiSummary')) {
    this.lastAnalyzed = new Date();
  }
  next();
});

// Removed duplicate indexes - only keep essential ones
siteSchema.index({ lastAnalyzed: -1 });
siteSchema.index({ score: -1 });
siteSchema.index({ category: 1 });

export default mongoose.model("Site", siteSchema);