import Button from '@mui/material/Button';

function ErrorPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen w-screen bg-gradient-to-r from-[#38014f]  to-[#130059] text-white px-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-28 h-28 mb-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <h2 className="text-3xl font-bold mb-2">404 - Sayfa Bulunamadı</h2>
            <p className="mb-6 text-lg text-gray-300">Üzgünüz, aradığınız sayfa mevcut değil.</p>
            <a href="/" style={{ textDecoration: 'none' }}>
                <Button variant="contained" color="primary">
                    Ana Sayfaya Dön
                </Button>
            </a>
        </div>
    );
}

export default ErrorPage;