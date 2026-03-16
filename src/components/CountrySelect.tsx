import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe } from "lucide-react";

const countries = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "BR", name: "Brazil" },
  { code: "AU", name: "Australia" },
  { code: "NL", name: "Netherlands" },
  { code: "IE", name: "Ireland" },
  { code: "SG", name: "Singapore" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "IN", name: "India" },
  { code: "CN", name: "China" },
  { code: "HK", name: "Hong Kong" },
  { code: "MX", name: "Mexico" },
  { code: "AR", name: "Argentina" },
  { code: "CL", name: "Chile" },
  { code: "CO", name: "Colombia" },
  { code: "ZA", name: "South Africa" },
  { code: "NG", name: "Nigeria" },
  { code: "KE", name: "Kenya" },
  { code: "GH", name: "Ghana" },
  { code: "EG", name: "Egypt" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "IL", name: "Israel" },
  { code: "TR", name: "Turkey" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "PT", name: "Portugal" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "PL", name: "Poland" },
  { code: "CZ", name: "Czech Republic" },
  { code: "AT", name: "Austria" },
  { code: "CH", name: "Switzerland" },
  { code: "BE", name: "Belgium" },
  { code: "NZ", name: "New Zealand" },
  { code: "PH", name: "Philippines" },
  { code: "TH", name: "Thailand" },
  { code: "MY", name: "Malaysia" },
  { code: "ID", name: "Indonesia" },
  { code: "VN", name: "Vietnam" },
  { code: "TW", name: "Taiwan" },
  { code: "RO", name: "Romania" },
  { code: "BG", name: "Bulgaria" },
  { code: "HR", name: "Croatia" },
  { code: "LT", name: "Lithuania" },
  { code: "LV", name: "Latvia" },
  { code: "EE", name: "Estonia" },
  { code: "MT", name: "Malta" },
  { code: "CY", name: "Cyprus" },
  { code: "LU", name: "Luxembourg" },
  { code: "IS", name: "Iceland" },
  { code: "PE", name: "Peru" },
  { code: "UY", name: "Uruguay" },
  { code: "CR", name: "Costa Rica" },
  { code: "PA", name: "Panama" },
  { code: "DO", name: "Dominican Republic" },
  { code: "JM", name: "Jamaica" },
  { code: "TT", name: "Trinidad and Tobago" },
  { code: "PK", name: "Pakistan" },
  { code: "BD", name: "Bangladesh" },
  { code: "LK", name: "Sri Lanka" },
  { code: "MM", name: "Myanmar" },
  { code: "KH", name: "Cambodia" },
  { code: "NP", name: "Nepal" },
];

interface CountrySelectProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function CountrySelect({ value, onValueChange }: CountrySelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="Select country" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {countries.map((c) => (
          <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
