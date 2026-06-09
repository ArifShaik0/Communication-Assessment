// Communication Assessment Suite - Main Controller

class AssessmentController {
    constructor() {
        this.currentStep = 0;
        this.totalSteps = 7; // Reading, Listening, Jumbled Sentences, Story, Personal, Comprehension, Fill Blanks
        this.assessmentSections = ['reading', 'listening', 'jumbled', 'story', 'personal', 'comprehension', 'fillblanks'];
        this.completedAssessments = [];
        this.scores = {
            reading: 0,
            listening: 0,
            jumbled: 0,
            story: 0,
            personal: 0,
            comprehension: 0,
            fillblanks: 0,
            overall: 0
        };
        
        this.initializeEventListeners();
        this.showWelcomeSection();
    }

    initializeEventListeners() {
        // Start Assessment Button
        document.getElementById('start-assessment').addEventListener('click', () => {
            this.startAssessment();
        });

        // Navigation Buttons
        document.getElementById('prev-btn').addEventListener('click', () => {
            this.previousStep();
        });

        document.getElementById('next-btn').addEventListener('click', () => {
            this.nextStep();
        });

        document.getElementById('finish-btn').addEventListener('click', () => {
            this.showFinalResults();
        });

        // Restart Button
        document.getElementById('restart-btn').addEventListener('click', () => {
            this.restartAssessment();
        });

        // Print Button
        document.getElementById('print-btn').addEventListener('click', () => {
            window.print();
        });
    }

    showWelcomeSection() {
        this.hideAllSections();
        document.getElementById('welcome-section').style.display = 'block';
        document.getElementById('assessment-nav').style.display = 'none';
    }

    startAssessment() {
        this.currentStep = 0;
        this.completedAssessments = [];
        this.scores = { reading: 0, listening: 0, jumbled: 0, story: 0, personal: 0, comprehension: 0, fillblanks: 0, overall: 0 };
        
        // Reset assessment state on server
        this.resetServerState();
        
        this.hideAllSections();
        this.showCurrentAssessment();
        this.updateNavigation();
    }

