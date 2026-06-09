const express = require('express');
const multer = require('multer');
const fs = require('fs');
const axios = require('axios');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const OpenAI = require('openai');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const upload = multer({ dest: 'uploads/' });

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// =================
// MONGODB CONNECTION & USER MODEL
// =================

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/communication-assessment';
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// User Schema
const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, 'Invalid email address']
    },
    password: {
        type: String,
        required: true,
        minlength: 8
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: {
        type: String,
        default: null
    },
    emailVerificationExpires: {
        type: Date,
        default: null
    },
    passwordResetToken: {
        type: String,
        default: null
    },
    passwordResetExpires: {
        type: Date,
        default: null
    },
    assessmentScores: {
        readingAbility: { type: Number, default: 0 },
        listeningAbility: { type: Number, default: 0 },
        jumbledSentences: { type: Number, default: 0 },
        storySummarization: { type: Number, default: 0 },
        personalQuestions: { type: Number, default: 0 },
        readingComprehension: { type: Number, default: 0 },
        fillInTheBlanks: { type: Number, default: 0 },
        overallScore: { type: Number, default: 0 }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLoginAt: {
        type: Date,
        default: null
    }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Generate email verification token
userSchema.methods.generateEmailVerificationToken = function() {
    const token = crypto.randomBytes(32).toString('hex');
    this.emailVerificationToken = token;
    this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    return token;
};

const User = mongoose.model('User', userSchema);

// =================
// EMAIL CONFIGURATION
// =================

// Email transporter setup
const emailTransporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Test email configuration on startup
emailTransporter.verify(function(error, success) {
    if (error) {
        console.log('Email configuration error:', error);
        console.log('Email verification will not work. Please check your email settings in .env file.');
    } else {
        console.log('Email server is ready to send messages');
    }
});

// =================
// MIDDLEWARE SETUP
// =================

// Rate limiting
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: { error: 'Too many authentication attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply rate limiting
app.use('/api/auth', authLimiter);
app.use(generalLimiter);

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET ,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

app.use(bodyParser.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// =================
// AUTHENTICATION MIDDLEWARE
// =================

// Middleware to check if user is authenticated
const requireAuth = async (req, res, next) => {
    try {
        const token = req.session.userId;
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const user = await User.findById(token);
        if (!user) {
            req.session.destroy();
            return res.status(401).json({ error: 'User not found' });
        }

        if (!user.isEmailVerified) {
            return res.status(401).json({ 
                error: 'Email verification required. Please check your email and verify your account.' 
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({ error: 'Authentication error' });
    }
};

// Middleware to redirect unauthenticated users
const redirectIfNotAuth = async (req, res, next) => {
    try {
        const token = req.session.userId;
        if (!token) {
            return res.redirect('/login?message=Please%20log%20in%20to%20access%20assessments&type=info');
        }

        const user = await User.findById(token);
        if (!user) {
            req.session.destroy();
            return res.redirect('/login?message=Session%20expired.%20Please%20log%20in%20again&type=warning');
        }

        if (!user.isEmailVerified) {
            return res.redirect('/?message=Please%20verify%20your%20email%20before%20accessing%20assessments&type=warning');
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Redirect auth middleware error:', error);
        return res.redirect('/login?message=Authentication%20error&type=error');
    }
};

// =================
// AUTHENTICATION ROUTES
// =================

// Signup route
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ 
                error: 'Email and password are required',
                field: !email ? 'email' : 'password'
            });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({ 
                error: 'Please enter a valid email address',
                field: 'email'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({ 
                error: 'Password must be at least 8 characters long',
                field: 'password'
            });
        }

        // Check password strength
        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        if (!hasUppercase || !hasLowercase || !hasNumbers || !hasSpecialChar) {
            return res.status(400).json({
                error: 'Password must contain uppercase, lowercase, number, and special character',
                field: 'password'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ 
                error: 'An account with this email already exists',
                field: 'email'
            });
        }

        // Create new user
        const user = new User({
            email: email.toLowerCase(),
            password
        });

        // Generate verification token
        const verificationToken = user.generateEmailVerificationToken();
        await user.save();

        // Send verification email
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            const verificationUrl = `${req.protocol}://${req.get('host')}/api/auth/verify-email?token=${verificationToken}`;
            
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Verify Your Email - Communication Assessment Suite',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #667eea;">Welcome to Communication Assessment Suite! 🎯</h2>
                        <p>Thank you for signing up! Please verify your email address to activate your account.</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${verificationUrl}" 
                               style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">
                                Verify Email Address
                            </a>
                        </div>
                        <p>Or copy and paste this link in your browser:</p>
                        <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
                        <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                        <p style="color: #666; font-size: 12px;">
                            If you didn't create an account, please ignore this email.
                        </p>
                    </div>
                `
            };

            try {
                await emailTransporter.sendMail(mailOptions);
            } catch (emailError) {
                console.error('Failed to send verification email:', emailError);
                // Don't fail the signup if email fails
            }
        }

        res.status(201).json({
            success: true,
            message: 'Account created successfully. Please check your email to verify your account.'
        });

    } catch (error) {
        console.error('Signup error:', error);
        
        if (error.code === 11000) { // Duplicate key error
            return res.status(400).json({ 
                error: 'An account with this email already exists',
                field: 'email'
            });
        }
        
        res.status(500).json({ error: 'Server error during signup. Please try again.' });
    }
});

// Login route
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ 
                error: 'Email and password are required',
                field: !email ? 'email' : 'password'
            });
        }

        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(400).json({ 
                error: 'Invalid email or password',
                field: 'email'
            });
        }

        // Check password
        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
            return res.status(400).json({ 
                error: 'Invalid email or password',
                field: 'password'
            });
        }

        // Check if email is verified
        if (!user.isEmailVerified) {
            return res.status(400).json({ 
                error: 'Please verify your email before logging in. Check your inbox for the verification link.'
            });
        }

        // Update last login
        user.lastLoginAt = new Date();
        await user.save();

        // Set session
        req.session.userId = user._id;

        res.json({
            success: true,
            message: 'Login successful'
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login. Please try again.' });
    }
});

// Email verification route
app.get('/api/auth/verify-email', async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.redirect('/?message=Invalid%20verification%20link&type=error');
        }

        const user = await User.findOne({
            emailVerificationToken: token,
            emailVerificationExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.redirect('/?message=Invalid%20or%20expired%20verification%20link&type=error');
        }

        user.isEmailVerified = true;
        user.emailVerificationToken = null;
        user.emailVerificationExpires = null;
        await user.save();

        res.redirect('/login?message=Email%20verified%20successfully!%20You%20can%20now%20log%20in&type=success');

    } catch (error) {
        console.error('Email verification error:', error);
        res.redirect('/?message=Email%20verification%20failed&type=error');
    }
});

// Resend verification email route
app.post('/api/auth/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(400).json({ error: 'User not found' });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({ error: 'Email is already verified' });
        }

        // Generate new verification token
        const verificationToken = user.generateEmailVerificationToken();
        await user.save();

        // Send verification email
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            const verificationUrl = `${req.protocol}://${req.get('host')}/api/auth/verify-email?token=${verificationToken}`;
            
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Verify Your Email - Communication Assessment Suite',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #667eea;">Email Verification 🎯</h2>
                        <p>Please verify your email address to activate your account.</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${verificationUrl}" 
                               style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">
                                Verify Email Address
                            </a>
                        </div>
                        <p>Or copy and paste this link in your browser:</p>
                        <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
                        <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
                    </div>
                `
            };

            await emailTransporter.sendMail(mailOptions);
        }

        res.json({
            success: true,
            message: 'Verification email sent successfully'
        });

    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({ error: 'Failed to resend verification email' });
    }
});

// Logout route
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

// Get current user info
app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({
        id: req.user._id,
        email: req.user.email,
        isEmailVerified: req.user.isEmailVerified,
        assessmentScores: req.user.assessmentScores,
        createdAt: req.user.createdAt,
        lastLoginAt: req.user.lastLoginAt
    });
});

// =================
// PROTECTED ROUTE HANDLERS
// =================

// Serve assessment page (protected)
app.get('/assessment', redirectIfNotAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'assessment.html'));
});

// Serve auth pages
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// =================
// AZURE SPEECH & AI CONFIGURATION (EXISTING)
// =================

const AZURE_KEY = process.env.AZURE_SPEECH_KEY ;
const REGION = process.env.AZURE_SPEECH_REGION || 'centralindia';
const SPEECH_ENDPOINT = `https://${REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US`;
const TTS_ENDPOINT = `https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;

// OpenAI Configuration
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Use DeepSeek as fallback
const deepseek = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY
});

// Global state for assessments (now user-specific)
let assessmentState = {
    currentUser: null,
            scores: {
            readingAbility: 0,
            listeningAbility: 0,
            jumbledSentences: 0,
            storySummarization: 0,
            personalQuestions: 0,
            readingComprehension: 0,
            fillInTheBlanks: 0,
            overallScore: 0
        },
            currentAssessment: null,
        jumbledQuestions: [],
        currentJumbledIndex: 0,
        currentStory: null,
        currentQuestion: null,
        currentComprehension: null,
        currentFillBlanks: null
};

// Update assessment state with user data
const updateAssessmentStateForUser = (user) => {
    assessmentState.currentUser = user._id;
    assessmentState.scores = { ...user.assessmentScores };
};

// Save assessment scores to user
const saveAssessmentScores = async (userId, scores) => {
    try {
        await User.findByIdAndUpdate(userId, {
            $set: { assessmentScores: scores }
        });
    } catch (error) {
        console.error('Error saving assessment scores:', error);
    }
};

// =================
// EXISTING ASSESSMENT ROUTES (NOW PROTECTED)
// =================

// Generate sentence for reading assessment
app.post('/api/reading/generate-sentence', requireAuth, async (req, res) => {
    // Update assessment state for current user
    updateAssessmentStateForUser(req.user);
    try {
        let completion;
        try {
            // Try OpenAI first
            completion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are a helpful assistant that generates simple, clear English sentences for pronunciation practice. Generate sentences that are 8-20 words long, appropriate for English learners, and focus on common vocabulary and clear pronunciation patterns."
                    },
                    {
                        role: "user",
                        content: "Generate a single English sentence for pronunciation practice. The sentence should be meaningful and not too complex. Return only the sentence, nothing else."
                    }
                ],
                max_tokens: 50,
                temperature: 0.7
            });
        } catch (error) {
            console.log('OpenAI failed, trying DeepSeek...');
            // Fallback to DeepSeek
            completion = await deepseek.chat.completions.create({
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content: "You are a helpful assistant that generates simple, clear English sentences for pronunciation practice. Generate sentences that are 8-20 words long, appropriate for English learners, and focus on common vocabulary and clear pronunciation patterns."
                    },
                    {
                        role: "user",
                        content: "Generate a single English sentence for pronunciation practice. The sentence should be meaningful and not too complex. Return only the sentence, nothing else."
                    }
                ],
                max_tokens: 50,
                temperature: 0.7
            });
        }

        const sentence = completion.choices[0].message.content.trim();
        res.json({ sentence });
    } catch (error) {
        console.error('LLM API error:', error.message);
        // Fallback sentences if both APIs fail
        const fallbackSentences = [
            "The quick brown fox jumps over the lazy dog every morning.",
            "Learning English pronunciation takes practice and patience every day.",
            "She sells beautiful seashells by the peaceful seashore.",
            "The weather is absolutely beautiful and sunny today.",
            "I love reading interesting books in my free time.",
            "Please speak clearly and slowly for better understanding.",
            "The cat is sleeping peacefully on the warm windowsill.",
            "We are going to the park tomorrow morning."
        ];
        const randomSentence = fallbackSentences[Math.floor(Math.random() * fallbackSentences.length)];
        res.json({ sentence: randomSentence });
    }
});

// Store pronunciation results (called from frontend)
app.post('/api/reading/store-result', requireAuth, async (req, res) => {
    const { result, referenceText } = req.body;
    
    if (!result || !referenceText) {
        return res.status(400).json({ error: 'Result and reference text are required' });
    }
    
    // Store reading ability score
    const pronunciationScore = result.pronunciationScore || 0;
    assessmentState.scores.readingAbility = pronunciationScore;
    
    // Save to user's database record
    await saveAssessmentScores(req.user._id, assessmentState.scores);
    
    res.json({
        success: true,
        score: pronunciationScore
    });
});

// =================
// LISTENING ABILITY ASSESSMENT
// =================

// Generate sentence and TTS for listening assessment
app.post('/api/listening/generate', requireAuth, async (req, res) => {
    // Update assessment state for current user
    updateAssessmentStateForUser(req.user);
    try {
        let completion;
        try {
            // Try OpenAI first
            completion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are a helpful assistant that generates simple, clear English sentences for listening and pronunciation practice. Generate sentences that are 8-20 words long, appropriate for English learners."
                    },
                    {
                        role: "user",
                        content: "Generate a single English sentence for listening practice. The sentence should be meaningful and clear. Return only the sentence, nothing else."
                    }
                ],
                max_tokens: 50,
                temperature: 0.7
            });
        } catch (error) {
            console.log('OpenAI failed for listening, trying DeepSeek...');
            completion = await deepseek.chat.completions.create({
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content: "You are a helpful assistant that generates simple, clear English sentences for listening and pronunciation practice. Generate sentences that are 8-20 words long, appropriate for English learners."
                    },
                    {
                        role: "user",
                        content: "Generate a single English sentence for listening practice. The sentence should be meaningful and clear. Return only the sentence, nothing else."
                    }
                ],
                max_tokens: 50,
                temperature: 0.7
            });
        }

        const text = completion.choices[0].message.content.trim();
        
        // Generate TTS audio
        const ssml = `
            <speak version='1.0' xml:lang='en-US'>
                <voice xml:lang='en-US' xml:gender='Female' name='en-US-JennyNeural'>
                    <prosody rate="medium" pitch="+0Hz">
                        ${text}
                    </prosody>
                </voice>
            </speak>
        `;

        const ttsResponse = await axios.post(TTS_ENDPOINT, ssml, {
            headers: {
                'Ocp-Apim-Subscription-Key': AZURE_KEY,
                'Content-Type': 'application/ssml+xml',
                'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
            },
            responseType: 'arraybuffer'
        });

        // Save the audio file
        const audioFileName = `listening_${Date.now()}.mp3`;
        const audioPath = path.join(__dirname, 'uploads', audioFileName);
        
        fs.writeFileSync(audioPath, ttsResponse.data);
        
        res.json({ 
            text,
            audioUrl: `/uploads/${audioFileName}`
        });

    } catch (error) {
        console.error('Listening generation error:', error.message);
        res.status(500).json({ error: 'Failed to generate listening content' });
    }
});

// Store listening results (called from frontend)
app.post('/api/listening/store-result', requireAuth, async (req, res) => {
    const { result, referenceText } = req.body;
    
    if (!result || !referenceText) {
        return res.status(400).json({ error: 'Result and reference text are required' });
    }
    
    // Store listening ability score
    const pronunciationScore = result.pronunciationScore || 0;
    assessmentState.scores.listeningAbility = pronunciationScore;
    
    // Save to user's database record
    await saveAssessmentScores(req.user._id, assessmentState.scores);
    
    res.json({
        success: true,
        score: pronunciationScore
    });
});

// Get Azure Speech credentials for frontend
app.get('/api/azure-config', requireAuth, (req, res) => {
    res.json({
        subscriptionKey: AZURE_KEY,
        region: REGION
    });
});

// =================
// STORY SUMMARIZATION ASSESSMENT
// =================

// Generate story and convert to audio
app.post('/api/story/generate', requireAuth, async (req, res) => {
    // Update assessment state for current user
    updateAssessmentStateForUser(req.user);
    try {
        let completion;
        try {
            // Try OpenAI first
            completion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are a storyteller that creates engaging, simple short stories suitable for comprehension assessment. Stories should be 50-100 words long, have a clear beginning, middle, and end."
                    },
                    {
                        role: "user",
                        content: "Tell me a very short story suitable for a 5th grader. Make it interesting but simple to understand and summarize. Around 60-80 words."
                    }
                ],
                max_tokens: 150,
                temperature: 0.7
            });
        } catch (error) {
            console.log('OpenAI failed for story, trying DeepSeek...');
            completion = await deepseek.chat.completions.create({
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content: "You are a storyteller that creates engaging, simple short stories suitable for comprehension assessment. Stories should be 50-100 words long, have a clear beginning, middle, and end."
                    },
                    {
                        role: "user",
                        content: "Tell me a very short story suitable for a 5th grader. Make it interesting but simple to understand and summarize. Around 60-80 words."
                    }
                ],
                max_tokens: 150,
                temperature: 0.7
            });
        }

        const storyText = completion.choices[0].message.content.trim();
        
        // Convert story to speech using Azure TTS
        const ssml = `
            <speak version='1.0' xml:lang='en-US'>
                <voice xml:lang='en-US' xml:gender='Female' name='en-US-JennyNeural'>
                    <prosody rate="medium" pitch="+0Hz">
                        ${storyText}
                    </prosody>
                </voice>
            </speak>
        `;

        const ttsResponse = await axios.post(TTS_ENDPOINT, ssml, {
            headers: {
                'Ocp-Apim-Subscription-Key': AZURE_KEY,
                'Content-Type': 'application/ssml+xml',
                'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
            },
            responseType: 'arraybuffer'
        });

        // Save the audio file
        const audioFileName = `story_${Date.now()}.mp3`;
        const audioPath = path.join(__dirname, 'uploads', audioFileName);
        
        fs.writeFileSync(audioPath, ttsResponse.data);
        
        // Store story for evaluation
        assessmentState.currentStory = storyText;
        
        res.json({ 
            story: storyText,
            audioUrl: `/uploads/${audioFileName}`
        });

    } catch (error) {
        console.error('Story generation error:', error.message);
        res.status(500).json({ error: 'Failed to generate story and audio' });
    }
});

// Evaluate user's story summary
app.post('/api/story/evaluate', requireAuth, async (req, res) => {
    const { userSummary } = req.body;
    const originalStory = assessmentState.currentStory;
    
    if (!originalStory || !userSummary) {
        return res.status(400).json({ error: 'Story or summary is missing' });
    }

    try {
        let completion;
        try {
            // Try OpenAI first
            completion = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "You are an assistant that evaluates a user's summary of a story. Provide a score out of 100 and detailed feedback focusing on completeness, accuracy, clarity, and understanding."
                    },
                    {
                        role: "user",
                        content: `Original Story:\n${originalStory}\n\nUser's Summary:\n${userSummary}\n\nEvaluate this summary and provide:\n1. A score out of 100\n2. Detailed feedback on what was good and what could be improved\n3. Assessment of key story elements captured\n\nFormat: Start with "SCORE: [number]/100" then provide detailed feedback.`
                    }
                ],
                max_tokens: 300,
                temperature: 0.3
            });
        } catch (error) {
            console.log('OpenAI failed for story evaluation, trying DeepSeek...');
            completion = await deepseek.chat.completions.create({
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content: "You are an assistant that evaluates a user's summary of a story. Provide a score out of 100 and detailed feedback focusing on completeness, accuracy, clarity, and understanding."
                    },
                    {
                        role: "user",
                        content: `Original Story:\n${originalStory}\n\nUser's Summary:\n${userSummary}\n\nEvaluate this summary and provide:\n1. A score out of 100\n2. Detailed feedback on what was good and what could be improved\n3. Assessment of key story elements captured\n\nFormat: Start with "SCORE: [number]/100" then provide detailed feedback.`
                    }
                ],
                max_tokens: 300,
                temperature: 0.3
            });
        }

        const feedback = completion.choices[0].message.content;
        
        // Extract score from feedback
        const scoreMatch = feedback.match(/SCORE:\s*(\d+)/i);
        const score = scoreMatch ? parseInt(scoreMatch[1]) : 50;
        
        // Store story summarization score
        assessmentState.scores.storySummarization = score;
        
        // Save to user's database record
        await saveAssessmentScores(req.user._id, assessmentState.scores);
        
        res.json({
            score,
            feedback,
            originalStory
        });

    } catch (error) {
        console.error('Story evaluation error:', error.message);
        res.status(500).json({ error: 'Failed to evaluate story summary' });
    }
});

