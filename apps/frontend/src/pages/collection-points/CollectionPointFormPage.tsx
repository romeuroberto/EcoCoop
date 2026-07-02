import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapView } from '../../components/map/MapView';
import { collectionPointsService } from '../../services/collectionPoints.service';

export function CollectionPointFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id) && id !== 'new';
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [reference, setReference] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [showCoords, setShowCoords] = useState(false);
  const [latStr, setLatStr] = useState('');
  const [lngStr, setLngStr] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: existing } = useQuery({
    queryKey: ['collection-point', id],
    queryFn: () => collectionPointsService.getById(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setAddress(existing.address);
      setReference(existing.reference ?? '');
      setIsActive(existing.isActive);
      if (existing.latitude != null && existing.longitude != null) {
        setShowCoords(true);
        setLatStr(String(existing.latitude));
        setLngStr(String(existing.longitude));
      }
    }
  }, [existing]);

  const createMut = useMutation({
    mutationFn: collectionPointsService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['collection-points'] }); navigate('/collection-points'); },
  });

  const updateMut = useMutation({
    mutationFn: ({ body }: { body: Parameters<typeof collectionPointsService.update>[1] }) =>
      collectionPointsService.update(id!, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['collection-points'] }); navigate('/collection-points'); },
  });

  const isPending = createMut.isPending || updateMut.isPending;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Nome é obrigatório';
    if (!address.trim()) e.address = 'Endereço é obrigatório';
    if (showCoords) {
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      if (latStr && (isNaN(lat) || lat < -90 || lat > 90)) e.latitude = 'Latitude inválida (−90 a 90)';
      if (lngStr && (isNaN(lng) || lng < -180 || lng > 180)) e.longitude = 'Longitude inválida (−180 a 180)';
    }
    return e;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});

    const lat = showCoords && latStr ? parseFloat(latStr) : undefined;
    const lng = showCoords && lngStr ? parseFloat(lngStr) : undefined;

    if (isEdit) {
      updateMut.mutate({ body: { name, address, reference: reference || undefined, isActive, latitude: lat, longitude: lng } });
    } else {
      createMut.mutate({ name, address, reference: reference || undefined, latitude: lat, longitude: lng });
    }
  };

  const previewLat = showCoords && latStr ? parseFloat(latStr) : null;
  const previewLng = showCoords && lngStr ? parseFloat(lngStr) : null;
  const hasPreview = previewLat != null && previewLng != null && !isNaN(previewLat) && !isNaN(previewLng);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/collection-points')} className="text-gray-500 hover:text-gray-700 text-sm">
          ← Voltar
        </button>
        <h1 className="text-2xl font-bold text-gray-800">
          {isEdit ? 'Editar ponto de coleta' : 'Novo ponto de coleta'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
          <input
            className={`w-full border rounded-lg px-3 py-2 text-sm ${errors.name ? 'border-red-500' : ''}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do ponto de coleta"
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Endereço completo *</label>
          <input
            className={`w-full border rounded-lg px-3 py-2 text-sm ${errors.address ? 'border-red-500' : ''}`}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Rua, número, bairro, cidade, estado"
          />
          {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
          <p className="text-xs text-gray-500 mt-1">O sistema tentará geocodificar o endereço automaticamente.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Referência / Observação</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Próximo ao mercado, portão azul..."
          />
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showCoords}
              onChange={(e) => setShowCoords(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm font-medium text-gray-700">Informar coordenadas manualmente</span>
          </label>
          {showCoords && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Latitude (−90 a 90)</label>
                <input
                  className={`w-full border rounded-lg px-3 py-2 text-sm ${errors.latitude ? 'border-red-500' : ''}`}
                  value={latStr}
                  onChange={(e) => setLatStr(e.target.value)}
                  placeholder="-23.5505"
                />
                {errors.latitude && <p className="text-red-500 text-xs mt-1">{errors.latitude}</p>}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Longitude (−180 a 180)</label>
                <input
                  className={`w-full border rounded-lg px-3 py-2 text-sm ${errors.longitude ? 'border-red-500' : ''}`}
                  value={lngStr}
                  onChange={(e) => setLngStr(e.target.value)}
                  placeholder="-46.6333"
                />
                {errors.longitude && <p className="text-red-500 text-xs mt-1">{errors.longitude}</p>}
              </div>
            </div>
          )}
        </div>

        {hasPreview && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Prévia da localização:</p>
            <MapView
              points={[{ id: 'preview', lat: previewLat!, lng: previewLng!, label: name || 'Ponto' }]}
              center={[previewLat!, previewLng!]}
              zoom={15}
              height="220px"
            />
          </div>
        )}

        {isEdit && (
          <div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">Ponto ativo</span>
            </label>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/collection-points')}
            className="px-4 py-2 text-sm border rounded-lg text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
          >
            {isPending ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar ponto'}
          </button>
        </div>

        {(createMut.isError || updateMut.isError) && (
          <p className="text-red-500 text-sm text-center">Erro ao salvar. Verifique os dados e tente novamente.</p>
        )}
      </form>
    </div>
  );
}
