export type LocalityRegion = {
  region: string;
  localities: string[];
};

export const countryLocationData: Record<string, LocalityRegion[]> = {
  "+268": [
    {
      region: "Hhohho",
      localities: [
        "Bulembu",
        "Ezulwini",
        "Lobamba",
        "Mbabane",
        "Mhlambanyatsi",
        "Motshane",
        "Ngwenya",
        "Piggs Peak",
        "Siphocosini",
        "Tshaneni"
      ]
    },
    {
      region: "Manzini",
      localities: [
        "Bhunya",
        "Kwaluseni",
        "Ludzeludze",
        "Malkerns",
        "Manzini",
        "Matsapha",
        "Mhlambanyatsi",
        "Mliba",
        "Ngculwini",
        "Nhlambeni",
        "Sidvokodvo"
      ]
    },
    {
      region: "Lubombo",
      localities: [
        "Big Bend",
        "Lomahasha",
        "Lubuli",
        "Mhlume",
        "Nsoko",
        "Siphofaneni",
        "Siteki",
        "Simunye",
        "Tikhuba",
        "Vuvulane"
      ]
    },
    {
      region: "Shiselweni",
      localities: [
        "Gege",
        "Hlathikhulu",
        "Hosea",
        "Lavumisa",
        "Matsanjeni",
        "Mkhwakhweni",
        "Nhlangano",
        "Sandleni",
        "Shiselweni",
        "Zombodze"
      ]
    }
  ]
};

export function getLocationRegions(countryCode: string) {
  return countryLocationData[countryCode.trim()] || [];
}
