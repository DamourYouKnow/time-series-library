import Utils from './utils';

/**
 * Represents a datapoint for a specific reference period.
 */
interface Point {
    refper: Date;
    value: number | null;
    metadata?: any;
}

/**
 * Represents a datapoint for a specific reference period.
 * @remarks `refper` is expected to be in `yyyy-mm-dd` format.
 */
interface PointStr {
    refper: string;
    value: number | null;
    metadata?: any;
}

type transformation = (a: number) => number;
type operation = (a: number, b: number) => number;
type nullableOperation = (a: number, b: number) => number | null;

/**
 * A collection of @see Point objects over time.
 */
class Vector {
    private _data: Point[]; 

    /**
     * Create a new @see Vector representing time series data.
     * @param data - Array of datapoints.
     */
    constructor(data?: Point[] | PointStr[]) {
        if (data && data.length > 0) {
            if (Vector.isPointStr(data[0])) {
                this._data = (data as PointStr[]).map(Vector.formatPoint);
            } else {
                this._data = data as Point[];
            }
        } else {
            this._data = [];
        }   
    }

    /**
     * @returns Datapoints in vector.
     */
    get data(): Point[] {
        return this._data;
    }

    /**
     * @return Length of vector.
     */
    get length(): number {
        return this.data.length;
    }

    /**
     * Gets the datapoint at a specific index.
     * @param index - Index, starting from 0.
     * @return Datapoint.
     */
    get(index: number): Point {
        return this.data[index];
    }

    /**
     * Gets the reference period of the datapoint at a specific index.
     * @param index Index, starting from 0.
     * @return Reference period.
     */
    refper(index: number): Date {
        return this.data[index].refper;
    }

    /**
     * Gets the reference period string of the datapoint at a specific index.
     * @param index Index, starting from 0.
     * @return Reference period string in yyyy-mm-dd format.
     */
    refperStr(index: number): string {
        return datestring(this.refper(index));
    }

    /**
     * Gets the value of a datapoint at a specific index.
     * @param index Index, starting from 0.
     * @return Value.
     */
    value(index: number): number | null {
        return this.data[index].value;
    }

    /**
     * Gets an array of all values in a vector.
     * @return Values.
     */
    values(): number[] {
        return this.map((point: Point) => point.value);
    }

    /**
     * Appends a new datapoint to the end of a vector.
     * @param datapoint New datapoint.
     */
    push(point: Point | PointStr) {
        this.data.push(Vector.formatPoint(point));
    }

    /**
     * Checks if this vector is equal to another.
     * @param other Other vector.
     * @param  index Check equality of only a single datapoint at
     * this index. Equality of entire vector will be checked if undefined.
     * @return True if vectors are equal, otherwise false.
     */
    equals(other: Vector, index?: number): boolean {
        const pointEquals = (a: Point, b: Point): boolean => {
            return a.refper.getTime() == b.refper.getTime()
                && a.value == b.value;
        };
        if (index) return pointEquals(this.get(index), other.get(index));
        if (this.length !== other.length) return false;
        return !this.some((point, i) => !pointEquals(point, other.get(i)));
    }

    /**
     * @return Deep copy of a vector.
     */
    copy(): Vector {
        this.data.map
        return new Vector(
            this.map((point) => Vector.newPointValue(point, point.value)));
    }

    /**
     * Maps all datapoints in this vector.
     * @param fn Mapper function.
     * @return Map result.
     */
    map(fn: (val: Point, i: number, arr: Point[]) => any, th?: any): any[] {
        return this.data.map(fn, th);
    }

    /**
     * Finds the first datapoint in this vector matching a predicate condition.
     * @param fn  Predicate function.
     * @return Found datapoint. Returns null if none found.
     */
    find(
        fn: (val: Point, i: number, arr: Point[]) => any, 
        th?: any): Point | undefined {

        return this.data.find(fn, th);
    }

     /**
     * Returns true if there is a datapoint that matches a predicate condition.
     * @param fn Predicate function.
     * @return True if condition matched, otherwise false.
     */
    some(fn: (val: Point, i: number, arr: Point[]) => any, th?: any): boolean {
        return this.data.some(fn, th);
    }

    /**
     * Finds all datapoints in this vector matching a predicate condition.
     * @param fn Predicate function.
     * @return Filtered vector.
     */
    filter(
        fn: (val: Point, i: number, arr: Point[]) => boolean, 
        th?: any): Vector {
        
        return new Vector(this.data.filter(fn, th));
    }

    /**
     * Constrains this vector within a specified range.
     * @param startDate - Start of range (inclusive).
     * @param endDate - End of range (inclusive).
     * @return Range vector.
     */
    range(startDate: Date | string, endDate: Date | string): Vector {
        startDate = Utils.dateObject(startDate);
        endDate = Utils.dateObject(endDate);
        return this.filter((p) => p.refper >= startDate && p.refper <= endDate);
    }

