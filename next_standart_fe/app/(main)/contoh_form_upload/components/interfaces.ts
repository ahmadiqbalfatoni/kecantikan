import { FormPropsGlobal, StateGlobal, TablePropsGlobal } from '@/types/layout';
import { DataRekap } from '@/types/print-tools';
import { FormikProps } from 'formik';
import { FilterMatchMode } from 'primereact/api';

export type PaymentMethodType =
    | 'MANUAL_TRANSFER'
    | 'PG_VA'
    | 'PG_QRIS'
    | 'PG_EWALLET'
    | 'PG_CREDIT_CARD'
    | 'PG_RETAIL';

export type AdminFeeType = 'FIXED' | 'PERCENTAGE';

export interface InitValue {
    id?: number;
    method_code: string;
    method_type: PaymentMethodType;
    name: string;
    description: string | null;

    logo_url: string | null;
    logo: File | null;

    bank_name: string | null;
    account_number: string | null;
    account_name: string | null;

    pg_provider: string | null;
    pg_channel_code: string | null;

    admin_fee_type: AdminFeeType;
    admin_fee_value: number;
    requires_unique_code: boolean; // Menampung tinyint(1) dari database

    status: boolean; // Default aktif di UI (boolean) -> cast ke 1 / 0 saat simpan
    tz: string;
}

export interface TableData {
    id: number;
    method_code: string;
    method_type: PaymentMethodType;
    name: string;
    description: string | null;
    logo_url: string | null;

    bank_name: string | null;
    account_number: string | null;
    account_name: string | null;

    pg_provider: string | null;
    pg_channel_code: string | null;

    admin_fee_type: AdminFeeType;
    admin_fee_value: number;
    requires_unique_code: 1 | 0;

    status: 1 | 0;
    tz: string;
    created_at: string | Date | null;
    updated_at: string | Date | null;
}

export interface State extends StateGlobal {
    submittedData: InitValue | null;
    filters: {
        global: {
            value: string | null;
            matchMode: FilterMatchMode;
        };
        method_type: {
            value: PaymentMethodType | null;
            matchMode: FilterMatchMode;
        };
        status: {
            value: number | null;
            matchMode: FilterMatchMode;
        };
    };
    data: TableData[];
    selectedData: TableData[];
}

export interface TableProps extends TablePropsGlobal {
    dataRekap: DataRekap;
    setDataRekap: React.Dispatch<React.SetStateAction<DataRekap>>;
    state: State;
    formik: FormikProps<InitValue>;
    setState: React.Dispatch<React.SetStateAction<State>>;
}

export interface FormProps extends FormPropsGlobal {
    state: State;
    formik: FormikProps<InitValue>;
    setState: React.Dispatch<React.SetStateAction<State>>;
}