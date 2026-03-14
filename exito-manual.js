document.addEventListener('DOMContentLoaded', async () => {
    const downloadBtn = document.getElementById('secure-download-btn');
    const statusText = document.getElementById('status-text');
    const loadingSpinner = document.getElementById('loading-spinner');

    // Extraer el session_id de la URL ("?session_id=cs_test_...")
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');

    if (!sessionId) {
        statusText.innerHTML = "❌ Enlace inválido o expirado. No se encontró una sesión de pago activa.";
        loadingSpinner.style.display = 'none';
        return;
    }

    try {
        // Llamar a nuestro Backend Seguro en Netlify Functions
        const response = await fetch(`/.netlify/functions/verify-payment?session_id=${sessionId}`);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Autenticación fallida');
        }

        // Si la compra es real, develar el botón mágico con la URL efímera
        statusText.innerHTML = "✅ Pago verificado exitosamente.<br>Haz clic abajo para descargar tu manual (Link válido por 60 segundos).";

        // FORZAR DESCARGA (Evitar que el navegador solo abra el PDF)
        downloadBtn.onclick = async (e) => {
            e.preventDefault();
            const originalText = downloadBtn.innerHTML;
            downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Descargando...';
            downloadBtn.style.pointerEvents = 'none';

            try {
                const pdfResponse = await fetch(result.downloadUrl);
                const blob = await pdfResponse.blob();
                const blobUrl = window.URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = 'Manual_Clinico_Bee_Natural.pdf';
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(blobUrl);
            } catch (err) {
                console.error("Error al forzar descarga:", err);
                alert("Hubo un problema descargando el archivo. Intenta de nuevo.");
            } finally {
                downloadBtn.innerHTML = originalText;
                downloadBtn.style.pointerEvents = 'auto';
            }
        };

        downloadBtn.style.display = 'inline-flex';
        loadingSpinner.style.display = 'none';

    } catch (error) {
        console.error("Error verificando pago:", error);
        statusText.innerHTML = `❌ Acceso denegado: ${error.message}`;
        loadingSpinner.style.display = 'none';
    }
});
