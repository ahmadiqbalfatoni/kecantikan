/* eslint-disable @next/next/no-img-element */

import React, { useContext } from 'react';
import { LayoutContext } from './context/layoutcontext';

const AppFooter = () => {
    const { layoutConfig } = useContext(LayoutContext);

    return (
        <div className="layout-footer">
            <span className="font-medium text-color-secondary text-sm">
                &copy; 2024 Klinik Kecantikan. Seluruh hak cipta dilindungi.
            </span>
        </div>
    );
};

export default AppFooter;
