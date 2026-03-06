import { useState, useEffect } from 'react';
import axios from 'axios';
import ModelViewer from './components/ModelViewer';
import type { JobStatusResponse } from './types';

const API_BASE = 'http://localhost:8000'; // Ajustar según entorno

function App() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJob, setCurrentJob] = useState<JobStatusResponse | null>(null);
  const [history, setHistory] = useState<JobStatusResponse[]>([]);
  const [error, setError] = useState('');

  // Cargar historial al iniciar
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_BASE}/jobs`);
      setHistory(res.data);
    } catch (err) {
      console.error("Error cargando historial", err);
    }
  };

  // Lógica de Polling
  useEffect(() => {
    let interval: number;
    if (currentJob && ['pending', 'processing'].includes(currentJob.status)) {
      interval = window.setInterval(async () => {
        try {
          const res = await axios.get(`${API_BASE}/jobs/${currentJob.job_id}`);
          setCurrentJob(res.data);
          
          if (['completed', 'failed'].includes(res.data.status)) {
            setIsGenerating(false);
            fetchHistory(); // Refrescar lista
            clearInterval(interval);
          }
        } catch (err) {
          console.error("Error consultando estado", err);
          clearInterval(interval);
        }
      }, 3000); // Polling cada 3 segundos
    }
    return () => clearInterval(interval);
  }, [currentJob]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Por favor, ingresa una descripción.");
      return;
    }
    setError('');
    setIsGenerating(true);
    setCurrentJob(null);

    try {
      const res = await axios.post(`${API_BASE}/generate`, { prompt });
      // Iniciamos el estado local con la respuesta preliminar
      setCurrentJob({
        job_id: res.data.job_id,
        prompt: prompt,
        status: 'pending',
        file_url: null
      });
      setPrompt('');
    } catch (err) {
      setError("Error de conexión con el servidor.");
      setIsGenerating(false);
    }
  };

  // Utilidad para extraer URLs (El backend guarda paso a paso: "step_url,stl_url")
  const getUrls = (file_url: string | null) => {
    if (!file_url) return { stepUrl: '', stlUrl: '' };
    const urls = file_url.split(',');
    // Asumimos el orden que devuelve ai_engine.py: STEP, STL
    const stepUrl = urls.find(u => u.endsWith('.step')) || urls[0];
    const stlUrl = urls.find(u => u.endsWith('.stl')) || urls[1];
    return { stepUrl, stlUrl };
  };

  const activeJob = currentJob;
  const { stepUrl, stlUrl } = getUrls(activeJob?.file_url || null);

  return (
    <div className="min-h-screen max-w-5xl mx-auto p-6 flex flex-col gap-8 font-sans text-gray-800">
      <header className="border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-indigo-600">MetaShapes</h1>
        <p className="text-gray-500">Generador de modelos 3D con IA a partir de texto</p>
      </header>

      <main className="flex flex-col gap-6">
        {/* Sección de Input */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Describe tu objeto 3D:
          </label>
          <textarea
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
            rows={4}
            placeholder="Ej: un engranaje de 50 mm de diámetro con 20 dientes..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isGenerating}
          />
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="mt-4 px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {isGenerating ? 'Generando...' : 'Generar Modelo'}
          </button>
        </section>

        {/* Sección de Estado y Visor */}
        {activeJob && (
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
            <h2 className="text-lg font-semibold w-full mb-4">Resultado</h2>
            
            {activeJob.status === 'pending' && (
              <p className="text-gray-500 animate-pulse">En cola, esperando disponibilidad...</p>
            )}
            
            {activeJob.status === 'processing' && (
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-indigo-600 font-medium">Creando modelo 3D y calculando geometría...</p>
              </div>
            )}

            {activeJob.status === 'failed' && (
              <p className="text-red-500">Ocurrió un error al generar el modelo. Intenta con otro prompt.</p>
            )}

            {activeJob.status === 'completed' && stlUrl && (
              <div className="w-full flex flex-col gap-4">
                <ModelViewer stlUrl={stlUrl} />
                <div className="flex justify-center gap-4">
                  <a
                    href={stlUrl}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 transition-colors"
                  >
                    Descargar STL
                  </a>
                  <a
                    href={stepUrl}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Descargar STEP
                  </a>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Sección de Historial */}
        {history.length > 0 && (
          <section className="mt-8">
            <h3 className="text-xl font-semibold mb-4 text-gray-700">Trabajos anteriores</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {history.map((job) => (
                <div 
                  key={job.job_id} 
                  onClick={() => setCurrentJob(job)}
                  className="p-4 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all"
                >
                  <p className="text-sm font-medium text-gray-800 line-clamp-2 mb-2">
                    "{job.prompt}"
                  </p>
                  <div className="flex justify-between items-center text-xs">
                    <span className={`px-2 py-1 rounded-full ${job.status === 'completed' ? 'bg-green-100 text-green-700' : job.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {job.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;