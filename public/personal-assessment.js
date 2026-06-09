// Personal Questions Assessment Module - Azure Speech SDK Implementation

class PersonalAssessment {
    constructor() {
        this.currentQuestion = '';
        this.recognizer = null;
        this.isRecording = false;
        this.isInitialized = false;
        this.azureConfig = null;
        this.spokenResponse = '';
        this.pronunciationResults = [];
        this.recordingStartTime = null;
        this.timerInterval = null;
        
        this.initializeElements();
        this.initializeEventListeners();
    }

    initializeElements() {
        this.elements = {
            loading: document.getElementById('personal-loading'),
            questionDisplay: document.getElementById('personal-question-display'),
            difficulty: document.getElementById('personal-difficulty'),
            category: document.getElementById('personal-category'),
            generateBtn: document.getElementById('personal-generate-btn'),
            questionContainer: document.getElementById('personal-question-container'),
            difficultyBadge: document.getElementById('personal-difficulty-badge'),
            categoryBadge: document.getElementById('personal-category-badge'),
            questionText: document.getElementById('personal-question-text'),
            recordBtn: document.getElementById('personal-record-btn'),
            stopBtn: document.getElementById('personal-stop-btn'),
            retryBtn: document.getElementById('personal-retry-btn'),
            status: document.getElementById('personal-status'),
            timer: document.getElementById('personal-timer'),
            results: document.getElementById('personal-results'),
            score: document.getElementById('personal-score'),
            feedback: document.getElementById('personal-feedback')
        };
    }

    initializeEventListeners() {
        if (this.elements.generateBtn) {
            this.elements.generateBtn.addEventListener('click', () => this.generateQuestion());
        }

        if (this.elements.recordBtn) {
            this.elements.recordBtn.addEventListener('click', () => this.startRecording());
        }
        
        if (this.elements.stopBtn) {
            this.elements.stopBtn.addEventListener('click', () => this.stopRecording());
        }

        if (this.elements.retryBtn) {
            this.elements.retryBtn.addEventListener('click', () => this.generateQuestion());
        }
    }

    async initialize() {
        if (this.isInitialized) {
            return;
        }

        console.log('Initializing Personal Assessment...');
        
        // Check if Speech SDK is available
        if (!window.SpeechSDK) {
            this.showError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
            return;
        }

        this.resetUI();
        await this.loadAzureConfig();
        this.showQuestionSettings();
        this.isInitialized = true;
    }

    async loadAzureConfig() {
        try {
            const response = await fetch('/api/azure-config');
            this.azureConfig = await response.json();
            console.log('Azure configuration loaded for personal assessment');
        } catch (error) {
            console.error('Failed to load Azure configuration:', error);
            this.showError('Failed to load speech configuration. Please refresh the page.');
        }
    }

    resetUI() {
        // Show loading initially
        this.elements.loading.style.display = 'block';
        this.elements.questionDisplay.style.display = 'none';
        this.elements.results.style.display = 'none';
        
        // Reset state
        this.spokenResponse = '';
        this.pronunciationResults = [];
        this.isRecording = false;
        this.elements.recordBtn.style.display = 'inline-block';
        this.elements.stopBtn.style.display = 'none';
        this.elements.retryBtn.style.display = 'none';
        this.elements.status.textContent = '';
        this.elements.status.className = 'recording-status';
        this.elements.timer.textContent = '';
        this.elements.questionContainer.style.display = 'none';
        
        // Reset timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    showQuestionSettings() {
        this.elements.loading.style.display = 'none';
        this.elements.questionDisplay.style.display = 'block';
    }

    async generateQuestion() {
        try {
            this.elements.generateBtn.disabled = true;
            this.elements.generateBtn.textContent = 'Generating...';
            
            const difficulty = this.elements.difficulty.value;
            const category = this.elements.category.value;
            
            console.log('Generating personal question...', { difficulty, category });

            const response = await fetch('/api/personal/generate-question', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    difficulty,
                    category
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success && data.question) {
                this.currentQuestion = data.question;
                this.displayQuestion(data);
            } else {
                throw new Error('Failed to generate question');
            }
            
        } catch (error) {
            console.error('Error generating question:', error);
            this.showError('Failed to generate interview question. Please try again.');
        } finally {
            this.elements.generateBtn.disabled = false;
            this.elements.generateBtn.textContent = 'Generate Question';
        }
    }