    /**
     * Gets the vector containing up to the last N reference periods of this
     * vector.
     * @param n Last n reference periods.
     * @return Last n reference period vector.
     */
    latestN(n: number): Vector {
        if (n > this.length) throw Error('N > length of vector.');
        return new Vector(this.data.slice(-n));
    }

    /**
     * Checks if this vector is interoperable with another.
     * @param other Other vector.
     * @return True if vectors are interoperable, otherwise false.
     */
    interoperable(other: Vector): boolean {
        if (this.length != other.length) return false;
        return !this.some((point, i) => {
            return point.refper.getTime() != other.refper(i).getTime();
        });
    }

    /**
     * Gets the intersection of this vector with another.
     * @param others Other vectors.
     * @return Intersection result.
     */
    intersection(others: Vector[] | Vector): Vector {
        if (!Array.isArray(others)) others = [others];

        const refperCounts: {[date: number]: number} = {};

        const thisRefpers = this.data.map((p) => p.refper);
        const otherRefpers = others.reduce((acc: Date[], cur: Vector) => {
            return [...acc, ...cur.map((p: Point) => p.refper)];
        }, []);
        const refpers = [...thisRefpers, ...otherRefpers];

        refpers.map((refper) => {
            if (Number(refper) in refperCounts) refperCounts[Number(refper)]++;
            else refperCounts[Number(refper)] = 1;
        });

        return this.filter((p) => {
            return refperCounts[Number(p.refper)] == others.length + 1;
        });
    }

    /**
     * @return Sum of all values in a vector.
     */
    sum(): number {
        return this.reduce((acc, cur) => acc + cur, 0);
    }

    /**
     * @return Average of all non-null values in a vector.
     */
    average(): number | null {
        return this.length > 0 ? this.sum() / this.length : null;
    }

    /**
     * @return Maximum of all values in a vector.
     */
    max(): number {
        return Math.max(...this.values());
    }

    /**
     * @return Minimum of all values in a vector.
     */
    min(): number {
        return Math.min(...this.values());
    }
    
    /**
     * Reduce the values of this vector using a reducer function.
     * @param fn Reducer function.
     * @param init Initial value (defaults to first value in the vector).
     * @return Result of reduction.
     */
    reduce(
        fn: (acc: any, cur: any, i: number, arr: any[]) => any, 
        init?: any): any  {

        init = init === undefined ? this.value(0) : init;
        return this.map((p) => p.value).reduce(fn, init);
    }

    /**
     * Performs an operation between this vector and another.
     * @param other Other vector.
     * @param op Operation function.
     * @return Result of operation.
     */
    operate(other: Vector, op: operation): Vector {
        const a = this.intersection(other);
        const b = other.intersection(this);
        const data = a.data.map((pointA, i) => {
            return Vector.pointOperate(pointA, b.get(i), op);
        });
        return new Vector(data);
    }

    /**
     * Performs a period to period delta transformation on this vector.
     * @param op Delta operation.
     * @return Transformed vector.
     */
    periodDeltaTransformation(op: nullableOperation): Vector {
        const data = this.data.map((point, i, data) => {
            if (data[i-1] === undefined) {
                return Vector.newPointValue(point, null);
            }

            const last = data[i-1].value;
            const cur = data[i].value;
            if (last && cur) {
                return Vector.newPointValue(point, op(cur, last));
            }
            return Vector.newPointValue(point, null);
        });
        return new Vector(data);
    }

    /**
     * Performs a same period previous year delta transformation on this vector.
     * @param op Delta operation.
     * @return Transformed vector.
     */
    samePeriodPreviousYearTransformation(op: nullableOperation): Vector {
        // Only works on frequecnies > monthly for now.
        // Create dictionary mapping dates to values.
        const set: {[date: number]: Point} = {};
        for (const d of this.data) {
            const endOfMonth = new Date(
                d.refper.getFullYear(),
                d.refper.getMonth(),
                Utils.daysInMonth(d.refper.getFullYear(), d.refper.getMonth()));
            set[Number(endOfMonth)] = d;
        }

        const result = new Vector();
        for (const point of this.data) {
            const refper = point.refper;
            const previousYear = new Date(
                refper.getFullYear() - 1,
                refper.getMonth(),
                Utils.daysInMonth(refper.getFullYear() - 1, refper.getMonth()));

            if (Number(previousYear) in set) {
                result.push(
                    Vector.pointOperate(point, set[Number(previousYear)], op))
            } else {
                result.push(Vector.newPointValue(point, null))
            }
        }
        return result;
    }

