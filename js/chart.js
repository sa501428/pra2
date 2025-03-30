class PlateletChart {
    constructor(canvasId) {
        this.ctx = document.getElementById(canvasId).getContext('2d');
        this.chart = null;
    }

    createChart(data) {
        if (this.chart) {
            this.chart.destroy();
        }

        const datasets = this.prepareDatasets(data);

        this.chart = new Chart(this.ctx, {
            type: 'scatter',
            data: {
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day'
                        },
                        title: {
                            display: true,
                            text: 'Date/Time'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Platelet Count'
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top'
                    }
                }
            }
        });
    }

    prepareDatasets(data) {
        const { counts, transfusions, results } = data;

        return [
            {
                label: 'Platelet Counts',
                data: counts.map(count => ({
                    x: count.dateTime,
                    y: count.count
                })),
                backgroundColor: '#2196f3',
                pointRadius: 5
            },
            {
                label: 'Adequate Response',
                data: results.filter(r => r.cci >= 7500).map(r => ({
                    x: r.transfusion.startDateTime,
                    y: r.preCount.count
                })),
                backgroundColor: '#4caf50',
                pointRadius: 5
            },
            {
                label: 'Inadequate Response',
                data: results.filter(r => r.cci < 7500).map(r => ({
                    x: r.transfusion.startDateTime,
                    y: r.preCount.count
                })),
                backgroundColor: '#f44336',
                pointRadius: 5
            }
        ];
    }
} 