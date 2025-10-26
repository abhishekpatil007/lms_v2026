import { Op } from 'sequelize';
import Batch from '../models/batch.js';

export async function updateBatchStatusIfNeeded(batch) {
    const today = new Date();
    let newStatus = batch.status;

    if (batch.start_date && batch.end_date) {
        const start = new Date(batch.start_date);
        const end = new Date(batch.end_date);

        if (today < start) newStatus = 'draft';
        else if (today >= start && today <= end) newStatus = 'ongoing';
        else if (today > end) newStatus = 'completed';
    }

    if (newStatus !== batch.status) {
        await Batch.update({ status: newStatus }, { where: { id: batch.id } });
        batch.status = newStatus;
    }

    return batch;
}
