// Listening Assessment Module - Azure Speech SDK Implementation

class ListeningAssessment {
    constructor() {
        this.currentText = '';
        this.audioUrl = '';
        this.recognizer = null;
        this.isRecording = false;
        this.isInitialized = false;
        this.azureConfig = null;
        
        this.initializeElements();
        this.initializeEventListeners();
    }

    initializeElements() {
        this.elements = {
            loading: document.getElementById('listening-loading'),
            player: document.getElementById('listening-player'),
            audio: document.getElementById('listening-audio'),
            controls: document.getElementById('listening-controls'),
            recordBtn: document.getElementById('listening-record-btn'),
            stopBtn: document.getElementById('listening-stop-btn'),
            status: document.getElementById('listening-status'),
            results: document.getElementById('listening-results'),
            score: document.getElementById('listening-score'),
            feedback: document.getElementById('listening-feedback')
        };
    }

    initializeEventListeners() {
        if (this.elements.recordBtn) {
            this.elements.recordBtn.addEventListener('click', () => this.startRecording());
        }
        
        if (this.elements.stopBtn) {
            this.elements.stopBtn.addEventListener('click', () => this.stopRecording());
        }

        // Audio player event listeners
        if (this.elements.audio) {
            this.elements.audio.addEventListener('ended', () => {
                console.log('Audio playback ended');
            });
            
            this.elements.audio.addEventListener('error', (e) => {
                console.error('Audio playback error:', e);
                this.showError('Audio playback failed. Please try refreshing the page.');
            });
        }
    }

    async initialize() {
        if (this.isInitialized) {
            return;
        }

        console.log('Initializing Listening Assessment...');
        
        // Check if Speech SDK is available
        if (!window.SpeechSDK) {
            this.showError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
            return;
        }

        this.resetUI();
        await this.loadAzureConfig();
        await this.generateListeningContent();
        this.isInitialized = true;
    }

    async loadAzureConfig() {
        try {
            const response = await fetch('/api/azure-config');
            this.azureConfig = await response.json();
            console.log('Azure configuration loaded for listening assessment');
        } catch (error) {
            console.error('Failed to load Azure configuration:', error);
            this.showError('Failed to load speech configuration. Please refresh the page.');
        }
    }

    resetUI() {
        // Show loading, hide everything else
        this.elements.loading.style.display = 'block';
        this.elements.player.style.display = 'none';
        this.elements.controls.style.display = 'none';
        this.elements.results.style.display = 'none';
        
        // Reset recording state
        this.isRecording = false;
        this.elements.recordBtn.style.display = 'inline-block';
        this.elements.stopBtn.style.display = 'none';
        this.elements.status.textContent = '';
        this.elements.status.className = 'recording-status';
        
        // Reset audio
        if (this.elements.audio) {
            this.elements.audio.src = '';
        }
    }

    async generateListeningContent() {
        try {
            console.log('Generating listening content...');
            
            const response = await fetch('/api/listening/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.text && data.audioUrl) {
                this.currentText = data.text;
                this.audioUrl = data.audioUrl;
                this.displayListeningContent();
            } else {
                throw new Error('Incomplete listening content received from server');
            }
            
        } catch (error) {
            console.error('Error generating listening content:', error);
            this.showError('Failed to generate listening content. Please try refreshing the page.');
        }
    }

    displayListeningContent() {
        this.elements.loading.style.display = 'none';
        this.elements.player.style.display = 'block';
        this.elements.controls.style.display = 'block';
        
        // Set audio source
        this.elements.audio.src = this.audioUrl;
        this.elements.audio.load();
        
        console.log('Listening content displayed. Text:', this.currentText);
        console.log('Audio URL:', this.audioUrl);
    }

