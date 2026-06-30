# Research: Fase 3 — Coleta, Rotas e Entrada de Material Bruto

**Feature**: `003-collection-routes-raw-material` | **Date**: 2026-06-30

---

## 1. Geocoding Provider

**Decision**: Usar Nominatim (OpenStreetMap) via interface abstrata `GeocodingProvider`.

**Rationale**: Gratuito, sem chave de API necessária para desenvolvimento, cobertura global adequada, compatível com OSM (mesmo provider do mapa). A interface abstrata (`GeocodingProvider`) no backend isola o domínio do provider concreto, permitindo trocar por Google Maps / Mapbox em produção sem refatoração.

**Alternatives considered**:
- Google Maps Geocoding API: pago, exige chave, melhor precisão — descartado para MVP por custo e friction de setup.
- Here Maps / Mapbox: similares ao Google — mesma razão.
- Coordenadas manuais apenas: descartado, pois automatizar o geocoding reduz atrito operacional.

**Implementation notes**:
- Interface: `GeocodingProvider` com método `geocode(address: string): Promise<{ lat: number; lng: number } | null>`.
- Implementação concreta: `NominatimGeocodingProvider` usando `fetch` nativo do Node 20 (sem biblioteca adicional).
- Falha no geocoding → salvar ponto com `locationPending=true`; NÃO lançar erro para o cliente.
- Throttle Nominatim: max 1 req/s (usage policy). Geocoding é chamado de forma não bloqueante e assíncrona pós-criação do ponto.

---

## 2. Visualização de Mapas (Frontend)

**Decision**: `react-leaflet` + Leaflet.js com tiles OpenStreetMap, sob interface abstrata `MapProvider` no frontend.

**Rationale**: Leaflet é open-source, amplamente suportado, sem limite de uso. `react-leaflet` provê bindings React idiomáticos. A interface `MapProvider` (props/hooks) permite trocar por Google Maps / Mapbox sem refatorar as páginas de domínio.

**Alternatives considered**:
- Google Maps JS API: pago, exige chave.
- Mapbox GL JS: gratuito até limite, melhor suporte a rotas 3D — overkill para MVP.
- OpenLayers: mais poderoso mas API mais complexa.

**Implementation notes**:
- Componente `<MapView>` como fachada: aceita array de `{ lat, lng, label }` e opcionalmente polyline ordenada de pontos.
- Dependency: `leaflet`, `react-leaflet` (peer dep já alinhada com React 18).
- Marcadores numerados (sequência) via `L.divIcon` com número sobreposto.
- Pontos com `locationPending=true` exibidos somente na listagem, com badge "Localização pendente"; não aparecem no mapa.

---

## 3. Algoritmo de Sugestão de Sequência de Pontos

**Decision**: Greedy Nearest Neighbor (O(n²)).

**Rationale**: Para rotas de até ~20 pontos (SC-003), nearest neighbor gera resultados adequados em < 10ms em Node.js. TSP exato (exponencial) é desnecessário para o MVP e viola o princípio de não adicionar complexidade além do necessário.

**Alternatives considered**:
- TSP com solver (ex. OR-Tools): ótimo mas exige dependência externa pesada e aumenta complexidade de deploy.
- Ordenação por latitude: mais simples mas ignora longitude, gera rotas ruins.
- Algoritmo 2-opt: melhoria incrementa sobre NN, pode ser adicionado futuramente sem breaking change.

**Implementation notes**:
- Algoritmo implementado em `RouteSequenceSuggester` (service puro, sem I/O).
- Pontos sem coordenadas válidas (`locationPending=true`) são excluídos da sugestão; listados separadamente no response como `excludedPoints`.
- Ponto de partida: primeiro ponto adicionado à rota (ou o de menor índice de sequência atual).

---

## 4. Modelo de Estoque por Evento (Event Sourcing Parcial)

**Decision**: `RawMaterialStockEvent` imutável. Saldo calculado por agregação dos eventos. Sem tabela de saldo persistida.

