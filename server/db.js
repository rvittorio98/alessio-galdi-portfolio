const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    // Non chiudere il processo, altrimenti Vercel restituisce 500 per tutte le route
    // process.exit(1); 
  }
};

// Schema per i progetti - SOLO SLUG come ID
const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  color: { type: String, required: true },
  order: { type: Number, default: 0 },
  mainImage: { type: String },
  hero: {
    title: String,
    description: String
  },
  sections: [mongoose.Schema.Types.Mixed],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Project = mongoose.model('Project', projectSchema);

module.exports = connectDB;
module.exports.Project = Project;