export interface WeatherOverviewItem {
  locationName: string;
  description: string;
  maxTemp: string;
  minTemp: string;
  avgTemp: string;
  temperature: string;
  rainProb: string;
  comfort: string;
}

export interface WeatherDetailItem extends WeatherOverviewItem {
  feelTemp: string;
  humidity: string;
  windSpeed: string;
  windDir: string;
  detail: string;
}

export type WeatherQueryResult =
  | { weatherList: WeatherOverviewItem[]; isDetailed: false }
  | { weatherList: WeatherDetailItem[];   isDetailed: true  };

export interface WeatherProvider {
  overview: () => Promise<{ weatherList: WeatherOverviewItem[]; isDetailed: false }>;
  detail:   (cityName: string) => Promise<{ weatherList: WeatherDetailItem[]; isDetailed: true }>;
  resolveCity: (input: string) => string | null;
  displayName: string;
}
