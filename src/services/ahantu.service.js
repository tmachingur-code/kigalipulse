const { getCache, setCache } =  require("./cache.service");
const AHANTU_URL = "https://api.ahantu.rw/v1/search";

const LOCATION_PRIORITY = {
    neighborhood: 1,
    administrative_area_level_3: 2,
    sublocality_level_1: 3,
    administrative_area_level_2: 4,
    point_of_interest: 5
};

async function searchKigaliLocations(query) {
    const searchTerm = query.trim();

    if (searchTerm.length < 2) {
        const error = new Error("Please enter atleast 2 characters.");
        error.statusCode = 400;
        throw error;
    }

    const cacheKey = `ahantu:${searchTerm.toLowerCase()}`;
    const cachedData = getCache(cacheKey);

    if (cachedData !== undefined) {
        return cachedData;
    }

    const apiKey = process.env.AHANTU_API_KEY;

    if (!apiKey) {
        const error = new Error("Location search is not configured.");
        error.statusCode = 503;
        throw error;
    }

    const params = new URLSearchParams({
        q: searchTerm,
        lang: "en"
    });

    let response;

    try {
        response = await fetch(`${AHANTU_URL}?${params}`, {
            headers: {
                Authorization: `Bearer ${apiKey}`
            },
            signal: AbortSignal.timeout(10000)
        });
    } catch (cause) {
        const error = new Error(
            "The location service could not be reached."
        );
        error.statusCode = cause.name === "TimeoutError" ? 504 : 502;
        throw error;
    }

    if (!response.ok) {
        const error = new Error("The location service returned an errror.");
        error.statusCode = 502;
        throw error;
    }

    const data = await response.json();

    const results = (data.results || [])
        .filter(place =>
            place.province?.name === "City of Kigali" &&
            Number.isFinite(place.lat) &&
            Number.isFinite(place.lng)
        )
        .sort((a,b) =>
            (LOCATION_PRIORITY[a.type] || 99) -
            (LOCATION_PRIORITY[b.type] || 99)
        )
        .map(place => ({
            name: place.match,
            address: place.address,
            type: place.type,
            precise: place.precise,
            latitude: place.lat,
            longitude: place.lng,
            province: place.province?.name,
            district: place.district?.name,
            sector: place.sector?.name,
            cell: place.cell?.name,
            village: place.village?.name,
            country: "Rwanda"
        }));

    const result = {results};

    setCache(cacheKey, result, 3600);

    return result;
}

module.exports = { searchKigaliLocations };