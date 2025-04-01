class PlateletChart {
    constructor(container) {
        this.container = d3.select(container);
        this.margin = { top: 20, right: 20, bottom: 60, left: 50 };
        this.width = 0;
        this.height = 0;
        this.svg = null;
        this.xScale = d3.scaleTime();
        this.yScale = d3.scaleLinear();
        this.zoom = null;
        this.oneWeek = 7 * 24 * 60 * 60 * 1000;
        this.setupSVG();
    }

    setupSVG() {
        this.svg = this.container.append('svg')
            .style('width', '100%')
            .style('height', '100%');

        // Add clip path
        this.svg.append('defs')
            .append('clipPath')
            .attr('id', 'clip')
            .append('rect');

        // Add groups for axes and content
        this.xAxis = this.svg.append('g').attr('class', 'x-axis');
        this.yAxis = this.svg.append('g').attr('class', 'y-axis');
        this.plotArea = this.svg.append('g')
            .attr('class', 'plot-area')
            .attr('clip-path', 'url(#clip)');

        this.resize();
    }

    resize() {
        const bounds = this.container.node().getBoundingClientRect();
        this.width = bounds.width - this.margin.left - this.margin.right;
        this.height = bounds.height - this.margin.top - this.margin.bottom;

        this.svg
            .attr('viewBox', `0 0 ${bounds.width} ${bounds.height}`)
            .select('defs clipPath rect')
            .attr('width', this.width)
            .attr('height', this.height);

        this.plotArea.attr('transform', `translate(${this.margin.left},${this.margin.top})`);
        this.xAxis.attr('transform', `translate(${this.margin.left},${this.height + this.margin.top})`);
        this.yAxis.attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        if (this.currentData) {
            this.updateScales();
            this.draw();
        }
    }

    createChart(data) {
        this.currentData = data;
        
        // Setup scales
        const startTime = d3.min(data.counts, d => d.dateTime);
        const endTime = d3.max(data.counts, d => d.dateTime);
        const maxCount = d3.max(data.counts, d => d.count);

        this.xScale
            .domain([startTime, endTime])
            .range([0, this.width]);

        this.yScale
            .domain([0, maxCount + 10])
            .range([this.height, 0]);

        // Setup zoom
        this.zoom = d3.zoom()
            .scaleExtent([1, Math.max(1, (endTime - startTime) / this.oneWeek)])
            .extent([[0, 0], [this.width, this.height]])
            .translateExtent([[0, 0], [this.width, this.height]])
            .on('zoom', (event) => this.zoomed(event));

        this.svg.call(this.zoom);

        this.draw();
    }

    draw() {
        // Draw axes
        const xAxis = d3.axisBottom(this.xScale)
            .tickFormat(d3.timeFormat('%b %d, %Y'))
            .ticks(5)
            .tickSize(6);

        this.xAxis.call(xAxis)
            .selectAll("text")  
            .style("text-anchor", "start")
            .attr("dx", "0.5em")
            .attr("dy", "0.5em")
            .attr("transform", "rotate(45)");

        const yAxis = d3.axisLeft(this.yScale);
        this.yAxis.call(yAxis);

        // Draw points with smaller radius
        const points = this.plotArea.selectAll('circle.point')
            .data(this.currentData.counts);

        points.enter()
            .append('circle')
            .attr('class', 'point')
            .merge(points)
            .attr('cx', d => this.xScale(d.dateTime))
            .attr('cy', d => this.yScale(d.count))
            .attr('r', 4)
            .attr('fill', '#2196f3');

        points.exit().remove();

        // Draw transfusion lines
        const lines = this.plotArea.selectAll('line.transfusion')
            .data(this.currentData.results);

        lines.enter()
            .append('line')
            .attr('class', 'transfusion')
            .merge(lines)
            .attr('x1', d => this.xScale(d.transfusion.endDateTime))
            .attr('x2', d => this.xScale(d.transfusion.endDateTime))
            .attr('y1', this.yScale(0))
            .attr('y2', d => this.yScale(this.yScale.domain()[1]))
            .attr('stroke', d => {
                if (!d.preCount || !d.postCount) return '#9e9e9e';
                return d.cci >= 7500 ? '#4caf50' : '#f44336';
            })
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5');

        lines.exit().remove();
    }

    zoomed(event) {
        const newXScale = event.transform.rescaleX(this.xScale);
        const currentRange = newXScale.domain()[1] - newXScale.domain()[0];
        
        // Prevent zooming in beyond one week
        if (currentRange < this.oneWeek) {
            const center = (newXScale.domain()[1] + newXScale.domain()[0]) / 2;
            newXScale.domain([
                center - this.oneWeek / 2,
                center + this.oneWeek / 2
            ]);
        }

        // Apply the same x-axis formatting as in draw()
        this.xAxis.call(
            d3.axisBottom(newXScale)
                .tickFormat(d3.timeFormat('%b %d, %Y'))
                .ticks(5)
                .tickSize(6)
        )
        .selectAll("text")  
        .style("text-anchor", "start")
        .attr("dx", "0.5em")
        .attr("dy", "0.5em")
        .attr("transform", "rotate(45)");
        
        // Update points and lines positions
        this.plotArea.selectAll('circle.point')
            .attr('cx', d => newXScale(d.dateTime));
        
        this.plotArea.selectAll('line.transfusion')
            .attr('x1', d => newXScale(d.transfusion.endDateTime))
            .attr('x2', d => newXScale(d.transfusion.endDateTime));

        // Update Y axis based on visible points
        const visiblePoints = this.currentData.counts.filter(d => {
            const x = d.dateTime.getTime();
            return x >= newXScale.domain()[0] && x <= newXScale.domain()[1];
        });

        if (visiblePoints.length > 0) {
            const maxVisible = d3.max(visiblePoints, d => d.count);
            this.yScale.domain([0, maxVisible + 10]);
            this.yAxis.call(d3.axisLeft(this.yScale));

            // Update transfusion line heights
            this.plotArea.selectAll('line.transfusion')
                .attr('y2', this.yScale(maxVisible + 10));
        }
    }

    resetZoom() {
        this.svg.transition()
            .duration(750)
            .call(this.zoom.transform, d3.zoomIdentity);
    }
} 