// =================
// PERSONAL QUESTIONS ASSESSMENT  
// =================

// Generate interview question
app.post('/api/personal/generate-question', requireAuth, async (req, res) => {
    try {
        const { difficulty, category } = req.body;

        const prompt = `Generate a realistic tech company communication assessment question for a job interview.

PARAMETERS:
- Difficulty: ${difficulty || 'Medium'}
- Category: ${category || 'General'}

REQUIREMENTS:
1. The question must be realistic and commonly asked in tech interviews
2. It should test communication skills, not just technical knowledge
3. The candidate should be able to answer in 30-90 seconds
4. Include behavioral, situational, or explanation-based questions
5. Make it challenging but fair

CATEGORIES include:
- Technical Communication: Explain complex concepts simply
- Problem Solving: Describe how you approach problems
- Teamwork: Collaboration and conflict resolution
- Leadership: Leading projects or teams
- Failure/Learning: Learning from mistakes
- Innovation: Creative thinking and solutions

Return ONLY the question, nothing else. Make it sound natural and conversational like a real interviewer would ask.`;

        let completion;
        try {
            // Try OpenAI first
            completion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are a senior tech recruiter conducting communication assessments. Generate realistic, challenging interview questions that test a candidate's ability to communicate effectively."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 200,
                temperature: 0.8
            });
        } catch (error) {
            console.log('OpenAI failed for personal question, trying DeepSeek...');
            completion = await deepseek.chat.completions.create({
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content: "You are a senior tech recruiter conducting communication assessments. Generate realistic, challenging interview questions that test a candidate's ability to communicate effectively."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 200,
                temperature: 0.8
            });
        }

        const question = completion.choices[0].message.content.trim();
        
        // Store current question for evaluation
        assessmentState.currentQuestion = question;

        res.json({
            success: true,
            question: question,
            difficulty: difficulty || 'Medium',
            category: category || 'General',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Personal question generation error:', error.message);
        res.status(500).json({ 
            error: 'Failed to generate question',
            details: error.message 
        });
    }
});