    async startRecording() {
        if (this.isRecording || !this.currentText || !this.azureConfig) return;

        try {
            console.log('Starting recording for listening assessment with Azure Speech SDK...');
            
            const SpeechSDK = window.SpeechSDK;
            
            // Create speech configuration
            const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
                this.azureConfig.subscriptionKey, 
                this.azureConfig.region
            );
            speechConfig.speechRecognitionLanguage = 'en-US';

            // Create audio configuration
            const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();

            // Create pronunciation assessment configuration
            const pronunciationAssessmentConfig = new SpeechSDK.PronunciationAssessmentConfig(
                this.currentText,
                SpeechSDK.PronunciationAssessmentGradingSystem.HundredMark,
                SpeechSDK.PronunciationAssessmentGranularity.Word,
                true
            );

            // Create speech recognizer
            this.recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
            pronunciationAssessmentConfig.applyTo(this.recognizer);

            this.isRecording = true;
            
            // Update UI
            this.elements.recordBtn.style.display = 'none';
            this.elements.stopBtn.style.display = 'inline-block';
            this.elements.status.textContent = '🎤 Recording... Please repeat what you heard';
            this.elements.status.className = 'recording-status recording';
            
            // Start recognition
            this.recognizer.recognizeOnceAsync(result => {
                this.isRecording = false;
                this.elements.recordBtn.style.display = 'inline-block';
                this.elements.stopBtn.style.display = 'none';
                this.elements.status.className = 'recording-status';

                if (result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
                    const paResult = SpeechSDK.PronunciationAssessmentResult.fromResult(result);
                    this.processResults(paResult, result.text);
                } else {
                    this.elements.status.textContent = '❌ No speech detected. Please try again.';
                    console.error('Listening speech recognition failed:', result);
                }
            });
            
        } catch (error) {
            console.error('Error starting listening recording:', error);
            this.showError('Could not start recording. Please check your microphone permissions.');
            this.isRecording = false;
            this.elements.recordBtn.style.display = 'inline-block';
            this.elements.stopBtn.style.display = 'none';
        }
    }

    stopRecording() {
        if (this.recognizer && this.isRecording) {
            console.log('Stopping listening recording...');
            this.recognizer.stopContinuousRecognitionAsync();
            this.isRecording = false;
            this.elements.recordBtn.style.display = 'inline-block';
            this.elements.stopBtn.style.display = 'none';
            this.elements.status.textContent = '';
        }
    }

    async processResults(paResult, recognizedText) {
        console.log('Processing listening results:', paResult);
        
        this.elements.status.textContent = '⏳ Analyzing listening performance...';
        
        try {
            // Prepare result data
            const resultData = {
                pronunciationScore: paResult.pronunciationScore || 0,
                accuracyScore: paResult.accuracyScore || 0,
                fluencyScore: paResult.fluencyScore || 0,
                completenessScore: paResult.completenessScore || 0,
                recognizedText: recognizedText || '',
                detailResult: paResult.detailResult
            };

            // Store results on server for logging
            await fetch('/api/listening/store-result', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    result: resultData,
                    referenceText: this.currentText
                })
            });
            
            this.displayResults(resultData);
            
        } catch (error) {
            console.error('Error processing listening results:', error);
            this.showError('Failed to process listening results. Please try again.');
        }
    }

    displayResults(result) {
        // Hide status and show results
        this.elements.status.textContent = '';
        this.elements.results.style.display = 'block';
        
        // Extract pronunciation score
        const pronunciationScore = Math.round(result.pronunciationScore || 0);
        
        // Display score
        this.elements.score.textContent = pronunciationScore;
        
        // Generate feedback
        let feedback = this.generateListeningFeedback(result);
        this.elements.feedback.innerHTML = feedback;
        
        // Color code the score
        this.colorCodeScore(pronunciationScore);
        
        // Notify main controller that assessment is complete
        if (window.assessmentController) {
            window.assessmentController.onAssessmentComplete('listening', result.pronunciationScore);
        }
        
        console.log('Listening assessment completed with score:', result.pronunciationScore);
    }

    generateListeningFeedback(result) {
        const pronunciationScore = result.pronunciationScore || 0;
        const accuracyScore = result.accuracyScore || 0;
        const fluencyScore = result.fluencyScore || 0;
        const completenessScore = result.completenessScore || 0;
        const recognizedText = result.recognizedText || '';
        
        let feedback = '<div class="detailed-feedback">';
        
        // Show what the user was supposed to repeat
        feedback += `<div class="reference-text">`;
        feedback += `<h4>Original Text:</h4>`;
        feedback += `<p><em>"${this.currentText}"</em></p>`;
        feedback += `</div>`;
        
        // What the user actually said
        feedback += `<div class="recognized-text">`;
        feedback += `<h4>What we heard you say:</h4>`;
        feedback += `<p>"${recognizedText}"</p>`;
        feedback += `</div>`;
        
        // Overall listening feedback
        if (pronunciationScore >= 80) {
            feedback += '<p><strong>Excellent listening and repetition!</strong> You understood and repeated the text very clearly.</p>';
        } else if (pronunciationScore >= 60) {
            feedback += '<p><strong>Good listening skills!</strong> You understood most of the text with clear repetition.</p>';
        } else if (pronunciationScore >= 40) {
            feedback += '<p><strong>Fair listening ability.</strong> Keep practicing to improve comprehension and pronunciation.</p>';
        } else {
            feedback += '<p><strong>Needs improvement.</strong> Focus on listening carefully and practicing pronunciation.</p>';
        }
        
        // Detailed scores
        if (accuracyScore > 0 || fluencyScore > 0 || completenessScore > 0) {
            feedback += '<div class="score-breakdown">';
            feedback += '<h4>Detailed Analysis:</h4>';
            feedback += '<ul>';
            if (accuracyScore > 0) feedback += `<li>Pronunciation Accuracy: ${Math.round(accuracyScore)}/100</li>`;
            if (fluencyScore > 0) feedback += `<li>Speaking Fluency: ${Math.round(fluencyScore)}/100</li>`;
            if (completenessScore > 0) feedback += `<li>Content Completeness: ${Math.round(completenessScore)}/100</li>`;
            feedback += '</ul>';
            feedback += '</div>';
        }

        // Word-level comparison if available
        if (result.detailResult && result.detailResult.Words) {
            const words = result.detailResult.Words;
            const problematicWords = words.filter(word => 
                word.PronunciationAssessment && word.PronunciationAssessment.AccuracyScore < 60
            );
            
            if (problematicWords.length > 0) {
                feedback += '<div class="word-feedback">';
                feedback += '<h4>Words That Need Practice:</h4>';
                feedback += '<div class="word-list">';
                problematicWords.forEach(word => {
                    const score = Math.round(word.PronunciationAssessment.AccuracyScore);
                    const color = score >= 80 ? '#28a745' : score >= 60 ? '#ffc107' : '#dc3545';
                    feedback += `<span class="word-item" style="color: ${color}"><strong>${word.Word}</strong> (${score}%)</span> `;
                });
                feedback += '</div>';
                feedback += '</div>';
            }
        }
        
        // Listening-specific tips
        feedback += '<div class="listening-tips">';
        feedback += '<h4>Tips for Improvement:</h4>';
        feedback += '<ul>';
        feedback += '<li>Listen to the audio multiple times before recording</li>';
        feedback += '<li>Focus on the rhythm and intonation patterns</li>';
        feedback += '<li>Try to repeat immediately after hearing each phrase</li>';
        feedback += '<li>Practice with English audio content daily</li>';
        feedback += '</ul>';
        feedback += '</div>';
        
        feedback += '</div>';
        return feedback;
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
        
        // Show retry option
        if (!this.currentText) {
            // If no content was generated, try to generate again
            setTimeout(() => {
                this.generateListeningContent();
            }, 2000);
        }
    }

    // Reset the assessment for retrying
    reset() {
        this.isInitialized = false;
        this.currentText = '';
        this.audioUrl = '';
        this.isRecording = false;
        
        if (this.recognizer) {
            try {
                this.recognizer.close();
            } catch (e) {
                console.log('Error closing listening recognizer:', e);
            }
            this.recognizer = null;
        }
        
        if (this.elements.audio) {
            this.elements.audio.pause();
            this.elements.audio.src = '';
        }
    }
}

// Initialize the listening assessment when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.ListeningAssessment = new ListeningAssessment();
    console.log('Listening Assessment module loaded with Azure Speech SDK');
}); 