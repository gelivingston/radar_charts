// DORA Archetypes data
const archetypesData = {
    'Foundational Challenges': [0.5, 1, 1.5, 2.5, 1, 1, 3, 3],
    'Legacy bottleneck': [0.5, 1, 1.5, 3, 2, 2, 2, 2],
    'Constrained by process': [2, 2, 2, 2, 1.5, 1.5, 3, 3],
    'High impact, low cadence': [3, 3, 2, 4, 3, 3, 1, 1],
    'Stable and methodical': [2, 2, 1.5, 2, 2.5, 2.5, 2, 1.5],
    'Pragmatic performers': [2, 2, 2.5, 1.5, 2, 2, 2, 2],
    'Harmonious high achiever': [3, 3, 2.5, 1.5, 3, 3, 1, 1]
};

const dimensions = [
    'Team Performance',
    'Product Performance',
    'Software Delivery Throughput',
    'Software Delivery Instability',
    'Individual Effectiveness',
    'Valuable Work',
    'Friction',
    'Burnout'
];

const negativeDimensions = ['Friction', 'Burnout', 'Software Delivery Instability'];

const chartColors = {
    userInput: '#667eea',
    archetype: '#ff6b6b'
};

let userScores = {};
let charts = {};

// Initialize the form
function initializeForm() {
    const formGrid = document.getElementById('scoreForm');
    formGrid.innerHTML = '';

    dimensions.forEach((dim, idx) => {
        const isNegative = negativeDimensions.includes(dim);
        const hint = isNegative ? '(lower is better)' : '(higher is better)';

        const html = `
            <div class="form-group">
                <label>${dim} ${hint}</label>
                <div class="score-input">
                    ${[0, 1, 2, 3, 4].map(score => `
                        <button class="score-button" onclick="setScore('${dim}', ${score})" data-dim="${dim}" data-score="${score}">
                            ${score}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
        formGrid.innerHTML += html;
    });
}

// Set individual score
function setScore(dimension, score) {
    userScores[dimension] = score;

    // Update button styles
    document.querySelectorAll(`[data-dim="${dimension}"]`).forEach(btn => {
        if (parseInt(btn.dataset.score) === score) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
}

// Switch between tabs
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));

    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

// Update file name display
function updateFileName() {
    const fileInput = document.getElementById('csvFile');
    const fileName = document.getElementById('fileName');

    if (fileInput.files.length > 0) {
        fileName.textContent = `Selected: ${fileInput.files[0].name}`;
    } else {
        fileName.textContent = 'No file selected';
    }
}

// Parse CSV file
function parseCSV(text) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    const teamScores = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const teamName = values[0];
        const scores = {};

        dimensions.forEach((dim, idx) => {
            const headerIdx = headers.findIndex(h => {
                const h_lower = h.toLowerCase();
                const dim_lower = dim.toLowerCase().replace(/\s+/g, ' ');
                return h_lower.includes(dim_lower.split(' ')[0]);
            });

            if (headerIdx >= 0) {
                scores[dim] = parseFloat(values[headerIdx]);
            }
        });

        if (Object.keys(scores).length === dimensions.length) {
            teamScores.push({ name: teamName, scores });
        }
    }

    return teamScores;
}

// Calculate Euclidean distance
function euclideanDistance(scores1, scores2) {
    let sum = 0;
    dimensions.forEach(dim => {
        const v1 = scores1[dim] || 0;
        const v2 = scores2[dim] || 0;
        sum += Math.pow(v1 - v2, 2);
    });
    return Math.sqrt(sum);
}

// Find closest archetype
function findClosestArchetype(scores) {
    let closestArchetype = null;
    let minDistance = Infinity;
    let allDistances = {};

    Object.entries(archetypesData).forEach(([archetypeName, archetypeScores]) => {
        const archetypeScoreObj = {};
        dimensions.forEach((dim, idx) => {
            archetypeScoreObj[dim] = archetypeScores[idx];
        });

        const distance = euclideanDistance(scores, archetypeScoreObj);
        allDistances[archetypeName] = distance;

        if (distance < minDistance) {
            minDistance = distance;
            closestArchetype = archetypeName;
        }
    });

    // Calculate confidence (0-100)
    const distances = Object.values(allDistances).sort((a, b) => a - b);
    const maxDistance = Math.max(...Object.values(allDistances));
    const confidence = Math.round((1 - minDistance / maxDistance) * 100);

    return { archetype: closestArchetype, distance: minDistance, confidence, allDistances };
}