**Rationale**: Princípio IV da Constituição é NÃO NEGOCIÁVEL. Saldo bruto = soma algébrica dos eventos (ENTRADA positiva, ESTORNO negativa). Para o volume de dados do MVP (centenas de eventos por mês), a consulta de agregação em PostgreSQL é eficiente sem necessidade de materialização.

**Alternatives considered**:
- Tabela de saldo persistida com atualização transacional: mais rápido para leitura mas viola Princípio IV e exige duas escritas atômicas.
- View materializada PostgreSQL: intermediário, mas adiciona complexidade operacional desnecessária no MVP.

**Implementation notes**:
- Saldo bruto = `SUM(quantity) GROUP BY subcategoryId, unitId` na tabela `RawMaterialStockEvent`.
- Quantidade em ESTORNO é armazenada como valor **negativo** no banco.
- Validação anti-saldo-negativo (FR-047): calculada no service antes de persistir o estorno, dentro de uma transação Prisma.
- Eventos nunca são `UPDATE`d ou `DELETE`d — sem soft delete; proteção por ausência de rotas de mutação.

---

## 5. Controle de Concorrência em Transições de Estado de Rota

**Decision**: Optimistic locking via campo `version` (Int) em `CollectionRoute`.

**Rationale**: Transições de estado (especialmente `PLANEJADA → EM_ANDAMENTO`) devem ser idempotentes e seguras contra race conditions (Edge Case: dois usuários iniciando a rota simultaneamente). Pessimistic locking (SELECT FOR UPDATE) é mais pesado e desnecessário para o padrão de uso esperado.

**Alternatives considered**:
- Sem locking: aceitável para MVP com usuário único, mas o edge case está explicitado na spec.
- SELECT FOR UPDATE: garante exclusão mútua mas penaliza todas as leituras.

**Implementation notes**:
- Campo `version Int @default(0)` em `CollectionRoute`.
- Em transição de estado: `WHERE id = :id AND version = :currentVersion AND status = :expectedStatus` + increment version.
- Se `updateCount === 0` → lançar `409 ROUTE_CONCURRENT_MODIFICATION`.
- Prisma: usar `$transaction` com `updateMany` e verificar `count`.

---

## 6. Permissões RBAC para a Fase 3

**Decision**: Novos módulos de permissão no `ProfilePermission`: `COLLECTION_POINTS`, `COLLECTION_ROUTES`, `RAW_MATERIAL_ENTRIES`, `RAW_MATERIAL_BALANCE`.

**Rationale**: O padrão `module:action` da Fase 1/2 é extensível diretamente. Permissões de DRIVER são verificadas em dois níveis: (a) perfil RBAC + (b) guard de ownership (está atribuído à rota?).

**Alternatives considered**:
- Permissões embutidas por perfil sem tabela de permissões: menos flexível, não permite customização por cooperativa.

**Implementation notes**:
- Seed de permissões iniciais: ADMIN recebe MANAGE em todos os módulos; MANAGER recebe MANAGE em `COLLECTION_POINTS`, `COLLECTION_ROUTES`, `RAW_MATERIAL_ENTRIES` + READ em `RAW_MATERIAL_BALANCE`; DRIVER recebe READ em `COLLECTION_ROUTES` + ação especial `EXECUTE` e `CREATE_ENTRY`; SORTER recebe nada por padrão (permissão de visualização de entradas atribuída individualmente).
- Guard específico `RouteOwnershipGuard`: verifica se o DRIVER autenticado é o `driverId` ou está em `routeTeamMembers` da rota em questão.

---

## 7. Frontend — Gestão de Estado (Store)

**Decision**: Manter padrão já existente no projeto (verificado na estrutura `apps/frontend/src/store`).

**Rationale**: Não introduzir nova tecnologia de estado. Manter consistência com Fases 1 e 2.

**Implementation notes**:
- Novos stores: `collectionPointsStore`, `collectionRoutesStore`, `rawMaterialEntriesStore`.
- Mapa: estado local do componente (não precisa de store global — renderizado in-page).
