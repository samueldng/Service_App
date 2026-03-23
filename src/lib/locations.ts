// ---- Brazilian Locations Service ----
// Uses the official IBGE API to fetch states and cities dynamically.
// Results are cached in memory to avoid repeated requests.

export interface UF {
    sigla: string;
    nome: string;
}

export interface City {
    nome: string;
}

const UF_LIST: UF[] = [
    { sigla: 'AC', nome: 'Acre' },
    { sigla: 'AL', nome: 'Alagoas' },
    { sigla: 'AP', nome: 'Amapá' },
    { sigla: 'AM', nome: 'Amazonas' },
    { sigla: 'BA', nome: 'Bahia' },
    { sigla: 'CE', nome: 'Ceará' },
    { sigla: 'DF', nome: 'Distrito Federal' },
    { sigla: 'ES', nome: 'Espírito Santo' },
    { sigla: 'GO', nome: 'Goiás' },
    { sigla: 'MA', nome: 'Maranhão' },
    { sigla: 'MT', nome: 'Mato Grosso' },
    { sigla: 'MS', nome: 'Mato Grosso do Sul' },
    { sigla: 'MG', nome: 'Minas Gerais' },
    { sigla: 'PA', nome: 'Pará' },
    { sigla: 'PB', nome: 'Paraíba' },
    { sigla: 'PR', nome: 'Paraná' },
    { sigla: 'PE', nome: 'Pernambuco' },
    { sigla: 'PI', nome: 'Piauí' },
    { sigla: 'RJ', nome: 'Rio de Janeiro' },
    { sigla: 'RN', nome: 'Rio Grande do Norte' },
    { sigla: 'RS', nome: 'Rio Grande do Sul' },
    { sigla: 'RO', nome: 'Rondônia' },
    { sigla: 'RR', nome: 'Roraima' },
    { sigla: 'SC', nome: 'Santa Catarina' },
    { sigla: 'SP', nome: 'São Paulo' },
    { sigla: 'SE', nome: 'Sergipe' },
    { sigla: 'TO', nome: 'Tocantins' },
];

// Cache for cities per UF
const citiesCache = new Map<string, City[]>();

/**
 * Returns all 27 Brazilian states (UF).
 * Filters by query string matching sigla or nome.
 */
export function filterUFs(query: string): UF[] {
    if (!query) return UF_LIST;
    const q = query.toLowerCase();
    return UF_LIST.filter(
        uf => uf.sigla.toLowerCase().includes(q) || uf.nome.toLowerCase().includes(q)
    );
}

/**
 * Fetches cities for a given UF from the IBGE API.
 * Results are cached in memory after first fetch.
 */
export async function getCitiesByUF(uf: string): Promise<City[]> {
    const key = uf.toUpperCase();
    if (citiesCache.has(key)) return citiesCache.get(key)!;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
        
        const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${key}/municipios?orderBy=nome`, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!res.ok) throw new Error('Falha ao buscar cidades');
        const data = await res.json();
        const cities: City[] = data.map((c: any) => ({ nome: c.nome }));
        citiesCache.set(key, cities);
        return cities;
    } catch (error) {
        console.warn('IBGE falhou. Tentando fallback para CDN do Cidades.json...', error);
        try {
            // Requisita a ID do Estado
            const estRes = await fetch('https://raw.githubusercontent.com/felipefdl/cidades-estados-brasil-json/master/Estados.json');
            const estData = await estRes.json();
            const estObj = estData.find((e: any) => e.Sigla === key);
            
            if (estObj) {
                // Requisita Cidades filtrando por Estado ID
                const cidRes = await fetch('https://raw.githubusercontent.com/felipefdl/cidades-estados-brasil-json/master/Cidades.json');
                const cidData = await cidRes.json();
                
                const fallbackCities: City[] = cidData
                    .filter((c: any) => c.Estado === estObj.ID)
                    .map((c: any) => ({ nome: c.Nome }));
                
                if (fallbackCities.length > 0) {
                    citiesCache.set(key, fallbackCities);
                    return fallbackCities;
                }
            }
        } catch (fbError) {
            console.error('Erro crítico: Falha no IBGE e no Fallback do repositório', fbError);
        }
        return [];
    }
}

/**
 * Filters cities by a search query.
 */
export function filterCities(cities: City[], query: string): City[] {
    if (!query) return cities;
    const q = query.toLowerCase();
    return cities.filter(c => c.nome.toLowerCase().includes(q));
}