// Generate justification
function generateJustification(scores, archetypeName, allDistances) {
    const archetypeScoreObj = {};
    dimensions.forEach((dim, idx) => {
        archetypeScoreObj[dim] = archetypesData[archetypeName][idx];
    });

    const highlights = [];
    let strongMatches = 0;
    let strongDifferences = [];

    dimensions.forEach(dim => {
        const userScore = scores[dim];
        const archetypeScore = archetypeScoreObj[dim];
        const diff = Math.abs(userScore - archetypeScore);

        if (diff < 0.5) {
            strongMatches++;
        } else if (diff > 1.5) {
            strongDifferences.push(`${dim}: ${userScore} vs ${archetypeScore}`);
        }
    });

    const otherArchetypes = Object.entries(allDistances)
        .filter(([name]) => name !== archetypeName)
        .sort(([, d1], [, d2]) => d1 - d2)
        .slice(0, 2)
        .map(([name]) => name);

    let justification = `${archetypeName} is the best match. `;
    justification += `Your team's profile aligns well with this archetype profile, `;
    justification += `with strong alignment on ${strongMatches} dimensions. `;
    if (otherArchetypes.length > 0) {
        justification += `Other potential matches: ${otherArchetypes.join(', ')}.`;
    }

    return justification;
}

// Submit scores
async function submitScores() {
    const activeTab = document.querySelector('.tab-content.active');
    const isManualMode = activeTab.id === 'manual';

    let teamsData = [];

    if (isManualMode) {
        // Check if all scores are filled
        if (Object.keys(userScores).length !== dimensions.length) {
            showError('Please provide scores for all dimensions');
            return;
        }
        teamsData.push({ name: 'Your Team', scores: userScores });
    } else {
        // CSV mode
        const fileInput = document.getElementById('csvFile');
        if (!fileInput.files.length) {
            showError('Please select a CSV file');
            return;
        }

        try {
            const text = await fileInput.files[0].text();
            teamsData = parseCSV(text);

            if (teamsData.length === 0) {
                showError('No valid teams found in CSV');
                return;
            }
        } catch (e) {
            showError('Error parsing CSV: ' + e.message);
            return;
        }
    }

    // Generate results
    displayResults(teamsData);
}

// Display results
function displayResults(teamsData) {
    const resultsContainer = document.getElementById('resultsContainer');
    resultsContainer.innerHTML = '';

    teamsData.forEach((teamData, idx) => {
        const { archetype, confidence, allDistances } = findClosestArchetype(teamData.scores);
        const justification = generateJustification(teamData.scores, archetype, allDistances);

        const archetypeScoreObj = {};
        dimensions.forEach((dim, dimIdx) => {
            archetypeScoreObj[dim] = archetypesData[archetype][dimIdx];
        });

        const resultHTML = `
            <div style="margin-bottom: 60px; ${idx > 0 ? 'border-top: 2px solid #eee; padding-top: 40px;' : ''}">
                <div class="result-header">
                    <div class="archetype-name">${archetype}</div>
                    <div class="confidence-badge">Confidence: ${confidence}%</div>
                    <div class="justification">${justification}</div>
                </div>

                <div class="charts-section">
                    <div>
                        <div class="chart-title">Matched Archetype</div>
                        <div class="chart-container">
                            <canvas id="chartArchetype${idx}"></canvas>
                        </div>
                    </div>
                    <div>
                        <div class="chart-title">Your Team's Profile</div>
                        <div class="chart-container">
                            <canvas id="chartUser${idx}"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        `;

        resultsContainer.innerHTML += resultHTML;

        // Draw charts
        setTimeout(() => {
            drawRadarChart(`chartArchetype${idx}`, archetypeScoreObj, chartColors.archetype);
            drawRadarChart(`chartUser${idx}`, teamData.scores, chartColors.userInput);
        }, 0);
    });

    document.getElementById('resultsSection').classList.add('active');
    resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Draw radar chart
function drawRadarChart(canvasId, scores, color) {
    const ctx = document.getElementById(canvasId).getContext('2d');

    // Kill existing chart if it exists
    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }

    const data = dimensions.map(dim => scores[dim] || 0);

    charts[canvasId] = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: dimensions,
            datasets: [{
                label: 'Score',
                data: data,
                borderColor: color,
                backgroundColor: color + '33',
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: 4,
                pointBackgroundColor: color,
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.r.toFixed(1);
                        }
                    }
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 4,
                    ticks: {
                        stepSize: 1,
                        display: false
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    pointLabels: {
                        font: {
                            size: 11,
                            weight: '500'
                        },
                        color: '#333'
                    }
                }
            }
        }
    });
}

// Show error
function showError(message) {
    const resultsContainer = document.getElementById('resultsContainer');
    resultsContainer.innerHTML = `<div class="error">${message}</div>`;
    document.getElementById('resultsSection').classList.add('active');
}

// Reset form
function resetForm() {
    userScores = {};
    document.getElementById('csvFile').value = '';
    document.getElementById('fileName').textContent = 'No file selected';
    document.querySelectorAll('.score-button.selected').forEach(btn => btn.classList.remove('selected'));
    document.getElementById('resultsSection').classList.remove('active');
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initializeForm);
