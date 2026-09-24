/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File untuk transform data menjadi format yang sesuai untuk keperluan print tools
 * 
 * @author Fadil <risqullah.s.fadhilah@gmail.com>
 * @created 2026-07-14
 * 
 * @contributors
 * - Fadil <risqullah.s.fadhilah@gmail.com>
 * 
 * @lastModified Fadil (2026-08-03)
 * @version 1.0.1
 */

import { TransformOptions } from '@/types/print-tools';
import { formatDateSystem } from '../dateTools';

export function transformTableData(data: Record<string, any>[], options: TransformOptions = {}) {
    const { headerMap = {}, customFormatters = {}, excludeKeys = [], includeKeys } = options;

    const autoFormatHeader = (key: string) => {
        return key.replace(/_/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
    };

    return data.map((item) => {
        const transformedItem: Record<string, any> = {};

        Object.entries(item).forEach(([key, value]) => {
            if (excludeKeys.includes(key)) {
                return;
            }

            if (includeKeys && !includeKeys.includes(key)) {
                return;
            }

            const finalHeader = headerMap[key] || autoFormatHeader(key);

            let finalValue = value;
            if (customFormatters[key]) {
                finalValue = customFormatters[key](value);
            } else if (key.endsWith('_at') && value) {
                finalValue = formatDateSystem(value);
            }

            transformedItem[finalHeader] = finalValue;
        });

        return transformedItem;
    });
}
