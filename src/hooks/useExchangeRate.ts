import { useQuery } from "@tanstack/react-query";

export function useExchangeRate() {
  const { data: rate = 0, isLoading } = useQuery({
    queryKey: ["exchange-rate-thb-krw"],
    queryFn: async () => {
      try {
        const res = await fetch("https://open.er-api.com/v6/latest/THB");
        const json = await res.json();
        return json.rates?.KRW ?? 0;
      } catch {
        return 38.5; // fallback rate
      }
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
  });

  const convert = (thb: number) => Math.round(thb * rate);

  return { rate, isLoading, convert };
}
