"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { composeIsraeliAddress } from "@/lib/address/normalize";
import { useLocale } from "@/hooks/useLocale";

interface OptionItem {
  code: string;
  label: string;
}

interface IsraelAddressFieldsProps {
  value: string;
  onChange: (address: string) => void;
  dir?: "rtl" | "ltr";
  disabled?: boolean;
  idPrefix?: string;
}

function parseAddressValue(value: string): {
  city: string;
  street: string;
  houseNumber: string;
} {
  const trimmed = value.trim();
  if (!trimmed) {
    return { city: "", street: "", houseNumber: "" };
  }

  const commaIndex = trimmed.lastIndexOf(",");
  if (commaIndex === -1) {
    return { city: "", street: trimmed, houseNumber: "" };
  }

  const city = trimmed.slice(commaIndex + 1).trim();
  const streetPart = trimmed.slice(0, commaIndex).trim();
  const parts = streetPart.split(/\s+/);
  const lastPart = parts[parts.length - 1];

  if (/^\d+[א-תa-zA-Z/-]*$/.test(lastPart) && parts.length > 1) {
    return {
      city,
      street: parts.slice(0, -1).join(" "),
      houseNumber: lastPart,
    };
  }

  return { city, street: streetPart, houseNumber: "" };
}

function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

interface AddressComboboxProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  selectedCode?: string;
  options: OptionItem[];
  loading: boolean;
  disabled?: boolean;
  emptyText: string;
  dir?: "rtl" | "ltr";
  onSearch: (query: string) => void;
  onSelect: (option: OptionItem) => void;
  onClear?: () => void;
}

