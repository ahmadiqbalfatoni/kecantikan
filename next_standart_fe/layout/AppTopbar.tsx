/* eslint-disable @next/next/no-img-element */


import Link from 'next/link';
import { classNames } from 'primereact/utils';
import React, { forwardRef, useContext, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { AppTopbarRef } from '@/types';
import { LayoutContext } from './context/layoutcontext';
import { signOut, useSession } from 'next-auth/react';
import { OverlayPanel } from 'primereact/overlaypanel';
import { formatDateSystem } from '@/lib/tools/dateTools';

const AppTopbar = forwardRef<AppTopbarRef>((props, ref) => {
    const { data: session } = useSession()
    const { layoutConfig, layoutState, onMenuToggle, showProfileSidebar } = useContext(LayoutContext);
    const menubuttonRef = useRef(null);
    const op = useRef<OverlayPanel>(null);
    const [realZonedTime, setRealZonedTime] = useState<String | null>("-");

    useEffect(() => {
        setRealZonedTime(formatDateSystem(new Date(), "EEEE, dd MMMM yyyy HH:mm:ss", null, 'id'));
        const timer = setInterval(() => {
            setRealZonedTime(formatDateSystem(new Date(), "EEEE, dd MMMM yyyy HH:mm:ss", null, 'id'));
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const handleLogout = () => {
        signOut()
    }

    return (
        <div className="layout-topbar">
            <div className='flex justify-content-between w-full align-items-center'>
                <div className='flex align-items-center'>
                    <Link href="/" className="layout-topbar-logo flex align-items-center gap-2" style={{ textDecoration: 'none', width: 'auto' }}>
                        <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            boxShadow: '0 3px 10px rgba(16, 185, 129, 0.28)',
                            flexShrink: 0
                        }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>spa</span>
                        </div>
                        <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#10b981', letterSpacing: '-0.2px' }}>
                            Klinik Kecantikan
                        </span>
                    </Link>

                    <button ref={menubuttonRef} type="button" className="p-link layout-menu-button layout-topbar-button" onClick={onMenuToggle}>
                        <i className="pi pi-bars" />
                    </button>
                </div>

                <div className="flex gap-2 align-items-center">
                    <div className='flex align-items-center'>
                        <div style={{ fontWeight: "bold", fontSize: "12px" }}>{realZonedTime}</div>
                        &nbsp;&nbsp;<b>|</b>&nbsp;&nbsp;
                        <div className="text-700">
                            {session?.user?.name}
                        </div>
                    </div>
                    <button type="button" className="p-link layout-topbar-button">
                        <i className="pi pi-bell"></i>
                        <span>Notification</span>
                    </button>
                    <button type="button" onClick={(e) => op?.current?.toggle(e)} className="p-link layout-topbar-button">
                        <i className="pi pi-user"></i>
                        <span>Log Out</span>
                    </button>
                    <OverlayPanel ref={op}>
                        <span className="p-link" onClick={() => handleLogout()}>
                            Log out
                        </span>
                    </OverlayPanel>
                </div>
            </div>
        </div>
    );
});

AppTopbar.displayName = 'AppTopbar';

export default AppTopbar;
