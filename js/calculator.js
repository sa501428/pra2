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
        const regex = /(\d{2}\/\d{2}\/\d{2})\s+([0-2]\d[0-5]\d)\s*to\s*([0-2]\d[0-5]\d)/g;
        const transfusions = [];
        let match;

        while ((match = regex.exec(text)) !== null) {
            const [_, date, startTime, endTime] = match;
            const startDateTime = this.parseDateTime(date, startTime);
            const endDateTime = this.parseDateTime(date, endTime);
            
            transfusions.push({
                date,
                startTime,
                endTime,
                startDateTime,
                endDateTime
            });
        }

        return transfusions;
    }

    parsePlateletCounts(text) {
        const regex = /(\d{2}\/\d{2}\/\d{2})\s+([0-2][0-9]):([0-5][0-9])\s*[\r\n]+(?:PLT(?: \([A-Za-z\s]+\))?:|Platelets(?: \([A-Za-z\s]+\))?:)\s*(\d+)/g;

        const counts = [];
        let match;

        while ((match = regex.exec(text)) !== null) {
            const [_, date, hours, minutes, count] = match;
            counts.push({
                date,
                time: `${hours}:${minutes}`,
                count: parseInt(count),
                dateTime: this.parseDateTime(date, `${hours}:${minutes}`)
            });
        }

        return counts.sort((a, b) => a.dateTime - b.dateTime);
    }

    parseDateTime(date, time) {
        let hours, minutes;
        if (time.includes(':')) {
            [hours, minutes] = time.split(':');
        } else {
            hours = time.slice(0, 2);
            minutes = time.slice(2);
        }
        
        // Parse MM/DD/YY format to YYYY-MM-DD
        const [month, day, year] = date.split('/');
        const isoDate = `20${year}-${month}-${day}`;
        
        // Create date string in ISO format
        const dateTimeStr = `${isoDate}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;
        
        return new Date(dateTimeStr);
    }

    findClosestCount(targetDateTime, counts, hoursRange, isPreCount) {
        // Early exit if no counts
        if (!counts.length) return null;
        
        const targetTime = targetDateTime.getTime();
        const hourInMs = 60 * 60 * 1000;
        const rangeInMs = hoursRange * hourInMs;

        // Binary search for the insertion point
        let left = 0;
        let right = counts.length - 1;
        
        // Find the closest index to our target time
        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const midTime = counts[mid].dateTime.getTime();
            
            if (midTime === targetTime) {
                left = mid;
                break;
            } else if (midTime < targetTime) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
        
        // For pre-counts, look at elements before the insertion point
        // For post-counts, look at elements after the insertion point
        let bestMatch = null;
        let bestDiff = Infinity;

        if (isPreCount) {
            // Search backwards for pre-counts
            for (let i = left - 1; i >= 0; i--) {
                const timeDiff = targetTime - counts[i].dateTime.getTime();
                if (timeDiff > rangeInMs) break; // Too far back
                if (timeDiff > 0 && timeDiff < bestDiff) {
                    bestMatch = counts[i];
                    bestDiff = timeDiff;
                }
            }
        } else {
            // Search forwards for post-counts
            for (let i = left; i < counts.length; i++) {
                const timeDiff = counts[i].dateTime.getTime() - targetTime;
                if (timeDiff > rangeInMs) break; // Too far ahead
                if (timeDiff > 0 && timeDiff < bestDiff) {
                    bestMatch = counts[i];
                    bestDiff = timeDiff;
                }
            }
        }

        return bestMatch;
    }
} 