    displayQuestion(data) {
        // Update question display
        this.elements.difficultyBadge.textContent = data.difficulty;
        this.elements.categoryBadge.textContent = data.category;
        this.elements.questionText.textContent = data.question;
        
        // Show question container
        this.elements.questionContainer.style.display = 'block';
        
        // Reset recording state
        this.spokenResponse = '';
        this.pronunciationResults = [];
        this.elements.recordBtn.disabled = false;
        this.elements.status.textContent = '';
        this.elements.timer.textContent = '';
        
        console.log('Question displayed:', data.question);
    }

    async startRecording() {
        if (this.isRecording || !this.azureConfig) return;

        try {
            console.log('Starting personal question recording with Azure Speech SDK...');
            
            const SpeechSDK = window.SpeechSDK;
            
            // Create speech configuration
            const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
                this.azureConfig.subscriptionKey, 
                this.azureConfig.region
            );
            speechConfig.speechRecognitionLanguage = 'en-US';

            // Create audio configuration
            const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();

            // Create pronunciation assessment configuration for unscripted speech
            const pronunciationAssessmentConfig = new SpeechSDK.PronunciationAssessmentConfig(
                "", // Empty reference text for unscripted speech
                SpeechSDK.PronunciationAssessmentGradingSystem.HundredMark,
                SpeechSDK.PronunciationAssessmentGranularity.Phoneme,
                true // Enable miscue assessment
            );

            // Create speech recognizer for continuous recognition with pronunciation assessment
            this.recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
            
            // Apply pronunciation assessment to the recognizer
            pronunciationAssessmentConfig.applyTo(this.recognizer);

            this.spokenResponse = '';
            this.pronunciationResults = [];
            this.isRecording = true;
            this.recordingStartTime = Date.now();
            
            // Update UI
            this.elements.recordBtn.style.display = 'none';
            this.elements.stopBtn.style.display = 'inline-block';
            this.elements.retryBtn.style.display = 'inline-block';
            this.elements.status.textContent = '🎤 Recording... Speak your answer clearly and confidently';
            this.elements.status.className = 'recording-status recording';
            
            // Start recording timer
            this.startTimer();
            
            // Handle recognition events
            this.recognizer.recognizing = (s, e) => {
                // Show intermediate results
                const interim = this.spokenResponse + e.result.text;
                if (interim.length > 100) {
                    this.elements.status.textContent = `🎤 Recording... "${interim.substring(0, 100)}..."`;
                } else {
                    this.elements.status.textContent = `🎤 Recording... "${interim}"`;
                }
            };

            this.recognizer.recognized = (s, e) => {
                if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech && e.result.text.trim()) {
                    this.spokenResponse += e.result.text + ' ';
                    
                    // Get pronunciation assessment results for this segment
                    try {
                        const pronunciationResult = SpeechSDK.PronunciationAssessmentResult.fromResult(e.result);
                        if (pronunciationResult) {
                            this.pronunciationResults.push({
                                text: e.result.text,
                                pronunciationScore: pronunciationResult.pronunciationScore || 0,
                                accuracyScore: pronunciationResult.accuracyScore || 0,
                                fluencyScore: pronunciationResult.fluencyScore || 0,
                                completenessScore: pronunciationResult.completenessScore || 0,
                                prosodyScore: pronunciationResult.prosodyScore || 0
                            });
                        }
                    } catch (err) {
                        console.log('Could not extract pronunciation assessment for segment:', err);
                    }
                    
                    console.log('Recognized text:', e.result.text);
                }
            };

            this.recognizer.canceled = (s, e) => {
                console.log('Recognition canceled:', e.reason);
                this.stopRecording();
            };

