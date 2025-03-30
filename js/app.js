class PlateletApp {
    constructor() {
        this.calculator = new PlateletCalculator();
        this.chart = new PlateletChart('plateletChart');
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const inputs = ['weight', 'height', 'plateletUnits', 'transfusionData', 'plateletCounts'];
        inputs.forEach(id => {
            document.getElementById(id).addEventListener('input', () => this.calculate());
        });
    }

    calculate() {
        try {
            const weight = parseFloat(document.getElementById('weight').value);
            const height = parseFloat(document.getElementById('height').value);
            const plateletUnits = parseFloat(document.getElementById('plateletUnits').value);
            const transfusionText = document.getElementById('transfusionData').value;
            const plateletText = document.getElementById('plateletCounts').value;

            if (!weight || !height || !plateletUnits) return;

            const bsa = this.calculator.calculateBSA(weight, height);
            const transfusions = this.calculator.parseTransfusions(transfusionText);
            const counts = this.calculator.parsePlateletCounts(plateletText);

            const results = this.processTransfusions(transfusions, counts, bsa, plateletUnits);
            this.updateResults(results);
            this.chart.createChart({ counts, transfusions, results });
        } catch (error) {
            console.error('Calculation error:', error);
        }
    }

    processTransfusions(transfusions, counts, bsa, plateletUnits) {
        return transfusions.map(transfusion => {
            const preCount = this.calculator.findClosestCount(
                transfusion.startDateTime,
                counts,
                36,
                true
            );

            const postCount = this.calculator.findClosestCount(
                transfusion.endDateTime,
                counts,
                2,
                false
            );

            let cci = null;
            if (preCount && postCount) {
                cci = this.calculator.calculateCCI(
                    postCount.count,
                    preCount.count,
                    bsa,
                    plateletUnits
                );
            }

            return {
                transfusion,
                preCount,
                postCount,
                cci
            };
        });
    }

    updateResults(results) {
        const tbody = document.getElementById('resultsBody');
        tbody.innerHTML = '';

        results.forEach(result => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${result.transfusion.date} ${result.transfusion.startTime}</td>
                <td>${result.preCount ? result.preCount.count : '-'}</td>
                <td>${result.postCount ? result.postCount.count : '-'}</td>
                <td>${result.cci ? Math.round(result.cci) : '-'}</td>
                <td class="${result.cci >= 7500 ? 'adequate' : 'inadequate'}">
                    ${result.cci ? (result.cci >= 7500 ? 'Adequate' : 'Inadequate') : '-'}
                </td>
            `;
            tbody.appendChild(row);
        });
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new PlateletApp();
}); 