    async resetServerState() {
        try {
            await fetch('/api/assessment/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.error('Failed to reset server state:', error);
        }
    }

    hideAllSections() {
        document.getElementById('welcome-section').style.display = 'none';
        document.getElementById('reading-assessment').style.display = 'none';
        document.getElementById('listening-assessment').style.display = 'none';
        document.getElementById('jumbled-assessment').style.display = 'none';
        document.getElementById('story-assessment').style.display = 'none';
        document.getElementById('personal-assessment').style.display = 'none';
        document.getElementById('comprehension-assessment').style.display = 'none';
        document.getElementById('fillblanks-assessment').style.display = 'none';
        document.getElementById('final-results').style.display = 'none';
    }

    showCurrentAssessment() {
        if (this.currentStep >= this.totalSteps) {
            this.showFinalResults();
            return;
        }

        const currentAssessment = this.assessmentSections[this.currentStep];
        document.getElementById(`${currentAssessment}-assessment`).style.display = 'block';
        document.getElementById('assessment-nav').style.display = 'flex';

        // Initialize the current assessment
        this.initializeCurrentAssessment(currentAssessment);
    }

    initializeCurrentAssessment(assessmentType) {
        switch (assessmentType) {
            case 'reading':
                if (window.ReadingAssessment) {
                    window.ReadingAssessment.initialize();
                }
                break;
            case 'listening':
                if (window.ListeningAssessment) {
                    window.ListeningAssessment.initialize();
                }
                break;
            case 'jumbled':
                if (window.JumbledAssessment) {
                    window.JumbledAssessment.initialize();
                }
                break;
            case 'story':
                if (window.StoryAssessment) {
                    window.StoryAssessment.initialize();
                }
                break;
            case 'personal':
                if (window.PersonalAssessment) {
                    window.PersonalAssessment.initialize();
                }
                break;
            case 'comprehension':
                if (window.ComprehensionAssessment) {
                    window.ComprehensionAssessment.initialize();
                }
                break;
            case 'fillblanks':
                if (window.FillBlanksAssessment) {
                    window.FillBlanksAssessment.initialize();
                }
                break;
        }
    }

    updateNavigation() {
        // Update progress bar
        const progressPercent = ((this.currentStep + 1) / this.totalSteps) * 100;
        document.getElementById('progress-fill').style.width = `${progressPercent}%`;

        // Update progress text
        document.getElementById('current-step').textContent = this.currentStep + 1;
        document.getElementById('total-steps').textContent = this.totalSteps;

        // Update button states
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const finishBtn = document.getElementById('finish-btn');

        prevBtn.disabled = this.currentStep === 0;
        
        // Show finish button on last step, otherwise show next
        if (this.currentStep === this.totalSteps - 1) {
            nextBtn.style.display = 'none';
            finishBtn.style.display = 'inline-block';
        } else {
            nextBtn.style.display = 'inline-block';
            finishBtn.style.display = 'none';
        }

        // Enable/disable next button based on completion
        const currentAssessment = this.assessmentSections[this.currentStep];
        const isCompleted = this.completedAssessments.includes(currentAssessment);
        
        if (this.currentStep < this.totalSteps - 1) {
            nextBtn.disabled = !isCompleted;
        }
    }

    previousStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.hideAllSections();
            this.showCurrentAssessment();
            this.updateNavigation();
        }
    }

    nextStep() {
        const currentAssessment = this.assessmentSections[this.currentStep];
        
        if (!this.completedAssessments.includes(currentAssessment)) {
            this.showMessage('Please complete the current assessment before proceeding.', 'warning');
            return;
        }

        if (this.currentStep < this.totalSteps - 1) {
            this.currentStep++;
            this.hideAllSections();
            this.showCurrentAssessment();
            this.updateNavigation();
        }
    }

    markAssessmentComplete(assessmentType, score) {
        console.log(`Assessment ${assessmentType} completed with score: ${score}`);
        
        if (!this.completedAssessments.includes(assessmentType)) {
            this.completedAssessments.push(assessmentType);
        }
        
        this.scores[assessmentType] = score;
        this.updateNavigation();
        
        this.showMessage(`${this.formatAssessmentName(assessmentType)} completed! Score: ${Math.round(score)}/100`, 'success');
    }

    formatAssessmentName(assessmentType) {
        const names = {
            'reading': 'Reading Ability',
            'listening': 'Listening Ability', 
            'jumbled': 'Jumbled Sentences',
            'story': 'Story Summarization',
            'personal': 'Personal Questions',
            'comprehension': 'Reading Comprehension',
            'fillblanks': 'Fill in the Blanks'
        };
        return names[assessmentType] || assessmentType;
    }

    async showFinalResults() {
        try {
            // Get final scores from server
            const response = await fetch('/api/assessment/scores');
            const scoresData = await response.json();
            
            // Update local scores with server data
            this.scores.reading = scoresData.readingAbility || 0;
            this.scores.listening = scoresData.listeningAbility || 0;
            this.scores.jumbled = scoresData.jumbledSentences || 0;
            this.scores.story = scoresData.storySummarization || 0;
            this.scores.personal = scoresData.personalQuestions || 0;
            this.scores.comprehension = scoresData.readingComprehension || 0;
            this.scores.fillblanks = scoresData.fillInTheBlanks || 0;
            this.scores.overall = scoresData.overallScore || 0;

            this.hideAllSections();
            document.getElementById('final-results').style.display = 'block';
            document.getElementById('assessment-nav').style.display = 'none';

            // Update overall score
            document.getElementById('overall-score').textContent = Math.round(this.scores.overall);

            // Update detailed scores
            this.updateDetailedScores();
            
            // Animate score bars
            setTimeout(() => {
                this.animateScoreBars();
            }, 500);
            
        } catch (error) {
            console.error('Error fetching final scores:', error);
            this.showMessage('Error loading final results. Please try again.', 'error');
        }
    }

    updateDetailedScores() {
        // Reading score
        document.getElementById('reading-final-score').textContent = Math.round(this.scores.reading);
        document.getElementById('reading-score-bar').style.width = '0%';

        // Listening score
        document.getElementById('listening-final-score').textContent = Math.round(this.scores.listening);
        document.getElementById('listening-score-bar').style.width = '0%';

        // Jumbled score
        document.getElementById('jumbled-final-score').textContent = Math.round(this.scores.jumbled);
        document.getElementById('jumbled-score-bar').style.width = '0%';

        // Story score
        document.getElementById('story-final-score').textContent = Math.round(this.scores.story);
        document.getElementById('story-score-bar').style.width = '0%';

        // Personal score
        document.getElementById('personal-final-score').textContent = Math.round(this.scores.personal);
        document.getElementById('personal-score-bar').style.width = '0%';

        // Comprehension score
        document.getElementById('comprehension-final-score').textContent = Math.round(this.scores.comprehension);
        document.getElementById('comprehension-score-bar').style.width = '0%';

        // Fill Blanks score
        document.getElementById('fillblanks-final-score').textContent = Math.round(this.scores.fillblanks);
        document.getElementById('fillblanks-score-bar').style.width = '0%';
    }

    animateScoreBars() {
        // Animate score bars with delays
        setTimeout(() => {
            document.getElementById('reading-score-bar').style.width = `${this.scores.reading}%`;
        }, 200);

        setTimeout(() => {
            document.getElementById('listening-score-bar').style.width = `${this.scores.listening}%`;
        }, 400);

        setTimeout(() => {
            document.getElementById('jumbled-score-bar').style.width = `${this.scores.jumbled}%`;
        }, 600);

        setTimeout(() => {
            document.getElementById('story-score-bar').style.width = `${this.scores.story}%`;
        }, 800);

        setTimeout(() => {
            document.getElementById('personal-score-bar').style.width = `${this.scores.personal}%`;
        }, 1000);

        setTimeout(() => {
            document.getElementById('comprehension-score-bar').style.width = `${this.scores.comprehension}%`;
        }, 1200);

        setTimeout(() => {
            document.getElementById('fillblanks-score-bar').style.width = `${this.scores.fillblanks}%`;
        }, 1400);
    }

    restartAssessment() {
        this.currentStep = 0;
        this.completedAssessments = [];
        this.scores = { reading: 0, listening: 0, jumbled: 0, story: 0, personal: 0, comprehension: 0, fillblanks: 0, overall: 0 };
        this.resetServerState();
        this.showWelcomeSection();
    }

    showMessage(message, type = 'info') {
        // Create message element if it doesn't exist
        let messageDiv = document.getElementById('global-message');
        if (!messageDiv) {
            messageDiv = document.createElement('div');
            messageDiv.id = 'global-message';
            messageDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 5px;
                font-weight: 500;
                z-index: 1000;
                min-width: 300px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                transition: all 0.3s ease;
            `;
            document.body.appendChild(messageDiv);
        }

        // Set message content and styling based on type
        messageDiv.textContent = message;
        messageDiv.className = `message-${type}`;
        
        const colors = {
            success: { bg: '#d4edda', border: '#c3e6cb', text: '#155724' },
            warning: { bg: '#fff3cd', border: '#ffeaa7', text: '#856404' },
            error: { bg: '#f8d7da', border: '#f5c6cb', text: '#721c24' },
            info: { bg: '#d1ecf1', border: '#bee5eb', text: '#0c5460' }
        };
        
        const color = colors[type] || colors.info;
        messageDiv.style.backgroundColor = color.bg;
        messageDiv.style.borderLeft = `4px solid ${color.border}`;
        messageDiv.style.color = color.text;
        messageDiv.style.display = 'block';
        messageDiv.style.opacity = '1';

        // Auto-hide message after 4 seconds
        setTimeout(() => {
            messageDiv.style.opacity = '0';
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 300);
        }, 4000);
    }

    // Public method for assessment modules to report completion
    onAssessmentComplete(assessmentType, score) {
        this.markAssessmentComplete(assessmentType, score);
    }

    // Utility method to get current assessment type
    getCurrentAssessmentType() {
        if (this.currentStep >= this.assessmentSections.length) {
            return null;
        }
        return this.assessmentSections[this.currentStep];
    }

    // Method to check if assessment is completed
    isAssessmentCompleted(assessmentType) {
        return this.completedAssessments.includes(assessmentType);
    }
}

// Initialize the assessment controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.assessmentController = new AssessmentController();
    console.log('Communication Assessment Suite initialized');
}); 