class PlateletCalculator {
    constructor() {
        this.MIN_CCI_THRESHOLD = 7500;
    }

    calculateBSA(weight, height) {
        if (weight <= 0 || height <= 0) {
            throw new Error('Weight and height must be positive numbers');
        }
        return Math.sqrt((height * weight) / 3600);
    }

    calculateCCI(postCount, preCount, bsa, plateletUnits) {
        if (postCount < 0 || preCount < 0 || bsa <= 0 || plateletUnits <= 0) {
            throw new Error('All parameters must be positive numbers');
        }
        return ((postCount - preCount) * 1000 * bsa) / plateletUnits;
    }

    parseTransfusions(text) {
        const regex = /(\d{2}\/\d{2}\/\d{2})\s+(\d{4})\s+to\s+(\d{4})/g;
        const transfusions = [];
        let match;

        while ((match = regex.exec(text)) !== null) {
            const [_, date, startTime, endTime] = match;
            transfusions.push({
                date,
                startTime,
                endTime,
                startDateTime: this.parseDateTime(date, startTime),
                endDateTime: this.parseDateTime(date, endTime)
            });
        }

        return transfusions;
    }

    parsePlateletCounts(text) {
        const regex = /(\d{2}\/\d{2}\/\d{2})\s+(\d{2}):(\d{2})\n(?:PLT:|Platelets:)\s+(\d+)/g;
        const counts = [];
        let match;

        while ((match = regex.exec(text)) !== null) {
            const [_, date, hours, minutes, count] = match;
            counts.push({
                date,
                time: `${hours}:${minutes}`,
                count: parseInt(count),
                dateTime: new Date(`20${date} ${hours}:${minutes}`)
            });
        }

        return counts.sort((a, b) => a.dateTime - b.dateTime);
    }

    parseDateTime(date, time) {
        const [hours, minutes] = [time.slice(0, 2), time.slice(2)];
        return new Date(`20${date} ${hours}:${minutes}`);
    }

    findClosestCount(targetDateTime, counts, hoursRange, isPreCount) {
        const matchingCounts = counts.filter(count => {
            const timeDiff = (count.dateTime - targetDateTime) / (1000 * 60 * 60);
            if (isPreCount) {
                return timeDiff < 0 && timeDiff >= -hoursRange;
            } else {
                return timeDiff > 0 && timeDiff <= hoursRange;
            }
        });

        if (matchingCounts.length === 0) return null;

        return matchingCounts.reduce((closest, current) => {
            const closestDiff = Math.abs(closest.dateTime - targetDateTime);
            const currentDiff = Math.abs(current.dateTime - targetDateTime);
            return currentDiff < closestDiff ? current : closest;
        });
    }
} 