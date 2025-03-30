class PlateletChart {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.chart = null;
        this.oneWeek = 7 * 24 * 60 * 60 * 1000;
        this.debounceTimeout = null;
    }

    debounce(func, wait) {
        clearTimeout(this.debounceTimeout);
        this.debounceTimeout = setTimeout(func, wait);
    }

    createChart(data) {
        if (this.chart) {
            this.chart.destroy();
        }

        const ctx = this.canvas.getContext('2d');
        
        // Prepare datasets
        const datasets = [
            {
                label: 'Platelet Counts',
                data: data.counts.map(c => ({
                    x: c.dateTime,
                    y: c.count
                })),
                backgroundColor: '#2196f3',
                pointRadius: 6,
                hitRadius: 10
            }
        ];

        // Add vertical lines for each transfusion
        data.results.forEach((result, index) => {
            let lineColor;
            if (!result.preCount || !result.postCount) {
                lineColor = '#9e9e9e';
            } else {
                lineColor = result.cci >= 7500 ? '#4caf50' : '#f44336';
            }

            datasets.push({
                label: `Transfusion ${index + 1}`,
                data: [
                    { x: result.transfusion.endDateTime, y: 0 },
                    { x: result.transfusion.endDateTime, y: null }
                ],
                borderColor: lineColor,
                borderDash: [5, 5],
                borderWidth: 2,
                pointRadius: 0,
                showLine: true
            });
        });

        const startTime = data.counts[0].dateTime.getTime();
        const endTime = data.counts[data.counts.length - 1].dateTime.getTime();
        const totalRange = endTime - startTime;

        const updateYAxis = () => {
            if (!this.chart || !this.chart.scales.x) return;
            
            const visiblePoints = this.chart.data.datasets[0].data.filter(point => {
                const x = point.x.getTime();
                return x >= this.chart.scales.x.min && x <= this.chart.scales.x.max;
            });
            
            if (visiblePoints.length === 0) return;
            
            const maxVisible = Math.max(...visiblePoints.map(p => p.y), 0);
            this.chart.options.scales.y.max = maxVisible + 10;
            
            this.chart.data.datasets.slice(1).forEach(dataset => {
                dataset.data[1].y = maxVisible + 10;
            });
        };

        const config = {
            type: 'scatter',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const point = context.raw;
                                if (!context.dataset.borderDash) {
                                    return `Count: ${point.y} at ${point.x.toLocaleString()}`;
                                } else {
                                    const result = data.results[parseInt(context.dataset.label.split(' ')[1]) - 1];
                                    let status = '';
                                    if (!result.preCount) status = '\nMissing pre-transfusion count';
                                    if (!result.postCount) status += '\nMissing post-transfusion count';
                                    if (result.cci) status = `\nCCI: ${Math.round(result.cci)}`;
                                    return `Transfusion at ${point.x.toLocaleString()}${status}`;
                                }
                            }
                        }
                    },
                    zoom: {
                        limits: {
                            x: {
                                min: startTime,
                                max: endTime,
                                minRange: this.oneWeek
                            },
                            y: {
                                min: 0
                            }
                        },
                        pan: {
                            enabled: true,
                            mode: 'x',
                            modifierKey: null,
                            threshold: 10,
                            onPan: () => this.debounce(updateYAxis, 100)
                        },
                        zoom: {
                            wheel: {
                                enabled: true,
                                mode: 'x',
                                speed: 0.1
                            },
                            pinch: {
                                enabled: true,
                                mode: 'x'
                            },
                            mode: 'x',
                            onZoomComplete: () => {
                                this.debounce(updateYAxis, 100);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            displayFormats: {
                                day: 'MMM d, yyyy'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Date/Time'
                        },
                        min: startTime,
                        max: endTime
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Platelet Count'
                        },
                        min: 0,
                        beginAtZero: true
                    }
                },
                animation: false,
                dragData: false,
                dragOptions: {
                    magnet: {
                        to: Math.round
                    }
                }
            }
        };

        this.chart = new Chart(ctx, config);
        updateYAxis();
    }

    resetZoom() {
        if (this.chart) {
            const startTime = this.chart.data.datasets[0].data[0].x.getTime();
            const endTime = this.chart.data.datasets[0].data[this.chart.data.datasets[0].data.length - 1].x.getTime();
            this.chart.scales.x.min = startTime;
            this.chart.scales.x.max = endTime;
            this.chart.update();
        }
    }
} 