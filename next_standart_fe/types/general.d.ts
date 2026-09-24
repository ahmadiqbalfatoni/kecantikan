export interface CompanyConfig {
    [key: string]: string | undefined;
}

export interface StatusConfig {
    label: string;
    severity: 'contrast' | 'success' | 'secondary' | 'info' | 'warning' | 'danger' | null;
}