// Store personal assessment results and get AI feedback  
app.post('/api/personal/evaluate', requireAuth, async (req, res) => {
    try {
        const { spokenResponse, azureResults } = req.body;
        const question = assessmentState.currentQuestion;
        
        if (!question || !spokenResponse) {
            return res.status(400).json({ 
                error: 'Question or response is missing' 
            });
        }

        // Create assessment prompt
        const prompt = `You are a senior tech interviewer conducting a communication assessment. Be HONEST and CONSTRUCTIVE in your evaluation.

INTERVIEW QUESTION: "${question}"

CANDIDATE'S SPOKEN RESPONSE: "${spokenResponse}"

AZURE PRONUNCIATION ASSESSMENT DATA:
${JSON.stringify(azureResults, null, 2)}

EVALUATION CRITERIA:
1. Content Quality (40%): Did they answer the question completely? Was the response logical and well-structured?
2. Communication Clarity (30%): Was the message clear and easy to follow? Good use of examples?
3. Pronunciation & Speech (20%): Based on Azure data - pronunciation accuracy, fluency, prosody
4. Professional Delivery (10%): Confidence, pace, filler words, professionalism

PROVIDE FEEDBACK IN THIS FORMAT:

**OVERALL SCORE: [X/100]**

**CONTENT ANALYSIS:**
- [Assessment of their answer quality]
- [What they covered well, what was missing]

**COMMUNICATION EFFECTIVENESS:**
- [Feedback on clarity, structure, examples]
- [Points about organization and flow]

**SPEECH & PRONUNCIATION (Based on Azure Data):**
- [Specific feedback based on pronunciation scores]
- [Speech quality and clarity observations]

**AREAS FOR IMPROVEMENT:**
1. [Specific area] - [Improvement suggestion]
2. [Specific area] - [Improvement suggestion]
3. [Specific area] - [Improvement suggestion]

**STRENGTHS:**
- [What they did well]
- [Positive aspects to continue]

**FINAL ASSESSMENT:**
[One paragraph summary of overall performance and potential]

Be constructive but honest to help them improve.`;

        let completion;
        try {
            // Try OpenAI first
            completion = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "You are a senior tech company interviewer providing constructive feedback on communication assessments. Your feedback helps candidates improve through honest, detailed assessment."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 1500,
                temperature: 0.3
            });
        } catch (error) {
            console.log('OpenAI failed for personal evaluation, trying DeepSeek...');
            completion = await deepseek.chat.completions.create({
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content: "You are a senior tech company interviewer providing constructive feedback on communication assessments. Your feedback helps candidates improve through honest, detailed assessment."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 1500,
                temperature: 0.3
            });
        }

        const feedback = completion.choices[0].message.content;
        
        // Extract score from feedback
        const scoreMatch = feedback.match(/OVERALL SCORE:\s*(\d+)/i);
        let score = scoreMatch ? parseInt(scoreMatch[1]) : 50;
        
        // Also factor in Azure speech score
        const speechScore = azureResults.pronunciationScore || 0;
        score = Math.round((score * 0.8) + (speechScore * 0.2)); // Weight content 80%, speech 20%
        
        // Store personal questions score
        assessmentState.scores.personalQuestions = score;
        
        // Save to user's database record
        await saveAssessmentScores(req.user._id, assessmentState.scores);
        
        res.json({
            success: true,
            score,
            feedback,
            model: "gpt-4",
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Personal assessment error:', error.message);
        res.status(500).json({ 
            error: 'Failed to get assessment feedback',
            details: error.message 
        });
    }
});