function AddressCombobox({
  id,
  label,
  placeholder,
  value,
  selectedCode,
  options,
  loading,
  disabled,
  emptyText,
  dir = "rtl",
  onSearch,
  onSelect,
  onClear,
}: AddressComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className={dir === "rtl" ? "text-right block" : "text-left block"}>
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "h-11 w-full font-normal",
              dir === "rtl" ? "flex-row-reverse text-right" : "text-left",
              !value && "text-muted-foreground"
            )}
            dir={dir}
          >
            <span
              className={cn(
                "min-w-0 flex-1 truncate",
                dir === "rtl" ? "text-right" : "text-left"
              )}
            >
              {value || placeholder}
            </span>
            <ChevronsUpDown className={cn("h-4 w-4 shrink-0 opacity-50", dir === "rtl" ? "mr-2" : "ml-2")} />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align={dir === "rtl" ? "end" : "start"}
          dir={dir}
        >
          <Command shouldFilter={false} dir={dir}>
            <CommandInput
              placeholder={placeholder}
              value={query}
              onValueChange={(next) => {
                setQuery(next);
                onSearch(next);
                if (!next && onClear) onClear();
              }}
            />
            <CommandList>
              {loading ? (
                <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                  <Loader2 className={cn("h-4 w-4 animate-spin", dir === "rtl" ? "ml-2" : "mr-2")} />
                </div>
              ) : (
                <>
                  <CommandEmpty className={dir === "rtl" ? "text-right" : "text-left"}>{emptyText}</CommandEmpty>
                  <CommandGroup>
                    {options.map((option) => (
                      <CommandItem
                        key={option.code}
                        value={option.label}
                        onSelect={() => {
                          onSelect(option);
                          setQuery(option.label);
                          setOpen(false);
                        }}
                        className={cn(
                          dir === "rtl" ? "flex-row-reverse justify-end text-right" : "text-left"
                        )}
                      >
                        <Check
                          className={cn(
                            "h-4 w-4",
                            selectedCode === option.code ? "opacity-100" : "opacity-0",
                            dir === "rtl" ? "mr-2" : "ml-2"
                          )}
                        />
                        {option.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function IsraelAddressFields({
  value,
  onChange,
  dir = "rtl",
  disabled = false,
  idPrefix = "address",
}: IsraelAddressFieldsProps) {
  const { t } = useLocale();
  const parsedInitial = useMemo(() => parseAddressValue(value), []);
  const initializedRef = useRef(false);

  const [city, setCity] = useState(parsedInitial.city);
  const [cityCode, setCityCode] = useState("");
  const [street, setStreet] = useState(parsedInitial.street);
  const [streetCode, setStreetCode] = useState("");
  const [houseNumber, setHouseNumber] = useState(parsedInitial.houseNumber);
  const [manualMode, setManualMode] = useState(false);
  const [manualAddress, setManualAddress] = useState(value);

  const [cityQuery, setCityQuery] = useState(parsedInitial.city);
  const [streetQuery, setStreetQuery] = useState(parsedInitial.street);
  const [cityOptions, setCityOptions] = useState<OptionItem[]>([]);
  const [streetOptions, setStreetOptions] = useState<OptionItem[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingStreets, setLoadingStreets] = useState(false);

  const debouncedCityQuery = useDebouncedValue(cityQuery);
  const debouncedStreetQuery = useDebouncedValue(streetQuery);

  const labels = {
    city: t("addressFields.city") || "City",
    cityPlaceholder: t("addressFields.cityPlaceholder") || "Search city",
    street: t("addressFields.street") || "Street",
    streetPlaceholder: t("addressFields.streetPlaceholder") || "Search street",
    houseNumber: t("addressFields.houseNumber") || "House number",
    houseNumberPlaceholder: t("addressFields.houseNumberPlaceholder") || "Optional",
    selectCityFirst: t("addressFields.selectCityFirst") || "Select a city first",
    loading: t("addressFields.loading") || "Loading...",
    noResults: t("addressFields.noResults") || "No results found",
    enterManually: t("addressFields.enterManually") || "Enter address manually",
    useAutocomplete: t("addressFields.useAutocomplete") || "Use address search",
  };

  const emitComposedAddress = useCallback(
    (next: { city?: string; street?: string; houseNumber?: string }) => {
      const composed = composeIsraeliAddress({
        city: next.city ?? city,
        street: next.street ?? street,
        houseNumber: next.houseNumber ?? houseNumber,
      });
      onChange(composed);
    },
    [city, street, houseNumber, onChange]
  );

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    if (value && !cityCode) {
      setManualMode(!parsedInitial.city || !parsedInitial.street);
      setManualAddress(value);
    }
  }, [value, cityCode, parsedInitial.city, parsedInitial.street]);

  useEffect(() => {
    if (manualMode) return;

    let cancelled = false;
    const loadCities = async () => {
      setLoadingCities(true);
      try {
        const params = new URLSearchParams();
        if (debouncedCityQuery.trim()) params.set("q", debouncedCityQuery.trim());
        const response = await fetch(`/api/address/cities?${params.toString()}`);
        const data = await response.json();
        if (!cancelled && response.ok) {
          setCityOptions(data.cities ?? []);
        }
      } catch (error) {
        console.error("Failed to load cities:", error);
      } finally {
        if (!cancelled) setLoadingCities(false);
      }
    };

    loadCities();
    return () => {
      cancelled = true;
    };
  }, [debouncedCityQuery, manualMode]);

  useEffect(() => {
    if (manualMode || !cityCode) {
      setStreetOptions([]);
      return;
    }

    let cancelled = false;
    const loadStreets = async () => {
      setLoadingStreets(true);
      try {
        const params = new URLSearchParams({ cityCode });
        if (debouncedStreetQuery.trim()) params.set("q", debouncedStreetQuery.trim());
        const response = await fetch(`/api/address/streets?${params.toString()}`);
        const data = await response.json();
        if (!cancelled && response.ok) {
          setStreetOptions(data.streets ?? []);
        }
      } catch (error) {
        console.error("Failed to load streets:", error);
      } finally {
        if (!cancelled) setLoadingStreets(false);
      }
    };

    loadStreets();
    return () => {
      cancelled = true;
    };
  }, [cityCode, debouncedStreetQuery, manualMode]);

  if (manualMode) {
    return (
      <div className="space-y-3">
        <div>
          <Label htmlFor={`${idPrefix}-manual`} className={dir === "rtl" ? "text-right block" : "text-left block"}>
            {t("onboarding.steps.address.label") || t("settings.address") || "Address"}
          </Label>
          <Input
            id={`${idPrefix}-manual`}
            value={manualAddress}
            onChange={(e) => {
              setManualAddress(e.target.value);
              onChange(e.target.value);
            }}
            placeholder={t("onboarding.businessInfo.addressPlaceholder") || "Enter business address"}
            disabled={disabled}
            dir={dir}
            className="mt-2 h-11 text-base border-gray-300 focus:border-green-500 focus:ring-green-500/20"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-sm text-gray-500 hover:text-gray-700"
          onClick={() => setManualMode(false)}
          disabled={disabled}
        >
          {labels.useAutocomplete}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AddressCombobox
        id={`${idPrefix}-city`}
        label={labels.city}
        placeholder={labels.cityPlaceholder}
        value={city}
        selectedCode={cityCode}
        options={cityOptions}
        loading={loadingCities}
        disabled={disabled}
        emptyText={labels.noResults}
        dir={dir}
        onSearch={setCityQuery}
        onSelect={(option) => {
          setCity(option.label);
          setCityCode(option.code);
          setStreet("");
          setStreetCode("");
          setStreetQuery("");
          emitComposedAddress({ city: option.label, street: "", houseNumber: "" });
        }}
        onClear={() => {
          setCity("");
          setCityCode("");
          setStreet("");
          setStreetCode("");
          emitComposedAddress({ city: "", street: "", houseNumber: "" });
        }}
      />

      <AddressCombobox
        id={`${idPrefix}-street`}
        label={labels.street}
        placeholder={cityCode ? labels.streetPlaceholder : labels.selectCityFirst}
        value={street}
        selectedCode={streetCode}
        options={streetOptions}
        loading={loadingStreets}
        disabled={disabled || !cityCode}
        emptyText={cityCode ? labels.noResults : labels.selectCityFirst}
        dir={dir}
        onSearch={setStreetQuery}
        onSelect={(option) => {
          setStreet(option.label);
          setStreetCode(option.code);
          emitComposedAddress({ street: option.label });
        }}
        onClear={() => {
          setStreet("");
          setStreetCode("");
          emitComposedAddress({ street: "", houseNumber: houseNumber });
        }}
      />

      <div>
        <Label htmlFor={`${idPrefix}-house-number`} className={dir === "rtl" ? "text-right block" : "text-left block"}>
          {labels.houseNumber}
        </Label>
        <Input
          id={`${idPrefix}-house-number`}
          value={houseNumber}
          onChange={(e) => {
            setHouseNumber(e.target.value);
            emitComposedAddress({ houseNumber: e.target.value });
          }}
          placeholder={labels.houseNumberPlaceholder}
          disabled={disabled}
          dir={dir}
          className="mt-2 h-11 text-base border-gray-300 focus:border-green-500 focus:ring-green-500/20"
        />
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-sm text-gray-500 hover:text-gray-700"
        onClick={() => {
          setManualMode(true);
          setManualAddress(value);
        }}
        disabled={disabled}
      >
        {labels.enterManually}
      </Button>
    </div>
  );
}
