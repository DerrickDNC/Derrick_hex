import { Inject, Service } from 'typedi';
import { IsNull, MoreThan, Or, Repository } from 'typeorm';
import { AppDataSource } from '../data-source.js';
import { BannedIp } from '../../shared/app/models/index.js';

@Service()
export default class BannedIpService
{
    constructor(
        @Inject('Repository<BannedIp>')
        private bannedIpRepository: Repository<BannedIp>,
    ) {}

    private isAvailable(): boolean
    {
        return AppDataSource.isInitialized;
    }

    async getActiveBan(ip: string)
    {
        if (!this.isAvailable()) {
            return null;
        }

        try {
            return await this.bannedIpRepository.findOneBy({
                ip,
                bannedUntil: Or(IsNull(), MoreThan(new Date())),
            });
        } catch (error) {
            if (error instanceof Error && error.name === 'EntityMetadataNotFoundError') {
                return null;
            }

            throw error;
        }
    }

    async getActiveBans(): Promise<BannedIp[]>
    {
        if (!this.isAvailable()) {
            return [];
        }

        try {
            return await this.bannedIpRepository.find({
                where: { bannedUntil: Or(IsNull(), MoreThan(new Date())) },
                order: { bannedAt: 'desc' },
            });
        } catch (error) {
            if (error instanceof Error && error.name === 'EntityMetadataNotFoundError') {
                return [];
            }

            throw error;
        }
    }

    async banIp(ip: string, bannedUntil: Date, reason: string): Promise<void>
    {
        if (!this.isAvailable()) {
            return;
        }

        try {
            await this.bannedIpRepository
                .createQueryBuilder()
                .insert()
                .into(BannedIp)
                .values({ ip, bannedAt: new Date(), bannedUntil, reason })
                .orUpdate(['bannedAt', 'bannedUntil', 'reason'], ['ip'])
                .execute()
            ;
        } catch (error) {
            if (error instanceof Error && error.name === 'EntityMetadataNotFoundError') {
                return;
            }

            throw error;
        }
    }
}