// =================
// READING COMPREHENSION ASSESSMENT  
// =================

// Generate reading comprehension content
app.post('/api/comprehension/generate', requireAuth, async (req, res) => {
    try {
        const { topic, difficulty } = req.body;
        
        const prompt = `Generate a reading comprehension exercise with the following specifications:
    
Topic: ${topic || 'technology'}
Difficulty: ${difficulty || 'intermediate'}

Please provide:
1. A reading passage (200-350 words)
2. 5 multiple choice questions based on the passage
3. Each question should have 4 options (A, B, C, D)
4. Include the correct answer for each question

Format your response as a JSON object with this exact structure:
{
  "passage": "The reading passage text here...",
  "questions": [
    {
      "question": "Question text here?",
      "options": {
        "A": "Option A text",
        "B": "Option B text", 
        "C": "Option C text",
        "D": "Option D text"
      },
      "correct_answer": "A"
    }
  ]
}

Make sure the passage is engaging and the questions test different comprehension skills like main idea, details, inference, and vocabulary.`;

        let completion;
        try {
            // Try OpenAI first
            completion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are an expert educational content creator specializing in reading comprehension materials. Always respond with valid JSON format."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 1500,
                temperature: 0.7
            });
        } catch (error) {
            console.log('OpenAI failed for reading comprehension, trying DeepSeek...');
            completion = await deepseek.chat.completions.create({
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content: "You are an expert educational content creator specializing in reading comprehension materials. Always respond with valid JSON format."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 1500,
                temperature: 0.7
            });
        }

        const content = completion.choices[0].message.content;
        
        // Parse the JSON response
        let comprehensionData;
        try {
            comprehensionData = JSON.parse(content);
        } catch (parseError) {
            console.error('Error parsing AI response:', parseError);
            throw new Error('Failed to parse AI response as JSON');
        }

        // Store comprehension data for evaluation
        assessmentState.currentComprehension = comprehensionData;

        res.json({
            success: true,
            topic: topic || 'technology',
            difficulty: difficulty || 'intermediate',
            passage: comprehensionData.passage,
            questions: comprehensionData.questions,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Reading comprehension generation error:', error.message);
        res.status(500).json({ error: 'Failed to generate reading comprehension content' });
    }
});

