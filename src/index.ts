import https from 'https';
import { RateLimiter } from 'limiter';
import os from 'os';

const USER_AGENT = `${os.platform()}:com.xoltia.whatismymmr-api-wrapper:v1.0.0`;

const limiter = new RateLimiter({ tokensPerInterval: 60, interval: 'minute' });

type RegionCode =  'na' | 'euw' | 'eune' | 'kr';

interface MMRs {
    ranked: RankedQueueData;
    normal: QueueData;
    ARAM: QueueData;
}

interface RankedQueueData extends QueueData {
    tierData: TierData[];
    historicalTierData: TierData[];
}

interface TierData extends ReducedTierData {
    min: number;
    max: number;
}

interface ReducedTierData {
    name: string;
    avg: number;
}

interface QueueData extends ReducedQueueData {
    historical: ReducedQueueData[];
    closestRank: string;
    percentile: number;
}

interface ReducedQueueData {
    avg: number;
    err: number;
    warn: boolean;
    timestamp: number;
}

type DistributionRange = { [mmr: `${number}`]: number };

interface DistributionData {
    ranked: DistributionRange;
    normal: DistributionRange;
    ARAM: DistributionRange;
}

interface Error {
    message: string,
    code: number
}


async function getData<T>(region: RegionCode, path: string): Promise<T> {
    await limiter.removeTokens(1);

    return new Promise((resolve, reject) => {
        https.get({
            hostname: `${region}.whatismymmr.com`,
            path: path,
            headers: {
                'User-Agent': USER_AGENT
            }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data))
                } else {
                    reject(JSON.parse(data).error);
                }
            });
        });
    });
}

/**
 * Returns the MMRs for a summoner.
 * See https://dev.whatismymmr.com/#summoner
 * @param name Summoner name
 * @param region Region code, defaults to NA
 * @param cb Optional callback in case you don't want to use promises
 * @returns A promise that resolves to MMRs
 */
function summoner(name: string, region: RegionCode='na', cb?: (resp?: MMRs, err?: Error) => void): Promise<MMRs> {
    const path = `/api/v1/summoner?name=${name}`;
    const dataPromise = getData<MMRs>(region, path);
    if (cb) {
        dataPromise.then(data => {
            cb(data, undefined);
        }, err => {
            cb(undefined, err);
        });
    }
    return dataPromise;
}

/**
 * See https://dev.whatismymmr.com/#distribution
 * @param region Region code, defaults to NA
 * @param cb Optional callback in case you don't want to use promises
 * @returns A promise that resolves to a range of scaled player numbers across all MMRs for each queue type
 */
async function distribution(region: RegionCode='na', cb?: (resp?: DistributionData, err?: Error) => void): Promise<DistributionData> {
    const path = `/api/v1/distribution`;
    const dataPromise = getData<DistributionData>(region, path);
    if (cb) {
        dataPromise.then(data => {
            cb(data, undefined);
        }, err => {
            cb(undefined, err);
        });
    }
    return dataPromise;
}

export {
    summoner,
    distribution
}
