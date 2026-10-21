# Communication Assessment Suite

A comprehensive web application that evaluates communication skills across multiple dimensions using AI and speech recognition technology. This production-ready platform provides 7 complete assessment modules with real-time AI feedback, pronunciation analysis, and detailed scoring.

## 🌟 Production-Ready Deployment Features

This application has been completely rewritten to be production-ready with the following enterprise-grade improvements:

### 🔒 **Scalable Architecture**
- **Database-Backed Sessions**: MongoDB session storage replaces in-memory sessions
- **Stateless Server Design**: All assessment state persisted in database, supporting horizontal scaling
- **Session Management**: Persistent sessions with automatic cleanup and TTL
- **User Authentication**: Secure JWT-based authentication with email verification

### 💾 **Data Persistence & Recovery**
- **Assessment Progress Persistence**: All progress saved to MongoDB with session recovery
- **Client-Side Backup**: localStorage for offline progress and browser refresh recovery
- **Auto-Save Mechanisms**: Progress saved every 30 seconds and on page visibility changes
- **Graceful Error Handling**: Comprehensive error recovery and user feedback

### 🚀 **Performance & Reliability**
- **Resource Cleanup**: Automatic cleanup of timers, recognizers, and memory leaks
- **Audio File Management**: GridFS-based file storage with automatic cleanup
- **Rate Limiting**: API protection against abuse and DOS attacks
- **Connection Pooling**: Optimized database connections
- **Question Pre-generation**: All assessment questions generated upfront to minimize latency

### 🛡️ **Security & Robustness**
- **Input Validation**: Comprehensive server-side validation
- **SQL Injection Prevention**: MongoDB with parameterized queries
- **Session Security**: HTTP-only cookies, CSRF protection
- **Password Security**: bcrypt hashing with 12 salt rounds
- **Payment Integration**: Razorpay payment gateway for test purchases

### 📊 **Monitoring & Maintenance**
- **Comprehensive Logging**: Winston-based logging with environment-specific levels
- **Health Checks**: Database connection monitoring
- **Automatic Cleanup**: Expired sessions and temporary data removal
- **Error Tracking**: Detailed error reporting and recovery

## 🚀 Features

### Complete Assessment Suite (All 7 Modules Implemented)

1. **📖 Reading Ability Assessment**
   - AI-generated sentences using OpenAI/DeepSeek
   - Real-time pronunciation evaluation using Azure Speech Services
   - Multiple sentences per assessment (5 sentences)
   - Detailed feedback on accuracy, fluency, completeness, and prosody
   - Word-level pronunciation analysis

2. **👂 Listening Ability Assessment**
   - AI-generated content with Azure Text-to-Speech
   - Audio playback with repeat functionality
   - User repetition recording and analysis
   - Comprehensive listening comprehension scoring
   - Multiple sentences per assessment (5 sentences)

3. **🔤 Jumbled Sentences Assessment**
   - AI-generated scrambled sentences (5 questions)
   - Interactive sentence reconstruction
   - Real-time feedback and scoring
   - Topic and difficulty-based generation

4. **📚 Story Summarization Assessment**
   - AI-generated short stories
   - Audio playback of the story
   - Voice recording of user's summary
   - AI evaluation of comprehension and summarization quality

5. **🤔 Personal Interview Questions**
   - Behavioral and communication interview questions
   - Multiple difficulty levels (Easy, Medium, Hard)
   - Various categories (General, Technical, Problem Solving, Leadership, etc.)
   - Voice recording and AI-powered evaluation

6. **📝 Reading Comprehension Assessment**
   - AI-generated passages with multiple-choice questions (5 questions)
   - Topic and difficulty-based content
   - Automatic scoring and detailed feedback

7. **⚫ Fill in the Blanks Assessment**
   - Context-based vocabulary and grammar questions (10 questions)
   - Multiple difficulty levels
   - Immediate feedback on answers

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript with localStorage persistence
- **Backend**: Node.js, Express.js with stateless architecture
- **Database**: MongoDB Atlas with GridFS for audio file storage
- **Session Management**: connect-mongo for database-backed sessions
- **Authentication**: bcryptjs (12 rounds), JWT, email verification with Nodemailer
- **AI Integration**: 
  - OpenAI GPT-3.5 Turbo (primary)
  - DeepSeek API (fallback for cost optimization)