// Evaluate comprehension quiz answers
app.post('/api/comprehension/evaluate', requireAuth, async (req, res) => {
    try {
        const { userAnswers } = req.body;
        const comprehensionData = assessmentState.currentComprehension;
        
        if (!comprehensionData || !userAnswers) {
            return res.status(400).json({ 
                error: 'Comprehension data or answers are missing' 
            });
        }

        // Calculate score
        let correctAnswers = 0;
        const totalQuestions = comprehensionData.questions.length;
        const results = [];

        comprehensionData.questions.forEach((question, index) => {
            const userAnswer = userAnswers[index];
            const correctAnswer = question.correct_answer;
            const isCorrect = userAnswer === correctAnswer;
            
            if (isCorrect) {
                correctAnswers++;
            }
            
            results.push({
                questionIndex: index + 1,
                question: question.question,
                userAnswer,
                correctAnswer,
                isCorrect,
                options: question.options
            });
        });

        const score = Math.round((correctAnswers / totalQuestions) * 100);
        
        // Store reading comprehension score
        assessmentState.scores.readingComprehension = score;
        
        // Save to user's database record
        await saveAssessmentScores(req.user._id, assessmentState.scores);
        
        res.json({
            success: true,
            score,
            correctAnswers,
            totalQuestions,
            percentage: score,
            results,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Reading comprehension evaluation error:', error.message);
        res.status(500).json({ error: 'Failed to evaluate reading comprehension quiz' });
    }
});

// =================
// FILL IN THE BLANKS ASSESSMENT  
// =================

// Generate fill-in-the-blanks questions
app.post('/api/fillblanks/generate', requireAuth, async (req, res) => {
    try {
        const prompt = `Generate 10 grammar-based fill-in-the-blanks questions suitable for a communication assessment. The questions should cover topics like verb forms, tenses, articles, and prepositions. For each question, provide 3 options and the correct answer.

Format your response as a JSON object with this exact structure:
{
  "questions": [
    {
      "question": "The sentence with a _____ that needs to be filled.",
      "options": ["Option1", "Option2", "Option3"],
      "correctAnswer": "Option1"
    }
  ]
}

Make sure to include a variety of grammar concepts:
- Verb tenses (past, present, future)
- Articles (a, an, the)
- Prepositions (in, on, at, for, with, etc.)
- Subject-verb agreement
- Modal verbs (can, could, should, would, etc.)
- Comparative and superlative forms
- Pronouns and possessives

Each question should test a clear grammar rule and have one obviously correct answer.`;

        let completion;
        try {
            // Try OpenAI first
            completion = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "You are an expert grammar instructor creating fill-in-the-blanks exercises. Always respond with valid JSON format."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 1500,
                temperature: 0.7
            });
        } catch (error) {
            console.log('OpenAI failed for fill in blanks, trying DeepSeek...');
            completion = await deepseek.chat.completions.create({
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content: "You are an expert grammar instructor creating fill-in-the-blanks exercises. Always respond with valid JSON format."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 1500,
                temperature: 0.7
            });
        }

        const content = completion.choices[0].message.content;
        
        // Parse the JSON response
        let questionsData;
        try {
            questionsData = JSON.parse(content);
        } catch (parseError) {
            console.error('Error parsing AI response:', parseError);
            throw new Error('Failed to parse AI response as JSON');
        }

        // Store questions for evaluation
        assessmentState.currentFillBlanks = questionsData.questions;

        res.json({
            success: true,
            questions: questionsData.questions,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Fill in the blanks generation error:', error.message);
        res.status(500).json({ error: 'Failed to generate fill-in-the-blanks questions' });
    }
});

// Evaluate fill-in-the-blanks answers
app.post('/api/fillblanks/evaluate', requireAuth, async (req, res) => {
    try {
        const { userAnswers } = req.body;
        const questions = assessmentState.currentFillBlanks;
        
        if (!questions || !userAnswers) {
            return res.status(400).json({ 
                error: 'Questions or answers are missing' 
            });
        }

        // Calculate score
        let correctAnswers = 0;
        const totalQuestions = questions.length;
        const results = [];

        questions.forEach((question, index) => {
            const userAnswer = userAnswers[index];
            const correctAnswer = question.correctAnswer;
            const isCorrect = userAnswer === correctAnswer;
            
            if (isCorrect) {
                correctAnswers++;
            }
            
            results.push({
                questionIndex: index + 1,
                question: question.question,
                userAnswer,
                correctAnswer,
                isCorrect,
                options: question.options
            });
        });

        const score = Math.round((correctAnswers / totalQuestions) * 100);
        
        // Store fill-in-the-blanks score
        assessmentState.scores.fillInTheBlanks = score;
        
        // Save to user's database record
        await saveAssessmentScores(req.user._id, assessmentState.scores);
        
        res.json({
            success: true,
            score,
            correctAnswers,
            totalQuestions,
            percentage: score,
            results,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Fill in the blanks evaluation error:', error.message);
        res.status(500).json({ error: 'Failed to evaluate fill-in-the-blanks quiz' });
    }
});

// =================
// JUMBLED SENTENCES ASSESSMENT
// =================

// Generate jumbled sentences
app.post('/api/jumbled/start', requireAuth, async (req, res) => {
    try {
        let completion;
        try {
            // Try OpenAI first
            completion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are an assistant for a communication assessment test. Your task is to generate 5 simple sentences, commonly used in everyday conversation. For each sentence, you must then jumble the words. The sentences should not be too complex.\nProvide the output in the following format, and nothing else:\n##1:\n##Original: <The original sentence.>\n##Jumbled: <word1> / <word2> / <word3> ...\n##2:\n##Original: <The original sentence.>\n##Jumbled: <word1> / <word2> / <word3> ...\n...and so on for 5 sentences."
                    },
                    {
                        role: "user",
                        content: "Generate 5 jumbled sentences for communication assessment."
                    }
                ],
                max_tokens: 500,
                temperature: 0.7
            });
        } catch (error) {
            console.log('OpenAI failed for jumbled sentences, trying DeepSeek...');
            completion = await deepseek.chat.completions.create({
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content: "You are an assistant for a communication assessment test. Your task is to generate 5 simple sentences, commonly used in everyday conversation. For each sentence, you must then jumble the words. The sentences should not be too complex.\nProvide the output in the following format, and nothing else:\n##1:\n##Original: <The original sentence.>\n##Jumbled: <word1> / <word2> / <word3> ...\n##2:\n##Original: <The original sentence.>\n##Jumbled: <word1> / <word2> / <word3> ...\n...and so on for 5 sentences."
                    },
                    {
                        role: "user",
                        content: "Generate 5 jumbled sentences for communication assessment."
                    }
                ],
                max_tokens: 500,
                temperature: 0.7
            });
        }

        const content = completion.choices[0].message.content;
        const questions = parseJumbledSentences(content);
        
        assessmentState.jumbledQuestions = questions;
        assessmentState.currentJumbledIndex = 0;
        assessmentState.scores.jumbledSentences = 0;
        
        if (questions.length > 0) {
            res.json({ 
                jumbled: questions[0].jumbled,
                totalQuestions: questions.length,
                currentQuestion: 1
            });
        } else {
            res.status(500).json({ error: "Failed to generate questions." });
        }
        
    } catch (error) {
        console.error('Jumbled sentences generation error:', error.message);
        res.status(500).json({ error: 'Failed to generate jumbled sentences' });
    }
});

