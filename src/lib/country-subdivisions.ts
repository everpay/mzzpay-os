/**
 * Country → State / Province / Region mapping for billing forms.
 * The `label` indicates what term the country uses (State, Province, etc.).
 */
export interface SubdivisionConfig {
  label: string;
  items: { code: string; name: string }[];
}

const US_STATES: SubdivisionConfig = {
  label: 'State',
  items: [
    { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
    { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
    { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
    { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
    { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
    { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
    { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
    { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
    { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
    { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
    { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
    { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
    { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
    { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
    { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
    { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
    { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }, { code: 'DC', name: 'District of Columbia' },
  ],
};

const CA_PROVINCES: SubdivisionConfig = {
  label: 'Province',
  items: [
    { code: 'AB', name: 'Alberta' }, { code: 'BC', name: 'British Columbia' }, { code: 'MB', name: 'Manitoba' },
    { code: 'NB', name: 'New Brunswick' }, { code: 'NL', name: 'Newfoundland and Labrador' },
    { code: 'NS', name: 'Nova Scotia' }, { code: 'NT', name: 'Northwest Territories' },
    { code: 'NU', name: 'Nunavut' }, { code: 'ON', name: 'Ontario' }, { code: 'PE', name: 'Prince Edward Island' },
    { code: 'QC', name: 'Quebec' }, { code: 'SK', name: 'Saskatchewan' }, { code: 'YT', name: 'Yukon' },
  ],
};

const AU_STATES: SubdivisionConfig = {
  label: 'State',
  items: [
    { code: 'ACT', name: 'Australian Capital Territory' }, { code: 'NSW', name: 'New South Wales' },
    { code: 'NT', name: 'Northern Territory' }, { code: 'QLD', name: 'Queensland' },
    { code: 'SA', name: 'South Australia' }, { code: 'TAS', name: 'Tasmania' },
    { code: 'VIC', name: 'Victoria' }, { code: 'WA', name: 'Western Australia' },
  ],
};

const MX_STATES: SubdivisionConfig = {
  label: 'State',
  items: [
    { code: 'AGU', name: 'Aguascalientes' }, { code: 'BCN', name: 'Baja California' },
    { code: 'BCS', name: 'Baja California Sur' }, { code: 'CAM', name: 'Campeche' },
    { code: 'CHP', name: 'Chiapas' }, { code: 'CHH', name: 'Chihuahua' },
    { code: 'COA', name: 'Coahuila' }, { code: 'COL', name: 'Colima' },
    { code: 'CMX', name: 'Ciudad de México' }, { code: 'DUR', name: 'Durango' },
    { code: 'GUA', name: 'Guanajuato' }, { code: 'GRO', name: 'Guerrero' },
    { code: 'HID', name: 'Hidalgo' }, { code: 'JAL', name: 'Jalisco' },
    { code: 'MEX', name: 'México' }, { code: 'MIC', name: 'Michoacán' },
    { code: 'MOR', name: 'Morelos' }, { code: 'NAY', name: 'Nayarit' },
    { code: 'NLE', name: 'Nuevo León' }, { code: 'OAX', name: 'Oaxaca' },
    { code: 'PUE', name: 'Puebla' }, { code: 'QUE', name: 'Querétaro' },
    { code: 'ROO', name: 'Quintana Roo' }, { code: 'SLP', name: 'San Luis Potosí' },
    { code: 'SIN', name: 'Sinaloa' }, { code: 'SON', name: 'Sonora' },
    { code: 'TAB', name: 'Tabasco' }, { code: 'TAM', name: 'Tamaulipas' },
    { code: 'TLA', name: 'Tlaxcala' }, { code: 'VER', name: 'Veracruz' },
    { code: 'YUC', name: 'Yucatán' }, { code: 'ZAC', name: 'Zacatecas' },
  ],
};

const BR_STATES: SubdivisionConfig = {
  label: 'State',
  items: [
    { code: 'AC', name: 'Acre' }, { code: 'AL', name: 'Alagoas' }, { code: 'AP', name: 'Amapá' },
    { code: 'AM', name: 'Amazonas' }, { code: 'BA', name: 'Bahia' }, { code: 'CE', name: 'Ceará' },
    { code: 'DF', name: 'Distrito Federal' }, { code: 'ES', name: 'Espírito Santo' },
    { code: 'GO', name: 'Goiás' }, { code: 'MA', name: 'Maranhão' }, { code: 'MT', name: 'Mato Grosso' },
    { code: 'MS', name: 'Mato Grosso do Sul' }, { code: 'MG', name: 'Minas Gerais' },
    { code: 'PA', name: 'Pará' }, { code: 'PB', name: 'Paraíba' }, { code: 'PR', name: 'Paraná' },
    { code: 'PE', name: 'Pernambuco' }, { code: 'PI', name: 'Piauí' },
    { code: 'RJ', name: 'Rio de Janeiro' }, { code: 'RN', name: 'Rio Grande do Norte' },
    { code: 'RS', name: 'Rio Grande do Sul' }, { code: 'RO', name: 'Rondônia' },
    { code: 'RR', name: 'Roraima' }, { code: 'SC', name: 'Santa Catarina' },
    { code: 'SP', name: 'São Paulo' }, { code: 'SE', name: 'Sergipe' }, { code: 'TO', name: 'Tocantins' },
  ],
};

const IN_STATES: SubdivisionConfig = {
  label: 'State',
  items: [
    { code: 'AP', name: 'Andhra Pradesh' }, { code: 'AR', name: 'Arunachal Pradesh' },
    { code: 'AS', name: 'Assam' }, { code: 'BR', name: 'Bihar' }, { code: 'CT', name: 'Chhattisgarh' },
    { code: 'GA', name: 'Goa' }, { code: 'GJ', name: 'Gujarat' }, { code: 'HR', name: 'Haryana' },
    { code: 'HP', name: 'Himachal Pradesh' }, { code: 'JH', name: 'Jharkhand' },
    { code: 'KA', name: 'Karnataka' }, { code: 'KL', name: 'Kerala' }, { code: 'MP', name: 'Madhya Pradesh' },
    { code: 'MH', name: 'Maharashtra' }, { code: 'MN', name: 'Manipur' }, { code: 'ML', name: 'Meghalaya' },
    { code: 'MZ', name: 'Mizoram' }, { code: 'NL', name: 'Nagaland' }, { code: 'OR', name: 'Odisha' },
    { code: 'PB', name: 'Punjab' }, { code: 'RJ', name: 'Rajasthan' }, { code: 'SK', name: 'Sikkim' },
    { code: 'TN', name: 'Tamil Nadu' }, { code: 'TG', name: 'Telangana' }, { code: 'TR', name: 'Tripura' },
    { code: 'UP', name: 'Uttar Pradesh' }, { code: 'UT', name: 'Uttarakhand' },
    { code: 'WB', name: 'West Bengal' }, { code: 'DL', name: 'Delhi' },
  ],
};

const GB_COUNTIES: SubdivisionConfig = {
  label: 'County',
  items: [], // UK doesn't require county for billing; free-text fallback
};

/** Countries that use "Province" but have no predefined list (free-text input) */
const PROVINCE_COUNTRIES = new Set(['IT', 'NL', 'BE', 'ES', 'PH', 'ZA', 'CN', 'JP', 'KR', 'ID', 'PK']);
/** Countries that use "Region" */
const REGION_COUNTRIES = new Set(['FR', 'DE', 'GR', 'PT', 'PL', 'RO', 'CZ', 'SE', 'NO', 'FI', 'DK', 'IE']);

const COUNTRY_SUBDIVISIONS: Record<string, SubdivisionConfig> = {
  US: US_STATES,
  CA: CA_PROVINCES,
  AU: AU_STATES,
  MX: MX_STATES,
  BR: BR_STATES,
  IN: IN_STATES,
  GB: GB_COUNTIES,
};

export function getSubdivisionsForCountry(countryCode: string): SubdivisionConfig | null {
  const upper = (countryCode || '').toUpperCase();
  if (COUNTRY_SUBDIVISIONS[upper]) return COUNTRY_SUBDIVISIONS[upper];
  if (PROVINCE_COUNTRIES.has(upper)) return { label: 'Province', items: [] };
  if (REGION_COUNTRIES.has(upper)) return { label: 'Region', items: [] };
  return { label: 'State / Province', items: [] };
}

/**
 * Returns the localized label for the postal/zip code field by country.
 */
export function getPostalCodeLabel(countryCode: string): string {
  const upper = (countryCode || '').toUpperCase();
  if (upper === 'US') return 'ZIP Code';
  if (upper === 'GB') return 'Postcode';
  if (['CA', 'PH'].includes(upper)) return 'Postal Code';
  if (['BR'].includes(upper)) return 'CEP';
  if (['IN'].includes(upper)) return 'PIN Code';
  return 'Postal Code';
}

/**
 * Returns localized billing field labels for a given country.
 */
export function getBillingLabels(countryCode: string) {
  const subdiv = getSubdivisionsForCountry(countryCode);
  return {
    stateLabel: subdiv?.label || 'State / Province',
    postalLabel: getPostalCodeLabel(countryCode),
    addressLabel: 'Street Address',
    cityLabel: 'City',
    countryLabel: 'Country',
  };
}