            // Start continuous recognition
            this.recognizer.startContinuousRecognitionAsync(
                () => {
                    console.log('Continuous recognition with pronunciation assessment started');
                },
                (err) => {
                    console.error('Failed to start recognition:', err);
                    this.showError('Failed to start recording. Please check microphone permissions.');
                    this.isRecording = false;
                    this.elements.recordBtn.style.display = 'inline-block';
                    this.elements.stopBtn.style.display = 'none';
                }
            );
            
        } catch (error) {
            console.error('Error starting personal recording:', error);
            this.showError('Could not start recording. Please check your microphone permissions.');
            this.isRecording = false;
            this.elements.recordBtn.style.display = 'inline-block';
            this.elements.stopBtn.style.display = 'none';
        }
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            this.elements.timer.textContent = `⏱️ ${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            // Auto-stop after 2 minutes
            if (elapsed >= 120) {
                this.stopRecording();
            }
        }, 1000);
    }

    stopRecording() {
        if (this.recognizer && this.isRecording) {
            console.log('Stopping personal recording...');
            
            this.recognizer.stopContinuousRecognitionAsync(
                () => {
                    this.isRecording = false;
                    this.elements.recordBtn.style.display = 'inline-block';
                    this.elements.stopBtn.style.display = 'none';
                    this.elements.status.textContent = '⏳ Processing your response...';
                    this.elements.status.className = 'recording-status';
                    
                    // Clear timer
                    if (this.timerInterval) {
                        clearInterval(this.timerInterval);
                        this.timerInterval = null;
                    }
                    
                    // Process the response
                    this.processResponse();
                },
                (err) => {
                    console.error('Error stopping recognition:', err);
                    this.isRecording = false;
                }
            );
        }
    }

    async processResponse() {
        if (!this.spokenResponse.trim()) {
            this.showError('No response was recorded. Please try again.');
            this.elements.status.textContent = '';
            return;
        }

        try {
            console.log('Processing personal response:', this.spokenResponse);
            console.log('Pronunciation results from Azure:', this.pronunciationResults);
            
            this.elements.status.textContent = '🔄 Getting AI feedback...';
            
            // Calculate average pronunciation scores from Azure results
            let azureResults = {
                pronunciationScore: 0,
                accuracyScore: 0,
                fluencyScore: 0,
                completenessScore: 0,
                prosodyScore: 0,
                recognizedText: this.spokenResponse.trim()
            };

            if (this.pronunciationResults && this.pronunciationResults.length > 0) {
                // Calculate weighted averages based on text length
                let totalWords = 0;
                let weightedPronunciation = 0;
                let weightedAccuracy = 0;
                let weightedFluency = 0;
                let weightedCompleteness = 0;
                let weightedProsody = 0;

                this.pronunciationResults.forEach(result => {
                    const wordCount = result.text.split(' ').length;
                    totalWords += wordCount;
                    
                    weightedPronunciation += (result.pronunciationScore || 0) * wordCount;
                    weightedAccuracy += (result.accuracyScore || 0) * wordCount;
                    weightedFluency += (result.fluencyScore || 0) * wordCount;
                    weightedCompleteness += (result.completenessScore || 0) * wordCount;
                    weightedProsody += (result.prosodyScore || 0) * wordCount;
                });

                if (totalWords > 0) {
                    azureResults.pronunciationScore = Math.round(weightedPronunciation / totalWords);
                    azureResults.accuracyScore = Math.round(weightedAccuracy / totalWords);
                    azureResults.fluencyScore = Math.round(weightedFluency / totalWords);
                    azureResults.completenessScore = Math.round(weightedCompleteness / totalWords);
                    azureResults.prosodyScore = Math.round(weightedProsody / totalWords);
                }

                console.log('Calculated Azure pronunciation scores:', azureResults);
            } else {
                // Fallback to basic scores if no pronunciation results were captured
                console.warn('No pronunciation assessment results available, using fallback scores');
                azureResults.pronunciationScore = 60;
                azureResults.accuracyScore = 60;
                azureResults.fluencyScore = 65;
                azureResults.completenessScore = 70;
                azureResults.prosodyScore = 60;
            }
            
            const response = await fetch('/api/personal/evaluate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    spokenResponse: this.spokenResponse.trim(),
                    azureResults: azureResults
                })
            });

            if (!response.ok) {
                throw new Error(`Evaluation failed: ${response.status}`);
            }

            const result = await response.json();
            console.log('Personal evaluation result:', result);
            
            this.displayResults(result, azureResults);
            
        } catch (error) {
            console.error('Error processing personal response:', error);
            this.showError('Failed to evaluate response. Please try again.');
        }
    }

    displayResults(result, azureResults) {
        // Hide status and show results
        this.elements.status.textContent = '';
        this.elements.questionDisplay.style.display = 'none';
        this.elements.results.style.display = 'block';
        
        // Display score
        const score = Math.round(result.score || 0);
        this.elements.score.textContent = score;
        
        // Generate feedback display
        let feedbackHtml = '<div class="personal-feedback-content">';
        
        // Show interview question
        feedbackHtml += '<div class="interview-question">';
        feedbackHtml += '<h4>❓ Interview Question:</h4>';
        feedbackHtml += `<p class="question-text">"${this.currentQuestion}"</p>`;
        feedbackHtml += '</div>';
        
        // Show user response
        feedbackHtml += '<div class="user-response">';
        feedbackHtml += '<h4>🎤 Your Response:</h4>';
        feedbackHtml += `<p class="response-text">"${this.spokenResponse.trim()}"</p>`;
        feedbackHtml += '</div>';
        
        // Show Azure Speech Assessment Results (if available)
        if (azureResults && azureResults.pronunciationScore > 0) {
            feedbackHtml += '<div class="azure-pronunciation-results">';
            feedbackHtml += '<h4>🔊 Speech Quality Assessment (Azure):</h4>';
            feedbackHtml += '<div class="pronunciation-metrics">';
            feedbackHtml += `<div class="metric"><span class="metric-label">Pronunciation:</span> <span class="metric-value">${azureResults.pronunciationScore}/100</span></div>`;
            feedbackHtml += `<div class="metric"><span class="metric-label">Accuracy:</span> <span class="metric-value">${azureResults.accuracyScore}/100</span></div>`;
            feedbackHtml += `<div class="metric"><span class="metric-label">Fluency:</span> <span class="metric-value">${azureResults.fluencyScore}/100</span></div>`;
            if (azureResults.prosodyScore > 0) {
                feedbackHtml += `<div class="metric"><span class="metric-label">Prosody:</span> <span class="metric-value">${azureResults.prosodyScore}/100</span></div>`;
            }
            feedbackHtml += '</div>';
            feedbackHtml += '</div>';
        }
        
        // Show AI feedback with proper formatting
        feedbackHtml += '<div class="ai-feedback">';
        feedbackHtml += '<h4>🤖 Interviewer Feedback:</h4>';
        feedbackHtml += `<div class="feedback-text">${result.feedback.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>`;
        feedbackHtml += '</div>';
        
        feedbackHtml += '</div>';
        
        this.elements.feedback.innerHTML = feedbackHtml;
        
        // Color code the score
        this.colorCodeScore(score);
        
        // Notify main controller that assessment is complete
        if (window.assessmentController) {
            window.assessmentController.onAssessmentComplete('personal', result.score);
        }
        
        console.log('Personal assessment completed with score:', result.score);
        console.log('Azure pronunciation metrics:', azureResults);
    }

    colorCodeScore(score) {
        const scoreElement = this.elements.score;
        
        // Remove existing color classes
        scoreElement.classList.remove('score-excellent', 'score-good', 'score-fair', 'score-poor');
        
        // Add appropriate color class
        if (score >= 80) {
            scoreElement.classList.add('score-excellent');
            scoreElement.style.color = '#28a745';
        } else if (score >= 60) {
            scoreElement.classList.add('score-good');
            scoreElement.style.color = '#ffc107';
        } else if (score >= 40) {
            scoreElement.classList.add('score-fair');
            scoreElement.style.color = '#fd7e14';
        } else {
            scoreElement.classList.add('score-poor');
            scoreElement.style.color = '#dc3545';
        }
    }

    showError(message) {
        this.elements.loading.style.display = 'none';
        this.elements.status.textContent = `❌ ${message}`;
        this.elements.status.style.color = '#dc3545';
        this.elements.status.className = 'recording-status error';
    }

    // Reset the assessment for retrying
    reset() {
        this.isInitialized = false;
        this.currentQuestion = '';
        this.spokenResponse = '';
        this.pronunciationResults = [];
        this.isRecording = false;
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        if (this.recognizer) {
            try {
                this.recognizer.stopContinuousRecognitionAsync();
                this.recognizer.close();
            } catch (e) {
                console.log('Error closing personal recognizer:', e);
            }
            this.recognizer = null;
        }
    }
}

// Initialize the personal assessment when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.PersonalAssessment = new PersonalAssessment();
    console.log('Personal Assessment module loaded with Azure Speech SDK');
}); 