// Submit jumbled sentence answer
app.post('/api/jumbled/submit', requireAuth, async (req, res) => {
    const { answer } = req.body;
    const currentQuestion = assessmentState.jumbledQuestions[assessmentState.currentJumbledIndex];
    
    if (!currentQuestion) {
        return res.status(400).json({ error: 'No current question' });
    }
    
    // Simple scoring: check if answer matches original (case insensitive, trimmed)
    const isCorrect = answer.toLowerCase().trim() === currentQuestion.original.toLowerCase().trim();
    
    if (isCorrect) {
        assessmentState.scores.jumbledSentences += 20; // 20 points per correct answer (5 questions = 100 max)
    }
    
    assessmentState.currentJumbledIndex++;
    
    if (assessmentState.currentJumbledIndex < assessmentState.jumbledQuestions.length) {
        // Next question
        const nextQuestion = assessmentState.jumbledQuestions[assessmentState.currentJumbledIndex];
        res.json({
            correct: isCorrect,
            correctAnswer: currentQuestion.original,
            nextJumbled: nextQuestion.jumbled,
            currentQuestion: assessmentState.currentJumbledIndex + 1,
            totalQuestions: assessmentState.jumbledQuestions.length
        });
    } else {
        // Assessment complete
        // Save to user's database record
        await saveAssessmentScores(req.user._id, assessmentState.scores);
        
        res.json({
            correct: isCorrect,
            correctAnswer: currentQuestion.original,
            complete: true,
            finalScore: assessmentState.scores.jumbledSentences
        });
    }
});

