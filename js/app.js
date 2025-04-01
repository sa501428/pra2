class PlateletApp {
    constructor() {
        this.calculator = new PlateletCalculator();
        this.chart = new PlateletChart('.chart-container');
        
        // Add reset zoom button handler
        document.getElementById('resetZoom').addEventListener('click', () => {
            this.chart.resetZoom();
        });
        
        this.settings = {
            minLookback: 0,
            maxLookback: 36,
            minAfter: 1,
            maxAfter: 120
        };
        this.initializeEventListeners();
        this.initializeModal();
        this.initializeTabs();
    }

    initializeTabs() {
        const tabs = document.querySelectorAll('.tab-button');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs and panes
                document.querySelectorAll('.tab-button').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding pane
                tab.classList.add('active');
                const pane = document.getElementById(tab.dataset.tab);
                pane.classList.add('active');

                // Redraw chart if switching to plot tab
                if (tab.dataset.tab === 'plot') {
                    this.chart.resize();
                }
            });
        });
    }

    initializeModal() {
        const modal = document.getElementById('settingsModal');
        const btn = document.getElementById('settingsButton');
        const span = document.getElementsByClassName('close')[0];
        const saveBtn = document.getElementById('saveSettings');

        btn.onclick = () => modal.style.display = 'block';
        span.onclick = () => modal.style.display = 'none';
        window.onclick = (e) => {
            if (e.target == modal) modal.style.display = 'none';
        };

        saveBtn.onclick = () => {
            this.settings = {
                minLookback: parseFloat(document.getElementById('minLookback').value),
                maxLookback: parseFloat(document.getElementById('maxLookback').value),
                minAfter: parseFloat(document.getElementById('minAfter').value),
                maxAfter: parseFloat(document.getElementById('maxAfter').value)
            };
            modal.style.display = 'none';
            this.calculate();
        };
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
            this.chart.createChart({
                counts: counts.sort((a, b) => a.dateTime - b.dateTime),
                transfusions,
                results
            });
        } catch (error) {
            // Handle error silently or show user-friendly message if needed
        }
    }

    processTransfusions(transfusions, counts, bsa, plateletUnits) {
        return transfusions.map(transfusion => {
            const preCount = this.calculator.findClosestCount(
                transfusion.endDateTime,
                counts,
                this.settings.maxLookback,
                true
            );

            const postCount = this.calculator.findClosestCount(
                transfusion.endDateTime,
                counts,
                this.settings.maxAfter / 60, // convert to hours
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
        const summary = document.getElementById('summaryText');
        tbody.innerHTML = '';

        // Only count results where CCI could be calculated
        const validResults = results.filter(r => r.cci !== null);
        const adequate = validResults.filter(r => r.cci >= 7500);
        const inadequate = validResults.filter(r => r.cci < 7500);

        let summaryText = '';
        
        if (inadequate.length > 0) {
            summaryText += `${inadequate.length} transfusion${inadequate.length > 1 ? 's' : ''} had an inadequate bump:\n`;
            inadequate.forEach(r => {
                const minutesAfter = Math.round((r.postCount.dateTime - r.transfusion.endDateTime) / (1000 * 60));
                summaryText += `• ${r.transfusion.date} at ${r.transfusion.endTime}, `;
                summaryText += `pre: ${r.preCount.count}, post: ${r.postCount.count} `;
                summaryText += `(${minutesAfter} mins after), CCI: ${Math.round(r.cci)}\n`;
            });
            summaryText += '\n';
        }

        if (adequate.length > 0) {
            summaryText += `${adequate.length} transfusion${adequate.length > 1 ? 's' : ''} had an adequate bump:\n`;
            adequate.forEach(r => {
                const minutesAfter = Math.round((r.postCount.dateTime - r.transfusion.endDateTime) / (1000 * 60));
                summaryText += `• ${r.transfusion.date} at ${r.transfusion.endTime}, `;
                summaryText += `pre: ${r.preCount.count}, post: ${r.postCount.count} `;
                summaryText += `(${minutesAfter} mins after), CCI: ${Math.round(r.cci)}\n`;
            });
        }

        summary.textContent = summaryText;

        results.forEach(result => {
            const row = document.createElement('tr');
            if (result.cci !== null) {
                row.className = result.cci >= 7500 ? 'adequate' : 'inadequate';
            }
            row.innerHTML = `
                <td>${result.transfusion.date} ${result.transfusion.endTime}</td>
                <td>${result.preCount ? result.preCount.count : '-'}</td>
                <td>${result.postCount ? result.postCount.count : '-'}</td>
                <td>${result.cci ? Math.round(result.cci) : '-'}</td>
            `;
            tbody.appendChild(row);
        });
    }

    formatResultLine(result) {
        return `${result.transfusion.date} ${result.transfusion.endTime}: ` +
            `Pre=${result.preCount ? result.preCount.count : '-'} ` +
            `Post=${result.postCount ? result.postCount.count : '-'} ` +
            `CCI=${result.cci ? Math.round(result.cci) : '-'}`;
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new PlateletApp();
}); 