    /**
     * Performs a transformation on each datapoint in a vector.
     * @param op Transformation operation.
     * @return Transformed vector.
     */
    periodTransformation(op: transformation): Vector {
        const data = this.data.map((point) => {
            if (point.value) {
                return Vector.newPointValue(point, op(point.value));
            }
            return Vector.newPointValue(point, null);
        });
        return new Vector(data);
    }

    /**
     * Get the period to period percentage change vector of this vector.
     * @return Transformed vector.
     */
    periodToPeriodPercentageChange(): Vector {
        return this.periodDeltaTransformation(percentageChange);
    }

    /**
     * Get the period to period difference vector of this vector.
     * @return Transformed vector.
     */
    periodToPeriodDifference(): Vector {
        return this.periodDeltaTransformation((cur, last) => cur - last);
    }

    /**
     * Get the same period previous year percentage change vector of this
     * vector.
     * @return Transformed vector.
     */
    samePeriodPreviousYearPercentageChange(): Vector {
        return this.samePeriodPreviousYearTransformation(percentageChange);
    }

    /**
     * Get the same period previous year difference vector of this vector.
     * @return Transformed vector.
     */
    samePeriodPreviousYearDifference(): Vector {
        return this.samePeriodPreviousYearTransformation((cur, last) => {
            return cur - last;
        });
    }

    /**
     * Convert vector to a lower frequency.
     * @param mode "last" (default), "sum", "average", "max", "min".
     * @param converter Converter function.
     */
    convertToFrequency(
        mode: string, converter: (cur: Date, last: Date) => boolean): Vector {
        const split = Vector.frequencySplit(this, converter);
        return Vector.frequencyJoin(split, mode);
    }

    /**
     * Converts vector to quinquennial frequency.
     * @param mode "last" (default), "sum", "average", "max", "min".
     * @return Converted vector.
     */
    quinquennial(mode: string='last'): Vector {
        return Vector.convertToYearlyFrequency(this, mode, 5);
    }

    /**
     * Converts vector to tri-annual frequency.
     * @param mode "last" (default), "sum", "average", "max", "min".
     * @return Converted vector.
     */
    triAnnual(mode: string='last'): Vector {
        return Vector.convertToYearlyFrequency(this, mode, 3);
    }

    /**
     * Converts vector to bi-annual frequency.
     * @param mode "last" (default), "sum", "average", "max", "min".
     * @return Converted vector.
     */
    biAnnual(mode: string='last'): Vector {
        return Vector.convertToYearlyFrequency(this, mode, 2);
    }

    /**
     * Converts vector to annual frequency.
     * @param mode "last" (default), "sum", "average", "max", "min".
     * @return Converted vector.
     */
    annual(mode: string='last'): Vector {
        return Vector.convertToYearlyFrequency(this, mode, 1);
    }

    /**
     * Converts vector to semi-annual frequency.
     * @param mode "last" (default), "sum", "average", "max", "min".
     * @return Converted vector.
     */
    semiAnnual(mode: string='last'): Vector {
        return this.convertToFrequency(mode, (curr, last) => {
            return curr.getMonth() === (last.getMonth() + 6) % 12;
        });
    }

    /**
     * Converts vector to quarterly frequency.
     * @param mode "last" (default), "sum", "average", "max", "min".
     * @return Converted vector.
     */
    quarterly(mode: string='last'): Vector {
        return this.convertToFrequency(mode, (curr, last) => {
            return curr.getMonth() === (last.getMonth() + 3) % 12;
        });
    }

    /**
     * Converts vector to monthly frequency.
     * @param mode "last" (default), "sum", "average", "max", "min".
     * @return Converted vector.
     */
    monthly(mode: string='last'): Vector {
        return this.convertToFrequency(mode, (curr, last) => {
            return curr.getMonth() == (last.getMonth() + 1) % 12;
        });
    }

    /**
     * Converts vector to bi-monthly frequency.
     * @param "last" (default), "sum", "average", "max", "min".
     * @return Converted vector.
     */
    biMonthly(mode: string='last'): Vector {
        return this.convertToFrequency(mode, (curr, last) => {
            return curr.getMonth() == (last.getMonth() + 2) % 12;
        });
    }

    /**
     * Converts vector to weekly frequency.
     * @param mode "last" (default), "sum", "average", "max", "min".
     * @return Converted vector.
     */
    weekly(mode: string='last'): Vector {
        return this.convertToFrequency(mode, function(curr, last) {
            return curr.getDay() == last.getDay() &&
                curr.getDate() != last.getDate(); // FIXME: Should not be needed
        });
    }

    /**
     * Gets rounded vector.
     * @param decimals Number of decimal places (default=0).
     * @return Rounded vector.
     */
    round(decimals?: number): Vector {
        const data = this.data.map((point) => {
            if (point.value) {
                return Vector.newPointValue(
                    point, scalarRound(point.value, decimals));
            }
            return Vector.newPointValue(point, null);
        });
        return new Vector(data);
    }