// =================
// OVERALL ASSESSMENT MANAGEMENT
// =================

// Get current assessment scores
app.get('/api/assessment/scores', requireAuth, async (req, res) => {
    // Update assessment state with user's current scores
    updateAssessmentStateForUser(req.user);
    // Calculate overall score (average of all completed assessments)
    const scores = assessmentState.scores;
    let totalScore = 0;
    let completedAssessments = 0;
    
    if (scores.readingAbility > 0) {
        totalScore += scores.readingAbility;
        completedAssessments++;
    }
    if (scores.listeningAbility > 0) {
        totalScore += scores.listeningAbility;
        completedAssessments++;
    }
    if (scores.jumbledSentences > 0) {
        totalScore += scores.jumbledSentences;
        completedAssessments++;
    }
    if (scores.storySummarization > 0) {
        totalScore += scores.storySummarization;
        completedAssessments++;
    }
    if (scores.personalQuestions > 0) {
        totalScore += scores.personalQuestions;
        completedAssessments++;
    }
    if (scores.readingComprehension > 0) {
        totalScore += scores.readingComprehension;
        completedAssessments++;
    }
    if (scores.fillInTheBlanks > 0) {
        totalScore += scores.fillInTheBlanks;
        completedAssessments++;
    }
    
    const overallScore = completedAssessments > 0 ? (totalScore / completedAssessments) : 0;
    assessmentState.scores.overallScore = overallScore;
    
    res.json({
        ...assessmentState.scores,
        completedAssessments,
        overallScore
    });
});