- **Speech Services**: 
  - Azure Cognitive Services Speech-to-Text
  - Azure Pronunciation Assessment API
  - Azure Text-to-Speech
- **Audio Processing**: Web Audio API, MediaRecorder API, fluent-ffmpeg
- **Payment Gateway**: Razorpay integration for test purchases
- **Security**: express-rate-limit, validator, CSRF protection
- **File Management**: GridFS, Multer, automatic cleanup jobs
- **Logging**: Winston with environment-specific log levels

## 📋 Prerequisites

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **npm** or **yarn** package manager (comes with Node.js)
- **MongoDB Atlas Account** - Free tier available at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- **API Keys** (Required):
  - **OpenAI API Key** - Get from [OpenAI Platform](https://platform.openai.com/)
  - **Azure Cognitive Services** - Get from [Azure Portal](https://portal.azure.com/)
    - Speech Services key
    - Region (e.g., centralindia, eastus, etc.)
  - **DeepSeek API Key** (Optional fallback) - Get from [DeepSeek](https://www.deepseek.com/)
- **Email Service** (for user verification):
  - Gmail account with App Password, or
  - Any SMTP service (SendGrid, AWS SES, etc.)
- **Razorpay Account** (Optional, for payment integration) - [Razorpay](https://razorpay.com/)
- **FFmpeg** (Required for audio processing):
  - **Windows**: Download from [FFmpeg website](https://ffmpeg.org/download.html) or `winget install ffmpeg`
  - **macOS**: `brew install ffmpeg`
  - **Linux**: `sudo apt-get install ffmpeg`

## ⚙️ Installation & Setup

### Step 1: Clone or Download the Project

```bash
cd "Communication_Assessment (07-12-2025)"
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including Express, Mongoose, OpenAI SDK, Azure Speech SDK, and more.

### Step 3: Configure Environment Variables

Create a `.env` file in the root directory with the following configuration:

```env
# Database Configuration (MongoDB Atlas)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/communication-assessment?retryWrites=true&w=majority

# OpenAI API Configuration
OPENAI_API_KEY=sk-proj-your_openai_api_key_here

# DeepSeek API Configuration (Optional Fallback)
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# Azure Cognitive Services
AZURE_SPEECH_KEY=your_azure_speech_key_here
AZURE_SPEECH_REGION=centralindia

# Server Configuration
PORT=8080
NODE_ENV=development

# Session Security (Generate a random string)
SESSION_SECRET=your-very-secure-random-session-secret-minimum-32-characters

# Email Configuration (Gmail Example)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

# Razorpay Payment Gateway (Optional)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

#### Important Notes:

- **MongoDB URI**: Use MongoDB Atlas (cloud) - get free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
- **Gmail App Password**: Don't use your Gmail password! Generate an App Password:
  1. Go to Google Account → Security → 2-Step Verification → App Passwords
  2. Generate a 16-character app password
  3. Use that in `EMAIL_PASS`
- **Session Secret**: Generate a secure random string (minimum 32 characters)
- **Azure Region**: Must match your Azure Speech Services region (e.g., centralindia, eastus, westus, etc.)

### Step 4: Verify FFmpeg Installation

```bash
ffmpeg -version
```

If FFmpeg is not installed, install it:
- **Windows**: `winget install ffmpeg` or download from [ffmpeg.org](https://ffmpeg.org/)
- **macOS**: `brew install ffmpeg`
- **Linux**: `sudo apt-get install ffmpeg`

## 🚀 Running the Application

### Development Mode (with auto-reload)

```bash
npm run dev
```

This uses `nodemon` to automatically restart the server when you make code changes.

### Production Mode

```bash
npm start
```

This runs the server using `node server.js` without auto-reload.

### Default Configuration

- **Server runs on**: `http://localhost:8080` (or the PORT specified in .env)
- **Database**: Connects to MongoDB Atlas using MONGODB_URI from .env
- **Session storage**: MongoDB-backed sessions (persistent across restarts)

### First-Time Setup

1. **Start the server**: `npm start`
2. **Open browser**: Navigate to `http://localhost:8080`
3. **Sign up**: Create a new account (email verification required)
4. **Verify email**: Check your email inbox for verification link
5. **Login**: Use your credentials to log in
6. **Purchase tests**: Use the payment system to buy test credits (or contact admin)
7. **Start assessment**: Click "Start Assessment" to begin


## 📖 Usage Guide

### User Workflow

#### 1. Registration & Verification
- Sign up with email and password
- Receive verification email
- Click verification link to activate account

#### 2. Purchase Tests (Optional)
- Navigate to purchase page
- Select test package (1, 5, or 10 tests)
- Complete payment via Razorpay
- Tests credited to your account

#### 3. Starting an Assessment
1. **Login** to your account
2. **Dashboard**: View your available tests and past results
3. **Start Assessment**: Click to begin a new comprehensive evaluation
4. **Setup**: Read instructions and system checks
5. **Begin**: Assessment starts with question pre-generation

### Assessment Flow

The assessment follows a **linear, automatic progression** through all 7 modules:

#### 1. **Reading Ability Assessment** (5 sentences)
- AI generates sentences based on random topic and difficulty
- Click "Start Recording" and read each sentence aloud
- Azure Speech analyzes your pronunciation in real-time
- Receive scores for: Accuracy, Fluency, Completeness, Prosody
- Automatically advances after completing all sentences

#### 2. **Listening Ability Assessment** (5 sentences)
- Listen to AI-generated audio (Azure TTS)
- Click replay button to hear again if needed
- Record yourself repeating what you heard
- Azure Speech evaluates your listening comprehension
- Automatically advances to next section

#### 3. **Jumbled Sentences** (5 questions)
- View scrambled words on screen
- Type the correct sentence order
- Submit each answer for immediate feedback
- Automatic progression through all questions

#### 4. **Story Summarization** (1 story)
- Listen to an AI-generated short story
- Record your voice summary of the story
- AI evaluates comprehension and summarization quality
- Feedback on clarity and content coverage

#### 5. **Personal Interview Questions** (1 question)
- Receive a behavioral/communication question
- Record your spoken answer
- AI evaluates communication quality and content
- Assesses clarity, relevance, and completeness

#### 6. **Reading Comprehension** (5 questions)
- Read an AI-generated passage
- Answer multiple-choice questions
- Immediate scoring and feedback
- Tests understanding and inference

#### 7. **Fill in the Blanks** (10 questions)
- Complete sentences with missing words
- Test grammar and vocabulary
- Instant feedback on each answer
- Automatic scoring

### Results & Feedback

After completing all assessments:
- **Overall Score**: Calculated average of all 7 assessments
- **Individual Scores**: Breakdown by assessment type (0-100 scale)
- **Detailed Feedback**: AI-generated improvement suggestions
- **Email Report**: Comprehensive report sent to your email
- **Dashboard**: View all past assessment results

### Assessment Timer

- **Total Time**: 20 minutes for complete assessment
- **Timer Display**: Visible at top of assessment
- **Warnings**: Alerts at 5 minutes and 1 minute remaining
- **Auto-Submit**: Assessment auto-submits when time expires

## 🏗️ Project Structure

```
Communication_Assessment/
├── server.js                          # Main Express server with all API endpoints
├── package.json                       # Dependencies and npm scripts
├── package-lock.json                  # Locked dependency versions
├── .env                               # Environment variables (NOT in git)
├── .gitignore                         # Git ignore rules
├── Dockerfile                         # Docker container configuration
├── cloudbuild.yaml                    # Google Cloud Build configuration
├── README.md                          # This file
├── GOOGLE_CLOUD_DEPLOYMENT.md         # Cloud deployment guide
├── CONSOLE_DEPLOYMENT_GUIDE.md        # GCP console deployment guide
├── INTERVIEW_QUESTIONS.txt            # Common interview questions
├── INTERVIEW_PREPARATION_GUIDE.txt    # Comprehensive interview prep
│
└── public/                            # Frontend static files
    ├── index.html                     # Main assessment page
    ├── login.html                     # User login page
    ├── signup.html                    # User registration page
    ├── dashboard.html                 # User dashboard
    ├── result.html                    # Assessment results page
    ├── purchase.html                  # Test purchase page
    ├── contact.html                   # Contact page
    ├── admin-login.html               # Admin login
    ├── admin.html                     # Admin dashboard
    ├── reset-password.html            # Password reset page
    │
    ├── main.js                        # Main application controller
    ├── dashboard.js                   # Dashboard functionality
    ├── result.js                      # Results page logic
    │
    ├── setup-assessment.js            # Pre-assessment setup module
    ├── reading-assessment.js          # Reading module with Azure Speech
    ├── listening-assessment.js        # Listening module with TTS/STT
    ├── jumbled-assessment.js          # Jumbled sentences module
    ├── story-assessment.js            # Story summarization module
    ├── personal-assessment.js         # Personal interview module
    ├── comprehension-assessment.js    # Reading comprehension module
    ├── fillblanks-assessment.js       # Fill-in-the-blanks module
    │
    ├── base-styles.css                # Global styles
    ├── auth-styles.css                # Login/signup styles
    ├── dashboard-styles.css           # Dashboard styles
    ├── setup-styles.css               # Setup screen styles
    ├── reading-assessment-styles.css  # Reading assessment styles
    ├── listening-assessment-styles.css # Listening assessment styles
    ├── jumbled-assessment-styles.css  # Jumbled sentences styles
    ├── story-assessment-styles.css    # Story assessment styles
    ├── personal-assessment-styles.css # Personal questions styles
    ├── comprehension-assessment-styles.css # Comprehension styles
    ├── fillblanks-assessment-styles.css    # Fill-blanks styles
    ├── results-styles.css             # Results page styles
    ├── contact-styles.css             # Contact page styles
    ├── purchase.css                   # Purchase page styles
    │
    ├── favicon.png                    # Site favicon
    │
    └── js/
        ├── mobile-detection.js        # Mobile device detection
        └── vendor/                    # Third-party libraries
            └── (Azure Speech SDK)
```


## 🎯 Scoring System

### Individual Assessment Scores (0-100 scale)

1. **Reading Ability**: Based on Azure Pronunciation Assessment
   - Pronunciation accuracy
   - Fluency and pacing
   - Completeness (all words spoken)
   - Prosody (intonation and stress)
   - Average of 5 sentences

2. **Listening Ability**: Based on Azure Speech Recognition + Pronunciation
   - Speech recognition accuracy
   - Pronunciation of repeated content
   - Comprehension quality
   - Average of 5 sentences

3. **Jumbled Sentences**: Based on exact string matching
   - 20 points per correct sentence
   - 5 questions total
   - Case-insensitive comparison

4. **Story Summarization**: AI evaluation (OpenAI/DeepSeek)
   - Comprehension (captured key points?)
   - Completeness (all important elements?)
   - Coherence (logical flow?)
   - Conciseness (appropriate length?)

5. **Personal Questions**: AI evaluation
   - Relevance (answered the question?)
   - Clarity (clear communication?)
   - Structure (organized response?)
   - Content quality

6. **Reading Comprehension**: Objective scoring
   - 20 points per correct answer
   - 5 multiple-choice questions
   - Immediate automated scoring

7. **Fill in the Blanks**: Exact matching
   - 10 points per correct answer
   - 10 questions total
   - Case-insensitive comparison

### Overall Score Calculation

```
Overall Score = Average of all 7 completed assessments
```

Example:
- Reading: 85
- Listening: 78
- Jumbled: 80
- Story: 72
- Personal: 88
- Comprehension: 80
- Fill Blanks: 90
- **Overall: 81.9/100**

### Score Interpretation

| Score Range | Rating | Interpretation |
|-------------|--------|----------------|
| **90-100** | 🏆 Excellent | Outstanding communication skills. Clear, accurate, and highly effective. |
| **80-89** | 🌟 Very Good | Strong communication abilities with minor areas for improvement. |
| **70-79** | ✅ Good | Solid communication skills. Some practice recommended. |
| **60-69** | 📈 Satisfactory | Moderate ability. Regular practice will help improve. |
| **50-59** | ⚠️ Fair | Basic communication skills present. Significant practice needed. |
| **0-49** | 📚 Needs Improvement | Fundamental skills need development. Focused training recommended. |

### Detailed Results Storage

All assessment data is stored in MongoDB:
- Individual question responses
- Pronunciation details (word-level analysis)
- AI-generated feedback
- Timestamp of completion
- User progress tracking

## 🔍 Troubleshooting

### Common Issues & Solutions

#### 1. **Server won't start**

**Error**: `Cannot find module` or `Module not found`
```bash
# Solution: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**Error**: `Error: listen EADDRINUSE: address already in use :::8080`
```bash
# Solution: Port 8080 is already in use
# Option 1: Change PORT in .env to different value (e.g., 3000)
# Option 2: Kill the process using port 8080 (Windows)
netstat -ano | findstr :8080
taskkill /PID <process_id> /F
```

#### 2. **MongoDB Connection Failed**

**Error**: `MongooseServerSelectionError: connect ECONNREFUSED` or `Authentication failed`

**Solutions**:
- Verify MONGODB_URI in .env is correct
- Check MongoDB Atlas IP whitelist (allow all: 0.0.0.0/0)
- Verify database username and password
- Check network connectivity
- Ensure MongoDB Atlas cluster is running

#### 3. **Microphone Not Working**

**Browser shows no microphone access**:
- Chrome: Click lock icon in address bar → Site settings → Allow microphone
- Firefox: Click lock icon → Permissions → Microphone → Allow
- Edge: Similar to Chrome
- Refresh the page after granting permissions

**Still not working**:
- Check system microphone settings
- Test microphone in other apps
- Try a different browser
- Use HTTPS (required for some browsers)

#### 4. **Audio Playback Issues (Listening Assessment)**

**No audio plays**:
- Check browser audio settings (not muted)
- Verify Azure TTS is working (check server logs)
- Check internet connection
- Try different browser

**Audio stutters or cuts out**:
- Slow internet connection - wait for full buffer
- Check FFmpeg is properly installed: `ffmpeg -version`

#### 5. **API Errors / Assessment Not Loading**

**Error**: `Failed to generate questions` or `API request failed`

**Solutions**:
- Verify all API keys in .env are correct:
  - OPENAI_API_KEY (starts with `sk-proj-` or `sk-`)
  - AZURE_SPEECH_KEY
  - AZURE_SPEECH_REGION matches your Azure resource
- Check API key has credits/quota remaining
- Check server logs for detailed error messages
- Try using DeepSeek as fallback (add DEEPSEEK_API_KEY)

#### 6. **Email Verification Not Working**

**No verification email received**:
- Check spam/junk folder
- Verify EMAIL_USER and EMAIL_PASS in .env
- For Gmail: Use App Password (not regular password)
  - Enable 2FA → Generate App Password
- Check server logs for email sending errors

#### 7. **Session/Login Issues**

**User logged out unexpectedly**:
- Check SESSION_SECRET is set in .env
- Verify MongoDB connection (sessions stored in DB)
- Check cookie settings in browser (allow cookies)

**Can't log in after signup**:
- Email must be verified first
- Check email for verification link
- Link expires after 24 hours

#### 8. **Payment Integration Issues**

**Razorpay not working**:
- Verify RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET
- Check Razorpay dashboard for test mode vs live mode
- Ensure webhook is configured (if using)


## 📝 Development Notes

### Code Architecture

**Backend** (server.js):
- Single-file Express server (manageable for this scope)
- Mongoose models defined inline
- RESTful API endpoints
- Middleware: authentication, rate limiting, session management
- AI orchestration with fallback logic
- GridFS for audio file storage

**Frontend**:
- Modular JavaScript (each assessment = separate file)
- No build process (vanilla JS, no bundler needed)
- localStorage for client-side state backup
- Fetch API for backend communication
- Azure Speech SDK for client-side speech recognition

### Key Design Patterns

1. **Fallback Chain**: OpenAI → DeepSeek → Error handling
2. **Pre-generation**: All questions generated before assessment starts
3. **Stateless Server**: All state in MongoDB, enables horizontal scaling
4. **Session Persistence**: Resume assessment after browser refresh
5. **Graceful Degradation**: Fallback to cached content if API fails


### Performance Optimization

1. **Pre-generate questions** (avoid wait time during assessment)
2. **Use GridFS** for large files (audio)
3. **Implement connection pooling** (MongoDB)
4. **Cache Azure auth tokens** (valid for 10 minutes)
5. **Use indexes** on frequently queried fields
6. **Cleanup expired data** (scheduled jobs)
7. **Compress responses** (gzip middleware)


**Communication Assessment Suite v2.0**

Built with ❤️ for comprehensive communication evaluation

⭐ Star this repository if you found it helpful!

[Report Bug](https://github.com/yourrepo/issues) · [Request Feature](https://github.com/yourrepo/issues) · [Documentation](https://github.com/yourrepo/wiki)

</div>