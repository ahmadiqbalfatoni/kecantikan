'use client'
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Ripple } from 'primereact/ripple';
import { classNames } from 'primereact/utils';
import React, { useEffect, useContext, useRef } from 'react';
import { CSSTransition } from 'react-transition-group';
import { MenuContext } from './context/menucontext';
import { usePathname, useSearchParams } from 'next/navigation'
import { AppMenuItemProps } from '@/types';
import { Skeleton } from 'primereact/skeleton';
import { CalendarCheck, ClipboardList, UserPlus } from 'lucide-react';

/**
 * Komponen pembungkus label menu yang mendeteksi overflow 
 * dan menerapkan animasi marquee secara dinamis hanya saat hover.
 */
const MenuLabel = ({ label }: { label?: string }) => {
    const containerRef = useRef<HTMLSpanElement>(null);

    const handleMouseEnter = () => {
        const el = containerRef.current;
        if (!el) return;

        const scrollWidth = el.scrollWidth;
        const clientWidth = el.clientWidth;

        // Hanya jalankan animasi jika teks benar-benar terpotong (overflow)
        if (scrollWidth > clientWidth) {
            const scrollDistance = scrollWidth - clientWidth;

            // Set variabel CSS dinamis untuk jarak geser
            el.style.setProperty('--scroll-distance', `-${scrollDistance}px`);

            // Atur durasi secara proporsional (kecepatan konstan 40px per detik)
            const duration = Math.max(1, scrollDistance / 40);
            el.style.setProperty('--marquee-duration', `${duration}s`);

            el.classList.add('is-scrolling');
        }
    };

    const handleMouseLeave = () => {
        const el = containerRef.current;
        if (!el) return;

        // Reset state dan bersihkan inline styles untuk menghemat memory
        el.classList.remove('is-scrolling');
        el.style.removeProperty('--scroll-distance');
        el.style.removeProperty('--marquee-duration');
    };

    return (
        <span
            ref={containerRef}
            className="layout-menuitem-text truncate-marquee-container"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <span className="marquee-content">{label}</span>
        </span>
    );
};

const AppMenuitem = (props: AppMenuItemProps) => {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const nodeRef = useRef<HTMLUListElement>(null);
    const { activeMenu, setActiveMenu } = useContext(MenuContext);
    const item = props.item;
    const key = props.parentKey ? props.parentKey + '-' + props.index : String(props.index);
    const isActiveRoute = item!.to && pathname === item!.to;
    const active = true;

    const onRouteChange = (url: string) => {
        if (item!.to && item!.to === url) {
            setActiveMenu(key);
        }
    };

    useEffect(() => {
        onRouteChange(pathname);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname, searchParams]);

    const itemClick = (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
        if (item!.disabled) {
            event.preventDefault();
            return;
        }

        if (item!.command) {
            item!.command({ originalEvent: event, item: item });
        }

        if (item!.items) setActiveMenu(active ? (props.parentKey as string) : key);
        else setActiveMenu(key);
    };

    const subMenu = item!.items && item!.visible !== false && (
        <CSSTransition nodeRef={nodeRef} timeout={{ enter: 1000, exit: 450 }} classNames="layout-submenu" in={true} key={item!.label}>
            <ul ref={nodeRef}>
                {item!.items.map((child, i) => {
                    return <AppMenuitem item={child} index={i} className={child.badgeClass} parentKey={key} key={child.label} />;
                })}
            </ul>
        </CSSTransition>
    );

    return (
        <>
            {/* Inject style khusus untuk mendukung transisi hardware-accelerated */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .truncate-marquee-container {
                    display: inline-block;
                    overflow: hidden;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                    max-width: 100%;
                    vertical-align: middle;
                    position: relative;
                }
                .truncate-marquee-container.is-scrolling {
                    text-overflow: clip;
                }
                .truncate-marquee-container.is-scrolling .marquee-content {
                    display: inline-block;
                    animation: scroll-marquee-effect var(--marquee-duration, 4s) linear infinite alternate;
                }
                @keyframes scroll-marquee-effect {
                    0%, 15% {
                        transform: translate3d(0, 0, 0);
                    }
                    85%, 100% {
                        transform: translate3d(var(--scroll-distance, 0px), 0, 0);
                    }
                }
            `}} />

            {props.load ? (
                <li className="my-3">
                    <Skeleton className="py-4" />
                </li>
            ) : (
                <li className={classNames({ 'layout-root-menuitem': props.root, 'active-menuitem': active })}>
                    {props.root && item!.visible !== false && <div className="layout-menuitem-root-text">{item!.label}</div>}

                    {(!item!.to || item!.items) && item!.visible !== false ? (
                        <a href={item!.url} onClick={(e) => itemClick(e)} className={classNames(item!.class, 'p-ripple')} target={item!.target} tabIndex={0}>
                            {item!.icon === 'CalendarCheck' || item!.icon === 'lucide-calendar-check' ? (
                                <CalendarCheck className="layout-menuitem-icon" size={18} style={{ marginRight: '0.5rem' }} />
                            ) : item!.icon === 'ClipboardList' || item!.icon === 'lucide-clipboard-list' ? (
                                <ClipboardList className="layout-menuitem-icon" size={18} style={{ marginRight: '0.5rem' }} />
                            ) : item!.icon === 'UserPlus' || item!.icon === 'lucide-user-plus' ? (
                                <UserPlus className="layout-menuitem-icon" size={18} style={{ marginRight: '0.5rem' }} />
                            ) : (
                                <i className={classNames('layout-menuitem-icon', item!.icon)}></i>
                            )}
                            <MenuLabel label={item!.label} />
                            <Ripple />
                        </a>
                    ) : null}

                    {item!.to && !item!.items && item!.visible !== false ? (
                        <Link href={item!.to} replace={item!.replaceUrl} target={item!.target} onClick={(e) => itemClick(e)} className={classNames(item!.class, 'p-ripple', { 'active-route': isActiveRoute })} tabIndex={0}>
                            {item!.icon === 'CalendarCheck' || item!.icon === 'lucide-calendar-check' ? (
                                <CalendarCheck className="layout-menuitem-icon" size={18} style={{ marginRight: '0.5rem' }} />
                            ) : item!.icon === 'ClipboardList' || item!.icon === 'lucide-clipboard-list' ? (
                                <ClipboardList className="layout-menuitem-icon" size={18} style={{ marginRight: '0.5rem' }} />
                            ) : item!.icon === 'UserPlus' || item!.icon === 'lucide-user-plus' ? (
                                <UserPlus className="layout-menuitem-icon" size={18} style={{ marginRight: '0.5rem' }} />
                            ) : (
                                <i className={classNames('layout-menuitem-icon', item!.icon)}></i>
                            )}
                            <MenuLabel label={item!.label} />
                            <Ripple />
                        </Link>
                    ) : null}

                    {subMenu}
                </li>
            )}
        </>
    );
};

export default AppMenuitem;