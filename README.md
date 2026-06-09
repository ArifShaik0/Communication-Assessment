# Communication Assessment Suite

A comprehensive web application that evaluates communication skills across multiple dimensions using AI and speech recognition technology.

## 🚀 Features

### Current Assessments (Phase 1)

1. **📖 Reading Ability Assessment**
   - AI-generated sentences using OpenAI/DeepSeek
   - Real-time pronunciation evaluation using Azure Speech Services
   - Detailed feedback on accuracy, fluency, and completeness
   - Word-level pronunciation analysis

2. **👂 Listening Ability Assessment**
   - AI-generated content with Azure Text-to-Speech
   - Audio playback with repeat functionality
   - User repetition recording and analysis
   - Comprehensive listening comprehension scoring

3. **🔤 Jumbled Sentences Assessment**
   - AI-generated scrambled sentences
   - Interactive sentence reconstruction
   - Real-time feedback and scoring
   - Progress tracking through multiple questions

### Coming Soon (Phase 2)

- **📚 Story Summarization** - Listen to stories and provide summaries
- **🤔 Personal Questions** - Communication assessment interviews
- **📝 Reading Comprehension** - Text-based comprehension questions
- **⚫ Fill in the Blanks** - Contextual vocabulary assessment

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **AI Integration**: OpenAI GPT-3.5, DeepSeek API
- **Speech Services**: Azure Cognitive Services (Speech-to-Text, Text-to-Speech)
- **Audio Processing**: Web Audio API, MediaRecorder API, FFmpeg
- **File Upload**: Multer

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager
- API Keys for:
  - OpenAI or DeepSeek
  - Azure Cognitive Services (Speech)


## 🚀 Running the Application

1. **Start the Server**
   ```bash
   npm start
   ```
   
   For development with auto-reload:
   ```bash
   npm run dev
   ```

2. **Access the Application**
   
   Open your browser and navigate to: `http://localhost:3000`

3. **Grant Microphone Permissions**
   
   When prompted by your browser, allow microphone access for speech recording functionality.

## 📖 Usage Guide

### Starting an Assessment

1. **Welcome Screen**: Review the assessment overview and available modules
2. **Click "Start Assessment"**: Begin the comprehensive evaluation
3. **Navigate**: Use the progress bar and navigation buttons to move between assessments

### Assessment Flow

**Reading Ability:**
1. Wait for AI-generated sentence
2. Click "Start Recording" and read the sentence aloud
3. Click "Stop Recording" when finished
4. Review pronunciation analysis and feedback

**Listening Ability:**
1. Wait for AI-generated audio content
2. Play the audio and listen carefully
3. Click "Start Recording" and repeat what you heard
4. Review listening comprehension results

**Jumbled Sentences:**
1. Read the scrambled words displayed
2. Type the correct sentence order in the input field
3. Submit your answer for immediate feedback
4. Complete all 5 questions

### Final Results

- View your overall communication score
- See detailed breakdown by assessment type
- Print or save your assessment report
- Restart for a new evaluation

## 🏗️ Project Structure

```
All together-part-2/
├── server.js                 # Main Express server
├── package.json             # Dependencies and scripts
├── README.md               # This file
├── .env                    # Environment variables (not in repo)
├── uploads/                # Temporary audio files
└── public/                # Frontend assets
    ├── index.html          # Main HTML page
    ├── styles.css          # Application styles
    ├── main.js             # Main application controller
    ├── reading-assessment.js   # Reading ability module
    ├── listening-assessment.js # Listening ability module
    └── jumbled-assessment.js   # Jumbled sentences module
```

## 🔧 API Endpoints

### Reading Assessment
- `POST /api/reading/generate-sentence` - Generate practice sentence
- `POST /api/reading/analyze` - Analyze pronunciation recording

### Listening Assessment
- `POST /api/listening/generate` - Generate TTS content
- `POST /api/listening/analyze` - Analyze repetition recording

### Jumbled Sentences
- `POST /api/jumbled/start` - Start jumbled sentence game
- `POST /api/jumbled/submit` - Submit sentence answer

### Assessment Management
- `GET /api/assessment/scores` - Get current scores
- `POST /api/assessment/reset` - Reset assessment state

## 🎯 Scoring System

- **Reading Ability**: 0-100 (Azure Speech pronunciation score)
- **Listening Ability**: 0-100 (Azure Speech comprehension score)
- **Jumbled Sentences**: 0-100 (20 points per correct answer × 5 questions)
- **Overall Score**: Average of completed assessments

### Score Interpretation
- **80-100**: Excellent - Clear, accurate communication
- **60-79**: Good - Solid skills with minor improvements needed
- **40-59**: Fair - Moderate ability, practice recommended
- **0-39**: Needs Improvement - Significant practice required


### Browser Compatibility

- **Recommended**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **Required Features**: MediaRecorder API, Web Audio API, ES6 support