    /**
     * Gets rounded vector using Banker's rounding algorithm.
     * @param decimals Number of decimal places (default=0).
     * @return Rounded vector.
     */
    roundBankers(decimals?: number): Vector {
        const data = this.data.map((point) => {
            if (point.value) {
                return Vector.newPointValue(
                    point, scalarRoundBankers(point.value, decimals));
            }
            return Vector.newPointValue(point, null);
        });
        return new Vector(data);
    }

    /**
     * @return Vector in JSON format.
     */
    json(): string {
        return JSON.stringify(this.data.map((point) => {
            return {
                'refper': datestring(point.refper),
                'value': point.value,
                'metadata': point.metadata
            };
        }));
    }

    private static maxMonth(vector: Vector) { 
        return Math.max(...vector.map((point) => point.refper.getMonth()));
    }

    private static convertToYearlyFrequency(
        vector: Vector, mode: string, years: number): Vector {

        const month = Vector.maxMonth(vector);
        vector = new Vector(Utils.dropWhile(vector.data, (point) => {
            return point.refper.getMonth() != month;
        }));
        return vector.convertToFrequency(mode, function(curr, last) {
            return curr.getFullYear() == last.getFullYear() + years;
        });
    }

    private static frequencySplit(
        vector: Vector, fn: (cur: Date, last: Date) => boolean): Vector[] {

        let result = [];
        const data = vector.data.reverse(); // Sort descending by time.
    
        let curr = data[0];
        let last = data[1];
        if (curr === undefined || last == undefined) {
            return [];
        }
    
        let next = [];
    
        for (let p = 0; p < data.length; p++) {
            last = data[p];
            // fn(curr, last)
            if (fn(curr.refper, last.refper)) {
                // Start new chunk.
                result.push(new Vector(next.reverse()));
                next = [];
                curr = data[p];
            }
            next.push(vector.get(p));
        }
        if (next.length > 0) {
            result.push(new Vector(next.reverse()));
        }
    
        // Ensure chunk sizes match the maximum to filter out periods.
        if (result.length > 0) {
            const size = Math.max.apply(null, result.map((v) => v.length));
            result = result.filter((chunk) => chunk.length == size);
        }
    
        return result.reverse();
    }

    private static frequencyJoin(split: Vector[], mode?: string): Vector {
        const modes: {[mode: string]: (vector: Vector) => Point} = {
            'last': (vector: Vector) => vector.get(vector.length - 1),
            'sum': (vector: Vector) => {
                return Vector.newPointValue(
                    vector.get(vector.length - 1), vector.sum());
            },
            'average': (vector: Vector) => {
                return Vector.newPointValue(
                    vector.get(vector.length - 1), vector.average());
            },
            'max': (vector: Vector) => {
                return Vector.newPointValue(
                    vector.get(vector.length - 1), vector.max());
            },
            'min': (vector: Vector) => {
                return Vector.newPointValue(
                    vector.get(vector.length - 1), vector.min());
            }
        };
    
        return new Vector(split.map((chunk) => modes[mode || 'last'](chunk)));
    }

    private static pointOperate(
        p1: Point, p2: Point, op: nullableOperation): Point {

        if (p1.value === null || p2.value === null) {
            return  Vector.newPointValue(p1, null);
        }
        return Vector.newPointValue(p1, op(p1.value, p2.value));
    }

    private static isPointStr(point: Point | PointStr) {
        return typeof point.refper === 'string';
    }

    private static formatPoint(point: Point | PointStr): Point {
        return {
            'refper': Utils.dateObject(point.refper), 
            'value': point.value,
            'metadata': point.metadata
        };
    }

    public static newPointValue(point: Point, newValue: number | null): Point {
        return {
            'refper': point.refper, 
            'value': newValue,
            'metadata': point.metadata
        };
    }
}


function percentageChange(curr: number, last: number): number | null {
    return last == 0 ? null : ((curr - last) / Math.abs(last)) * 100;
}

function datestring(date: Date): string {
    return date.getFullYear() + '-'
        + (date.getMonth() + 1).toString().padStart(2, '0') + '-'
        + date.getDate().toString().padStart(2, '0');
}

function scalarRound(value: number, decimals: number=0): number {
    return Number(Math.round(Number(`${value}e${decimals}`)) + `e-${decimals}`);
}

function scalarRoundBankers(value: number, decimals: number=0): number {
    const x = value * Math.pow(10, decimals);
    const r = Math.round(x);
    const br = Math.abs(x) % 1 === 0.5 ? (r % 2 === 0 ? r : r - 1) : r;
    return br / Math.pow(10, decimals);
}

export default Vector;