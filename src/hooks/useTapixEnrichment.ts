import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCachedEnrichments, enrichTransaction, type TapixCacheRow } from '@/lib/tapix';

export function useTapixCache(transactionIds: string[]) {
  return useQuery({
    queryKey: ['tapix-cache', [...transactionIds].sort().join(',')],
    queryFn: () => getCachedEnrichments(transactionIds),
    enabled: transactionIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTapixEnrich() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ transactionId, merchantId }: { transactionId: string; merchantId: string }) =>
      enrichTransaction(transactionId, merchantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tapix-cache'] }),
  });
}

/**
 * Normalize a TapixCacheRow OR a flat dashboard-shape `tapixEnrichment` object
 * into a uniform summary for UI rendering.
 */
export function getEnrichmentSummary(input: TapixCacheRow | Record<string, any> | undefined | null) {
  if (!input) return null;

  const flat = (input as any).merchantName !== undefined || (input as any).merchantLogo !== undefined;
  if (flat) {
    const f = input as any;
    const loc = f.location || {};
    return {
      found: true,
      merchantName: f.merchantName || null,
      merchantLogo: f.merchantLogo || null,
      shopType: f.shopType || null,
      category: f.category || null,
      categoryLogo: f.categoryLogo || null,
      tags: Array.isArray(f.tags) ? f.tags : [],
      address: [loc.street, loc.city, loc.zip, loc.country].filter(Boolean).join(', ') || null,
      city: loc.city || null,
      country: loc.country || null,
      coordinates: loc.lat && loc.lng ? { lat: loc.lat, lng: loc.lng } : null,
      shopUrl: f.url || null,
      googlePlaceId: f.googlePlaceId || null,
      enrichmentType: f.enrichmentType || 'card',
      handle: f.handle || null,
      paymentGateway: f.paymentGateway || null,
      co2Footprint: f.co2Footprint || null,
    };
  }

  const cache = input as TapixCacheRow;
  const shop = cache.shop_data as any;
  const merchant = cache.merchant_data as any;
  const findResult = cache.raw_find_response as any;
  const addr = shop?.location?.address;

  return {
    found: findResult?.result === 'found' || findResult?.result === 'local_fallback' || !!merchant?.name,
    merchantName: merchant?.name || null,
    merchantLogo: merchant?.logo || null,
    shopType: shop?.type || null,
    category: shop?.category?.name || null,
    categoryLogo: shop?.category?.logo || null,
    tags: shop?.tags || [],
    address: addr ? [addr.street, addr.city, addr.zip, addr.country].filter(Boolean).join(', ') : null,
    city: addr?.city || null,
    country: addr?.country || null,
    coordinates: shop?.location?.coordinates
      ? { lat: shop.location.coordinates.lat, lng: shop.location.coordinates.long }
      : null,
    shopUrl: shop?.url || null,
    googlePlaceId: shop?.googlePlaceId || null,
    enrichmentType: cache.enrichment_type,
    handle: cache.tapix_handle,
    paymentGateway: null,
    co2Footprint: null,
  };
}
