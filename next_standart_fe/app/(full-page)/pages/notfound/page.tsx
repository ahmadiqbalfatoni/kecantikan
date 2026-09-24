import React from 'react';
import Link from 'next/link';

const NotFoundPage = () => {
    return (
        <div className="surface-ground min-h-screen min-w-screen overflow-hidden" style={{ backgroundImage: 'linear-gradient(to top, #f9f9f9, #f9f9f9)' }}>

            {/* Gambar paling atas */}
            <div className="flex justify-content-center mt-4">
                <img
                    src={`/layout/images/download.gif`}
                    alt="logo sections"
                    style={{ maxWidth: "30%" }}
                />
            </div>

            {/* Konten tengah halaman */}
            <div className="flex align-items-center justify-content-center">
                <div className="flex flex-column align-items-center justify-content-center mt-4">
                    <h1 className="text-900 font-bold text-5xl mb-2">Oops, Not Found!</h1>
                    <div className="text-500 mb-5">Halaman tidak ditemukan.</div>

                    <Link href="/" className="text-green-500 hover:underline">
                        Kembali ke Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default NotFoundPage;