// Reset assessment
app.post('/api/assessment/reset', requireAuth, async (req, res) => {
    // Reset user's scores in the database
    const resetScores = {
            readingAbility: 0,
            listeningAbility: 0,
            jumbledSentences: 0,
            storySummarization: 0,
            personalQuestions: 0,
        readingComprehension: 0,
        fillInTheBlanks: 0,
            overallScore: 0
    };
    
    await User.findByIdAndUpdate(req.user._id, {
        $set: { assessmentScores: resetScores }
    });
    
    // Reset local assessment state
    assessmentState = {
        currentUser: req.user._id,
        scores: resetScores,
        currentAssessment: null,
        jumbledQuestions: [],
        currentJumbledIndex: 0,
        currentStory: null,
        currentQuestion: null,
        currentComprehension: null,
        currentFillBlanks: null
    };
    
    res.json({ message: 'Assessment reset successfully' });
});

// =================
// UTILITY FUNCTIONS
// =================

function parseJumbledSentences(content) {
    const lines = content.split('\n');
    const questions = [];
    let currentQuestion = {};
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('##') && trimmedLine.includes(':') && !trimmedLine.includes('Original:') && !trimmedLine.includes('Jumbled:')) {
            // New question number
            if (currentQuestion.original && currentQuestion.jumbled) {
                questions.push(currentQuestion);
            }
            currentQuestion = {};
        } else if (trimmedLine.startsWith('##Original:')) {
            currentQuestion.original = trimmedLine.replace('##Original:', '').trim();
        } else if (trimmedLine.startsWith('##Jumbled:')) {
            currentQuestion.jumbled = trimmedLine.replace('##Jumbled:', '').trim();
        }
    }
    
    // Add the last question
    if (currentQuestion.original && currentQuestion.jumbled) {
        questions.push(currentQuestion);
    }
    
    return questions;
}

// Serve main HTML file (homepage)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Communication Assessment Server running on http://localhost:${PORT}`);
    console.log('Available assessments: Reading Ability, Listening Ability, Jumbled Sentences');
}); 